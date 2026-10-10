import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPhotoGuide} from './photo-guide-engine.mjs';
import {createPhotoTrimPath} from './photo-trim-path.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));
const catalog=read('./data/feature-photo-guide.json'),inventory=read('./data/used-inventory.json'),{records}=read('./data/equipment-index.json');
const engine=createPhotoGuide(catalog,inventory.vehicles,records),lineup=engine.lineups.find(l=>l.id==='jeep-grand-cherokee');
const photoChoices=lineup.questions.flatMap(q=>q.choices).filter(c=>engine.photos.has(c.id));
const paths=createPhotoTrimPath(read('./data/photo-trim-path.json'),engine);

test('The production Grand Cherokee guide uses six exact vehicle photos and only two-row gas inventory',()=>{
 assert.ok(lineup);
 assert.equal(photoChoices.length,6);
 const found=engine.matches(lineup,{},0,'Both');assert.ok(found.length>0);
 assert.ok(found.every(v=>v.year===2026&&!/grand cherokee l\b|4xe/i.test(v.title)));
 for(const photo of photoChoices){
  const vehicle=inventory.vehicles.find(v=>v.vin===photo.vin);
  assert.ok(engine.choiceMatches(vehicle,photo));
  assert.equal(vehicle.photoUrls[photo.photoIndex-1],photo.imageSource);
 }
});

test('Grand Cherokee screen and upholstery choices retain actual installed configurations',()=>{
 for(const [answers,stock] of [
  [{screen:'j22581-dashboard',seats:'j22581-cloth'},'J22581'],
  [{screen:'j22138-dashboard',seats:'j22138-capri'},'J22138'],
  [{screen:'j22138-dashboard',seats:'j22560-palermo',roof:'j22560-panoramic'},'J22560']
 ])assert.ok(engine.matches(lineup,answers).some(v=>v.stock===stock));
 const capri=engine.matches(lineup,{seats:'j22138-capri'});
 assert.ok(capri.every(v=>!/(?:altitude|85th|summit)/i.test(v.title)),'a plain Capri photo must not stand in for different seat configurations');
 assert.deepEqual(engine.matches(lineup,{screen:'j22581-dashboard',seats:'j22138-capri'}),[]);
 assert.deepEqual(engine.matches(lineup,{screen:'j22581-dashboard',seats:'j22560-palermo'}),[]);
});

test('Grand Cherokee trim routing distinguishes the V6 base, refreshed Altitude and higher upholstery',()=>{
 const base=paths.resolve(lineup,{});
 assert.equal(base.current.id,'laredo');assert.match(base.shopperScope,/V6 Laredo/);
 assert.equal(paths.offer(lineup,{},'screen','j22581-dashboard').availability,'standard');
 const larger=paths.offer(lineup,{},'screen','j22138-dashboard');
 assert.equal(larger.trim.id,'laredo-altitude');assert.equal(larger.availability,'standard');
 assert.equal(paths.resolve(lineup,{screen:'j22138-dashboard',seats:'j22138-capri'}).current.id,'limited');
 const summit=paths.resolve(lineup,{seats:'j22560-palermo'});
 assert.equal(summit.current.id,'summit');
 assert.ok(summit.requirements.some(r=>r.requiredChoiceId==='j22138-dashboard'));
 assert.equal(paths.resolve(lineup,{screen:'j22581-dashboard',seats:'j22138-capri'}).status,'conflict');
 const roof=paths.offer(lineup,{seats:'j22560-palermo'},'roof','j22560-panoramic');
 assert.equal(roof.trim.id,'summit');assert.equal(roof.availability,'standard');
});

test('Grand Cherokee panoramic rejection never silently retains a standard panoramic Summit',()=>{
 const answers={screen:'j22138-dashboard',seats:'j22560-palermo',roof:'reject:j22560-panoramic'};
 assert.deepEqual(engine.matches(lineup,answers,0,'Both'),[]);
 assert.notEqual(paths.resolve(lineup,answers).status,'supported','a standard-feature rejection must not be advertised as a supported factory combination');
 assert.ok(engine.matches(lineup,{screen:'j22138-dashboard',seats:'j22560-palermo',roof:'skip'}).some(v=>v.stock==='J22560'));
});
