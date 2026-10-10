import {loadedBuyerLineup} from './buyer-sources.mjs';
import {guideTrim} from './trim-link.mjs';
import {factoryRowIds} from './factory-stickers.mjs';
import {plainFact} from './plain-labels.mjs';
import {packageDetails,listedPackageNames} from './package-equipment.mjs';

const norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[®™]/g,'').replace(/[\u2010-\u2015]/g,'-').replace(/\s+\$[\d,.]+.*$/,'').replace(/\([^()]*\)/g,' ').replace(/[^a-z0-9.]+/g,' ').trim();
const packageKey=s=>norm(s).replace(/\s+group$/,'');
export function buyerVehicleTrim(lineup,vehicle,record){
 if(record?.status==='verified'&&record.vin!==vehicle.vin)return null;
 if(Number(vehicle.year)!==lineup.year)return null;
 const match=guideTrim(vehicle,record,{models:[{id:lineup.modelId,year:lineup.year,name:lineup.name,brand:lineup.brand,trims:lineup.trims}]});
 if(!match)return null;
 const identity=(record?.identityLines||[]).join(' ')||vehicle.title||'',filter=lineup.meta?.stock;
 if(filter?.only&&!new RegExp(filter.only,'i').test(identity)||filter?.not&&new RegExp(filter.not,'i').test(identity))return null;
 return match;
}
export function buyerPreferenceCheck(vehicle,record,resolved,r){
 let evidence=[],sourceUrl,known=false,has=false,method;
 const lineup=loadedBuyerLineup(r.model),choice=lineup?.choices.get(r.value),match=lineup&&buyerVehicleTrim(lineup,vehicle,record);
 if(!choice||choice.year!==r.year)return {id:r.feature,label:r.label,wanted:r.wanted,value:r.value,state:'unknown',evidence:[]};
 const valid=record?.status==='verified'&&record.vin===vehicle.vin&&Array.isArray(record.lines);
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
   // Generic yes/no rows only. Numeric sizes, bundled features and specific
   // materials/versions need their own literal evidence, not a broad boolean.
   const ids=example.factory?factoryRowIds(example):[];
   const text=[p.group,p.name].join(' ');
   const generic=!/[0-9]|\b(?:requires?|includes?|only|except|leather|cloth|nappa|alpine|harman|reflector|projector)\b/i.test(text);
   if(!known&&generic&&ids.length===1){const fact=resolved?.features?.[ids[0]];if(typeof fact?.value==='boolean'){known=true;has=fact.value;evidence=fact.evidence||[];sourceUrl=fact.sourceUrl||sourceUrl;method=fact.method;}}
  }
  // A factory standard is a starting configuration, not proof that a replaceable
  // screen, wheel, engine or package is installed on an individual VIN.
  if(!known&&f){evidence=[`${match.trim.name}: ${f.status==='standard'?'Factory standard starting equipment':f.status==='optional'?'Factory option / package':'Factory chart says not offered'}; installed equipment is not confirmed by this record.`,f.note].filter(Boolean);sourceUrl=f.sourceUrl;}
 }else if(!match){return {id:r.feature,label:choice.label,wanted:r.wanted,value:r.value,state:'conflict',evidence:['This vehicle is outside the selected model year, body or trim scope.']};}
 return {id:r.feature,label:choice.label,wanted:r.wanted,value:r.value,state:known?(has===r.wanted?'match':'conflict'):'unknown',evidence,sourceUrl,method};
}
