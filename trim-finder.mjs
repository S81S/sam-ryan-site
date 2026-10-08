// Perfect Match (the interactive car-buying guide): start at a model's base trim, see what each trim above it adds, pick what you want and land on the
// first trim that has it — with the matching vehicles in stock. Built on the same factory trim guide as Compare Trims.
import {finderModels,standardEquipment,stepUp,nextMatch,pickStatus} from './trim-ladder.mjs';

const root=document.getElementById('finder');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number.isFinite(n)?'$'+Math.round(n).toLocaleString('en-US'):'';
const params=new URLSearchParams(location.search);
let data,stock={trims:{}},models=[];
// Where the shopper is: the model, the trim they are on, the trims they passed, and what they picked.
let state={model:null,at:0,path:[0],picks:[],done:false,note:null};

const modelOf=id=>models.find(m=>m.id===id);
const trimsOf=()=>modelOf(state.model).model.trims;
const stockFor=trim=>stock.trims?.[state.model+'/'+trim.id]||null;
const fullName=trim=>{const m=modelOf(state.model);return `${m.year} ${m.name.startsWith(m.brand)?'':m.brand+' '}${m.name} ${trim.name}`;};

function save(replace){
 const url=new URL(location.href);url.search='';
 if(state.model)url.searchParams.set('model',state.model);
 history[replace?'replaceState':'pushState']({...state},'',url);
}
window.addEventListener('popstate',e=>{if(e.state){state=e.state;draw(false);}else{state={model:null,at:0,path:[0],picks:[],done:false,note:null};draw(false);}});
function go(next){state={...state,...next};save(false);draw(true);}

function stockLine(trim){
 const s=stockFor(trim);
 return s?`<p class="tf-stock"><strong>${s.count} in stock</strong>${s.from?` · from ${money(s.from)}`:''}</p>`:`<p class="tf-stock tf-none">None in stock right now</p>`;
}
function photo(trim,cls='tf-photo'){return trim.imageUrl?`<img class="${cls}" src="${esc(trim.imageUrl)}" alt="${esc(fullName(trim))}" loading="lazy">`:'';}

function pickerView(){
 const brands=[...new Set(models.map(m=>m.brand))];
 const brand=state.brand||brands[0];
 return `<h2 class="tf-title">What are you shopping for?</h2>
 <div class="tf-brands" role="group" aria-label="Brand">${brands.map(b=>`<button type="button" data-brand="${esc(b)}" aria-pressed="${b===brand}">${esc(b)}</button>`).join('')}</div>
 <div class="tf-models">${models.filter(m=>m.brand===brand).map(m=>{const base=m.model.trims[0],count=[...m.model.trims,...m.others].reduce((n,t)=>n+(stock.trims?.[m.id+'/'+t.id]?.count||0),0);
  return `<button type="button" class="tf-model" data-model="${esc(m.id)}">${base.imageUrl?`<img src="${esc(base.imageUrl)}" alt="" loading="lazy">`:''}<span><small>${m.year}</small><strong>${esc(m.name)}</strong><small>${m.model.trims.length+m.others.length} trim${m.model.trims.length+m.others.length===1?'':'s'}${count?` · ${count} in stock`:''}</small></span></button>`;}).join('')}</div>`;
}

function pathView(){
 const trims=trimsOf();
 return `<ol class="tf-path" aria-label="Trims in this lineup">${trims.map((t,i)=>{const visited=state.path.includes(i),here=i===state.at;
  return `<li class="${here?'here':visited?'visited':i<state.at?'passed':''}">${visited&&!here?`<button type="button" data-back="${i}">${esc(t.name)}</button>`:`<span${here?' aria-current="step"':''}>${esc(t.name)}</span>`}</li>`;}).join('')}</ol>`;
}

