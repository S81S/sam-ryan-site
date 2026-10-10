import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buyerModels,buyerLineup} from './buyer-catalog.mjs';
import {registerBuyerLineup} from './buyer-sources.mjs';
import {buyerVehicleTrim,buyerPreferenceCheck} from './buyer-evidence.mjs';

const factorySource='https://example.com/factory.pdf';
const vehicle={vin:'1C6SRFTEST00000001',year:2026,title:'2026 Ram 1500 Tradesman Crew Cab 4x2'};
const sticker={status:'verified',vin:vehicle.vin,sourceUrl:'https://example.com/sticker.pdf',identityLines:['2026 MODEL YEAR','RAM 1500 TRADESMAN CREW CAB 4X2'],lines:[]};
let sequence=0;
function fixture(status='unavailable'){
 const id='test-ram-'+sequence++,fact={status,sourceUrl:factorySource,label:'Dual-Pane Panoramic Sunroof',text:'Dual-Pane Panoramic Sunroof',value:'',parent:'',factory:true};
 const choice={id:'roof',value:'roof',model:id,year:2026,label:'Dual-Pane Panoramic Sunroof',facts:{tradesman:fact}};
 registerBuyerLineup({id,modelId:'ram-1500',name:'Ram 1500',brand:'Ram',year:2026,trims:[{id:'tradesman',name:'Tradesman'}],choices:new Map([['roof',choice]])});
 return {choice,fact,requirement:{feature:'factoryChoice',model:id,year:2026,value:'roof',label:choice.label,wanted:true}};
}
test('factory-unavailable choices narrow verified matching trims in both preference directions',()=>{
 const {requirement}=fixture();
 const wanted=buyerPreferenceCheck(vehicle,sticker,null,requirement);
 assert.equal(wanted.state,'conflict');assert.equal(wanted.method,'factory-unavailable');assert.equal(wanted.sourceUrl,factorySource);
 assert.equal(buyerPreferenceCheck(vehicle,sticker,null,{...requirement,wanted:false}).state,'match');
});
test('a dealer title alone cannot establish factory unavailability for a VIN',()=>{
 const {requirement}=fixture();
 assert.equal(buyerPreferenceCheck(vehicle,{...sticker,identityLines:[]},null,requirement).state,'unknown');
 assert.equal(buyerPreferenceCheck(vehicle,{...sticker,status:'pending'},null,requirement).state,'unknown');
});
test('standard and optional starting equipment remain unknown without installed evidence',()=>{
 for(const status of ['standard','optional']){
  const {requirement}=fixture(status);
  for(const wanted of [true,false])assert.equal(buyerPreferenceCheck(vehicle,sticker,null,{...requirement,wanted}).state,'unknown');
 }
});
test('missing trim cells and unsourced unavailable cells are not evidence of absence',()=>{
 const first=fixture();first.choice.facts={limited:first.fact};
 assert.equal(buyerPreferenceCheck(vehicle,sticker,null,first.requirement).state,'unknown');
 const second=fixture();delete second.fact.sourceUrl;
 assert.equal(buyerPreferenceCheck(vehicle,sticker,null,second.requirement).state,'unknown');
});
test('explicit installed equipment keeps precedence over factory unavailability',()=>{
 const {requirement}=fixture(),installed={...sticker,lines:['Dual-Pane Panoramic Sunroof']};
 const wanted=buyerPreferenceCheck(vehicle,installed,null,requirement);
 assert.equal(wanted.state,'match');assert.equal(wanted.method,'sticker-exact');assert.equal(wanted.sourceUrl,sticker.sourceUrl);
 assert.equal(buyerPreferenceCheck(vehicle,installed,null,{...requirement,wanted:false}).state,'conflict');
});
test('malformed sticker lines are not accepted as verified evidence',()=>{
 const {requirement}=fixture();
 assert.equal(buyerPreferenceCheck(vehicle,{...sticker,lines:[null]},null,requirement).state,'unknown');
});
test('the current Ram high-output choice excludes verified trims where the factory chart prohibits it',()=>{
 const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url)));
 const model=buyerModels(read('./trim-standard-data.json'),read('./data/factory/index.json')).find(m=>m.id==='ram-1500');
 const lineup=registerBuyerLineup(buyerLineup(model,read('./data/factory/'+model.meta.file)));
 const choice=[...lineup.choices.values()].find(c=>/Hurricane High-Output/.test(c.fullLabel));assert.ok(choice);
 const records=read('./data/equipment-index.json').records;
 const unavailable=read('./data/used-inventory.json').vehicles.flatMap(v=>{
  const record=records[v.vin],match=buyerVehicleTrim(lineup,v,record);
  return record?.status==='verified'&&match?.basis==='sticker'&&choice.facts[match.trim.id]?.status==='unavailable'?[{v,record}]:[];
 });
 assert.ok(unavailable.length>0);
 for(const {v,record} of unavailable)assert.equal(buyerPreferenceCheck(v,record,null,{...choice,wanted:true}).state,'conflict',v.stock);
});

