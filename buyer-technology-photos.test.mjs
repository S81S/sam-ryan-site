import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buyerModels,buyerLineup} from './buyer-catalog.mjs';
import {buyerTechnologyPhoto} from './buyer-technology-photos.mjs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
const models=buyerModels(read('./trim-standard-data.json'),read('./data/factory/index.json'));
const fixture=id=>{const m=models.find(m=>m.id===id);return buyerLineup(m,read('./data/factory/'+m.meta.file));};
const ids={wrangler:['f1oo6l8x'],'chrysler-pacifica':['f6k6gmv','fan5lv9','f194qpwp','feszh61','f19mzen9']};
test('reviewed OEM photos are display-only, bounded to actual images and the exact feature',()=>{
 for(const [model,choices] of Object.entries(ids)){
  const l=fixture(model),before=structuredClone(l);
  for(const id of choices){
   const p=buyerTechnologyPhoto(l,l.choices.get(id));assert.equal(p.photoKind,'oem');
   const bytes=readFileSync(new URL('.'+p.image,import.meta.url));assert.equal(bytes[0],255);assert.equal(bytes[1],216);
   const c=p.crop;assert.ok(c.x>=0&&c.y>=0&&c.width>0&&c.height>0&&c.x+c.width<=c.sourceWidth&&c.y+c.height<=c.sourceHeight);
   for(const key of ['vin','stock','facts','feature','value','wanted'])assert.equal(key in p,false);
   for(const change of [{value:'other'},{feature:'premiumAudio'},{year:2027},{model:'ram-1500'}])assert.equal(buyerTechnologyPhoto(l,{...l.choices.get(id),...change}),null);
   for(const mutate of [f=>{f.sourceUrl='https://example.test/unreviewed';},f=>{f.text+=' another version';},f=>{f.status='unavailable';}]){
    const copy=structuredClone(l),choice=copy.choices.get(id);Object.values(choice.facts).forEach(mutate);assert.equal(buyerTechnologyPhoto(copy,choice),null);
   }
  }
  assert.deepEqual(l,before);
 }
});
test('navigation images never depict base radios and availability stays trim-scoped',()=>{
 const w=fixture('wrangler'),p=fixture('chrysler-pacifica');
 assert.equal(buyerTechnologyPhoto(w,w.choices.get('f14j2jpq')),null);
 assert.equal(buyerTechnologyPhoto(p,p.choices.get('f2m7a7w')),null);
 assert.equal(buyerTechnologyPhoto(p,p.choices.get('feszh61'),{trimId:'select'}),null);
 assert.ok(buyerTechnologyPhoto(p,p.choices.get('feszh61'),{trimId:'limited'}));
 assert.ok(buyerTechnologyPhoto(p,p.choices.get('fan5lv9'),{trimId:'select'}));
 assert.equal(p.choices.get('fan5lv9').facts.select.status,'verify','photo never settles a source conflict');
});
