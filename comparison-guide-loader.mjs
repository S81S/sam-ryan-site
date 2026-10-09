// Factory charts are large. A blank Compare picker does not need them, and a
// failed request must not create a render/retry loop on a slow connection.
export function createComparisonGuideLoader(fetcher=globalThis.fetch){
 let request;
 const read=path=>Promise.resolve().then(()=>fetcher(path)).then(response=>response.ok?response.json():null).catch(()=>null);
 return ()=>request ||= Promise.all([read('trim-standard-data.json'),read('data/factory/index.json')])
  .then(([trimGuide,factoryIndex])=>({trimGuide,factoryIndex}));
}