const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url)));
function ramChoices(){
 const model=buyerModels(read('./trim-standard-data.json'),read('./data/factory/index.json')).find(m=>m.id==='ram-1500');
 const lineup=registerBuyerLineup(buyerLineup(model,read('./data/factory/'+model.meta.file)));
 return {lineup,ho:[...lineup.choices.values()].find(c=>/Hurricane High-Output/.test(c.fullLabel)),pentastar:[...lineup.choices.values()].find(c=>/Pentastar V6/.test(c.fullLabel)),drive:[...lineup.choices.values()].find(c=>c.fullLabel==='Drive System: 4x2')};
}
test('Ram HO powertrain choice checks actual output and transmission instead of displacement alone',()=>{
 const {ho}=ramChoices(),limited={...vehicle,title:'2026 Ram 1500 Limited Crew Cab 4x4'};
 const base={...sticker,identityLines:['2026 MODEL YEAR','RAM 1500 LIMITED CREW CAB 4X4']};
 const check=lines=>buyerPreferenceCheck(limited,{...base,lines},null,{...ho,wanted:true});
 const engine='Engine: 3.0L I6 Hurricane HO Twin Turbo with Stop/Start',transmission='Transmission: 8-Speed Automatic 8HP75 Transmission';
 assert.equal(check([engine,transmission]).state,'match');
 assert.equal(check([engine.replace(' HO ',' SO '),transmission]).state,'conflict');
 assert.equal(check([engine.replace(' HO ',' '),transmission]).state,'unknown');
 assert.equal(check([engine]).state,'unknown');
 assert.equal(check([engine,transmission.replace('8-Speed Automatic','6-Speed Manual')]).state,'conflict');
 assert.equal(check(['Engine: 3.6L V6 24V VVT eTorque Engine with Stop/Start',transmission]).state,'conflict');
});
test('drive-system choices use the VIN identity and do not assume a standard drivetrain is installed',()=>{
 const {drive}=ramChoices(),r={...drive,wanted:true};
 assert.equal(buyerPreferenceCheck(vehicle,sticker,null,r).state,'match');
 assert.equal(buyerPreferenceCheck(vehicle,{...sticker,identityLines:['2026 MODEL YEAR','RAM 1500 TRADESMAN CREW CAB 4X4']},null,r).state,'conflict');
 assert.equal(buyerPreferenceCheck(vehicle,{...sticker,identityLines:['2026 MODEL YEAR','RAM 1500 TRADESMAN CREW CAB']},null,r).state,'unknown');
});
test('current Ram engine and drive selections reduce the pool using installed VIN configuration',()=>{
 const {lineup,ho,drive,pentastar}=ramChoices(),records=read('./data/equipment-index.json').records;
 const pool=read('./data/used-inventory.json').vehicles.filter(v=>!v.external&&v.status!=='not-observed'&&v.condition==='New'&&buyerVehicleTrim(lineup,v,records[v.vin]));
 for(const choice of [ho,drive,pentastar]){
  const rows=pool.map(v=>buyerPreferenceCheck(v,records[v.vin],null,{...choice,wanted:true}));
  assert.ok(rows.some(r=>r.state==='match'),choice.label);
  assert.ok(rows.some(r=>r.state==='conflict'),choice.label);
  assert.equal(rows.filter(r=>r.state==='unknown').length,0,choice.label);
 }
});

