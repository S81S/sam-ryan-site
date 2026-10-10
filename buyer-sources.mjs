import {buyerModels,buyerLineup} from './buyer-catalog.mjs';
import {readPreferences,registerPreferenceLabels} from './shopping-preferences.mjs';
import {registerReviewedPreferenceEvidence} from './reviewed-preference-evidence.mjs';
let catalogRequest;
let reviewedRequest;
const requests=new Map(),lineups=new Map();
const read=async path=>{const r=await fetch('/'+path,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Cannot load '+path);return r.json();};
export async function loadBuyerCatalog(){
 return catalogRequest ||= Promise.all([read('trim-standard-data.json'),read('data/factory/index.json')])
  .then(([guide,index])=>({guide,index,models:buyerModels(guide,index)}))
  .catch(error=>{catalogRequest=undefined;throw error;});
}
export function registerBuyerLineup(lineup){lineups.set(lineup.id,lineup);registerPreferenceLabels(lineup);return lineup;}
export const loadedBuyerLineup=id=>lineups.get(id);
export async function loadReviewedPreferenceEvidence(){
 return reviewedRequest ||= Promise.all([read('data/feature-photo-guide.json'),read('data/photo-trim-path.json')])
  .then(([catalog,pathData])=>registerReviewedPreferenceEvidence(catalog,pathData))
  .catch(error=>{reviewedRequest=undefined;throw error;});
}
export async function loadBuyerLineup(id){
 if(lineups.has(id))return lineups.get(id);
 if(!requests.has(id))requests.set(id,(async()=>{const {models}=await loadBuyerCatalog(),m=models.find(m=>m.id===id);if(!m)throw Error('Unknown model');const chart=m.meta?await read('data/factory/'+m.meta.file):null;return registerBuyerLineup(buyerLineup(m,chart));})()
  .catch(error=>{requests.delete(id);throw error;}));
 return requests.get(id);
}
// Shared VIN, Inventory and Compare pages load the same reviewed facts for saved
// photo/factory preferences. Normal visits incur no extra requests.
if(typeof location!=='undefined'){
 const p=readPreferences(new URLSearchParams(location.search));
 const ids=[...new Set((p?.requirements||[]).filter(r=>r.model).map(r=>r.model))];
 await Promise.all([...ids.map(id=>loadBuyerLineup(id).catch(()=>null)),...(ids.length?[loadReviewedPreferenceEvidence().catch(()=>null)]:[])]);
}
