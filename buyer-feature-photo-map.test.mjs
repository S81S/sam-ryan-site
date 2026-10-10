import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buyerModels,buyerLineup} from './buyer-catalog.mjs';
import {createPhotoGuide} from './photo-guide-engine.mjs';
import {buyerFeaturePhoto,reviewedPhotoCrop} from './buyer-feature-photo-map.mjs';

const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url)));
const catalog=read('./data/feature-photo-guide.json');
const photos=createPhotoGuide(catalog,read('./data/used-inventory.json').vehicles,read('./data/equipment-index.json').records);
const models=buyerModels(read('./trim-standard-data.json'),read('./data/factory/index.json'));
const lineup=id=>{const m=models.find(m=>m.id===id);return buyerLineup(m,m.meta?.file?read('./data/factory/'+m.meta.file):null);};
const mapped=(model,id,options={})=>{const l=lineup(model);return buyerFeaturePhoto(l,l.choices.get(id),photos,options);};
const expected=[
 ['ram-1500','f1e0k45y','r12546-dashboard'],['ram-1500','fh01t86','r12527-dashboard'],['ram-1500','f13a33dn','r12315-dashboard'],
 ['ram-3500','f123o6b','r12500-dashboard'],['ram-3500','f10mbyu8','r12249a-dashboard'],
 ['jeep-grand-cherokee','f3x3ws','j22138-dashboard'],['ram-1500','f1816siy','r12315-panoramic'],
 ['jeep-grand-cherokee','flfl6gd','j22560-panoramic'],['chrysler-pacifica','fequ0mu','c02225-panoramic'],
 ['chrysler-pacifica','f1bzgmzl','c02225-leatherette'],['chrysler-pacifica','fv1g51y','p04984-nappa'],
 ['jeep-grand-cherokee','f1vszy2n','j22138-capri'],['jeep-grand-cherokee','f1o50nvc','j22560-palermo'],
 ['wrangler','f1dj1wzb','j22109-hardtop'],['wrangler','feeakr0','j22412-skyroof']
];

test('all existing reviewed photo choices retain their exact feature image and scope',()=>{
 assert.equal(photos.photos.size,27);
 for(const p of photos.photos.values()){
  const result=buyerFeaturePhoto({id:p.model,year:p.year},p,photos);
  assert.equal(result?.id,p.id,p.id);assert.equal(result.feature,p.feature);assert.equal(result.value,p.value);
  assert.deepEqual(result.allowedTrimIds,p.allowedTrimIds);assert.equal(result.reviewedScope,p.reviewedScope);
 }
});

test('audited canonical factory choices use the correct model-specific feature photos without changing facts',()=>{
 for(const [model,id,photo] of expected){
  const l=lineup(model),c=l.choices.get(id),before=structuredClone(c);
  assert.equal(buyerFeaturePhoto(l,c,photos)?.id,photo,model+' '+id);
  assert.equal(buyerFeaturePhoto(l,c,photos.photos)?.id,photo);
  assert.deepEqual(c,before);assert.equal(c.feature,'factoryChoice');assert.equal(c.value,id);
 }
});

test('the exact UBW radio crosswalk requires its reviewed factory code, size and source',()=>{
 for(const [model,id] of [['ram-1500','f13a33dn'],['ram-3500','f10mbyu8']]){
  const l=lineup(model),c=l.choices.get(id),result=buyerFeaturePhoto(l,c,photos);
  assert.match(result.crosswalkSource,/MC-11034895-0001\.pdf$/);assert.match(result.caption,/14\.4.*14\.5/);
  for(const change of [f=>{f.text=f.text.replace('UBW','UBQ');},f=>{f.text=f.text.replace('14.5','14.4');},f=>{f.sourceUrl='https://example.com/unreviewed.pdf';}]){
   const changed=structuredClone(l);for(const f of Object.values(changed.choices.get(id).facts))change(f);
   assert.equal(buyerFeaturePhoto(changed,changed.choices.get(id),photos),null);
  }
 }
});