function wranglerContext(){
 const model=buyerModels(read('./trim-standard-data.json'),read('./data/factory/index.json')).find(m=>m.id==='wrangler');
 const lineup=registerBuyerLineup(buyerLineup(model,read('./data/factory/'+model.meta.file))),vehicles=read('./data/used-inventory.json').vehicles,records=read('./data/equipment-index.json').records;
 const byStock=stock=>{const v=vehicles.find(v=>v.stock===stock);return {v,record:records[v.vin]};};
 const check=(stock,id,wanted=true,override={})=>{const {v,record}=byStock(stock);return buyerPreferenceCheck(v,{...record,...override},null,{...lineup.choices.get(id),wanted});};
 return {lineup,vehicles,records,byStock,check};
}
test('the four-door Wrangler pool excludes every current two-door before any answers',()=>{
 const {lineup,vehicles,records,byStock}=wranglerContext(),two=vehicles.filter(v=>v.year===2026&&/Wrangler 2-Door/i.test(v.title));
 assert.ok(two.length>=4);for(const v of two)assert.equal(buyerVehicleTrim(lineup,v,records[v.vin]),null,v.stock);
 const {v,record}=byStock('J22412');assert.ok(buyerVehicleTrim(lineup,v,record));
 assert.equal(buyerVehicleTrim(lineup,v,{...record,engine:'Engine: 2.0L I4 PHEV Engine'}),null);
 assert.equal(buyerVehicleTrim(lineup,v,{...record,identityLines:['2026 MODEL YEAR','WRANGLER 2-DOOR RUBICON 4X4']}),null);
 const edition=byStock('J22457');assert.ok(buyerVehicleTrim(lineup,edition.v,edition.record),'factory lineup still accepts separately sourced special editions');
});
test('current canonical black, body-color and Sky roof choices use the VIN installed lines',()=>{
 const {check}=wranglerContext();
 for(const [stock,id] of [['J22109','f1dj1wzb'],['J22457','f1dhm9e4'],['J22412','feeakr0']]){
  const result=check(stock,id);assert.equal(result.state,'match',stock+' '+id);assert.equal(result.method,'sticker-roof-configuration');assert.ok(result.evidence.length);
  assert.equal(check(stock,id,false).state,'conflict');
 }
 assert.equal(check('J22109','f1dhm9e4').state,'conflict');assert.equal(check('J22457','f1dj1wzb').state,'conflict');
 assert.equal(check('J22412','f1dj1wzb').state,'conflict');assert.equal(check('J22412','f1dhm9e4').state,'conflict');
 assert.equal(check('J22109','feeakr0').state,'conflict');
});
test('No Soft Top overrides a base soft-top line while a hardtop alone leaves separate soft-top supply unknown',()=>{
 const {check}=wranglerContext();
 assert.equal(check('J22109','f6l6ob7').state,'conflict');assert.equal(check('J22109','f6l6ob7',false).state,'match');
 assert.equal(check('J22109','f10uw5fn').state,'conflict');
 assert.equal(check('J22196','f6l6ob7').state,'unknown');
 assert.equal(check('J22412','f6l6ob7').state,'conflict');

});
test('contradictory roof options and conditional mentions cannot become installed configurations',()=>{
 const {check}=wranglerContext();
 for(const options of [
  ['Sky One-Touch Power-Top','Black 3-Piece Hard Top'],
  ['Dual Top Group','No Soft Top'],
  ['Black 3-Piece Hard Top','Body-Color 3-Piece Hard Top'],
  ['Sky One-Touch Power-Top if equipped'],
  ['No Soft Top if equipped']
 ])for(const id of ['f6l6ob7','f1dj1wzb','f1dhm9e4','feeakr0','f10uw5fn']){
  const lines=['STANDARD EQUIPMENT','Black Sunrider Soft Top','OPTIONAL EQUIPMENT','Customer Preferred Package 22R',...options];
  assert.equal(check('J22412',id,true,{lines}).state,'unknown',options.join('/')+' '+id);
 }
});
test('roof source guards reject wrong VIN, body, incomplete records, accessories and invented color equivalence',()=>{
 const {check}=wranglerContext();
 assert.equal(check('J22412','feeakr0',true,{vin:'WRONG'}).state,'conflict');
 assert.equal(check('J22088','f6l6ob7').state,'conflict');
 assert.equal(check('J22412','feeakr0',true,{equipmentSectionComplete:false}).state,'unknown');
 assert.equal(check('J22412','feeakr0',true,{status:'pending'}).state,'unknown');
 assert.equal(check('J22412','f1dj1wzb',true,{lines:['STANDARD EQUIPMENT','OPTIONAL EQUIPMENT','Hardtop Headliner by Mopar','Sunrider for hardtop by Mopar']}).state,'unknown');
 assert.equal(check('J22493','f1dhm9e4').state,'unknown','White hardtop wording alone does not prove the body-color factory option');
 assert.equal(check('J22493','f1dj1wzb').state,'conflict');
});
test('soft-top-only and reviewed dual-top records preserve the distinct included tops',()=>{
 const {check}=wranglerContext(),base=['STANDARD EQUIPMENT','Black Sunrider Soft Top','OPTIONAL EQUIPMENT','Customer Preferred Package 22R'];
 assert.equal(check('J22412','f6l6ob7',true,{lines:base}).state,'match');
 const lines=[...base,'Dual Top Group $2,795','Black 3-Piece Hard Top','Premium Black Sunrider Soft Top'];
 for(const id of ['f6l6ob7','f1dj1wzb','f10uw5fn'])assert.equal(check('J22412',id,true,{lines}).state,'match');
 assert.equal(check('J22412','feeakr0',true,{lines}).state,'conflict');
});

