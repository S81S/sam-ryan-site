import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buyerModels,buyerLineup} from './buyer-catalog.mjs';
import {buildBuyerOptionGroups} from './buyer-option-groups.mjs';
import {classifyGuideGroups} from './buyer-guide-routing.mjs';
import {sourcedPackageDependency} from './buyer-package-dependencies.mjs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
const model=buyerModels(read('./trim-standard-data.json'),read('./data/factory/index.json')).find(m=>m.id==='chrysler-pacifica');
const fixture=()=>buyerLineup(model,read('./data/factory/chrysler-pacifica.json'));
const children=['fan5lv9','fneu0ag','f12wqoyt','fftsay3','f194qpwp','f171wxhn'];
const check=(lineup,id,extra={})=>sourcedPackageDependency({lineup,parent:lineup.choices.get('feszh61'),child:lineup.choices.get(id),trimId:'limited',...extra});
test('Limited AEZ resolves six documented included features without creating extra preferences',()=>{
 const lineup=fixture(),answers={feszh61:'feszh61'},before=JSON.stringify(lineup.questions);
 for(const child of children)assert.ok(check(lineup,child),child);
 const groups=buildBuyerOptionGroups(lineup),routes=classifyGuideGroups({lineup,groups,answers,candidateTrimIds:['limited']});
 for(const child of children){const route=routes.find(r=>r.choiceIds.includes(child));assert.equal(route.status,'autoIncluded',child);assert.equal(route.reason,'includedBySelection');}
 assert.deepEqual(answers,{feszh61:'feszh61'});assert.equal(JSON.stringify(lineup.questions),before);
 assert.equal(groups.find(g=>g.id==='options-feature-familyCamera').importance,'primary','FamCAM is in the main guide when it remains a decision');
});
test('package rules cannot cross trims, hybrid scope, years, sources or explicit exclusions',()=>{
 for(const id of children){const lineup=fixture();for(const trimId of ['select','pinnacle','unknown'])assert.equal(check(lineup,id,{trimId}),null);
  assert.equal(check({...lineup,id:'chrysler-pacifica-phev'},id),null);assert.equal(check({...lineup,year:2027},id),null);
  assert.equal(check(lineup,id,{excludedChoiceIds:[id]}),null);assert.equal(check(lineup,id,{excludedChoiceIds:['feszh61']}),null);
  lineup.choices.get(id).facts.limited.sourceUrl='https://example.test/changed';assert.equal(check(lineup,id),null);
 }
 const lineup=fixture();lineup.choices.get('feszh61').facts.limited.text+=' requires another option';assert.equal(check(lineup,'fan5lv9'),null);
});
test('excluding FamCAM leaves an explicit decision rather than silently including it',()=>{
 const lineup=fixture(),groups=buildBuyerOptionGroups(lineup);
 const routes=classifyGuideGroups({lineup,groups,answers:{feszh61:'feszh61',fan5lv9:['reject:fan5lv9']},candidateTrimIds:['limited']});
 assert.notEqual(routes.find(r=>r.group.id==='options-feature-familyCamera').status,'autoIncluded');
});
