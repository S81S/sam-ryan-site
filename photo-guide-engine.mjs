import {parseQuery,matchVehicle} from './equipment-search.mjs';
import {withComparisonSpecifications} from './comparison-specs.mjs';

const list=value=>Array.isArray(value)?value:[];
const text=value=>typeof value==='string'&&value.trim().length>0;
const choiceValue=choice=>choice&&text(choice.feature)&&(typeof choice.value==='boolean'||text(choice.value));
const scopeKey=lineup=>lineup.id+':'+lineup.year;
const identityText=value=>' '+String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()+' ';
const validExclusions=lineup=>lineup.excludeIdentityTokens===undefined||
 (Array.isArray(lineup.excludeIdentityTokens)&&lineup.excludeIdentityTokens.every(value=>text(value)&&/[a-z0-9]/i.test(value)));
function sameModel(vehicle,lineup,record){
 const title=identityText(vehicle.title);
 if(!title.includes(identityText(lineup.identity)))return false;
 const titleYears=String(vehicle.title||'').match(/\b20\d{2}\b/g)||[];
 if(titleYears.some(year=>Number(year)!==lineup.year))return false;
 if(record?.status==='verified'&&record.vin!==vehicle.vin)return false;
 if(record?.identityLines!==undefined&&(!Array.isArray(record.identityLines)||!record.identityLines.every(line=>typeof line==='string')))return false;
 const identityLines=list(record?.identityLines);
 const stickerYears=identityLines.flatMap(line=>[...line.matchAll(/\b(20\d{2})\s+MODEL YEAR\b/gi)].map(match=>Number(match[1])));
 if(stickerYears.some(year=>year!==lineup.year))return false;
 // Jeep and Chrysler stickers can omit the make from the model line. Ram's
 // make stays in its key so a ProMaster 3500 cannot become a Ram 3500 pickup.
 const modelIdentity=identityText(lineup.identity.replace(/^(?:jeep|chrysler|dodge)\s+/i,''));
 const modelLines=identityLines.filter(line=>/[a-z]/i.test(line)&&!/^\s*20\d{2}\s+MODEL YEAR\b/i.test(line));
 if(modelLines.length&&!modelLines.some(line=>identityText(line).includes(modelIdentity)))return false;
 // Scope exclusions use only listing/sticker identity, never package text.
 // Whole-token phrases distinguish Grand Cherokee L from Laredo/Limited.
 const identities=[title,...identityLines.map(identityText)];
 return !list(lineup.excludeIdentityTokens).some(value=>identities.some(identity=>identity.includes(identityText(value))));
}

