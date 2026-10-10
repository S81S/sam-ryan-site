import {listedPackageNames,mergePackageEvidence} from './package-equipment.mjs';
const requests=new Map();
const cacheKey='carswithsam-package-contents-v1';
function readCache(storage){try{return JSON.parse(storage?.getItem(cacheKey)||'{}');}catch{return {};}}
export function createPackageLoader({fetchPdf,readSticker,storage,changed=()=>{}}){
 const pending=new Map();
 return function loadPackages(vin,index){
  const original=index.records[vin];
  if(original?.status!=='verified'||original.vin!==vin||!original.sha256||!listedPackageNames(original).length||Array.isArray(original.packageGroups))return Promise.resolve();
  const id=vin+':'+original.sha256;
  if(pending.has(id))return pending.get(id);
  const task=(async()=>{
   const cache=readCache(storage),saved=cache[id];
   if(saved){const merged=mergePackageEvidence(original,saved,saved.sourceUrl);if(merged){index.records[vin]=merged;changed();return;}}
   try{
    const response=await fetchPdf(vin);
    if(!response.ok)throw Error('Package source unavailable');
    const bytes=new Uint8Array(await response.arrayBuffer());
    if(bytes.byteLength>20*1024*1024)throw Error('Sticker too large');
    const parsed=await readSticker(bytes,vin);
    const sourceUrl='https://windowsticker.org/api/sticker/'+vin;
    const merged=mergePackageEvidence(index.records[vin],parsed.analysis,sourceUrl);
    if(!merged)throw Error('Package source does not match the saved original');
    index.records[vin]=merged;
    const entries=Object.entries(readCache(storage)).slice(-39);
    try{storage?.setItem(cacheKey,JSON.stringify({...Object.fromEntries(entries),[id]:{vin,sha256:original.sha256,packageGroups:merged.packageGroups,sourceUrl}}));}catch{}
   }catch{
    if(index.records[vin]?.sha256===original.sha256)index.records[vin]={...index.records[vin],packageLookupState:'unavailable'};
   }
   changed();
  })();
  pending.set(id,task);return task;
 };
}
let browserLoader;
export function ensurePackageContents(vin,index){
 if(!browserLoader){let storage;try{storage=window.sessionStorage;}catch{}
  browserLoader=createPackageLoader({storage,
   fetchPdf:vin=>fetch('/api/original-sticker?vin='+encodeURIComponent(vin),{signal:AbortSignal.timeout(30000)}),
   readSticker:async(...args)=>(await import('./sticker-reader.mjs')).readSticker(...args),
   changed:()=>document.dispatchEvent(new CustomEvent('compare:changed'))});
 }
 // Defer until after this comparison render, including synchronous cache hits.
 const original=index.records[vin];if(original?.status!=='verified'||!original.sha256)return;
 const id=vin+':'+original.sha256;
 if(!requests.has(id))requests.set(id,Promise.resolve().then(()=>browserLoader(vin,index)));
 return requests.get(id);
}
