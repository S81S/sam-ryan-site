import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {collectInventoryMatches} from './inventory-matches.mjs';
import {matchVehicle,parseQuery} from './equipment-search.mjs';

const inventory=JSON.parse(fs.readFileSync(new URL('./data/used-inventory.json',import.meta.url)));
const {records}=JSON.parse(fs.readFileSync(new URL('./data/equipment-index.json',import.meta.url)));
test('batched evidence checks retain the exact verified search results',async()=>{
 const query=parseQuery('ram 1500 Harman Kardon');
 const expected=inventory.vehicles.filter(v=>matchVehicle(v,records[v.vin],query).kind==='match').map(v=>v.vin);
 let yields=0;
 const actual=await collectInventoryMatches(inventory.vehicles,records,query,{budgetMs:0,yieldControl:async()=>{yields++;}});
 assert.deepEqual(actual.matches.map(r=>r.vehicle.vin),expected);
 assert.equal(actual.matches.length,38);
 assert.equal(yields,inventory.vehicles.length);
});
test('a superseded search cannot publish its partially checked vehicles',async()=>{
 let current=true;
 const result=await collectInventoryMatches(inventory.vehicles,records,parseQuery(''),{
  budgetMs:0,isCurrent:()=>current,yieldControl:async()=>{current=false;},
 });
 assert.equal(result,null);
});
