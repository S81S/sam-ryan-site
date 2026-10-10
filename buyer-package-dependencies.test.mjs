import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buyerModels,buyerLineup} from './buyer-catalog.mjs';
import {packageFeatureCondition,sourcedPackageDependency,standardDependencyParents} from './buyer-package-dependencies.mjs';

const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
const model=buyerModels(read('./trim-standard-data.json'),read('./data/factory/index.json')).find(m=>m.id==='wrangler');
const chart=read('./data/factory/wrangler.json');
const fixture=()=>buyerLineup(model,chart);
const selected=(lineup,...ids)=>ids.map(id=>({choice:lineup.choices.get(id),questionId:id}));
const dependency=(lineup,parentId,childId,trimId,engineIds=[])=>sourcedPackageDependency({lineup,parent:lineup.choices.get(parentId),child:lineup.choices.get(childId),trimId,selected:selected(lineup,...engineIds)});

test('twelve reviewed Wrangler package links use exact canonical rows and per-trim proof',()=>{
 const lineup=fixture(),before=JSON.stringify(lineup.questions);
 const cases=[
  ['f1qpru5j','f19etjcz',['sport-s','sahara','rubicon','moab-392']],
  ['f1qpru5j','f1kokjjc',['sport-s','sahara','rubicon','moab-392']],
  ['f6em7wb','frm6xp8',['sport-s','sahara','rubicon','moab-392']],
  ['f6em7wb','fzvznq6',['sport-s','sahara','rubicon','moab-392']],
  ['f6em7wb','fr0gab8',['sport-s','sahara','rubicon','moab-392']],
  ['f6em7wb','f1m582py',['sport-s','sahara','rubicon','moab-392']],
  ['falyadm','fiskoxc',['sport-s','sahara','rubicon','moab-392']],
  ['falyadm','f1oo6l8x',['sahara','rubicon']],
  ['falyadm','f6i3s8v',['sahara','rubicon']],
  ['falyadm','fr0gab8',['sahara']],
  ['fn4m1zs','f1f2e05m',['sport-s']],
  ['fn4m1zs','fyd9jk0',['sport-s']]
 ];
 for(const [parent,child,trims] of cases)for(const trim of trims){
  const result=dependency(lineup,parent,child,trim,child==='f1m582py'&&trim!=='moab-392'?['fbixrjd']:[]);
  assert.ok(result,[parent,child,trim].join(' / '));
  assert.equal(result.parentChoiceId,parent);assert.equal(result.choiceId,child);assert.equal(result.trimId,trim);assert.equal(result.sourceUrl,chart.source.url);
 }
 assert.equal(JSON.stringify(lineup.questions),before,'package evidence never rewrites catalog facts');
});

test('package-specific and special-edition scopes are never inferred from names',()=>{
 const lineup=fixture();
 for(const trim of ['sport','sport-s','moab-392','willys','rubicon-x','85th-anniversary-edition','unknown']){
  assert.equal(dependency(lineup,'falyadm','f1oo6l8x',trim),null,trim+' NAV');
  assert.equal(dependency(lineup,'falyadm','f6i3s8v',trim),null,trim+' TrailCam');
 }
 assert.equal(dependency(lineup,'falyadm','fr0gab8','rubicon'),null,'Technology garage opener is Sahara-only');
 for(const child of ['fncv7p5','f1eva7ve','fy0vhq3'])assert.equal(dependency(lineup,'f6em7wb',child,'sport-s'),null,'not an audited Convenience child');
 for(const trim of ['sport','sahara','rubicon','moab-392','willys'])assert.equal(dependency(lineup,'fn4m1zs','f1f2e05m',trim),null,trim+' Sport LED');
 assert.equal(dependency({...lineup,id:'jeep-wrangler-4xe'},'f1qpru5j','f19etjcz','sport-s'),null);
 assert.equal(dependency({...lineup,year:2025},'f1qpru5j','f19etjcz','sport-s'),null);
});

