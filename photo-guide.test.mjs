import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPhotoGuide,swipeDecision} from './photo-guide-engine.mjs';
import {withComparisonSpecifications} from './comparison-specs.mjs';
const read=name=>JSON.parse(fs.readFileSync(new URL(name,import.meta.url)));
const catalog=read('./data/feature-photo-guide.json');
const inventory=read('./data/used-inventory.json');
const {records}=read('./data/equipment-index.json');
const engine=createPhotoGuide(catalog,inventory.vehicles,records),lineup=engine.lineups.find(l=>l.id==='ram-1500');
const r12315=inventory.vehicles.find(v=>v.stock==='R12315');
const r12527=inventory.vehicles.find(v=>v.stock==='R12527');

test('Every enabled photo matches its source VIN, gallery and installed equipment',()=>{
 assert.equal(engine.photos.size,catalog.photos.filter(p=>p.reviewed===true).length);
 for(const p of engine.photos.values()){
  const v=inventory.vehicles.find(v=>v.vin===p.vin);
  assert.equal(v.photoUrls[p.photoIndex-1],p.imageSource);
  assert.ok(engine.choiceMatches(v,p));
  const bytes=fs.readFileSync(new URL('.'+p.image,import.meta.url));
  assert.equal(bytes[0],0xff);assert.equal(bytes[1],0xd8);
 }
});
test('An upgraded screen does not also match its replaced base screen',()=>{
 assert.ok(engine.matches(lineup,{screen:'r12315-dashboard'}).some(v=>v.vin===r12315.vin));
 assert.ok(!engine.matches(lineup,{screen:'r12527-dashboard'}).some(v=>v.vin===r12315.vin));
});
test('14.5-inch wording is not silently treated as 14.4 inches',()=>{
 const changed=structuredClone(records);changed[r12315.vin].lines=changed[r12315.vin].lines.map(l=>l.replace('14.4-Inch','14.5-Inch'));
 const g=createPhotoGuide(catalog,inventory.vehicles,changed);
 assert.ok(!g.photos.has('r12315-dashboard'));
});
test('Adding verified requirements narrows matches and preserves the exact chosen vehicle',()=>{
 const all=engine.matches(lineup),screen=engine.matches(lineup,{screen:'r12315-dashboard'}),both=engine.matches(lineup,{screen:'r12315-dashboard',seats:'r12315-leather',roof:'r12315-panoramic'});
 assert.ok(screen.length<all.length);assert.ok(both.length<=screen.length);
 assert.ok(both.some(v=>v.vin===r12315.vin));
});
test('Reject and no preference have different matching behavior',()=>{
 const all=engine.matches(lineup,{}),skip=engine.matches(lineup,{roof:'skip'}),reject=engine.matches(lineup,{roof:'reject:r12315-panoramic'});
 assert.deepEqual(skip.map(v=>v.vin),all.map(v=>v.vin));
 assert.ok(reject.length<all.length);
 assert.ok(!reject.some(v=>v.vin===r12315.vin));
});
test('Unavailable combinations return zero instead of relaxing the shopper’s choices',()=>{
 assert.equal(engine.matches(lineup,{screen:'r12315-dashboard',seats:'r12527-cloth'}).length,0);
});
test('Budget and condition remain hard limits',()=>{
 const found=engine.matches(lineup,{},45000,'New');assert.ok(found.length>0);
 assert.ok(found.every(v=>v.price<=45000&&v.condition==='New'&&v.year===2026));
 assert.equal(engine.matches(lineup,{},1).length,0);
});
test('Photo choices with unverified or mismatched VINs are not offered',()=>{
 const changed=structuredClone(records);changed[r12315.vin].vin='WRONG';
 const g=createPhotoGuide(catalog,inventory.vehicles,changed);
 assert.ok([...g.photos.values()].every(p=>p.vin!==r12315.vin));
 const c=structuredClone(catalog);c.photos[0].reviewed=false;
 assert.equal(createPhotoGuide(c,inventory.vehicles,records).photos.size,engine.photos.size-1);
});
test('Stored answers accept only supported choice IDs and known questions',()=>{
 assert.deepEqual(engine.cleanAnswers(lineup,{screen:'fake',roof:'reject:r12315-panoramic',seats:'skip',injected:'anything'}),{seats:'skip',roof:'reject:r12315-panoramic'});
});
test('Swipe detection requires deliberate horizontal motion and distinguishes rejection',()=>{
 assert.equal(swipeDecision(90,4,true),'choose');assert.equal(swipeDecision(-90,4,true),'reject');
 assert.equal(swipeDecision(15,0,true),null);assert.equal(swipeDecision(90,100,true),null);
 assert.equal(swipeDecision(-90,4),'reject');assert.equal(swipeDecision(-90,4,false),'reject');
 assert.equal(swipeDecision(NaN,0),null);assert.equal(swipeDecision(90,Infinity),null);
});

