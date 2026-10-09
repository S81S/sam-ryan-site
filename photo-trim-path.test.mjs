import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPhotoTrimPath} from './photo-trim-path.mjs';
import {createPhotoGuide} from './photo-guide-engine.mjs';
const sourceUrl='https://www.stellantisfleet.com/reviewed-factory-guide.pdf';
const fact=(status,extra={})=>({status,sourceUrl,...extra});
const photo=(id,feature,value,model='ram-1500')=>({id,feature,value,model,year:2026});
const screen84=photo('screen84','infotainmentScreen','8.4 inches'),screen12=photo('screen12','infotainmentScreen','12 inches'),screen144=photo('screen144','infotainmentScreen','14.4 inches');
const manual=photo('manual','driverAdjustment','4-way manual'),power=photo('power','driverAdjustment','8-way power'),cloth=photo('cloth','seatUpholstery','Deluxe Cloth Bucket Seat');
const ram={id:'ram-1500',year:2026,questions:[{id:'screen',choices:[screen84,screen12,screen144]},{id:'seat-adjustment',choices:[manual,power]},{id:'seats',choices:[cloth]}]};
const pacifica={id:'chrysler-pacifica',year:2026,questions:[{id:'seats',choices:[photo('leatherette','seatUpholstery','Caprice Leatherette Bucket Seats','chrysler-pacifica'),photo('nappa','seatUpholstery','Nappa Leather Bucket Seats','chrysler-pacifica')]},{id:'roof',choices:[photo('panoramic','panoramic',true,'chrysler-pacifica')]}]};
const fixture={models:[{id:ram.id,year:2026,baseTrim:'tradesman',baseFeatures:[{label:'Included screen',value:'8.4 inches',sourceUrl}],trims:[
 {id:'tradesman',name:'Tradesman',rank:0,choices:{screen84:fact('standard'),screen12:fact('unavailable'),screen144:fact('unavailable'),manual:fact('standard'),power:fact('unavailable'),cloth:fact('unavailable')}},
 {id:'big-horn',name:'Big Horn',rank:1,choices:{screen84:fact('standard'),screen12:fact('optional',{requires:['power'],replaces:'8.4-inch screen'}),screen144:fact('unavailable'),manual:fact('standard'),power:fact('optional'),cloth:fact('optional',{requires:['power'],conflictsWith:['manual']})}},
 {id:'laramie',name:'Laramie',rank:2,choices:{screen84:fact('unavailable'),screen12:fact('standard'),screen144:fact('unknown',{note:'Factory guide says 14.5 inches; the photo sticker says 14.4 inches.'}),manual:fact('unavailable'),power:fact('standard'),cloth:fact('unavailable')}}
]},{id:pacifica.id,year:2026,baseTrim:'select',baseFeatures:[],trims:[
 {id:'select',name:'Select',rank:0,choices:{leatherette:fact('standard'),nappa:fact('unavailable'),panoramic:fact('optional')}},
 {id:'limited',name:'Limited',rank:1,choices:{leatherette:fact('unavailable'),nappa:fact('standard'),panoramic:fact('standard',{canOmit:false})}}
]}]};
const engine={lineups:[ram,pacifica]},path=createPhotoTrimPath(fixture,engine);

test('A path starts at the sourced base trim and no preference adds no equipment',()=>{
 const start=path.resolve(ram);assert.equal(start.base.id,'tradesman');assert.equal(start.current.id,'tradesman');
 assert.equal(start.baseFeatures[0].value,'8.4 inches');assert.equal(start.status,'supported');
 assert.equal(path.resolve(ram,{screen:'skip','seat-adjustment':'skip',seats:'skip'}).current.id,'tradesman');
 assert.equal(path.baseline(ram,'screen').id,'screen84');assert.equal(path.baseline(ram,'seats'),null);
 assert.equal(start.configurationVerified,false);
});

test('An available upgrade stays optional and identifies the required trim and replacement',()=>{
 const next=path.offer(ram,{},'screen','screen12');
 assert.equal(next.selectable,true);assert.equal(next.status,'step-up');assert.equal(next.trim.id,'big-horn');
 assert.equal(next.availability,'optional');assert.equal(next.replaces,'8.4-inch screen');assert.deepEqual(next.requires,['power']);
 const picked=path.resolve(ram,{screen:'screen12'});assert.equal(picked.current.id,'big-horn');
 assert.deepEqual(picked.requirements,[{choiceId:'screen12',requiredChoiceId:'power',questionId:'seat-adjustment',answered:false}]);
 assert.equal(path.offer(ram,{screen:'screen12'},'seat-adjustment','power').status,'optional');
 assert.equal(path.resolve(ram,{screen:'screen12','seat-adjustment':'power'}).requirements[0].answered,true);
});

