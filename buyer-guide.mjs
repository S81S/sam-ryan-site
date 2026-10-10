import {loadBuyerCatalog,loadBuyerLineup} from './buyer-sources.mjs';
import {trimAssessment} from './buyer-catalog.mjs';
import {buyerVehicleTrim} from './buyer-evidence.mjs';
import {preferenceChecks} from './preference-evidence.mjs';
import {photoPreferences,encodePreferences,readPreferences} from './shopping-preferences.mjs';
import {createPhotoGuide,swipeDecision} from './photo-guide-engine.mjs';
const root=document.getElementById('photo-finder'),key='carswithsam-complete-guide-v1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number.isFinite(n)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n):'Ask for price';
let catalog,inventory,index,photos,lineup,undo=[],pool=[],stage='models',error='',loading=false;
let state={model:'',trim:'',answers:{},unresolved:[],step:0,year:'2026',brand:'All',budget:0,condition:'New',section:'All'};
const save=()=>{try{sessionStorage.setItem(key,JSON.stringify(state));}catch{}};
const requirements=()=>[...(photoPreferences(lineup,state.answers)?.requirements||[]),...(readPreferences({version:1,requirements:state.unresolved||[]})?.requirements||[])];
const activeQuestions=()=>lineup.questions.filter(q=>state.section==='All'||q.section===state.section);
const question=()=>activeQuestions()[Math.min(state.step,activeQuestions().length-1)];
const answer=(q)=>state.answers[q.id];
const chosen=(q,c)=>answer(q)===c.id;
const rejected=(q,c)=>(Array.isArray(answer(q))?answer(q):[answer(q)]).includes('reject:'+c.id);
const status=f=>!f?'Details not published':f.status==='standard'?'Standard':f.status==='optional'?'Optional / package':'Not offered';
const url=(path,extra={})=>{
 const preferences=encodePreferences({version:1,model:lineup.id,requirements:requirements()});
 if(requirements().length&&!preferences)throw Error('Too many choices for a shared link. Remove some choices before continuing.');
 const req=requirements(),summary=req.slice(0,8).map(r=>(r.wanted?'Want: ':'Exclude: ')+r.label).join('; ')+(req.length>8?'; '+(req.length-8)+' more choices saved in my guide':'');
 const params=new URLSearchParams({preferences,guideTrim:state.trim,condition:state.condition,maxPrice:String(state.budget||''),requestedEquipment:summary,from:'buyers-guide',...extra});
 if(path==='/contact')params.set('request',`${lineup.year} ${lineup.name}${state.trim?' · '+lineup.trims.find(t=>t.id===state.trim)?.name:''}. ${summary}\nMy complete guide: https://carswithsam.com/perfect-match?`+new URLSearchParams({preferences,guideTrim:state.trim,condition:state.condition,maxPrice:String(state.budget||'')}));
 return path+'?'+params;
};
function matches(){
 const req=requirements();
 return pool.filter(({v,m})=>(!state.trim||m.trim.id===state.trim)&&(state.condition==='Both'||v.condition===state.condition)&&(!state.budget||v.price>0&&v.price<=state.budget)).map(({v,m})=>{
  const checks=preferenceChecks(v,index.records[v.vin],req);return {v,m,checks,conflicts:checks.filter(c=>c.state==='conflict').length,unknown:checks.filter(c=>c.state==='unknown').length};
 }).sort((a,b)=>a.conflicts-b.conflicts||a.unknown-b.unknown||(a.v.price??Infinity)-(b.v.price??Infinity));
}
function modelCards(){
 const years=[...new Set(catalog.models.map(m=>m.year))].sort((a,b)=>b-a);
 const models=catalog.models.filter(m=>(state.brand==='All'||m.brand===state.brand)&&String(m.year)===state.year);
 return `<h2 tabindex="-1" data-heading>Start with your model</h2><p>Choose a model, explore every listed trim, then swipe through equipment and packages.</p><div class="bg-filters"><label>Model year<select data-setting="year">${years.map(y=>`<option${String(y)===state.year?' selected':''}>${y}</option>`).join('')}</select></label><label>Make<select data-setting="brand">${['All','Jeep','Ram','Dodge','Chrysler'].map(b=>`<option${b===state.brand?' selected':''}>${b}</option>`).join('')}</select></label></div><div class="pg-model-grid">${models.map(m=>`<button type="button" class="pg-model-card" data-model="${esc(m.id)}">${m.trims.find(t=>t.imageUrl)?.imageUrl?`<img src="${esc(m.trims.find(t=>t.imageUrl).imageUrl)}" alt="" width="480" height="320" loading="lazy">`:''}<span><strong>${esc(m.name)}</strong><small>${m.year} · ${m.trims.length} trims${m.fleet?' · Commercial':''}</small><small>Choose model →</small></span></button>`).join('')}</div>${!models.length?'<p>No published models in this selection. Try a different year or make.</p>':''}${state.model?'<button data-action="resume" type="button">Resume my saved guide</button>':''}`;
}
function source(c){return c.sourceUrl?`<a href="${esc(c.sourceUrl)}" target="_blank" rel="noopener noreferrer">Factory source ↗</a>`:'';}
function factLine(c,trimId){const f=c.facts[trimId];return `<li><strong>${esc(c.fullLabel)}</strong>${c.detail?` — ${esc(c.detail)}`:''}${f?.note?`<p>${esc(f.note)}</p>`:''}${c.warning?`<p class="bg-coverage">${esc(c.warning)}</p>`:''} ${source(c)}</li>`;}
function trimCards(){
 return `<h2 data-heading tabindex="-1">Choose a trim, or explore them all</h2><p>${esc(lineup.scope)}</p><p class="bg-coverage">${esc(lineup.coverage)}${lineup.versions?' Configuration: '+esc(lineup.versions)+'.':''}</p><button type="button" class="bg-primary" data-trim="">Help me choose between all trims →</button><div class="bg-trims">${lineup.trims.map(t=>{
 const facts=t.choices.map(id=>lineup.choices.get(id)),standard=facts.filter(c=>c.facts[t.id]?.status==='standard'),optional=facts.filter(c=>c.facts[t.id]?.status==='optional');
 return `<article class="bg-trim">${t.imageUrl?`<img src="${esc(t.imageUrl)}" alt="${esc(t.imageAlt||t.name+'; options may be pictured')}" width="480" height="320" loading="lazy">`:''}<h3>${esc(t.name)}</h3><p>${esc(t.difference||'')}</p><p>${standard.length} published standard items · ${optional.length} options / packages</p>${!t.charted?'<p class="bg-coverage">Selected published details; full factory chart not available for this trim.</p>':''}<details><summary>What comes standard</summary>${standard.length?'<ul>'+standard.map(c=>factLine(c,t.id)).join('')+'</ul>':'<p>Standard equipment details have not been published in our sources.</p>'}</details><details><summary>Packages and options — what they add</summary>${optional.length?'<ul>'+optional.map(c=>factLine(c,t.id)).join('')+'</ul>':'<p>No optional equipment details are documented here. This does not mean options are unavailable.</p>'}</details><button type="button" data-trim="${esc(t.id)}">Explore ${esc(t.name)} →</button></article>`;
 }).join('')}</div>`;
}
function availability(c){
 if(c.kind!=='factory')return `<p>Installed equipment from a verified VIN example. Factory availability varies by trim and configuration.</p>`;
 const trims=state.trim?lineup.trims.filter(t=>t.id===state.trim):lineup.trims;
 const grouped=items=>['standard','optional','unavailable','unknown'].map(s=>{const ts=items.filter(t=>(c.facts[t.id]?.status||'unknown')===s);return ts.length?`<p class="bg-${s}"><strong>${status(s==='unknown'?null:{status:s})}:</strong> ${esc(ts.map(t=>t.name).join(', '))}</p>`:''}).join('');
 return `<div class="bg-availability">${grouped(trims)}${state.trim?'<details><summary>How other trims compare</summary>'+grouped(lineup.trims.filter(t=>t.id!==state.trim))+'</details>':''}</div>`;
}
function includedPackages(c){return (c.includedPackages||[]).filter(p=>!state.trim||p.trimIds.includes(state.trim)).map(p=>'<p class="bg-included"><strong>Also includes '+esc(p.label)+':</strong> '+esc(p.includes)+' <small>('+esc(p.trimIds.map(id=>lineup.trims.find(t=>t.id===id)?.name).join(', '))+')</small></p>').join('');}
function featureCard(c,q){
 const selected=chosen(q,c),passed=rejected(q,c),facts=c.kind==='factory'?Object.entries(c.facts).filter(([id])=>!state.trim||id===state.trim):[];
 const notes=[...new Set(facts.map(([,f])=>f.note).filter(Boolean))];
 return `<article class="bg-feature${selected?' bg-selected':''}${passed?' pg-passed':''}">${availability(c)}<button type="button" class="bg-swipe" data-card="${esc(c.id)}" aria-label="${esc(c.label)}. Right for Want, left for Don’t want, down for Don’t care.">${c.image?`<img src="${esc(c.image)}" alt="${esc(c.label)}" width="1024" height="682">`:''}<span class="pg-badge">${c.package?'Package contents':esc(q.section||'Equipment')}</span><strong>${esc(c.fullLabel||c.label)}</strong>${c.detail?`<span>${esc(c.detail)}</span>`:''}${c.kind==='equipment'?`<span>${esc(c.evidence?.join('; '))}</span>`:''}<small>← Don’t want &nbsp; ↓ Don’t care &nbsp; Want →</small></button>${includedPackages(c)}${c.warning?`<p class="bg-coverage">${esc(c.warning)}</p>`:''}${notes.length?'<div class="bg-conditions"><strong>Conditions and dependencies</strong>'+notes.map(n=>'<p>'+esc(n)+'</p>').join('')+'</div>':''}${c.package?'<p class="pg-muted">Contents apply to the trims listed on this card. Read the conditions; selecting a package does not add its components as separate paid options.</p>':''}<div class="pg-card-actions"><button type="button" data-answer="reject:${esc(c.id)}">Don’t want</button><button type="button" data-answer="${esc(c.id)}">${selected?'Selected ✓':'Want ✓'}</button></div><details><summary>Source and equipment details</summary>${source(c)}${c.stickerSource?` <a href="${esc(c.stickerSource)}" target="_blank" rel="noopener noreferrer">Original window sticker ↗</a>`:''}${c.photoNote?'<p>'+esc(c.photoNote)+'</p>':''}${facts.map(([id,f])=>'<p><strong>'+esc(lineup.trims.find(t=>t.id===id)?.name)+'</strong>: '+esc([f.label,f.value,f.note].filter(Boolean).join(' — '))+'</p>').join('')}</details></article>`;
}
function equipment(){
 const qs=activeQuestions(),q=question();
 if(!q)return `<h2 data-heading tabindex="-1">Published details are still pending</h2><p>You can review every listed trim above. We will not fill in unpublished equipment from another model year.</p><button data-action="trims">Back to trims</button><button data-action="review">Review my choices</button>`;
 const answered=Object.keys(state.answers).length;
 return `<div class="pg-bar"><span>Feature ${state.step+1} of ${qs.length}${state.section!=='All'?' in this topic':''}</span><span>${answered} answered overall</span></div><h2 data-heading tabindex="-1">${esc(q.title)}</h2><p>Right: Want · Left: Don’t want · Down: Don’t care. Your other choices stay unchanged.</p><div class="bg-filters"><label>Topic<select data-setting="section">${['All',...new Set(lineup.questions.map(q=>q.section||'Equipment'))].map(s=>`<option${s===state.section?' selected':''}>${esc(s)}</option>`).join('')}</select></label><label>Jump to a feature<select data-jump><option value="">Choose a feature…</option>${qs.map((q,i)=>`<option value="${i}">${i+1}. ${esc(q.title.slice(0,100))}${state.answers[q.id]?' ✓':''}</option>`).join('')}</select></label></div><div class="bg-features">${q.choices.map(c=>featureCard(c,q)).join('')}</div><div class="pg-controls"><button data-action="back" ${!undo.length?'disabled':''}>Back</button><button data-answer="skip" class="bg-primary">Don’t care</button><button data-action="review">Review choices / see matches →</button></div>`;
}
function review(){
 const req=requirements(),selected=lineup.trims.filter(t=>!state.trim||t.id===state.trim);
 return `<h2 data-heading tabindex="-1">Your buying guide</h2><p>${req.length} preferences · ${Object.values(state.answers).filter(a=>a==='skip').length} marked Don’t care. You can explore every topic before viewing vehicles.</p><div class="pg-controls"><button data-action="equipment">Keep exploring features</button><button data-action="results" class="bg-primary">See vehicles that fit →</button></div>${req.length?'<ul>'+req.map(r=>'<li>'+(r.wanted?'Want: ':'Don’t want: ')+esc(r.label)+'</li>').join(''):'<p>No equipment requirements selected yet.</p>'}<h3>How the trims fit your choices</h3>${state.trim?'<button data-action="all-trims">Compare all trims with these choices</button>':''}<a class="bg-trim-link" href="/trim-guide?${esc(new URLSearchParams({model:lineup.modelId,trims:'all'}).toString())}#equipment">See what each trim adds or gives up →</a><p>These are factory availability paths, not an orderability guarantee. Packages can have dependencies; an individual VIN must confirm installed options.</p><div class="bg-trims">${selected.map(t=>{
 const a=trimAssessment(lineup,state.answers,t.id);
 return `<article class="bg-trim"><h3>${esc(t.name)}</h3><p>${a.conflicts.length?'Does not fit '+a.conflicts.length+' factory preferences':a.unknown.length?a.unknown.length+' choices need factory confirmation':'Offers the selected factory equipment'}</p>${a.options.length?'<strong>Packages / options needed</strong><ul>'+a.options.map(o=>'<li>'+esc(o.choice.fullLabel)+(o.fact.note?' — '+esc(o.fact.note):'')+'</li>').join('')+'</ul>':''}${a.conflicts.length?'<ul>'+a.conflicts.map(o=>'<li>'+esc(o.choice.fullLabel)+': '+(o.wanted?'not offered':'standard on this trim')+'</li>').join('')+'</ul>':''}<a href="/trim-guide?${esc(new URLSearchParams({model:lineup.modelId,trims:t.id}).toString())}#equipment">Full trim equipment →</a></article>`;
 }).join('')}</div>`;
}
function results(){
 const rows=matches(),confirmed=rows.filter(r=>!r.conflicts&&!r.unknown),possible=rows.filter(r=>!r.conflicts&&r.unknown),conflicts=rows.filter(r=>r.conflicts);
 const renderRow=(r,exact)=>`<article class="pg-result"><h3>${esc(r.v.title)}</h3><p>${money(r.v.price)} · Stock ${esc(r.v.stock)}</p><p>${exact?'All your equipment choices are confirmed':r.unknown+' choices need VIN confirmation'}</p>${r.checks.length?'<details><summary>See how it fits</summary><ul>'+r.checks.map(c=>'<li>'+esc(c.label)+': <strong>'+(c.state==='match'?'Matches':c.state==='conflict'?'Does not match':'Needs confirmation')+'</strong>'+(c.evidence?.length?' — '+esc(c.evidence.join('; ')):'')+'</li>').join('')+'</ul></details>':''}<label><input type="checkbox" data-compare="${esc(r.v.vin)}"> Add to comparison</label><a href="${esc(url('/vehicle-'+r.v.vin))}">Vehicle details →</a></article>`;
 return `<h2 data-heading tabindex="-1">Your vehicle matches</h2><p>${confirmed.length} confirmed · ${possible.length} need equipment confirmation${conflicts.length?' · '+conflicts.length+' excluded by your choices':''}.</p><p class="pg-muted">Inventory snapshot: ${esc(new Date(inventory.capturedAt).toLocaleString('en-US',{timeZone:'America/Chicago'}))} CT. Confirm current availability and pricing with Sam. Factory-standard starting equipment may be replaced by installed options.</p><div class="bg-filters"><label>Condition<select data-setting="condition">${['New','Used','Both'].map(s=>`<option${state.condition===s?' selected':''}>${s}</option>`).join('')}</select></label><label>Maximum listed price<input data-setting="budget" type="number" min="0" max="1000000" step="1000" value="${state.budget||''}" placeholder="Any price"></label></div><button type="button" data-action="compare" disabled>Compare selected vehicles</button><p data-compare-help>Select 2–5 vehicles to compare their equipment and your choices.</p><div class="pg-results">${confirmed.map(r=>renderRow(r,true)).join('')}</div>${possible.length?`<details class="bg-possible"><summary>${possible.length} possible vehicles — confirm equipment first</summary><div class="pg-results">${possible.map(r=>renderRow(r,false)).join('')}</div></details>`:''}${!rows.length?'<p>No listed vehicles in this exact model, trim, condition and budget. Your preferences are still saved.</p>':''}<div class="pg-controls"><button data-action="review">Review my choices</button><button data-action="equipment">Change features</button><a href="${esc(url('/contact'))}">Ask Sam about my choices →</a></div>`;
}
async function openModel(id,resume=false){
 loading=true;draw();
 try{
  lineup=await loadBuyerLineup(id);
  // Reuse genuine, reviewed feature photographs and VIN questions alongside the
  // complete factory catalog. Never make a missing photo hide a model or trim.
  if(!lineup.addedPhotos){
   const photo=photos.lineups.find(l=>l.id===id&&l.year===lineup.year);
   if(photo){const qs=photo.questions.map(q=>({...q,section:q.section||'Real equipment photos'}));lineup.questions=[...qs,...lineup.questions];}
   lineup.addedPhotos=true;
  }
  if(!resume){state.model=id;state.answers={};state.unresolved=[];state.trim='';state.step=0;state.section='All';undo=[];}
  state.answers=Object.fromEntries(Object.entries(state.answers).filter(([id,a])=>lineup.questions.some(q=>q.id===id&&(a==='skip'||(Array.isArray(a)?a:[a]).every(v=>q.choices.some(c=>v===c.id||v==='reject:'+c.id))))));
  if(!lineup.trims.some(t=>t.id===state.trim))state.trim='';
  if(!['All',...lineup.questions.map(q=>q.section)].includes(state.section))state.section='All';
  state.step=Math.max(0,Math.min(state.step||0,activeQuestions().length-1));
  pool=inventory.vehicles.filter(v=>!v.external&&v.status!=='not-observed').map(v=>({v,m:buyerVehicleTrim(lineup,v,index.records[v.vin])})).filter(r=>r.m);
  stage=resume?'equipment':'trims';error=state.unresolved?.length?'Some saved choices are no longer in the current guide. They remain in your request and need confirmation. Choose the model again to start fresh.':'';save();
 }catch(e){error='The factory guide could not load. Please try that model again.';console.error(e);stage='models';}finally{loading=false;draw(true);}
}
function select(value){
 const q=question();if(!q)return;
 if(value!=='skip'&&!q.choices.some(c=>value===c.id||value==='reject:'+c.id))return;
 undo.push({answers:structuredClone(state.answers),step:state.step,section:state.section});
 if(value.startsWith('reject:'))state.answers[q.id]=[...new Set([...(Array.isArray(answer(q))?answer(q):[]),value])];else state.answers[q.id]=value;
 const more=value.startsWith('reject:')&&q.choices.some(c=>!rejected(q,c));
 if(!more){if(state.step<activeQuestions().length-1)state.step++;else stage='review';}
 save();draw(true);
}
function draw(focus=false){
 const shortcut=document.querySelector('[data-photo-selection]');if(shortcut){shortcut.textContent=stage==='models'?'Choose a model':'Review my choices';shortcut.hidden=false;}
 if(loading){root.innerHTML='<p role="status">Loading this model’s factory equipment…</p>';return;}
 const top=stage==='models'?'':`<div class="pg-modelbar"><strong>${lineup.year} ${esc(lineup.name)}${state.trim?' · '+esc(lineup.trims.find(t=>t.id===state.trim)?.name):''}</strong><button data-action="models">Change model</button><button data-action="trims">Trims &amp; standard equipment</button></div>`;
 try{root.innerHTML=top+(error?'<p role="alert">'+esc(error)+'</p>':'')+({models:modelCards,trims:trimCards,equipment,review,results}[stage]||modelCards)();}catch(e){root.innerHTML=top+'<p role="alert">'+esc(e.message)+'</p><button data-action="equipment">Edit choices</button>';}
 root.querySelectorAll('[data-model]').forEach(b=>b.onclick=()=>openModel(b.dataset.model));
 root.querySelectorAll('[data-trim]').forEach(b=>b.onclick=()=>{state.trim=b.dataset.trim;state.step=0;stage='equipment';save();draw(true);});
 root.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>select(b.dataset.answer));
 root.querySelectorAll('[data-setting]').forEach(e=>e.onchange=()=>{const k=e.dataset.setting;state[k]=k==='budget'?Math.max(0,Math.min(1000000,Number(e.value)||0)):e.value;if(k==='section')state.step=0;save();draw();});
 root.querySelector('[data-jump]')?.addEventListener('change',e=>{if(e.target.value==='')return;state.step=Number(e.target.value);save();draw(true);});
 root.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{
  const a=b.dataset.action;
  if(a==='resume'){openModel(state.model,true);return;}
  if(a==='back'){if(undo.length)Object.assign(state,undo.pop());stage='equipment';}
  else if(a==='all-trims'){state.trim='';stage='review';}
  else if(a==='compare'){const vins=[...root.querySelectorAll('[data-compare]:checked')].map(e=>e.dataset.compare);if(vins.length>=2&&vins.length<=5)location.href=url('/compare',{vehicles:vins.join(',')});return;}
  else stage=a;save();draw(true);
 });
 root.querySelectorAll('[data-compare]').forEach(e=>e.onchange=()=>{const n=root.querySelectorAll('[data-compare]:checked').length;root.querySelector('[data-action="compare"]').disabled=n<2||n>5;root.querySelector('[data-compare-help]').textContent=n+' selected. Choose 2–5 vehicles.';});
 root.querySelectorAll('[data-card]').forEach(b=>{
  let start=null,dragged=false;
  b.onpointerdown=e=>{if(e.button!==0||e.isPrimary===false)return;start={x:e.clientX,y:e.clientY,id:e.pointerId};dragged=false;b.setPointerCapture(e.pointerId);};
  b.onpointermove=e=>{if(start?.id===e.pointerId&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>8)dragged=true;};
  b.onpointerup=e=>{if(start?.id!==e.pointerId)return;const action=swipeDecision(e.clientX-start.x,e.clientY-start.y);start=null;if(action){dragged=true;select(action==='skip'?'skip':(action==='reject'?'reject:':'')+b.dataset.card);}};
  b.onpointercancel=()=>{start=null;dragged=true;};b.onlostpointercapture=()=>{start=null;};
  b.onclick=e=>{if(!dragged||e.detail===0)select(b.dataset.card);};
  b.onkeydown=e=>{if(['ArrowLeft','ArrowRight','ArrowDown'].includes(e.key)){e.preventDefault();select(e.key==='ArrowDown'?'skip':(e.key==='ArrowLeft'?'reject:':'')+b.dataset.card);}};
 });
 if(focus){const h=root.querySelector('[data-heading]');h?.focus({preventScroll:true});h?.scrollIntoView({block:'start',behavior:'instant'});}
}
if(root){
 try{
  const read=async path=>{const r=await fetch(path);if(!r.ok)throw Error(path);return r.json();};
  [catalog,inventory,index]=await Promise.all([loadBuyerCatalog(),read('/data/used-inventory.json'),read('/data/equipment-index.json')]);
  const photoCatalog=await read('/data/feature-photo-guide.json');photos=createPhotoGuide(photoCatalog,inventory.vehicles,index.records);
  let stored;try{stored=JSON.parse(sessionStorage.getItem(key)||'null');}catch{}
  if(stored&&catalog.models.some(m=>m.id===stored.model))state={...state,...stored,year:String(stored.year),budget:Math.max(0,Math.min(1000000,Number(stored.budget)||0)),condition:['New','Used','Both'].includes(stored.condition)?stored.condition:'New',answers:stored.answers&&typeof stored.answers==='object'?stored.answers:{}};
  const params=new URLSearchParams(location.search),shared=readPreferences(params);
  const aliases={ram1500:'ram-1500',ram3500:'ram-3500',pacifica:'chrysler-pacifica',grandcherokee:'jeep-grand-cherokee'};
  if(shared&&catalog.models.some(m=>m.id===(aliases[shared.model]||shared.model))){
   await openModel(aliases[shared.model]||shared.model);state.answers={};
   for(const r of shared.requirements){const q=lineup.questions.find(q=>q.id===r.questionId),c=q?.choices.find(c=>c.id===r.choiceId&&c.feature===r.feature&&c.value===r.value);if(c){if(r.wanted)state.answers[q.id]=c.id;else if(!state.answers[q.id]||Array.isArray(state.answers[q.id]))state.answers[q.id]=[...(state.answers[q.id]||[]),'reject:'+c.id];}else state.unresolved.push(r);}
   if(state.unresolved.length)error='Some saved choices are no longer in the current guide. They remain in your request and need confirmation. Choose the model again to start fresh.';
   state.trim=lineup.trims.some(t=>t.id===params.get('guideTrim'))?params.get('guideTrim'):'';state.condition=['New','Used','Both'].includes(params.get('condition'))?params.get('condition'):'New';state.budget=Math.max(0,Math.min(1000000,Number(params.get('maxPrice'))||0));stage='review';save();
  }
  document.querySelector('[data-photo-selection]')?.addEventListener('click',()=>{if(lineup){stage='review';draw(true);}else root.scrollIntoView();});
  draw();
 }catch(e){console.error(e);root.innerHTML='<p>The interactive guide could not load. <a href="/trim-guide">Open Compare Trims</a> or <a href="/compare">Compare vehicles by VIN</a>.</p>';}
}
