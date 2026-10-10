import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buyerModels,buyerLineup} from './buyer-catalog.mjs';
import {registerBuyerLineup} from './buyer-sources.mjs';
import {preferenceChecks} from './preference-evidence.mjs';
import {withComparisonSpecifications} from './comparison-specs.mjs';
import {installedRadioEvidence,installedPowertrainEvidence} from './buyer-installed-configuration.mjs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
const models=buyerModels(read('./trim-standard-data.json'),read('./data/factory/index.json'));
const vehicles=read('./data/used-inventory.json').vehicles,records=read('./data/equipment-index.json').records;
function context(model,id,stock){
 const m=models.find(m=>m.id===model),lineup=registerBuyerLineup(buyerLineup(m,read('./data/factory/'+m.meta.file)));
 const choice=lineup.choices.get(id),fact=Object.values(choice.facts)[0],v=vehicles.find(v=>v.stock===stock),record=records[v.vin];
 return {lineup,choice,fact,v,record};
}
test('canonical radio choices resolve actual replacements rather than the smaller standard radio',()=>{
 for(const [model,stock,id,expected] of [
  ['ram-1500','R12546','f1e0k45y','match'],['ram-1500','R12527','fh01t86','match'],
  ['ram-1500','R12527','f1e0k45y','conflict'],['ram-1500','R12315','fh01t86','conflict'],
  ['ram-3500','R12500','f123o6b','match'],['ram-3500','R12500','fldke8f','conflict']
 ]){
  const {v,record,choice}=context(model,id,stock);
  const check=wanted=>preferenceChecks(v,record,[{...choice,wanted}])[0];
  assert.equal(check(true).state,expected,stock+' '+id);assert.equal(check(true).method,'sticker-radio-system');
  assert.equal(check(false).state,expected==='match'?'conflict':'match');
 }
});
test('Wrangler and Pacifica distinguish navigation from the same-size base radio',()=>{
 for(const [model,stock,base,nav] of [['wrangler','J22109','f14j2jpq','f1oo6l8x'],['chrysler-pacifica','C02225','f2m7a7w','f6k6gmv']]){
  const c=context(model,base,stock);
  assert.equal(preferenceChecks(c.v,c.record,[{...c.choice,wanted:true}])[0].state,'match');
  const n=c.lineup.choices.get(nav);
  assert.equal(preferenceChecks(c.v,c.record,[{...n,wanted:true}])[0].state,'conflict');
  const upgraded={...c.record,lines:c.record.lines.map(l=>l.replace(/^Uconnect 5 with /,'Uconnect 5 Nav with '))};
  assert.equal(preferenceChecks(c.v,upgraded,[{...n,wanted:true}])[0].state,'match');
  assert.equal(preferenceChecks(c.v,upgraded,[{...c.choice,wanted:true}])[0].state,'conflict');
  assert.equal(preferenceChecks(c.v,{...upgraded,equipmentSectionComplete:false},[{...c.choice,wanted:true}])[0].state,'unknown');
 }
 const c=context('chrysler-pacifica','f6k6gmv','P04984');
 assert.equal(preferenceChecks(c.v,c.record,[{...c.choice,wanted:true}])[0].state,'match');
});
test('radio proof requires the complete version, active sticker evidence and exact reviewed source',()=>{
 const c=context('ram-3500','f123o6b','R12500');
 const resolve=(record,fact=c.fact,lineup=c.lineup)=>installedRadioEvidence(lineup,c.choice,fact,record,withComparisonSpecifications(c.v,record));
 assert.equal(resolve(c.record).has,true);
 for(const line of ['12-Inch Touch Screen Display','Uconnect 4 Nav with 12.0-Inch Touch Screen Display','Uconnect 5 Nav with 12.0-Inch Touch Screen Display if equipped','Uconnect 5 Nav with 12.0-Inch or 14.4-Inch Touch Screen Display']){
  assert.equal(resolve({...c.record,lines:['OPTIONAL EQUIPMENT',line]}),null,line);
 }
 for(const record of [{...c.record,equipmentSectionComplete:false},{...c.record,status:'pending'},{...c.record,sourceUrl:''}])assert.equal(resolve(record),null);
 for(const fact of [{...c.fact,sourceUrl:'https://example.test/other'},{...c.fact,text:c.fact.text+' extra equipment'}])assert.equal(resolve(c.record,fact),null);
 assert.equal(resolve(c.record,c.fact,{...c.lineup,year:2027}),null);
 const unknownNav=resolve({...c.record,lines:['OPTIONAL EQUIPMENT','Uconnect 5 with 12.0-Inch Touch Screen Display']});
 assert.equal(unknownNav.has,false,'same screen size alone cannot confirm navigation');
});
test('Grand Cherokee and HD powertrain confirmations retain the entire installed bundle',()=>{
 for(const [model,id,stock] of [['jeep-grand-cherokee','f10gvmt6','J22138'],['ram-3500','fffmage','R12500']]){
  const c=context(model,id,stock),proof=installedPowertrainEvidence(c.lineup,c.fact,c.record);
  assert.equal(proof?.has,true,model);assert.equal(preferenceChecks(c.v,c.record,[{...c.choice,wanted:true}])[0].state,'match');
  for(const lines of [c.record.lines.filter(l=>!/^Transmission:/.test(l)),c.record.lines.map(l=>l.replace('8-Speed','6-Speed')),c.record.lines.map(l=>l.replace(' HO ',' ')),c.record.lines.map(l=>/^Engine:/.test(l)?l+' if equipped':l)]){
   // HO is specific to the diesel; leaving GC's wording untouched is not a mutation.
   if(JSON.stringify(lines)===JSON.stringify(c.record.lines))continue;
   assert.equal(installedPowertrainEvidence(c.lineup,c.fact,{...c.record,lines}),null,model+' '+lines.find(l=>/^Engine:/.test(l)));
  }
  assert.equal(installedPowertrainEvidence({...c.lineup,year:2027},c.fact,c.record),null);
  assert.equal(installedPowertrainEvidence(c.lineup,{...c.fact,sourceUrl:'https://example.test/other'},c.record),null);
 }
});
