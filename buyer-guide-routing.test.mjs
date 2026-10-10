import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {classifyGuideGroups} from './buyer-guide-routing.mjs';
import {createPhotoGuide} from './photo-guide-engine.mjs';
import {createPhotoTrimPath} from './photo-trim-path.mjs';
import {buyerModels,buyerLineup} from './buyer-catalog.mjs';
import {buildBuyerOptionGroups} from './buyer-option-groups.mjs';

const sourceUrl='https://example.test/factory';
const cell=(status,extra={})=>({status,sourceUrl,...extra});
const choice=(id,facts,extra={})=>({id,label:id,kind:'factory',originQuestionId:id,facts,...extra});
function classify(choices,extra={}){
 const group={id:'group',title:'Feature',exclusive:true,questionIds:choices.map(c=>c.originQuestionId),choices};
 const lineup={id:'model',year:2026,trims:[{id:'base'},{id:'upper'}],questions:choices.map(c=>({id:c.originQuestionId,choices:[c]}))};
 return classifyGuideGroups({lineup,groups:[group],...extra})[0];
}

test('standard on every remaining trim is summarized without adding an answer',()=>{
 const choices=[choice('camera',{base:cell('standard'),upper:cell('standard')})],answers={};
 const result=classify(choices,{answers});assert.equal(result.status,'autoIncluded');assert.equal(result.reason,'standardOnRemainingTrims');
 assert.deepEqual(result.choiceIds,['camera']);assert.equal(result.evidence.length,2);assert.deepEqual(answers,{});
});
test('a standard feature stays a decision while an optional replacement remains',()=>{
 const choices=[choice('small',{base:cell('standard'),upper:cell('standard')}),choice('large',{base:cell('optional'),upper:cell('unavailable')})];
 assert.equal(classify(choices).status,'decision');
 assert.equal(classify(choices,{candidateTrimIds:['upper']}).status,'autoIncluded');
});
test('unknown trims, absent facts, absent sources and empty candidates cannot prove inclusion',()=>{
 const base=choice('feature',{base:cell('standard'),upper:cell('standard')});
 for(const extra of [{candidateTrimIds:[]},{candidateTrimIds:['missing']},{candidateTrimIds:['base','missing']}])assert.equal(classify([base],extra).status,'decision');
 assert.equal(classify([choice('feature',{base:cell('standard')})]).status,'decision');
 assert.equal(classify([choice('feature',{base:cell('standard'),upper:cell('standard',{sourceUrl:''})})]).status,'decision');
});
test('optional, conditional-standard, and multiple standard versions remain decisions',()=>{
 assert.equal(classify([choice('heated',{base:cell('optional'),upper:cell('optional')})]).status,'decision');
 assert.equal(classify([choice('heated',{base:cell('standard',{note:'Standard except with seat deletion'}),upper:cell('standard')})]).status,'decision');
 assert.equal(classify([choice('engineA',{base:cell('standard'),upper:cell('standard')}),choice('engineB',{base:cell('standard'),upper:cell('standard')})]).status,'decision');
});
test('unavailability needs sourced proof across every candidate trim',()=>{
 const choices=[choice('feature',{base:cell('unavailable'),upper:cell('unavailable')})];
 assert.equal(classify(choices).status,'unavailable');
 assert.equal(classify([choice('feature',{base:cell('unavailable')})]).status,'decision');
});
test('explicit selections and no preference are resolved while fully rejected stacks remain open',()=>{
 const choices=[choice('a',{base:cell('optional'),upper:cell('optional')}),choice('b',{base:cell('optional'),upper:cell('optional')})];
 assert.equal(classify(choices,{answers:{a:'a'}}).status,'resolved');
 assert.equal(classify(choices,{answers:{a:'skip',b:'skip'}}).reason,'noPreference');
 const rejected=classify(choices,{answers:{a:['reject:a'],b:['reject:b']}});assert.equal(rejected.status,'decision');assert.equal(rejected.reason,'allExcluded');
});
test('a selected sourced package includes its explicitly identified child on every remaining trim',()=>{
 const child=choice('child',{base:cell('optional'),upper:cell('optional')}),parent=choice('parent',{base:cell('optional'),upper:cell('optional')},{includedPackages:[{id:'child',trimIds:['base','upper'],sourceUrl}]});
 const lineup={id:'model',year:2026,trims:[{id:'base'},{id:'upper'}],questions:[{id:'child',choices:[child]},{id:'parent',choices:[parent]}]};
 const group={id:'child',questionIds:['child'],choices:[child]},args={lineup,groups:[group],answers:{parent:'parent'}};
 const result=classifyGuideGroups(args)[0];assert.equal(result.status,'autoIncluded');assert.equal(result.reason,'includedBySelection');assert.equal(result.includedBy[0].choiceId,'parent');
 assert.equal(classifyGuideGroups({...args,answers:{}})[0].status,'decision');
 parent.includedPackages[0].trimIds=['base'];assert.equal(classifyGuideGroups(args)[0].status,'decision');
});
test('package prose alone does not establish included equipment',()=>{
 const child=choice('child',{base:cell('optional'),upper:cell('optional')}),parent=choice('parent',{base:cell('optional'),upper:cell('optional')},{includes:'Child feature'});
 const lineup={id:'model',year:2026,trims:[{id:'base'},{id:'upper'}],questions:[{id:'child',choices:[child]},{id:'parent',choices:[parent]}]};
 assert.equal(classifyGuideGroups({lineup,groups:[{id:'child',questionIds:['child'],choices:[child]}],answers:{parent:'parent'}})[0].status,'decision');
});

