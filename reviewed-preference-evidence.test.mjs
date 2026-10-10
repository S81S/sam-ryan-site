import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buyerModels,buyerLineup} from './buyer-catalog.mjs';
import {registerBuyerLineup} from './buyer-sources.mjs';
import {buyerVehicleTrim} from './buyer-evidence.mjs';
import {createPhotoGuide} from './photo-guide-engine.mjs';
import {createPhotoTrimPath} from './photo-trim-path.mjs';
import {photoPreferences,encodePreferences} from './shopping-preferences.mjs';
import {assessBuyerMatches} from './buyer-matches.mjs';
import {preferenceChecks} from './preference-evidence.mjs';
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url)));
const inventory=read('./data/used-inventory.json'),records=read('./data/equipment-index.json').records;
const photos=createPhotoGuide(read('./data/feature-photo-guide.json'),inventory.vehicles,records),photoPath=createPhotoTrimPath(read('./data/photo-trim-path.json'),photos);
const models=buyerModels(read('./trim-standard-data.json'),read('./data/factory/index.json'));
function context(id){
 const model=models.find(m=>m.id===id),lineup=registerBuyerLineup(buyerLineup(model,read('./data/factory/'+model.meta.file)));
 lineup.questions=[...photos.lineups.find(l=>l.id===id).questions,...lineup.questions];
 const pool=inventory.vehicles.filter(v=>!v.external&&v.status!=='not-observed').map(v=>({v,m:buyerVehicleTrim(lineup,v,records[v.vin])})).filter(r=>r.m);
 return {lineup,pool,records,photos,photoPath};
}
function downstream(preferences,vins=[]){
 const source=`
  import {readFileSync} from 'node:fs';
  const read=path=>JSON.parse(readFileSync(new URL('.'+path,import.meta.url)));
  const calls=[];globalThis.location={search:${JSON.stringify(preferences?'?preferences='+encodeURIComponent(preferences):'')}};
  globalThis.fetch=async path=>{calls.push(path);return {ok:true,json:async()=>read(path)}};
  const {preferenceChecks}=await import('./preference-evidence.mjs');
  const {readPreferences}=await import('./shopping-preferences.mjs');
  const req=readPreferences(new URLSearchParams(location.search))?.requirements||[];
  const vehicles=read('/data/used-inventory.json').vehicles,records=read('/data/equipment-index.json').records;
  const results=${JSON.stringify(vins)}.map(vin=>({vin,checks:preferenceChecks(vehicles.find(v=>v.vin===vin),records[vin],req)}));
  process.stdout.write(JSON.stringify({calls,results}));
 `;
 return JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',source],{cwd:fileURLToPath(new URL('.',import.meta.url)),encoding:'utf8'}));
}
test('a saved UBW preference stays confirmed after the same URL is opened on Compare or a VIN page',()=>{
 const ctx=context('ram-1500'),factory=[...ctx.lineup.choices.values()].find(c=>/14\.5-inch touchscreen/.test(c.fullLabel));
 const answers={screen:'r12315-dashboard',[factory.id]:factory.id},rows=assessBuyerMatches({...ctx,answers}).filter(r=>!r.conflicts&&!r.unknown);
 assert.ok(rows.length>0);
 const shared=encodePreferences(photoPreferences(ctx.lineup,answers)),result=downstream(shared,rows.map(r=>r.v.vin));
 assert.ok(result.calls.includes('/data/photo-trim-path.json'));
 assert.ok(result.calls.includes('/data/feature-photo-guide.json'));
 for(const r of result.results)assert.ok(r.checks.every(c=>c.state==='match'),r.vin);
 assert.ok(result.results.every(r=>r.checks.some(c=>c.method==='reviewed-radio-code')));
});
test('saved negative and incompatible roof preferences retain the guide verdict downstream',()=>{
 const ctx=context('ram-1500'),vin=ctx.pool.find(r=>r.v.stock==='R12546').v.vin;
 for(const [answer,expected] of [[['reject:r12315-panoramic'],'match'],['r12315-panoramic','conflict']]){
  const answers={roof:answer},guide=assessBuyerMatches({...ctx,answers}).find(r=>r.v.vin===vin);
  const result=downstream(encodePreferences(photoPreferences(ctx.lineup,answers)),[vin]).results[0];
  assert.equal(result.checks[0].state,expected);assert.equal(result.checks[0].state,guide.checks[0].state);
 }
});
test('saved Wrangler photo scope excludes the same explicit special editions downstream',()=>{
 const ctx=context('wrangler'),answers={seats:'j22109-cloth'};
 const outside=assessBuyerMatches({...ctx,answers}).find(r=>r.checks.some(c=>c.method==='reviewed-photo-scope'));assert.ok(outside);
 const result=downstream(encodePreferences(photoPreferences(ctx.lineup,answers)),[outside.v.vin]).results[0];
 assert.equal(result.checks[0].state,'conflict');assert.equal(result.checks[0].method,'reviewed-photo-scope');
});
test('visiting without saved preferences performs no new evidence requests',()=>{
 assert.deepEqual(downstream('').calls,[]);
});
test('UBW does not turn missing or conditional installed screen evidence into a confirmation',()=>{
 const ctx=context('ram-1500'),factory=[...ctx.lineup.choices.values()].find(c=>/14\.5-inch touchscreen/.test(c.fullLabel));
 const row=assessBuyerMatches({...ctx,answers:{screen:'r12315-dashboard'}}).find(r=>!r.conflicts&&!r.unknown);assert.ok(row);
 const req=photoPreferences(ctx.lineup,{[factory.id]:factory.id}).requirements;
 for(const line of ['Uconnect 5 NAV with upgraded touchscreen display','14.4-Inch Touchscreen Display — if equipped','14.4-inch or 12-inch touchscreen display']){
  const record={...records[row.v.vin],lines:[...records[row.v.vin].lines,'OPTIONAL EQUIPMENT',line]};
  assert.equal(preferenceChecks(row.v,record,req)[0].state,'unknown',line);
 }
});