test('Package dependencies block an incompatible explicit choice without changing earlier answers',()=>{
 const answers={seats:'cloth','seat-adjustment':'manual'},snapshot=structuredClone(answers);
 const resolved=path.resolve(ram,answers);assert.equal(resolved.status,'conflict');assert.equal(resolved.current,null);
 assert.deepEqual(resolved.candidates,[]);assert.deepEqual(answers,snapshot);
 assert.equal(path.offer(ram,{seats:'cloth'},'seat-adjustment','manual').selectable,false);
 assert.equal(path.offer(ram,{seats:'cloth'},'seat-adjustment','power').selectable,true);
 assert.equal(path.resolve(ram,{seats:'cloth','seat-adjustment':['reject:power']}).status,'conflict');
});

test('A standard feature can be rejected when a verified replacement remains possible',()=>{
 const result=path.resolve(ram,{screen:['reject:screen84']});
 assert.ok(result.candidates.some(t=>t.id==='big-horn'));
 const selected=path.resolve(pacifica,{seats:'nappa',roof:'reject:panoramic'});
 assert.equal(selected.status,'conflict');assert.equal(selected.current,null);
 assert.equal(path.resolve(pacifica,{seats:'nappa',roof:'panoramic'}).current.id,'limited');
 const blockedUpgrade=path.resolve(ram,{screen:['reject:screen84'],'seat-adjustment':'manual'});
 assert.ok(!blockedUpgrade.candidates.some(t=>t.id==='big-horn'),'a rejected base screen cannot be replaced by an upgrade whose power-seat requirement conflicts with the chosen manual seat');
});

test('Unknown exact sizes remain unknown and never inherit a similarly named factory option',()=>{
 const picked=path.resolve(ram,{screen:'screen144'});
 assert.equal(picked.status,'unknown');assert.equal(picked.current.id,'laramie');assert.deepEqual(picked.candidates,[]);
 assert.equal(picked.unresolved[0].choice.value,'14.4 inches');
 const offered=path.offer(ram,{},'screen','screen144');assert.equal(offered.status,'unknown');assert.equal(offered.selectable,true);
 assert.match(offered.note,/14\.5.*14\.4/);
});

test('Missing source cells and unsupported model years do not manufacture availability',()=>{
 const changed=structuredClone(fixture);delete changed.models[0].trims[0].choices.screen84.sourceUrl;
 const uncertain=createPhotoTrimPath(changed,engine);assert.equal(uncertain.baseline(ram,'screen'),null);
 assert.equal(uncertain.resolve(ram,{screen:'screen84'}).assessments[0].status,'unknown');
 assert.equal(path.resolve({...ram,year:2025}).status,'unknown');assert.equal(path.resolve({...ram,year:2025}).base,null);
 assert.equal(path.offer(ram,{},'screen','nappa').selectable,false);
 assert.equal(path.resolve(ram,{screen:['screen12']}).status,'conflict');
 assert.equal(path.resolve(ram,{screen:'made-up'}).status,'conflict');
});

test('A known higher-trim option does not imply an uncertain lower trim is unavailable',()=>{
 const changed=structuredClone(fixture);changed.models[1].trims[0].choices.panoramic=fact('unknown',{note:'The chart and exact vehicle sticker disagree.'});
 const uncertain=createPhotoTrimPath(changed,engine),offer=uncertain.offer(pacifica,{},'roof','panoramic');
 assert.equal(offer.status,'step-up');assert.equal(offer.trim.id,'limited');
 assert.equal(offer.selectable,true);assert.equal(offer.requiresTrim,false);assert.equal(offer.lowerAvailabilityUnknown,true);
 assert.equal(offer.lowerTrimNotes[0].trim.id,'select');
 assert.equal(path.offer(ram,{},'screen','screen12').requiresTrim,true);
});

test('Editing an earlier choice advertises the same trim and availability that resolve will select',()=>{
 const changed=structuredClone(fixture);changed.models[0].trims[2].choices.screen144=fact('optional');
 const routing=createPhotoTrimPath(changed,engine),answers={screen:'screen144'};
 assert.equal(routing.resolve(ram,answers).current.id,'laramie');
 const offer=routing.offer(ram,answers,'screen','screen12'),after=routing.resolve(ram,{screen:'screen12'});
 assert.equal(offer.trim.id,after.current.id);assert.equal(offer.trim.id,'big-horn');
 assert.equal(offer.availability,'optional');assert.equal(offer.status,'optional');
 const base=routing.offer(ram,answers,'screen','screen84');
 assert.equal(base.trim.id,routing.resolve(ram,{screen:'screen84'}).current.id);assert.equal(base.status,'included');
});

