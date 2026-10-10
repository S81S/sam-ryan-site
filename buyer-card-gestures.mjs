// Card gestures are horizontal only. The browser keeps vertical pan and pinch
// zoom; choosing/rejecting and advancing the guide remain the caller's job.
const interactive='a,button,input,select,textarea,summary,[contenteditable],[role="button"],[data-no-swipe]';
const finite=n=>Number.isFinite(n);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function buyerCardSwipeDecision(dx,dy,threshold=48){
 if(!finite(dx)||!finite(dy)||Math.abs(dx)<threshold||Math.abs(dx)<=Math.abs(dy)*1.25)return null;
 return dx<0?'reject':'choose';
}
export function attachBuyerCardGestures(card,options={}){
 const {onDecision=()=>{},canChoose=()=>true,canReject=()=>true,onFeedback=()=>{}}=options;
 const doc=options.document||card.ownerDocument,view=doc?.defaultView||globalThis;
 const pointerEvents=options.pointerEvents??('PointerEvent' in view);
 const reducedMotion=options.reducedMotion||(()=>view.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true);
 const now=options.now||(()=>Date.now()),oldStyles={touchAction:card.style.touchAction,userSelect:card.style.userSelect,webkitUserSelect:card.style.webkitUserSelect,transform:card.style.transform};
 const bindings=[],documentBindings=[];let active=null,suppressMouseUntil=0,disposed=false;
 card.style.touchAction='pan-y pinch-zoom';card.style.userSelect='none';card.style.webkitUserSelect='none';
 const ignored=e=>{const el=e.target?.nodeType===3?e.target.parentElement:e.target;return !!(el&&el!==card&&el.closest?.(interactive));};
 const allow=direction=>(direction==='choose'?canChoose:canReject)()!==false;
 const feedback=(phase,extra={})=>{card.dataset.swipeState=phase;card.dataset.swipeDirection=extra.direction||'';onFeedback({phase,...extra});};
 const restoreMotion=()=>{card.style.transform=oldStyles.transform||'';};
 const clearDocument=()=>{for(const [name,handler] of documentBindings.splice(0))doc?.removeEventListener?.(name,handler);};
 function end(){const old=active;active=null;clearDocument();restoreMotion();if(old?.captured)try{card.releasePointerCapture?.(old.id);}catch{}return old;}
 function cancel(reason='cancelled'){if(!active)return;const old=end();feedback('idle',{input:old.input,reason});}
 const listen=(name,handler,opts)=>{if(!doc?.addEventListener)return;doc.addEventListener(name,handler,opts);documentBindings.push([name,handler]);};
 const bind=(name,handler)=>{const key='on'+name,prior=card[key];card[key]=handler;bindings.push([key,handler,prior]);};
 function commit(direction,input,event){
  const allowed=allow(direction);feedback(allowed?'committed':'blocked',{direction,input,blocked:!allowed});
  if(allowed)onDecision(direction,{input,originalEvent:event});
 }
 function begin(e,input,id){
  if(disposed||card.isConnected===false||ignored(e)||!finite(e.clientX)||!finite(e.clientY))return;
  if(active){if(input==='touch'||e.pointerType==='touch')cancel('multiple-pointers');return;}
  const width=card.getBoundingClientRect?.().width||400;
  active={x:e.clientX,y:e.clientY,id,input,axis:null,captured:false,threshold:clamp(width*.12,32,48),width};
  feedback('tracking',{input});
  if(input==='pointer'&&pointerEvents)try{card.setPointerCapture?.(id);active.captured=typeof card.setPointerCapture==='function';}catch{}
  if(input==='pointer'&&pointerEvents){
   listen('pointermove',pointerMove);listen('pointerup',pointerUp);listen('pointercancel',pointerCancel);
   listen('pointerdown',e=>{if(active&&e.pointerId!==active.id&&(e.pointerType==='touch'||e.isPrimary===false))cancel('multiple-pointers');});
  }else if(input==='touch'){
   listen('touchmove',touchMove,{passive:false});listen('touchend',touchEnd);listen('touchcancel',()=>cancel());listen('touchstart',e=>{if(e.touches?.length>1)cancel('multiple-pointers');});
  }else{listen('mousemove',mouseMove);listen('mouseup',mouseUp);}
  listen('visibilitychange',()=>{if(doc.hidden)cancel('hidden');});
 }
 function move(e,id){
  if(!active||active.id!==id)return;
  if(card.isConnected===false){cancel('detached');return;}
  if(e.buttons===0&&active.input==='pointer'&&e.pointerType!=='touch'){cancel('released');return;}
  const dx=e.clientX-active.x,dy=e.clientY-active.y;if(!finite(dx)||!finite(dy))return;
  if(!active.axis&&Math.hypot(dx,dy)>8){if(Math.abs(dx)>Math.abs(dy)*1.25)active.axis='horizontal';else if(Math.abs(dy)>Math.abs(dx)*1.25)active.axis='vertical';}
  if(active.axis==='vertical'){cancel('vertical-scroll');return;}
  if(active.axis!=='horizontal')return;
  if(e.cancelable!==false)e.preventDefault?.();
  const direction=dx<0?'reject':'choose',blocked=!allow(direction),progress=clamp(Math.abs(dx)/active.threshold,0,1);
  if(!reducedMotion())card.style.transform=`translateX(${clamp(dx,-active.width*.7,active.width*.7)}px) rotate(${clamp(dx/28,-10,10)}deg)`;
  feedback('dragging',{input:active.input,direction,progress,blocked,dx,dy});
 }
 function finish(e,id){
  if(!active||active.id!==id)return;
  if(card.isConnected===false){cancel('detached');return;}
  const old=active,dx=e.clientX-old.x,dy=e.clientY-old.y;
  const direction=old.axis==='vertical'?null:buyerCardSwipeDecision(dx,dy,old.threshold);
  end();if(direction)commit(direction,old.input,e);else feedback('idle',{input:old.input,reason:'below-threshold'});
 }
 function pointerDown(e){
  if(e.isPrimary===false){if(active)cancel('multiple-pointers');return;}
  if(e.button!==undefined&&e.button!==0)return;
  begin(e,'pointer',e.pointerId);
 }
 function pointerMove(e){move(e,e.pointerId);}
 function pointerUp(e){finish(e,e.pointerId);}
 function pointerCancel(e){if(active&&(!e||e.pointerId===undefined||active.id===e.pointerId))cancel();}
 function mouseDown(e){if(now()<suppressMouseUntil||(e.button!==undefined&&e.button!==0))return;begin(e,'pointer','mouse');}
 function mouseMove(e){move(e,'mouse');}
 function mouseUp(e){finish(e,'mouse');}
 function touchStart(e){
  suppressMouseUntil=now()+800;
  if(e.touches?.length!==1){cancel('multiple-pointers');return;}
  const t=e.touches[0];begin({...t,clientX:t.clientX,clientY:t.clientY,target:e.target},'touch',t.identifier);
 }
 function touchMove(e){
  if(e.touches?.length!==1){cancel('multiple-pointers');return;}
  const t=e.touches[0];move({clientX:t.clientX,clientY:t.clientY,cancelable:e.cancelable,preventDefault:()=>e.preventDefault?.()},t.identifier);
 }
 function touchEnd(e){
  suppressMouseUntil=now()+800;if(e.touches?.length){cancel('multiple-pointers');return;}
  const t=Array.from(e.changedTouches||[]).find(t=>t.identifier===active?.id);if(t)finish({clientX:t.clientX,clientY:t.clientY,originalEvent:e},t.identifier);
 }
 bind('pointerdown',pointerDown);bind('pointermove',pointerMove);bind('pointerup',pointerUp);bind('pointercancel',pointerCancel);
 bind('lostpointercapture',e=>{if(active&&active.id===e.pointerId)cancel('capture-lost');});
 if(!pointerEvents){bind('mousedown',mouseDown);bind('mousemove',mouseMove);bind('mouseup',mouseUp);bind('touchstart',touchStart);bind('touchmove',touchMove);bind('touchend',touchEnd);bind('touchcancel',()=>cancel());}
 bind('dragstart',e=>{if(!ignored(e))e.preventDefault?.();});
 bind('keydown',e=>{
  if(disposed||ignored(e)||e.repeat||e.altKey||e.ctrlKey||e.metaKey)return;
  const direction=e.key==='ArrowLeft'?'reject':['ArrowRight','Enter',' '].includes(e.key)?'choose':null;if(!direction)return;
  e.preventDefault?.();cancel('keyboard');commit(direction,'keyboard',e);
 });
 return ()=>{if(disposed)return;cancel('disposed');disposed=true;clearDocument();for(const [key,handler,prior] of bindings)if(card[key]===handler)card[key]=prior;Object.assign(card.style,oldStyles);delete card.dataset.swipeState;delete card.dataset.swipeDirection;};
}
