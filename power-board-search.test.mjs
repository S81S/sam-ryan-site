import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseQuery,matchVehicle} from './equipment-search.mjs';
import {searchDictionary} from './search-dictionary.mjs';

const {vehicles}=JSON.parse(fs.readFileSync(new URL('./data/used-inventory.json',import.meta.url)));
const {records}=JSON.parse(fs.readFileSync(new URL('./data/equipment-index.json',import.meta.url)));
const phrases=searchDictionary.find(g=>g.canonical==='featuretokenpowerboards').phrases;
const intent=input=>{const {original,...parsed}=parseQuery(input);return parsed;};
const results=input=>vehicles.map(v=>[v.vin,matchVehicle(v,records[v.vin],parseQuery(input)).kind]);

test('electric side steps and running boards request powered boards without requiring an EV',()=>{
 const expected=intent('power running boards');
 assert.deepEqual(expected.requirements,[{id:'powerBoards',wanted:true}]);
 assert.deepEqual(expected.terms,[]);
 for(const phrase of phrases)assert.deepEqual(intent(phrase),expected,phrase);
 for(const phrase of ['ELECTRIC SIDE STEP','electric side‑steps','electric running‑boards'])assert.deepEqual(intent(phrase),expected,phrase);
 assert.deepEqual(parseQuery('electric truck').requirements,[{id:'electric',wanted:true}]);
 assert.deepEqual(parseQuery('running boards').requirements,[{id:'runningBoards',wanted:true}]);
});
test('reported phrases return exactly the same populated inventory as power running boards',()=>{
 const expected=results('power running boards');
 assert.ok(expected.some(([,kind])=>kind==='match'));
 for(const phrase of ['electric side step','electric running boards','electric side steps','retractable running boards','power side steps'])assert.deepEqual(results(phrase),expected,phrase);
});
test('powered board synonyms preserve exclusions, model and other requirements',()=>{
 for(const phrase of phrases){
  assert.deepEqual(intent('without '+phrase),intent('without power running boards'),phrase);
  assert.deepEqual(intent('used Ram 1500 with '+phrase+' under $60k'),intent('used Ram 1500 with power running boards under $60k'),phrase);
 }
});
