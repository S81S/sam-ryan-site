import {withComparisonSpecifications} from './comparison-specs.mjs';
import {applyFactoryEquipment} from './factory-equipment.mjs';
import {wranglerConfiguration} from './photo-choice-scope.mjs';
import {evidenceVersion} from './evidence-version.mjs';
import {buyerPreferenceCheck} from './buyer-evidence.mjs';
const resolvedCache=new WeakMap();
// The same three-state test serves photo choices, inventory and Compare.
export function preferenceChecks(vehicle,record,requirements=[]){
 const valid=record?.status==='verified'&&record.vin===vehicle?.vin&&Array.isArray(record.lines)&&record.lines.every(l=>typeof l==='string')&&
  (record.identityLines===undefined||Array.isArray(record.identityLines)&&record.identityLines.every(l=>typeof l==='string'));
 let resolved=null;
 if(valid){
  const version=evidenceVersion(vehicle,record),cached=resolvedCache.get(vehicle);
  if(cached?.version===version)resolved=cached.resolved;
  else{resolved=withComparisonSpecifications(vehicle,applyFactoryEquipment(vehicle,record));resolvedCache.set(vehicle,{version,resolved});}
 }
 return requirements.map(r=>{
  if(r.feature==='factoryChoice')return buyerPreferenceCheck(vehicle,record,resolved,r);
  let fact=resolved?.features?.[r.feature],exact,known=false;
  // Tow Pages is a dashboard feature, not evidence of installed hitch hardware.
  if(r.feature==='tow'&&fact?.value===true){
   const evidence=(valid?record.lines:[]).filter(l=>/receiver[ -]hitch|\b(?:class\s*(?:[ivx]+|[1-5])\s+)?(?:trailer[ -])?hitch\b|\btow(?:ing)? package\b/i.test(l)&&!/\b(?:delete|removed|without|not equipped|if equipped|available separately)\b/i.test(l));
   fact=evidence.length?{...fact,evidence}:null;
  }
  if(r.feature==='rambox'&&fact?.value===true&&fact.evidence?.some(l=>/\b(?:removed|delete|without|if equipped)\b/i.test(l)))fact=null;
  const scoped=r.model==='wrangler'||r.reviewedScope!==undefined||r.allowedTrimIds!==undefined;
  let configuration;
  if(scoped){
   configuration=r.model==='wrangler'&&r.year===2026&&r.reviewedScope==='2026-wrangler-four-door-gas'?wranglerConfiguration(vehicle,record):null;
   if(!configuration||r.feature==='seatUpholstery'&&(!r.allowedTrimIds?.length||record.lines.some(l=>/\bmopar\b.*\b(?:leather|seat cover|seat trim)/i.test(l))))fact=null;
  }
  if(typeof r.value==='boolean'){known=typeof fact?.value==='boolean';exact=fact?.value===r.value;}
  else{known=typeof fact?.comparisonValue==='string';exact=known&&fact.comparisonValue===r.value.trim().toLowerCase()&&(!configuration||!r.allowedTrimIds||r.allowedTrimIds.includes(configuration.trim));}
  return {id:r.feature,label:r.label,wanted:r.wanted,value:r.value,state:known?(exact===r.wanted?'match':'conflict'):'unknown',
   evidence:fact?.evidence||[],sourceUrl:fact?.sourceUrl||record?.sourceUrl,method:fact?.method};
 });
}
