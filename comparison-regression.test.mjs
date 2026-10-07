import {installedOptionFact,optionInventoryLink,optionFromParams} from './option-inventory.mjs';
import {equipmentRows} from './trim-comparison.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {comparisonRows,visibleComparisonRows} from './comparison-rows.mjs';
import {installedAudioFact,repairInstalledAudioEvidence,audioInventoryFeature} from './audio-evidence.mjs';
import {parseQuery,matchVehicle,definitions} from './equipment-search.mjs';
import {applyFeatureFilter} from './feature-inventory-link.mjs';
import {withComparisonSpecifications} from './comparison-specs.mjs';
import {applyFactoryEquipment} from './factory-equipment.mjs';
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
test('all confirmed equipment includes shared absences; a feature on one sticker only is a difference',()=>{
 const defs=[['same','Same'],['absent','Absent'],['different','Different'],['partial','Partial'],['missing','Missing']];
 const a={status:'verified',features:{same:{value:true},absent:{value:false},different:{value:true},partial:{value:true}}};
 const b={status:'verified',features:{same:{value:true},absent:{value:false},different:{value:false}}};
 const rows=comparisonRows(defs,[a,b]);
 assert.equal(visibleComparisonRows(rows,'complete').length,4);
 assert.equal(visibleComparisonRows(rows,'all').length,2);
 // "different" (one has it, one is stated not to) and "partial" (listed on one readable sticker only) are both differences.
 assert.deepEqual(visibleComparisonRows(rows,'important').map(r=>[r.id,r.group]),[['different','difference'],['partial','listed-on-some']]);
 assert.equal(visibleComparisonRows(rows,'check').length,0);
 // With no readable sticker for one vehicle, the same gap is still only an item to check.
 const unread=comparisonRows(defs,[a,{status:'unavailable',features:{}}]);
 assert.equal(unread.find(r=>r.id==='partial').group,'check');
 assert.equal(visibleComparisonRows(unread,'important').length,0);
 assert.equal(visibleComparisonRows(rows,'check','Missing').length,1);
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

test('trim differences include an optional upgrade offered on only one trim',()=>{
 const base={key:'audio',label:'Audio',status:'standard',value:'9 speakers'};
 const upgrade={key:'upgrade',upgradeOf:'audio',label:'Audio upgrade',status:'optional',value:'Harman Kardon 19 speakers'};
 const rows=equipmentRows([{comparison:[base,upgrade]},{comparison:[base]}]);
 assert.equal(rows[0].knownDifference,true);assert.equal(rows[0].kind,'different');
 const same=equipmentRows([{comparison:[base,upgrade]},{comparison:[base,upgrade]}]);
 assert.equal(same[0].knownDifference,false);assert.equal(same[0].kind,'shared');
});

test('optional/package links preserve the selected equipment and reject incompatible audio',()=>{
 const fact={key:'audio-upgrade',label:'Audio upgrade',value:'Harman Kardon 19 speakers'};
 const link=optionInventoryLink(fact,{modelTerms:['Ram 1500'],condition:'New',advisor:'Sam'});
 const params=new URL(link,'https://carswithsam.com').searchParams;
 assert.equal(params.get('q'),'Ram 1500');assert.deepEqual(optionFromParams(params),fact);
 assert.equal(installedOptionFact(vehicle,sticker,fact).value,false);
 const packageSticker={...sticker,features:{},lines:['OPTIONAL EQUIPMENT','Night Edition $2,995']};
 assert.equal(installedOptionFact(vehicle,packageSticker,{key:'night-edition',label:'Appearance option',value:'Night Edition'}).value,true);
 assert.equal(installedOptionFact({vin:'wrong-vin'},packageSticker,fact),null);
});

test('optional tow hooks and wireless charging use installed feature evidence, not package prose',()=>{
 const original={vin:vehicle.vin,status:'verified',features:{towHooks:{value:true,evidence:['Front Tow Hooks']},wireless:{value:true,evidence:['Wireless Charging Pad']}},lines:['Front Tow Hooks','Wireless Charging Pad']};
 assert.equal(installedOptionFact(vehicle,original,{key:'tow-hooks',label:'Front tow hooks',value:'Protection Group or Off-Road Group'}).value,true);
 assert.equal(installedOptionFact(vehicle,original,{key:'wireless-charging',label:'Wireless phone charging',value:'Single or dual charging pads with equipment group'}).value,true);
 assert.equal(installedOptionFact(vehicle,{...original,features:{}},{key:'wireless-charging',label:'Wireless phone charging',value:'Single or dual charging pads with equipment group'}),null);
});

test('selected equipment survives comparison links and advisor requests',async()=>{
 const {shoppingContext,comparisonLink,comparisonRequest}=await import('./shopping-context.mjs');
 const context=shoppingContext({getElementById:()=>null},'?q=Ram+1500&condition=New&option=audio-upgrade&optionLabel=Audio+upgrade&optionValue=Harman+Kardon+19+speakers');
 assert.match(context.requestedEquipment,/Harman Kardon/);
 const link=comparisonLink(['VIN-1'],context);
 const restored=shoppingContext({getElementById:()=>null},'?'+link.split('?')[1]);
 assert.equal(restored.requestedEquipment,context.requestedEquipment);
 assert.match(comparisonRequest([{title:'Truck',stock:'R1',vin:'VIN-1'}],restored),/Requested equipment: Audio upgrade: Harman Kardon 19 speakers/);
});

 test('screen upgrade matching uses installed size and does not equate different sizes',()=>{
 const s={vin:vehicle.vin,status:'verified',features:{},lines:['Uconnect 5 NAV with 8.4-Inch Display','OPTIONAL EQUIPMENT','Uconnect 5 NAV with 12.0-Inch Display']};
 const option={key:'touchscreen-upgrade',label:'Larger touchscreen option',value:'12-inch Uconnect 5 NAV'};
 assert.equal(installedOptionFact(vehicle,s,option).value,true);
 assert.equal(installedOptionFact(vehicle,s,{...option,value:'14.5-inch Uconnect'}).value,false);
 assert.equal(installedOptionFact(vehicle,{...s,lines:['Uconnect 5 NAV with 14.4-Inch Display']},{...option,value:'14.5-inch Uconnect'}),null);
 });
 test('a power tailgate release cannot match powered opening and closing',()=>{
 const option={key:'power-tailgate',label:'Power tailgate',value:'Power opening/closing available'};
 const s={vin:vehicle.vin,status:'verified',features:{},lines:['Power Tailgate Release']};
 assert.equal(installedOptionFact(vehicle,s,option).value,false);
 assert.equal(installedOptionFact(vehicle,{...s,lines:['Power Tailgate']},option).value,true);
 assert.equal(installedOptionFact(vehicle,{...s,lines:['Power Tailgate Lock']},option),null);
 assert.equal(withComparisonSpecifications(vehicle,{...s,lines:['Power Tailgate Lock']}).features.tailgateOperation,undefined);
 });

 test('winch-capable bumpers cannot prove an installed winch or its capacity',()=>{
 const option={key:'winch',label:'Winch',value:'Capability Group'};
 const s={vin:vehicle.vin,status:'verified',features:{},lines:['Winch-Capable Steel Front Bumper']};
 assert.equal(installedOptionFact(vehicle,s,option),null);
 assert.equal(installedOptionFact(vehicle,{...s,lines:['Warn Electric Front Winch']},option).value,true);
 assert.equal(installedOptionFact(vehicle,{...s,lines:['Warn Electric Front Winch']},{...option,value:'8,000-pound Warn option'}),null);
 });
 test('unconfirmed selected equipment includes its actual source limitation',()=>{
 const q=parseQuery('');q.equipmentOption={key:'touchscreen-upgrade',label:'Larger touchscreen',value:'12-inch Uconnect'};
 const v={...vehicle,locationId:'18393'};
 const s={vin:v.vin,status:'verified',features:{},lines:[]};
 assert.match(matchVehicle(v,s,q).checks[0].reason,/does not establish this exact configuration/);
 assert.match(matchVehicle(v,{...s,status:'unavailable'},q).checks[0].reason,/not available for review/);
 assert.match(matchVehicle(v,{...s,vin:'other'},q).checks[0].reason,/does not match this VIN/);
 });

 test('audio specifications preserve speaker count and optional replacement',()=>{
 const s={vin:vehicle.vin,status:'verified',features:{},lines:['6 Speakers','OPTIONAL EQUIPMENT','19-Speaker Harman Kardon Premium Sound']};
 const option={key:'audio',label:'Audio',value:'6 speakers'};
 assert.equal(installedOptionFact(vehicle,s,option).value,false);
 assert.equal(installedOptionFact(vehicle,s,{...option,value:'Harman Kardon 19 speakers'}).value,true);
 assert.equal(installedOptionFact(vehicle,s,{...option,value:'Harman Kardon 23 speakers'}).value,false);
 });
 test('seat adjustment links distinguish exact number of ways and operation',()=>{
 const s={vin:vehicle.vin,status:'verified',features:{},lines:['8-Way Power Driver Seat']};
 const option={key:'driver-seat',label:'Driver seat adjustment',value:'8-way power'};
 assert.equal(installedOptionFact(vehicle,s,option).value,true);
 assert.equal(installedOptionFact(vehicle,s,{...option,value:'12-way power'}).value,false);
 assert.equal(installedOptionFact(vehicle,s,{...option,value:'8-way manual'}).value,false);
 const withLumbar={...option,value:'8-way power; 4-way power lumbar'};
 assert.equal(installedOptionFact(vehicle,s,withLumbar),null);
 assert.equal(installedOptionFact(vehicle,{...s,lines:[...s.lines,'4-Way Power Driver Lumbar Adjust']},withLumbar).value,true);
 });

 test('optional powertrain matches its engine and transmission rather than guide phrasing',()=>{
 const s={vin:vehicle.vin,status:'verified',features:{},lines:['Engine: 6.7L I6 Cummins HO Turbo Diesel Engine','Transmission: 8-Speed Automatic']};
 const option={key:'diesel-upgrade',label:'Diesel option',value:'6.7L Cummins HO'};
 assert.equal(installedOptionFact(vehicle,s,option).value,true);
 assert.equal(installedOptionFact(vehicle,{...s,lines:['Engine: 6.7L I6 Cummins Turbo Diesel Engine']},option).value,false);
 const automatic={key:'automatic-powertrain-options',label:'Other factory powertrain configurations',value:'2.0L turbo I4 or 3.6L V6 / 8-speed automatic'};
 assert.equal(installedOptionFact(vehicle,{...s,lines:['Engine: 3.6L V6 Engine','Transmission: 8-Speed Automatic']},automatic).value,true);
 assert.equal(installedOptionFact(vehicle,{...s,lines:['Engine: 3.6L V6 Engine','Transmission: 6-Speed Manual']},automatic).value,false);
 });

 test('specification links use installed normalized values and source overrides',()=>{
 const s={vin:vehicle.vin,status:'verified',features:{},lines:['Uconnect 5 NAV with 8.4-Inch Display','OPTIONAL EQUIPMENT','Uconnect 5 NAV with 12-Inch Display']};
 const option={key:'comparison-infotainmentScreen',label:'Infotainment screen size',value:'12 inches'};
 assert.equal(installedOptionFact(vehicle,s,option).value,true);
 assert.equal(installedOptionFact(vehicle,s,{...option,value:'8.4 inches'}).value,false);
 });
test('a named edition is matched as one name, not as two loose words',()=>{
 const kind=(title,lines,text)=>{const v={vin:'edition-test',title,condition:'New',price:1,miles:5,locationId:'18393',locationVerified:true,status:'listed'};return matchVehicle(v,{vin:v.vin,status:'verified',lines,features:{}},parseQuery(text)).kind;};
 const night=['Night Edition','Rear-View Day / Night Mirror'],anniversary=['Jeep 85th Anniversary Edition','Rear-View Day / Night Mirror'];
 assert.equal(kind('New 2026 RAM 1500 LONE STAR',night,'Ram 1500 Night Edition'),'match');
 assert.equal(kind('New 2026 RAM 1500 LONE STAR',night,'night edition'),'match');
 // An 85th Anniversary Edition has a day/night mirror and the word "edition", but it is not a Night Edition.
 assert.equal(kind('New 2026 JEEP GRAND CHEROKEE 85TH ANNIVERSARY EDITION 4X4',anniversary,'night edition'),'excluded');
 assert.equal(kind('New 2026 JEEP GRAND CHEROKEE 85TH ANNIVERSARY EDITION 4X4',anniversary,'85th edition'),'match');
 assert.equal(kind('New 2026 JEEP GRAND CHEROKEE 85TH ANNIVERSARY EDITION 4X4',anniversary,'85th anniversary edition'),'match');
 // "Edition" after a name that is already in the title is how people talk, even when the title leaves the word out.
 assert.equal(kind('New 2026 RAM 1500 LONE STAR',['Rear-View Day / Night Mirror'],'lone star edition'),'match');
 assert.equal(kind('New 2026 RAM 1500 LONE STAR',['Rear-View Day / Night Mirror'],'night edition'),'excluded');
});
test('McKinley-trimmed seats count as leather-trimmed, as Jeep describes them',()=>{
 const pattern=definitions.find(d=>d[0]==='leather')[2];
 for(const line of ['Interior: McKinley-Trimmed Seats','Premium McKinley-Trimmed Seats','McKinley-Trimmed Seats $1,995','Leather-Trimmed Bucket Seats','Nappa Leather Seats','Interior: Alcantara / Nappa Performance Seats','Laguna Leather Seat with SRT Hellcat Logo','• LEATHER SEATING SURFACES','Leather Seat Trim','Leather-Trimmed 40 / 20 / 40 Bench Seat'])assert.ok(pattern.test(line),line);
 for(const line of ['Interior: Cloth Low-Back Bucket Seats','Leather-Wrapped Steering Wheel','Heavy-Duty Vinyl 40/20/40 Split Bench Seat','Capri Seats w/ Pattern','Mount McKinley Edition Badge','Capri Leatherette Seats','Nappa Leather Door Trim','Leather Flat-Bottom Steering Wheel','TechnoLeather Steering Wheel'])assert.ok(!pattern.test(line),line);
 const v={vin:'mckinley-test',title:'New 2026 JEEP WRANGLER 4-DOOR SAHARA',condition:'New',price:1,miles:5,locationId:'18393',locationVerified:true,status:'listed'};
 const lines=['Interior: McKinley-Trimmed Seats','Heated Front Seats'];
 const sticker={vin:v.vin,status:'verified',lines,features:{leather:{value:true,evidence:[lines[0]]}}};
 assert.equal(matchVehicle(v,sticker,parseQuery('new Wrangler sahara with leather seats')).kind,'match');
});
test('what the sticker states is an answer, not something left to confirm',()=>{
 const car=(title,lines,features={},identityLines=[])=>{const v={vin:'stated-test',title,condition:'New',price:1,miles:5,locationId:'18393',locationVerified:true,status:'listed'};return [v,{vin:v.vin,status:'verified',lines,features,identityLines}];};
 const kind=(pair,text)=>matchVehicle(pair[0],pair[1],parseQuery(text)).kind;
 // Cloth on the sticker is not leather (and leather is not cloth); a sticker that names neither stays unconfirmed.
 const cloth=car('New 2026 JEEP WRANGLER 4-DOOR SAHARA',['Interior: Cloth Low-Back Bucket Seats'],{cloth:{value:true,evidence:['Interior: Cloth Low-Back Bucket Seats']}});
 assert.equal(kind(cloth,'sahara with leather seats'),'excluded');
 assert.equal(kind(cloth,'sahara with cloth seats'),'match');
 assert.equal(kind(cloth,'sahara without leather'),'match');
 const leather=car('New 2026 RAM 1500 LARAMIE',['Interior: Leather-Trimmed Bucket Seats'],{leather:{value:true,evidence:['Interior: Leather-Trimmed Bucket Seats']}});
 assert.equal(kind(leather,'ram with cloth seats'),'excluded');
 // A named material of its own (Rewind, Capri, Natura, suede…) is neither leather nor cloth; a line naming no material settles nothing.
 assert.equal(kind(car('New 2027 JEEP REWIND',['Interior: Rewind Seat with Tag']),'leather seats'),'excluded');
 assert.equal(kind(car('New 2027 JEEP REWIND',['Interior: Rewind Seat with Tag']),'cloth seats'),'excluded');
 assert.equal(kind(car('New 2027 JEEP SPORT',['Interior: Low-Back Bucket Seats']),'leather seats'),'unknown');
 // 4x4, AWD and two-wheel drive are different things; go by what the sticker's model line calls the vehicle.
 const fourByFour=car('New 2026 RAM 1500 LARAMIE CREW CAB 4X4',['Heated Front Seats'],{},['2026 MODEL YEAR','RAM 1500 LARAMIE CREW CAB 4X4']);
 assert.equal(kind(fourByFour,'ram 4x4'),'match');
 assert.equal(kind(fourByFour,'ram awd'),'excluded');
 const awd=car('New 2026 DODGE DURANGO GT PLUS AWD',['All-Wheel Drive'],{awd:{value:true,evidence:['All-Wheel Drive']}},['2026 MODEL YEAR','DURANGO GT PLUS AWD']);
 assert.equal(kind(awd,'durango awd'),'match');
 assert.equal(kind(awd,'durango 4wd'),'excluded');
 const twoWheel=car('New 2026 RAM 1500 LONE STAR CREW CAB 4X2',['Heated Front Seats'],{},['2026 MODEL YEAR','RAM 1500 LONE STAR CREW CAB 4X2']);
 assert.equal(kind(twoWheel,'ram 4x4'),'excluded');
 assert.equal(kind(twoWheel,'ram awd'),'excluded');
 // No sticker on file: nothing is claimed either way.
 const [v]=car('New 2027 JEEP SAHARA',[]);
 assert.equal(matchVehicle(v,{vin:v.vin,status:'unavailable',lines:[],features:{}},parseQuery('sahara 4x4')).kind,'unknown');
});

// The vehicle comparison and the Compare Trims page read the same factory trim guide.
import {guideTrim,guideDifferences,guideFeatureFacts,guideLink} from './trim-link.mjs';
const trimGuideData=JSON.parse(fs.readFileSync(new URL('./trim-standard-data.json',import.meta.url),'utf8'));
const stickerFor=(vin,model,extra={})=>({status:'verified',vin,identityLines:['2026 MODEL YEAR',model],lines:[],features:{},...extra});
test('a vehicle is matched to its own trim guide column from the sticker model line',()=>{
 const match=(model,title='New 2026 TRUCK')=>{const m=guideTrim({vin:'V',title},stickerFor('V',model),trimGuideData);return m&&[m.model.id,m.trim.id,m.variant];};
 assert.deepEqual(match('RAM 1500 LARAMIE CREW CAB 4X4'),['ram-1500','laramie','']);
 assert.deepEqual(match('RAM 1500 LONE STAR CREW CAB 4X2'),['ram-1500','big-horn-lone-star','']);
 assert.deepEqual(match('RAM 1500 LONGHORN CREW CAB 4X4'),['ram-1500','limited-longhorn','']);
 assert.deepEqual(match('RAM 2500 LARAMIE NIGHT CREW CAB 4X4'),['ram-2500','laramie','NIGHT']);
 assert.deepEqual(match('WRANGLER 4-DOOR RUBICON X 4X4'),['wrangler','rubicon-x','']);
 assert.deepEqual(match('WRANGLER 2-DOOR SPORT 4X4'),['wrangler-2-door','sport','']);
 assert.deepEqual(match('GRAND CHEROKEE L LIMITED RESERVE 4X4'),['jeep-grand-cherokee','limited-reserve','']);
 assert.deepEqual(match('GRAND WAGONEER 4X4'),['jeep-grand-wagoneer','grand-wagoneer','']);
 // Another model year, a trim the guide does not list, or another make: no column, never a near match.
 assert.equal(guideTrim({vin:'V',title:'Used 2021 RAM 1500'},{...stickerFor('V','RAM 1500 LONE STAR CREW CAB 4X4'),identityLines:['2021 MODEL YEAR','RAM 1500 LONE STAR CREW CAB 4X4']},trimGuideData),null);
 assert.equal(match('RAM 1500 PROMASTER CARGO'),null);
 assert.equal(guideTrim({vin:'F',title:'Used 2025 Ford F-150 XLT'},null,trimGuideData),null);
 // With no readable sticker the dealer title is used, and only when it names model and trim.
 assert.deepEqual((m=>[m.trim.id,m.basis])(guideTrim({vin:'T',title:"New 2027 RAM 1500 TUNGSTEN CREW CAB 4X4 5'7' BOX"},null,trimGuideData)),['tungsten','title']);
 assert.equal(guideTrim({vin:'T',title:'New 2027 JEEP SAHARA'},null,trimGuideData),null);
});
test('the trim guide fills in what a window sticker leaves off, and only that',()=>{
 const ram=id=>({model:trimGuideData.models.find(m=>m.id==='ram-1500'),trim:trimGuideData.models.find(m=>m.id==='ram-1500').trims.find(t=>t.id===id),variant:''});
 const warlock=ram('warlock'),loneStar=ram('big-horn-lone-star'),laramie=ram('laramie');
 assert.equal(guideLink([warlock,loneStar]),'/trim-guide?model=ram-1500&trims=warlock,big-horn-lone-star');
 // The same rows the Compare Trims page shows as different for these two trims.
 const labels=guideDifferences([warlock,loneStar]).map(r=>r.label);
 assert.ok(labels.includes('Rear traction differential')&&labels.includes('Front tow hooks')&&labels.includes('Standard suspension'));
 assert.deepEqual(guideDifferences([loneStar,loneStar]),[]);
 assert.deepEqual(guideDifferences([loneStar,null]),[]);
 const facts=guideFeatureFacts(laramie.trim);
 assert.equal(facts.get('heatedWheel').status,'standard');
 assert.equal(facts.get('alpine').status,'standard');
 assert.equal(facts.get('foldMirrors').status,'standard');
 // The guide's columns describe one stated configuration, so drive type and engine stay with the sticker.
 for(const id of ['fourWheel','awd','manualTransmission','hemi','leather'])assert.equal(facts.has(id),false,id);
 // A standard item is not claimed when the sticker shows the upgrade that replaces it.
 assert.equal(guideFeatureFacts(laramie.trim,{harman:{value:true}}).has('alpine'),false);
 const defs=[['towHooks','Tow hooks'],['heatedWheel','Heated steering wheel'],['skidPlates','Skid plates'],['massage','Massage seats']];
 const a=stickerFor('A','RAM 1500 WARLOCK CREW CAB 4X4',{features:{towHooks:{value:true},skidPlates:{value:true}}});
 const b=stickerFor('B','RAM 1500 LARAMIE CREW CAB 4X4',{features:{}});
 const guides=[warlock,laramie].map(m=>({name:m.trim.name,facts:guideFeatureFacts(m.trim)}));
 const rows=Object.fromEntries(comparisonRows(defs,[a,b],[],guides).map(r=>[r.id,r]));
 // Optional on the Laramie and not on its sticker: a real difference.
 assert.equal(rows.towHooks.group,'difference');assert.equal(rows.towHooks.facts[1].method,'trim-guide-optional');
 // On one sticker, and the guide has nothing to add: shown as listed on one sticker only.
 assert.equal(rows.skidPlates.group,'listed-on-some');assert.equal(rows.skidPlates.facts[1],null);
 // Neither sticker mentions it: the guide still answers for each trim, and stays silent where it has no row.
 assert.equal(rows.heatedWheel.group,'listed-on-some');assert.equal(rows.heatedWheel.facts[0],null);assert.equal(rows.heatedWheel.facts[1].method,'trim-guide-standard');
 assert.equal(rows.massage.group,'unknown');
 // Both silent, both standard per the guide: shared equipment.
 const both=comparisonRows([['blindSpot','Blind-spot monitoring']],[a,b],[],guides)[0];
 assert.equal(both.group,'same');assert.deepEqual(both.facts.map(f=>f.method),['trim-guide-standard','trim-guide-standard']);
 // An option whose sticker wording is not settled yet is never called absent.
 assert.equal(guideFeatureFacts(laramie.trim).has('rearLocker'),false);
 // Standard on the trim and simply not printed on the sticker: the same, not a difference.
 const c=stickerFor('C','RAM 1500 LONE STAR CREW CAB 4X4',{features:{heatedWheel:{value:true}}});
 const shared=comparisonRows(defs,[c,b],[],[loneStar,laramie].map(m=>({name:m.trim.name,facts:guideFeatureFacts(m.trim)}))).find(r=>r.id==='heatedWheel');
 assert.equal(shared.group,'same');assert.equal(shared.facts[1].displayValue,'✓ Standard on Laramie');
 // With no readable sticker, "optional" settles nothing.
 const unread=comparisonRows(defs,[a,{status:'unavailable',features:{}}],[],guides).find(r=>r.id==='towHooks');
 assert.equal(unread.facts[1],null);assert.equal(unread.group,'check');
});

// Sam's rulings of 7 Oct 2026 on how sticker wording is read.
test('sticker wording follows the sales-floor rulings',()=>{
 let n=0;
 const car=(title,lines,identity,features={})=>{const v={vin:'ruling-'+(++n),title,condition:'New',price:1,miles:5,locationId:'18393',locationVerified:true,status:'listed'};return [v,{vin:v.vin,status:'verified',lines,features,identityLines:identity?['2026 MODEL YEAR',identity]:[]}];};
 const kind=(pair,text)=>matchVehicle(pair[0],pair[1],parseQuery(text)).kind;
 // Leatherette is its own material: not leather, and searchable by name.
 const capri=car('New 2026 JEEP GRAND CHEROKEE LIMITED',['Interior: Capri Leatherette Seats']);
 assert.equal(kind(capri,'grand cherokee leather seats'),'excluded');
 assert.equal(kind(capri,'grand cherokee leatherette'),'match');
 assert.equal(kind(capri,'grand cherokee cloth seats'),'excluded');
 assert.equal(kind(car('New 2026 DODGE CHARGER',['Interior: Alcantara / Nappa Performance Seats']),'charger leather'),'match');
 // Every 5.7, 6.2 and 6.4 V8 is a HEMI, eTorque or not; other engines are a plain no, and eTorque is not a hybrid.
 const etorque=car('New 2026 RAM 1500 LONE STAR',['Engine: 5.7L V8 Engine with eTorque','Transmission: 8-Speed Automatic 8HP75 Transmission']);
 assert.equal(kind(etorque,'ram hemi'),'match');assert.equal(kind(etorque,'ram hybrid'),'excluded');
 assert.equal(kind(etorque,'ram automatic transmission'),'match');assert.equal(kind(etorque,'ram manual transmission'),'excluded');
 const hurricane=car('New 2026 RAM 1500 LARAMIE',['Engine: Hurricane Twin Turbo with Stop/Start']);
 assert.equal(kind(hurricane,'ram hemi'),'excluded');assert.equal(kind(hurricane,'ram 6 cylinder'),'match');assert.equal(kind(hurricane,'ram 3.0 liter'),'match');assert.equal(kind(hurricane,'ram v8'),'excluded');
 const pentastar=car('New 2026 JEEP WRANGLER 4-DOOR SPORT',['Engine: 3.6L V6 24V VVT Engine with Stop/Start','Transmission: 6-Speed Manual Transmission']);
 assert.equal(kind(pentastar,'wrangler pentastar'),'match');assert.equal(kind(pentastar,'wrangler stick shift'),'match');assert.equal(kind(pentastar,'wrangler automatic transmission'),'excluded');assert.equal(kind(pentastar,'wrangler turbo'),'excluded');
 assert.equal(kind(car('New 2026 DODGE DURANGO SRT HELLCAT',['Engine: SRT 6.2L HEMI V8 Engine']),'durango supercharged'),'match');
 assert.equal(kind(car('New 2026 JEEP CHEROKEE',['Engine: 2.0L Hurricane 4 Turbo Engine with Stop / Start']),'cherokee 4 cylinder'),'match');
 const recon=car('New 2026 JEEP RECON MOAB',['Motor: 400V G2500 Front /Rear Electric Drive Motors']);
 assert.equal(kind(recon,'recon electric'),'match');assert.equal(kind(recon,'recon hemi'),'excluded');
 // Two-wheel drive is searchable; 4x2 here is rear-wheel drive, and front-wheel drive is its own thing.
 const twoWheel=car('New 2026 RAM 1500 LONE STAR CREW CAB 4X2',['Heated Front Seats'],'RAM 1500 LONE STAR CREW CAB 4X2');
 for(const q of ['2wd ram','ram 4x2','ram rwd','ram two wheel drive'])assert.equal(kind(twoWheel,q),'match',q);
 assert.equal(kind(twoWheel,'ram fwd'),'excluded');
 assert.equal(kind(car('New 2026 RAM 1500 LARAMIE CREW CAB 4X4',['Heated Front Seats'],'RAM 1500 LARAMIE CREW CAB 4X4'),'2wd ram'),'excluded');
 assert.equal(kind(car('New 2026 CHRYSLER PACIFICA SELECT FWD',['Heated Front Seats'],'PACIFICA SELECT FWD'),'pacifica front wheel drive'),'match');
 // Tops: hard top only means no soft top (and the reverse); a Sky One-Touch roof is not a soft top.
 const hard=car('New 2026 JEEP WRANGLER 4-DOOR SAHARA',['Body-Color 3-Piece Hard Top'],null,{hardTop:{value:true,evidence:['Body-Color 3-Piece Hard Top']}});
 assert.equal(kind(hard,'wrangler soft top'),'excluded');assert.equal(kind(hard,'wrangler hard top'),'match');
 const soft=car('New 2026 JEEP WRANGLER 4-DOOR SPORT',['Black Sunrider Soft Top'],null,{softTop:{value:true,evidence:['Black Sunrider Soft Top']}});
 assert.equal(kind(soft,'wrangler hard top'),'excluded');
 const sky=car('New 2026 JEEP WRANGLER 4-DOOR SAHARA',['Sky One-Touch Power-Top'],null,{skyRoof:{value:true,evidence:['Sky One-Touch Power-Top']},softTop:{value:true,evidence:['Black Sunrider Soft Top (NA w/Sky 1-Touch Pwr Top)']}});
 assert.equal(kind(sky,'wrangler soft top'),'excluded');assert.equal(kind(sky,'wrangler sky one touch'),'match');
 // Trucks: Tru-Lok rear is a locker, Trac-Lok is limited slip, "TT" and telescoping mirrors are not tow mirrors.
 const truck=car('New 2026 RAM 2500 POWER WAGON',['Tru-Lok Front and Rear Axles','Pwr Adj Heated TT Mirrors w/ Manual Fold/Telescope','400W Inverter']);
 assert.equal(kind(truck,'ram locking rear differential'),'match');assert.equal(kind(truck,'ram tow mirrors'),'unknown');assert.equal(kind(truck,'ram power folding mirrors'),'unknown');
 assert.equal(kind(car('New 2026 RAM 1500 REBEL',['Tru-Lok Front Axle']),'ram locking rear differential'),'unknown');
 assert.equal(kind(car('New 2026 JEEP WRANGLER SPORT',['Trac-Lok Anti-Spin Rear Differential']),'wrangler limited slip'),'match');
 assert.equal(kind(car('New 2026 RAM 1500 LIMITED',['Power-Heated Mirrors with Power Fold-Away']),'ram power folding mirrors'),'match');
 const chassis=car('New 2026 RAM 5500 CHASSIS',['Heated Front Seats'],'RAM 5500 CHASSIS');
 assert.equal(kind(chassis,'ram dually'),'match');
 assert.equal(kind(car('New 2026 RAM 1500 LARAMIE',['Heated Front Seats'],'RAM 1500 LARAMIE CREW CAB 4X4'),'ram dually'),'unknown');
 // Safety and tech.
 const tech=car('New 2026 JEEP GRAND CHEROKEE SUMMIT',['Pedestrian Emergency-Braking','Remote Proximity Keyless Entry for All Doors','Pushbutton Start','A/C with 4-Zone Automatic Temperature Control','19-Speaker High-Performance Audio','400W Inverter','360 Surround View Camera System','Fog and Cornering Lamps','Automatic Electronic Brake-Hold','Multi-Collision Braking']);
 for(const q of ['automatic emergency braking','pedestrian emergency braking','passive entry','push button start','dual zone climate','three zone climate','four zone climate','premium audio'])assert.equal(kind(tech,'grand cherokee '+q),'match',q);
 const f=applyFactoryEquipment(tech[0],tech[1]).features;
 assert.equal(f.keylessEntry.value,true);assert.equal(f.outlet.value,true);assert.equal(f.rearAir.value,true);
 // Left as they were: a surround-view camera is not a backup camera, and cornering lamps are not fog lamps.
 assert.equal(f.backupCamera,undefined);assert.equal(f.fogLights,undefined);
 // Brake-hold and post-crash braking are not emergency braking.
 assert.equal(applyFactoryEquipment(...car('New 2026 JEEP COMPASS',['Automatic Electronic Brake-Hold','Multi-Collision Braking'])).features.emergencyBrake,undefined);
 const dual=car('New 2026 RAM 1500 LARAMIE',['A/C with Dual-Zone Auto Temperature Control']);
 assert.equal(kind(dual,'ram dual zone climate'),'match');assert.equal(kind(dual,'ram three zone climate'),'excluded');
 // Seating.
 const family=car('New 2026 DODGE DURANGO GT',['2nd Row Buckets with Manual Easy-Entry Slide','7 Passenger Seating','Radio / Driver Seat / Mirrors / Pedals Memory']);
 for(const q of ['captains chairs','third row','driver seat memory'])assert.equal(kind(family,'durango '+q),'match',q);
 const bench=car('New 2026 DODGE DURANGO GT',['2nd Row 60/40 Bench with Manual Tip / Slide']);
 assert.equal(kind(bench,'durango captains chairs'),'excluded');
 assert.equal(kind(car('New 2026 RAM 1500',['Power Adjustable Pedals with Memory','Memory Heated Mirrors with Turn Signals']),'ram driver seat memory'),'unknown');
});
import {completeTitle} from './title-model.mjs';
test('a dealer title with no model name is completed from the window sticker, and only then',()=>{
 const sticker=line=>({status:'verified',vin:'V',identityLines:['2027 MODEL YEAR (27MY)',line]});
 assert.equal(completeTitle('New 2027 JEEP SAHARA',sticker('WRANGLER 4-DOOR SAHARA 4X4'),'V'),'New 2027 JEEP WRANGLER 4-DOOR SAHARA');
 assert.equal(completeTitle('New 2026 JEEP 4-DOOR SPORT',sticker('WRANGLER 4-DOOR AMERICA250 EDITION 4X4'),'V'),'New 2026 JEEP WRANGLER 4-DOOR SPORT');
 assert.equal(completeTitle('New 2027 JEEP MOJAVE X',sticker('GLADIATOR MOJAVE X 4X4'),'V'),'New 2027 JEEP GLADIATOR MOJAVE X');
 assert.equal(completeTitle('New 2027 TRADESMAN',sticker('RAM 1500 PROMASTER CARGO'),'V'),'New 2027 RAM PROMASTER 1500 TRADESMAN');
 assert.equal(completeTitle('New 2027 POWER WAGON DIESEL',sticker('RAM 2500 POWER WAGON CREW CAB 4X4'),'V'),'New 2027 RAM 2500 POWER WAGON DIESEL');
 // Already complete, no sticker, another vehicle's sticker, or another make: left exactly as the dealer wrote it.
 for(const title of ["New 2026 RAM 1500 LARAMIE CREW CAB 4X4 5'7' BOX",'New 2026 JEEP WRANGLER 4-DOOR SPORT','Used 2020 Jeep Wrangler Unlimited Sport S'])assert.equal(completeTitle(title,sticker('WRANGLER 4-DOOR SAHARA 4X4'),'V'),title);
 assert.equal(completeTitle('New 2027 JEEP SAHARA',{status:'unavailable'},'V'),'New 2027 JEEP SAHARA');
 assert.equal(completeTitle('New 2027 JEEP SAHARA',{...sticker('WRANGLER 4-DOOR SAHARA 4X4'),vin:'OTHER'},'V'),'New 2027 JEEP SAHARA');
 assert.equal(completeTitle('Used 2025 Ford F-150 XLT',null,'V'),'Used 2025 Ford F-150 XLT');
 // Running it again changes nothing.
 assert.equal(completeTitle('New 2027 JEEP WRANGLER 4-DOOR SAHARA',sticker('WRANGLER 4-DOOR SAHARA 4X4'),'V'),'New 2027 JEEP WRANGLER 4-DOOR SAHARA');
});
