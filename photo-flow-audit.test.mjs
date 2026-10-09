import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPhotoGuide} from './photo-guide-engine.mjs';

const read=name=>JSON.parse(fs.readFileSync(new URL(name,import.meta.url)));
const catalog=read('./data/feature-photo-guide.json');
const inventory=read('./data/used-inventory.json');
const {records}=read('./data/equipment-index.json');

// Controlled identity variants reuse the same equipment fact and image
// metadata. These are test fixtures only, never a published photo catalog.
function scopeFixture(){
 const source=catalog.photos.find(photo=>photo.id==='r12527-dashboard');
 const original=inventory.vehicles.find(vehicle=>vehicle.vin===source.vin);
 const lineup={id:'grand-cherokee-audit',year:2026,identity:'jeep grand cherokee',
  excludeIdentityTokens:['grand cherokee l','4xe'],questions:[{id:'screen',choices:[]}]};
 const variants=[
  ['two-row-laredo','New 2026 Jeep Grand Cherokee Laredo','GRAND CHEROKEE LAREDO 4X2'],
  ['two-row-limited','New 2026 Jeep Grand Cherokee Limited','GRAND CHEROKEE LIMITED 4X4'],
  ['l-title','New 2026 Jeep Grand Cherokee L Laredo','GRAND CHEROKEE L LAREDO 4X2'],
  ['l-sticker','New 2026 Jeep Grand Cherokee Laredo','GRAND CHEROKEE L LAREDO 4X2'],
  ['4xe-title','New 2026 Jeep Grand Cherokee 4xe','GRAND CHEROKEE 4xe'],
  ['4xe-sticker','New 2026 Jeep Grand Cherokee Limited','GRAND CHEROKEE 4xe'],
  ['wrong-title-year','New 2025 Jeep Grand Cherokee Laredo','GRAND CHEROKEE LAREDO 4X2'],
  ['wrong-model','New 2026 Jeep Grand Cherokee Laredo','WRANGLER RUBICON 4X4'],
  ['wrong-sticker-year','New 2026 Jeep Grand Cherokee Laredo','GRAND CHEROKEE LAREDO 4X2'],
 ];
 const vehicles=[],photos=[],index={};
 for(const [id,title,modelLine] of variants){
  const vin='AUDIT-'+id,photo={...source,id,vin,stock:id,title,model:lineup.id};
  const vehicle={...original,vin,stock:id,title};
  index[vin]={...structuredClone(records[original.vin]),vin,identityLines:[id==='wrong-sticker-year'?'2025 MODEL YEAR':'2026 MODEL YEAR (26MY)',modelLine]};
  photos.push(photo);vehicles.push(vehicle);lineup.questions[0].choices.push(id);
 }
 return {catalog:{photos,lineups:[lineup]},vehicles,records:index};
}

test('Two-row Grand Cherokee excludes L and 4xe from both photos and result vehicles',()=>{
 const fixture=scopeFixture(),guide=createPhotoGuide(fixture.catalog,fixture.vehicles,fixture.records);
 const lineup=guide.lineups[0];assert.ok(lineup);
 assert.deepEqual([...guide.photos.keys()],['two-row-laredo','two-row-limited']);
 for(const answers of [{},{screen:'two-row-laredo'},{screen:'skip'}]){
  const found=guide.matches(lineup,answers,0,'Both');
  assert.deepEqual(found.map(vehicle=>vehicle.stock).sort(),['two-row-laredo','two-row-limited']);
 }
});

test('Exclusions use whole identity tokens, without excluding Laredo, Limited or package mentions',()=>{
 const fixture=scopeFixture(),control=fixture.vehicles[0];
 fixture.records[control.vin].lines.push('Accessory carrier also fits Grand Cherokee L and 4xe');
 const guide=createPhotoGuide(fixture.catalog,fixture.vehicles,fixture.records);
 assert.ok(guide.photos.has('two-row-laredo'));
 assert.ok(guide.photos.has('two-row-limited'));
 assert.ok(guide.matches(guide.lineups[0]).some(vehicle=>vehicle.vin===control.vin));
});

test('Malformed model exclusions cannot silently widen a restricted photo guide',()=>{
 for(const value of ['4xe',null,{},['4xe',null],[''],['---']]){
  const fixture=scopeFixture();fixture.catalog.lineups[0].excludeIdentityTokens=value;
  const guide=createPhotoGuide(fixture.catalog,fixture.vehicles,fixture.records);
  assert.equal(guide.lineups.length,0,JSON.stringify(value));
  assert.equal(guide.photos.size,0,JSON.stringify(value));
 }
});

test('A matching listing cannot override a conflicting sticker model, year or VIN',()=>{
 const vehicle=inventory.vehicles.find(vehicle=>vehicle.stock==='R12500');
 for(const patch of [
  {identityLines:['2025 MODEL YEAR','RAM 3500 TRADESMAN CREW CAB 4X4 LONG BOX']},
  {identityLines:['2026 MODEL YEAR','RAM 1500 TRADESMAN CREW CAB 4X4']},
  {identityLines:['2026 MODEL YEAR','RAM PROMASTER 3500 CARGO VAN']},
  {identityLines:['2026 MODEL YEAR',null]},
  {vin:'WRONG-VIN'}
 ]){
  const index={...records,[vehicle.vin]:{...records[vehicle.vin],...patch}};
  const guide=createPhotoGuide(catalog,inventory.vehicles,index);
  const lineup=guide.lineups.find(lineup=>lineup.id==='ram-3500');assert.ok(lineup);
  assert.ok(!guide.photos.has('r12500-dashboard'));
  assert.ok(!guide.matches(lineup,{},0,'Both').some(candidate=>candidate.vin===vehicle.vin),JSON.stringify(patch));
 }
});

test('Pickup scope excludes chassis-cab inventory even when the listing omits the body distinction',()=>{
 const scoped=structuredClone(catalog);
 scoped.lineups.find(lineup=>lineup.id==='ram-3500').excludeIdentityTokens=['chassis'];
 const guide=createPhotoGuide(scoped,inventory.vehicles,records);
 const lineup=guide.lineups.find(lineup=>lineup.id==='ram-3500');assert.ok(lineup);
 const chassis=inventory.vehicles.filter(vehicle=>vehicle.year===2026&&records[vehicle.vin]?.identityLines?.some(line=>/RAM 3500 CHASSIS/i.test(line)));
 assert.ok(chassis.length>0,'the real snapshot includes chassis-cab counterexamples');
 const found=guide.matches(lineup,{},0,'Both');
 assert.ok(found.some(vehicle=>vehicle.stock==='R12500'));
 for(const vehicle of chassis)assert.ok(!found.some(candidate=>candidate.vin===vehicle.vin),vehicle.stock);
});

test('Existing reviewed photo sources survive model identity checks and make-free sticker formats',()=>{
 const guide=createPhotoGuide(catalog,inventory.vehicles,records);
 for(const photo of catalog.photos.filter(photo=>photo.reviewed))assert.ok(guide.photos.has(photo.id),photo.id);
 for(const stock of ['R12527','R12500','C02225','P04984','R12249A']){
  const vehicle=inventory.vehicles.find(vehicle=>vehicle.stock===stock);
  assert.ok(guide.lineups.some(lineup=>guide.matches(lineup,{},0,'Both').some(candidate=>candidate.vin===vehicle.vin)),stock);
 }
});
