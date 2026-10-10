import test from 'node:test';
import assert from 'node:assert/strict';
import {attachBuyerCardGestures,buyerCardSwipeDecision} from './buyer-card-gestures.mjs';

function fixture(options={}){
 const events=new Map(),decisions=[],feedback=[],captures=[],released=[];
 const doc={defaultView:{PointerEvent:class{},matchMedia:()=>({matches:false})},addEventListener(name,fn){if(!events.has(name))events.set(name,new Set());events.get(name).add(fn);},removeEventListener(name,fn){events.get(name)?.delete(fn);},emit(name,event){for(const fn of [...events.get(name)||[]])fn(event);}};
 const card={ownerDocument:doc,dataset:{},style:{transform:'',rotate:'-.6deg'},isConnected:true,getBoundingClientRect:()=>({width:400}),setPointerCapture:id=>captures.push(id),releasePointerCapture:id=>released.push(id)};
 const cleanup=attachBuyerCardGestures(card,{onDecision:(direction,meta)=>decisions.push({direction,input:meta.input}),onFeedback:state=>feedback.push(state),...options});
 const pointer=(x=0,y=0,extra={})=>({pointerId:1,pointerType:'touch',button:0,isPrimary:true,clientX:x,clientY:y,target:card,cancelable:true,preventDefault(){this.prevented=true;},...extra});
 return {card,doc,events,decisions,feedback,captures,released,cleanup,pointer};
}

