import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buyerModels,buyerLineup} from './buyer-catalog.mjs';
import {registerBuyerLineup} from './buyer-sources.mjs';
import {buyerVehicleTrim} from './buyer-evidence.mjs';
import {createPhotoGuide} from './photo-guide-engine.mjs';
import {createPhotoTrimPath} from './photo-trim-path.mjs';
import {assessBuyerMatches,assessBuyerTrim} from './buyer-matches.mjs';
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url)));
const inventory=read('./data/used-inventory.json'),records=read('./data/equipment-index.json').records;
const photos=createPhotoGuide(read('./data/feature-photo-guide.json'),inventory.vehicles,records);
const photoPath=createPhotoTrimPath(read('./data/photo-trim-path.json'),photos);
const models=buyerModels(read('./trim-standard-data.json'),read('./data/factory/index.json'));
function context(id){
 const model=models.find(m=>m.id===id),lineup=registerBuyerLineup(buyerLineup(model,read('./data/factory/'+model.meta.file)));
 lineup.questions=[...(photos.lineups.find(l=>l.id===id)?.questions||[]),...lineup.questions];
 const pool=inventory.vehicles.filter(v=>!v.external&&v.status!=='not-observed').map(v=>({v,m:buyerVehicleTrim(lineup,v,records[v.vin])})).filter(r=>r.m);
 return {lineup,pool,records,photos,photoPath};
}
const remaining=rows=>rows.filter(r=>!r.conflicts);
const confirmed=rows=>rows.filter(r=>!r.conflicts&&!r.unknown);
test('Ram photo choices narrow and exclude the known incompatible Tradesman panoramic roof',()=>{
 const ctx=context('ram-1500'),answers={screen:'r12546-dashboard',seats:'r12546-vinyl-bench'};
 const before=assessBuyerMatches({...ctx,answers});assert.ok(confirmed(before).length>0);
 const after=assessBuyerMatches({...ctx,answers:{...answers,roof:'r12315-panoramic'}});
 assert.equal(remaining(after).length,0);
 for(const row of confirmed(before))assert.ok(after.find(r=>r.v.vin===row.v.vin).checks.some(c=>c.method==='photo-factory-conflict'));
});
test('exact installed equipment retains precedence over a conflicting photo trim rule',()=>{
 const ctx=context('ram-1500'),row=ctx.pool.find(r=>r.v.stock==='R12546');assert.ok(row);
 const record={...records[row.v.vin],features:{...records[row.v.vin].features,panoramic:{value:true,evidence:['Dual-Pane Panoramic Sunroof']}},lines:[...records[row.v.vin].lines,'Dual-Pane Panoramic Sunroof']};
 const result=assessBuyerMatches({...ctx,pool:[row],records:{...records,[row.v.vin]:record},answers:{roof:'r12315-panoramic'}})[0];
 assert.equal(result.conflicts,0);assert.equal(result.unknown,0);
});
test('rejecting a factory-unavailable photo feature confirms absence without inferring optional omission',()=>{
 const ctx=context('ram-1500'),answers={screen:'r12546-dashboard',seats:'r12546-vinyl-bench',roof:['reject:r12315-panoramic']};
 const rows=assessBuyerMatches({...ctx,answers});assert.ok(confirmed(rows).length>0);
 assert.ok(confirmed(rows).every(r=>r.checks.some(c=>c.method==='photo-factory-unavailable')));
});
test('explicit Wrangler special editions do not survive as possible matches for restricted photo choices',()=>{
 const ctx=context('wrangler'),rows=assessBuyerMatches({...ctx,answers:{seats:'j22109-cloth',roof:'j22109-hardtop'}});
 const editions=rows.filter(r=>r.checks.some(c=>c.method==='reviewed-photo-scope'));assert.ok(editions.length>0);
 assert.ok(editions.every(r=>r.conflicts>0));assert.ok(confirmed(rows).length>0);
 assert.equal(remaining(rows).filter(r=>r.unknown).length,0);
});
test('incomplete Wrangler equipment evidence stays unknown instead of being guessed outside the reviewed scope',()=>{
 const ctx=context('wrangler'),row=ctx.pool.find(r=>r.v.stock==='J22109');assert.ok(row);
 const record={...records[row.v.vin],equipmentSectionComplete:false};
 const result=assessBuyerMatches({...ctx,pool:[row],records:{...records,[row.v.vin]:record},answers:{seats:'j22109-cloth'}})[0];
 assert.equal(result.conflicts,0);assert.equal(result.unknown,1);
});
test('reviewed UBW mapping keeps the factory 14.5-inch row consistent with the 14.4-inch VIN photo',()=>{
 const ctx=context('ram-1500'),factory=[...ctx.lineup.choices.values()].find(c=>/14\.5-inch touchscreen/.test(c.fullLabel));assert.ok(factory);
 const before=assessBuyerMatches({...ctx,answers:{screen:'r12315-dashboard'}});
 const after=assessBuyerMatches({...ctx,answers:{screen:'r12315-dashboard',[factory.id]:factory.id}});
 assert.ok(confirmed(before).length>0);assert.deepEqual(confirmed(after).map(r=>r.v.vin),confirmed(before).map(r=>r.v.vin));
 assert.ok(confirmed(after).every(r=>r.checks.some(c=>c.method==='reviewed-radio-code')));
});
test('14.4 and 14.5 are not treated as generic size aliases without the reviewed code crosswalk',()=>{
 const ctx=context('ram-1500'),factory=[...ctx.lineup.choices.values()].find(c=>/14\.5-inch touchscreen/.test(c.fullLabel));
 const unreviewed={resolve:()=>({assessments:[]})};
 const rows=assessBuyerMatches({...ctx,photoPath:unreviewed,answers:{screen:'r12315-dashboard',[factory.id]:factory.id}});
 assert.equal(confirmed(rows).length,0);assert.ok(remaining(rows).some(r=>r.unknown));
});
test('trim review evaluates photo requirements instead of claiming every trim fits',()=>{
 const ctx=context('ram-1500'),answers={screen:'r12315-dashboard'};
 const tradesman=assessBuyerTrim({...ctx,answers,trim:'tradesman'});
 assert.equal(tradesman.status,'conflict');assert.equal(tradesman.conflicts[0].choice.id,'r12315-dashboard');
 const limited=assessBuyerTrim({...ctx,answers,trim:'limited'});assert.equal(limited.status,'available');
 assert.equal(assessBuyerTrim({...ctx,answers,trim:'made-up'}).validTrim,false);
});
test('a canonical Wrangler roof uses exact special-trim evidence without guessing other trim availability',()=>{
 const ctx=context('wrangler'),answers={f1dj1wzb:'f1dj1wzb'};
 const willys=assessBuyerTrim({...ctx,answers,trim:'willys'});
 assert.equal(willys.status,'available');assert.equal(willys.options[0].fact.sourceChoiceId,'f1ws9hvk');
 assert.equal(assessBuyerTrim({...ctx,answers,trim:'sahara'}).status,'conflict');
 assert.equal(assessBuyerTrim({...ctx,answers,trim:'85th-anniversary-edition'}).status,'unknown');
});
test('unknown photo trim availability and optional equipment omission remain unknown',()=>{
 const ctx=context('jeep-grand-cherokee'),answers={roof:'j22560-panoramic'};
 assert.equal(assessBuyerTrim({...ctx,answers,trim:'laredo'}).status,'unknown');
 const rows=assessBuyerMatches({...ctx,answers,trim:'laredo'});assert.ok(rows.some(r=>!r.conflicts&&r.unknown));
});
test('trim review preserves unresolved saved requirements instead of claiming every trim offers them',()=>{
 const ctx=context('ram-1500'),unresolved=[{feature:'factoryChoice',value:'oldchoice',wanted:true,label:'Saved equipment package',choiceId:'oldchoice',model:'ram-1500',year:2026}];
 const result=assessBuyerTrim({...ctx,trim:'tradesman',unresolved});
 assert.equal(result.status,'unknown');assert.equal(result.unknown.length,1);assert.equal(result.unknown[0].choice.fullLabel,'Saved equipment package');
});
