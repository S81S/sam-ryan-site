import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {repairWranglerRoofEvidence} from './wrangler-roof-evidence.mjs';
import {applyFactoryEquipment} from './factory-equipment.mjs';
import {withComparisonSpecifications} from './comparison-specs.mjs';
import {matchVehicle,parseQuery} from './equipment-search.mjs';
import {createPhotoGuide} from './photo-guide-engine.mjs';

const inventory=JSON.parse(fs.readFileSync(new URL('./data/used-inventory.json',import.meta.url))).vehicles;
const {records}=JSON.parse(fs.readFileSync(new URL('./data/equipment-index.json',import.meta.url)));
const byStock=stock=>{const vehicle=inventory.find(vehicle=>vehicle.stock===stock);return [vehicle,records[vehicle.vin]];};

test('The actual J22109 hard top and deletion override the base Sunrider soft-top line everywhere',()=>{
 const [vehicle,sticker]=byStock('J22109');
 assert.equal(sticker.features.softTop.value,true,'the saved parser fact reproduces the stale standard-equipment claim');
 for(const resolver of [repairWranglerRoofEvidence,applyFactoryEquipment,withComparisonSpecifications]){
  const result=resolver(vehicle,sticker);
  assert.equal(result.features.softTop.value,false,resolver.name);
  assert.equal(result.features.hardTop.value,true,resolver.name);
  assert.equal(result.features.skyRoof.value,false,resolver.name);
  assert.ok(result.features.softTop.evidence.includes('No Soft Top'));
  assert.equal(result.features.softTop.sourceUrl,sticker.sourceUrl);
 }
 assert.equal(matchVehicle(vehicle,sticker,parseQuery('soft top')).kind,'excluded');
 assert.equal(matchVehicle(vehicle,sticker,parseQuery('hard top')).kind,'match');
 assert.equal(matchVehicle(vehicle,sticker,parseQuery('sky one touch')).kind,'excluded');
 assert.equal(sticker.features.softTop.value,true,'resolving equipment does not mutate saved source evidence');
});

test('The actual J22412 power roof replaces the base soft top and the incompatible separate hard top',()=>{
 const [vehicle,sticker]=byStock('J22412');
 for(const resolver of [repairWranglerRoofEvidence,applyFactoryEquipment,withComparisonSpecifications]){
  const result=resolver(vehicle,sticker);
  assert.equal(result.features.skyRoof.value,true,resolver.name);
  assert.equal(result.features.softTop.value,false,resolver.name);
  assert.equal(result.features.hardTop.value,false,resolver.name);
  assert.match(result.features.hardTop.ruleSourceUrl,/446484/);
 }
 assert.equal(matchVehicle(vehicle,sticker,parseQuery('soft top')).kind,'excluded');
 assert.equal(matchVehicle(vehicle,sticker,parseQuery('hard top')).kind,'excluded');
 assert.equal(matchVehicle(vehicle,sticker,parseQuery('sky one touch')).kind,'match');
 const photoGuide=createPhotoGuide({},[vehicle],{[vehicle.vin]:sticker});
 assert.equal(photoGuide.choiceMatches(vehicle,{feature:'softTop',value:true}),false);
 assert.equal(photoGuide.choiceMatches(vehicle,{feature:'hardTop',value:true}),false);
 assert.equal(photoGuide.choiceMatches(vehicle,{feature:'skyRoof',value:true}),true);
 assert.equal(photoGuide.choiceMatches(vehicle,{feature:'hardTop',value:true},false),true);
});

test('Dual Top Group preserves both supplied tops and excludes Sky One-Touch',()=>{
 const [vehicle,source]=byStock('J22412');
 const sticker={...source,features:{softTop:{value:true},hardTop:{value:true}},lines:[
  'STANDARD EQUIPMENT (UNLESS REPLACED BY OPTIONAL EQUIPMENT)','Black Sunrider Soft Top',
  'OPTIONAL EQUIPMENT (May Replace Standard Equipment)','Customer Preferred Package 22R','Dual Top Group $2,795',
  'Black 3-Piece Hard Top','Premium Black Sunrider Soft Top'
 ]};
 for(const resolver of [repairWranglerRoofEvidence,applyFactoryEquipment,withComparisonSpecifications]){
  const result=resolver(vehicle,sticker);
  assert.equal(result.features.softTop.value,true,resolver.name);
  assert.equal(result.features.hardTop.value,true,resolver.name);
  assert.equal(result.features.skyRoof.value,false,resolver.name);
 }
});