test('factory photographs cannot drift to another model, year, predicate or unreviewed image',()=>{
 const l=lineup('ram-1500'),c=l.choices.get('fh01t86'),p=photos.photos.get('r12527-dashboard');
 for(const patch of [{reviewed:false},{reviewedAt:''},{model:'ram-3500'},{year:2025},{feature:'seatUpholstery'},{value:'8.4 inches'},{image:'/assets/arbitrary.jpg'},{stickerSource:''},{listingSource:''}]){
  const changed=new Map([[p.id,{...p,...patch}]]);assert.equal(buyerFeaturePhoto(l,c,changed),null,JSON.stringify(patch));
 }
 assert.equal(buyerFeaturePhoto({...l,id:'ram-3500'},c,photos),null);
 assert.equal(buyerFeaturePhoto({...l,year:2027},{...c,year:2027},photos),null);
 assert.equal(buyerFeaturePhoto(l,{...c,value:'different-choice'},photos),null);
 assert.equal(buyerFeaturePhoto(l,c,{photos:catalog.photos}),null,'raw catalog has not passed createPhotoGuide validation');
 const missing=new Map(photos.photos);missing.delete(p.id);assert.equal(buyerFeaturePhoto(l,c,missing),null);
});

test('different Wrangler roof types and upholstery scopes do not borrow a visually misleading photo',()=>{
 for(const id of ['f6l6ob7','f1dhm9e4','f10uw5fn'])assert.equal(mapped('wrangler',id),null,id);
 const l=lineup('wrangler'),nappa=l.choices.get('f1s1eh1p');
 assert.equal(buyerFeaturePhoto(l,nappa,photos),null,'one Nappa predicate includes distinct special editions');
 assert.equal(buyerFeaturePhoto(l,nappa,photos,{trimId:'rubicon-x'})?.id,'j22412-nappa');
 for(const trimId of ['rewind','willys-392','sport','rubicon'])assert.equal(buyerFeaturePhoto(l,nappa,photos,{trimId}),null,trimId);
 const cloth=photos.photos.get('j22109-cloth');
 assert.equal(buyerFeaturePhoto(l,{...cloth,id:'generic-cloth',allowedTrimIds:undefined},photos),null);
 assert.equal(buyerFeaturePhoto(l,{...cloth,id:'generic-cloth',reviewedScope:undefined},photos),null);
 assert.equal(buyerFeaturePhoto({id:'wrangler-2-door',year:2026},{...cloth,model:'wrangler-2-door'},photos),null);
});

test('similar trim fabrics and radio sizes without an audited mapping stay distinct',()=>{
 for(const model of ['chrysler-pacifica','jeep-grand-cherokee','ram-3500']){
  const l=lineup(model);
  const omitted=[...l.choices.values()].filter(c=>/Axis II|suede|quilted Nappa|S logo|8\.4-inch/i.test(c.fullLabel));
  assert.ok(omitted.length,model);
  for(const c of omitted)assert.equal(buyerFeaturePhoto(l,c,photos),null,c.fullLabel);
 }
});

test('all inspected promotional images have bounded crops and clean photos remain uncropped',()=>{
 const cropped=['r12315-dashboard','r12315-leather','r12315-panoramic','j22138-dashboard','j22138-capri','j22109-cloth','j22412-nappa','j22109-hardtop','j22412-skyroof','r12249a-dashboard','p04984-nappa'];
 for(const p of photos.photos.values()){
  const crop=reviewedPhotoCrop(p);
  if(!cropped.includes(p.id)){assert.equal(crop,null,p.id);continue;}
  assert.ok(crop,p.id);assert.equal(crop.sourceWidth,1024);assert.equal(crop.sourceHeight,p.id==='j22109-hardtop'?768:682);
  assert.ok(crop.x>=0&&crop.y>=0&&crop.width>0&&crop.height>0&&crop.x+crop.width<=crop.sourceWidth&&crop.y+crop.height<=crop.sourceHeight,p.id);
  for(const ref of [p.id,p.image,p.image.split('/').at(-1)])assert.deepEqual(reviewedPhotoCrop(ref),crop);
  crop.width=0;assert.ok(reviewedPhotoCrop(p).width>0,'returned rectangle is isolated');
 }
 assert.equal(reviewedPhotoCrop('unknown'),null);assert.equal(reviewedPhotoCrop(null),null);
 assert.equal(cropped.length,11);
});
