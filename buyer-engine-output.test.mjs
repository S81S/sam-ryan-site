import test from 'node:test';
import assert from 'node:assert/strict';
import {buyerEngineOutput} from './buyer-engine-output.mjs';
const output=(model,label,year=2026)=>buyerEngineOutput({id:model,year},{model,year,label,feature:'engineSpecification',value:label},{id:'options-engine'});
test('output belongs to the exact model, year and engine variant',()=>{
 assert.equal(output('wrangler','2.0L turbo I4').horsepower,270);
 assert.equal(output('jeep-grand-cherokee','2.0L Hurricane 4 Turbo').horsepower,324);
 assert.equal(output('jeep-compass','2.0L turbo I4').horsepower,200);
 assert.equal(output('ram-1500','3.0L Hurricane SO').horsepower,420);
 assert.equal(output('ram-1500','3.0L Hurricane HO').horsepower,540);
 assert.equal(output('ram-1500','3.0L Hurricane'),null,'unqualified output variant is not guessed');
 assert.equal(output('ram-1500','3.0L Hurricane HO',2027),null,'a prior-year rating is not inherited');
 assert.equal(output('wrangler','2.0L or 3.6L'),null,'one power rating cannot describe different engines');
 assert.equal(output('ram-3500','6.7L Cummins HO').torqueLbFt,1075);
 assert.equal(output('ram-chassis-cab','6.7L Cummins').torqueLbFt,800);
});
test('hybrid system power and manufacturer source disagreement remain explicit',()=>{
 const hybrid=output('jeep-cherokee','1.6L turbo hybrid');assert.equal(hybrid.horsepower,210);assert.equal(hybrid.engineOnly.horsepower,177);
 const phev=output('chrysler-pacifica-hybrid','3.6L PHEV');assert.equal(phev.horsepower,260);assert.equal(phev.torqueLbFt,null);
 assert.match(output('ram-1500','3.6L Pentastar eTorque').note,/271.*269/);
 assert.equal(output('chrysler-pacifica','3.6L PHEV'),null);
});

import fs from 'node:fs';
import {buyerModels,buyerLineup} from './buyer-catalog.mjs';
import {buildBuyerOptionGroups} from './buyer-option-groups.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url))),index=read('./data/factory/index.json');
const models=buyerModels(read('./trim-standard-data.json'),index);
const catalogModel=id=>{const m=models.find(m=>m.id===id);return buyerLineup(m,m.meta?read('./data/factory/'+m.meta.file):null);};
test('actual catalog engine cards resolve exact published ratings, with one documented transmission exception',()=>{
 const pending=[];let checked=0;
 for(const m of models){const l=catalogModel(m.id),g=buildBuyerOptionGroups(l).find(g=>g.id==='options-engine');for(const c of g?.guideChoices||g?.choices||[]){const o=buyerEngineOutput(l,c,g);if(!o)pending.push(m.id+':'+c.id);else{checked++;assert.ok(o.sourceUrl.startsWith('https://'),c.id);assert.ok(Number.isFinite(o.horsepower),c.id);assert.ok(o.torqueLbFt===null||Number.isFinite(o.torqueLbFt),c.id);}}}
 assert.deepEqual(pending,['ram-chassis-cab-2027:f3h5uoh'],'The 2027 8HP75 bundle has no confirmed rating; HD-transmission output cannot be inherited.');
 assert.equal(checked,90);
});
test('year changes and pickup, van, chassis-cab and muscle-truck calibrations stay distinct',()=>{
 assert.equal(output('ram-1500-rumble-bee-2027','6.4L HEMI V8',2027).torqueLbFt,455);
 assert.equal(output('wrangler-2027','6.4L HEMI V8',2027).torqueLbFt,470);
 assert.equal(output('ram-chassis-cab-2027','6.4L HEMI V8 TorqueFlite HD',2027).horsepower,375);
 assert.equal(output('ram-chassis-cab','6.4L HEMI V8 TorqueFlite HD').horsepower,370);
 assert.equal(output('ram-promaster-city-2027','1.6L turbo I4',2027).horsepower,166);
 assert.equal(output('ram-1500-2027','3.0L Hurricane SO',2027).horsepower,420);
 assert.equal(output('dodge-charger-gas-2027','3.0L SIXPACK HO',2027).horsepower,550);
 assert.equal(output('chrysler-voyager','3.6L Pentastar').horsepower,287);
});
test('older broad engine preferences keep trim, transmission and fuel distinctions visible',()=>{
 const l=catalogModel('chrysler-300'),g={id:'options-engine'},c=l.choices.get('fgjmmjo');
 assert.equal(buyerEngineOutput(l,c,g).display,'292–300 hp · 260–264 lb-ft');
 assert.equal(buyerEngineOutput(l,c,g,'300s').horsepower,300);
 assert.equal(buyerEngineOutput(l,c,g,'touring').horsepower,292);
 const ch=catalogModel('dodge-challenger');
 assert.equal(buyerEngineOutput(ch,ch.choices.get('ftha927'),g).display,'372–375 hp · 400–410 lb-ft');
 const demon=buyerEngineOutput(ch,ch.choices.get('fm5e37c'),g,'srt-demon-170');
 assert.equal(demon.display,'900–1025 hp · 810–945 lb-ft');assert.match(demon.note,/E85.*1025.*E10.*900/);
 assert.equal(buyerEngineOutput(ch,ch.choices.get('fm5e37c'),g,'srt-hellcat-jailbreak').horsepower,717);
});
test('EV boost and development target figures retain their qualifications',()=>{
 const g={id:'options-engine'},d=catalogModel('dodge-charger-gas-2027');
 assert.equal(buyerEngineOutput(d,d.choices.get('f1wuio0z'),g).display,'600 hp target');
 const ev=output('dodge-charger-daytona','400V 250/250kW EDM');assert.match(ev.basis,/PowerShot/);assert.match(ev.note,/630.*670/);
 assert.equal(output('jeep-cherokee-2027','1.6L turbo hybrid',2027).torqueLbFt,null);
});
