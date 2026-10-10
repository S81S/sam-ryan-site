import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buyerModels,buyerLineup} from './buyer-catalog.mjs';
import {createPhotoGuide} from './photo-guide-engine.mjs';
import {buildBuyerOptionGroups,findBuyerOptionGroup,findBuyerOptionChoice,findBuyerOptionFamilies,buyerOptionFamilyEvidence,sourcedGuideFact} from './buyer-option-groups.mjs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
const inventory=read('./data/used-inventory.json');
const photos=createPhotoGuide(read('./data/feature-photo-guide.json'),inventory.vehicles,read('./data/equipment-index.json').records);
const models=buyerModels(read('./trim-standard-data.json'),read('./data/factory/index.json'));
function context(id){const m=models.find(m=>m.id===id);const lineup=buyerLineup(m,read('./data/factory/'+m.meta.file));const photo=photos.lineups.find(l=>l.id===id);return {lineup,photo,groups:buildBuyerOptionGroups(lineup,photo)};}
const originals=group=>group.choices.flatMap(c=>[c,...(c.mirrors||[])]);

test('every original factory and reviewed choice remains addressable without mutating the catalog',()=>{
 for(const id of ['wrangler','ram-1500','ram-3500','chrysler-pacifica','jeep-grand-cherokee']){
  const {lineup,photo,groups}=context(id),snapshot=JSON.stringify(lineup.questions);
  assert.ok(groups.length>20,id+' must continue beyond the photo sample');
  const expected=[...(photo?.questions||[]),...lineup.questions].flatMap(q=>q.choices.map(c=>JSON.stringify([q.id,c.id])));
  const actual=groups.flatMap(g=>originals(g).map(c=>JSON.stringify([c.originQuestionId,c.id])));
  assert.deepEqual(new Set(actual),new Set(expected));assert.equal(actual.length,new Set(actual).size);
  for(const q of lineup.questions)for(const c of q.choices){const found=findBuyerOptionChoice(groups,q.id,c.id);assert.ok(found);assert.strictEqual(found.facts,c.facts);assert.equal(found.value,c.value);}
  buildBuyerOptionGroups(lineup,photo);assert.equal(JSON.stringify(lineup.questions),snapshot);
 }
});
test('Wrangler roof deck includes full soft top, distinct hardtops, power roof and dual-top bundle',()=>{
 const {groups}=context('wrangler'),roof=groups.find(g=>g.id==='options-roof');assert.ok(roof.exclusive);
 for(const id of ['f6l6ob7','f1dj1wzb','f1dhm9e4','feeakr0','f10uw5fn','fbkgl77','fiivsh9','f1ws9hvk','f1h679vq','fqwurcr','f1gedz3x'])assert.ok(roof.choices.some(c=>c.id===id),id);
 assert.ok(roof.choices.find(c=>c.id==='j22109-hardtop')?.image);
 assert.ok(roof.choices.find(c=>c.id==='j22412-skyroof')?.image);
 assert.equal(roof.choices.find(c=>c.id==='f6l6ob7').image,undefined,'no fabricated soft-top picture');
 assert.equal(roof.choices.find(c=>c.id==='f1dhm9e4').image,undefined,'black photo is not a body-color photo');
 assert.notEqual(findBuyerOptionGroup(groups,'fbcjc3g','fbcjc3g').id,roof.id,'Sunrider-for-hardtop remains an accessory');
 assert.notEqual(findBuyerOptionGroup(groups,'f1txba9l','f1txba9l').id,roof.id,'headliner remains independent');
 const photo=roof.choices.find(c=>c.id==='j22109-hardtop');assert.equal(photo.feature,'hardTop');assert.equal(photo.value,true);assert.equal(photo.reviewedScope,'2026-wrangler-four-door-gas');
});
test('audited duplicate factory roof assemblies share one visible card while preserving saved aliases',()=>{
 const {groups}=context('wrangler'),roof=groups.find(g=>g.id==='options-roof');
 for(const [id,alias] of [['f1dj1wzb','fsi1znb'],['f1dhm9e4','f7xyby6']]){
  assert.equal(roof.choices.filter(c=>[id,alias].includes(c.id)).length,1);
  assert.ok(roof.choices.find(c=>c.id===id).mirrors.some(c=>c.id===alias));
  assert.equal(findBuyerOptionGroup(groups,alias,alias),roof);
  assert.equal(findBuyerOptionChoice(groups,alias,alias).id,alias);
  assert.ok(roof.questionIds.includes(alias));
 }
});
test('a changed source availability prevents duplicate alias collapse',()=>{
 const {lineup,photo}=context('wrangler'),alias=lineup.choices.get('fsi1znb');
 alias.facts={...alias.facts,sport:{...alias.facts.sport,status:'unavailable'}};
 const roof=buildBuyerOptionGroups(lineup,photo).find(g=>g.id==='options-roof');
 assert.ok(roof.choices.some(c=>c.id==='fsi1znb'));assert.ok(roof.choices.some(c=>c.id==='f1dj1wzb'));
});
test('Ram center radios form one decision and retain exact 14.4 vs 14.5 evidence predicates',()=>{
 const {groups}=context('ram-1500'),screen=groups.find(g=>g.id==='options-screen');
 for(const id of ['r12546-dashboard','r12315-dashboard','f1e0k45y','fh01t86','f13a33dn'])assert.ok(screen.choices.some(c=>c.id===id),id);
 const photo=screen.choices.find(c=>c.id==='r12315-dashboard'),factory=screen.choices.find(c=>c.id==='f13a33dn');assert.equal(photo.value,'14.4 inches');assert.equal(factory.value,factory.id);assert.equal(photo.originQuestionId,'screen');
 assert.ok(!screen.choices.some(c=>/passenger/i.test(c.fullLabel||c.label)));
});
test('compatible accessories are not made alternatives to a full configuration',()=>{
 const {lineup,groups}=context('ram-1500');
 const upholstery=groups.find(g=>g.id==='options-upholstery');
 assert.ok(upholstery.choices.some(c=>/vinyl/i.test(c.fullLabel||c.label)));
 assert.ok(!upholstery.choices.some(c=>c.feature==='heatedSeats'||/^(?:seats: )?heated front/i.test(c.fullLabel||c.label)));
 const wheels=groups.find(g=>g.id==='options-wheels'),tires=groups.find(g=>g.id==='options-tires');assert.ok(wheels);assert.ok(tires);assert.notEqual(wheels.id,tires.id);
 const locker=lineup.questions.find(q=>/electronically locking rear axle/i.test(q.title));if(locker)assert.notEqual(findBuyerOptionGroup(groups,locker.id,locker.choices[0].id).id,'options-axle-ratio');
});
test('foundational body and engine decisions precede packages and visual equipment',()=>{
 const {groups}=context('ram-1500');
 const index=id=>groups.findIndex(g=>g.id===id),pkg=groups.findIndex(g=>g.choices.some(c=>c.package)&&g.order===10);
 assert.ok(index('options-body')>=0);assert.ok(index('options-engine')>=0);assert.ok(index('options-drive')>=0);
 assert.ok(index('options-engine')<pkg);assert.ok(pkg<index('options-roof'));assert.ok(index('options-roof')<index('options-screen'));
});
test('a lineup with photos already appended does not repeat cards',()=>{
 const {lineup,photo,groups}=context('wrangler');lineup.questions=[...photo.questions,...lineup.questions];
 const repeated=buildBuyerOptionGroups(lineup,photo);assert.deepEqual(repeated,groups);
 assert.equal(findBuyerOptionGroup(groups,'missing','missing'),null);
});