test('Multiple left swipes exclude each exact pictured option without choosing its alternative',()=>{
 const first=engine.matches(lineup,{screen:['reject:r12315-dashboard']});
 assert.ok(first.some(v=>v.vin===r12527.vin));
 assert.ok(!first.some(v=>v.vin===r12315.vin));
 const both=engine.matches(lineup,{screen:['reject:r12315-dashboard','reject:r12527-dashboard']});
 assert.ok(both.every(v=>engine.choiceMatches(v,{feature:'infotainmentScreen',value:'14.4 inches'},false)&&engine.choiceMatches(v,{feature:'infotainmentScreen',value:'12 inches'},false)));
 assert.ok(!both.some(v=>v.vin===r12315.vin||v.vin===r12527.vin));
 assert.deepEqual(engine.matches(lineup,{screen:'reject:r12315-dashboard'}),first);
 assert.deepEqual(engine.cleanAnswers(lineup,{screen:['reject:r12315-dashboard','reject:r12315-dashboard','r12527-dashboard','reject:missing',null],roof:[],seats:['reject:r12527-cloth','reject:r12315-leather']}),{screen:['reject:r12315-dashboard'],seats:['reject:r12527-cloth','reject:r12315-leather']});
});

test('A photo representing an absent feature reverses both choose and reject correctly',()=>{
 const withoutV8={feature:'v8',value:false};
 assert.ok(engine.choiceMatches(r12527,withoutV8));
 assert.equal(engine.choiceMatches(r12527,withoutV8,false),false);
 assert.equal(engine.choiceMatches(r12527,{feature:'v8',value:true}),false);
 assert.ok(engine.choiceMatches(r12527,{feature:'v8',value:true},false));
});

test('Unknown equipment is not treated as verified absence',()=>{
 const incomplete={...records[r12527.vin],features:{},lines:['RAM 1500 BIGHORN/LONESTAR CREW 4X2'],equipmentSectionComplete:false};
 const g=createPhotoGuide({},[r12527],{[r12527.vin]:incomplete});
 assert.equal(g.choiceMatches(r12527,{feature:'panoramic',value:true},false),false);
 assert.equal(g.choiceMatches(r12527,{feature:'panoramic',value:false}),false);
 assert.equal(g.choiceMatches(r12527,{feature:'infotainmentScreen',value:'12 inches'},false),false);
});

test('Photos require the exact gallery index, stock, model and year before appearing',()=>{
 const photo=catalog.photos.find(p=>p.id==='r12527-dashboard');
 const single={...catalog,photos:[photo]};
 for(const mutate of [v=>{delete v.photoUrls},v=>{v.photoUrls=[]},v=>{v.stock='WRONG'},v=>{v.year=2025},v=>{v.title='New 2026 RAM 2500 LONE STAR'},v=>{v.external=true},v=>{v.status='not-observed'}]){
  const changed=structuredClone(r12527);mutate(changed);
  assert.equal(createPhotoGuide(single,[changed],records).photos.size,0);
 }
 for(const patch of [{photoIndex:0},{photoIndex:1.5},{photoIndex:999},{imageSource:''},{listingSource:''},{model:'different-model'},{value:null}]){
  assert.equal(createPhotoGuide({...single,photos:[{...photo,...patch}]},[r12527],records).photos.size,0);
 }
 const wrongYear=structuredClone(records);wrongYear[r12527.vin].identityLines=['2025 MODEL YEAR','RAM 1500 BIGHORN/LONESTAR CREW 4X2'];
 assert.equal(createPhotoGuide(single,[r12527],wrongYear).photos.size,0);
});