test('Unreviewed model years, body styles, powertrains and mismatched sources are untouched',()=>{
 const [vehicle,sticker]=byStock('J22412');
 for(const [v,s] of [
  [{...vehicle,year:2025},sticker],
  [vehicle,{...sticker,vin:'WRONG'}],
  [vehicle,{...sticker,status:'unverified'}],
  [vehicle,{...sticker,identityLines:['2025 MODEL YEAR','WRANGLER 4-DOOR RUBICON 4X4']}],
  [vehicle,{...sticker,identityLines:['2026 MODEL YEAR','WRANGLER 2-DOOR RUBICON 4X4']}],
  [vehicle,{...sticker,identityLines:['2026 MODEL YEAR','WRANGLER 4-DOOR RUBICON 4xe 4X4']}],
  [vehicle,{...sticker,identityLines:['2026 MODEL YEAR','WRANGLER 4-DOOR SPORT RHD 4X4']}],
  [vehicle,{...sticker,identityLines:['2026 MODEL YEAR','GLADIATOR RUBICON 4X4']}],
  [vehicle,{...sticker,identityLines:['2026 MODEL YEAR',null]}],
  [vehicle,{...sticker,engine:'2.0L I4 PHEV Engine'}],
  [vehicle,{...sticker,engine:'3.6L V6 24V VVT Engine'}],
  [vehicle,{...sticker,equipmentSectionComplete:false}],
  [vehicle,{...sticker,lines:sticker.lines.map(line=>line.replace('Package 22R','Package 22E'))}],
  [vehicle,{...sticker,lines:sticker.lines.filter(line=>!/^Customer Preferred Package/.test(line))}],
  [vehicle,{...sticker,lines:[...sticker.lines,'Whitecap Package']}],
 ])assert.equal(repairWranglerRoofEvidence(v,s),s,JSON.stringify([v.title,s.identityLines]));
});

test('A feature mention, hardtop accessory or conflicting option list cannot invent a roof replacement',()=>{
 const [vehicle,source]=byStock('J22412');
 for(const lines of [
  ['Black Sunrider Soft Top','Sky One-Touch Power-Top'],
  ['Black Sunrider Soft Top','OPTIONAL EQUIPMENT','Sky One-Touch Power-Top if equipped'],
  ['Black Sunrider Soft Top','OPTIONAL EQUIPMENT','Mopar Hardtop Headliner'],
  ['Black Sunrider Soft Top','OPTIONAL EQUIPMENT','Sky One-Touch Power-Top','Dual Top Group'],
  ['Black Sunrider Soft Top','OPTIONAL EQUIPMENT','Sky One-Touch Power-Top','Black 3-Piece Hard Top'],
  ['Black Sunrider Soft Top','OPTIONAL EQUIPMENT','Dual Top Group','No Soft Top'],
 ]){
  const sticker={...source,lines:[...lines,'Customer Preferred Package 22R']};
  assert.equal(repairWranglerRoofEvidence(vehicle,sticker),sticker,lines.join(' | '));
 }
});

test('Rejecting Sky keeps actual Nappa hardtop vehicles even without a soft-top deletion line',()=>{
 const catalog=JSON.parse(fs.readFileSync(new URL('./data/feature-photo-guide.json',import.meta.url)));
 const guide=createPhotoGuide(catalog,inventory,records),lineup=guide.lineups.find(lineup=>lineup.id==='wrangler');
 assert.ok(lineup);
 const found=guide.matches(lineup,{seats:'j22412-nappa',roof:'reject:j22412-skyroof'},0,'Both');
 for(const stock of ['J22331','J22561']){
  const [vehicle,sticker]=byStock(stock);
  assert.ok(!sticker.lines.some(line=>/^No Soft Top$/i.test(line)));
  assert.ok(found.some(candidate=>candidate.vin===vehicle.vin),stock);
  const result=repairWranglerRoofEvidence(vehicle,sticker);
  assert.equal(result.features.hardTop.value,true);
  assert.equal(result.features.skyRoof.value,false);
  assert.deepEqual(result.features.softTop,sticker.features.softTop,'the hardtop alone does not settle whether a separate soft top was supplied');
 }
 assert.ok(!found.some(vehicle=>['J22412','J22427'].includes(vehicle.stock)));
});

test('The printed Jeep slogan does not hide a verified Sport S roof configuration',()=>{
 const [vehicle,sticker]=byStock('J19530');
 assert.match(sticker.identityLines.join(' '),/THERE'S ONLY ONE/);
 const result=repairWranglerRoofEvidence(vehicle,sticker);
 assert.equal(result.features.hardTop.value,true);
 assert.equal(result.features.softTop.value,false);
 assert.equal(result.features.skyRoof.value,false);
});
