import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {comparisonRows,visibleComparisonRows} from './comparison-rows.mjs';
import {installedAudioFact,repairInstalledAudioEvidence,audioInventoryFeature} from './audio-evidence.mjs';
import {parseQuery,matchVehicle,definitions} from './equipment-search.mjs';
import {applyFeatureFilter} from './feature-inventory-link.mjs';
import {withComparisonSpecifications} from './comparison-specs.mjs';
const vehicle={vin:'audio-test',title:'New 2026 RAM 1500 LARAMIE',condition:'New',price:1};
const sticker={vin:vehicle.vin,status:'verified',lines:['19-Speaker Harman Kardon Premium Sound','OPTIONAL EQUIPMENT','9-Speaker Alpine Audio'],features:{harman:{value:true},alpine:{value:true}}};
test('optional audio replaces the standard system for brand filtering and links',()=>{
 const s=repairInstalledAudioEvidence(vehicle,sticker);
 assert.equal(s.features.harman.value,false);assert.equal(s.features.alpine.value,true);
 assert.equal(audioInventoryFeature(installedAudioFact(vehicle,s)),'alpine');
 const q=applyFeatureFilter(parseQuery(''),'harman',definitions);
 assert.equal(matchVehicle(vehicle,sticker,q).kind,'excluded');
});
test('audio requires the selected VIN and does not guess a brand from generic speakers',()=>{
 assert.equal(installedAudioFact({vin:'another-vin'},sticker),null);
 const s=repairInstalledAudioEvidence(vehicle,{...sticker,lines:['9-Amplified Speakers with Subwoofer']});
 assert.equal(s.features.harman,undefined);assert.equal(s.features.alpine,undefined);
});
test('all confirmed equipment includes shared absences, while evidence gaps stay separate',()=>{
 const defs=[['same','Same'],['absent','Absent'],['different','Different'],['partial','Partial'],['missing','Missing']];
 const a={status:'verified',features:{same:{value:true},absent:{value:false},different:{value:true},partial:{value:true}}};
 const b={status:'verified',features:{same:{value:true},absent:{value:false},different:{value:false}}};
 const rows=comparisonRows(defs,[a,b]);
 assert.equal(visibleComparisonRows(rows,'complete').length,3);
 assert.equal(visibleComparisonRows(rows,'all').length,2);
 assert.equal(visibleComparisonRows(rows,'important').length,1);
 assert.equal(visibleComparisonRows(rows,'check').length,2);
 assert.equal(visibleComparisonRows(rows,'all','Different').length,0);
});
test('five-vehicle comparison preserves confirmed differences with a separate missing cell',()=>{
 const rows=comparisonRows([['feature','Feature']],[true,true,false,true,null].map(value=>({status:'verified',features:value===null?{}:{feature:{value}}})));
 assert.equal(rows[0].group,'difference');assert.equal(rows[0].facts[4],null);
 assert.equal(visibleComparisonRows(rows,'complete').length,1);
});
test('current Harman matches all have independent VIN-matched installed-brand evidence',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('./data/used-inventory.json',import.meta.url)));
 const index=JSON.parse(fs.readFileSync(new URL('./data/equipment-index.json',import.meta.url)));
 const query=applyFeatureFilter(parseQuery(''),'harman',definitions);query.condition='New';
 const matches=data.vehicles.filter(v=>matchVehicle(v,index.records[v.vin],query).kind==='match');
 assert.ok(matches.length>0);
 for(const v of matches)assert.match(installedAudioFact(v,index.records[v.vin])?.displayValue||'',/harman[ -]?kardon/i,v.stock);
 const v=data.vehicles.find(v=>v.stock==='R12315');
 const s=withComparisonSpecifications(v,index.records[v.vin]);
 assert.match(s.features.audioSystem.displayValue,/19-Speaker Harman/);
 assert.equal(s.features.infotainmentScreen.displayValue,'14.4 inches');
 assert.ok(s.features.engineSpecification);assert.ok(s.features.transmissionSpecification);
});
