// Turns the factory's own standard/optional charts (data/factory/*.json, built by scripts/factory/build.mjs) into the
// trim facts Perfect Match walks: one fact per chart row per trim, in the chart's words. Every row the chart prints for
// a trim is there, so "what the next trim adds" is the complete list, not a curated sample.
//
// Marks: S standard · O optional · P part of a package · F fleet orders only · NA not offered · '' not documented.
// Combined marks: "S/P" (standard on some versions, packaged on others), "O/F", and "S~NA" (the trim's versions differ,
// e.g. two-door and four-door).

const parts=m=>String(m||'').split(/[/~]/).filter(Boolean);
// → {status, note} or null when the chart says nothing for this trim.
export function readMark(m,{fleet=false,versions=null}={}){
 if(!m)return null;
 const varies=m.includes('~');
 let p=parts(m);
 const fleetOnly=p.includes('F')&&!fleet&&!p.some(x=>x==='S'||x==='O'||x==='P');
 if(fleet)p=p.map(x=>x==='F'?'O':x);else p=p.filter(x=>x!=='F');
 const has=x=>p.includes(x),offered=p.filter(x=>x!=='NA');
 if(fleetOnly)return {status:'unavailable',note:'Fleet orders only'};
 if(!offered.length)return {status:'unavailable',note:''};
 if(offered.every(x=>x==='S')&&!(varies&&has('NA')))return {status:'standard',note:''};
 let note='';
 if(varies)note=`Not the same on every version${versions?` (${versions})`:''}`;
 else if(has('S'))note='Standard on some versions, extra on others';
 else if(offered.every(x=>x==='P'))note='Part of a package';
 else if(has('P'))note='Optional or part of a package';
 return {status:'optional',note};
}

// Facts for one trim (by its column in the chart entry), shaped like the trim guide's comparison facts.
export function factoryFacts(entry,trimId,opts={}){
 const i=entry.trims.indexOf(trimId);if(i<0)return [];
 const out=[],o={...opts,versions:entry.versions};
 for(const row of entry.rows){
  const r=readMark(row[4][i],o);if(!r)continue;
  out.push({key:row[0],label:row[2]?`${row[2]}: ${row[3]}`:row[3],value:'',status:r.status,note:r.note,section:row[1],parent:row[2],text:row[3],sourceUrl:entry.source?.url||null,factory:true});
 }
 // A chart can print the same line twice (two wheel codes, both "17-in. aluminum Rubicon machined with black pockets",
 // one standard and one optional on the Rubicon). The shopper sees it once, at its best: standard, else optional.
 const rank={standard:0,optional:1,unavailable:2},best=new Map();
 for(const f of out){const k=f.label.toLowerCase(),b=best.get(k);if(!b||rank[f.status]<rank[b.status])best.set(k,f);}
 for(let n=out.length-1;n>=0;n--)if(best.get(out[n].label.toLowerCase())!==out[n])out.splice(n,1);
 // Some charts mark more than one engine standard on a trim (the engine depends on the configuration, e.g. the 2026
 // Wrangler Sahara's V-6 and 2.0L turbo rows): neither is "the" standard engine, so each reads as one of the choices.
 const engines=out.filter(f=>f.status==='standard'&&/ENGINE|POWERTRAIN/i.test(f.section||'')&&(!f.parent||/engine/i.test(f.parent))&&/\b\d\.\d\s*-?\s*(?:L|liter)\b|\bHEMI\b|Pentastar|Hurricane|SIXPACK/i.test(f.text||''));
 if(engines.length>1)for(const f of engines){f.status='optional';f.note=`One of the ${engines.length} engines this trim can come with (standard on some versions)`;}
 return out;
}

// The lineups the charts cover, for the picker (no rows needed): each with its charted trims in the guide's order.
// Trims the charts do not cover are kept aside (`uncharted`), and `below` holds those that sit under the first charted
// trim. `fleet` picks the fleet lineups (Chassis Cab, ProMaster City) instead of the retail ones.
const brandOrder=b=>{const i=['Jeep','Ram','Dodge','Chrysler'].indexOf(b);return i<0?9:i;};
const shortName=(m,brand)=>{const n=m.name.replace(/\s*\/.*$/,''),bare=n.replace(new RegExp('^'+brand+'\\s+'),'');return (/^\d/.test(bare)?n:bare).replace(/\((Gas|Electric)\)/i,(x,w)=>'('+w.toLowerCase()+')');};
export function lineups(guide,index,{fleet=false}={}){
 const out=[];
 for(const [id,meta] of Object.entries(index?.models||{})){
  if(!!meta.fleet!==fleet)continue;
  const model=guide.models.find(m=>m.id===meta.model);if(!model)continue;
  const charted=model.trims.filter(t=>meta.trims.includes(t.id));if(!charted.length)continue;
  const brand=model.brand||model.name.split(' ')[0],first=model.trims.indexOf(charted[0]);
  const name=meta.name||shortName(model,brand);
  out.push({id,stockId:meta.model,brand,year:model.year,name,file:meta.file,
   model:{...model,trims:charted},others:meta.name?[]:model.trims.filter(t=>!meta.trims.includes(t.id)),
   below:meta.name?[]:model.trims.slice(0,first),chart:meta.source||null,colors:meta.colors||[],colorsUrl:meta.colorsUrl||null,versions:meta.versions||null,stockFilter:meta.stock||null});
 }
 const sortName=m=>m.name.replace(/^(?:Ram|Chrysler)\s+/,'');
 return out.sort((a,b)=>brandOrder(a.brand)-brandOrder(b.brand)||sortName(a).localeCompare(sortName(b))||a.year-b.year);
}
// A lineup's trims with the chart's facts filled in (once its chart file has loaded).
export function withChart(lineup,entry,{fleet=false}={}){
 return {...lineup,charted:true,model:{...lineup.model,trims:lineup.model.trims.map(t=>({...t,comparison:factoryFacts(entry,t.id,{fleet})}))}};
}

// Fleet lineups sold to businesses: shown in Fleet Match, not in the retail Perfect Match. (Kept in step with FLEET in
// scripts/factory/build.mjs.)
export const FLEET=['ram-chassis-cab','ram-chassis-cab-2027','ram-promaster','ram-promaster-ev','ram-promaster-2027','ram-promaster-city-2027','ram-promaster-city-passenger-2027'];
