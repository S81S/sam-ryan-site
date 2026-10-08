// Which new vehicles in stock are which trim, for the trim finder. Each vehicle is matched to its factory trim-guide
// column from its own window sticker (same rules as Compare VINs), and each trim gets a search that finds them.
import {readFileSync,writeFileSync} from 'node:fs';
import {guideTrim,guideRowIds} from '../trim-link.mjs';
import {applyFactoryEquipment} from '../factory-equipment.mjs';
import {parseQuery,matchVehicle} from '../equipment-search.mjs';
import {factoryFacts} from '../factory-facts.mjs';
import {factoryRowIds} from '../factory-stickers.mjs';
import {colorKey,colorName} from '../color-names.mjs';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url),'utf8'));
const data=read('trim-standard-data.json'),inventory=read('data/used-inventory.json'),records=read('data/equipment-index.json').records;
// The factory charts (data/factory): their rows are what Perfect Match offers, so each row is mapped to the window-sticker
// features that answer it, the same way as the trim guide's rows.
const factoryIndex=read('data/factory/index.json');
const charts=Object.entries(factoryIndex.models).map(([id,m])=>({id,model:m.model,fleet:m.fleet,entry:read('data/factory/'+m.file)}));
const listed=inventory.vehicles.filter(v=>v.condition==='New'&&v.locationId==='18393'&&v.status!=='not-observed');
const groups=new Map();
for(const v of listed){
 const m=guideTrim(v,records[v.vin],data);if(!m)continue;
 const key=m.model.id+'/'+m.trim.id;if(!groups.has(key))groups.set(key,{m,vehicles:[]});groups.get(key).vehicles.push(v);
}
// The inventory search that returns these vehicles with the fewest others: words every one of their titles shares.
const skip=new Set(['new','crew','cab','quad','mega','box','4x4','4x2','awd','fwd','rwd','long','cargo','van','roof','low','high','wb','chassis']);
function bestQuery(vehicles,m){
 const sets=vehicles.map(v=>new Set(v.title.toLowerCase().split(/[^a-z0-9'-]+/).filter(Boolean)));
 const shared=[...sets[0]].filter(w=>sets.every(s=>s.has(w))&&!skip.has(w)&&!/^\d+'/.test(w));
 const candidates=[shared.join(' '),...m.trim.name.split(' / ').map(n=>['new',m.model.year,...shared.filter(w=>!/^\d{4}$/.test(w)&&!n.toLowerCase().split(/\s+/).includes(w)).slice(0,3),n.toLowerCase()].join(' '))];
 let best=null;
 for(const q of candidates){
  if(!q.trim())continue;
  const p=parseQuery(q);let hit=0,extra=0;
  for(const v of listed){const r=matchVehicle(v,records[v.vin],p);if(r.kind==='excluded')continue;if(vehicles.includes(v))hit++;else extra++;}
  const score=[hit===vehicles.length?0:1,extra,q.length];
  if(!best||score.join()<best.score.join()&&(score[0]<best.score[0]||score[0]===best.score[0]&&(score[1]<best.score[1]||score[1]===best.score[1]&&score[2]<best.score[2])))best={q,score,hit,extra};
 }
 return best;
}
const trims={};
for(const [key,{m,vehicles}] of groups){
 vehicles.sort((a,b)=>(a.price??Infinity)-(b.price??Infinity));
 const prices=vehicles.map(v=>v.price).filter(Number.isFinite);
 const q=bestQuery(vehicles,m);
 trims[key]={count:vehicles.length,from:prices.length?Math.min(...prices):null,query:q?.q||null,queryExtra:q?.extra??null,
  vins:vehicles.map(v=>v.vin)};
}
// Per model: every in-stock vehicle with what its own window sticker says about each feature a guide row can be
// checked against, so a shopper's picks are matched to actual VINs whatever their trim.
const models={};
for(const [key,{m,vehicles}] of groups){
 const id=m.model.id,fresh=!models[id],entry=models[id]||(models[id]={ids:[],rows:{},vehicles:[]});
 const add=(row,ids)=>{const list=entry.rows[row]||(entry.rows[row]=[]);for(const f of ids){let n=entry.ids.indexOf(f);if(n<0){n=entry.ids.length;entry.ids.push(f);}if(!list.includes(n))list.push(n);}};
 if(fresh){
  for(const trim of m.model.trims)for(const [row,ids] of guideRowIds(trim))add(row,ids);
  // Chart rows: only a sticker feature that covers the row itself (factory-stickers.mjs).
  for(const c of charts.filter(c=>c.model===id))for(const t of c.entry.trims)for(const fact of factoryFacts(c.entry,t,{fleet:c.fleet})){const ids=factoryRowIds(fact);if(ids.length)add(fact.key,ids);}
 }
 for(const v of vehicles){
  const sticker=applyFactoryEquipment(v,records[v.vin]),features=sticker?.status==='verified'?sticker.features||{}:{};
  const paint=(records[v.vin]?.lines||[]).find(l=>/^Exterior Color:/i.test(l));
  entry.vehicles.push({vin:v.vin,stock:v.stock,title:v.title,trim:m.trim.id,color:paint?colorName(paint):null,colorKey:paint?colorKey(paint):null,price:Number.isFinite(v.price)?v.price:null,photo:(v.photoUrls||[])[0]||v.photoUrl||null,sticker:sticker?.status==='verified',_v:v,_f:features});
 }
}
for(const entry of Object.values(models)){
 for(const v of entry.vehicles){
  v.y=[];v.n=[];entry.ids.forEach((f,n)=>{if(v._f[f]?.value===true)v.y.push(n);else if(v._f[f]?.value===false)v.n.push(n);});
  delete v._v;delete v._f;
 }
 entry.vehicles.sort((a,b)=>(a.price??Infinity)-(b.price??Infinity));
}
const out={generatedAt:inventory.capturedAt,trims,models};
const file=new URL('../data/trim-stock.json',import.meta.url),text=JSON.stringify(out);
let old='';try{old=readFileSync(file,'utf8')}catch{}
if(old!==text)writeFileSync(file,text);
console.log(`${Object.keys(trims).length} trims with new vehicles in stock; ${Object.values(trims).reduce((n,t)=>n+t.count,0)} vehicles matched.`);
