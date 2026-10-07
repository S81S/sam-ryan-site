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
 assert.equal(visibleComparisonRows(rows,'check').length,1);
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