test('changed or missing source rows and unresolved conditions cannot establish dependencies',()=>{
 for(const [id,change] of [
  ['f1qpru5j',f=>{f.sourceUrl='https://example.test/unreviewed';}],
  ['f19etjcz',f=>{delete f.sourceUrl;}],
  ['f1qpru5j',f=>{f.text+=' (requires another package)';}],
  ['f19etjcz',f=>{f.key='another-row';}],
  ['f19etjcz',f=>{f.note='Only with another configuration';}],
  ['f1qpru5j',f=>{f.status='unavailable';}],
  ['f19etjcz',f=>{f.status='unavailable';}],
  ['f1qpru5j',f=>{f.factory=false;}]
 ]){
  const lineup=fixture();change(lineup.choices.get(id).facts['sport-s']);
  assert.equal(dependency(lineup,'f1qpru5j','f19etjcz','sport-s'),null,id);
 }
 const lineup=fixture();delete lineup.choices.get('f19etjcz').facts['sport-s'];
 assert.equal(dependency(lineup,'f1qpru5j','f19etjcz','sport-s'),null);
});

test('remote start needs a sourced automatic configuration, including when its row says standard',()=>{
 const lineup=fixture(),choice=lineup.choices.get('f1m582py');
 for(const trimId of ['sport-s','sahara','rubicon']){
  for(const engines of [[],['f1fd7xjl'],['f1fd7xjl','fbixrjd'],['f1j10ide']]){
   assert.equal(packageFeatureCondition({lineup,choice,trimId,selected:selected(lineup,...engines)}).satisfied,false,[trimId,...engines].join(' / '));
   assert.equal(dependency(lineup,'f6em7wb',choice.id,trimId,engines),null);
  }
  const yes=packageFeatureCondition({lineup,choice,trimId,selected:selected(lineup,'fbixrjd')});
  assert.equal(yes.satisfied,true);assert.equal(yes.evidence[0].choiceId,'fbixrjd');
 }
 const fixed=packageFeatureCondition({lineup,choice,trimId:'moab-392'});
 assert.equal(fixed.satisfied,true);assert.equal(fixed.evidence.length,3,'fixed automatic requires all three exact powertrain rows');
 assert.equal(packageFeatureCondition({lineup,choice,trimId:'moab-392',excludedChoiceIds:['f1j10ide']}).satisfied,false,'an excluded automatic is not implicitly accepted');
 assert.equal(packageFeatureCondition({lineup,choice,trimId:'rubicon',selected:selected(lineup,'fbixrjd'),excludedChoiceIds:['fbixrjd']}).satisfied,false,'conflicting automatic answers cannot prove inclusion');
 delete lineup.choices.get('f1fd7xjl').facts['moab-392'];
 assert.equal(packageFeatureCondition({lineup,choice,trimId:'moab-392'}).satisfied,false);
});

test('unknown or altered automatic rows cannot satisfy the remote-start condition',()=>{
 const lineup=fixture(),choice=lineup.choices.get('f1m582py'),auto=lineup.choices.get('fbixrjd');
 auto.facts.rubicon.text='Different automatic powertrain';
 assert.equal(packageFeatureCondition({lineup,choice,trimId:'rubicon',selected:selected(lineup,auto.id)}).satisfied,false);
 assert.equal(packageFeatureCondition({lineup,choice,trimId:'rubicon',selected:selected(lineup,'fvzymog')}).satisfied,false,'supplemental trim automatic is not a charted Rubicon configuration');
 assert.equal(packageFeatureCondition({lineup,choice,trimId:'rubicon-x',selected:selected(lineup,'fvzymog')}).satisfied,false);
});

test('standard parent candidates need reviewed unconditional standard rows on every remaining trim',()=>{
 const lineup=fixture(),ids=args=>standardDependencyParents({lineup,...args}).map(c=>c.id);
 assert.deepEqual(ids({trimIds:['sahara']}),['f6em7wb']);
 assert.deepEqual(ids({trimIds:['sahara','moab-392']}),['f6em7wb']);
 assert.deepEqual(ids({trimIds:['sahara','rubicon']}),[]);
 for(const trimIds of [[],['unknown'],['sahara','willys']])assert.deepEqual(ids({trimIds}),[]);
 assert.deepEqual(ids({trimIds:['sahara'],excludedChoiceIds:['f6em7wb']}),[]);
 lineup.choices.get('f6em7wb').facts.sahara.note='Standard only with another package';
 assert.deepEqual(ids({trimIds:['sahara']}),[]);
});