const read=name=>JSON.parse(fs.readFileSync(new URL(name,import.meta.url)));
const photos=createPhotoGuide(read('./data/feature-photo-guide.json'),read('./data/used-inventory.json').vehicles,read('./data/equipment-index.json').records);
const photoPath=createPhotoTrimPath(read('./data/photo-trim-path.json'),photos);
const photoFixture=(id,questionId)=>{const lineup=photos.lineups.find(l=>l.id===id),q=lineup.questions.find(q=>q.id===questionId),trims=photoPath.resolve(lineup,{}).assessments.map(a=>a.trim);return {lineup:{...lineup,trims},groups:[{...q,questionIds:[q.id],choices:q.choices.map(c=>({...c,originQuestionId:q.id}))}],photoPath,photos};};
test('Summit standard panoramic roof is included, while optional Laramie roof remains a decision',()=>{
 assert.equal(classifyGuideGroups({...photoFixture('jeep-grand-cherokee','roof'),candidateTrimIds:['summit']})[0].status,'autoIncluded');
 assert.equal(classifyGuideGroups({...photoFixture('ram-1500','roof'),candidateTrimIds:['laramie']})[0].status,'decision');
});
test('Tungsten screen is included but Limited retains its optional larger-screen decision',()=>{
 const args=photoFixture('ram-1500','screen');
 const fixed=classifyGuideGroups({...args,candidateTrimIds:['tungsten']})[0];assert.equal(fixed.status,'autoIncluded');assert.deepEqual(fixed.choiceIds,['r12315-dashboard']);
 assert.equal(classifyGuideGroups({...args,candidateTrimIds:['limited']})[0].status,'decision');
});
test('selected Big Horn deluxe cloth includes its sourced power-seat dependency',()=>{
 const args={...photoFixture('ram-1500','driver-seat'),candidateTrimIds:['big-horn-lone-star']};
 assert.equal(classifyGuideGroups(args)[0].status,'decision');
 const linked=classifyGuideGroups({...args,answers:{seats:'r12527-cloth'}})[0];
 assert.equal(linked.status,'autoIncluded');assert.equal(linked.reason,'includedBySelection');
 assert.deepEqual(linked.choiceIds,['r12527-power-seat']);assert.equal(linked.includedBy[0].choiceId,'r12527-cloth');
 assert.ok(linked.evidence.every(e=>e.sourceUrl&&e.trimId==='big-horn-lone-star'));
 const excluded=classifyGuideGroups({...args,answers:{seats:'r12527-cloth','driver-seat':['reject:r12527-power-seat']}})[0];
 assert.equal(excluded.status,'decision','an explicit exclusion is never silently overwritten by inclusion');
});


test('audited mirror choices preserve saved selections and exclusions under canonical IDs',()=>{
 const mirror=choice('legacy',{base:cell('optional'),upper:cell('optional')});
 const visible=choice('visible',{base:cell('optional'),upper:cell('optional')},{mirrors:[mirror]});
 const lineup={id:'model',year:2026,trims:[{id:'base'},{id:'upper'}],questions:[{id:'legacy',choices:[mirror]},{id:'visible',choices:[visible]}]};
 const groups=[{id:'group',questionIds:['visible','legacy'],choices:[visible]}];
 const answers={legacy:'legacy'},args={lineup,groups,answers};
 const selected=classifyGuideGroups(args)[0];assert.equal(selected.status,'resolved');assert.deepEqual(selected.choiceIds,['visible']);assert.deepEqual(answers,{legacy:'legacy'});
 const excluded=classifyGuideGroups({...args,answers:{legacy:['reject:legacy']}})[0];
 assert.equal(excluded.status,'decision');assert.equal(excluded.reason,'allExcluded');assert.deepEqual(excluded.choiceIds,['visible']);
 assert.equal(classifyGuideGroups({...args,answers:{visible:'skip',legacy:'skip'}})[0].reason,'noPreference');
});

