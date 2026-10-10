import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {buyerModels,buyerLineup} from './buyer-catalog.mjs';
import {registerBuyerLineup} from './buyer-sources.mjs';
import {buyerVehicleTrim} from './buyer-evidence.mjs';
import {assessBuyerMatches,assessBuyerTrim} from './buyer-matches.mjs';
import {photoPreferences,encodePreferences,readPreferences} from './shopping-preferences.mjs';
import {createPhotoGuide,swipeDecision} from './photo-guide-engine.mjs';
import {createPhotoTrimPath} from './photo-trim-path.mjs';
import {buildBuyerOptionGroups,findBuyerOptionGroup} from './buyer-option-groups.mjs';
import {classifyGuideGroups} from './buyer-guide-routing.mjs';
import {attachBuyerCardGestures} from './buyer-card-gestures.mjs';
import {buyerFeatureExplanation} from './buyer-feature-copy.mjs';
import {buyerFeaturePhoto} from './buyer-feature-photo-map.mjs';
import {buyerAudioPhoto} from './buyer-audio-photos.mjs';
import {buyerRoofPhoto} from './buyer-roof-photos.mjs';
import {screenDisplayChoices} from './buyer-screen-deck.mjs';
import {renderBuyerFeatureVisual} from './buyer-feature-visuals.mjs';
const read=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url)));
const guide=read('./trim-standard-data.json'),index=read('./data/factory/index.json');
const catalog={guide,index,models:buyerModels(guide,index)};
async function session({saved=null,search='',fetchOverride}={}){
 const storage=new Map(saved?[['carswithsam-complete-guide-v1',JSON.stringify(saved)]]:[]);
 const decode=value=>String(value).replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>');
 const matches=(node,selector)=>selector.split(',').some(part=>{
  const raw=part.trim(),checked=raw.endsWith(':checked'),s=checked?raw.slice(0,-8):raw;if(checked&&!node.checked)return false;const attribute=s.match(/^\[([^=\]]+)(?:=["']([^"']*)["'])?\]$/);
  if(attribute)return attribute[1] in node.attributes&&(attribute[2]===undefined||node.attributes[attribute[1]]===attribute[2]);
  if(s.startsWith('.'))return node.className.split(/\s+/).includes(s.slice(1));
  return node.tagName===s.toLowerCase();
 });
 const make=(tag='span',attrs='')=>{
  const node={tagName:tag,dataset:{},attributes:{},children:[],listeners:{},style:{},checked:false,open:false,disabled:false,value:'',textContent:'',scrolls:[],className:'',addEventListener(n,f){this.listeners[n]=f;},setPointerCapture(){},releasePointerCapture(){},focus(){this.focused=true;},scrollIntoView(options){this.scrolls.push(options);},append(child){this.children.push(child);},remove(){this.removed=true;},setAttribute(name,value){this.attributes[name]=String(value);},removeAttribute(name){delete this.attributes[name];},getAttribute(name){return this.attributes[name]??null;}};
  node.classList={add(name){node.className+=' '+name;},remove(name){node.className=node.className.split(/\s+/).filter(n=>n!==name).join(' ');},toggle(name,on){if(on)this.add(name);else this.remove(name);}};
  for(const [,name,double,single,bare] of attrs.matchAll(/([a-z-]+)(?:="([^"]*)"|='([^']*)'|=([^\s>]+))?/g)){
   const value=decode(double??single??bare??'');node.attributes[name]=value;if(['checked','open','disabled'].includes(name))node[name]=true;
   if(name.startsWith('data-'))node.dataset[name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=value;
   if(name==='value')node.value=value;if(name==='class')node.className=value;if(name==='href')node.href=value;
  }
  node.querySelectorAll=selector=>{const descendants=[];const visit=n=>{for(const child of n.children){if(matches(child,selector))descendants.push(child);visit(child);}};visit(node);return descendants;};
  node.querySelector=selector=>node.querySelectorAll(selector)[0]||null;return node;
 };
 const root=make('section');root.markup='';root.nodes=[];
 Object.defineProperty(root,'innerHTML',{get(){return this.markup;},set(html){
  this.markup=html;this.children=[];this.nodes=[];const stack=[this];
  for(const token of html.matchAll(/<(\/?)([a-z][a-z0-9-]*)\b([^>]*)>|([^<]+)/gi)){
   if(token[4]){for(const n of stack)n.textContent+=decode(token[4]);continue;}
   const [,closing,tag,attrs]=token;
   if(closing){while(stack.length>1){const n=stack.pop();if(n.tagName===tag)break;}continue;}
   const n=make(tag,attrs);stack.at(-1).children.push(n);this.nodes.push(n);
   if(!['img','input','br','hr','meta','link'].includes(tag))stack.push(n);
  }
 }});
 const errors=[],location={search};
 const context={loadBuyerCatalog:async()=>catalog,loadBuyerLineup:async id=>{const m=catalog.models.find(m=>m.id===id);return registerBuyerLineup(buyerLineup(m,m.meta?read('./data/factory/'+m.meta.file):null));},assessBuyerMatches,assessBuyerTrim,buyerVehicleTrim,photoPreferences,encodePreferences,readPreferences,createPhotoGuide,createPhotoTrimPath,swipeDecision,buildBuyerOptionGroups,findBuyerOptionGroup,classifyGuideGroups,attachBuyerCardGestures,buyerFeatureExplanation,buyerFeaturePhoto,buyerAudioPhoto,buyerRoofPhoto,screenDisplayChoices,renderBuyerFeatureVisual,URLSearchParams,AbortSignal,Intl,Date,structuredClone,matchMedia:()=>({matches:true}),console:{error:e=>errors.push(e)},location,sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},document:{getElementById:()=>root,querySelector:()=>null,createElement:tag=>make(tag)},fetch:async path=>fetchOverride?fetchOverride(path):({ok:true,json:async()=>read('.'+path)})};
 const source=fs.readFileSync(new URL('./buyer-guide.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
 await vm.runInNewContext('(async()=>{'+source+'})()',context);
 const find=selector=>root.querySelector(selector);
 const click=async selector=>{const n=find(selector);assert.ok(n,'Missing control '+selector);assert.notEqual(n.disabled,true,'Disabled control '+selector);await (n.onclick?n.onclick({detail:1}):n.listeners.click?.({detail:1}));await new Promise(resolve=>setImmediate(resolve));};
 return {root,find,click,errors,location,state:()=>JSON.parse(storage.get('carswithsam-complete-guide-v1')||'null')};
}

async function start(id='ram-1500',trim=''){
 const s=await session();await s.click('[data-model="'+id+'"]');
 assert.match(s.root.innerHTML,/Your starting point/);
 if(trim){const select=s.find('[data-setting="trim"]');select.value=trim;select.onchange();}
 await s.click('[data-action="start"]');assert.deepEqual(s.errors,[]);return s;
}
const photoFixture=createPhotoGuide(read('./data/feature-photo-guide.json'),read('./data/used-inventory.json').vehicles,read('./data/equipment-index.json').records);
const fixtures=new Map();
function fixture(id){
 if(!fixtures.has(id)){const model=catalog.models.find(m=>m.id===id),lineup=registerBuyerLineup(buyerLineup(model,model.meta?read('./data/factory/'+model.meta.file):null)),photo=photoFixture.lineups.find(l=>l.id===id&&l.year===lineup.year);if(photo)lineup.questions=[...photo.questions,...lineup.questions];fixtures.set(id,{lineup,groups:buildBuyerOptionGroups(lineup,photo)});}
 return fixtures.get(id);
}
async function show(s,id){
 const group=fixture(s.state().model).groups.find(g=>g.choices.some(c=>c.id===id));assert.ok(group,'known option '+id);
 if(s.state().groupId!==group.id){const jump=s.find('[data-jump]');assert.ok(jump,'feature menu');const option=jump.querySelectorAll('option').find(o=>o.textContent.replace(/^\d+\. /,'').replace(/ ✓$/,'')===group.title.slice(0,100));assert.ok(option,'active group '+group.id);jump.listeners.change({target:{value:option.value}});}
 const peek=s.find('[data-show-choice="'+id+'"]');if(peek)await s.click('[data-show-choice="'+id+'"]');
 for(let i=0;i<100&&s.find('[data-card]')?.dataset.card!==id;i++)await s.click('[data-action="next-option"]');
 assert.equal(s.find('[data-card]')?.dataset.card,id,'option '+id+' is visible');
 return s.find('[data-card]');
}
async function want(s,id){await show(s,id);await s.click('[data-answer="'+id+'"]');}
const count=s=>parseInt(s.find('[data-live-count]').textContent);
function set(s,key,value){const input=s.find('[data-setting="'+key+'"]');assert.ok(input);input.value=value;input.onchange();}

test('the deployed guide starts at base equipment and shows one browsable card',async()=>{
 assert.match(fs.readFileSync(new URL('./perfect-match.html',import.meta.url),'utf8'),/src="\/buyer-guide\.mjs/);
 const s=await start();assert.match(s.root.innerHTML,/decisions left/);assert.ok(s.find('[data-jump]').querySelectorAll('option').length>4);
 assert.equal(s.root.querySelectorAll('[data-card]').length,1);
 const first=s.find('[data-card]').dataset.card;
 await s.click('[data-action="next-option"]');assert.notEqual(s.find('[data-card]').dataset.card,first);
 await s.click('[data-action="previous-option"]');assert.equal(s.find('[data-card]').dataset.card,first);
 assert.deepEqual(s.state().answers,{});
 const card=s.find('[data-card]');assert.equal(card.onclick,undefined,'tapping the photograph is not a hidden Want action');
 card.onpointerdown({button:0,isPrimary:true,clientX:100,clientY:100,pointerId:1});
 card.onpointerup({clientX:102,clientY:102,pointerId:1});assert.deepEqual(s.state().answers,{});
});
test('Want narrows VINs and advances, with alternatives available when revisited',async()=>{
 const s=await start(),initial=count(s);await show(s,'r12315-dashboard');const group=s.state().groupId;
 assert.ok(s.find('[data-show-choice]'),'stack alternatives are visible and clickable');
 await want(s,'r12315-dashboard');assert.ok(count(s)<initial);assert.notEqual(s.state().groupId,group);assert.match(s.find('.pg-feedback').textContent,/Chosen:|Selected:/);await show(s,'r12315-dashboard');
 await s.click('[data-show-choice="r12527-dashboard"]');assert.equal(s.find('[data-card]').dataset.card,'r12527-dashboard');assert.equal(s.state().answers.screen,'r12315-dashboard');
 await s.click('[data-action="continue"]');assert.notEqual(s.state().groupId,group);assert.ok(s.find('[data-card]'));
 await want(s,'r12315-leather');await s.click('[data-action="results"]');
 assert.ok(s.find('[data-action="compare"]'));assert.match(s.root.innerHTML,/Stock R12315/);
 assert.equal(s.root.querySelectorAll('[data-card]').length,0);assert.ok(s.root.querySelectorAll('.bg-result-photo').length>0);assert.deepEqual(s.errors,[]);
});
test('incompatible photo choices are blocked by both buttons and keyboard',async()=>{
 const s=await start('ram-1500','tradesman'),card=await show(s,'r12315-dashboard');
 assert.equal(card.dataset.choiceBlocked,'true');assert.equal(s.find('[data-answer="r12315-dashboard"]').disabled,true);assert.equal(s.find('[data-answer="reject:r12315-dashboard"]').disabled,false);
 card.onkeydown({key:'ArrowRight',preventDefault(){}});assert.deepEqual(s.state().answers,{});
 const all=await start();await want(all,'r12315-dashboard');
 await want(all,'r12546-vinyl-bench');assert.equal(count(all),0);await all.click('[data-action="results"]');assert.match(all.root.innerHTML,/No vehicles match all your choices/);assert.equal(all.root.querySelectorAll('[data-compare]').length,0);
});
test('the complete feature menu includes factory decisions and omits incompatible singleton groups',async()=>{
 const s=await start('ram-1500','tradesman');
 assert.doesNotMatch(s.find('[data-jump]').textContent,/Backcountry Package/);
 assert.match(s.find('[data-jump]').textContent,/engine|transmission|drive system/i);
 assert.ok(s.find('[data-jump]').querySelectorAll('option').length>4);
});
test('budget edits preserve result links until Apply and then show an actionable empty state',async()=>{
 const s=await start();await s.click('[data-action="results"]');
 const input=s.find('[data-budget]'),link=s.root.querySelectorAll('a').find(n=>n.href?.startsWith('/vehicle-'));
 input.value='1';input.listeners.input({target:input});input.onchange?.();
 assert.equal(s.find('[data-budget]'),input);assert.ok(s.root.querySelectorAll('a').includes(link));
 await s.click('[data-action="apply-budget"]');assert.equal(s.state().budget,1);
 assert.match(s.root.innerHTML,/No vehicles match all your choices/);assert.equal(s.root.querySelectorAll('[data-compare]').length,0);
});
test('starting the guide applies a typed budget without requiring blur',async()=>{
 const s=await session();await s.click('[data-model="ram-1500"]');
 const input=s.find('[data-budget]');input.value='45000';input.listeners.input({target:input});
 await s.click('[data-action="start"]');assert.equal(s.state().budget,45000);assert.equal(s.find('[data-budget]').value,'45000');
});
test('condition changes retain the settings panel and keyboard focus',async()=>{
 const s=await start();s.find('.pg-settings').open=true;set(s,'condition','Both');
 assert.equal(s.state().condition,'Both');assert.equal(s.find('.pg-settings').open,true);
 assert.equal(s.find('[data-setting="condition"]').focused,true);
});
test('cancelled, vertical, and secondary-pointer gestures cannot choose a feature',async()=>{
 const s=await start(),card=s.find('[data-card]');
 card.onpointerdown({button:0,isPrimary:true,clientX:100,clientY:100,pointerId:1});card.onpointercancel({pointerId:1});
 card.onpointerup({clientX:300,clientY:100,pointerId:1});assert.deepEqual(s.state().answers,{});
 card.onpointerdown({button:0,isPrimary:true,clientX:100,clientY:100,pointerId:1});
 card.onpointermove({clientX:101,clientY:130,pointerId:1});
 card.onpointerdown({button:0,isPrimary:false,clientX:0,clientY:100,pointerId:2});
 card.onpointerup({clientX:300,clientY:130,pointerId:1});assert.deepEqual(s.state().answers,{});
});
test('right swipes choose, left swipes exclude, and Back restores the narrowing',async()=>{
 const s=await start(),initial=count(s),card=await show(s,'r12315-dashboard');
 card.onpointerdown({button:0,isPrimary:true,clientX:100,clientY:100,pointerId:1});
 card.onpointermove({clientX:200,clientY:101,pointerId:1});card.onpointerup({clientX:200,clientY:101,pointerId:1});
 assert.equal(s.state().answers.screen,'r12315-dashboard');await s.click('[data-action="back"]');assert.deepEqual(s.state().answers,{});assert.equal(count(s),initial);
 const restored=await show(s,'r12315-dashboard');restored.onkeydown({key:'ArrowLeft',preventDefault(){}});
 assert.deepEqual(s.state().answers.screen,['reject:r12315-dashboard']);assert.notEqual(s.find('[data-card]').dataset.card,'r12315-dashboard');
 await show(s,'r12315-dashboard');await s.click('[data-restore="r12315-dashboard"]');assert.equal(s.state().answers.screen,undefined);
});
test('a failed photo falls back to an explained illustration and choices still work',async()=>{
 const s=await start(),card=await show(s,'r12315-dashboard'),id=card.dataset.card,group=s.state().groupId;card.querySelector('img').listeners.error();
 const fallback=s.find('[data-card]');assert.equal(fallback.querySelector('img'),null);assert.ok(fallback.querySelector('svg'));assert.ok(fallback.querySelector('.pg-feature-explanation').textContent);
 assert.equal(s.find('[data-answer="'+id+'"]').disabled,false);
 await s.click('[data-answer="'+id+'"]');assert.equal(s.state().answers.screen,id);assert.notEqual(s.state().groupId,group);assert.deepEqual(s.errors,[]);
});
test('all five reviewed models continue past their opening photo-topic count',async()=>{
 for(const [id,n] of [['ram-1500',4],['ram-3500',2],['chrysler-pacifica',2],['jeep-grand-cherokee',3],['wrangler',2]]){
  const s=await start(id),seen=new Set();
  for(let i=0;i<n+1;i++){assert.equal(s.root.querySelectorAll('[data-card]').length,1,id);assert.ok(!seen.has(s.state().groupId),id+' advances to a different decision');seen.add(s.state().groupId);await s.click('[data-answer="skip"]');}
  assert.ok(s.find('[data-card]'),id+' does not end after its few photo topics');assert.deepEqual(s.errors,[]);
 }
});

test('Wrangler roof stack offers five physical systems and narrows exact vehicles',async()=>{
 const s=await start('wrangler'),initial=count(s);
 await show(s,'f1dj1wzb');
 assert.match(s.root.innerHTML,/Alternative \d of 5/);
 assert.equal(s.root.querySelectorAll('[data-show-choice]').length,4);
 assert.match(s.find('[data-card]').textContent,/Stock J22109/);
 await s.click('[data-answer="f1dj1wzb"]');
 assert.ok(count(s)>0&&count(s)<initial,'exact black hardtop selection narrows the pool');
 assert.notEqual(s.state().groupId,'options-roof');
 assert.ok(s.find('[data-card]'),'guide continues to other important categories');
 await s.click('[data-action="results"]');
 assert.match(s.root.innerHTML,/Stock J22109/);
 assert.match(s.root.innerHTML,/decisions remain/);
 assert.deepEqual(s.errors,[]);
});

test('Wrangler reaches results only after every applicable important category is resolved',async()=>{
 const s=await start('wrangler'),seen=new Set(),topics=new Set();
 const groupMap=new Map(fixture('wrangler').groups.map(g=>[g.id,g]));
 while(s.find('[data-card]')){
  const id=s.state().groupId,group=groupMap.get(id);
  assert.ok(!seen.has(id),'a resolved question must not repeat');seen.add(id);
  assert.equal(group.importance,'primary');topics.add(group.topic.id);
  assert.ok(seen.size<=100,'bounded meaningful decisions');
  await s.click('[data-answer="skip"]');
 }
 assert.ok(seen.size>20,'complete configuration rather than a short photo quiz');
 for(const id of ['powertrain','packages','roof','seating','technology','comfort','safety','capability','appearance'])assert.ok(topics.has(id),'covered '+id);
 assert.equal(s.state().stage,'results');assert.match(s.root.innerHTML,/Your choices are complete/);assert.deepEqual(s.errors,[]);
});
test('a selected Wrangler package explains included features and removes their redundant questions',async()=>{
 const s=await start('wrangler','sport-s');
 await want(s,'fbixrjd');
 await want(s,'f6em7wb');
 const included=s.find('.pg-included');assert.ok(included);
 assert.match(included.textContent,/Included with Convenience Group/);
 for(const id of ['frm6xp8','fzvznq6','fr0gab8','f1m582py']){
  const group=fixture('wrangler').groups.find(g=>g.choices.some(c=>c.id===id));
  assert.ok(!s.find('[data-jump]').querySelectorAll('option').some(o=>o.textContent.replace(/^\d+\. /,'').replace(/ ✓$/,'')===group.title.slice(0,100)),'included feature is no longer asked: '+id);
  assert.equal(s.state().answers[id],undefined,'package inclusion does not invent another preference');
 }
 assert.ok(s.find('[data-card]'));assert.deepEqual(s.errors,[]);
});
test('Back restores trim and position together after changing trim late in the full guide',async()=>{
 const s=await start();
 const options=s.find('[data-jump]').querySelectorAll('option'),nearEnd=options.at(-2).value;
 s.find('[data-jump]').listeners.change({target:{value:nearEnd}});await s.click('[data-answer="skip"]');
 const before=s.state();set(s,'trim','tradesman');assert.equal(s.state().step,0);
 await s.click('[data-action="back"]');assert.equal(s.state().trim,before.trim);assert.equal(s.state().step,before.step);
 const progress=s.find('.pg-progress');assert.ok(Number(progress.getAttribute('aria-valuenow'))<Number(progress.getAttribute('aria-valuemax')));
 assert.deepEqual(s.errors,[]);
});
test('saved choices resume with working undo after a reload',async()=>{
 const s=await start();await want(s,'r12315-dashboard');const reloaded=await session({saved:s.state()});
 await reloaded.click('[data-action="resume"]');assert.equal(reloaded.state().answers.screen,'r12315-dashboard');
 assert.equal(reloaded.find('[data-action="back"]').disabled,false);await reloaded.click('[data-action="back"]');
 assert.deepEqual(reloaded.state().answers,{});assert.equal(reloaded.state().groupId,'options-screen');assert.equal(reloaded.find('[data-card]').dataset.card,'r12315-dashboard');
});
test('review Change and Remove controls edit one preference without losing the others',async()=>{
 const s=await start();await want(s,'r12315-dashboard');await want(s,'r12315-leather');await s.click('[data-action="review"]');
 await s.click('[data-edit-question="screen"]');assert.equal(s.find('[data-card]').dataset.card,'r12315-dashboard');assert.equal(s.state().answers.seats,'r12315-leather');
 await s.click('[data-action="review"]');await s.click('[data-remove-question="screen"]');
 assert.equal(s.state().answers.screen,undefined);assert.equal(s.state().answers.seats,'r12315-leather');assert.ok(count(s)>0);
});
test('comparison selection survives redraws, limits five, and carries exact preferences',async()=>{
 const s=await start();await want(s,'r12527-dashboard');await s.click('[data-action="results"]');const boxes=s.root.querySelectorAll('[data-compare]');assert.ok(boxes.length>=6);
 for(const box of boxes.slice(0,5)){box.checked=true;box.onchange();}
 boxes[5].checked=true;boxes[5].onchange();assert.equal(boxes[5].checked,false);assert.equal(s.state().compareVins.length,5);
 await s.click('[data-action="more"]');assert.equal(s.root.querySelectorAll('[data-compare]:checked').length,5);
 await s.click('[data-action="compare"]');const target=new URL(s.location.href,'https://carswithsam.com');assert.equal(target.pathname,'/compare');assert.equal(target.searchParams.get('vehicles').split(',').length,5);
 assert.equal(readPreferences(target.searchParams).requirements.find(r=>r.questionId==='screen').choiceId,'r12527-dashboard');
});
test('shared links restore exact photo choices, trim, condition, and budget',async()=>{
 const s=await start();await want(s,'r12315-dashboard');set(s,'condition','Both');
 const budget=s.find('[data-budget]');budget.value='100000';await s.click('[data-action="apply-budget"]');await s.click('[data-action="results"]');
 const link=s.root.querySelectorAll('a').find(n=>n.href?.startsWith('/vehicle-'));assert.ok(link);
 const target=new URL(link.href,'https://carswithsam.com'),restored=await session({search:target.search});
 assert.equal(restored.state().answers.screen,'r12315-dashboard');assert.equal(restored.state().condition,'Both');assert.equal(restored.state().budget,100000);
 assert.ok(restored.find('[data-edit-question="screen"]'));assert.deepEqual(restored.errors,[]);
});
test('initial data failure offers a working retry',async()=>{
 let fail=true;const s=await session({fetchOverride:async path=>{if(path==='/data/used-inventory.json'&&fail)return {ok:false};return {ok:true,json:async()=>read('.'+path)};}});
 assert.ok(s.find('[data-retry]'));fail=false;await s.click('[data-retry]');assert.ok(s.find('[data-model="ram-1500"]'));
 assert.equal(s.errors.length,1,'only the simulated first load fails');
});

test('selected-trim photo labels describe that trim and start with an applicable option',async()=>{
 const limited=await start('ram-1500','limited');await show(limited,'r12527-dashboard');assert.equal(limited.find('.pg-route').textContent,'Included on Limited');
 const tungsten=await start('ram-1500','tungsten');await show(tungsten,'r12315-dashboard');assert.equal(tungsten.find('.pg-route').textContent,'Included on Tungsten');
});
test('shared requirements missing from the current guide remain removable rather than disappearing',async()=>{
 const preferences=encodePreferences({version:1,model:'ram-1500',requirements:[{feature:'factoryChoice',value:'fmissing',wanted:true,label:'Previously selected equipment',choiceId:'fmissing',questionId:'fmissing',model:'ram-1500',year:2026}]});
 const s=await session({search:'?'+new URLSearchParams({preferences})});assert.equal(s.state().unresolved.length,1);assert.equal(s.state().unresolved[0].value,'fmissing');assert.match(s.root.innerHTML,/saved requirement needs review/);assert.doesNotMatch(s.root.innerHTML,/Offers your selected features/);
 await s.click('[data-remove-unresolved="0"]');assert.equal(s.state().unresolved.length,0);assert.doesNotMatch(s.root.innerHTML,/saved requirement needs review/);
});

test('the complete feature menu groups photo and factory alternatives without repeating the screen topic',async()=>{
 const s=await start(),topics=s.find('[data-jump]').querySelectorAll('option').map(n=>n.textContent);
 assert.equal(topics.filter(t=>t.includes('Which center touchscreen')).length,1);
 await show(s,'r12315-dashboard');const screen=fixture('ram-1500').groups.find(g=>g.id===s.state().groupId);
 assert.ok(screen.choices.some(c=>c.image));assert.ok(screen.choices.some(c=>c.kind==='factory'));assert.deepEqual(s.errors,[]);
});

test('resume preserves obsolete choices with or without portable evidence until the shopper removes them',async()=>{
 const original=await start();await want(original,'r12527-dashboard');
 assert.equal(original.state().savedRequirements.find(r=>r.questionId==='screen').choiceId,'r12527-dashboard');
 for(const portable of [true,false]){
  const saved=original.state();saved.answers['retired-question']='fretired';
  if(portable)saved.savedRequirements.push({feature:'factoryChoice',value:'fretired',wanted:true,label:'Previously selected package',choiceId:'fretired',questionId:'retired-question',model:'ram-1500',year:2026});
  else delete saved.savedRequirements;
  const resumed=await session({saved});await resumed.click('[data-action="resume"]');
  assert.equal(resumed.state().answers.screen,'r12527-dashboard','the valid preference survives');
  assert.equal(resumed.state().answers['retired-question'],undefined);
  assert.equal(resumed.state().unresolved.length,1);
  assert.equal(resumed.state().unresolved[0].choiceId,'fretired');
  assert.equal(resumed.state().unresolved[0].feature,portable?'factoryChoice':'savedChoice');
  if(portable)assert.equal(resumed.state().unresolved[0].label,'Previously selected package');
  assert.equal(count(resumed),0,'obsolete evidence cannot silently broaden confirmed matches');
  await resumed.click('[data-action="review"]');assert.match(resumed.root.innerHTML,/saved requirement needs review/);
  assert.doesNotMatch(resumed.root.innerHTML,/Offers your selected features/);
  await resumed.click('[data-remove-unresolved="0"]');
  assert.equal(resumed.state().unresolved.length,0);assert.equal(resumed.state().answers.screen,'r12527-dashboard');
  assert.ok(count(resumed)>0,'removing only the obsolete requirement restores valid matches');
  assert.deepEqual(resumed.errors,[]);
 }
});

test('rejecting another alternative preserves the selection and moves forward',async()=>{
 const s=await start();await want(s,'r12315-dashboard');const group=s.state().groupId;
 await show(s,'r12527-dashboard');await s.click('[data-answer="reject:r12527-dashboard"]');
 assert.equal(s.state().groupId,group);
 assert.equal(s.state().answers.screen,'r12315-dashboard','rejecting an alternate cannot erase the selected exclusive choice');
 assert.match(s.find('.pg-feedback').textContent,/Kept|kept/);assert.ok(s.find('[data-card]'));
});

test('rejecting every alternative keeps the stack open with explicit recovery',async()=>{
 const s=await start(),group=fixture('ram-1500').groups.find(g=>g.id===s.state().groupId);
 assert.ok(group.choices.length>1);
 for(const choice of group.choices){await show(s,choice.id);await s.click('[data-answer="reject:'+choice.id+'"]');assert.equal(s.state().groupId,group.id);}
 assert.match(s.root.innerHTML,/You excluded every alternative here/);assert.equal(s.find('[data-action="continue"]').disabled,true);
 await s.click('[data-action="restore-group"]');assert.deepEqual(s.state().answers,{});assert.equal(s.state().groupId,group.id);
 await s.click('[data-answer="skip"]');assert.notEqual(s.state().groupId,group.id);assert.ok(s.find('[data-card]'));
 for(const id of group.questionIds)assert.equal(s.state().answers[id],'skip','No preference preserves the canonical question IDs');
});

 test('choosing one engine resolves that category and moves to the next applicable feature',async()=>{
 for(const model of ['wrangler','ram-1500']){
  const s=await start(model),group=fixture(model).groups.find(g=>g.id==='options-engine');
  const choice=group.choices.find(c=>Object.values(c.facts||{}).some(f=>['standard','optional'].includes(f.status)));
  await show(s,choice.id);await s.click('[data-answer="'+choice.id+'"]');
  assert.notEqual(s.state().groupId,'options-engine');assert.ok(s.find('[data-card]'));
  assert.equal(Object.values(s.state().answers).filter(v=>group.choices.some(c=>c.id===v)).length,1);
  assert.match(s.find('.pg-feedback').textContent,/confirmed/);assert.deepEqual(s.errors,[]);
 }
});
 test('all important cards have a feature visual and an on-card explanation',async()=>{
 const s=await start('wrangler'),seen=new Set();
 while(s.find('[data-card]')){
  const c=s.find('[data-card]');assert.ok(c.querySelector('img')||c.querySelector('svg'),s.state().groupId);assert.ok(c.querySelector('.pg-feature-explanation').textContent.length>25);
  assert.ok(!seen.has(s.state().groupId));seen.add(s.state().groupId);await s.click('[data-answer="skip"]');
 }
 assert.ok(seen.size>20);assert.deepEqual(s.errors,[]);
});
 test('promotional photo viewports are cropped on both front and rear cards',async()=>{
 const s=await start('wrangler');await show(s,'f1dj1wzb');
 assert.ok(s.find('[data-card]').querySelector('.pg-cropped-photo'));assert.ok(s.find('[data-card]').querySelector('img').getAttribute('style').includes('left:-'));
 assert.ok(s.find('.pg-stack-peeks').querySelector('.pg-cropped-photo'));assert.doesNotMatch(s.find('[data-card]').textContent,/manager.special/i);
});

test('branded audio cards show the exact OEM speaker photo and retain the equipment choice',async()=>{
 const s=await start();
 for(const [id,filename,brand] of [['f1uh0zqe','klipsch','Klipsch'],['f19v1dzs','harman-kardon','Harman Kardon']]){
  const card=await show(s,id);assert.match(card.querySelector('img').getAttribute('src'),new RegExp('ram1500-2026-'+filename+'-oem'));assert.match(card.textContent,new RegExp(brand));assert.match(card.querySelector('.pg-photo-identity').textContent,/Ram OEM photo/);assert.doesNotMatch(card.querySelector('.pg-photo-identity').textContent,/Stock|undefined/);
 }
 assert.deepEqual(s.errors,[]);
});

for(const {model,stock,choices} of [
 {model:'wrangler',stock:'J22109',choices:['f1dj1wzb','j22109-cloth']},
 {model:'ram-1500',stock:'R12315',choices:['r12315-dashboard','r12315-leather','r12315-panoramic']},
 {model:'jeep-grand-cherokee',stock:'J22138',choices:['j22138-dashboard','j22138-capri']},
 {model:'chrysler-pacifica',stock:'C02225',choices:['c02225-leatherette','c02225-panoramic']},
 {model:'ram-3500',stock:'R12500',choices:['r12500-dashboard','r12500-vinyl-bench']}
])test('positive multi-feature journey keeps the photographed vehicle through completion: '+model,async()=>{
 const s=await start(model);
 for(const id of choices){
  await want(s,id);assert.ok(count(s)>0,model+' '+id+' preserves at least one confirmed vehicle');assert.deepEqual(s.errors,[]);
 }
 const chosen=s.state().answers,seen=new Set();
 while(s.find('[data-card]')){
  const group=s.state().groupId;assert.ok(!seen.has(group),'resolved decisions must not repeat: '+model+' '+group);seen.add(group);assert.ok(seen.size<=90,'bounded remaining guide');
  await s.click('[data-answer="skip"]');
 }
 assert.equal(s.state().stage,'results');assert.match(s.root.innerHTML,/Your choices are complete/);
 for(const [id,value] of Object.entries(chosen))assert.deepEqual(s.state().answers[id],value,'completing remaining decisions preserves '+id);
 if(s.find('[data-action="more"]'))await s.click('[data-action="more"]');
 assert.ok(s.find('.pg-results').querySelectorAll('p').some(p=>p.textContent.endsWith('Stock '+stock)),'the vehicle used for the selected photo features remains confirmed: '+stock);
 assert.deepEqual(s.errors,[]);
});

for(const {model,stock,engine} of [
 {model:'wrangler',stock:'J22109',engine:'fbixrjd'},
 {model:'ram-1500',stock:'R12315',engine:'fpw7o6e'},
 {model:'jeep-grand-cherokee',stock:'J22138',engine:'f10gvmt6'},
 {model:'ram-3500',stock:'R12500',engine:'fffmage'}
])test('the sourced engine and transmission choice retains a vehicle with that installed powertrain: '+model,async()=>{
 const s=await start(model);await want(s,engine);await s.click('[data-action="results"]');
 if(s.find('[data-action="more"]'))await s.click('[data-action="more"]');
 assert.ok(s.find('.pg-results').querySelectorAll('p').some(p=>p.textContent.endsWith('Stock '+stock)),stock+' should stay confirmed for '+engine);
 assert.deepEqual(s.errors,[]);
});


test('Ram screen stacks show each reviewed size once and preserve a saved factory selection',async()=>{
 for(const [model,first,expected] of [['ram-1500','r12546-dashboard',['r12546-dashboard','r12527-dashboard','r12315-dashboard']],['ram-3500','r12500-dashboard',['r12500-dashboard','r12249a-dashboard','fldke8f']]]){
  const s=await start(model);await show(s,first);const seen=[];
  do {seen.push(s.find('[data-card]').dataset.card);await s.click('[data-action="next-option"]');}while(s.find('[data-card]').dataset.card!==first&&seen.length<12);
  assert.deepEqual([...seen].sort(),[...expected].sort());
  assert.ok(s.find('[data-card]').querySelector('img'));
 }
 const s=await start();await want(s,'r12527-dashboard');const saved=s.state();
 delete saved.answers.screen;saved.answers.fh01t86='fh01t86';
 saved.savedRequirements=photoPreferences(fixture('ram-1500').lineup,saved.answers).requirements;
 const resumed=await session({saved});await resumed.click('[data-action="resume"]');await show(resumed,'fh01t86');
 assert.equal(resumed.state().answers.fh01t86,'fh01t86');assert.ok(resumed.find('[data-card]').querySelector('img'));assert.ok(count(resumed)>0);
 assert.equal(resumed.find('[data-show-choice="r12527-dashboard"]'),null);assert.deepEqual(resumed.errors,[]);
});

test('body-color Wrangler roof card uses the correctly labeled Jeep roof illustration',async()=>{
 const s=await start('wrangler'),card=await show(s,'f1dhm9e4');
 assert.equal(card.querySelector('img').getAttribute('src'),'/wrangler-2026-bodycolor-hardtop-oem.jpg');
 assert.match(card.querySelector('.pg-photo-identity').textContent,/Jeep OEM illustration/);
 assert.doesNotMatch(card.querySelector('.pg-photo-identity').textContent,/Stock|Ram OEM/);
 assert.deepEqual(s.errors,[]);
});
