import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyFactoryEquipment,equipmentStatus} from './factory-equipment.mjs';
import {withComparisonSpecifications,installedMirrorFoldingFact,specificationDefinitions} from './comparison-specs.mjs';
import {comparisonRows} from './comparison-rows.mjs';
import {guideTrim,guideFeatureFacts} from './trim-link.mjs';
import {comparisonFactoryChart,reviewedComparisonGuide} from './trim-confirmation.mjs';
import {equipmentReviewReason} from './equipment-review.mjs';
import {definitions,parseQuery,matchVehicle} from './equipment-search.mjs';

const read=f=>JSON.parse(readFileSync(new URL(f,import.meta.url),'utf8'));
const inventory=read('./data/used-inventory.json'),equipment=read('./data/equipment-index.json'),trims=read('./trim-standard-data.json'),factory=read('./data/factory/index.json');
function review(stock){
 const vehicle=inventory.vehicles.find(v=>v.stock===stock),original=equipment.records[vehicle.vin];
 const sticker=withComparisonSpecifications(vehicle,applyFactoryEquipment(vehicle,original)),match=guideTrim(vehicle,sticker,trims);
 const meta=comparisonFactoryChart(match,vehicle,sticker,factory),entry=read('./data/factory/'+meta.file),guide=reviewedComparisonGuide(match,vehicle,sticker,entry);
 const rows=comparisonRows([...specificationDefinitions,...definitions],[sticker],[],[guide]);
 return {vehicle,original,sticker,match,entry,guide,fact:id=>rows.find(r=>r.id===id)?.facts[0]};
}

test('R12500 resolves factory equipment, manual folding and Crew Cab specifications',()=>{
 const r=review('R12500');
 for(const id of ['ledLights','fogLights','keylessEntry'])assert.equal(r.fact(id)?.value,true,id);
 for(const id of ['wireless','garageOpener','foldMirrors','powerDriver','powerPassenger','memorySeats','passiveEntry','adjustPedals','sunroof','panoramic'])assert.equal(r.fact(id)?.value,false,id);
 assert.equal(r.fact('audioSystem').displayValue,'6 speakers');
 for(const id of ['driverAdjustment','passengerAdjustment'])assert.equal(r.fact(id).displayValue,'Manual adjustment','do not invent a number of adjustment ways');
 for(const id of ['ledLights','fogLights','keylessEntry','wireless','garageOpener','driverAdjustment','passengerAdjustment','audioSystem'])assert.match(r.fact(id).sourceUrl,/26DOMMOP_FBG_RamHD/);
 assert.match(equipmentStatus(r.fact('wireless')),/Not offered/);
 assert.equal(matchVehicle(r.vehicle,r.original,parseQuery('Ram 3500 with LED headlights')).kind,'match','shared search resolver has the same standard feature');
 assert.equal(matchVehicle(r.vehicle,r.original,parseQuery('Ram 3500 with power folding mirrors')).kind,'excluded');
});

test('R12315 uses standard Laramie facts while preserving its installed screen and audio upgrades',()=>{
 const r=review('R12315');
 for(const id of ['passiveEntry','slidingWindow','outlet'])assert.equal(r.fact(id)?.value,true,id);
 assert.equal(r.fact('powerInverter').displayValue,'400 W inverter');
 assert.equal(r.fact('infotainmentScreen').displayValue,'14.4 inches','factory 14.5-inch wording cannot overwrite the VIN sticker');
 assert.match(r.fact('audioSystem').displayValue,/19.*Harman/i);
 assert.equal(r.fact('alpine').value,false,'the replaced base audio is not added back');
});

test('C02225 factory facts resolve high beams, lumbar, cluster and fuel capacity',()=>{
 const r=review('C02225');
 for(const id of ['autoHighBeam','lumbar'])assert.equal(r.fact(id)?.value,true,id);
 assert.equal(r.fact('instrumentScreen').displayValue,'7 inches');
 assert.equal(r.fact('fuelTankCapacity').displayValue,'19 gallons');
 assert.equal(r.fact('panoramic').value,true,'the actual optional roof wins over contradictory factory cells');
 assert.match(r.fact('seatUpholstery').displayValue,/Caprice Leatherette/i);
});

test('a contradictory Select FamCAM package description neither confirms installation nor denies availability',()=>{
 const r=review('C02225');
 assert.equal(r.fact('familyCamera'),null);
 assert.equal(r.guide.facts.get('familyCamera').status,'verify');
 assert.match(equipmentReviewReason(r.original,r.vehicle.vin,{guide:r.guide,feature:'familyCamera'}).title,/sources disagree/);
 const packageOnly={...r.original,lines:[...r.original.lines,'Uconnect Theater Family Group II'],features:{...r.original.features}};
 delete packageOnly.features.familyCamera;
 assert.equal(applyFactoryEquipment(r.vehicle,packageOnly).features.familyCamera,undefined);
 const explicit={...packageOnly,features:{...packageOnly.features,familyCamera:{value:true,evidence:['FamCAM Interior Camera']}}};
 assert.equal(applyFactoryEquipment(r.vehicle,explicit).features.familyCamera.value,true);
});