test('factory drive choices never become alternatives to engines merely because they share a chart section',()=>{
 const {lineup,groups}=context('ram-1500');
 for(const q of lineup.questions.filter(q=>/^Drive System:/.test(q.title)))assert.equal(findBuyerOptionGroup(groups,q.id,q.choices[0].id).id,'options-drive');
 assert.ok(groups.find(g=>g.id==='options-engine').choices.every(c=>!/^Drive System:/.test(c.fullLabel||'')));
});
test('noise-control electronics and spare-wheel hardware remain independent of speakers and spare tires',()=>{
 const {lineup,groups}=context('jeep-grand-cherokee');
 const noise=lineup.questions.find(q=>/Speakers: Active Noise Control/.test(q.title));assert.ok(noise);assert.notEqual(findBuyerOptionGroup(groups,noise.id,noise.id).id,'options-audio');
 const ram=context('ram-3500'),carrier=ram.lineup.questions.find(q=>q.title==='Spare Tire: Carrier');assert.ok(carrier);assert.notEqual(findBuyerOptionGroup(ram.groups,carrier.id,carrier.id).id,'options-spare-tire');
 const light=context('ram-1500');assert.ok(light.groups.some(g=>g.id==='options-spare-wheel'));
});
test('photos from another model or year are not added to the factory lineup',()=>{
 const {lineup}=context('wrangler');const other=photos.lineups.find(l=>l.id==='ram-1500');
 assert.ok(!buildBuyerOptionGroups(lineup,other).some(g=>g.choices.some(c=>c.image)));
 assert.ok(!buildBuyerOptionGroups(lineup,{...other,id:'wrangler',year:2025}).some(g=>g.choices.some(c=>c.image)));
});

