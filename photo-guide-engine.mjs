import {parseQuery,matchVehicle} from './equipment-search.mjs';
import {withComparisonSpecifications} from './comparison-specs.mjs';

const list=value=>Array.isArray(value)?value:[];
const text=value=>typeof value==='string'&&value.trim().length>0;
const choiceValue=choice=>choice&&text(choice.feature)&&(typeof choice.value==='boolean'||text(choice.value));
const scopeKey=lineup=>lineup.id+':'+lineup.year;
const identityText=value=>' '+String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()+' ';
const validExclusions=lineup=>lineup.excludeIdentityTokens===undefined||
 (Array.isArray(lineup.excludeIdentityTokens)&&lineup.excludeIdentityTokens.every(value=>text(value)&&/[a-z0-9]/i.test(value)));
const wranglerScope='2026-wrangler-four-door-gas';
const wranglerTrims={B:'sport',S:'sport-s',W:'willys',G:'sahara',R:'rubicon',Y:'rubicon-x'};
const normalized=value=>String(value||'').normalize('NFKC').replace(/[\u2010-\u2015]/g,'-').replace(/\s+/g,' ').trim();
// The manufacturer 2026 four-door order guide distinguishes E7 Sport/Sahara
// cloth from K7 Rubicon cloth although their short sticker descriptions match.
// Its CPP codes also keep special editions out when a listing just says Sport.
function wranglerConfiguration(vehicle,record){
 if(vehicle?.year!==2026||record?.status!=='verified'||record.vin!==vehicle.vin||record.equipmentSectionComplete!==true||
  !Array.isArray(record.lines)||!record.lines.every(line=>typeof line==='string')||
  !Array.isArray(record.identityLines)||!record.identityLines.every(line=>typeof line==='string'))return null;
 const identity=record.identityLines.map(normalized),lines=record.lines.map(normalized),title=normalized(vehicle.title);
 if(!/\b2026\b.*\bjeep wrangler\b/i.test(title)||
  !identity.some(line=>/^2026 MODEL YEAR\b/i.test(line))||
  identity.some(line=>/\b20\d{2} MODEL YEAR\b/i.test(line)&&!/^2026 MODEL YEAR\b/i.test(line)))return null;
 const context=[title,...identity,record.engine||''].join(' ');
 if(/\b(?:2[ -]door|4xe|hybrid|phev|392|V8|RHD|right[ -]hand|Moab|anniversary|edition)\b/i.test(context))return null;
 // Explicit edition packages can survive a generic dealer/model title.
 if(lines.some(line=>/\b(?:anniversary|edition|America\s*250|Rockslide|Whitecap|Willys[ -]41)\b/i.test(line)))return null;
 const modelLines=identity.filter(line=>/\bwrangler\b/i.test(line)).map(line=>line.replace(/ THERE['’]S ONLY ONE\.?$/i,''));
 const models=modelLines.map(line=>line.match(/^(?:JEEP )?WRANGLER 4[ -]DOOR (SPORT(?: S)?|WILLYS|SAHARA|RUBICON(?: X)?) 4X4$/i));
 if(!models.length||models.some(match=>!match))return null;
 const packages=lines.filter(line=>/^Customer Preferred Package\b/i.test(line));
 const codes=[...new Set(packages.map(line=>line.match(/^Customer Preferred Package (2[234][BSWGRY])(?:\s+\$[\d,]+)?$/i)?.[1]?.toUpperCase()))];
 if(codes.length!==1||!codes[0]||codes[0]==='23G')return null;
 const code=codes[0],trim=wranglerTrims[code[2]],engine=normalized(record.engine);
 if(!(code.startsWith('22')?/\b2\.0L\s+I4\b/i:/\b3\.6L\s+V6\b/i).test(engine))return null;
 const compatible=trim==='sport-s'||trim==='willys'?['sport',trim]:trim==='rubicon-x'?['rubicon',trim]:[trim];
 if(models.some(match=>!compatible.includes(match[1].toLowerCase().replace(/ /g,'-'))))return null;
 return {trim,code};
}
const validReviewedScope=lineup=>lineup.id==='wrangler'
 ? lineup.year===2026&&lineup.reviewedScope===wranglerScope
 : lineup.reviewedScope===undefined;
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
 return !list(lineup.excludeIdentityTokens).some(value=>identities.some(identity=>identity.includes(identityText(value))))&&
  (lineup.reviewedScope!==wranglerScope||!!wranglerConfiguration(vehicle,record));
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
  const scoped=choice.model==='wrangler'||choice.reviewedScope!==undefined||choice.allowedTrimIds!==undefined;
  let configuration;
  if(scoped){
   if(choice.model!=='wrangler'||choice.year!==2026||choice.reviewedScope!==wranglerScope)return false;
   configuration=wranglerConfiguration(v,record);if(!configuration)return false;
   if(choice.feature==='seatUpholstery'&&(!Array.isArray(choice.allowedTrimIds)||!choice.allowedTrimIds.length||
    !choice.allowedTrimIds.every(id=>Object.values(wranglerTrims).includes(id))))return false;
   // A dealer/Mopar seat cover is not the pictured factory upholstery.
   if(choice.feature==='seatUpholstery'&&record.lines.some(line=>/\bmopar\b.*\b(?:leather|seat cover|seat trim)/i.test(line)))return false;
  }
  const key=JSON.stringify([choice.feature,choice.value,wanted,choice.reviewedScope,choice.allowedTrimIds]);
  let cached=choiceResults.get(v);if(!cached){cached=new Map();choiceResults.set(v,cached)}
  if(cached.has(key))return cached.get(key);
  let result;
  if(typeof choice.value==='string'){
   const fact=specs(v)?.features[choice.feature],value=choice.value.trim().toLowerCase();
   const exact=typeof fact?.comparisonValue==='string'&&fact.comparisonValue===value&&
    (!configuration||!choice.allowedTrimIds||choice.allowedTrimIds.includes(configuration.trim));
   result=typeof fact?.comparisonValue==='string'&&(wanted?exact:!exact);
  }else{
   // A photo can represent either presence or verified absence of a feature.
   const expected=wanted?choice.value:!choice.value;
   if(!queries.has(key))queries.set(key,{...emptyQuery,requirements:[{id:choice.feature,wanted:expected}]});
   result=matchVehicle(v,record,queries.get(key)).kind==='match';
  }
  cached.set(key,result);return result;
 }
 const rawLineups=list(catalog?.lineups).filter(l=>l&&text(l.id)&&Number.isInteger(l.year)&&text(l.identity)&&Array.isArray(l.questions)&&validExclusions(l)&&validReviewedScope(l));
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
