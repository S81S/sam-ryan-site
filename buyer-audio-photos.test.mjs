import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buyerModels,buyerLineup} from './buyer-catalog.mjs';
import {buyerAudioPhoto} from './buyer-audio-photos.mjs';

const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url)));
function lineup(){
 const model=buyerModels(read('./trim-standard-data.json'),read('./data/factory/index.json')).find(m=>m.id==='ram-1500');
 return buyerLineup(model,read('./data/factory/ram-1500.json'));
}
const klipsch='f1uh0zqe',harman='f19v1dzs';

test('the two actual audio factory choices receive their exact branded OEM photos',()=>{
 const l=lineup();
 for(const [id,name] of [[klipsch,'klipsch'],[harman,'harman-kardon']]){
  const c=l.choices.get(id),before=structuredClone(c),photo=buyerAudioPhoto(l,c);
  assert.equal(photo.image,'/ram1500-2026-'+name+'-oem.jpg');assert.equal(photo.photoKind,'oem');
  assert.match(photo.caption,/Canadian-market 2026 Ram 1500/);assert.match(photo.sourceUrl,/^https:\/\/www\.ramtruck\.ca\//);
  assert.match(photo.imageSource,/\/year-2026\/media\/images\//);assert.match(photo.equipmentSourceUrl,/26DOMMOP_FBG_Ram1500\.pdf$/);
  for(const key of ['vin','stock','facts','feature','value','wanted'])assert.equal(key in photo,false,key);
  const bytes=readFileSync(new URL('.'+photo.image,import.meta.url));assert.equal(bytes[0],0xff);assert.equal(bytes[1],0xd8);assert.ok(bytes.length>100000);
  assert.deepEqual(c,before,'rendering metadata never changes facts or requirements');
 }
 assert.match(buyerAudioPhoto(l,l.choices.get(klipsch)).label,/dashboard/i);
 assert.match(buyerAudioPhoto(l,l.choices.get(harman)).label,/door speaker/i);
});

test('selected trims must explicitly offer the exact factory audio configuration',()=>{
 const l=lineup();
 assert.ok(buyerAudioPhoto(l,l.choices.get(klipsch),{trimId:'tungsten'}));
 for(const trimId of ['limited','laramie','tradesman','unknown'])assert.equal(buyerAudioPhoto(l,l.choices.get(klipsch),{trimId}),null,trimId);
 for(const trimId of ['limited','limited-longhorn','laramie','rebel'])assert.ok(buyerAudioPhoto(l,l.choices.get(harman),{trimId}),trimId);
 for(const trimId of ['tungsten','big-horn-lone-star','tradesman','unknown'])assert.equal(buyerAudioPhoto(l,l.choices.get(harman),{trimId}),null,trimId);
 const copy=structuredClone(l);delete copy.choices.get(harman).facts.limited;
 assert.equal(buyerAudioPhoto(copy,copy.choices.get(harman),{trimId:'limited'}),null);
});

test('similar systems, other models/years and unsourced or changed facts cannot inherit either photo',()=>{
 const l=lineup(),c=l.choices.get(klipsch);
 for(const patch of [{id:harman},{model:'ram-3500'},{year:2027},{value:'other'},{kind:'equipment'},{feature:'premiumAudio'}])assert.equal(buyerAudioPhoto(l,{...c,...patch}),null,JSON.stringify(patch));
 assert.equal(buyerAudioPhoto({...l,year:2027},{...c,year:2027}),null);
 assert.equal(buyerAudioPhoto({...l,id:'ram-3500'},{...c,model:'ram-3500'}),null);
 for(const id of [klipsch,harman])for(const mutate of [f=>{f.sourceUrl='https://example.com/chart.pdf';},f=>{f.text=f.text.replace(/23|19/,'17');},f=>{f.parent='Speakers';},f=>{f.status='unavailable';},f=>{f.text=f.text.replace(/RGE|RCA/,'RXX');}]){
  const copy=structuredClone(l),changed=copy.choices.get(id);for(const fact of Object.values(changed.facts))mutate(fact);
  assert.equal(buyerAudioPhoto(copy,changed),null,id);
 }
 const empty=structuredClone(l);empty.choices.get(klipsch).facts={};assert.equal(buyerAudioPhoto(empty,empty.choices.get(klipsch)),null);
 assert.equal(buyerAudioPhoto(l,null),null);assert.equal(buyerAudioPhoto(null,c),null);
});
