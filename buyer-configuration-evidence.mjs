import {engineProfile} from './engine-search.mjs';

const clean=value=>String(value||'').normalize('NFKC').replace(/[®™]/g,'').replace(/[\u2010-\u2015]/g,'-').replace(/\s+/g,' ').trim();
const uncertain=/\b(?:if equipped|available|optional|without|not equipped|delete[ds]?|deletion|either|or)\b/i;
const speedWords=text=>text.replace(/\bsix(?=[ -]speed\b)/gi,'6').replace(/\beight(?=[ -]speed\b)/gi,'8');
function wantedEngine(text){
 const value=clean(text).replace(/inline four-cylinder/gi,'I4').replace(/(\d\.\d)-liter\b/gi,'$1L');
 // A bounded grammar prevents unknown qualifications (hp, output, extra
 // equipment or an unhandled engine variant) becoming partial matches.
 if(!/^(?:(?:Pentastar )?3\.6L (?:Pentastar )?V-?6(?: with Stop\/Start)?|2\.0L (?:(?:turbo )?I-?4|I-?4 turbo)|6\.4L (?:HEMI )?V-?8)$/i.test(value))return null;
 return {...engineProfile(value),stopStart:/Stop\/Start/i.test(value)};
}
function wantedTransmission(text){
 const match=speedWords(clean(text)).match(/^(6|8)[ -]speed (manual|automatic)$/i);
 return match?{speed:match[1],type:match[2].toLowerCase()}:null;
}
function uniqueLines(record,label){return [...new Set(record.lines.filter(l=>new RegExp('^'+label+':','i').test(l)).map(clean))];}

// VIN/model/year validation is also performed by buyerPreferenceCheck before
// invoking this helper. No trim availability or optional-package inference is used.
export function wranglerConfigurationEvidence(lineup,fact,record){
 if(!['wrangler','wrangler-2-door'].includes(lineup?.modelId)||lineup.year!==2026||fact?.parent||record?.status!=='verified'||!Array.isArray(record.lines)||!record.lines.every(l=>typeof l==='string'))return null;
 if(!/engine|powertrain|transmission/i.test(fact.section||'')&&!['engine','gearbox','transmission','automatic-powertrain-options','powertrain-upgrade'].includes(fact.key))return null;
 // Some named configurations also promise tires or a transfer case. Engine
// and transmission evidence alone cannot establish those complete bundles.
 if(/\bincludes?\b|\brequires?\b/i.test([fact.note,fact.benefit].filter(Boolean).join(' ')))return null;
 const text=clean(fact.value||fact.text||fact.label);
 let engines=[],transmission=null;
 if(['gearbox','transmission'].includes(fact.key))transmission=wantedTransmission(text);
 else{
  const parts=text.split(/\s+\/\s+/);if(parts.length>2)return null;
  engines=parts[0].split(/\s+or\s+/i).map(wantedEngine);if(engines.some(e=>!e))return null;
  if(parts.length===2){transmission=wantedTransmission(parts[1]);if(!transmission)return null;}
 }
 if(!engines.length&&!transmission)return null;
 const sourceEngines=engines.length?uniqueLines(record,'Engine'):[],sourceTransmissions=transmission?uniqueLines(record,'Transmission'):[];
 if(engines.length&&sourceEngines.length!==1||transmission&&sourceTransmissions.length!==1)return null;
 const evidence=[...sourceEngines,...sourceTransmissions];
 if(evidence.some(line=>uncertain.test(line)))return null;
 const result=has=>({has,evidence,method:'sticker-powertrain'});
 if(engines.length){
  const source=sourceEngines[0];
  if(/\bhybrid\b|\bphev\b|\b4xe\b/i.test(source))return null;
  // One line can still be ambiguous; never select its first convenient value.
  if(new Set([...source.matchAll(/\b([1-9](?:\.\d)?)\s*-?\s*(?:l\b|lit(?:er|re)s?\b)/gi)].map(m=>Number(m[1]))).size>1||[...source.matchAll(/\b[iv][ -]?[3468]\b/gi)].length>1)return null;
  const installed=engineProfile(source);
  if(!installed.size||!installed.layout||!installed.count)return null;
  const states=engines.map(wanted=>{
   if(['size','count','layout'].some(field=>wanted[field]!==installed[field]))return false;
   if(wanted.turbo&&!installed.turbo)return null;
   if(wanted.stopStart&&!/\bStop[ /-]Start\b/i.test(source))return null;
   return true;
  });
  if(states.every(state=>state===false))return result(false);
  if(!states.includes(true))return null;
 }
 if(transmission){
  const source=speedWords(sourceTransmissions[0]),speeds=[...source.matchAll(/\b(\d+)[ -]speed\b/gi)].map(m=>m[1]),types=[...source.matchAll(/\b(manual|automatic)\b/gi)].map(m=>m[1].toLowerCase());
  if(new Set(speeds).size!==1||new Set(types).size!==1)return null;
  if(speeds[0]!==transmission.speed||types[0]!==transmission.type)return result(false);
 }
 return result(true);
}