function pickList(title,items,kind){
 if(!items.length)return '';
 const trims=trimsOf(),here=trims[state.at];
 return `<fieldset class="tf-group tf-${kind}"><legend>${title}</legend>${items.map((it,n)=>`<label class="tf-item"><input type="checkbox" data-pick="${kind}:${n}"><span class="tf-check" aria-hidden="true"></span><span class="tf-text"><strong>${esc(it.label)}</strong><span>${kind==='options'?'<i class="bubble optional" aria-hidden="true">+</i> Option: ':''}${esc(it.value)}</span>${it.before?`<small>${esc(here.name)}: ${esc(it.before)}</small>`:''}</span></label>`).join('')}</fieldset>`;
}

const listOf=a=>a.length>1?a.slice(0,-1).join(', ')+' and '+a.at(-1):a[0]||'';
// Trims the factory guide describes only in part: named, with what is in stock, but not walked through.
function othersView(){
 const m=modelOf(state.model);if(!m.others.length)return '';
 return `<section class="tf-others"><h3>Other ${esc(m.year+' '+m.name)} trims</h3><p class="tf-small">The factory guide has fewer published details for these, so they aren’t in the steps above. Ask us about any of them.</p><ul>${m.others.map(t=>{const s=stock.trims?.[state.model+'/'+t.id];return `<li><strong>${esc(t.name)}</strong>${t.difference?` — ${esc(t.difference)}`:''} <small>${s?`${s.count} in stock${s.from?' · from '+money(s.from):''}`:'None in stock'}</small></li>`;}).join('')}</ul></section>`;
}
let offer=null;
function stepView(){
 const trims=trimsOf(),here=trims[state.at],next=trims[state.at+1],m=modelOf(state.model);
 const std=standardEquipment(here);
 offer=next?stepUp(here,next):null;
 const first=state.at===0&&!state.picks.length;
 return `${pathView()}
 ${state.note?`<p class="tf-note">${esc(state.note)}</p>`:''}
 ${first&&m.below.length?`<p class="tf-note">The ${esc(listOf(m.below.map(t=>t.name)))} ${m.below.length===1?'has':'have'} only partial details in the factory guide, so we start with the ${esc(here.name)}. Ask us about the ${esc(listOf(m.below.map(t=>t.name)))}.</p>`:''}
 <article class="tf-current">
  ${photo(here)}
  <div class="tf-current-text"><p class="eyebrow">${first?'Start here · the base model':'You’re on'}</p><h2>${esc(m.year+' '+m.name)} <span>${esc(here.name)}</span></h2>${here.difference?`<p>${esc(here.difference)}</p>`:''}${stockLine(here)}
  ${state.picks.length?`<div class="tf-picks"><strong>You picked:</strong> ${state.picks.map(p=>`<span>${esc(p.label)}${p.need==='option'?' (option)':''}</span>`).join('')}</div>`:''}</div>
 </article>
 <details class="tf-standard"${first?' open':''}><summary>Everything standard on the ${esc(here.name)} <small>(${std.length})</small></summary><ul>${std.map(f=>`<li><i class="bubble standard" aria-hidden="true">✓</i><span><strong>${esc(f.label)}</strong> ${esc(f.value)}</span></li>`).join('')}</ul>${(here.comparison||[]).some(f=>f.status==='optional')?`<p class="tf-small">Options you can add to the ${esc(here.name)}: ${(here.comparison||[]).filter(f=>f.status==='optional').map(f=>esc(f.label)).join(', ')}.</p>`:''}</details>
 ${next?`<section class="tf-next">
  <div class="tf-next-head">${photo(next,'tf-next-photo')}<div><p class="eyebrow">Next trim up</p><h3>Want more? The ${esc(next.name)} adds:</h3>${next.difference?`<p>${esc(next.difference)}</p>`:''}${stockLine(next)}</div></div>
  <p class="tf-how">Check anything you want. We’ll take you to the first trim that has all of it.</p>
  ${pickList('New on the '+esc(next.name),offer.adds,'adds')}
  ${pickList('Different on the '+esc(next.name),offer.changes,'changes')}
  ${pickList('Options you can add on the '+esc(next.name),offer.options,'options')}
  ${!offer.adds.length&&!offer.changes.length&&!offer.options.length?`<p class="tf-small">The factory guide lists nothing the ${esc(next.name)} adds over the ${esc(here.name)}.</p>`:''}
  <div class="tf-actions"><button type="button" class="btn" data-act="up" disabled>Pick what you want above</button><button type="button" class="tf-secondary" data-act="skip">Skip the ${esc(next.name)} — show the next trim</button><button type="button" class="tf-secondary" data-act="done">I’m done — the ${esc(here.name)} is my trim</button></div>
 </section>`:`<section class="tf-next tf-top"><h3>You’re at the top of the ${esc(m.year+' '+m.name)} lineup.</h3><div class="tf-actions"><button type="button" class="btn" data-act="done">See my match</button></div></section>`}
 <p class="tf-restart"><button type="button" class="tf-link" data-act="restart">Choose a different vehicle</button></p>`;
}