test('Wrangler supplemental trim configurations share existing topics without changing their facts',()=>{
 const {lineup,groups}=context('wrangler');
 const topics={'transfer-case':'transfer',wheels:'wheels',tires:'tires',screen:'screen','instrument-display':'cluster',audio:'audio','audio-upgrade':'audio',headlamps:'headlamps','axle-ratio':'axle-ratio',climate:'climate','automatic-powertrain-options':'engine'};
 for(const q of lineup.questions){const c=q.choices[0],f=Object.values(c.facts)[0];if(f.factory||!topics[f.key])continue;
  assert.equal(findBuyerOptionGroup(groups,q.id,c.id).id,'options-'+topics[f.key],c.fullLabel);
  assert.strictEqual(findBuyerOptionChoice(groups,q.id,c.id).facts,c.facts);
 }
 for(const id of ['f1fd7xjl','fbixrjd','f1j10ide'])assert.equal(findBuyerOptionGroup(groups,id,id).id,'options-engine');
 assert.equal(findBuyerOptionGroup(groups,'f1txba9l','f1txba9l').id,'f1txba9l','headliner remains a separate accessory');
});
test('fixed Wrangler specifications cite only documented trims and do not manufacture missing trim standards',()=>{
 const {lineup,groups}=context('wrangler'),airbag=findBuyerOptionGroup(groups,'fd749q2','fd749q2');
 assert.equal(airbag.informational,true);assert.equal(airbag.information.coverage,'source-trims-only');
 assert.equal(airbag.information.evidence.length,5);assert.ok(airbag.information.uncoveredTrimIds.includes('willys'));
 assert.ok(airbag.information.evidence.every(e=>e.status==='standard'&&e.sourceUrl==='https://media.stellantisnorthamerica.com/view-spec.do?id=27222'));
 assert.ok(!airbag.information.evidence.some(e=>e.trimId==='willys'));
 assert.equal(lineup.choices.get('fd749q2').facts.willys,undefined);
 assert.ok(groups.filter(g=>g.informational).length>=12);
 for(const id of ['options-roof','options-engine','options-screen','options-wheels','options-tires','options-climate'])assert.notEqual(groups.find(g=>g.id===id).informational,true,id+' stays a real choice');
});
test('optional, unavailable, conditional, changed-predicate or unverified facts cannot become informational',()=>{
 for(const change of [{status:'optional'},{status:'unavailable'},{note:'Only with a package'},{sourceUrl:''},{text:'Different airbag configuration'}]){
  const {lineup,photo}=context('wrangler'),c=lineup.choices.get('fd749q2');
  c.facts={...c.facts,sport:{...c.facts.sport,...change}};
  assert.notEqual(findBuyerOptionGroup(buildBuyerOptionGroups(lineup,photo),c.id,c.id).informational,true,JSON.stringify(change));
 }
});
test('Wrangler presentation refinements do not classify another model or model year',()=>{
 const {lineup}=context('wrangler');
 for(const change of [{id:'wrangler-2-door'},{year:2027}]){
  const groups=buildBuyerOptionGroups({...lineup,...change});assert.ok(groups.every(g=>!g.informational));
  const screen=lineup.questions.find(q=>Object.values(q.choices[0].facts).some(f=>!f.factory&&f.key==='screen'));
  assert.equal(findBuyerOptionGroup(groups,screen.id,screen.choices[0].id).id,screen.id);
 }
});


