// The trim finder walks a model's lineup from the base trim up, one trim at a time, using the same factory trim
// guide as Compare Trims. At each step it shows what the next trim adds over the trim the shopper is on — new standard
// equipment, and options the next trim offers that this one does not — and moves the shopper to the first trim that
// has everything they picked. A feature the guide does not document for a trim is never treated as missing.
import {equipmentFacts} from './trim-comparison.mjs';

const norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[^a-z0-9.]+/g,' ').trim();

const brandOrder=b=>{const i=['Jeep','Ram','Dodge','Chrysler'].indexOf(b);return i<0?9:i;};
// The finder only walks trims the factory guide describes in full: comparing against a trim with a handful of
// published rows would call standard equipment "new". A trim is walked when its guide lists at least 40% as many
// items as the model's most detailed trim (and at least 10); the rest are named separately as "fewer published
// details". A model is offered when most of its trims are walked (or it has a single, detailed trim).
// "Jeep Wrangler 4-Door" → "Wrangler 4-Door", but "Ram 1500" stays "Ram 1500".
const shortName=m=>{const n=m.name.replace(/\s*\/.*$/,''),bare=n.replace(new RegExp('^'+(m.brand||'')+'\\s+'),'');return (/^\d/.test(bare)?n:bare).replace(/\((Gas|Electric)\)/,(x,w)=>'('+w.toLowerCase()+')');};
const sortName=m=>m.name.replace(/^(?:Ram|Chrysler)\s+/,'');
const rowsOf=t=>(t.comparison?.length?t.comparison:t.standard||[]).length;
export function finderModels(data){
 const out=[];
 for(const m of data?.models||[]){
  if(!m.trims?.length)continue;
  const most=Math.max(...m.trims.map(rowsOf)),need=Math.max(10,most*.4);
  const walked=m.trims.filter(t=>rowsOf(t)>=need),others=m.trims.filter(t=>rowsOf(t)<need);
  if(!walked.length||(m.trims.length>1&&walked.length<Math.max(2,m.trims.length/2)))continue;
  out.push({id:m.id,brand:m.brand||m.name.split(' ')[0],year:m.year,name:shortName(m),
   model:{...m,trims:walked},others,below:m.trims.slice(0,m.trims.indexOf(walked[0]))});
 }
 return out.sort((a,b)=>brandOrder(a.brand)-brandOrder(b.brand)||sortName(a).localeCompare(sortName(b))||a.year-b.year);
}

const factsOf=new WeakMap();
function facts(trim){if(!factsOf.has(trim))factsOf.set(trim,equipmentFacts(trim));return factsOf.get(trim);}
const factFor=(trim,key)=>facts(trim).find(f=>f.key===key)||null;

// Everything standard on a trim, in the guide's order.
export function standardEquipment(trim){return facts(trim).filter(f=>f.status==='standard');}

// What `next` adds over `current`: equipment that becomes standard on the next trim (including what is only an
// option on the current trim — Sam: an option is not taken off), a different standard version (a bigger screen),
// and options the current trim does not offer. What the current trim already has standard is left out. When the
// guide does not list an item for the current trim, it is still left out if there is evidence the current trim has
// it standard: a trim below it lists it as standard, or a window sticker on one of the current trim's vehicles in
// stock shows it (`onCurrent`).
export function stepUp(current,next,{below=[],onCurrent=()=>false}={}){
 const adds=[],changes=[],options=[];
 const already=key=>below.some(t=>factFor(t,key)?.status==='standard')||onCurrent(key);
 const upgradeOn=(now,value)=>(now?.options||[]).some(x=>norm(x.value)===norm(value));
 for(const f of facts(next)){
  const now=factFor(current,f.key);
  if(f.status==='standard'){
   if(now?.status==='standard'){
    // Same item, different standard version (a bigger screen, other tires).
    if(norm(now.value)!==norm(f.value))changes.push({key:f.key,label:f.label,value:f.value,note:f.note,sourceUrl:f.sourceUrl,before:describe(now),need:'standard',was:now.value});
   }else if(now?.status==='optional'||now?.status==='unavailable'||(!now&&!already(f.key)))adds.push({key:f.key,label:f.label,value:f.value,note:f.note,sourceUrl:f.sourceUrl,before:now?describe(now):null,need:'standard'});
  }else if(f.status==='optional'&&(now?.status==='unavailable'||(!now&&!already(f.key))))options.push({key:f.key,label:f.label,value:f.value,note:f.note,sourceUrl:f.sourceUrl,before:now?describe(now):null,need:'option'});
  // Upgrades offered on the next trim that the current trim does not offer (a bigger screen, a better stereo).
  for(const o of f.options||[]){
   if(upgradeOn(now,o.value)||(now?.status==='standard'&&norm(now.value)===norm(o.value)))continue;
   // The current trim has this item standard while the next trim only offers it as an extra (a Warlock's standard
   // locker against a Big Horn's locker option): nothing new to step up for.
   if(now?.status==='standard'&&f.status!=='standard')continue;
   options.push({key:o.key||o.label,label:o.label,value:o.value,note:o.note,sourceUrl:o.sourceUrl,base:f.key,before:now?describe(now):null,need:'option'});
  }
 }
 return {adds,changes,options};
}
// The options a trim offers (extra-cost packages and upgrades), so a shopper can add them without changing trim.
export function trimOptions(trim){
 const out=[];
 for(const f of facts(trim)){
  if(f.status==='optional')out.push({key:f.key,label:f.label,value:f.value,note:f.note,sourceUrl:f.sourceUrl,need:'option'});
  for(const o of f.options||[])out.push({key:o.key||o.label,label:o.label,value:o.value,note:o.note,sourceUrl:o.sourceUrl,base:f.key,need:'option'});
 }
 return out;
}
function describe(f){return f.status==='standard'?f.value:f.status==='optional'?'Optional: '+f.value:f.status==='unavailable'?'Not offered':'Not documented';}

