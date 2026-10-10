import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createPhotoGuide,swipeDecision} from './photo-guide-engine.mjs';
import {createPhotoTrimPath} from './photo-trim-path.mjs';
import {photoPreferences,encodePreferences,readPreferences} from './shopping-preferences.mjs';

async function session(saved=null,search='',{autoStart=true}={}){
 const storage=new Map(saved?[['carswithsam-photo-guide-v1',JSON.stringify(saved)]]:[]);
 const decode=value=>String(value).replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>');
 const matches=(node,selector)=>selector.split(',').some(part=>{
  const s=part.trim(),attribute=s.match(/^\[([^=\]]+)(?:=["']([^"']*)["'])?\]$/);
  if(attribute)return attribute[1] in node.attributes&&(attribute[2]===undefined||node.attributes[attribute[1]]===attribute[2]);
  if(s.startsWith('.'))return node.className.split(/\s+/).includes(s.slice(1));
  return node.tagName===s.toLowerCase();
 });
 const make=(tag='span',attrs='')=>{
  const node={tagName:tag,dataset:{},attributes:{},children:[],listeners:{},style:{},disabled:/\bdisabled\b/.test(attrs),value:'',textContent:'',scrolls:[],className:'',addEventListener(n,f){this.listeners[n]=f;},setPointerCapture(){},releasePointerCapture(){},focus(){this.focused=true;},scrollIntoView(options){this.scrolls.push(options);},append(child){this.children.push(child);},remove(){this.removed=true;},setAttribute(name,value){this.attributes[name]=String(value);},removeAttribute(name){delete this.attributes[name];},getAttribute(name){return this.attributes[name]??null;}};
  node.classList={add(name){node.className+=' '+name;},remove(name){node.className=node.className.split(/\s+/).filter(n=>n!==name).join(' ');},toggle(name,on){if(on)this.add(name);else this.remove(name);}};
  for(const [,name,double,single,bare] of attrs.matchAll(/([a-z-]+)(?:="([^"]*)"|='([^']*)'|=([^\s>]+))?/g)){
   const value=decode(double??single??bare??'');node.attributes[name]=value;
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
 const context={createPhotoGuide,createPhotoTrimPath,swipeDecision,photoPreferences,encodePreferences,readPreferences,URLSearchParams,Intl,Date,console,structuredClone,matchMedia:()=>({matches:true}),location:{search},sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},document:{getElementById:()=>root,querySelector:()=>null,createElement:tag=>make(tag)},fetch:async path=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(new URL('.'+path,import.meta.url)))})};
 const source=fs.readFileSync(new URL('./photo-guide.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
 await vm.runInNewContext('(async()=>{'+source+'})()',context);
 if(autoStart)root.querySelector('[data-action="start"]')?.listeners.click();
 return {root,state:()=>JSON.parse(storage.get('carswithsam-photo-guide-v1')||'null'),find:selector=>root.querySelector(selector),action:name=>root.querySelectorAll('[data-action]').find(n=>n.dataset.action===name)};
}

test('Choosing real photo cards advances to seats, roof, and matching vehicles',async()=>{
 const s=await session();assert.match(s.root.innerHTML,/Which dashboard screen/);
 s.root.querySelectorAll('[data-choice]').find(n=>n.dataset.choice==='r12315-dashboard').listeners.click();
 assert.match(s.root.innerHTML,/Which (?:seat material|front-seat configuration)/);
 s.root.querySelectorAll('[data-choice]').find(n=>n.dataset.choice==='r12315-leather').listeners.click();
 assert.match(s.root.innerHTML,/Would you like a panoramic/);
 s.find('[data-choice]').listeners.click();
 assert.match(s.root.innerHTML,/How do you want to adjust/);
 s.root.querySelectorAll('[data-choice]').find(n=>n.dataset.choice==='r12527-power-seat').listeners.click();
 assert.equal(s.state().done,true);
 assert.match(s.root.innerHTML,/Stock R12315/);
 assert.match(s.root.innerHTML,/Text Sam my preferences/);
});
test('Left swiping a photo excludes it once and undo returns to the question',async()=>{
 const s=await session();const card=s.root.querySelectorAll('[data-choice]').find(n=>n.dataset.choice==='r12527-dashboard');
 card.listeners.pointerdown({button:0,clientX:200,clientY:100,pointerId:1});
 card.listeners.pointerup({clientX:100,clientY:102,pointerId:1});card.listeners.click();
 assert.equal(s.state().step,0);
 assert.deepEqual(s.state().answers.screen,['reject:r12527-dashboard']);
 assert.match(s.root.innerHTML,/Choose another photo or No preference/);
 s.root.querySelectorAll('[data-action]').find(n=>n.dataset.action==='back').listeners.click();
 assert.equal(s.state().step,0);assert.deepEqual(s.state().answers,{});
});
test('Passing the only applicable photo advances while preserving the exclusion and undo',async()=>{
 const s=await session();
 s.find('[data-choice="r12315-dashboard"]').listeners.click();
 assert.equal(s.state().step,1);
 assert.deepEqual(s.root.querySelectorAll('[data-choice]').filter(n=>!n.disabled).map(n=>n.dataset.choice),['r12315-leather']);
 s.find('[data-choice="r12315-leather"]').listeners.keydown({key:'ArrowLeft',preventDefault(){}});
 assert.equal(s.state().step,2);
 assert.deepEqual(s.state().answers.seats,['reject:r12315-leather']);
 assert.match(s.root.innerHTML,/Would you like a panoramic/);
 s.action('back').listeners.click();
 assert.equal(s.state().step,1);
 assert.equal(s.state().answers.seats,undefined);
 assert.equal(s.find('[data-choice="r12315-leather"]').disabled,false);
});
test('Grand Cherokee walks from the correct base to Summit photos and VIN-matched results',async()=>{
 const s=await session();
 s.find('[data-model]').listeners.change({target:{value:'jeep-grand-cherokee'}});
 assert.match(s.root.innerHTML,/Start with the Laredo/);
 assert.match(s.root.innerHTML,/V6 Laredo/);
 s.action('start').listeners.click();
 assert.match(s.root.innerHTML,/screen is switched off in this original dealer photo/);
 assert.match(s.root.innerHTML,/promotional ribbon retained/);
 s.find('[data-choice="j22138-dashboard"]').listeners.click();
 assert.match(s.root.innerHTML,/Current trim: Laredo Altitude/);
 assert.equal(s.find('[data-choice="j22581-cloth"]').disabled,true);
 s.find('[data-choice="j22560-palermo"]').listeners.click();
 assert.match(s.root.innerHTML,/Included on Summit/);
 s.find('[data-choice="j22560-panoramic"]').listeners.click();
 assert.equal(s.state().done,true);
 assert.match(s.root.innerHTML,/Stock J22560/);
 assert.doesNotMatch(s.root.innerHTML,/GRAND CHEROKEE L /);
});
test('Excluding an included Summit roof explains the conflict without returning that vehicle',async()=>{
 const s=await session();
 s.find('[data-model]').listeners.change({target:{value:'jeep-grand-cherokee'}});
 s.action('start').listeners.click();
 s.find('[data-choice="j22138-dashboard"]').listeners.click();
 s.find('[data-choice="j22560-palermo"]').listeners.click();
 s.find('[data-reject="j22560-panoramic"]').listeners.click();
 assert.equal(s.state().done,true);
 assert.match(s.root.innerHTML,/is included on Summit\. Your preferences exclude it/);
 assert.match(s.root.innerHTML,/No listed vehicle matches this exact combination/);
 assert.doesNotMatch(s.root.innerHTML,/Stock J22560/);
});
test('Keyboard choices and no preference work without dragging',async()=>{
 const s=await session();s.root.querySelectorAll('[data-choice]').find(n=>n.dataset.choice==='r12527-dashboard').listeners.keydown({key:'ArrowRight',preventDefault(){}});
 assert.equal(s.state().answers.screen,'r12527-dashboard');
 s.root.querySelectorAll('[data-action]').find(n=>n.dataset.action==='skip').listeners.click();
 assert.equal(s.state().answers.seats,'skip');assert.equal(s.state().step,2);
});
test('Budget typing is saved without replacing the focused field',async()=>{
 const s=await session();const input=s.find('[data-budget]');input.listeners.input({target:{value:'45000'}});
 assert.equal(s.find('[data-budget]'),input);assert.equal(s.state().budget,45000);
});
test('A restored session discards unsupported preferences and resumes its valid choices',async()=>{
 const s=await session({model:'ram-1500',answers:{screen:'r12527-dashboard',roof:'fake'},budget:45000,step:1,condition:'New',done:false});
 assert.match(s.root.innerHTML,/Which (?:seat material|front-seat configuration)/);assert.match(s.root.innerHTML,/value="45000"/);
 s.root.querySelectorAll('[data-action]').find(n=>n.dataset.action==='skip').listeners.click();
 assert.equal(s.state().answers.screen,'r12527-dashboard');assert.equal(s.state().answers.roof,undefined);
});

test('Budget typing refreshes each photo count without replacing the focused field',async()=>{
 const s=await session(),input=s.find('[data-budget]');
 assert.ok(s.root.querySelectorAll('.pg-choice-count').some(n=>/\d+ matches? with this choice/.test(n.textContent)));
 input.listeners.input({target:{value:'1'}});
 assert.equal(s.find('[data-budget]'),input);
 for(const count of s.root.querySelectorAll('.pg-choice-count'))assert.match(count.textContent,/^0\b|No matches/);
});

test('Results budget edits preserve the field and result links until Apply budget',async()=>{
 const s=await session();s.action('results').listeners.click();
 const input=s.find('[data-budget]'),vehicleLink=s.root.querySelectorAll('a').find(n=>n.href?.startsWith('/vehicle-'));
 assert.ok(vehicleLink);
 input.listeners.input({target:{value:'1'}});
 input.listeners.change?.({target:input});
 assert.equal(s.find('[data-budget]'),input,'blurring the budget must not replace the focused input');
 assert.ok(s.root.querySelectorAll('a').includes(vehicleLink),'the next clicked result must remain connected');
 const apply=s.root.querySelectorAll('button').find(n=>/Apply.*budget/i.test(n.textContent));
 assert.ok(apply,'an explicit control applies the changed results budget');
 apply.listeners.click();
 assert.equal(s.state().budget,1);
 assert.equal(s.root.querySelectorAll('a').filter(n=>n.href?.startsWith('/vehicle-')).length,0);
 assert.match(s.root.innerHTML,/No listed vehicle matches/);
});

test('Short left drags, vertical movement and canceled pointers never become positive choices',async()=>{
 for(const gesture of [{dx:-30,dy:0},{dx:2,dy:30},{dx:0,dy:0,cancel:true}]){
  const s=await session(),card=s.find('[data-choice]');
  card.listeners.pointerdown({button:0,clientX:200,clientY:100,pointerId:1});
  card.listeners.pointermove({clientX:200+gesture.dx,clientY:100+gesture.dy,pointerId:1});
  if(gesture.cancel)card.listeners.pointercancel({pointerId:1});
  else card.listeners.pointerup({clientX:200+gesture.dx,clientY:100+gesture.dy,pointerId:1});
  card.listeners.click();
  assert.equal(s.state()?.step??0,0,JSON.stringify(gesture));
  assert.deepEqual(s.state()?.answers??{},{},JSON.stringify(gesture));
 }
 const tap=await session(),card=tap.find('[data-choice]');
 card.listeners.pointerdown({button:0,clientX:200,clientY:100,pointerId:1});
 card.listeners.pointerup({clientX:203,clientY:102,pointerId:1});card.listeners.click();
 assert.equal(tap.state().step,1,'a true tap still chooses the feature');
});

test('Advancing a photo choice scrolls the next question into the mobile viewport',async()=>{
 const s=await session();s.find('[data-choice]').listeners.click();
 const heading=s.find('[data-heading]');
 assert.ok(heading.scrolls.length>0,'the next heading must be revealed after a lower stacked photo is chosen');
 assert.notEqual(heading.scrolls.at(-1).behavior,'smooth','reduced motion is respected');
});

test('Every selectable photo can be excluded with a visible button and restored without a gesture',async()=>{
 const s=await session(),choices=s.root.querySelectorAll('[data-choice]').filter(n=>!n.disabled);
 assert.ok(choices.length>1);
 for(const card of choices)assert.ok(s.find(`[data-reject="${card.dataset.choice}"]`));
 const id=choices[0].dataset.choice;
 s.find(`[data-reject="${id}"]`).listeners.click();
 assert.deepEqual(s.state().answers.screen,['reject:'+id]);
 s.find(`[data-restore="${id}"]`).listeners.click();
 assert.equal(s.state().answers.screen,undefined);
 assert.equal(s.find(`[data-choice="${id}"]`).disabled,false);
});

test('A second pointer cannot replace a swipe, and vertical scrolling cannot turn into a selection',async()=>{
 const s=await session(),card=s.find('[data-choice]');
 card.listeners.pointerdown({button:0,isPrimary:true,clientX:200,clientY:100,pointerId:1});
 card.listeners.pointerdown({button:0,isPrimary:false,clientX:0,clientY:100,pointerId:2});
 card.listeners.pointerup({clientX:200,clientY:100,pointerId:2});
 assert.deepEqual(s.state().answers,{});
 card.listeners.pointermove({clientX:201,clientY:130,pointerId:1});
 card.listeners.pointerup({clientX:350,clientY:130,pointerId:1});
 card.listeners.click({detail:1});
 assert.deepEqual(s.state().answers,{});
 assert.equal(s.state().step,0);
});

test('Lost capture cancels a gesture, while keyboard activation still works afterward',async()=>{
 const s=await session(),card=s.find('[data-choice]');
 card.listeners.pointerdown({button:0,clientX:200,clientY:100,pointerId:1});
 card.listeners.lostpointercapture({pointerId:1});
 card.listeners.pointerup({clientX:350,clientY:100,pointerId:1});
 card.listeners.click({detail:1});
 assert.deepEqual(s.state().answers,{});
 card.listeners.click({detail:0});
 assert.equal(s.state().step,1);
});

test('Changing condition keeps keyboard focus on the rebuilt condition field',async()=>{
 const s=await session();
 s.find('[data-condition]').listeners.change({target:{value:'Both'}});
 assert.equal(s.state().condition,'Both');
 assert.equal(s.find('[data-condition]').focused,true);
});

test('An unavailable photo cannot be chosen through the card or single-choice positive control',async()=>{
 const s=await session();s.action('skip').listeners.click();s.action('skip').listeners.click();
 assert.equal(s.state().step,2);const card=s.find('[data-choice]'),want=s.find('[data-pick]');
 card.querySelector('img').listeners.error();
 assert.equal(card.disabled,true);assert.equal(want.disabled,true);
 want.listeners.click();
 card.listeners.keydown({key:'ArrowRight',preventDefault(){}});
 assert.equal(s.state().step,2);
 assert.equal(s.state().answers.roof,undefined);
 s.action('skip').listeners.click();
 assert.equal(s.state().step,3,'No preference remains a working fallback');
});

test('Returning to the photo guide restores working undo history',async()=>{
 const original=await session();original.find('[data-choice]').listeners.click();
 const saved=original.state();assert.ok(saved.undoStack?.length);
 const restored=await session(saved),undo=restored.action('back');
 assert.equal(undo.disabled,false);undo.listeners.click();
 assert.equal(restored.state().step,0);assert.deepEqual(restored.state().answers,{});
});

test('An explicit URL budget overrides an older saved budget, including clearing the budget',async()=>{
 const saved={model:'ram-1500',answers:{screen:'r12527-dashboard'},budget:45000,step:1,condition:'New',done:false};
 for(const [query,expected] of [['?maxPrice=60000',60000],['?maxPrice=0',0]]){
  const s=await session(saved,query);
  assert.equal(s.find('[data-budget]').value,expected?String(expected):'');
  s.action('skip').listeners.click();
  assert.equal(s.state().budget,expected);
 }
});

test('Restored undo snapshots discard unsupported answers and clamp invalid steps',async()=>{
 const s=await session({model:'ram-1500',answers:{screen:'r12527-dashboard'},budget:45000,step:1,condition:'New',done:false,undoStack:[null,'invalid',{answers:{screen:['reject:r12527-dashboard','reject:unsupported'],roof:'fake'},step:-10,done:false}]});
 const undo=s.action('back');assert.equal(undo.disabled,false);undo.listeners.click();
 assert.equal(s.state().step,0);
 assert.deepEqual(s.state().answers,{screen:['reject:r12527-dashboard']});
 assert.equal(s.action('back').disabled,true,'invalid snapshots are not kept as undo actions');
});

test('Two left swipes remain on the screen question, right advances, and undo restores both exclusions',async()=>{
 const s=await session();
 for(const id of ['r12546-dashboard','r12527-dashboard']){
  const card=s.root.querySelectorAll('[data-choice]').find(n=>n.dataset.choice===id);
  assert.ok(card);card.listeners.keydown({key:'ArrowLeft',preventDefault(){}});
  assert.equal(s.state().step,0);
 }
 assert.deepEqual(s.state().answers.screen,['reject:r12546-dashboard','reject:r12527-dashboard']);
 s.root.querySelectorAll('[data-choice]').find(n=>n.dataset.choice==='r12315-dashboard').listeners.keydown({key:'ArrowRight',preventDefault(){}});
 assert.equal(s.state().step,1);assert.equal(s.state().answers.screen,'r12315-dashboard');
 s.action('back').listeners.click();
 assert.equal(s.state().step,0);assert.deepEqual(s.state().answers.screen,['reject:r12546-dashboard','reject:r12527-dashboard']);
});

test('A fresh guide introduces the actual Tradesman base trim, and restart returns there',async()=>{
 const s=await session(null,'',{autoStart:false});
 assert.equal(s.state().started,false);
 assert.match(s.root.innerHTML,/Tradesman/);
 assert.match(s.root.innerHTML,/8\.4/);
 assert.match(s.root.innerHTML,/vinyl/i);
 assert.match(s.root.innerHTML,/4-way manual/i);
 assert.equal(s.root.querySelectorAll('[data-choice]').length,0,'upgrade choices come after the base overview');
 assert.ok(s.action('start'));s.action('start').listeners.click();
 assert.equal(s.state().started,true);
 s.find('[data-choice]').listeners.click();s.action('results').listeners.click();s.action('restart').listeners.click();
 assert.equal(s.state().started,false);assert.deepEqual(s.state().answers,{});
 assert.ok(s.action('start'));assert.match(s.root.innerHTML,/Tradesman/);
});

test('The Express manual-seat photograph retains its actual trim identity in the Tradesman-led guide',async()=>{
 const s=await session();s.action('skip').listeners.click();s.action('skip').listeners.click();s.action('skip').listeners.click();
 const photo=s.root.querySelectorAll('[data-choice]').find(n=>n.dataset.choice==='r12196-manual-seat');
 assert.ok(photo);assert.match(photo.textContent,/Photo:[\s\S]*EXPRESS/i);
 assert.match(photo.querySelector('img').getAttribute('alt'),/EXPRESS/i);
 assert.doesNotMatch(photo.querySelector('img').getAttribute('alt'),/installed in[^;]*TRADESMAN/i);
});

test('The 12-inch screen shows its optional Express trim route before selection',async()=>{
 const s=await session(),photo=s.root.querySelectorAll('[data-choice]').find(n=>n.dataset.choice==='r12527-dashboard');
 assert.ok(photo);assert.match(photo.textContent,/Express/i);
 assert.match(photo.textContent,/optional|option/i);
 assert.equal(photo.disabled,false);photo.listeners.click();
 assert.equal(s.state().answers.screen,'r12527-dashboard');
 assert.match(s.root.innerHTML,/Current trim: Express/i);
});

test('Deluxe cloth selection prevents a conflicting manual driver-seat choice',async()=>{
 const s=await session();s.action('skip').listeners.click();
 const cloth=s.root.querySelectorAll('[data-choice]').find(n=>n.dataset.choice==='r12527-cloth');
 assert.ok(cloth);cloth.listeners.click();s.action('skip').listeners.click();
 const manual=s.root.querySelectorAll('[data-choice]').find(n=>n.dataset.choice==='r12196-manual-seat');
 assert.ok(manual);assert.equal(manual.disabled,true);
 manual.listeners.keydown({key:'ArrowRight',preventDefault(){}});
 assert.equal(s.state().answers['driver-seat'],undefined);
 assert.equal(s.state().step,3);
 const power=s.root.querySelectorAll('[data-choice]').find(n=>n.dataset.choice==='r12527-power-seat');
 assert.equal(power.disabled,false);power.listeners.click();
 assert.equal(s.state().answers['driver-seat'],'r12527-power-seat');
});

test('Trim and VIN evidence remain independent of budget while incompatible choices stay blocked',async()=>{
 const available=await session(),knownVINPhoto=available.root.querySelectorAll('[data-choice]').find(n=>n.dataset.choice==='r12315-dashboard');
 assert.equal(knownVINPhoto.disabled,false,'verified matching inventory supports this sticker-exact size');
 knownVINPhoto.listeners.click();assert.equal(available.state().answers.screen,'r12315-dashboard');
 const noStock=await session(null,'?maxPrice=1');
 const proven=noStock.root.querySelectorAll('[data-choice]').find(n=>n.dataset.choice==='r12315-dashboard');
 assert.equal(proven.disabled,false,'a verified configuration remains possible even above the current budget');
 assert.match(proven.textContent,/No matches|0 matches/);
 const factoryRoute=noStock.root.querySelectorAll('[data-choice]').find(n=>n.dataset.choice==='r12527-dashboard');
 assert.match(factoryRoute.textContent,/No matches|0 matches/);
 assert.equal(factoryRoute.disabled,false,'a documented factory route remains explorable outside current budget/stock');
 factoryRoute.listeners.click();assert.equal(noStock.state().answers.screen,'r12527-dashboard');
 const noProof=await session({model:'ram-1500',started:true,answers:{'driver-seat':'r12196-manual-seat'},step:0,budget:0,condition:'Both',done:false});
 const incompatible=noProof.root.querySelectorAll('[data-choice]').find(n=>n.dataset.choice==='r12315-dashboard');
 assert.equal(incompatible.disabled,true,'the 14.4-inch/manual-seat combination remains incompatible');
 incompatible.listeners.keydown({key:'ArrowRight',preventDefault(){}});
 assert.equal(noProof.state().answers.screen,undefined);
 assert.equal(noProof.state().answers['driver-seat'],'r12196-manual-seat');
});

test('A package-required power seat is labeled as already included with the chosen seats',async()=>{
 const s=await session();s.action('skip').listeners.click();
 s.root.querySelectorAll('[data-choice]').find(n=>n.dataset.choice==='r12527-cloth').listeners.click();
 s.action('skip').listeners.click();
 const power=s.root.querySelectorAll('[data-choice]').find(n=>n.dataset.choice==='r12527-power-seat');
 assert.equal(power.disabled,false);
 assert.match(power.querySelector('.pg-route').textContent,/Included with your selected/i);
 assert.match(power.textContent,/not a separate additional upgrade/i);
 assert.doesNotMatch(power.querySelector('.pg-route').textContent,/^(?:Option on|Requires)/i);
});
