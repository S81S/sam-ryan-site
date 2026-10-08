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

// What `next` adds over `current`: new standard equipment, standard equipment that is different, and options newly offered.
export function stepUp(current,next){
 const adds=[],changes=[],options=[];
 for(const f of facts(next)){
  const now=factFor(current,f.key);
  if(f.status==='standard'){
   if(!now||now.status!=='standard')adds.push({key:f.key,label:f.label,value:f.value,note:f.note,sourceUrl:f.sourceUrl,before:now?describe(now):null,need:'standard'});
   // Same item, different standard version (a bigger screen, other tires): shown apart, as a change rather than an addition.
   else if(norm(now.value)!==norm(f.value))changes.push({key:f.key,label:f.label,value:f.value,note:f.note,sourceUrl:f.sourceUrl,before:describe(now),need:'standard',was:now.value});
  }else if(f.status==='optional'&&(!now||now.status==='unavailable'))options.push({key:f.key,label:f.label,value:f.value,note:f.note,sourceUrl:f.sourceUrl,before:now?describe(now):null,need:'option'});
  // Upgrades offered on the next trim that this trim does not offer (a bigger screen, a better stereo).
  for(const o of f.options||[]){
   const offered=(now?.options||[]).some(x=>norm(x.value)===norm(o.value));
   if(!offered&&!(now?.status==='standard'&&norm(now.value)===norm(o.value)))options.push({key:o.key||o.label,label:o.label,value:o.value,note:o.note,sourceUrl:o.sourceUrl,base:f.key,before:now?describe(now):null,need:'option'});
  }
 }
 return {adds,changes,options};
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
