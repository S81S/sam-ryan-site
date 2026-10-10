import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buyerModels,buyerLineup} from './buyer-catalog.mjs';
import {buildBuyerOptionGroups} from './buyer-option-groups.mjs';
import {buyerFeatureExplanation} from './buyer-feature-copy.mjs';

const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
const models=buyerModels(read('./trim-standard-data.json'),read('./data/factory/index.json'));
const fixtures=new Map();
function fixture(id){
 if(!fixtures.has(id)){const model=models.find(m=>m.id===id),lineup=buyerLineup(model,read('./data/factory/'+model.meta.file));fixtures.set(id,{lineup,groups:buildBuyerOptionGroups(lineup)});}
 return fixtures.get(id);
}
function explanation(model,id){
 const {lineup,groups}=fixture(model),choice=lineup.choices.get(id);assert.ok(choice,id);
 const group=groups.find(g=>g.choices.some(c=>c.id===id));assert.ok(group,id);
 return buyerFeatureExplanation(choice,group);
}

test('factory seat and steering-wheel wording gets the correct comfort explanation',()=>{
 assert.match(explanation('wrangler','frm6xp8').summary,/Warms.*seating positions/);
 assert.match(explanation('wrangler','fzvznq6').summary,/Warms the steering-wheel rim/);
 const {lineup,groups}=fixture('wrangler'),manual=[...lineup.choices.values()].find(c=>/Driver seat.*six-way manual/i.test(c.fullLabel));
 assert.ok(manual);assert.match(buyerFeatureExplanation(manual,groups.find(g=>g.choices.some(c=>c.id===manual.id))).summary,/hand-operated/);
});

test('power-adjustable exterior mirrors never receive a seat explanation',()=>{
 const powered=explanation('wrangler','f10o966r'),unpowered=explanation('wrangler','fs9bdr4');
 assert.match(powered.summary,/adjust the exterior mirror angle/);assert.doesNotMatch(powered.summary,/seat/);
 assert.match(unpowered.summary,/non-powered exterior mirrors/);assert.doesNotMatch(unpowered.summary,/Electric controls/);
});

test('delete packages and absent-feature choices do not claim to add that equipment',()=>{
 const removed=explanation('ram-chassis-cab','fqu1ylv');
 assert.match(removed.summary,/removes the listed equipment/);assert.match(removed.details,/Front Center Seat Delete/);assert.match(removed.details,/Regular Cab only/);
 for(const label of ['Sunroof delete','Roof: No sunroof','Without heated seats']){
  const copy=buyerFeatureExplanation({label},{id:'options-roof'});
  assert.match(copy.summary,/removes|without the named feature/);assert.doesNotMatch(copy.summary,/glass roof opening|Warms/);
 }
});

test('package details retain sourced requirements, content conditions and known source warnings',()=>{
 for(const [model,id,condition] of [
  ['ram-1500','f1mb1gkk',/requires H1 or H2 Group/],
  ['wrangler','f1ux2yl5',/Rubicon only includes hitch receiver, aux switches/],
  ['wrangler','f1mpoxey',/with 4-door auto trans and 2-door 2.0L/],
  ['wrangler','falyadm',/Universal garage door opener \(Sahara\)/]
 ])assert.match(explanation(model,id).details,condition);
 assert.match(explanation('chrysler-pacifica','f19mzen9').details,/factory fleet package description and retail brochure disagree/);
 const choice=fixture('ram-1500').lineup.choices.get('f1mb1gkk'),before=JSON.stringify(choice);
 buyerFeatureExplanation(choice);assert.equal(JSON.stringify(choice),before,'copy generation cannot alter availability or source facts');
});

test('trim-specific package notes stay scoped and unsourced notes are not presented as factory conditions',()=>{
 const copy=buyerFeatureExplanation({package:true,label:'Example Package',includes:'Listed equipment',facts:{
  base:{status:'optional',sourceUrl:'https://example.test/factory',note:'Requires Base Group'},
  upper:{status:'standard',sourceUrl:'https://example.test/factory',note:''},
  unknown:{status:'optional',note:'Invented condition'}
 }});
 assert.match(copy.details,/Factory note \(base\): Requires Base Group/);assert.doesNotMatch(copy.details,/Invented condition/);
});

test('Klipsch audio and the physical dual-top package have useful explanations',()=>{
 assert.match(explanation('ram-1500','f1uh0zqe').summary,/speaker system.*audio setup/);
 assert.match(buyerFeatureExplanation({label:'Klipsch'},{id:'options-audio'}).summary,/audio setup/);
 const roof=explanation('wrangler','f10uw5fn');assert.match(roof.summary,/both a hardtop and a soft top/);assert.match(roof.details,/available Sunrider/);
});

test('powertrain explanations use the stated transmission without guessing unknown units',()=>{
 assert.match(explanation('wrangler','fvzymog').summary,/engine and automatic-transmission combination/);
 assert.match(buyerFeatureExplanation({label:'Transmission',detail:'6-speed manual'},{id:'options-transmission'}).summary,/clutch pedal/);
 const unknown=buyerFeatureExplanation({label:'Transmission',detail:'See specification'},{id:'options-transmission'});
 assert.doesNotMatch(unknown.summary,/automatically|clutch pedal/);
 for(const category of ['engine','transmission']){
  const mixed=buyerFeatureExplanation({label:'6-speed manual or 8-speed automatic'},{id:'options-'+category});
  assert.match(mixed.summary,/manual and automatic alternatives/);assert.doesNotMatch(mixed.summary,/You use a clutch pedal|shifts gears for you/);
 }
});
