import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {vehicleFeatureModelTerms,vehicleFeatureModelScope,trimFeatureModelTerms,trimFeatureModelScope} from './feature-model-scope.mjs';
import {featureInventoryLink,applyFeatureFilter} from './feature-inventory-link.mjs';
import {optionInventoryLink,optionFromParams} from './option-inventory.mjs';
import {parseQuery,matchVehicle,definitions} from './equipment-search.mjs';

test('Model scope uses only VIN-matched identity, retains variants and an explicit year',()=>{
 const vehicle={vin:'A',title:'New 2026 Ram 1500 Laramie'};
 assert.deepEqual(vehicleFeatureModelTerms(vehicle,{vin:'B',status:'verified',identityLines:['RAM 3500 LARAMIE']},['2026']),['2026','ram','1500']);
 assert.deepEqual(vehicleFeatureModelTerms({vin:'A',title:'New 2026 Jeep Sahara'},{vin:'A',status:'verified',identityLines:['2026 MODEL YEAR','WRANGLER 2-DOOR SAHARA 4X4']},['2026']),['2026','jeep','wrangler','2-door']);
 for(const [title,expected] of [['Jeep Grand Cherokee L Limited','jeep grand cherokee l'],['Jeep Grand Cherokee Summit 4xe','jeep grand cherokee 4xe'],['Ram 2500 ProMaster','ram promaster'],['Jeep Wrangler Sahara 4xe','jeep wrangler 4xe']])assert.equal(vehicleFeatureModelTerms({title},null).join(' '),expected);
 assert.deepEqual(trimFeatureModelTerms({name:'Jeep Wrangler 2-Door'}),['Jeep Wrangler 2-Door']);
 assert.deepEqual(trimFeatureModelTerms({name:'Jeep Wrangler 4-Door'}),['Jeep Wrangler 4-Door']);
});

test('Ram 1500 feature and exact-option links return only that model with VIN-confirmed equipment',()=>{
 const inventory=JSON.parse(fs.readFileSync(new URL('./data/used-inventory.json',import.meta.url))),index=JSON.parse(fs.readFileSync(new URL('./data/equipment-index.json',import.meta.url)));
 const source=inventory.vehicles.find(v=>v.stock==='R12315');assert.ok(source);
 const context={modelTerms:vehicleFeatureModelTerms(source,index.records[source.vin]),modelScope:vehicleFeatureModelScope(source,index.records[source.vin]),condition:'New',advisor:'Ryan',maxPrice:90000};
 for(const link of [featureInventoryLink('harman',context),optionInventoryLink({key:'comparison-infotainmentScreen',label:'Infotainment screen size',value:'14.4 inches'},context)]){
  const params=new URL(link,'https://carswithsam.com').searchParams;
  assert.equal(params.get('condition'),'New');assert.equal(params.get('advisor'),'Ryan');assert.equal(params.get('maxPrice'),'90000');
  const q=applyFeatureFilter(parseQuery(params.get('q')),params.get('feature'),definitions,params.get('modelScope'));q.equipmentOption=optionFromParams(params);q.condition=params.get('condition');q.budget=Number(params.get('maxPrice'));
  const matches=inventory.vehicles.filter(v=>matchVehicle(v,index.records[v.vin],q).kind==='match');
  assert.ok(matches.length);assert.ok(matches.some(v=>v.vin===source.vin));
  for(const v of matches){assert.match(v.title,/\bRAM 1500\b/i,v.stock);assert.equal(index.records[v.vin].vin,v.vin);}
 }
});

test('Explicit source model excludes overlapping model names in current inventory while normal search stays broad',()=>{
 const inventory=JSON.parse(fs.readFileSync(new URL('./data/used-inventory.json',import.meta.url))).vehicles,index=JSON.parse(fs.readFileSync(new URL('./data/equipment-index.json',import.meta.url))).records;
 for(const model of ['Jeep Wagoneer','Jeep Grand Wagoneer','Jeep Grand Cherokee','Jeep Grand Cherokee L','Jeep Wrangler 2-Door','Jeep Wrangler 4-Door']){
  const q=applyFeatureFilter(parseQuery(model),'heatedSeats',definitions,model);
  const matches=inventory.filter(v=>matchVehicle(v,index[v.vin],q).kind==='match');assert.ok(matches.length,model);
  for(const v of matches)assert.equal(vehicleFeatureModelScope(v,index[v.vin]).toLowerCase(),model.toLowerCase(),v.stock);
 }
 const broad=applyFeatureFilter(parseQuery('Jeep Wagoneer'),'heatedSeats',definitions);
 assert.ok(inventory.some(v=>/Grand Wagoneer/i.test(v.title)&&matchVehicle(v,index[v.vin],broad).kind==='match'));
 const model={name:'Grand Cherokee / Grand Cherokee L'},scope=trimFeatureModelScope(model);
 assert.equal(scope,'Jeep Grand Cherokee|Jeep Grand Cherokee L');
 const q=applyFeatureFilter(parseQuery('Grand Cherokee'),'heatedSeats',definitions,scope);
 assert.ok(inventory.some(v=>vehicleFeatureModelScope(v,index[v.vin])==='Jeep Grand Cherokee L'&&matchVehicle(v,index[v.vin],q).kind==='match'));
});

test('A Ram 1500 source filter cannot match a ProMaster with 1500 in its title',()=>{
 const q=applyFeatureFilter(parseQuery('Ram 1500'),'heatedSeats',definitions,'Ram 1500');
 const vehicle={vin:'VAN',title:'New 2026 RAM PROMASTER 1500 TRADESMAN',condition:'New',locationId:'18393'};
 const sticker={vin:'VAN',status:'verified',lines:['Heated Front Seats'],features:{heatedSeats:{value:true}}};
 assert.equal(matchVehicle(vehicle,sticker,q).reason,'model');
});

test('Editing the visible model releases the prior source scope but retains the equipment predicate',()=>{
 const edited=applyFeatureFilter(parseQuery('Jeep Cherokee'),'heatedSeats',definitions,'Ram 1500');
 assert.equal(edited.modelScope,undefined);assert.equal(edited.requirements[0].id,'heatedSeats');
 const budgetOnly=applyFeatureFilter(parseQuery('Ram 1500 under $60000'),'heatedSeats',definitions,'Ram 1500');
 assert.equal(budgetOnly.modelScope,'Ram 1500');assert.equal(budgetOnly.budget,60000);
});

test('Same-model searches still require the selected equipment and original VIN',()=>{
 const vehicle={vin:'A',title:'New 2026 Ram 1500 Laramie',condition:'New',locationId:'18393'};
 const terms=vehicleFeatureModelTerms(vehicle,null,['2026','ram','1500','laramie']);
 const q=applyFeatureFilter(parseQuery(terms.join(' ')),'heatedSeats',definitions);
 const sticker={vin:'A',status:'verified',lines:[],features:{heatedSeats:{value:false,evidence:['Not equipped']}}};
 assert.equal(matchVehicle(vehicle,sticker,q).kind,'excluded');
 assert.equal(matchVehicle(vehicle,{...sticker,vin:'B',features:{heatedSeats:{value:true}}},q).kind,'unknown');
 assert.equal(matchVehicle({...vehicle,title:'New 2025 Ram 1500 Laramie'},sticker,q).kind,'excluded');
});