test('Corrupt catalog entries and duplicate IDs cannot silently select another photo',()=>{
 assert.deepEqual(createPhotoGuide(null,null,null).lineups,[]);
 const photo=catalog.photos.find(p=>p.id==='r12527-dashboard');
 const invalid={photos:[null,{},photo,{...photo,image:'/assets/feature-photos/different-photo.jpg'}],lineups:[null,{},...catalog.lineups]};
 assert.equal(createPhotoGuide(invalid,inventory.vehicles,records).photos.size,0);
 const duplicateQuestions=structuredClone(catalog);const l=duplicateQuestions.lineups.find(l=>l.id==='ram-1500');l.questions.push({...l.questions[0]});
 assert.ok(!createPhotoGuide(duplicateQuestions,inventory.vehicles,records).lineups.find(l=>l.id==='ram-1500')?.questions.some(q=>q.id==='screen'));
 for(const patch of [{lines:{}},{lines:[null]},{identityLines:{}}]){
  const g=createPhotoGuide({},[r12527],{[r12527.vin]:{...records[r12527.vin],...patch}});
  assert.equal(g.choiceMatches(r12527,{feature:'cloth',value:true}),false);
 }
});

test('Invalid answers and unsupported filters do not relax hard requirements',()=>{
 for(const answer of [false,0,{},[],['r12315-dashboard'],['reject:missing'],'missing']){
  assert.deepEqual(engine.matches(lineup,{screen:answer}),[]);
 }
 assert.deepEqual(engine.matches(lineup,{},Infinity),[]);
 assert.deepEqual(engine.matches(lineup,{},-1),[]);
 assert.deepEqual(engine.matches(lineup,{},45000,'missing'),[]);
 assert.deepEqual(engine.matches({}),[]);
 assert.deepEqual(engine.cleanAnswers(lineup,null),{});
});

test('A hard budget excludes unavailable, zero and nonnumeric prices',()=>{
 for(const price of [null,undefined,NaN,0,'44000']){
  const changed={...r12527,price},g=createPhotoGuide(catalog,[changed],records);
  const l=g.lineups.find(l=>l.id==='ram-1500');
  assert.ok(l);
  assert.equal(g.matches(l,{},50000).length,0);
 }
});

test('Each photo lineup keeps vehicle models, years and choice IDs isolated',()=>{
 const expected=[['ram-1500',/\bram 1500\b/i],['chrysler-pacifica',/\bchrysler pacifica\b/i],['ram-3500',/\bram 3500\b/i]];
 const vinSets=[];
 for(const [id,identity] of expected){
  const l=engine.lineups.find(l=>l.id===id);assert.ok(l,`${id} must be enabled`);
  const found=engine.matches(l,{},0,'Both');assert.ok(found.length>0);
  assert.ok(found.every(v=>v.year===l.year&&identity.test(v.title)),`${id} must not borrow vehicles from another year or model`);
  assert.ok(l.questions.every(q=>q.choices.every(p=>p.model===l.id&&p.year===l.year)));
  vinSets.push(new Set(found.map(v=>v.vin)));
 }
 for(let i=0;i<vinSets.length;i++)for(let j=i+1;j<vinSets.length;j++)assert.ok([...vinSets[i]].every(vin=>!vinSets[j].has(vin)));
 const hd=engine.lineups.find(l=>l.id==='ram-3500');
 assert.deepEqual(engine.matches(hd,{screen:'r12315-dashboard'},0,'Both'),[]);
 assert.deepEqual(engine.matches(lineup,{screen:'r12249a-dashboard'},0,'Both'),[]);
 assert.deepEqual(engine.cleanAnswers(lineup,{screen:'r12249a-dashboard',seats:'p04984-nappa'}),{});
});

