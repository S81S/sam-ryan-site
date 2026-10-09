import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPhotoGuide} from './photo-guide-engine.mjs';
import {createPhotoTrimPath} from './photo-trim-path.mjs';

const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));
const catalog=read('./data/feature-photo-guide.json'),inventory=read('./data/used-inventory.json'),{records}=read('./data/equipment-index.json');
const engine=createPhotoGuide(catalog,inventory.vehicles,records),lineup=engine.lineups.find(l=>l.id==='wrangler');
const trimData=read('./data/photo-trim-path.json'),paths=createPhotoTrimPath(trimData,engine);
const vehicle=stock=>inventory.vehicles.find(v=>v.stock===stock);
const stocks=(answers={},condition='Both')=>engine.matches(lineup,answers,0,condition).map(v=>v.stock);

test('Wrangler adds four original VIN-matched photos without displacing the four prior guides',()=>{
 assert.deepEqual(engine.lineups.map(l=>l.id),['ram-1500','ram-3500','chrysler-pacifica','jeep-grand-cherokee','wrangler']);
 assert.deepEqual(lineup.questions.map(q=>q.id),['seats','roof']);
 assert.equal(lineup.questions.flatMap(q=>q.choices).length,4);
 for(const photo of lineup.questions.flatMap(q=>q.choices)){
  const v=vehicle(photo.stock);assert.equal(v.photoUrls[photo.photoIndex-1],photo.imageSource);
  assert.ok(engine.choiceMatches(v,photo));
  const bytes=fs.readFileSync(new URL('.'+photo.image,import.meta.url));
  assert.equal(bytes[0],0xff);assert.equal(bytes[1],0xd8);
 }
});

test('Four-door gas scope requires the exact ordinary package, body, model year and engine',()=>{
 const found=stocks();
 for(const stock of ['J22109','J19530','J22309','J22542','J22412','J22561','J22513A'])assert.ok(found.includes(stock),stock);
 // America250 is listed generically as Sport; its actual model/CPP must prevail.
 for(const stock of ['J22612','J22330','J22477','J22079','J22489'])assert.ok(!found.includes(stock),stock);
 const target=vehicle('J22310');
 const mutations=[
  r=>{r.lines=r.lines.map(l=>l.replace('Package 22R','Package 22E'));},
  r=>{r.lines.push('Customer Preferred Package 24R');},
  r=>{r.lines=r.lines.filter(l=>!/^Customer Preferred Package/.test(l));},
  r=>{r.lines.push('Whitecap Package');},
  r=>{r.engine='Engine: 3.6L V6 24V VVT Engine';},
  r=>{r.engine='Engine: 6.4L V8';},
  r=>{r.identityLines=['2026 MODEL YEAR','WRANGLER 2-DOOR RUBICON 4X4'];},
  r=>{r.identityLines=['2026 MODEL YEAR','WRANGLER 4-DOOR RUBICON 4xe 4X4'];},
  r=>{r.identityLines=['2025 MODEL YEAR','WRANGLER 4-DOOR RUBICON 4X4'];},
  r=>{r.identityLines=['2026 MODEL YEAR','WRANGLER 4-DOOR SPORT 4X4'];},
  r=>{r.equipmentSectionComplete=false;},
  r=>{r.vin='MISMATCHED';}
 ];
 for(const mutate of mutations){
  const changed=structuredClone(records);mutate(changed[target.vin]);
  const g=createPhotoGuide(catalog,inventory.vehicles,changed),l=g.lineups.find(l=>l.id==='wrangler');
  assert.ok(!g.matches(l,{},0,'Both').some(v=>v.vin===target.vin),mutate.toString());
 }
});

test('E7 cloth never becomes a Rubicon K7 match through equal generic sticker wording or cached results',()=>{
 const rubicon=vehicle('J22310'),cloth=engine.photos.get('j22109-cloth');
 assert.ok(engine.choiceMatches(rubicon,{feature:'seatUpholstery',value:'Cloth Low-Back Bucket Seats'}));
 assert.equal(engine.choiceMatches(rubicon,cloth),false);
 assert.ok(engine.choiceMatches(rubicon,cloth,false));
 assert.ok(engine.choiceMatches(rubicon,{feature:'seatUpholstery',value:'Cloth Low-Back Bucket Seats'}));
 assert.ok(stocks({seats:'j22109-cloth'}).includes('J22109'));
 assert.ok(!stocks({seats:'j22109-cloth'}).includes('J22310'));
 assert.ok(stocks({seats:'reject:j22109-cloth'}).includes('J22310'));
 assert.ok(stocks({seats:'j22412-nappa'}).includes('J22561'));
 assert.ok(!stocks({seats:'j22412-nappa'}).includes('J22542'),'McKinley Sahara seats do not become Nappa');
 const changed=structuredClone(records);changed[rubicon.vin].lines=changed[rubicon.vin].lines.filter(l=>!/^Interior:/.test(l));
 const unknown=createPhotoGuide(catalog,inventory.vehicles,changed);
 assert.equal(unknown.choiceMatches(rubicon,cloth,false),false,'unknown upholstery is not a verified rejection match');
});