test('optional availability is not a false installed-equipment answer',()=>{
 const guide={name:'Example',facts:new Map([['feature',{status:'optional',label:'Feature',value:'Technology Group',sourceUrl:'https://example.test/factory'}]])};
 const s={vin:'A',status:'verified',equipmentSectionComplete:true,features:{}};
 const row=comparisonRows([['feature','Feature']],[s,s],[],[guide,guide])[0];
 assert.deepEqual(row.facts,[null,null]);assert.equal(row.group,'unknown');
 const reason=equipmentReviewReason(s,'A',{guide,feature:'feature'});
 assert.equal(reason.title,'Optional on Example');assert.match(reason.detail,/Technology Group/);
 const absent={...s,features:{feature:{value:false,method:'factory-option-omission',evidence:['Reviewed complete option section']}}};
 assert.equal(comparisonRows([['feature','Feature']],[absent],[],[guide])[0].facts[0].value,false,'independently proven omission stays absent');
});

test('factory specification fallback cannot replace actual specs or cross model/year/VIN boundaries',()=>{
 const r=review('C02225');
 const explicit={...r.sticker,features:{...r.sticker.features,instrumentScreen:{value:true,displayValue:'12 inches',comparisonValue:'12 inches'}}};
 const g=reviewedComparisonGuide(r.match,r.vehicle,explicit,r.entry);
 assert.equal(g.resolvedFacts.has('instrumentScreen'),false);
 assert.equal(reviewedComparisonGuide({...r.match,model:{...r.match.model,year:2027}},r.vehicle,r.sticker,r.entry).resolvedFacts.size,0);
 assert.equal(reviewedComparisonGuide(r.match,r.vehicle,{...r.sticker,vin:'another-vin'},r.entry).resolvedFacts.size,0);
 assert.equal(reviewedComparisonGuide(r.match,r.vehicle,r.sticker,{...r.entry,model:'chrysler-pacifica-hybrid'}).resolvedFacts.size,0);
 assert.equal(reviewedComparisonGuide(r.match,r.vehicle,r.sticker,{...r.entry,source:{...r.entry.source,title:'2027 Chrysler Pacifica'}}).resolvedFacts.size,0);
});

test('Crew Cab audio is not copied to Regular Cab, and manual seat proof requires the actual vinyl bench',()=>{
 const r=review('R12500');
 const regular={...r.sticker,identityLines:['2026 MODEL YEAR','RAM 3500 TRADESMAN REGULAR CAB 4X4']};
 assert.equal(reviewedComparisonGuide(r.match,r.vehicle,regular,r.entry).resolvedFacts.has('audioSystem'),false);
 const otherSeat={...r.sticker,features:{...r.sticker.features,seatUpholstery:{value:true,displayValue:'Leather bucket seats'}}};
 const g=reviewedComparisonGuide(r.match,r.vehicle,otherSeat,r.entry);
 assert.equal(g.resolvedFacts.has('driverAdjustment'),false);assert.equal(g.resolvedFacts.has('passengerAdjustment'),false);
 const incomplete={...r.sticker,equipmentSectionComplete:false};
 assert.equal(reviewedComparisonGuide(r.match,r.vehicle,incomplete,r.entry).resolvedFacts.has('audioSystem'),false);
});

test('manual-fold evidence differs from mirror adjustment, and an optional power-fold replacement wins',()=>{
 const v={vin:'M'},s={vin:'M',status:'verified',lines:['Pwr Adj Heated TT Mirrors w/ Manual Fold/Telescope'],features:{}};
 assert.equal(installedMirrorFoldingFact(v,s).value,false);
 assert.equal(installedMirrorFoldingFact(v,{...s,lines:['Power-Adjustable Heated Mirrors']}),null);
 assert.equal(installedMirrorFoldingFact(v,{...s,lines:[...s.lines,'OPTIONAL EQUIPMENT','Power-Heated Mirrors with Power Fold-Away']}).value,true);
 assert.equal(installedMirrorFoldingFact({vin:'wrong'},s),null);
 assert.equal(installedMirrorFoldingFact(v,{...s,lines:['Power-Folding Mirrors (if equipped)']}),null);
});

test('new standards require the factory resolver’s existing complete audited original',()=>{
 const r=review('R12500');
 for(const change of [{sha256:'different'},{equipmentSectionComplete:false}]){
  const s=applyFactoryEquipment(r.vehicle,{...r.original,...change});
  for(const id of ['ledLights','fogLights','wireless','garageOpener'])assert.equal(s.features[id],undefined,id);
 }
});

test('Tradesman unavailable features are checked against its available packages, not inferred from omitted sticker lines',()=>{
 const r=review('R12500'),facts=r.sticker.features;
 for(const id of ['powerDriver','powerPassenger','memorySeats','passiveEntry','adjustPedals','sunroof','panoramic']){
  assert.equal(facts[id].value,false,id);assert.equal(facts[id].method,'factory-unavailable',id);
 }
 assert.equal(facts.keylessEntry.value,true,'remote keyless entry remains standard while passive entry is unavailable');
 for(const id of ['laneAssist','rearCross','rainWipers','autoHighBeam','blindSpot','surroundCamera'])assert.notEqual(facts[id]?.method,'factory-unavailable',id+' is available through a reviewed optional package');
});

