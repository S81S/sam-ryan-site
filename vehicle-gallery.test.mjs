import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('./vehicle-page-context.js',import.meta.url),'utf8');
function gallery({reducedMotion=false}={}){
 const element=()=>({attrs:{},events:{},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},addEventListener(k,f){this.events[k]=f;},focus(){this.focused=true;}});
 const main=Object.assign(element(),{src:'initial-responsive-photo',alt:'Selected vehicle',attrs:{srcset:'initial-photo 960w'}});
 const count=element(),previous=element(),next=element(),scrolls=[];
 const strip={clientWidth:300,scrollTo:o=>scrolls.push(o)};
 const links=Array.from({length:3},(_,i)=>Object.assign(element(),{href:`photo-${i+1}`,offsetLeft:i*120,clientWidth:100,parentNode:strip,querySelector:()=>({alt:`Vehicle view ${i+1}`})}));
 const document={getElementById:()=>null,querySelector:s=>({'.vehicle-photo':main,'.photo-count':count,'.photo-prev':previous,'.photo-next':next}[s]),querySelectorAll:s=>s==='.photo-strip a'?links:[]};
 vm.runInNewContext(source,{document,location:{search:''},window:{matchMedia:()=>({matches:reducedMotion})},URL,URLSearchParams},{importModuleDynamically:async()=>{throw Error('No network in gallery test');}});
 const fire=(el,name,data={})=>{const event={prevented:false,preventDefault(){this.prevented=true;},...data};el.events[name]?.(event);return event;};
 const touch=(x,y,id=1)=>({clientX:x,clientY:y,identifier:id});
 const swipe=(x,y)=>{fire(main,'touchstart',{touches:[touch(100,100)]});fire(main,'touchend',{touches:[],changedTouches:[touch(x,y)]});};
 return {main,count,previous,next,links,scrolls,fire,touch,swipe};
}

test('gallery initializes selection without discarding the responsive first photo',()=>{
 const g=gallery();
 assert.equal(g.main.src,'initial-responsive-photo');
 assert.equal(g.main.attrs.srcset,'initial-photo 960w');
 assert.deepEqual(g.links.map(a=>a.attrs['aria-current']),['true','false','false']);
 assert.equal(g.count.attrs['aria-live'],'polite');
});

test('vertical scrolling and small gestures do not change the photo; horizontal swipes do',()=>{
 const g=gallery();
 g.swipe(30,250);assert.equal(g.main.src,'initial-responsive-photo');
 g.swipe(75,100);assert.equal(g.main.src,'initial-responsive-photo');
 g.swipe(30,105);assert.equal(g.main.src,'photo-2');
 assert.equal(g.main.alt,'Vehicle view 2');
 assert.equal(g.count.textContent,'2 / 3');
 assert.equal(g.main.attrs.srcset,undefined);
});

test('pinch gestures, touch cancellation and unrelated touches never swipe the gallery',()=>{
 const g=gallery();
 g.fire(g.main,'touchstart',{touches:[g.touch(100,100)]});
 g.fire(g.main,'touchmove',{touches:[g.touch(60,100),g.touch(200,200,2)]});
 g.fire(g.main,'touchend',{touches:[],changedTouches:[g.touch(0,100)]});
 assert.equal(g.main.src,'initial-responsive-photo');
 g.fire(g.main,'touchstart',{touches:[g.touch(100,100)]});g.fire(g.main,'touchcancel');
 g.fire(g.main,'touchend',{touches:[],changedTouches:[g.touch(0,100)]});
 assert.equal(g.main.src,'initial-responsive-photo');
 g.fire(g.main,'touchstart',{touches:[g.touch(100,100)]});
 g.fire(g.main,'touchend',{touches:[],changedTouches:[g.touch(0,100,2)]});
 assert.equal(g.main.src,'initial-responsive-photo');
});

test('gallery honors reduced motion and provides keyboard thumbnail navigation with wrapping',()=>{
 const g=gallery({reducedMotion:true});
 const event=g.fire(g.links[0],'keydown',{key:'ArrowLeft'});
 assert.equal(event.prevented,true);assert.equal(g.main.src,'photo-3');assert.equal(g.links[2].focused,true);
 assert.equal(g.scrolls.at(-1).behavior,'instant');
 g.fire(g.links[2],'keydown',{key:'Home'});assert.equal(g.main.src,'photo-1');
 g.fire(g.links[0],'keydown',{key:'End'});assert.equal(g.main.src,'photo-3');
 g.fire(g.next,'click');assert.equal(g.main.src,'photo-1');
 g.fire(g.previous,'click');assert.equal(g.main.src,'photo-3');
});

test('modified thumbnail clicks keep the browser open-in-new-tab behavior',()=>{
 const g=gallery();
 assert.equal(g.fire(g.links[1],'click',{ctrlKey:true}).prevented,false);
 assert.equal(g.fire(g.links[1],'click',{metaKey:true}).prevented,false);
 assert.equal(g.fire(g.links[1],'click',{button:1}).prevented,false);
 assert.equal(g.main.src,'initial-responsive-photo');
 assert.equal(g.fire(g.links[1],'click',{button:0}).prevented,true);
 assert.equal(g.main.src,'photo-2');assert.equal(g.scrolls.at(-1).behavior,'smooth');
});
