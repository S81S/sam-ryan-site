import {loadedBuyerLineup} from './buyer-sources.mjs';
import {guideTrim} from './trim-link.mjs';
import {factoryRowIds} from './factory-stickers.mjs';
import {plainFact} from './plain-labels.mjs';
import {packageDetails,listedPackageNames} from './package-equipment.mjs';
import {engineProfile} from './engine-search.mjs';
import {resolveReviewedPreference} from './reviewed-preference-evidence.mjs';

const norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[®™]/g,'').replace(/[\u2010-\u2015]/g,'-').replace(/\s+\$[\d,.]+.*$/,'').replace(/\([^()]*\)/g,' ').replace(/[^a-z0-9.]+/g,' ').trim();
const packageKey=s=>norm(s).replace(/\s+group$/,'');
function configurationEvidence(lineup,fact,record){
 const text=String(fact.text||fact.label||'').replace(/[®™]/g,'').replace(/\([^()]*\)/g,' ').replace(/\s+/g,' ').trim();
 // Only a whole drive-system choice is answered by the sticker identity.
 // A 4x4 transfer-case package or a named 4WD system needs separate evidence.
 if(/^drive system$/i.test(fact.parent||'')&&/^4x[24]$/i.test(text)){
  const values=[...new Set((record.identityLines||[]).flatMap(l=>l.match(/\b4X[24]\b/gi)||[]).map(s=>s.toLowerCase()))];
  if(values.length===1)return {has:values[0]===text.toLowerCase(),evidence:record.identityLines,method:'sticker-drive'};
 }
 // Reviewed Ram engine rows bundle an engine and an 8-speed automatic. Match
 // every stated part against the VIN's engine/transmission lines; in particular,
 // a 3.0L SO must never satisfy a 3.0L HO choice just because displacement agrees.
 if(lineup.modelId!=='ram-1500'||lineup.year!==2026||!/engine|powertrain/i.test(fact.section||'')||fact.parent)return null;
 const [engine,transmission,...rest]=text.split('/');
 if(rest.length||!/^8-speed automatic$/i.test(transmission?.trim()||'')||
  !/^(?:3\.0L I-?6 Hurricane (?:High|Standard)-Output Twin-Turbo|3\.6L Pentastar V6 with eTorque)$/i.test(engine.trim()))return null;
 const engines=record.lines.filter(l=>/^Engine:/i.test(l)),transmissions=record.lines.filter(l=>/^Transmission:/i.test(l));
 if(engines.length!==1)return null;
 const wanted=engineProfile(engine),installed=engineProfile(engines[0]),evidence=[engines[0],...transmissions];
 const result=has=>({has,evidence,method:'sticker-powertrain'});
 for(const field of ['size','count','layout'])if(wanted[field]&&installed[field]&&wanted[field]!==installed[field])return result(false);
 if(!installed.size||!installed.count||!installed.layout)return null;
 const output=s=>/\bHO\b|high[- ]output/i.test(s)?'HO':/\bSO\b|standard[- ]output/i.test(s)?'SO':null;
 if(wanted.hurricane){
  if(!installed.hurricane)return null;
  if(output(engines[0])&&output(engine)!==output(engines[0]))return result(false);
  if(!output(engines[0]))return null;
 }
 if(/eTorque/i.test(engine)&&!/eTorque/i.test(engines[0]))return null;
 if(transmissions.length!==1)return null;
 const speed=transmissions[0].match(/\b(\d+)[ -]speed\b/i)?.[1];
 if(speed&&speed!=='8'||/manual/i.test(transmissions[0]))return result(false);
 if(speed!=='8'||!/automatic/i.test(transmissions[0]))return null;
 return result(true);
}
export function buyerVehicleTrim(lineup,vehicle,record){
 if(record?.status==='verified'&&record.vin!==vehicle.vin)return null;
 if(Number(vehicle.year)!==lineup.year)return null;
 const match=guideTrim(vehicle,record,{models:[{id:lineup.modelId,year:lineup.year,name:lineup.name,brand:lineup.brand,trims:lineup.trims}]});
 if(!match)return null;
 const identity=(record?.identityLines||[]).join(' ')||vehicle.title||'',filter=lineup.meta?.stock;
 if(filter?.only&&!new RegExp(filter.only,'i').test(identity)||filter?.not&&new RegExp(filter.not,'i').test(identity))return null;
 return match;
}
export function reviewedBuyerPreferenceCheck(vehicle,record,resolved,requirement,base,requirements){
 const lineup=loadedBuyerLineup(requirement.model),match=lineup&&buyerVehicleTrim(lineup,vehicle,record);
 return resolveReviewedPreference({vehicle,record,resolved,requirement,base,requirements,lineup,match});
}
export function buyerPreferenceCheck(vehicle,record,resolved,r){
 let evidence=[],sourceUrl,known=false,has=false,method;
 const lineup=loadedBuyerLineup(r.model),choice=lineup?.choices.get(r.value),match=lineup&&buyerVehicleTrim(lineup,vehicle,record);
 if(!choice||choice.year!==r.year)return {id:r.feature,label:r.label,wanted:r.wanted,value:r.value,state:'unknown',evidence:[]};
 const valid=record?.status==='verified'&&record.vin===vehicle.vin&&Array.isArray(record.lines)&&record.lines.every(l=>typeof l==='string');
 if(match&&valid){
  const f=choice.facts[match.trim.id],example=f||Object.values(choice.facts)[0],p=plainFact(example);
  sourceUrl=record.sourceUrl;
  // Package names must match exactly, including level numbers. A generic Level 2
  // name on a different trim never inherits this trim's factory package contents.
  if(choice.package&&f&&f.status!=='unavailable'&&match.basis==='sticker'){
   const name=packageKey(p.name),groups=packageDetails(record,listedPackageNames(record));
   const group=groups.find(g=>packageKey(g.name)===name);
   const line=record.lines.find(l=>packageKey(l)===name);
   if((group||line)&&!group?.exclusions?.length&&!choice.warning){known=has=true;evidence=[group?.name||line,...(group?.equipment||[])];method='sticker-package';}
  }else if(!choice.package){
   const target=norm([example.parent,example.text||example.label,example.value].filter(Boolean).join(' '));
   const line=record.lines.find(l=>norm(l)===target&&target.length>8&&!/delete|without|not included|if equipped/i.test(l));
   if(line){known=has=true;evidence=[line];method='sticker-exact';}
   const configuration=!known&&configurationEvidence(lineup,example,record);
   if(configuration){known=true;has=configuration.has;evidence=configuration.evidence;method=configuration.method;}
   // Generic yes/no rows only. Numeric sizes, bundled features and specific
   // materials/versions need their own literal evidence, not a broad boolean.
   const ids=example.factory?factoryRowIds(example):[];
   const text=[p.group,p.name].join(' ');
   const generic=!/[0-9]|\b(?:requires?|includes?|only|except|leather|cloth|nappa|alpine|harman|reflector|projector)\b/i.test(text);
   if(!known&&generic&&ids.length===1){const fact=resolved?.features?.[ids[0]];if(typeof fact?.value==='boolean'){known=true;has=fact.value;evidence=fact.evidence||[];sourceUrl=fact.sourceUrl||sourceUrl;method=fact.method;}}
  }
  // An explicitly unavailable choice is different from an undocumented option.
  // Use the exact, sticker-identified model/year/trim only, after installed
  // evidence above has had the opportunity to resolve a chart discrepancy.
  if(!known&&f?.status==='unavailable'&&f.sourceUrl&&match.basis==='sticker'){
   known=true;has=false;sourceUrl=f.sourceUrl;method='factory-unavailable';
   evidence=[`${lineup.year} ${lineup.name} ${match.trim.name}: the factory chart identifies this choice as not offered.`,f.note].filter(Boolean);
  }
  // A factory standard is a starting configuration, not proof that a replaceable
  // screen, wheel, engine or package is installed on an individual VIN.
  if(!known&&f){evidence=[`${match.trim.name}: ${f.status==='standard'?'Factory standard starting equipment':f.status==='optional'?'Factory option / package':'Factory chart says not offered'}; installed equipment is not confirmed by this record.`,f.note].filter(Boolean);sourceUrl=f.sourceUrl;}
 }else if(!match){return {id:r.feature,label:choice.label,wanted:r.wanted,value:r.value,state:'conflict',evidence:['This vehicle is outside the selected model year, body or trim scope.']};}
 return {id:r.feature,label:choice.label,wanted:r.wanted,value:r.value,state:known?(has===r.wanted?'match':'conflict'):'unknown',evidence,sourceUrl,method};
}
