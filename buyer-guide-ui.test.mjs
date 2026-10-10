import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {buyerModels,buyerLineup,trimAssessment} from './buyer-catalog.mjs';
import {registerBuyerLineup} from './buyer-sources.mjs';
import {buyerVehicleTrim} from './buyer-evidence.mjs';
import {preferenceChecks} from './preference-evidence.mjs';
import {photoPreferences,encodePreferences,readPreferences} from './shopping-preferences.mjs';
import {createPhotoGuide,swipeDecision} from './photo-guide-engine.mjs';
import {createPhotoTrimPath} from './photo-trim-path.mjs';
const read=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url)));
const guide=read('./trim-standard-data.json'),index=read('./data/factory/index.json');
const catalog={guide,index,models:buyerModels(guide,index)};
async function session(){
 const storage=new Map();
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
 const errors=[];
 const context={loadBuyerCatalog:async()=>catalog,loadBuyerLineup:async id=>{const m=catalog.models.find(m=>m.id===id);return registerBuyerLineup(buyerLineup(m,m.meta?read('./data/factory/'+m.meta.file):null));},trimAssessment,buyerVehicleTrim,preferenceChecks,photoPreferences,encodePreferences,readPreferences,createPhotoGuide,createPhotoTrimPath,swipeDecision,URLSearchParams,Intl,Date,structuredClone,console:{error:e=>errors.push(e)},location:{search:''},sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},document:{getElementById:()=>root,querySelector:()=>null,createElement:tag=>make(tag)},fetch:async path=>({ok:true,json:async()=>read('.'+path)})};
 const source=fs.readFileSync(new URL('./buyer-guide.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
 await vm.runInNewContext('(async()=>{'+source+'})()',context);
 const find=selector=>root.querySelector(selector);
 const click=async selector=>{const n=find(selector);assert.ok(n,'Missing control '+selector);assert.notEqual(n.disabled,true,'Disabled control '+selector);return n.onclick?n.onclick({detail:1}):n.listeners.click?.({detail:1});};
 return {root,find,click,errors,state:()=>JSON.parse(storage.get('carswithsam-complete-guide-v1')||'null')};
}
async function ram(){const s=await session();await s.click('[data-model="ram-1500"]');await s.click('[data-trim=""]');assert.deepEqual(s.errors,[]);return s;}
test('the deployed entry uses the tested buyer guide and restores approved photo-card classes',async()=>{
 assert.match(fs.readFileSync(new URL('./perfect-match.html',import.meta.url),'utf8'),/src="\/buyer-guide\.mjs/);
 const s=await ram();assert.match(s.root.innerHTML,/Photo 1 of 4/);
 assert.match(s.root.innerHTML,/class="pg-card"/);assert.match(s.root.innerHTML,/class="pg-photo-frame"/);
 assert.ok(s.find('[data-live-count]'));assert.match(s.root.innerHTML,/No preference/);
});
test('photo choices narrow actual VINs and the last photo leads to matches without text-card drift',async()=>{
 const s=await ram(),initial=s.find('[data-live-count]').textContent;
 await s.click('[data-card="r12315-dashboard"]');
 const narrowed=s.find('[data-live-count]').textContent;assert.ok(parseInt(narrowed)<parseInt(initial),initial+' -> '+narrowed);
 await s.click('[data-card="r12315-leather"]');
 await s.click('[data-answer="skip"]');
 await s.click('[data-answer="skip"]');
 assert.match(s.root.innerHTML,/Your vehicle matches/);assert.match(s.root.innerHTML,/Stock R12315/);
 assert.doesNotMatch(s.root.innerHTML,/data-card="equipment-/);
 assert.ok(s.root.querySelectorAll('.bg-result-photo').length>0);
 assert.equal(s.state().answers.screen,'r12315-dashboard');assert.deepEqual(s.errors,[]);
});
test('all-conflicting choices show an actionable empty result rather than a blank list',async()=>{
 const s=await ram();await s.click('[data-card="r12315-dashboard"]');
 await s.click('[data-card="r12546-vinyl-bench"]');await s.click('[data-action="results"]');
 assert.match(s.root.innerHTML,/No vehicles match all your choices/);
 assert.equal(s.root.querySelectorAll('[data-compare]').length,0);
});
test('factory equipment is explicit opt-in and excludes cards unavailable on the chosen trim',async()=>{
 const s=await session();await s.click('[data-model="ram-1500"]');await s.click('[data-trim="tradesman"]');
 await s.click('[data-action="all-equipment"]');
 const jump=s.find('[data-jump]');
 assert.ok(jump);assert.doesNotMatch(jump.textContent,/Backcountry Package|Hurricane High-Output/);
 await s.click('[data-action="photos"]');assert.match(s.root.innerHTML,/Photo 1 of 4/);
});
test('results budget edits preserve the clicked link until Apply budget',async()=>{
 const s=await ram();await s.click('[data-action="results"]');const input=s.find('[data-budget]'),link=s.root.querySelectorAll('a').find(n=>n.href?.startsWith('/vehicle-'));
 assert.ok(link);input.value='1';input.onchange?.();input.listeners.change?.({target:input});
 assert.equal(s.find('[data-budget]'),input);assert.ok(s.root.querySelectorAll('a').includes(link));
 await s.click('[data-action="apply-budget"]');assert.match(s.root.innerHTML,/No vehicles match all your choices/);assert.equal(s.state().budget,1);
});
test('swipe cancellation cannot become a choice; Back restores the prior narrowing',async()=>{
 const s=await ram(),c=s.find('[data-card="r12315-dashboard"]');
 c.onpointerdown({button:0,isPrimary:true,clientX:100,clientY:100,pointerId:1});c.onpointercancel();c.onclick({detail:1});
 assert.deepEqual(s.state().answers,{});
 c.onkeydown({key:'ArrowRight',preventDefault(){}});assert.equal(s.state().answers.screen,'r12315-dashboard');
 await s.click('[data-action="back"]');assert.deepEqual(s.state().answers,{});assert.match(s.root.innerHTML,/Photo 1 of 4/);
});
test('an unavailable photo disables both gesture and positive-button selection',async()=>{
 const s=await ram(),c=s.find('[data-card="r12315-dashboard"]');c.querySelector('img').listeners.error();
 assert.equal(c.disabled,true);assert.equal(s.find('[data-answer="r12315-dashboard"]').disabled,true);
 c.onclick({detail:0});assert.deepEqual(s.state().answers,{});
});
test('every reviewed photo lineup keeps photos until results',async()=>{
 for(const [id,count] of [['ram-3500',2],['chrysler-pacifica',2],['jeep-grand-cherokee',3],['wrangler',2]]){
  const s=await session();await s.click('[data-model="'+id+'"]');await s.click('[data-trim=""]');
  for(let step=0;step<count;step++){assert.match(s.root.innerHTML,/class="pg-photo-frame"/,id);await s.click('[data-answer="skip"]');}
  assert.match(s.root.innerHTML,/Your vehicle matches/,id);assert.deepEqual(s.errors,[]);
 }
});
test('vertical scrolling and second pointers do not choose a feature',async()=>{
 const s=await ram(),c=s.find('[data-card="r12315-dashboard"]');
 c.onpointerdown({button:0,isPrimary:true,clientX:100,clientY:100,pointerId:1});
 c.onpointermove({clientX:101,clientY:130,pointerId:1});
 c.onpointerdown({button:0,isPrimary:false,clientX:300,clientY:200,pointerId:2});
 c.onpointerup({clientX:300,clientY:130,pointerId:1});c.onclick({detail:1});
 assert.deepEqual(s.state().answers,{});
});