test('Wrong-year and wrong-model listings cannot enter an otherwise matching photo result',()=>{
 const original=inventory.vehicles.find(v=>v.stock==='R12500');assert.ok(original);
 const wrongYear={...original,vin:'REGRESSION-WRONG-YEAR',stock:'WRONG-YEAR',year:2025};
 const wrongModel={...original,vin:'REGRESSION-WRONG-MODEL',stock:'WRONG-MODEL',title:'New 2026 RAM 1500 TRADESMAN'};
 const wrongSeries={...original,vin:'REGRESSION-WRONG-SERIES',stock:'WRONG-SERIES',title:'New 2026 RAM PROMASTER 3500 TRADESMAN CARGO VAN'};
 const outsiders=[wrongYear,wrongModel,wrongSeries];
 const changed={...records};
 for(const v of outsiders)changed[v.vin]={...records[original.vin],vin:v.vin};
 const g=createPhotoGuide(catalog,[...inventory.vehicles,...outsiders],changed),hd=g.lineups.find(l=>l.id==='ram-3500');
 assert.ok(hd);
 const matches=g.matches(hd,{screen:'r12500-dashboard'},0,'Both');
 assert.ok(matches.some(v=>v.vin===original.vin));
 assert.ok(matches.every(v=>!outsiders.some(other=>other.vin===v.vin)));
});

test('Used Nappa and 14.4-inch HD examples respect the shopper’s condition filter',()=>{
 for(const [id,answers,picturedStock] of [
  ['chrysler-pacifica',{seats:'p04984-nappa'},'P04984'],
  ['ram-3500',{screen:'r12249a-dashboard'},'R12249A']
 ]){
  const l=engine.lineups.find(l=>l.id===id);assert.ok(l);
  const pictured=inventory.vehicles.find(v=>v.stock===picturedStock);assert.equal(pictured?.condition,'Used');
  // This captured inventory has no new vehicle with either exact specification.
  assert.deepEqual(engine.matches(l,answers,0,'New'),[]);
  const used=engine.matches(l,answers,0,'Used'),both=engine.matches(l,answers,0,'Both');
  assert.ok(used.some(v=>v.vin===pictured.vin));
  assert.ok(used.every(v=>v.condition==='Used'));
  assert.deepEqual(both.map(v=>v.vin),used.map(v=>v.vin));
  assert.deepEqual(engine.matches(l,answers,1,'Used'),[]);
 }
});

test('Pacifica upholstery and HD seat layouts use exact installed specifications',()=>{
 for(const [id,question,choice,expected,picturedStock] of [
  ['chrysler-pacifica','seats','c02225-leatherette','caprice leatherette bucket seats','C02225'],
  ['chrysler-pacifica','seats','p04984-nappa','nappa leather bucket seats','P04984'],
  ['ram-3500','seat-configuration','r12500-vinyl-bench','heavy-duty vinyl 40/20/40 split bench seat','R12500'],
  ['ram-3500','seat-configuration','r12512-leather-buckets','leather-trimmed bucket seats','R12512']
 ]){
  const l=engine.lineups.find(l=>l.id===id);assert.ok(l);
  const found=engine.matches(l,{[question]:choice},0,'Both');
  assert.ok(found.some(v=>v.stock===picturedStock));
  for(const v of found)assert.equal(withComparisonSpecifications(v,records[v.vin]).features.seatUpholstery.comparisonValue,expected);
 }
 const hd=engine.lineups.find(l=>l.id==='ram-3500');
 const leather=engine.matches(hd,{'seat-configuration':'r12512-leather-buckets'},0,'Both');
 assert.ok(!leather.some(v=>v.stock==='R12500'||v.stock==='R12249A'));
 const pacifica=engine.lineups.find(l=>l.id==='chrysler-pacifica');
 assert.ok(!engine.matches(pacifica,{seats:'c02225-leatherette'},0,'Both').some(v=>v.stock==='P04984'));
 assert.ok(!engine.matches(pacifica,{seats:'p04984-nappa'},0,'Both').some(v=>v.stock==='C02225'));
});

test('Unavailable HD combinations and contradictory Pacifica choices return zero',()=>{
 const hd=engine.lineups.find(l=>l.id==='ram-3500'),pacifica=engine.lineups.find(l=>l.id==='chrysler-pacifica');
 assert.ok(hd&&pacifica);
 for(const condition of ['New','Used','Both']){
  for(const seats of ['r12500-vinyl-bench','r12512-leather-buckets']){
   assert.deepEqual(engine.matches(hd,{screen:'r12249a-dashboard','seat-configuration':seats},0,condition),[]);
  }
  assert.deepEqual(engine.matches(pacifica,{seats:'p04984-nappa',roof:'reject:c02225-panoramic'},0,condition),[]);
 }
 assert.ok(engine.matches(pacifica,{seats:'p04984-nappa',roof:'c02225-panoramic'},0,'Used').some(v=>v.stock==='P04984'));
});