test('excluding an independent optional feature resolves it without erasing the preference',()=>{
 const optional=choice('headliner',{base:cell('optional'),upper:cell('optional')});
 const lineup={id:'model',year:2026,trims:[{id:'base'},{id:'upper'}],questions:[{id:'headliner',choices:[optional]}]};
 const answers={headliner:['reject:headliner']};
 const result=classifyGuideGroups({lineup,groups:[{id:'headliner',exclusive:false,questionIds:['headliner'],choices:[optional]}],answers})[0];
 assert.equal(result.status,'resolved');assert.equal(result.reason,'excludedOptionalFeature');
 assert.deepEqual(answers,{headliner:['reject:headliner']});
});

test('documented fixed specifications leave the decision queue without claiming coverage for unknown trims',()=>{
 const fixed=choice('airbags',{base:cell('standard')});
 const evidence=[{choiceId:'airbags',trimId:'base',status:'standard',sourceUrl}];
 const lineup={id:'model',year:2026,trims:[{id:'base'},{id:'upper'}],questions:[{id:'airbags',choices:[fixed]}]};
 const group={id:'airbags',questionIds:['airbags'],choices:[fixed],informational:true,information:{evidence,uncoveredTrimIds:['upper']}};
 const result=classifyGuideGroups({lineup,groups:[group]})[0];
 assert.equal(result.status,'informational');assert.deepEqual(result.evidence,evidence);
 assert.deepEqual(result.group.information.uncoveredTrimIds,['upper']);
 assert.equal(classifyGuideGroups({lineup,groups:[{...group,information:{evidence:[]}}]})[0].status,'decision');
});

const wranglerFixture=()=>{
 const model=buyerModels(read('./trim-standard-data.json'),read('./data/factory/index.json')).find(m=>m.id==='wrangler');
 const lineup=buyerLineup(model,read('./data/factory/wrangler.json'));
 const photo=photos.lineups.find(l=>l.id==='wrangler');
 return {lineup,groups:buildBuyerOptionGroups(lineup,photo)};
};
const childGroup=(groups,id)=>groups.find(g=>g.choices.some(c=>c.id===id));

test('selected Wrangler packages skip their reviewed child decisions without creating preferences',()=>{
 const {lineup,groups}=wranglerFixture();
 for(const [parent,children,trim] of [
  ['f1qpru5j',['f19etjcz','f1kokjjc'],'sport-s'],
  ['f6em7wb',['frm6xp8','fzvznq6','fr0gab8','f1m582py'],'rubicon'],
  ['falyadm',['fiskoxc','f1oo6l8x','f6i3s8v','fr0gab8'],'sahara'],
  ['fn4m1zs',['f1f2e05m','fyd9jk0'],'sport-s']
 ])for(const child of children){
  const answers={[parent]:parent,...(child==='f1m582py'?{fbixrjd:'fbixrjd'}:{})},before=JSON.stringify(answers);
  const result=classifyGuideGroups({lineup,groups:[childGroup(groups,child)],candidateTrimIds:[trim],answers})[0];
  assert.equal(result.status,'autoIncluded',child);assert.equal(result.reason,'includedBySelection');assert.deepEqual(result.choiceIds,[child]);
  assert.equal(result.includedBy[0].choiceId,parent);assert.equal(result.includedBy[0].basis,'selection');
  assert.ok(result.evidence.every(e=>e.sourceUrl&&e.parentChoiceId===parent));
  assert.equal(JSON.stringify(answers),before,'inclusion creates no child preferences');
 }
});

test('standard Wrangler packages summarize packaged children only across their proven candidate scope',()=>{
 const {lineup,groups}=wranglerFixture(),group=childGroup(groups,'fr0gab8'),answers={};
 const args={lineup,groups:[group],candidateTrimIds:['sahara','moab-392'],answers};
 const result=classifyGuideGroups(args)[0];
 assert.equal(result.status,'autoIncluded');assert.equal(result.reason,'includedByStandardPackage');
 assert.equal(result.includedBy[0].choiceId,'f6em7wb');assert.equal(result.includedBy[0].basis,'standard-package');
 assert.deepEqual(answers,{});
 assert.equal(classifyGuideGroups({...args,candidateTrimIds:['sahara','rubicon']})[0].status,'decision');
 assert.equal(classifyGuideGroups({...args,candidateTrimIds:['sahara','willys']})[0].status,'decision');
 assert.equal(classifyGuideGroups({...args,answers:{f6em7wb:['reject:f6em7wb']}})[0].status,'decision');
 const excluded=classifyGuideGroups({...args,answers:{fr0gab8:['reject:fr0gab8']}})[0];
 assert.notEqual(excluded.status,'autoIncluded','a child exclusion is retained');
});

