import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyGrandCherokeeAnswers,grandCherokeeConfiguration} from './gc-equipment-answers.mjs';
import {withComparisonSpecifications} from './comparison-specs.mjs';

const read=f=>JSON.parse(readFileSync(new URL(f,import.meta.url),'utf8'));
const inventory=read('./data/used-inventory.json'),equipment=read('./data/equipment-index.json');
function example(stock){const v=inventory.vehicles.find(v=>v.stock===stock);return {v,s:equipment.records[v.vin]};}

test('base V6 Laredo gains reviewed standard facts without inheriting the Altitude configuration',()=>{
 const {v,s}=example('J22581'),r=applyGrandCherokeeAnswers(v,s);
 assert.equal(grandCherokeeConfiguration(v,s).variant,'base-v6');
 for(const id of ['pushStart','bluetooth','wifi','pedestrianBrake','tintedWindows','ledLights','backupCamera','passiveEntry'])assert.equal(r.features[id]?.value,true,id);
 assert.equal(r.features.fuelTankCapacity.displayValue,'23 gallons');
 assert.equal(r.features.powerPassenger.value,false,'the sticker explicitly identifies a manual passenger seat');
 for(const id of ['navigation','heatedSeats','heatedWheel','remoteStart','powerLiftgate','sunroof','panoramic','wireless'])assert.equal(r.features[id],undefined,id+' is not borrowed from Laredo Altitude');
 const specs=withComparisonSpecifications(v,r).features;
 assert.equal(specs.infotainmentScreen.displayValue,'8.4 inches');
 assert.equal(specs.seatUpholstery.displayValue,'Cloth Seats');
 assert.match(specs.engineSpecification.displayValue,/3\.6L V6/);
});

test('refreshed Limited and Summit receive their own equipment and exact specifications',()=>{
 const l=example('J22138'),limited=applyGrandCherokeeAnswers(l.v,l.s);
 assert.equal(grandCherokeeConfiguration(l.v,l.s).variant,'refreshed-hurricane');
 assert.equal(limited.features.outlet.value,true);
 assert.equal(limited.features.fuelTankCapacity.displayValue,'23 gallons');
 assert.equal(limited.features.backupCamera.value,true);
 assert.equal(limited.features.driverAdjustment,undefined,'Limited is not given Summit’s 12-way driver seat');
 const t=example('J22560'),summit=applyGrandCherokeeAnswers(t.v,t.s);
 assert.equal(summit.features.driverAdjustment.displayValue,'12-way power');
 assert.equal(summit.features.instrumentScreen.displayValue,'10.25 inches');
 assert.equal(summit.features.digitalMirror.displayValue,'Digital rear-view mirror');
 assert.equal(summit.features.digitalMirror.method,'sticker-specification');
 assert.deepEqual(summit.features.digitalMirror.evidence,['Digital Auto-Dimming Rear-View Mirror']);
 const specs=withComparisonSpecifications(t.v,summit).features;
 assert.equal(specs.infotainmentScreen.displayValue,'12.3 inches');
 assert.equal(specs.seatUpholstery.displayValue,'Palermo Leather Seats');
});

test('facts cannot cross VIN, fingerprint, year, body, powertrain or package boundaries',()=>{
 const {v,s}=example('J22581');
 const variants=[
  {...s,vin:'OTHER'}, {...s,sha256:'OTHER'}, {...s,equipmentSectionComplete:false},
  {...s,status:'unavailable'}, {...s,identityLines:['2027 MODEL YEAR','GRAND CHEROKEE LAREDO 4X2']},
  {...s,identityLines:['2026 MODEL YEAR','GRAND CHEROKEE L LAREDO 4X2']},
  {...s,identityLines:['2026 MODEL YEAR','GRAND CHEROKEE 4XE 4X4']},
  {...s,identityLines:['2026 MODEL YEAR','GRAND CHEROKEE LAREDO ALTITUDE 4X2']},
  {...s,engine:'Engine: 2.0L Hurricane 4 Turbo Engine with Stop / Start'},
  {...s,lines:s.lines.map(l=>l.replace('Package 22D','Package 22J'))},
  {...s,lines:[...s.lines,'Customer Preferred Package 2BB']},
  {...s,lines:s.lines.map(l=>l.replace('8.4-Inch','12.3-Inch'))},
  {...s,lines:[...s.lines,'Equipment Delete']}
 ];
 for(const invalid of variants){assert.equal(grandCherokeeConfiguration(v,invalid),null);assert.equal(applyGrandCherokeeAnswers(v,invalid),invalid);}
 const l=example('J22138');
 assert.equal(grandCherokeeConfiguration(l.v,{...l.s,engine:s.engine}),null,'old V6 Limited cannot receive refreshed facts');
 assert.equal(grandCherokeeConfiguration(l.v,{...l.s,lines:l.s.lines.map(l=>l.replace('Package 2BE','Package 2BR'))}),null,'Reserve is a separate configuration');
});

test('explicit installed facts and replacement specifications always win',()=>{
 const {v,s}=example('J22560');
 const explicit={...s,features:{...s.features,ledLights:{value:false,evidence:['Explicit deletion already resolved']},driverAdjustment:{value:true,displayValue:'Other confirmed adjustment'},fuelTankCapacity:{value:true,displayValue:'Other confirmed tank'},digitalMirror:{value:false}}};
 const r=applyGrandCherokeeAnswers(v,explicit);
 for(const id of ['ledLights','driverAdjustment','fuelTankCapacity','digitalMirror'])assert.equal(r.features[id],explicit.features[id],id);
});

test('a power passenger-seat replacement blocks the Laredo manual-seat exclusion',()=>{
 const {v,s}=example('J22581');
 const upgraded={...s,lines:[...s.lines,'8-Way Power Adjustable Front Passenger Seat']};
 assert.equal(applyGrandCherokeeAnswers(v,upgraded).features.powerPassenger,undefined);
 const noManual={...s,lines:s.lines.filter(l=>!/4-Way Manual Adjustable/.test(l))};
 assert.equal(applyGrandCherokeeAnswers(v,noManual).features.powerPassenger,undefined,'an absent printed seat is not a negative answer');
});

test('the resolver is repeatable, preserves source rows, and does not modify saved records',()=>{
 const {v,s}=example('J22581'),snapshot=JSON.stringify(s),first=applyGrandCherokeeAnswers(v,s),second=applyGrandCherokeeAnswers(v,first);
 assert.deepEqual(second,first);assert.equal(JSON.stringify(s),snapshot);
 assert.equal(first.features.pushStart.sourceCode,'GX4');
 assert.match(first.features.pushStart.sourceUrl,/447472\/#page=20$/);
 assert.match(first.features.pushStart.evidence.join(' '),/WLTH74/);
 assert.equal(first.features.tintedWindows.sourceCode,'GEG');
});