test('horizontal decisions reject jitter, vertical swipes and invalid coordinates',()=>{
 assert.equal(buyerCardSwipeDecision(47,0),null);assert.equal(buyerCardSwipeDecision(48,0),'choose');assert.equal(buyerCardSwipeDecision(-48,0),'reject');
 for(const [x,y] of [[100,100],[30,100],[NaN,0],[100,Infinity]])assert.equal(buyerCardSwipeDecision(x,y),null);
});
test('a pointer drag follows the finger visibly and commits exactly once on release',()=>{
 const s=fixture();s.card.onpointerdown(s.pointer(100,100));const move=s.pointer(155,103);s.card.onpointermove(move);
 assert.match(s.card.style.transform,/translateX\(55px\)/);assert.equal(s.card.style.rotate,'-.6deg');assert.equal(move.prevented,true);
 assert.equal(s.card.dataset.swipeState,'dragging');assert.equal(s.card.dataset.swipeDirection,'choose');assert.equal(s.feedback.at(-1).progress,1);
 s.card.onpointerup(s.pointer(155,103));s.doc.emit('pointerup',s.pointer(155,103));
 assert.deepEqual(s.decisions,[{direction:'choose',input:'pointer'}]);assert.equal(s.card.style.transform,'');assert.deepEqual(s.released,[1]);
});
test('a narrow mobile card accepts a deliberate 36px drag without requiring desktop travel',()=>{
 const s=fixture();s.card.getBoundingClientRect=()=>({width:280});s.card.onpointerdown(s.pointer());s.card.onpointerup(s.pointer(-36,1));
 assert.deepEqual(s.decisions,[{direction:'reject',input:'pointer'}]);
});
test('vertical scrolling locks out selection even if the finger later moves sideways',()=>{
 const s=fixture();s.card.onpointerdown(s.pointer());const move=s.pointer(2,20);s.card.onpointermove(move);
 assert.equal(move.prevented,undefined);assert.equal(s.feedback.at(-1).reason,'vertical-scroll');s.card.onpointerup(s.pointer(100,20));assert.deepEqual(s.decisions,[]);
 s.card.onpointerdown(s.pointer());s.card.onpointerup(s.pointer(80,80));assert.deepEqual(s.decisions,[]);
});
test('blocked positive choices report feedback while left rejection remains available',()=>{
 const s=fixture({canChoose:()=>false,canReject:()=>true});
 s.card.onpointerdown(s.pointer());s.card.onpointermove(s.pointer(80,0));assert.equal(s.feedback.at(-1).blocked,true);s.card.onpointerup(s.pointer(80,0));
 assert.deepEqual(s.decisions,[]);assert.equal(s.feedback.at(-1).phase,'blocked');assert.equal(s.feedback.at(-1).direction,'choose');
 s.card.onpointerdown(s.pointer());s.card.onpointerup(s.pointer(-80,0));assert.deepEqual(s.decisions,[{direction:'reject',input:'pointer'}]);
});
test('capture failure still permits releasing outside the card without throwing',()=>{
 const s=fixture();s.card.setPointerCapture=()=>{throw Error('NotFoundError');};s.card.onpointerdown(s.pointer());
 s.doc.emit('pointermove',s.pointer(-70,2));s.doc.emit('pointerup',s.pointer(-70,2));assert.equal(s.decisions[0].direction,'reject');
 assert.ok([...s.events.values()].every(handlers=>handlers.size===0),'temporary document listeners are cleaned');
});
test('pinch, cancellation and lost capture never commit the pending first finger',()=>{
 for(const cancel of [s=>s.card.onpointerdown(s.pointer(10,10,{pointerId:2,isPrimary:false})),s=>s.doc.emit('pointerdown',s.pointer(10,10,{pointerId:2,isPrimary:false})),s=>s.card.onpointercancel(s.pointer()),s=>s.card.onlostpointercapture(s.pointer())]){
  const s=fixture();s.card.onpointerdown(s.pointer());s.card.onpointermove(s.pointer(70,0));cancel(s);s.card.onpointerup(s.pointer(100,0));assert.deepEqual(s.decisions,[]);assert.equal(s.card.style.transform,'');
 }
});
test('links, controls and editable child content keep their normal pointer and keyboard behavior',()=>{
 const s=fixture(),control={closest:()=>({tagName:'BUTTON'})};
 s.card.onpointerdown(s.pointer(0,0,{target:control}));s.card.onpointerup(s.pointer(100,0,{target:control}));
 const key=s.pointer(0,0,{key:'Enter',target:control});s.card.onkeydown(key);assert.equal(key.prevented,undefined);assert.deepEqual(s.decisions,[]);
 const native=s.pointer();s.card.ondragstart(native);assert.equal(native.prevented,true);const link=s.pointer(0,0,{target:control});s.card.ondragstart(link);assert.equal(link.prevented,undefined);
});
test('keyboard choices work once and preserve directional guards, repeats and modifier shortcuts',()=>{
 const s=fixture({canChoose:()=>false});const blocked=s.pointer(0,0,{key:'ArrowRight'});s.card.onkeydown(blocked);assert.equal(blocked.prevented,true);assert.equal(s.feedback.at(-1).phase,'blocked');
 s.card.onkeydown(s.pointer(0,0,{key:'ArrowLeft'}));assert.deepEqual(s.decisions,[{direction:'reject',input:'keyboard'}]);
 for(const extra of [{key:'ArrowLeft',repeat:true},{key:'ArrowLeft',ctrlKey:true},{key:'ArrowLeft',altKey:true},{key:'ArrowLeft',metaKey:true}])s.card.onkeydown(s.pointer(0,0,extra));assert.equal(s.decisions.length,1);
 const open=fixture();for(const key of ['Enter',' ','ArrowRight'])open.card.onkeydown(open.pointer(0,0,{key}));assert.equal(open.decisions.length,3);
});
test('fallback touch events support swiping and suppress the following compatibility mouse event',()=>{
 let time=0;const s=fixture({pointerEvents:false,now:()=>time}),touch=(x,y=0)=>({identifier:4,clientX:x,clientY:y});
 s.card.ontouchstart({target:s.card,touches:[touch(0)]});s.doc.emit('touchmove',{touches:[touch(60)],cancelable:true,preventDefault(){this.prevented=true;}});
 s.doc.emit('touchend',{touches:[],changedTouches:[touch(60)]});assert.deepEqual(s.decisions,[{direction:'choose',input:'touch'}]);
 s.card.onmousedown(s.pointer());s.card.onmouseup(s.pointer(-80,0));assert.equal(s.decisions.length,1);
 time=900;s.card.onmousedown(s.pointer());s.doc.emit('mouseup',s.pointer(-80,0));assert.equal(s.decisions.length,2);assert.equal(s.decisions[1].direction,'reject');
});
test('fallback touch preserves pinch and vertical scrolling without preventing native events',()=>{
 const s=fixture({pointerEvents:false}),t=(id,x,y)=>({identifier:id,clientX:x,clientY:y});
 s.card.ontouchstart({target:s.card,touches:[t(1,0,0)]});s.card.ontouchstart({target:s.card,touches:[t(1,0,0),t(2,20,0)]});
 s.card.ontouchend({touches:[],changedTouches:[t(1,100,0)]});assert.deepEqual(s.decisions,[]);
 s.card.ontouchstart({target:s.card,touches:[t(1,0,0)]});const move={touches:[t(1,0,30)],preventDefault(){this.prevented=true;}};s.card.ontouchmove(move);assert.equal(move.prevented,undefined);
});
test('reduced motion keeps clear gesture state without moving the card',()=>{
 const s=fixture({reducedMotion:()=>true});s.card.onpointerdown(s.pointer());s.card.onpointermove(s.pointer(60,0));assert.equal(s.card.style.transform,'');assert.equal(s.card.dataset.swipeDirection,'choose');
 s.card.onpointerup(s.pointer(60,0));assert.equal(s.decisions.length,1);
});
test('removed cards and already-released mouse buttons cannot commit stale choices',()=>{
 const s=fixture();s.card.onpointerdown(s.pointer());s.card.isConnected=false;s.card.onpointerup(s.pointer(100,0));assert.deepEqual(s.decisions,[]);
 const mouse=fixture();mouse.card.onpointerdown(mouse.pointer(0,0,{pointerType:'mouse'}));mouse.card.onpointermove(mouse.pointer(80,0,{pointerType:'mouse',buttons:0}));mouse.card.onpointerup(mouse.pointer(100,0,{pointerType:'mouse'}));assert.deepEqual(mouse.decisions,[]);
});
test('cleanup restores handlers/styles and removes active document tracking',()=>{
 const s=fixture();s.card.onpointerdown(s.pointer());s.card.onpointermove(s.pointer(60,0));s.cleanup();s.cleanup();
 assert.equal(s.card.onpointerdown,undefined);assert.equal(s.card.style.touchAction,undefined);assert.equal(s.card.style.transform,'');assert.equal(s.card.dataset.swipeState,undefined);
 assert.ok([...s.events.values()].every(handlers=>handlers.size===0));s.doc.emit('pointerup',s.pointer(100,0));assert.deepEqual(s.decisions,[]);
});
