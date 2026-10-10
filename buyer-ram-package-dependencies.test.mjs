import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buyerModels,buyerLineup} from './buyer-catalog.mjs';
import {buildBuyerOptionGroups} from './buyer-option-groups.mjs';
import {classifyGuideGroups} from './buyer-guide-routing.mjs';
import {sourcedPackageDependency} from './buyer-package-dependencies.mjs';

const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
const model=buyerModels(read('./trim-standard-data.json'),read('./data/factory/index.json')).find(m=>m.id==='ram-1500');
const chart=read('./data/factory/ram-1500.json'),trimId='big-horn-lone-star';
const fixture=()=>buyerLineup(model,chart);
const dependency=(lineup,parent,child,extra={})=>sourcedPackageDependency({lineup,parent:lineup.choices.get(parent),child:lineup.choices.get(child),trimId,...extra});
const routes=(lineup,answers,candidateTrimIds=[trimId])=>classifyGuideGroups({lineup,groups:buildBuyerOptionGroups(lineup),answers,candidateTrimIds});

test('four Ram H1/H2 child links require the exact reviewed package and inclusion rows',()=>{
 const lineup=fixture(),before=JSON.stringify(lineup.questions);
 for(const [parent,child] of [['f1yu9mmu','fli7zo'],['f1mojxzg','fli7zo'],['f1mojxzg','fh01t86'],['f1mojxzg','f4nwyj3']]){
  const proof=dependency(lineup,parent,child);assert.ok(proof,parent+' / '+child);
  assert.equal(proof.parentChoiceId,parent);assert.equal(proof.choiceId,child);assert.equal(proof.trimId,trimId);assert.equal(proof.sourceUrl,chart.source.url);
 }
 assert.equal(dependency(lineup,'f1mojxzg','f4nwyj3').conditionEvidence[0].choiceId,'f1yu9mmu');
 assert.equal(JSON.stringify(lineup.questions),before);
});

test('H1 resolves heat only while H2 also resolves the exact 12-inch radio and Alpine audio',()=>{
 const lineup=fixture();
 for(const parent of ['f1yu9mmu','f1mojxzg']){
  const answers={[parent]:parent},before=JSON.stringify(answers),result=routes(lineup,answers);
  const heat=result.find(r=>r.group.id==='options-feature-heatedWheel');
  assert.equal(heat.status,'autoIncluded');assert.equal(heat.reason,'includedBySelection');assert.deepEqual(heat.choiceIds,['fli7zo']);
  for(const [id,child] of [['options-screen','fh01t86'],['options-audio','f4nwyj3']]){
   const row=result.find(r=>r.group.id===id);assert.equal(row.status,parent==='f1mojxzg'?'autoIncluded':'decision',parent+' '+id);
   if(parent==='f1mojxzg'){assert.equal(row.reason,'includedBySelection');assert.deepEqual(row.choiceIds,[child]);assert.equal(row.includedBy[0].choiceId,parent);}
  }
  assert.equal(JSON.stringify(answers),before,'included child features do not become preferences');
 }
});

test('H2 Alpine inclusion needs the independently reviewed H1 prerequisite link',()=>{
 for(const mutate of [
  l=>{l.choices.get('f1mojxzg').includedPackages=[];},
  l=>{l.choices.get('f1mojxzg').includedPackages[0].trimIds=[];},
  l=>{l.choices.get('f1mojxzg').includedPackages[0].sourceUrl='https://example.test/unreviewed';},
  l=>{l.choices.get('f1yu9mmu').facts[trimId].status='unavailable';},
  l=>{delete l.choices.get('f1yu9mmu').facts[trimId].sourceUrl;}
 ]){
  const lineup=fixture();mutate(lineup);
  assert.equal(dependency(lineup,'f1mojxzg','f4nwyj3'),null);
  assert.equal(routes(lineup,{f1mojxzg:'f1mojxzg'}).find(r=>r.group.id==='options-audio').status,'decision');
 }
});

test('other trims, years, sources and changed conditions cannot inherit these Ram links',()=>{
 const lineup=fixture();
 for(const trim of ['tradesman','laramie','rho','unknown'])assert.equal(dependency(lineup,'f1mojxzg','fh01t86',{trimId:trim}),null);
 for(const altered of [{...lineup,year:2027},{...lineup,id:'ram-2500'}])assert.equal(dependency(altered,'f1mojxzg','fh01t86'),null);
 for(const [id,change] of [
  ['f1mojxzg',f=>{f.text+=' with another condition';}],
  ['fh01t86',f=>{f.text=f.text.replace('12-inch','14.5-inch');}],
  ['fli7zo',f=>{f.note='available with H1 and H2 Groups';}],
  ['f1yu9mmu',f=>{f.sourceUrl='https://example.test/unreviewed';}],
  ['fli7zo',f=>{f.status='unavailable';}]
 ]){
  const altered=fixture();change(altered.choices.get(id).facts[trimId]);
  assert.equal(dependency(altered,id==='f1mojxzg'||id==='fh01t86'?'f1mojxzg':'f1yu9mmu',id==='f1mojxzg'||id==='fh01t86'?'fh01t86':'fli7zo'),null);
 }
 assert.equal(routes(lineup,{f1mojxzg:'f1mojxzg'},[trimId,'rho']).find(r=>r.group.id==='options-screen').status,'decision');
});

test('requirements and replacement-sensitive equipment are not treated as included features',()=>{
 const lineup=fixture();
 for(const child of ['fh01t86','f4nwyj3'])assert.equal(dependency(lineup,'f1yu9mmu',child),null,'H1 is not H2');
 for(const child of ['f192of1r','f10i7zrb','frmceyg'])assert.equal(dependency(lineup,'f1mojxzg',child),null,'mirror replacements and additional conditions remain open');
 for(const child of ['fli7zo','fh01t86','f4nwyj3'])assert.equal(dependency(lineup,'f1mojxzg',child,{excludedChoiceIds:['f1yu9mmu']}),null,'excluded H1 conflicts with H2 inclusion');
 const result=routes(lineup,{f1mojxzg:'f1mojxzg',fh01t86:['reject:fh01t86']}).find(r=>r.group.id==='options-screen');
 assert.equal(result.status,'decision');assert.equal(result.reason,'exclusionsNeedReview');
});