test('Wrangler exposes five physical roof families without changing canonical choices or scopes',()=>{
 const {groups}=context('wrangler'),roof=groups.find(g=>g.id==='options-roof');
 assert.equal(roof.displayFamilies.length,5);assert.equal(roof.choices.length,14);
 assert.deepEqual(roof.displayFamilies.map(f=>f.primaryChoiceId),['f6l6ob7','f1dj1wzb','f1dhm9e4','feeakr0','f10uw5fn']);
 assert.deepEqual(roof.ungroupedDisplayChoiceIds,[]);
 for(const family of roof.displayFamilies){
  assert.equal(family.displayOnly,true);assert.equal(family.selection,'canonical-member-required');
  for(const member of [...family.members,...family.supportingMembers]){
   assert.strictEqual(findBuyerOptionChoice(groups,member.questionId,member.choiceId),member.choice);
  }
 }
 const black=roof.displayFamilies.find(f=>f.id.endsWith('black-three-piece-hardtop')),body=roof.displayFamilies.find(f=>f.id.endsWith('body-color-three-piece-hardtop'));
 assert.equal(black.photo.choiceId,'j22109-hardtop');assert.equal(black.photo.image,roof.choices.find(c=>c.id==='j22109-hardtop').image);
 assert.equal(body.photo,undefined,'black is never presented as a photograph of the body-color alternative');
 assert.equal(roof.displayFamilies.find(f=>f.id.endsWith('soft-top')).photo,undefined,'no invented soft-top photograph');
 assert.ok(!black.members.some(m=>m.choiceId==='j22109-hardtop'),'broad hardtop preference is not aliased to black');
 assert.ok(!body.members.some(m=>m.choiceId==='f1h679vq'),'two-color record does not become a body-color choice');
});
test('roof family evidence preserves special-trim coverage, color ambiguity and unavailable source cells',()=>{
 const {groups}=context('wrangler'),families=groups.find(g=>g.id==='options-roof').displayFamilies;
 const black=families.find(f=>f.id.endsWith('black-three-piece-hardtop')),body=families.find(f=>f.id.endsWith('body-color-three-piece-hardtop')),soft=families.find(f=>f.id.endsWith('soft-top'));
 const willys=buyerOptionFamilyEvidence(black,'willys');assert.ok(willys.some(e=>e.choiceId==='f1ws9hvk'&&e.fact.status==='optional'));
 assert.ok(!willys.some(e=>e.choiceId==='f1dj1wzb'),'a generic chart is not extended to an uncharted trim');
 assert.equal(buyerOptionFamilyEvidence(body,'sport').find(e=>e.choiceId==='f1dhm9e4').fact.status,'unavailable');
 assert.equal(buyerOptionFamilyEvidence(body,'rubicon-x').find(e=>e.choiceId==='f1gedz3x').fact.status,'standard');
 const tan=buyerOptionFamilyEvidence(soft,'willys-’41').find(e=>e.choiceId==='fqwurcr');assert.equal(tan.fact.value,'Tan Sunrider soft top');
 const broad=buyerOptionFamilyEvidence(black,'85th-anniversary-edition').find(e=>e.choiceId==='f1h679vq');assert.equal(broad.role,'broader-preference');assert.match(broad.scopeNote,/does not select a color/);
 assert.ok(buyerOptionFamilyEvidence(body,'85th-anniversary-edition').some(e=>e.choiceId==='f1h679vq'));
 const photo=buyerOptionFamilyEvidence(black,'sport').find(e=>e.choiceId==='j22109-hardtop');assert.equal(photo.fact,null);assert.equal(photo.trimAvailability,'requires-original-assessment');
});
test('saved roof IDs resolve to display families without rewriting narrow or broad requirements',()=>{
 const {groups}=context('wrangler');
 for(const [id,n] of [['f1dj1wzb',1],['fsi1znb',1],['f7xyby6',1],['f18pljf7',1],['f1h679vq',2]])assert.equal(findBuyerOptionFamilies(groups,id,id).length,n,id);
 const broad=findBuyerOptionFamilies(groups,'roof','j22109-hardtop');assert.equal(broad.length,2);assert.ok(broad.every(f=>f.supportingMembers.some(m=>m.choiceId==='j22109-hardtop')));
 assert.equal(findBuyerOptionChoice(groups,'roof','j22109-hardtop').feature,'hardTop');
 assert.equal(findBuyerOptionChoice(groups,'fsi1znb','fsi1znb').value,'fsi1znb');
 assert.equal(findBuyerOptionFamilies(groups,'roof','j22412-skyroof')[0].id,'wrangler-roof-power-roof');
 assert.deepEqual(findBuyerOptionFamilies(groups,'missing','missing'),[]);
});
test('new or semantically changed roof records remain ungrouped and other model years are untouched',()=>{
 const {lineup,photo}=context('wrangler'),changed=lineup.choices.get('f1ws9hvk');
 changed.facts={willys:{...changed.facts.willys,note:'Body-color three-piece hardtop.'}};
 const roof=buildBuyerOptionGroups(lineup,photo).find(g=>g.id==='options-roof');
 assert.ok(roof.ungroupedDisplayChoiceIds.includes(changed.id));assert.ok(!roof.displayFamilies.some(f=>f.members.some(m=>m.choiceId===changed.id)));
 assert.ok(findBuyerOptionChoice([roof],changed.id,changed.id),'changed evidence remains available under its own canonical predicate');
 const other=buildBuyerOptionGroups({...lineup,year:2027});assert.ok(other.every(g=>!g.displayFamilies));
 assert.ok(context('ram-1500').groups.every(g=>!g.displayFamilies));
});


