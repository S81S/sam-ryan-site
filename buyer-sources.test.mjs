import test from 'node:test';
import assert from 'node:assert/strict';

const fixtures={
 '/trim-standard-data.json':{models:[{id:'test-model',name:'Test model',brand:'Test',year:2026,trims:[{id:'base',name:'Base'}]}]},
 '/data/factory/index.json':{models:{'test-model':{model:'test-model',file:'test-model.json',trims:['base']}}},
 '/data/factory/test-model.json':{trims:['base'],rows:[],source:{url:'https://example.test/factory'}}
};
let version=0;
const fresh=()=>import('./buyer-sources.mjs?retry-test='+ ++version);
const response=path=>({ok:true,json:async()=>structuredClone(fixtures[path])});

test('a failed catalog can retry while concurrent callers still share its requests',async t=>{
 const calls=[];let fail=true;
 t.mock.method(globalThis,'fetch',async path=>{
  calls.push(path);
  if(path==='/trim-standard-data.json'&&fail)throw Error('Temporary network failure');
  return response(path);
 });
 const loader=await fresh();
 const failed=await Promise.allSettled([loader.loadBuyerCatalog(),loader.loadBuyerCatalog()]);
 assert.ok(failed.every(result=>result.status==='rejected'));
 assert.equal(calls.length,2,'the first concurrent callers share one catalog attempt');
 fail=false;
 const [first,second]=await Promise.all([loader.loadBuyerCatalog(),loader.loadBuyerCatalog()]);
 assert.equal(first,second);assert.equal(first.models[0].id,'test-model');
 assert.equal(calls.length,4,'retry performs one new pair of requests');
 assert.equal(await loader.loadBuyerCatalog(),first);assert.equal(calls.length,4);
});

test('an HTTP chart failure can retry without reloading the successful catalog',async t=>{
 const calls=[];let fail=true;
 t.mock.method(globalThis,'fetch',async path=>{
  calls.push(path);
  return path==='/data/factory/test-model.json'&&fail?{ok:false}:response(path);
 });
 const loader=await fresh();
 const failed=await Promise.allSettled([loader.loadBuyerLineup('test-model'),loader.loadBuyerLineup('test-model')]);
 assert.ok(failed.every(result=>result.status==='rejected'));
 assert.equal(calls.filter(path=>path.endsWith('/test-model.json')).length,1);
 fail=false;
 const [first,second]=await Promise.all([loader.loadBuyerLineup('test-model'),loader.loadBuyerLineup('test-model')]);
 assert.equal(first,second);assert.equal(first.id,'test-model');
 assert.equal(calls.length,4,'only the failed chart is requested again');
 assert.equal(await loader.loadBuyerLineup('test-model'),first);assert.equal(calls.length,4);
});

test('a model request recovers after a catalog JSON failure',async t=>{
 let fail=true;const calls=[];
 t.mock.method(globalThis,'fetch',async path=>{
  calls.push(path);
  if(path==='/data/factory/index.json'&&fail)return {ok:true,json:async()=>{throw Error('Interrupted JSON response');}};
  return response(path);
 });
 const loader=await fresh();
 await assert.rejects(loader.loadBuyerLineup('test-model'),/Interrupted JSON response/);
 fail=false;
 assert.equal((await loader.loadBuyerLineup('test-model')).id,'test-model');
 assert.equal(calls.filter(path=>path==='/data/factory/index.json').length,2);
 assert.equal(calls.filter(path=>path==='/data/factory/test-model.json').length,1);
});
test('reviewed photo evidence retries a failed request and shares concurrent and successful loads',async t=>{
 let fail=true;const calls=[];
 t.mock.method(globalThis,'fetch',async path=>{
  calls.push(path);
  if(path==='/data/photo-trim-path.json'&&fail)return {ok:false};
  return {ok:true,json:async()=>path==='/data/feature-photo-guide.json'?{photos:[]}:{models:[]}};
 });
 const loader=await fresh();
 const failed=await Promise.allSettled([loader.loadReviewedPreferenceEvidence(),loader.loadReviewedPreferenceEvidence()]);
 assert.ok(failed.every(result=>result.status==='rejected'));assert.equal(calls.length,2);
 fail=false;await Promise.all([loader.loadReviewedPreferenceEvidence(),loader.loadReviewedPreferenceEvidence()]);assert.equal(calls.length,4);
 await loader.loadReviewedPreferenceEvidence();assert.equal(calls.length,4);
});