test('the next reviewed factory rows answer five actual equipment gaps',()=>{
 const hd=review('R12500'),ram=review('R12315'),van=review('C02225');
 assert.equal(hd.fact('towHooks').value,true);
 assert.equal(hd.fact('bedPower').displayValue,'115-volt bed outlet');
 assert.equal(ram.fact('tintedWindows').value,true);
 assert.equal(van.fact('tintedWindows').value,true);
 assert.equal(van.fact('audioSystem').displayValue,'6 speakers');
 assert.equal(matchVehicle(hd.vehicle,hd.original,parseQuery('Ram 3500 with tow hooks')).kind,'match');
 assert.equal(matchVehicle(ram.vehicle,ram.original,parseQuery('Ram 1500 with tinted windows')).kind,'match');
});

test('Laramie option answers retain dependencies without claiming that Level 2 installs them',()=>{
 const r=review('R12315');
 for(const id of ['digitalMirror','hud','handsFreeDriving','driverAlert','trafficSigns','bedPower']){
  assert.equal(r.guide.facts.get(id)?.status,'optional',id);
  assert.equal(r.fact(id),null,id+' is available, not proven installed');
  assert.match(equipmentReviewReason(r.original,r.vehicle.vin,{guide:r.guide,feature:id}).title,/Optional on Laramie/);
 }
 assert.match(r.guide.facts.get('digitalMirror').note,/Level 2.*Advanced Safety.*UBQ or UBW/);
 assert.match(r.guide.facts.get('handsFreeDriving').note,/Level 2 alone does not include/);
 const other=reviewedComparisonGuide({...r.match,trim:{...r.match.trim,id:'rebel',name:'Rebel'}},r.vehicle,r.sticker,r.entry);
 assert.doesNotMatch(other.facts.get('handsFreeDriving')?.note||'',/Laramie/,'Laramie prerequisites are not copied to another trim');
});

test('Select Group II provides real option answers while its FamCAM conflict stays unresolved',()=>{
 const r=review('C02225');
 for(const id of ['powerPassenger','passengerAdjustment','alpine','premiumAudio','outlet']){
  const f=r.guide.facts.get(id);
  assert.equal(f.status,'optional',id);
  assert.match(f.value,/Uconnect Theater Family Group II/);
  assert.match(f.sourceUrl,/2026-pacifica\.pdf#page=4/);
  assert.equal(r.fact(id),null,'availability does not mean the vehicle has '+id);
 }
 assert.equal(r.guide.facts.get('familyCamera').status,'verify');
});

test('Select base audio cannot overwrite an upgrade or survive an unreviewed option package',()=>{
 const r=review('C02225');
 for(const lines of [
  [...r.sticker.lines,'Uconnect Theater Family Group II'],
  [...r.sticker.lines,'13-Speaker Alpine Audio'],
  [...r.sticker.lines,'Uconnect 5 NAV with 10.1-Inch Display'],
  [...r.sticker.lines,'New Premium Package'],
  r.sticker.lines.filter(l=>!/^OPTIONAL EQUIPMENT/.test(l))
 ])assert.equal(reviewedComparisonGuide(r.match,r.vehicle,{...r.sticker,lines},r.entry).resolvedFacts.has('audioSystem'),false);
 const upgraded={...r.sticker,features:{...r.sticker.features,audioSystem:{value:true,displayValue:'13-Speaker Alpine Audio'}}};
 assert.equal(reviewedComparisonGuide(r.match,r.vehicle,upgraded,r.entry).resolvedFacts.has('audioSystem'),false);
 assert.equal(reviewedComparisonGuide(r.match,r.vehicle,{...r.sticker,features:{...r.sticker.features,premiumAudio:{value:true}}},r.entry).resolvedFacts.has('audioSystem'),false);
 assert.equal(reviewedComparisonGuide(r.match,r.vehicle,{...r.sticker,equipmentSectionComplete:false},r.entry).resolvedFacts.has('audioSystem'),false);
});

test('the HD outlet location requires the actual exterior outlet, not cabin power or a package guess',()=>{
 const r=review('R12500');
 const noExterior={...r.sticker,lines:r.sticker.lines.filter(l=>l!=='Exterior 115V AC Outlet')};
 assert.ok(noExterior.lines.some(l=>/115-Volt Auxiliary Front/.test(l)));
 assert.equal(reviewedComparisonGuide(r.match,r.vehicle,noExterior,r.entry).resolvedFacts.has('bedPower'),false);
 assert.equal(reviewedComparisonGuide(r.match,r.vehicle,{...r.sticker,lines:[...r.sticker.lines,'Pickup Box Delete']},r.entry).resolvedFacts.has('bedPower'),false);
 assert.equal(reviewedComparisonGuide(r.match,r.vehicle,{...r.sticker,sha256:'different'},r.entry).resolvedFacts.has('bedPower'),false);
});