function resultView(){
 const trims=trimsOf(),here=trims[state.at],m=modelOf(state.model),s=stockFor(here);
 const status=pickStatus(here,state.picks),options=status.filter(p=>p.on==='option'),missing=status.filter(p=>!p.on);
 const prev=state.path.length>1?trims[state.path[state.path.length-2]]:trims[state.at-1];
 const compare=`/trim-guide?model=${encodeURIComponent(state.model)}&trims=${[prev?.id,here.id].filter(Boolean).map(encodeURIComponent).join(',')}`;
 const request=`I used Perfect Match on Cars With Sam and landed on the ${fullName(here)}.`+(state.picks.length?` What I want: ${state.picks.map(p=>p.label+(p.need==='option'?' (option)':'')).join(', ')}.`:'')+` Can you help me find the right one?`;
 const cars=s?.vehicles||[];
 return `${pathView()}
 <article class="tf-current tf-result">
  ${photo(here)}
  <div class="tf-current-text"><p class="eyebrow">Your match</p><h2>${esc(m.year+' '+m.name)} <span>${esc(here.name)}</span></h2>${here.difference?`<p>${esc(here.difference)}</p>`:''}${stockLine(here)}</div>
 </article>
 ${state.picks.length?`<section class="tf-summary"><h3>What you picked</h3><ul>${status.map(p=>`<li>${p.on==='standard'?'<i class="bubble standard" aria-hidden="true">✓</i>':p.on==='option'?'<i class="bubble optional" aria-hidden="true">+</i>':'<i class="bubble verify" aria-hidden="true">!</i>'}<span><strong>${esc(p.label)}</strong> ${esc(p.value)} <small>${p.on==='standard'?'Standard on the '+esc(here.name):p.on==='option'?'Available as an option on the '+esc(here.name):'Not listed for the '+esc(here.name)+' in the factory guide'}</small></span></li>`).join('')}</ul>
  ${options.length?`<p class="tf-small">Options aren’t on every ${esc(here.name)}. Each vehicle’s window sticker shows what it has — we can find one with what you want.</p>`:''}
  ${missing.length?`<p class="tf-small">No single trim lists everything you picked. The ${esc(here.name)} has the most; ask us about the rest.</p>`:''}</section>`:''}
 <section class="tf-instock"><h3>${cars.length?`${cars.length} in stock now`:`None in stock right now`}</h3>
  ${cars.length?`<div class="tf-cars">${cars.map((v,i)=>`<a class="tf-car${i>=6?' tf-more':''}" href="/vehicle-${esc(v.vin)}"${i>=6?' hidden':''}>${v.photo?`<img src="${esc(v.photo)}" alt="" loading="lazy">`:''}<span><strong>${esc(v.title)}</strong><span>${v.price?money(v.price):'Ask for price'}${v.stock?` · Stock ${esc(v.stock)}`:''}</span></span></a>`).join('')}</div>${cars.length>6?`<button type="button" class="tf-secondary" data-act="more">Show all ${cars.length}</button>`:''}`:`<p>Text Sam and he’ll look for one — or check the trims around it.</p>`}
 </section>
 ${othersView()}
 <div class="tf-actions tf-final"><a class="btn" href="/contact?request=${encodeURIComponent(request)}">Ask Sam about a ${esc(here.name)}</a>${prev?`<a class="tf-secondary" href="${esc(compare)}">Compare it with the ${esc(prev.name)}</a>`:''}${s?.query?`<a class="tf-secondary" href="/inventory?q=${encodeURIComponent(s.query)}">Search Find Your Car</a>`:''}<button type="button" class="tf-secondary" data-act="back">Go back a step</button><button type="button" class="tf-link" data-act="restart">Start over</button></div>`;
}