export function createPhotoGuide(catalog,vehicles,records) {
 vehicles=list(vehicles).filter(v=>v&&text(v.vin));
 records=records&&typeof records==='object'?records:{};
 const byVIN=new Map(vehicles.map(v=>[v.vin,v]));
 // Catalog, inventory and sticker records are one immutable loaded snapshot.
 // Cache equipment resolution so budget typing does not reparse every sticker.
 const resolved=new WeakMap(),choiceResults=new WeakMap(),queries=new Map();
 const specs=v=>{if(!resolved.has(v))resolved.set(v,withComparisonSpecifications(v,records[v.vin]));return resolved.get(v)};
 const emptyQuery=parseQuery('');
 function choiceMatches(v,choice,wanted=true){
  if(!v||!choiceValue(choice)||typeof wanted!=='boolean')return false;
  const record=records[v.vin];
  if(record?.status!=='verified'||record.vin!==v.vin||!Array.isArray(record.lines)||
   !record.lines.every(line=>typeof line==='string')||
   (record.identityLines!==undefined&&(!Array.isArray(record.identityLines)||!record.identityLines.every(line=>typeof line==='string'))))return false;
  const key=JSON.stringify([choice.feature,choice.value,wanted]);
  let cached=choiceResults.get(v);if(!cached){cached=new Map();choiceResults.set(v,cached)}
  if(cached.has(key))return cached.get(key);
  let result;
  if(typeof choice.value==='string'){
   const fact=specs(v)?.features[choice.feature],value=choice.value.trim().toLowerCase();
   result=typeof fact?.comparisonValue==='string'&&(wanted?fact.comparisonValue===value:fact.comparisonValue!==value);
  }else{
   // A photo can represent either presence or verified absence of a feature.
   const expected=wanted?choice.value:!choice.value;
   if(!queries.has(key))queries.set(key,{...emptyQuery,requirements:[{id:choice.feature,wanted:expected}]});
   result=matchVehicle(v,record,queries.get(key)).kind==='match';
  }
  cached.set(key,result);return result;
 }
 const rawLineups=list(catalog?.lineups).filter(l=>l&&text(l.id)&&Number.isInteger(l.year)&&text(l.identity)&&Array.isArray(l.questions)&&validExclusions(l));
 const scopeCounts=new Map();for(const l of rawLineups)scopeCounts.set(scopeKey(l),(scopeCounts.get(scopeKey(l))||0)+1);
 const scopes=new Map(rawLineups.filter(l=>scopeCounts.get(scopeKey(l))===1).map(l=>[scopeKey(l),{lineup:l,identity:parseQuery(l.identity)}]));
 const photoCounts=new Map();for(const p of list(catalog?.photos))if(p&&text(p.id))photoCounts.set(p.id,(photoCounts.get(p.id)||0)+1);
 const photos=new Map(list(catalog?.photos).filter(photo=>{
  if(!photo||!text(photo.id)||photoCounts.get(photo.id)!==1||!choiceValue(photo))return false;
  const v=byVIN.get(photo.vin),scope=scopes.get(photo.model+':'+photo.year),record=records[photo.vin];
  if(!scope||!v||v.external||v.status==='not-observed')return false;
  const stickerYears=list(record?.identityLines).flatMap(line=>{const m=String(line).match(/\b(20\d{2})\s+MODEL YEAR\b/i);return m?[Number(m[1])]:[]});
  return photo.reviewed===true&&text(photo.reviewedAt)&&v.locationId==='18393'&&v.year===photo.year&&v.stock===photo.stock&&
   stickerYears.every(year=>year===photo.year)&&
   // Model identity must come from the pictured vehicle, not another model
   // mentioned somewhere in its equipment or package description.
   sameModel(v,scope.lineup,record)&&matchVehicle(v,null,scope.identity).kind==='match'&&
   /^\/assets\/feature-photos\/[a-z0-9-]+\.jpg$/.test(photo.image)&&
   text(photo.listingSource)&&v.sourceUrl===photo.listingSource&&
   Number.isInteger(photo.photoIndex)&&photo.photoIndex>0&&Array.isArray(v.photoUrls)&&
   text(photo.imageSource)&&v.photoUrls[photo.photoIndex-1]===photo.imageSource&&
   text(photo.stickerSource)&&record?.sourceUrl===photo.stickerSource&&choiceMatches(v,photo);
 }).map(p=>[p.id,p]));
 const lineups=[...scopes.values()].map(({lineup})=>{
  const questions=list(lineup.questions).filter(q=>q&&text(q.id)&&Array.isArray(q.choices));
  const counts=new Map();for(const q of questions)counts.set(q.id,(counts.get(q.id)||0)+1);
  return {...lineup,questions:questions.filter(q=>counts.get(q.id)===1).map(q=>({...q,choices:[...new Set(q.choices)].map(id=>photos.get(id)).filter(p=>p?.model===lineup.id&&p.year===lineup.year)})).filter(q=>q.choices.length)};
 }).filter(l=>l.questions.length);
 const candidates=new Map(lineups.map(l=>{
  const identity=scopes.get(scopeKey(l)).identity;
  return [l,vehicles.filter(v=>!v.external&&v.status!=='not-observed'&&v.year===l.year&&sameModel(v,l,records[v.vin])&&matchVehicle(v,null,identity).kind==='match')];
 }));
 function answerChoices(q,answer){
  const values=Array.isArray(answer)?answer:[answer];
  if(!values.length)return null;
  const checks=[];
  for(const value of values){
   if(typeof value!=='string'||(Array.isArray(answer)&&!value.startsWith('reject:')))return null;
   const reject=value.startsWith('reject:'),choice=q.choices.find(c=>c.id===(reject?value.slice(7):value));
   if(!choice)return null;
   checks.push({choice,wanted:!reject});
  }
  return checks;
 }
 function matches(lineup,answers={},budget=0,condition='New'){
  const pool=candidates.get(lineup);
  if(!pool||!['New','Used','Both'].includes(condition)||!Number.isFinite(budget)||budget<0)return [];
  if(!answers||typeof answers!=='object'||Array.isArray(answers))return [];
  const requirements=[];
  for(const q of lineup.questions){
   const answer=answers[q.id];if(answer===undefined||answer==='skip')continue;
   const checks=answerChoices(q,answer);if(!checks)return [];
   requirements.push(...checks);
  }
  return pool.filter(v=>(condition==='Both'||v.condition===condition)&&
   (!budget||(Number.isFinite(v.price)&&v.price>0&&v.price<=budget))&&
   requirements.every(({choice,wanted})=>choiceMatches(v,choice,wanted)))
   .sort((a,b)=>(a.price??Infinity)-(b.price??Infinity)||String(a.stock||'').localeCompare(String(b.stock||'')));
 }
 function cleanAnswers(lineup,answers){
  const out={};
  if(!candidates.has(lineup)||!answers||typeof answers!=='object'||Array.isArray(answers))return out;
  for(const q of lineup.questions){
   const a=answers[q.id];
   if(Array.isArray(a)){
    const rejects=[...new Set(a.filter(value=>typeof value==='string'&&q.choices.some(c=>value==='reject:'+c.id)))];
    if(rejects.length)out[q.id]=rejects;
   }else if(a==='skip'||q.choices.some(c=>a===c.id||a==='reject:'+c.id))out[q.id]=a;
  }
  return out;
 }
 return {lineups,photos,matches,cleanAnswers,choiceMatches};
}

export function swipeDecision(dx,dy){
 if(!Number.isFinite(dx)||!Number.isFinite(dy)||Math.abs(dx)<65||Math.abs(dx)<=Math.abs(dy)*1.25)return null;
 return dx<0?'reject':'choose';
}
