import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {searchVehicles} from './compare-picker.mjs';
import {matchVehicle,parseQuery} from './equipment-search.mjs';

const {vehicles}=JSON.parse(fs.readFileSync(new URL('./data/used-inventory.json',import.meta.url)));
const {records}=JSON.parse(fs.readFileSync(new URL('./data/equipment-index.json',import.meta.url)));
for(const query of ['ram 1500 Harman Kardon','truck under $60k','white ram diesel','GT exhaust','used grand cherokee v8']) {
 test(`Compare uses Find Your Car matching: ${query}`,()=>{
  const parsed=parseQuery(query);
  const expected=vehicles.filter(v=>!v.external&&v.status!=='not-observed'&&matchVehicle(v,records[v.vin],parsed).kind==='match');
  const result=searchVehicles(vehicles,query,'Both',records);
  assert.equal(result.total,expected.length);
  assert.ok(result.matches.every(v=>expected.some(e=>e.vin===v.vin)));
 });
}
test('Explicit used searches override the initial new vehicle filter',()=>{
 const result=searchVehicles(vehicles,'used','New',records);
 assert.ok(result.total>0);
 assert.ok(result.matches.every(v=>v.condition==='Used'));
});
test('An explicit new or used search overrides a single-condition browsing filter',()=>{
 const expected=searchVehicles(vehicles,'new or used Ram 1500','Both',records);
 assert.equal(searchVehicles(vehicles,'new or used Ram 1500','New',records).total,expected.total);
 assert.equal(searchVehicles(vehicles,'new or used Ram 1500','Used',records).total,expected.total);
});
test('Exact stock search still finds R12500',()=>{
 const result=searchVehicles(vehicles,'R12500','New',records);
 assert.equal(result.total,1);
 assert.equal(result.matches[0].vin,'3C63RRGL5TG354434');
});

test('Exact used stock and VIN searches work with the initial New filter',()=>{
 const used=vehicles.find(v=>v.condition==='Used'&&v.stock&&v.status!=='not-observed');
 for(const query of [used.stock.toLowerCase(),used.vin,used.stock.split('').join(' ')]) {
  const result=searchVehicles(vehicles,query,'New',records);
  assert.equal(result.total,1);
  assert.equal(result.matches[0].vin,used.vin);
 }
});

test('Exact searches never present removed or outside vehicles as current inventory',()=>{
 const v=vehicles.find(v=>v.stock);
 assert.equal(searchVehicles([{...v,status:'not-observed'}],v.stock,'Both',records).total,0);
 assert.equal(searchVehicles([{...v,external:true}],v.vin,'Both',records).total,0);
});