const read=name=>JSON.parse(fs.readFileSync(new URL(name,import.meta.url)));
test('Reviewed production paths start at factory base trims and use only enabled photos',()=>{
 const data=read('./data/photo-trim-path.json'),catalog=read('./data/feature-photo-guide.json');
 const inventory=read('./data/used-inventory.json'),{records}=read('./data/equipment-index.json');
 const realEngine=createPhotoGuide(catalog,inventory.vehicles,records),realPath=createPhotoTrimPath(data,realEngine);
 for(const [id,base] of [['ram-1500','tradesman'],['ram-3500','tradesman'],['chrysler-pacifica','select']]){
  const lineup=realEngine.lineups.find(l=>l.id===id);assert.ok(lineup);
  const start=realPath.resolve(lineup);assert.equal(start.base?.id,base);assert.equal(start.current?.id,base);
  assert.ok(start.baseFeatures.length>0);assert.equal(start.configurationVerified,false);
  const model=data.models.find(m=>m.id===id&&m.year===2026);assert.ok(model);
  for(const t of model.trims)for(const choiceId of Object.keys(t.choices||{}))assert.ok(realEngine.photos.has(choiceId),`${id}/${t.id}/${choiceId}`);
  for(const q of lineup.questions)for(const p of q.choices){
   const offered=realPath.offer(lineup,{},q.id,p.id);
   assert.equal(typeof offered.selectable,'boolean');
   if(p.value==='14.4 inches'&&!['unknown','unavailable'].includes(offered.status)){
    assert.equal(offered.radioCode,'UBW');assert.equal(offered.crosswalkSource,'https://static.nhtsa.gov/odi/tsbs/2026/MC-11034895-0001.pdf');
    assert.match(offered.factoryLabel,/14\.5-inch/i);assert.match(offered.stickerLabel,/14\.4-inch/i);
    assert.equal(realEngine.photos.get(p.id).value,'14.4 inches');
   }
  }
 }
});

test('The sourced UBW radio mapping resolves package and standard availability while preserving exact VIN dimensions',()=>{
 const data=read('./data/photo-trim-path.json'),catalog=read('./data/feature-photo-guide.json');
 const inventory=read('./data/used-inventory.json'),{records}=read('./data/equipment-index.json');
 const realEngine=createPhotoGuide(catalog,inventory.vehicles,records),realPath=createPhotoTrimPath(data,realEngine);
 for(const [id,photoId,standardTrim] of [['ram-1500','r12315-dashboard','tungsten'],['ram-3500','r12249a-dashboard','limited']]){
  const lineup=realEngine.lineups.find(l=>l.id===id),resolved=realPath.resolve(lineup,{screen:photoId});
  assert.equal(resolved.status,'supported');assert.equal(resolved.current.id,'laramie');
  const laramie=resolved.assessments.find(a=>a.trim.id==='laramie'),standard=resolved.assessments.find(a=>a.trim.id===standardTrim);
  assert.equal(laramie.status,'supported');assert.equal(laramie.checks[0].availability,'optional');
  assert.equal(standard.status,'supported');assert.equal(standard.checks[0].availability,'standard');
  assert.equal(resolved.assessments.find(a=>a.trim.id==='tradesman').status,'conflict');
  const pictured=inventory.vehicles.find(v=>v.vin===realEngine.photos.get(photoId).vin);
  assert.ok(realEngine.choiceMatches(pictured,{feature:'infotainmentScreen',value:'14.4 inches'}));
  assert.equal(realEngine.choiceMatches(pictured,{feature:'infotainmentScreen',value:'14.5 inches'}),false);
 }
 for(const patch of [{radioCode:'OTHER'},{crosswalkSource:''},{crosswalkSource:'https://example.com/unreviewed.pdf'},{crosswalkEvidence:''},{factoryLabel:''},{stickerLabel:'14.5-Inch Touchscreen Display'}]){
  const changed=structuredClone(data);
  for(const model of changed.models)for(const trim of model.trims)for(const entry of Object.values(trim.choices))if(entry.radioCode==='UBW')Object.assign(entry,patch);
  const unreviewed=createPhotoTrimPath(changed,realEngine),lineup=realEngine.lineups.find(l=>l.id==='ram-1500');
  assert.notEqual(unreviewed.resolve(lineup,{screen:'r12315-dashboard'}).status,'supported');
 }
});
