import test from 'node:test';
import assert from 'node:assert/strict';
import {createComparisonGuideLoader} from './comparison-guide-loader.mjs';

test('Factory guide requests wait until a comparison needs them and share one load',async()=>{
 const calls=[],data={'trim-standard-data.json':{models:['Ram']},'data/factory/index.json':{charts:['ram.json']}};
 const load=createComparisonGuideLoader(async path=>{calls.push(path);return {ok:true,json:async()=>data[path]};});
 assert.deepEqual(calls,[]);
 const first=load(),second=load();
 assert.equal(first,second);
 assert.deepEqual(await first,{trimGuide:data['trim-standard-data.json'],factoryIndex:data['data/factory/index.json']});
 assert.deepEqual(calls,Object.keys(data));
 await load();assert.equal(calls.length,2);
});

test('A failed chart stays settled while the independently available source survives',async()=>{
 const calls=[];
 const load=createComparisonGuideLoader(async path=>{
  calls.push(path);
  if(path==='trim-standard-data.json')throw Error('offline');
  return {ok:true,json:async()=>({charts:['available']})};
 });
 assert.deepEqual(await load(),{trimGuide:null,factoryIndex:{charts:['available']}});
 await load();assert.equal(calls.length,2);
});

test('HTTP errors and unreadable guide responses do not retry or reject the comparison',async()=>{
 const calls=[];
 const load=createComparisonGuideLoader(async path=>{
  calls.push(path);
  return path==='trim-standard-data.json'?{ok:false,json:async()=>{throw Error('must not parse error');}}:{ok:true,json:async()=>{throw Error('invalid JSON');}};
 });
 assert.deepEqual(await load(),{trimGuide:null,factoryIndex:null});
 await load();assert.equal(calls.length,2);
});
