import {loadedBuyerLineup} from './buyer-sources.mjs';
import {guideTrim} from './trim-link.mjs';
import {factoryRowIds} from './factory-stickers.mjs';
import {plainFact} from './plain-labels.mjs';
import {packageDetails,listedPackageNames} from './package-equipment.mjs';
import {engineProfile} from './engine-search.mjs';
import {resolveReviewedPreference} from './reviewed-preference-evidence.mjs';
import {repairWranglerRoofEvidence} from './wrangler-roof-evidence.mjs';
import {sourcedGuideFact} from './buyer-option-groups.mjs';
import {wranglerConfigurationEvidence} from './buyer-configuration-evidence.mjs';
import {installedRadioEvidence,installedPowertrainEvidence} from './buyer-installed-configuration.mjs';

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
 const wrangler=wranglerConfigurationEvidence(lineup,fact,record);
 if(wrangler)return wrangler;
 const powertrain=installedPowertrainEvidence(lineup,fact,record);
 if(powertrain)return powertrain;
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
const wranglerRoofChoices={f6l6ob7:'soft',f1dj1wzb:'black',f1dhm9e4:'body',feeakr0:'sky',f10uw5fn:'dual'};
function wranglerRoofEvidence(lineup,choice,vehicle,record){
 const wanted=wranglerRoofChoices[choice.id];
 if(!wanted||lineup.id!=='wrangler'||lineup.year!==2026)return null;
 const unknown=(evidence,ambiguous=false)=>({known:false,evidence,ambiguous,method:'sticker-roof-unresolved'});
 if(record.equipmentSectionComplete!==true||!record.sourceUrl)return unknown([]);
 const clean=line=>line.normalize('NFKC').replace(/[\u2010-\u2015]/g,'-').replace(/[®™]/g,'').replace(/\s+\(VS \d{2}MY:\s*\$[\d,]+\)/ig,'').replace(/\s+\$[\d,]+(?:\.\d{2})?\s*$/,'').replace(/\s+/g,' ').trim();
 const lines=record.lines.map(clean),optionIndex=lines.findIndex(l=>/^OPTIONAL EQUIPMENT\b/i.test(l));
 if(optionIndex<0)return unknown([]);
 const patterns={
  soft:/^(?:(?:Premium )?(?:Black|Tan|Jean Blue) )?Sunrider Soft[ -]?Top$/i,
  black:/^Black 3[ -]Piece Hard[ -]?Top$/i,
  body:/^Body[ -]Color 3[ -]Piece Hard[ -]?Top$/i,
  sky:/^(?:(?:White|Black|Body[ -]Color|Anvil) )?Sky One[ -]Touch Power[ -]Top$/i,
  dual:/^Dual[ -]Top Group$/i,
  otherHard:/^(?:White|Anvil) 3[ -]Piece Hard[ -]?Top$/i
 };
 const entries=lines.flatMap((line,index)=>Object.entries(patterns).filter(([,pattern])=>pattern.test(line)).map(([kind])=>({kind,line:record.lines[index],index})));
 const roofMentions=lines.filter(l=>/Sunrider Soft[ -]?Top|3[ -]Piece Hard[ -]?Top|Sky One[ -]Touch Power[ -]Top|Dual[ -]Top Group|^No Soft[ -]?Top/i.test(l));
 // Conditional mentions and two incompatible roofs in the same option block
 // are contradictory evidence, not permission to choose the convenient line.
 if(roofMentions.some(l=>/\b(?:if equipped|available|delete[ds]?|deletion|without|not equipped|not included|either|or)\b/i.test(l)))return unknown(roofMentions,true);
 const optional=entries.filter(e=>e.index>optionIndex),active=optional.length?optional:entries;
 const of=kind=>active.filter(e=>e.kind===kind),has=kind=>of(kind).length>0;
 const noSoft=record.lines.filter((l,i)=>i>optionIndex&&/^No Soft[ -]?Top$/i.test(clean(l)));
 const hardKinds=['black','body','otherHard'].filter(has);
 if(hardKinds.length>1||has('sky')&&(hardKinds.length||has('dual')||has('soft'))||has('dual')&&noSoft.length)return unknown([...active.map(e=>e.line),...noSoft],true);
 const result=(has,evidence)=>({known:true,has,evidence,method:'sticker-roof-configuration'});
 if(wanted==='soft'&&noSoft.length)return result(false,noSoft);
 if(wanted==='dual'&&has('dual'))return result(true,of('dual').map(e=>e.line));
 if(wanted==='soft'&&has('soft'))return result(true,of('soft').map(e=>e.line));
 if(['black','body','sky'].includes(wanted)&&has(wanted))return result(true,of(wanted).map(e=>e.line));
 if(wanted==='black'&&(has('body')||has('otherHard')))return result(false,active.filter(e=>['body','otherHard'].includes(e.kind)).map(e=>e.line));
 if(wanted==='body'&&has('black'))return result(false,of('black').map(e=>e.line));
 // Reuse existing, narrowly reviewed replacement rules. In particular, a hard
 // top alone never proves that a separately supplied soft top was omitted.
 const repaired=repairWranglerRoofEvidence(vehicle,record),feature={soft:'softTop',black:'hardTop',body:'hardTop',sky:'skyRoof'}[wanted],fact=repaired?.features?.[feature];
 if(fact?.method==='sticker-roof-replacement'){
  if(fact.value===false)return result(false,fact.evidence);
  if(wanted==='soft'&&fact.value===true)return result(true,fact.evidence);
 }
 if(wanted==='dual'&&noSoft.length)return result(false,noSoft);
 return unknown(active.map(e=>e.line));
}
function inWranglerBodyScope(lineup,vehicle,record){
 if(lineup.id!=='wrangler'||lineup.year!==2026)return true;
 const verified=record?.status==='verified'&&record.vin===vehicle.vin;
 if(verified&&(!Array.isArray(record.identityLines)||!record.identityLines.every(l=>typeof l==='string')))return false;
 const identity=verified?record.identityLines.filter(l=>/\bWRANGLER\b/i.test(l)):[];
 const source=identity.length?identity:[String(vehicle.title||'')];
 if(!source.length||source.some(l=>!/\bWRANGLER (?:4[ -]DOOR|UNLIMITED)\b/i.test(l)||/\b2[ -]DOOR\b/i.test(l)))return false;
 // The broad factory lineup includes 392 and special editions, unlike the
 // reviewed photo subset. Restrict body/electrification without excluding them.
 return !/\b(?:4xe|hybrid|phev|plug[ -]in)\b/i.test([...source,verified?record.engine||'':''].join(' '));
}
export function buyerVehicleTrim(lineup,vehicle,record){
 if(record?.status==='verified'&&record.vin!==vehicle.vin)return null;
 if(Number(vehicle.year)!==lineup.year||!inWranglerBodyScope(lineup,vehicle,record))return null;
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
  const f=sourcedGuideFact(lineup,choice.id,match.trim.id)||choice.facts[match.trim.id],example=f||Object.values(choice.facts)[0],p=plainFact(example);
  sourceUrl=record.sourceUrl;
  const roof=wranglerRoofEvidence(lineup,choice,vehicle,record);
  if(roof){
   if(roof.ambiguous)return {id:r.feature,label:choice.label,wanted:r.wanted,value:r.value,state:'unknown',evidence:roof.evidence,sourceUrl,method:roof.method};
   known=roof.known;has=roof.has;evidence=roof.evidence;method=roof.method;
  }
  // Package names must match exactly, including level numbers. A generic Level 2
  // name on a different trim never inherits this trim's factory package contents.
  if(!roof&&!known&&choice.package&&f&&f.status!=='unavailable'&&match.basis==='sticker'){
   const name=packageKey(p.name),groups=packageDetails(record,listedPackageNames(record));
   const group=groups.find(g=>packageKey(g.name)===name);
   const line=record.lines.find(l=>packageKey(l)===name);
   if((group||line)&&!group?.exclusions?.length&&!choice.warning){known=has=true;evidence=[group?.name||line,...(group?.equipment||[])];method='sticker-package';}
  }else if(!roof&&!known&&!choice.package){
   const target=norm([example.parent,example.text||example.label,example.value].filter(Boolean).join(' '));
   const line=record.lines.find(l=>norm(l)===target&&target.length>8&&!/delete|without|not included|if equipped/i.test(l));
   if(line){known=has=true;evidence=[line];method='sticker-exact';}
   const configuration=!known&&configurationEvidence(lineup,example,record);
   if(configuration){known=true;has=configuration.has;evidence=configuration.evidence;method=configuration.method;}
   const radio=!known&&installedRadioEvidence(lineup,choice,example,record,resolved);
   if(radio){known=true;has=radio.has;evidence=radio.evidence;method=radio.method;}
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
  if(!known&&f){evidence=[`${match.trim.name}: ${f.status==='standard'?'Factory standard starting equipment':f.status==='optional'?'Factory option / package':f.status==='verify'?'Factory sources disagree':'Factory chart says not offered'}; installed equipment is not confirmed by this record.`,f.note].filter(Boolean);sourceUrl=f.sourceUrl;}
 }else if(!match){return {id:r.feature,label:choice.label,wanted:r.wanted,value:r.value,state:'conflict',evidence:['This vehicle is outside the selected model year, body or trim scope.']};}
 return {id:r.feature,label:choice.label,wanted:r.wanted,value:r.value,state:known?(has===r.wanted?'match':'conflict'):'unknown',evidence,sourceUrl,method};
}
