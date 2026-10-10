import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {wranglerConfigurationEvidence} from './buyer-configuration-evidence.mjs';
const lineup={modelId:'wrangler',year:2026};
const fact=text=>({section:'ENGINES / TRANSMISSIONS',text,parent:''});
const manual=fact('Pentastar 3.6-liter V-6 / Six-speed manual'),automatic=fact('2.0-liter inline four-cylinder / Eight-speed automatic'),v8=fact('6.4-liter V-8 / Eight-speed automatic');
const record=(engine='3.6L V6 24V VVT Engine with Stop/Start',transmission='6-Speed Manual Transmission')=>({vin:'TEST',status:'verified',lines:[...(engine?['Engine: '+engine]:[]),...(transmission?['Transmission: '+transmission]:[])]});
const resolve=(choice,sticker)=>wranglerConfigurationEvidence(lineup,choice,sticker);

test('Wrangler factory bundles require the exact engine and transmission together',()=>{
 assert.equal(resolve(manual,record()).has,true);
 assert.equal(resolve(manual,record(undefined,'8-Speed Automatic 850RE Transmission')).has,false);
 assert.equal(resolve(automatic,record('2.0L I4 DOHC DI Turbo Engine with Stop/Start','8-Speed Automatic 850RE Transmission')).has,true);
 assert.equal(resolve(automatic,record('2.0L V4 Turbo Engine','8-Speed Automatic')).has,false);
 assert.equal(resolve(automatic,record('3.6L V6 Engine','8-Speed Automatic')).has,false);
 assert.equal(resolve(v8,record('6.4L V8 SRT HEMI Engine','8-Speed Automatic 8HP75 Transmission')).has,true);
 assert.equal(resolve(v8,record('5.7L V8 HEMI Engine','8-Speed Automatic')).has,false);
});

test('Missing, incomplete or contradictory original specifications remain unknown',()=>{
 for(const sticker of [record(undefined,null),record(null,'6-Speed Manual'),record('3.6L Engine'),record(undefined,'Manual Transmission'),record(undefined,'6-Speed Transmission'),record('3.6L V6 or 2.0L I4 Turbo'),record(undefined,'6-Speed Manual / 8-Speed Automatic'),record('3.6L V6 2.0L I4 Engine'),{...record(),status:'unavailable'},{...record(),lines:[null]}, {...record(),lines:[...record().lines,'Engine: 2.0L I4 Turbo Engine']}])assert.equal(resolve(manual,sticker),null,JSON.stringify(sticker));
 assert.equal(resolve(automatic,record('2.0L I4 Turbo PHEV Engine','8-Speed Automatic')),null);
});

test('Stated turbo, stop/start and extra bundle conditions are never silently dropped',()=>{
 const turbo={key:'automatic-powertrain-options',value:'2.0L turbo I4 or 3.6L V6 / 8-speed automatic'};
 assert.equal(resolve(turbo,record('2.0L I4 Turbo Engine','8-Speed Automatic')).has,true);
 assert.equal(resolve(turbo,record('2.0L I4 Engine','8-Speed Automatic')),null);
 assert.equal(resolve(turbo,record(undefined,'8-Speed Automatic')).has,true);
 assert.equal(resolve(turbo,record(undefined,'6-Speed Manual')).has,false);
 assert.equal(resolve({...turbo,benefit:'The automatic configuration includes 35-inch tires and full-time Rock-Trac 4:1.'},record(undefined,'8-Speed Automatic')),null);
 assert.equal(resolve({...turbo,value:turbo.value+'; includes 35-inch tires'},record(undefined,'8-Speed Automatic')),null);
 assert.equal(resolve({key:'engine',value:'3.6L V6 with stop/start'},record('3.6L V6 Engine')),null);
 assert.equal(resolve({key:'engine',value:'6.4L HEMI V8; 470 hp'},record('6.4L HEMI V8 Engine')),null);
});

test('Standalone engine and transmission facts use only the specification they state',()=>{
 assert.equal(resolve({key:'engine',value:'3.6L V6'},record(undefined,null)).has,true);
 assert.equal(resolve({key:'gearbox',value:'6-speed manual'},record(null)).has,true);
 assert.equal(resolve({key:'gearbox',value:'6-speed manual'},record(null,'8-Speed Automatic')).has,false);
 for(const scope of [{...lineup,year:2027},{...lineup,modelId:'ram-1500'},{...lineup,modelId:'jeep-wrangler-4xe'}])assert.equal(wranglerConfigurationEvidence(scope,manual,record()),null);
 assert.equal(resolve({...manual,parent:'Package'},record()),null);
});

test('Current 2026 Wrangler VIN engine/transmission lines resolve automatic fours and reject V6/manual bundles on automatics',()=>{
 const read=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url)));
 const inventory=read('./data/used-inventory.json').vehicles,records=read('./data/equipment-index.json').records;
 let four=0,six=0;
 for(const v of inventory.filter(v=>v.year===2026&&/WRANGLER (?:4-DOOR|2-DOOR|UNLIMITED)/i.test(v.title)&&!/4xe/i.test(v.title))){
  const r=records[v.vin];if(r?.status!=='verified')continue;
  const engine=r.lines.find(l=>/^Engine:/i.test(l)),transmission=r.lines.find(l=>/^Transmission:/i.test(l));
  if(!/8-Speed Automatic/i.test(transmission||''))continue;
  if(/2\.0L I4.*Turbo/i.test(engine||'')){const answer=resolve(automatic,r);assert.equal(answer?.has,true,v.stock);assert.deepEqual(answer.evidence,[engine,transmission]);four++;}
  if(/3\.6L V6/i.test(engine||'')){assert.equal(resolve(manual,r)?.has,false,v.stock);six++;}
 }
 assert.ok(four>0);assert.ok(six>0);
});