// Does this trim give the shopper this pick?
export function satisfies(trim,pick){
 if(pick.base){
  // An upgrade: standard here, or offered here as an option.
  const f=factFor(trim,pick.base);if(!f)return null;
  if(f.status==='standard'&&norm(f.value)===norm(pick.value))return 'standard';
  return (f.options||[]).some(o=>norm(o.value)===norm(pick.value))?'option':false;
 }
 const f=factFor(trim,pick.key);
 if(!f||f.status==='verify')return null;
 if(f.status==='standard'&&(!pick.was||norm(f.value)!==norm(pick.was)))return 'standard';
 if(pick.need==='option'&&f.status==='optional')return 'option';
 return false;
}

// The first trim after `from` with everything picked. When no trim has it all, the one that has the most.
export function nextMatch(model,from,picks){
 let best=null;
 for(let i=from+1;i<model.trims.length;i++){
  const got=picks.map(p=>satisfies(model.trims[i],p)),have=got.filter(Boolean).length;
  if(have===picks.length)return {index:i,missing:[],asOption:picks.filter((p,n)=>got[n]==='option')};
  if(!best||have>best.have)best={index:i,have,missing:picks.filter((p,n)=>!got[n]),asOption:picks.filter((p,n)=>got[n]==='option')};
 }
 return best&&best.have?{index:best.index,missing:best.missing,asOption:best.asOption}:null;
}

// How the shopper's picks stand on the trim they ended on.
export function pickStatus(trim,picks){return picks.map(p=>({...p,on:satisfies(trim,p)}));}

// How one in-stock vehicle measures up to the picks, by its own window sticker where the sticker can answer, and by
// the factory guide's column for its trim where it cannot. Per pick: on = 'yes' | 'no' | 'check', by = 'sticker' | 'trim'.
// `entry` is the model's block of data/trim-stock.json (feature ids, guide row → feature ids, vehicles).
export function vehicleFit(vehicle,trim,picks,entry){
 return picks.map(pick=>{
  // The factory chart says the vehicle's trim is never built with it: no sticker reading can make it a match.
  const chartFact=trim?.comparison?.find(f=>f.factory&&f.key===(pick.base||pick.key));
  if(chartFact?.status==='unavailable'&&!pick.base)return {pick,on:'no',by:'trim'};
  // Explicit mapped evidence resolves the same VIN facts used by Inventory.
  // Missing evidence still permits a named installed option or a factory-standard answer.
  const ids=entry?.rows?.[pick.key]||[],read=vehicle.sticker&&ids.length;
  if(read&&ids.some(n=>vehicle.y.includes(n)))return {pick,on:'yes',by:'sticker'};
  if(read&&ids.every(n=>vehicle.n.includes(n)))return {pick,on:'no',by:'sticker'};
  // A named installed option is positive evidence. Other vehicles cannot prove its absence here.
  const oi=entry?.opts?.indexOf(pick.key)??-1;
  if(vehicle.sticker&&oi>=0&&vehicle.o?.includes(oi))return {pick,on:'yes',by:'sticker'};
  // An unmatched engine description can be incomplete; only explicit mapped negatives establish absence.
  const t=trim?satisfies(trim,pick):null;
  if(t==='standard')return {pick,on:'yes',by:'trim'};
  if(read)return {pick,on:'check',by:'sticker'};
  // Missing optional names stay unresolved, regardless of optSeen on other VINs.
  if(t==='option')return {pick,on:'check',by:'trim'};
  return {pick,on:'check',by:'trim'};
 });
}
// Every in-stock vehicle of the model, scored against the picks: exact matches first, then the closest.
export function inventoryFit(entry,trims,picks){
 const rows=(entry?.vehicles||[]).map(v=>{const fit=vehicleFit(v,trims.find(t=>t.id===v.trim),picks,entry);
  return {v,fit,yes:fit.filter(f=>f.on==='yes').length,no:fit.filter(f=>f.on==='no').length,check:fit.filter(f=>f.on==='check').length};});
 rows.sort((a,b)=>b.yes-a.yes||a.no-b.no||(a.v.price??Infinity)-(b.v.price??Infinity));
 const availability=picks.map((pick,i)=>({pick,yes:rows.filter(r=>r.fit[i].on==='yes').length,check:rows.filter(r=>r.fit[i].on==='check').length}));
 return {rows,exact:rows.filter(r=>r.yes===picks.length),possible:rows.filter(r=>r.no===0&&r.check>0),availability};
}