test('the focused guide covers every important topic while retaining the full equipment catalog',()=>{
 const topics=['powertrain','packages','roof','seating','technology','comfort','safety','capability','appearance'];
 for(const id of ['wrangler','ram-1500','ram-3500','chrysler-pacifica','jeep-grand-cherokee']){
  const {lineup,groups}=context(id),primary=groups.filter(g=>g.importance==='primary');
  assert.ok(primary.length>20&&primary.length<80,id+' presents important decisions instead of every technical row');
  for(const topic of topics)assert.ok(primary.some(g=>g.topic.id===topic),id+' '+topic);
  assert.ok(groups.length>primary.length);assert.ok(groups.every(g=>g.guideChoices&&typeof g.topic.label==='string'&&Number.isFinite(g.topic.order)));
  assert.ok(groups.filter(g=>g.informational).every(g=>g.importance==='details'));
  for(const q of lineup.questions)for(const c of q.choices)assert.ok(findBuyerOptionChoice(groups,q.id,c.id),'details remain accessible: '+c.id);
 }
 const {groups}=context('wrangler');
 for(const id of ['f1kokjjc','faa9f67','f17wfhp6'])assert.equal(findBuyerOptionGroup(groups,id,id).id,'options-feature-parkingSensors');
 assert.equal(findBuyerOptionGroup(groups,'f7ovwpm','f7ovwpm').importance,'details');
 assert.equal(findBuyerOptionGroup(groups,'f1b3pvg1','f1b3pvg1').importance,'primary');
 assert.equal(findBuyerOptionGroup(groups,'f1f5n24','f1f5n24').importance,'primary');
});
test('five roof guide cards keep canonical predicates and exact verified photograph credit',()=>{
 const {lineup,groups}=context('wrangler'),roof=groups.find(g=>g.id==='options-roof'),snapshot=JSON.stringify(lineup.questions);
 assert.deepEqual(roof.guideChoices.map(c=>c.id),['f6l6ob7','f1dj1wzb','f1dhm9e4','feeakr0','f10uw5fn']);
 for(const c of roof.guideChoices){assert.equal(c.originQuestionId,c.id);assert.equal(c.feature,'factoryChoice');assert.equal(c.value,c.id);assert.ok(c.canonicalMembers.every(m=>m.kind==='factory'));}
 const black=roof.guideChoices.find(c=>c.id==='f1dj1wzb'),power=roof.guideChoices.find(c=>c.id==='feeakr0'),photo=roof.choices.find(c=>c.id==='j22109-hardtop');
 for(const key of ['image','title','stock','stickerSource','alt'])if(photo[key])assert.equal(black[key],photo[key],key);
 assert.equal(power.stock,'J22412');assert.equal(black.stock,'J22109');assert.match(black.photoNote,/does not depict a body-color/);
 assert.equal(roof.guideChoices.find(c=>c.id==='f1dhm9e4').image,undefined);
 assert.equal(roof.guideChoices.find(c=>c.id==='f6l6ob7').image,undefined);
 assert.equal(black.facts.willys.sourceChoiceId,'f1ws9hvk');assert.deepEqual(black.sourceChoiceIds.willys,['f1ws9hvk']);
 assert.equal(black.facts['85th-anniversary-edition'],undefined,'an either-color record does not prove black');
 assert.equal(roof.guideChoices.find(c=>c.id==='f1dhm9e4').facts['85th-anniversary-edition'],undefined);
 assert.equal(lineup.choices.get('f1dj1wzb').facts.willys,undefined);assert.equal(JSON.stringify(lineup.questions),snapshot);
});
test('physical roof lookup uses exact supplementary scope without broadening historic IDs',()=>{
 const {lineup}=context('wrangler');
 for(const [id,trim,source,status] of [['f6l6ob7','willys','fbkgl77','standard'],['f6l6ob7','willys-’41','fqwurcr','standard'],['f1dj1wzb','willys','f1ws9hvk','optional'],['f1dhm9e4','rubicon-x','f1gedz3x','standard'],['feeakr0','willys','fiivsh9','optional']]){
  const result=sourcedGuideFact(lineup,id,trim);assert.equal(result.sourceChoiceId,source);assert.equal(result.status,status);assert.equal(result.sourceUrl,lineup.choices.get(source).facts[trim].sourceUrl);
 }
 assert.equal(sourcedGuideFact(lineup,'f1dj1wzb','sahara').status,'unavailable','the original explicit restriction wins');
 assert.equal(sourcedGuideFact(lineup,'f1h679vq','sport'),null,'legacy special-edition scope is never generalized');
 assert.equal(sourcedGuideFact(lineup,'f1ws9hvk','sport'),null,'legacy Willys scope is never generalized');
 assert.equal(sourcedGuideFact(lineup,'f1dj1wzb','85th-anniversary-edition'),null);
 assert.equal(sourcedGuideFact(lineup,'f1dhm9e4','85th-anniversary-edition'),null);
 assert.equal(sourcedGuideFact(lineup,'j22109-hardtop','sport'),null);
 assert.equal(sourcedGuideFact({...lineup,year:2027},'f1dj1wzb','willys'),null);
 const member=lineup.choices.get('f1ws9hvk');member.facts={willys:{...member.facts.willys,note:'Body-color three-piece hardtop.'}};
 assert.equal(sourcedGuideFact(lineup,'f1dj1wzb','willys'),null,'changed physical meaning requires a new audit');
});
test('fixed technical rows are informational only with exact unconditional sourced evidence',()=>{
 const {lineup,photo,groups}=context('wrangler'),consoleGroup=findBuyerOptionGroup(groups,'f7ovwpm','f7ovwpm');
 assert.equal(consoleGroup.informational,true);assert.equal(consoleGroup.information.coverage,'source-trims-only');
 assert.ok(consoleGroup.information.uncoveredTrimIds.includes('willys'));
 const c=lineup.choices.get('f7ovwpm');c.facts={...c.facts,sport:{...c.facts.sport,note:'Only with optional equipment'}};
 assert.notEqual(findBuyerOptionGroup(buildBuyerOptionGroups(lineup,photo),c.id,c.id).informational,true);
});
