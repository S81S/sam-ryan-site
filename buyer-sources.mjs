import {buyerModels,buyerLineup} from './buyer-catalog.mjs';
import {readPreferences,registerPreferenceLabels} from './shopping-preferences.mjs';
let catalogRequest;
const requests=new Map(),lineups=new Map();
const read=async path=>{const r=await fetch('/'+path,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Cannot load '+path);return r.json();};
export async function loadBuyerCatalog(){return catalogRequest ||= Promise.all([read('trim-standard-data.json'),read('data/factory/index.json')]).then(([guide,index])=>({guide,index,models:buyerModels(guide,index)}));}
export function registerBuyerLineup(lineup){lineups.set(lineup.id,lineup);registerPreferenceLabels(lineup);return lineup;}
export const loadedBuyerLineup=id=>lineups.get(id);
export async function loadBuyerLineup(id){
 if(lineups.has(id))return lineups.get(id);
 if(!requests.has(id))requests.set(id,(async()=>{const {models}=await loadBuyerCatalog(),m=models.find(m=>m.id===id);if(!m)throw Error('Unknown model');const chart=m.meta?await read('data/factory/'+m.meta.file):null;return registerBuyerLineup(buyerLineup(m,chart));})());
 return requests.get(id);
}
// Shared VIN, Inventory and Compare pages load only the factory models explicitly
// selected in a valid saved preference. Normal visits incur no extra requests.
if(typeof location!=='undefined'){
 const p=readPreferences(new URLSearchParams(location.search));
 const ids=[...new Set((p?.requirements||[]).filter(r=>r.feature==='factoryChoice').map(r=>r.model))];
 await Promise.all(ids.map(id=>loadBuyerLineup(id).catch(()=>null)));
}