test('Wrangler remote start remains a decision until its automatic condition is proven',()=>{
 const {lineup,groups}=wranglerFixture(),group=childGroup(groups,'f1m582py');
 for(const trim of ['sport-s','sahara','rubicon'])for(const engine of [null,'f1fd7xjl']){
  const answers={f6em7wb:'f6em7wb',...(engine?{[engine]:engine}:{})};
  const result=classifyGuideGroups({lineup,groups:[group],candidateTrimIds:[trim],answers})[0];
  assert.equal(result.status,'decision',trim+' / '+engine);
 }
 const answers={f6em7wb:'f6em7wb',fbixrjd:'fbixrjd'},before=JSON.stringify(answers);
 const result=classifyGuideGroups({lineup,groups:[group],candidateTrimIds:['sport-s','sahara','rubicon'],answers})[0];
 assert.equal(result.status,'autoIncluded');
 assert.ok(result.evidence.every(e=>e.conditionEvidence.some(c=>c.choiceId==='fbixrjd'&&c.sourceUrl)));
 assert.equal(JSON.stringify(answers),before);
 const remote=lineup.choices.get('f1m582py');
 const single={id:remote.id,questionIds:[remote.id],choices:[remote]};
 assert.equal(classifyGuideGroups({lineup,groups:[single],candidateTrimIds:['sahara']})[0].reason,'conditionNeedsDecision','standard child row alone does not waive the automatic condition');
 assert.equal(classifyGuideGroups({lineup,groups:[single],candidateTrimIds:['moab-392']})[0].status,'autoIncluded','single fixed automatic configuration is independently proved');
});

test('guide choices use five exact roof alternatives while legacy source members keep their saved answers',()=>{
 const {lineup,groups}=wranglerFixture(),roof=groups.find(g=>g.id==='options-roof');
 const ids=['f6l6ob7','f1dj1wzb','f1dhm9e4','feeakr0','f10uw5fn'];
 const args={lineup,groups:[roof],candidateTrimIds:['sport-s']};
 assert.deepEqual(classifyGuideGroups(args)[0].choiceIds,ids);
 for(const [legacy,visible] of [['f1ws9hvk','f1dj1wzb'],['f1gedz3x','f1dhm9e4'],['fiivsh9','feeakr0'],['fsi1znb','f1dj1wzb']]){
  const answers={[legacy]:legacy},result=classifyGuideGroups({...args,answers})[0];
  assert.equal(result.status,'resolved',legacy);assert.equal(result.reason,'answered');assert.deepEqual(result.choiceIds,[visible]);
  assert.deepEqual(answers,{[legacy]:legacy});
 }
 const rejected=classifyGuideGroups({...args,answers:{f1ws9hvk:['reject:f1ws9hvk']}})[0];
 assert.equal(rejected.status,'decision');assert.equal(rejected.reason,'exclusionsNeedReview');
 assert.deepEqual(rejected.choiceIds,ids);
});

test('saved broad roof records resolve with their own ID and never become a hardtop color',()=>{
 const {lineup,groups}=wranglerFixture(),roof=groups.find(g=>g.id==='options-roof');
 for(const id of ['j22109-hardtop','f1h679vq']){
  const record=roof.choices.find(c=>c.id===id);assert.ok(record,id);
  const answers={[record.originQuestionId]:id};
  const args={lineup,groups:[roof],candidateTrimIds:['sport-s'],answers};
  const result=classifyGuideGroups(args)[0];
  assert.equal(result.status,'resolved');assert.equal(result.reason,'answeredLegacy');assert.deepEqual(result.choiceIds,[id]);
  assert.deepEqual(answers,{[record.originQuestionId]:id});
  const rejected=classifyGuideGroups({...args,answers:{[record.originQuestionId]:['reject:'+id]}})[0];
  assert.equal(rejected.status,'decision');assert.equal(rejected.reason,'exclusionsNeedReview');
  assert.equal(rejected.choiceIds.length,5);
 }
});