test('the actual hyphenated Dual-Top wording and Jean Blue soft top are resolved without inventing edition scope',()=>{
 const {check,byStock,lineup}=wranglerContext(),actual=byStock('J22612');
 assert.equal(buyerVehicleTrim(lineup,actual.v,actual.record),null,'America250 has no catalog trim yet; do not guess a base trim');
 // Reuse the actual source wording in an explicitly scoped test configuration.
 const roofLines=actual.record.lines.filter(l=>/Dual.Top|Sunrider|3-Piece Hard Top/.test(l));
 const lines=['STANDARD EQUIPMENT','OPTIONAL EQUIPMENT','Customer Preferred Package 22R',...roofLines];
 for(const id of ['f6l6ob7','f1dj1wzb','f10uw5fn'])assert.equal(check('J22412',id,true,{lines}).state,'match',id);
});

test('canonical Wrangler engine/transmission selections use the installed configuration resolver',()=>{
 const {check}=wranglerContext();
 const automatic=check('J22412','fbixrjd');assert.equal(automatic.state,'match');assert.equal(automatic.method,'sticker-powertrain');
 assert.equal(check('J19530','fbixrjd').state,'conflict','V6 cannot satisfy the turbo I4 configuration');
 assert.equal(check('J19530','f1fd7xjl').state,'conflict','automatic V6 cannot satisfy the manual V6 configuration');
});