function draw(scroll){
 if(!state.model||!modelOf(state.model)){root.innerHTML=pickerView();}
 else root.innerHTML=state.done?resultView():stepView();
 if(scroll)root.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
 const up=root.querySelector('[data-act=up]');
 if(up){
  const sync=()=>{const n=root.querySelectorAll('[data-pick]:checked').length;up.disabled=!n;up.textContent=n?`Take me to the trim with ${n===1?'this':'these '+n}`:'Pick what you want above';};
  root.querySelectorAll('[data-pick]').forEach(b=>b.addEventListener('change',sync));sync();
 }
}

root.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.brand){state={...state,brand:b.dataset.brand};draw(false);return;}
 if(b.dataset.model){go({model:b.dataset.model,at:0,path:[0],picks:[],done:false,note:null});return;}
 if(b.dataset.back){const i=Number(b.dataset.back),keep=state.path.slice(0,state.path.indexOf(i)+1);go({at:i,path:keep,done:false,note:null,picks:state.picks.filter(p=>keep.includes(p.at))});return;}
 const act=b.dataset.act;
 if(act==='restart'){go({model:null,at:0,path:[0],picks:[],done:false,note:null});return;}
 if(act==='more'){root.querySelectorAll('.tf-more').forEach(a=>a.hidden=false);b.remove();return;}
 if(act==='back'){history.back();return;}
 if(act==='done'){go({done:true,note:null});return;}
 const trims=trimsOf();
 if(act==='skip'){go({at:state.at+1,path:[...state.path,state.at+1],note:null});return;}
 if(act==='up'){
  const chosen=[...root.querySelectorAll('[data-pick]:checked')].map(x=>{const [kind,n]=x.dataset.pick.split(':');return {...offer[kind][Number(n)],at:state.at};});
  const picks=[...state.picks,...chosen],match=nextMatch(modelOf(state.model).model,state.at,picks);
  if(!match){go({done:true,picks,note:null});return;}
  const skipped=trims.slice(state.at+1,match.index).map(t=>t.name);
  const note=match.missing.length?`No single trim has everything you picked. The ${trims[match.index].name} has the most of it.`:skipped.length?`The ${trims[match.index].name} is the first trim with everything you picked${skipped.length?` (we skipped the ${skipped.join(', ')})`:''}.`:null;
  go({at:match.index,path:[...state.path,match.index],picks,note});
 }
});

try{
 const [guide,inStock]=await Promise.all([fetch('/trim-standard-data.json').then(r=>{if(!r.ok)throw Error('guide');return r.json();}),fetch('/data/trim-stock.json').then(r=>r.ok?r.json():{trims:{}}).catch(()=>({trims:{}}))]);
 data=guide;stock=inStock;models=finderModels(data);
 const start=params.get('model');
 if(start&&modelOf(start)){state.model=start;state.brand=modelOf(start).brand;}
 save(true);draw(false);
}catch(e){console.error(e);root.innerHTML='<p class="empty-state">The trim guide could not load. Please refresh the page.</p>';}
