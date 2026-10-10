import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseQuery,matchVehicle} from './equipment-search.mjs';
import {searchVehicles} from './compare-picker.mjs';
import {vehicleBodyTypes} from './vehicle-categories.mjs';

const {vehicles}=JSON.parse(fs.readFileSync(new URL('./data/used-inventory.json',import.meta.url)));
const {records}=JSON.parse(fs.readFileSync(new URL('./data/equipment-index.json',import.meta.url)));
const phrases=['three row','third row','3 row','3-row','three-row','third-row','3rd row','3rd-row','3row','3rdrow','three rows','3 rows','three row seating','third-row seats','three‑row','3–row'];
const intent=input=>{const {original,...parsed}=parseQuery(input);return parsed;};
const current=vehicles.filter(v=>!v.external&&v.status!=='not-observed');
const availability=query=>current.map(v=>({vin:v.vin,kind:matchVehicle(v,records[v.vin],parseQuery(query)).kind}));

test('written, ordinal, numeric and hyphenated third-row SUV searches have one intent',()=>{
 const expected=intent('third row suv');assert.equal(expected.bodyType,'suv');assert.deepEqual(expected.requirements,[{id:'thirdRow',wanted:true}]);assert.deepEqual(expected.terms,[]);
 for(const phrase of phrases)assert.deepEqual(intent(phrase+' SUV'),expected,phrase);
});
test('Find Your Car returns the same confirmed and unconfirmed vehicles for every third-row wording',()=>{
 const expected=availability('third row suv'),confirmed=expected.filter(v=>v.kind==='match');assert.ok(confirmed.length>0,'regression must compare populated results');
 for(const phrase of ['three row','three-row','3row','3 rows','third‑row'])assert.deepEqual(availability(phrase+' suv'),expected,phrase);
 for(const item of confirmed){const v=current.find(v=>v.vin===item.vin);assert.equal(vehicleBodyTypes(v,records[v.vin]).suv,true,'SUV restriction is preserved');}
});
test('Compare shows identical availability and first results for the equivalent queries in each condition',()=>{
 for(const condition of ['New','Used','Both']){
  const expected=searchVehicles(vehicles,'third row suv',condition,records);assert.ok(expected.total>0,condition);
  for(const phrase of ['three row','three-row','3row','3-row','three rows']){
   const result=searchVehicles(vehicles,phrase+' suv',condition,records);
   assert.equal(result.total,expected.total,condition+' '+phrase);assert.deepEqual(result.matches.map(v=>v.vin),expected.matches.map(v=>v.vin),condition+' '+phrase);
  }
 }
});
test('third-row synonyms preserve exclusion intent instead of adding a positive requirement',()=>{
 for(const prefix of ['no','without','without a','do not want'])for(const phrase of phrases){
  const q=parseQuery(prefix+' '+phrase+' suv');assert.equal(q.bodyType,'suv');assert.deepEqual(q.requirements,[{id:'thirdRow',wanted:false}],prefix+' '+phrase);assert.deepEqual(q.terms,[]);
 }
});
test('synonyms preserve the same model, condition, budget and other equipment requirements',()=>{
 const expected=intent('used Dodge Durango third row suv under $40k with heated seats');
 assert.equal(expected.condition,'Used');assert.equal(expected.budget,40000);assert.deepEqual(expected.terms,['dodge','durango']);assert.ok(expected.requirements.some(r=>r.id==='heatedSeats'));
 for(const phrase of phrases)assert.deepEqual(intent('used Dodge Durango '+phrase+' suv under $40k with heated seats'),expected,phrase);
});
test('unrelated numbers, seating rows and words are not broadened into a third-row request',()=>{
 for(const query of ['two row suv','2-row suv','three zone climate control suv','third owner suv','3 inch lift suv','three rowboat'])assert.ok(!parseQuery(query).requirements.some(r=>r.id==='thirdRow'),query);
});