test('Installed roof replacements and negative choices agree for the actual photo vehicles',()=>{
 assert.ok(stocks({seats:'j22109-cloth',roof:'j22109-hardtop'}).includes('J22109'));
 assert.ok(stocks({seats:'j22412-nappa',roof:'j22412-skyroof'}).includes('J22412'));
 assert.ok(!stocks({roof:'j22109-hardtop'}).includes('J22412'));
 assert.ok(!stocks({roof:'j22412-skyroof'}).includes('J22109'));
 assert.ok(stocks({roof:'reject:j22109-hardtop'}).includes('J22412'));
 assert.ok(stocks({roof:'reject:j22412-skyroof'}).includes('J22109'));
 for(const stock of ['J22331','J22561'])assert.ok(stocks({seats:'j22412-nappa',roof:'reject:j22412-skyroof'}).includes(stock),stock);
 assert.ok(!stocks({roof:['reject:j22109-hardtop','reject:j22412-skyroof']}).some(s=>['J22109','J22412'].includes(s)));
 assert.deepEqual(stocks({roof:'skip'}),stocks());
});

test('Wrangler scope and exact upholstery guards cannot be removed from reviewed catalog entries',()=>{
 for(const mutate of [
  c=>{delete c.lineups.find(l=>l.id==='wrangler').reviewedScope;},
  c=>{c.lineups.find(l=>l.id==='wrangler').reviewedScope='unreviewed-wrangler';}
 ]){
  const changed=structuredClone(catalog);mutate(changed);
  assert.ok(!createPhotoGuide(changed,inventory.vehicles,records).lineups.some(l=>l.id==='wrangler'));
 }
 for(const patch of [{reviewedScope:undefined},{allowedTrimIds:undefined},{allowedTrimIds:[]},{allowedTrimIds:['made-up']},{allowedTrimIds:['rubicon']}]){
  const changed=structuredClone(catalog);Object.assign(changed.photos.find(p=>p.id==='j22109-cloth'),patch);
  assert.ok(!createPhotoGuide(changed,inventory.vehicles,records).photos.has('j22109-cloth'));
 }
});

test('The Wrangler route starts at Sport and distinguishes optional upgrades from Rubicon X inclusions',()=>{
 const start=paths.resolve(lineup,{});assert.equal(start.current.id,'sport');assert.equal(start.base.id,'sport');
 assert.match(start.shopperScope,/four-door/);assert.equal(start.baseFeatures.length,6);
 assert.equal(paths.baseline(lineup,'seats').id,'j22109-cloth');assert.equal(paths.baseline(lineup,'roof'),null);
 const hard=paths.offer(lineup,{},'roof','j22109-hardtop');assert.equal(hard.trim.id,'sport');assert.equal(hard.availability,'optional');
 const sky=paths.offer(lineup,{},'roof','j22412-skyroof');assert.equal(sky.trim.id,'sport-s');assert.equal(sky.availability,'optional');
 assert.match(sky.replaces,/soft top or three-piece hardtop/);
 const leather=paths.offer(lineup,{},'seats','j22412-nappa');assert.equal(leather.trim.id,'rubicon');assert.equal(leather.availability,'optional');
 const picked=paths.resolve(lineup,{seats:'j22412-nappa',roof:'j22412-skyroof'});
 assert.equal(picked.status,'supported');assert.equal(picked.current.id,'rubicon');
 assert.equal(picked.configurationVerified,false);
 assert.equal(paths.resolve(lineup,{seats:'j22109-cloth',roof:'j22412-skyroof'}).current.id,'sport-s');
 const model=trimData.models.find(m=>m.id==='wrangler'),rubiconX=model.trims.find(t=>t.id==='rubicon-x');
 assert.equal(rubiconX.choices['j22412-nappa'].status,'standard');
 assert.equal(rubiconX.choices['j22109-hardtop'].status,'standard');
 assert.equal(rubiconX.choices['j22412-skyroof'].status,'optional');
 for(const trim of model.trims)for(const photo of lineup.questions.flatMap(q=>q.choices)){
  const rule=trim.choices[photo.id];assert.ok(rule.sourceUrl);assert.notEqual(rule.status,'unknown');
 }
});
