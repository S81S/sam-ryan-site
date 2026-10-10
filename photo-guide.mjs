import {photoPreferences,encodePreferences,readPreferences} from './shopping-preferences.mjs';
import {createPhotoGuide,swipeDecision} from './photo-guide-engine.mjs';
import {createPhotoTrimPath} from './photo-trim-path.mjs';
const root=document.getElementById('photo-finder');
const entryParams=new URLSearchParams(location.search);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number.isFinite(n)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n):'Ask for price';
const KEY='carswithsam-photo-guide-v1';
let undoStack=[];
let choosingModel=false;
const failedPhotos=new Set();
let engine,trimPath,inventory,state={model:'',answers:{},step:0,budget:0,condition:'New',started:false,done:false,showAll:false},live='';
const lineup=()=>engine.lineups.find(l=>l.id===state.model)||engine.lineups[0];
const activeMatches=()=>engine.matches(lineup(),state.answers,state.budget,state.condition);
const pathState=()=>trimPath.resolve(lineup(),state.answers);
function choiceRoute(q,choice){
 const route=trimPath.offer(lineup(),state.answers,q.id,choice.id);
 const verified=engine.matches(lineup(),{...state.answers,[q.id]:choice.id},0,'Both');
 const uncertain=route.status==='unknown'||route.status==='unavailable';
 const includedBy=pathState().requirements?.find(r=>r.requiredChoiceId===choice.id);
 return {...route,verified,selectable:uncertain?verified.length>0:route.selectable,
  title:includedBy?'Included with your selected '+(engine.photos.get(includedBy.choiceId)?.label||'feature'):uncertain?(verified.length?'Verified vehicle example':'Not verified with these choices'):
   route.availability==='standard'?'Included on '+route.trim.name:
   route.availability==='optional'?'Optional on '+route.trim.name:'Available on '+route.trim.name,
  detail:includedBy?'This feature comes with the configuration you already selected. It is not a separate additional upgrade.':uncertain?(verified.length?(choice.availability||route.note||'This feature is installed on the pictured vehicle.')+' This combination is verified on stock '+verified[0].stock+'.':'No verified route combines this photo with your other choices. Change an earlier preference to explore it.'):(route.note||'')};
}
function pathSummary(){
 const p=pathState();
 const excludedStandards=(p.unresolved||[]).filter(c=>c.rejected&&c.availability==='standard');
 return `<aside class="pg-trim-summary"><span class="pg-step">Starting trim: ${esc(p.base?.name||'Check factory guide')}</span><h3>${p.status==='supported'&&p.current?'Current trim: '+esc(p.current.name):'Your selected features'}</h3><p>${p.status==='supported'?'This trim offers the selected features in the guide. Package combinations depend on the vehicle; the matches below check installed equipment by VIN.':'Your selections are checked against the equipment installed in each matching vehicle. The feature cards explain the applicable trim or package.'}</p>${p.requirements?.length?'<ul class="pg-linked-list">'+p.requirements.map(r=>'<li>'+esc(engine.photos.get(r.choiceId)?.label||r.choiceId)+' includes '+esc(engine.photos.get(r.requiredChoiceId)?.label||r.requiredChoiceId)+'</li>').join('')+'</ul>':''}${excludedStandards.map(c=>`<p class="pg-linked">${esc(engine.photos.get(c.choiceId)?.label||c.choiceId)} is included on ${esc(p.current?.name||'this trim')}. Your preferences exclude it.</p>`).join('')}</aside>`;
}
function baseView(){
 const p=pathState();
 return `<div class="pg-base"><span class="pg-badge">Your starting point · Base trim</span><h3>Standard equipment on the ${esc(p.base?.name||'base trim')}</h3><p>${esc(lineup().name)} starts here. See what is included, then choose the features you want to keep or upgrade.</p>${p.shopperScope?`<p class="pg-muted">${esc(p.shopperScope)}</p>`:''}<h3>Included features to start from</h3><ul class="pg-base-features">${p.baseFeatures.map(f=>`<li><span>${esc(f.label||f.text||f.name)}</span><strong>${esc(f.value||'')}</strong>${f.note&&!f.note.startsWith('Standard on ')?`<small>${esc(f.note)}</small>`:''}</li>`).join('')}</ul>${p.baseFeatures[0]?.sourceUrl?`<a class="pg-factory-link" href="${esc(p.baseFeatures[0].sourceUrl)}" target="_blank" rel="noopener noreferrer">Factory standard equipment ↗</a>`:''}<p class="pg-muted">The starting equipment is a reference. Only the features you choose become requirements. An upgrade can replace a starting feature or require a different trim.</p></div>`;
}
function save(){try{sessionStorage.setItem(KEY,JSON.stringify({...state,undoStack}))}catch{}}
function label(q,answer){
 if(!answer||answer==='skip')return q.title+': don’t care';
 const values=Array.isArray(answer)?answer:[answer];
 return values.map(value=>{const reject=value.startsWith('reject:'),id=reject?value.slice(7):value;return (reject?'Exclude: ':'Want: ')+(q.choices.find(c=>c.id===id)?.label||'');}).join('; ');
}
function selections(){return '<ul class="pg-picks">'+lineup().questions.filter(q=>state.answers[q.id]).map(q=>'<li>'+esc(label(q,state.answers[q.id]))+'</li>').join('')+'</ul>';}
function excluded(q){const a=state.answers[q.id];return (Array.isArray(a)?a:typeof a==='string'?[a]:[]).filter(x=>x.startsWith('reject:')).map(x=>x.slice(7));}
function remember(){undoStack.push({answers:structuredClone(state.answers),step:state.step,started:state.started,done:state.done});if(undoStack.length>100)undoStack.shift();}
function choose(choice,reject=false){
 const q=lineup().questions[state.step];if(!q)return;
 if(choice!=='skip'&&(!q.choices.some(c=>c.id===choice)||failedPhotos.has(choice)))return;
 if(choice!=='skip'&&!reject&&!choiceRoute(q,q.choices.find(c=>c.id===choice)).selectable)return;
 remember();
 if(reject){
  state.answers[q.id]=[...new Set([...excluded(q),choice])].map(id=>'reject:'+id);
  live='Passed on '+q.choices.find(c=>c.id===choice).label+'.';
  const remaining=q.choices.some(c=>!excluded(q).includes(c.id)&&!failedPhotos.has(c.id)&&choiceRoute(q,c).selectable);
  if(remaining){live+=' Choose another photo or Don’t care.';save();draw(true);return;}
 }else{state.answers[q.id]=choice==='skip'?'skip':choice;live=label(q,state.answers[q.id]);}
 state.step++;state.showAll=false;
 if(state.step>=lineup().questions.length)state.done=true;
 save();draw(true);
}
function modelView(){
 return '<section class="pg-models" aria-label="Choose your model"><div class="pg-question"><h2 data-heading tabindex="-1">Which model interests you?</h2><p>Pick a model, then choose the features that matter to you.</p></div><div class="pg-model-grid">'+engine.lineups.map(l=>{
  const example=l.questions.flatMap(q=>q.choices)[0],vehicle=inventory.vehicles.find(v=>v.vin===example?.vin);
  const photo=vehicle?.photoUrl||vehicle?.photoUrls?.[0];
  return '<button type="button" class="pg-model-card" data-model-choice="'+esc(l.id)+'" aria-label="Choose '+esc(l.name)+'">'+(photo?'<img src="'+esc(photo)+'" alt="" width="480" height="320" decoding="async">':'')+'<span><strong>'+esc(l.name)+'</strong><small>Choose features →</small></span></button>';
 }).join('')+'</div></section>';
}
function setup(){return `<div class="pg-setup"><label>Maximum listed price<input data-budget type="number" min="0" max="1000000" step="1000" inputmode="numeric" placeholder="Optional" value="${state.budget||''}">${state.done?'<button type="button" data-action="apply-budget">Apply budget</button>':''}</label><label>Vehicle condition<select data-condition>${['New','Used','Both'].map(c=>`<option value="${c}"${state.condition===c?' selected':''}>${c==='Both'?'New and used':c}</option>`).join('')}</select></label></div><p class="pg-muted">Prices may include conditional incentives. Confirm your price and availability. Inventory checked ${esc(new Date(inventory.capturedAt).toLocaleString('en-US',{timeZone:'America/Chicago',dateStyle:'medium',timeStyle:'short'}))} CT.</p>`;}
function card(c){
 const q=lineup().questions[state.step],passed=excluded(q).includes(c.id),failed=failedPhotos.has(c.id),route=choiceRoute(q,c);
 const count=engine.matches(lineup(),{...state.answers,[q.id]:c.id},state.budget,state.condition).length;
 const photoTitle=c.title.replace(/^(?:New|Used)\s+/i,'').replace(/\s+CREW CAB\b.*$/i,'').replace(/\s+4X[24]$/i,'');
 return `<article class="pg-option${passed?' pg-passed':''}"><button type="button" class="pg-card pg-focus" data-choice="${esc(c.id)}" ${passed||failed||!route.selectable?'disabled ':''}aria-label="Choose ${esc(c.label)}. Swipe right to choose, left to exclude, or down for Don’t care; keyboard Right Arrow chooses, Left Arrow excludes, and Down Arrow skips."><span class="pg-photo-frame"><img src="${esc(c.image)}" alt="${esc(c.label+' installed in '+c.title+'; dealer listing photo '+c.photoIndex)}" width="1024" height="682" draggable="false" decoding="async"${route.selectable?'':' loading="lazy"'}></span><span class="pg-card-caption"><strong>${esc(c.label)}</strong><span class="pg-route">${esc(route.title)}</span><small class="pg-photo-identity">Photo: ${esc(photoTitle)}</small>${route.title.startsWith('Included with your selected ')?'<span class="pg-linked">'+esc(route.detail)+'</span>':''}${route.replaces?'<span class="pg-replaces">Replacement: '+esc(route.replaces)+'</span>':''}${route.requires?.length?'<span class="pg-linked">Includes '+esc(route.requires.map(id=>engine.photos.get(id)?.label||id).join(', '))+'</span>':''}<span class="pg-swipe-label">${!route.selectable?(route.status==='unknown'?'Not verified with these choices':'Doesn’t fit these choices'):failed?'Photo unavailable — use Don’t care':passed?'Passed — excluded from your matches':'<span aria-hidden="true">← &nbsp; ↓ &nbsp; →</span>Swipe this photo or use the buttons'}</span><span class="pg-choice-count" data-choice-count="${esc(c.id)}">${count?count+' '+(count===1?'match':'matches')+' with this choice':'No matches with your current choices, condition and budget'}</span></span></button>${route.selectable&&!passed?`<div class="pg-card-actions"><button type="button" class="pg-negative" data-reject="${esc(c.id)}" aria-label="Don’t want ${esc(c.label)}"${failed?' disabled':''}><span aria-hidden="true">×</span> Don’t want</button><button type="button" class="pg-positive" data-pick="${esc(c.id)}" aria-label="Want ${esc(c.label)}"${failed?' disabled':''}>Want <span aria-hidden="true">✓</span></button></div>`:''}<details class="pg-option-details"><summary>Details &amp; real photo</summary><p class="pg-availability">${esc(route.detail)}</p>${c.photoNote?`<p class="pg-photo-note">${esc(c.photoNote)}</p>`:''}<p class="pg-photo-credit">Photo: ${esc(c.title)}<br>Stock ${esc(c.stock)} · VIN …${esc(c.vin.slice(-6))}</p><div class="pg-detail"><a href="${esc(c.image)}" target="_blank" rel="noopener noreferrer">View full photo ↗</a>${route.sourceUrl?`<a href="${esc(route.sourceUrl)}" target="_blank" rel="noopener noreferrer">Trim &amp; option source ↗</a>`:''}<a href="${esc(c.stickerSource)}" target="_blank" rel="noopener noreferrer">Read this sticker ↗</a><a href="${esc(c.listingSource)}" target="_blank" rel="noopener noreferrer">Photo source ↗</a></div></details>${passed?`<div class="pg-detail"><button type="button" data-restore="${esc(c.id)}">Restore this choice</button></div>`:''}</article>`;
}
function results(){
 const vs=activeMatches(),searchParts=[lineup().identity,state.condition==='Both'?'':state.condition.toLowerCase(),state.budget?'under '+state.budget:''].filter(Boolean);
 const query=searchParts.join(' ');
 const summary=lineup().questions.map(q=>state.answers[q.id]?label(q,state.answers[q.id]):null).filter(Boolean).join('; ');
 const preferences=encodePreferences(photoPreferences(lineup(),state.answers));
 const message=`Hi Sam, I tried the photo guide for ${lineup().name}. ${summary}. ${state.budget?'My maximum listed price is '+money(state.budget)+'. ':''}Can you help me confirm my matches?`;
 return `${pathSummary()}<h2 data-heading tabindex="-1">${vs.length?vs.length+' matching '+(vs.length===1?'vehicle':'vehicles'):'Let’s adjust your choices'}</h2>${selections()}<p class="pg-muted">Matches check installed equipment for each VIN, including upgrades that replace base equipment. Photos illustrate the labeled feature only; other equipment visible in a picture is not part of your selection.</p>${vs.length?'':`<div class="pg-empty"><p>No listed vehicle matches this exact combination and budget. Your choices are saved. Go back to change a preference, raise your budget, or ask Sam to help find one.</p></div>`}<div class="pg-result-controls"><button type="button" data-action="edit">Edit my choices</button><a class="btn" href="sms:+17372091320?body=${esc(encodeURIComponent(message))}">Text Sam my preferences</a></div><div class="pg-results">${vs.slice(0,state.showAll?vs.length:8).map(v=>`<article class="pg-result"><h3>${esc(v.title)}</h3><div class="pg-result-price">${money(v.price)}</div><p>${esc(v.condition)} · Stock ${esc(v.stock)} · VIN …${esc(v.vin.slice(-6))}</p><a href="/vehicle-${esc(v.vin)}?${esc(new URLSearchParams({q:query,condition:state.condition,requestedEquipment:summary,preferences,from:'photo-guide',maxPrice:String(state.budget||'')}).toString())}">View this vehicle →</a><br><a href="/compare?${esc(new URLSearchParams({vehicles:v.vin,q:query,condition:state.condition,requestedEquipment:summary,preferences,from:'photo-guide',maxPrice:String(state.budget||'')}).toString())}">Compare this vehicle →</a></article>`).join('')}</div>${vs.length>8&&!state.showAll?`<div class="pg-controls"><button data-action="more" type="button">Show all ${vs.length} matches</button></div>`:''}<div class="pg-tools"><button type="button" data-action="restart">Start over</button></div>`;
}
function questionView(){
 const l=lineup(),q=l.questions[state.step],vs=activeMatches();
 const possible=q.choices.filter(c=>choiceRoute(q,c).selectable),blocked=q.choices.filter(c=>!choiceRoute(q,c).selectable);
 const baseline=trimPath.baseline(l,q.id),canKeep=baseline&&choiceRoute(q,baseline).selectable;
 return `<div class="pg-stage"><div class="pg-bar"><span class="pg-step">Feature ${state.step+1} of ${l.questions.length}</span><span data-match-count>${vs.length} possible ${vs.length===1?'match':'matches'} so far</span></div><div class="pg-progress" role="progressbar" aria-label="Feature choices completed" aria-valuenow="${state.step}" aria-valuemin="0" aria-valuemax="${l.questions.length}"><span style="width:${state.step/l.questions.length*100}%"></span></div><div class="pg-question"><p class="pg-badge">${esc(l.name)}</p><h2 data-heading tabindex="-1">${esc(q.title)}</h2><p class="pg-gesture-hint">Right: Want · Left: Don’t want · Down: Don’t care.</p></div><div class="pg-cards ${possible.length===1?'pg-single':''}">${possible.map(card).join('')}</div>${!possible.length?'<p class="pg-empty">No further photo choice is verified with your current preferences. Leave this feature open or edit an earlier choice.</p>':''}<div class="pg-controls pg-main-controls"><button type="button" data-action="back" aria-label="Undo last swipe"${undoStack.length?'':' disabled'}><span aria-hidden="true">‹</span> Back</button><button type="button" class="pg-no-preference" data-action="skip">Don’t care</button></div><div class="pg-controls pg-secondary-controls">${canKeep?`<button type="button" data-pick="${esc(baseline.id)}"${failedPhotos.has(baseline.id)?' disabled':''}>Keep base ${esc(baseline.label)}</button>`:''}<button type="button" data-action="results">See my matches →</button></div><details class="pg-source"><summary>What’s included, optional or replaced?</summary><p>${esc(q.explanation)}</p>${baseline?`<p class="pg-starting-feature">Base trim includes: <strong>${esc(baseline.label)}</strong>. Choose it to keep that feature, or explore an applicable upgrade.</p>`:''}<p>${esc(q.availability)}</p><a href="${esc(q.factorySource)}" target="_blank" rel="noopener noreferrer">Factory equipment guide ↗</a>${pathSummary()}${baseView()}</details>${blocked.length?`<details class="pg-unavailable"><summary>Choices that don’t fit this path (${blocked.length})</summary><div class="pg-cards">${blocked.map(card).join('')}</div></details>`:''}${selections()}</div>`;
}
function draw(focus=false){
 const l=lineup();if(!l)return;
 const settingsOpen=root.querySelector('.pg-settings')?.open===true;
 const showModels=choosingModel||!state.started;
 root.innerHTML=showModels?`${modelView()}<details class="pg-settings"><summary>Condition &amp; budget <span class="pg-settings-edit">${state.condition==='Both'?'New &amp; used':esc(state.condition)}</span></summary>${setup()}</details>`:
 `<div class="pg-model-bar"><strong>${esc(l.name)}</strong><button type="button" data-action="models">Change model</button></div><details class="pg-settings"${settingsOpen?' open':''}><summary><span>Condition &amp; budget</span><span class="pg-settings-edit">${state.condition==='Both'?'New &amp; used':esc(state.condition)}${state.budget?' · '+money(state.budget):''}</span></summary>${setup()}</details>${state.done?results():questionView()}`;
 root.innerHTML+=`<p class="pg-status" role="status" aria-live="polite">${esc(live)}</p><p class="pg-muted pg-guide-note">Photos illustrate the labeled feature. More models and features are available in the complete trim guide below.</p>`;
 root.querySelectorAll('[data-model-choice]').forEach(button=>button.addEventListener('click',()=>{
  const model=engine.lineups.find(item=>item.id===button.dataset.modelChoice);if(!model)return;
  if(model.id!==state.model){undoStack=[];state.answers={};state.step=0;state.done=false;state.showAll=false;}
  state.model=model.id;state.started=true;choosingModel=false;live='Choose the features that matter to you.';save();draw(true);
 }));
 root.querySelectorAll('[data-choice]').forEach(button=>{
  let start=null,dragged=false;
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ownsPointer=e=>start&&e.pointerId===start.id;
  const cancelGesture=()=>{if(!start)return;start=null;dragged=true;button.style.transform='';};
  button.addEventListener('pointerdown',e=>{if(e.button!==0||e.isPrimary===false||button.disabled||start)return;start={x:e.clientX,y:e.clientY,id:e.pointerId,axis:null};dragged=false;button.setPointerCapture(e.pointerId)});
  button.addEventListener('pointermove',e=>{
   if(!ownsPointer(e))return;const dx=e.clientX-start.x,dy=e.clientY-start.y;
   if(Math.hypot(dx,dy)>8)dragged=true;
   if(!start.axis&&dragged){
    if(Math.abs(dx)>Math.abs(dy)*1.25)start.axis='horizontal';
    else if(Math.abs(dy)>Math.abs(dx)*1.25)start.axis=dy>0?'skip':'scroll';
   }
   if(start.axis==='horizontal'&&!reducedMotion)button.style.transform=`translateX(${Math.max(-35,Math.min(35,dx/3))}px) rotate(${Math.max(-8,Math.min(8,dx/45))}deg)`;
   if(start.axis==='skip'&&!reducedMotion)button.style.transform=`translateY(${Math.max(0,Math.min(40,dy/3))}px)`;
  });
  button.addEventListener('pointerup',e=>{
   if(!ownsPointer(e))return;const dx=e.clientX-start.x,dy=e.clientY-start.y,raw=swipeDecision(dx,dy);
   const decision=(start.axis==='horizontal'&&raw!=='skip')||(start.axis==='skip'&&raw==='skip')?raw:null;
   dragged=dragged||Math.hypot(dx,dy)>8;start=null;button.style.transform='';
   if(decision){dragged=true;choose(decision==='skip'?'skip':button.dataset.choice,decision==='reject')}
  });
  button.addEventListener('pointercancel',e=>{if(ownsPointer(e))cancelGesture();});
  button.addEventListener('lostpointercapture',e=>{if(ownsPointer(e))cancelGesture();});
  button.addEventListener('click',e=>{if((dragged&&e?.detail!==0)||button.disabled)return;choose(button.dataset.choice)});
  button.addEventListener('keydown',e=>{if(button.disabled)return;if(['ArrowLeft','ArrowRight','ArrowDown'].includes(e.key)){e.preventDefault();choose(e.key==='ArrowDown'?'skip':button.dataset.choice,e.key==='ArrowLeft')}});
  button.querySelector('img').addEventListener('error',()=>{
   failedPhotos.add(button.dataset.choice);button.disabled=true;button.classList.add('pg-photo-unavailable');
   root.querySelectorAll('[data-pick],[data-reject]').forEach(action=>{if((action.dataset.pick||action.dataset.reject)===button.dataset.choice)action.disabled=true;});
   const warning=document.createElement('span');warning.className='pg-photo-error';warning.textContent='Photo unavailable. Choose Don’t care or use the complete trim guide below.';button.append(warning);
  });
 });
 root.querySelectorAll('[data-restore]').forEach(button=>button.addEventListener('click',()=>{
  remember();const q=l.questions[state.step],remaining=excluded(q).filter(id=>id!==button.dataset.restore).map(id=>'reject:'+id);
  if(remaining.length)state.answers[q.id]=remaining;else delete state.answers[q.id];live='Choice restored.';save();draw(true);
 }));
 root.querySelector('[data-budget]').addEventListener('input',e=>{
  state.budget=Math.max(0,Math.min(1000000,Number(e.target.value)||0));save();
  const count=root.querySelector('[data-match-count]');if(count)count.textContent=activeMatches().length+' possible matches so far';
  const question=l.questions[state.step];
  root.querySelectorAll('[data-choice-count]').forEach(node=>{
   const n=engine.matches(l,{...state.answers,[question.id]:node.dataset.choiceCount},state.budget,state.condition).length;
   node.textContent=n?n+' '+(n===1?'match':'matches')+' with this choice':'No matches with your current choices, condition and budget';
  });
 });
 root.querySelector('[data-condition]').addEventListener('change',e=>{state.condition=e.target.value;save();draw();root.querySelector('[data-condition]')?.focus({preventScroll:true});});
 root.querySelectorAll('[data-action],[data-pick],[data-reject]').forEach(button=>button.addEventListener('click',()=>{
  if(button.disabled)return;
  if(button.dataset.pick){choose(button.dataset.pick);return}if(button.dataset.reject){choose(button.dataset.reject,true);return}
  switch(button.dataset.action){
   case 'models':choosingModel=true;live='Choose a model. Your current preferences stay saved until you choose a different model.';break;
   case 'apply-budget':live='Budget applied.';break;
   case 'skip':choose('skip');return;
   case 'back':if(undoStack.length){Object.assign(state,undoStack.pop());live='Last swipe undone.';}break;
   case 'edit':state.started=true;state.done=false;state.step=0;live='Change any choice; your other preferences stay saved.';break;
   case 'results':state.done=true;live='';break;
   case 'restart':undoStack=[];state.answers={};state.step=0;state.started=false;state.done=false;choosingModel=false;live='Preferences cleared.';break;
   case 'more':state.showAll=true;draw();root.querySelectorAll('.pg-result')[8]?.querySelector('a')?.focus({preventScroll:true});return;
  }
  save();draw(true);
 }));
 if(focus){const heading=root.querySelector('[data-heading]');heading?.focus({preventScroll:true});heading?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}
}
if(root){
 const classic=document.querySelector('.pg-classic'),photoShortcut=document.querySelector('[data-photo-selection]'),trimShortcut=document.querySelector('[data-selection]');
 const syncShortcut=()=>{if(photoShortcut)photoShortcut.hidden=!!classic?.open;if(trimShortcut)trimShortcut.hidden=!classic?.open;};
 classic?.addEventListener('toggle',syncShortcut);syncShortcut();
 photoShortcut?.addEventListener('click',()=>{if(!engine)return;if(!state.started||choosingModel){live='Choose a model to see its matches.';draw(true);return;}state.done=true;live='';save();draw(true);});
 try{
  const files=await Promise.all(['/data/feature-photo-guide.json','/data/used-inventory.json','/data/equipment-index.json','/data/photo-trim-path.json'].map(async path=>{const r=await fetch(path);if(!r.ok)throw Error(path);return r.json()}));
  const [catalog,data,index,pathData]=files;inventory=data;engine=createPhotoGuide(catalog,data.vehicles,index.records);trimPath=createPhotoTrimPath(pathData,engine);
  if(!engine.lineups.length)throw Error('No verified photo choices');
  let remembered;try{remembered=JSON.parse(sessionStorage.getItem(KEY)||'null')}catch{}
  state.model=engine.lineups[0].id;
  const params=entryParams;
  const budget=value=>Math.max(0,Math.min(1000000,Number(value)||0));
  const step=value=>Math.max(0,Math.min(lineup().questions.length-1,Math.floor(Number(value)||0)));
  if(remembered&&engine.lineups.some(l=>l.id===remembered.model)){
   state.model=remembered.model;state.answers=engine.cleanAnswers(lineup(),remembered.answers);
   state.budget=budget(remembered.budget);
   state.condition=['New','Used','Both'].includes(remembered.condition)?remembered.condition:'New';
   state.started=remembered.started===true;state.step=step(remembered.step);state.done=state.started&&remembered.done===true;
   const removed=Object.keys(remembered.answers||{}).some(id=>!state.answers[id]);
   if(removed){state.step=Math.max(0,lineup().questions.findIndex(q=>!state.answers[q.id]));state.done=false;}
   if(Array.isArray(remembered.undoStack))undoStack=remembered.undoStack.slice(-100).filter(x=>x&&typeof x==='object').map(x=>({answers:engine.cleanAnswers(lineup(),x.answers),step:step(x.step),started:x.started!==false,done:x.done===true}));
  }
  const shared=readPreferences(params);
  if(shared&&engine.lineups.some(l=>l.id===shared.model)){
   state.model=shared.model;const answers={};
   for(const r of shared.requirements){const q=lineup().questions.find(q=>q.id===r.questionId),c=q?.choices.find(c=>c.id===r.choiceId);
    if(!c||c.feature!==r.feature||c.value!==r.value)continue;
    if(r.wanted)answers[q.id]=c.id;else if(!answers[q.id]||Array.isArray(answers[q.id]))answers[q.id]=[...(answers[q.id]||[]),'reject:'+c.id];
   }
   state.answers=engine.cleanAnswers(lineup(),answers);state.started=true;state.done=true;state.step=0;undoStack=[];
  }
  if(params.has('maxPrice'))state.budget=budget(params.get('maxPrice'));
  if(['New','Used','Both'].includes(params.get('condition')))state.condition=params.get('condition');
  save();
  draw();
 }catch(error){console.error(error);root.innerHTML='<h2>Photo guide is temporarily unavailable</h2><p>Use the complete trim guide below to keep shopping.</p>';document.querySelector('.pg-classic')?.setAttribute('open','');}
}
