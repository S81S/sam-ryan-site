// Perfect Match (the interactive car-buying guide) and Fleet Match (the same guide for fleet lineups): start at the base
// trim, see what it comes with and what you can add, see everything the next trim adds, pick what you want and land on
// the first trim that has it — with the vehicles listed in inventory that have it, whatever their trim, matched by VIN and window
// sticker (data/trim-stock.json). Trim equipment comes from the factory's own standard/optional charts (data/factory, see
// factory-facts.mjs), shown in the chart's words minus order codes (plain-labels.mjs); lineups without a chart use the
// trim guide.
import {finderModels,standardEquipment,stepUp,trimOptions,nextMatch,pickStatus,inventoryFit} from './trim-ladder.mjs';
import {lineups,withChart,FLEET} from './factory-facts.mjs';
import {plainFact} from './plain-labels.mjs';

const root=document.getElementById('finder');
const fleet=root.dataset.mode==='fleet';
const toolName=fleet?'Fleet Match':'Perfect Match';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number.isFinite(n)?'$'+Math.round(n).toLocaleString('en-US'):'';
const plural=(n,one,many)=>n===1?one:many;
const listOf=a=>a.length>1?a.slice(0,-1).join(', ')+' and '+a.at(-1):a[0]||'';
const params=new URLSearchParams(location.search);
let maxPrice=Math.max(0,Math.min(1000000,Number(params.get('maxPrice'))||0));
let stock={trims:{}},models=[];
const loaded=new Map();
// Where the shopper is: the lineup, the trim they are on, the trims they passed, and what they picked.
const blank={model:null,at:0,path:[0],picks:[],done:false,note:null};
let state={...blank};

const modelOf=id=>models.find(m=>m.id===id);
const current=()=>modelOf(state.model);
const trimsOf=()=>current().model.trims;
const allTrims=()=>{const m=current();return [...m.model.trims,...m.others];};
const fullName=trim=>{const m=current();return `${m.year} ${m.name.startsWith(m.brand)?'':m.brand+' '}${m.name} ${trim.name}`;};
const factOf=(trim,key)=>(trim?.comparison||[]).find(f=>f.key===key)||null;

function save(replace){
 const url=new URL(location.href);url.search='';
 if(state.model)url.searchParams.set('model',state.model);
 if(maxPrice)url.searchParams.set('maxPrice',String(maxPrice));
 history[replace?'replaceState':'pushState']({...state},'',url);
}
window.addEventListener('popstate',async e=>{state=e.state&&'path' in e.state?{...e.state}:{...blank};await ensureChart();draw(false);});
async function go(next){state={...state,...next};await ensureChart();save(false);draw(true);}
// A lineup's chart file loads when the shopper opens it.
async function ensureChart(){
 const m=current();if(!m||!m.file||m.charted)return;
 if(!loaded.has(m.file))loaded.set(m.file,fetch('/data/factory/'+m.file).then(r=>{if(!r.ok)throw Error('chart');return r.json();}));
 const i=models.indexOf(m);
 try{const entry=await loaded.get(m.file);if(i>=0&&!models[i].charted)models[i]=withChart(m,entry,{fleet});}
 // The chart file did not load: fall back to the trim guide's own rows for this lineup.
 catch(e){console.error(e);loaded.delete(m.file);if(i>=0)models[i]={...m,file:null,charted:false};}
}

// ---- Stock (data/trim-stock.json: every new vehicle listed in inventory, its trim by VIN and window sticker) ----
// Lineups that share one stock model (the Grand Cherokee and Grand Cherokee L) keep only their own vehicles, by title.
const ownVehicle=(m,v)=>{const f=m?.stockFilter;if(!f)return true;const t=String(v.title||'').toUpperCase();return f.only?new RegExp(f.only).test(t):!new RegExp(f.not).test(t);};
function stockEntry(m=current()){
 const e=stock.models?.[m?.stockId]||null;
 return e&&(m?.stockFilter||maxPrice)?{...e,vehicles:e.vehicles.filter(v=>ownVehicle(m,v)&&(!maxPrice||Number.isFinite(v.price)&&v.price<=maxPrice))}:e;
}
function stockFor(trim,m=current()){
 if(!m?.stockFilter&&!maxPrice)return stock.trims?.[m?.stockId+'/'+trim.id]||null;
 const vs=(stockEntry(m)?.vehicles||[]).filter(v=>v.trim===trim.id),prices=vs.map(v=>v.price).filter(Number.isFinite);
 return vs.length?{count:vs.length,from:prices.length?Math.min(...prices):null,query:stock.trims?.[m.stockId+'/'+trim.id]?.query||null}:null;
}
function stockLine(trim){
 const s=stockFor(trim);
 return s?`<p class="tf-stock"><strong>${s.count} listed in inventory</strong>${s.from?` · from ${money(s.from)}`:''}</p>`:`<p class="tf-stock tf-none">None listed in this snapshot</p>`;
}
function photo(trim,cls='tf-photo'){return trim.imageUrl?`<img class="${cls}" src="${esc(trim.imageUrl)}" alt="${esc(fullName(trim))}" loading="lazy">`:'';}

function pickerView(){
 const brands=[...new Set(models.map(m=>m.brand))];
 const brand=state.brand&&brands.includes(state.brand)?state.brand:brands[0];
 return `<div class="tf-budget"><label for="tf-budget">Your maximum listed price (optional)</label><input id="tf-budget" type="number" inputmode="numeric" min="0" max="1000000" step="1000" value="${maxPrice||''}" placeholder="For example, 50000"><small>Prices may include conditional incentives. Confirm your price with us.</small></div><h2 class="tf-title">${fleet?'What does your business need?':'What are you shopping for?'}</h2>
 ${fleet?'':`<p class="tf-small">Shopping for a work fleet — chassis cabs or vans? <a href="/fleet-match">Try Fleet Match</a>.</p>`}
 <div class="tf-brands" role="group" aria-label="Brand">${brands.map(b=>`<button type="button" data-brand="${esc(b)}" aria-pressed="${b===brand}">${esc(b)}</button>`).join('')}</div>
 <div class="tf-models">${models.filter(m=>m.brand===brand).map(m=>{const base=m.model.trims[0],all=[...m.model.trims,...m.others],count=all.reduce((n,t)=>n+(stockFor(t,m)?.count||0),0);
  return `<button type="button" class="tf-model" data-model="${esc(m.id)}">${base.imageUrl?`<img src="${esc(base.imageUrl)}" alt="" loading="lazy">`:''}<span><small>${m.year}</small><strong>${esc(m.name)}</strong><small>${all.length} ${plural(all.length,'trim','trims')}${count?` · ${count} listed in inventory`:' · Research only — none listed'}</small></span></button>`;}).join('')}</div>`;
}

function pathView(){
 const trims=trimsOf();
 return `<ol class="tf-path" aria-label="Trims in this lineup">${trims.map((t,i)=>{const visited=state.path.includes(i),here=i===state.at;
  return `<li class="${here?'here':visited?'visited':i<state.at?'passed':''}">${visited&&!here?`<button type="button" data-back="${i}">${esc(t.name)}</button>`:`<span${here?' aria-current="step"':''}>${esc(t.name)}</span>`}</li>`;}).join('')}</ol>`;
}

// One equipment line in plain words: what it belongs to, the item, a package's contents, any note.
function itemText(f){
 const p=plainFact(f);
 return `${p.group?`<small class="tf-group-name">${esc(p.group)}</small>`:''}<strong>${esc(p.name)}</strong>${p.detail?`<span>${esc(p.detail)}</span>`:''}${p.includes?`<small class="tf-includes">Includes ${esc(p.includes)}</small>`:''}${p.note?`<small class="tf-note-line">${esc(p.note)}</small>`:''}`;
}
const pickName=f=>{const p=plainFact(f);return p.group?`${p.group}: ${p.name}`:p.name;};
function bySection(list){
 const groups=[];
 for(const f of list){const name=plainFact(f).section||'';let g=groups.find(x=>x.name===name);if(!g){g={name,items:[]};groups.push(g);}g.items.push(f);}
 return groups;
}
// A checkbox list. Each item is shown from its fact on `trim` (the chart row), so it reads in plain words.
function pickList(title,items,kind,trim){
 if(!items.length)return '';
 const here=trimsOf()[state.at],option=kind==='options'||kind==='own';
 return `<fieldset class="tf-group tf-${kind}"><legend>${title}</legend>${items.map((it,n)=>{const f=factOf(trim,it.key)||it;
  return `<label class="tf-item"><input type="checkbox" data-pick="${kind}:${n}"><span class="tf-check" aria-hidden="true"></span><span class="tf-text">${option?'<em class="tf-tag tf-tag-opt"><i class="bubble optional" aria-hidden="true">+</i> Option</em>':''}${itemText(f)}${it.before?`<small class="tf-before">${esc(here.name)}: ${esc(/^Optional/.test(it.before)?'optional — '+(it.before.replace(/^Optional:?\s*/,'')||'extra cost'):it.before==='Not offered'?'not available':it.before)}</small>`:''}</span></label>`;}).join('')}</fieldset>`;
}

// ---- What's listed in inventory with everything picked so far, on any trim ----
function carCard(r,i,limit){
 const t=allTrims().find(x=>x.id===r.v.trim),name=t?.name||'',missing=r.fit.filter(f=>f.on==='no'),check=r.fit.filter(f=>f.on==='check');
 return `<a class="tf-car${i>=limit?' tf-more':''}" href="/vehicle-${esc(r.v.vin)}"${i>=limit?' hidden':''}>${r.v.photo?`<img src="${esc(r.v.photo)}" alt="" loading="lazy">`:''}<span><em class="tf-trimtag">${esc(name)}</em><strong>${esc(r.v.title)}</strong><span>${r.v.price?money(r.v.price):'Ask for price'}${r.v.stock?` · Stock ${esc(r.v.stock)}`:''}</span>${r.v.color?`<small>${esc(r.v.color)}</small>`:''}${r.fit.length?(missing.length||check.length?`${missing.length?`<small class="tf-miss">Missing: ${esc(missing.map(f=>f.pick.name).join(', '))}</small>`:''}${check.length?`<small class="tf-ask">Ask us: ${esc(check.map(f=>f.pick.name).join(', '))}</small>`:''}`:`<small class="tf-hit">✓ Has everything you picked</small>`):''}</span></a>`;
}
function carList(list,limit=6){
 return `<div class="tf-cars">${list.map((r,i)=>carCard(r,i,limit)).join('')}</div>${list.length>limit?`<button type="button" class="tf-secondary" data-act="more">Show all ${list.length}</button>`:''}`;
}
function liveStock(here){
 const e=stockEntry();if(!e?.vehicles?.length||!state.picks.length)return '';
 const fit=inventoryFit(e,allTrims(),state.picks),onHere=fit.exact.filter(r=>r.v.trim===here.id),elsewhere=fit.exact.filter(r=>r.v.trim!==here.id);
 if(!fit.exact.length){
  const maybe=fit.possible.length;
  return `<section class="tf-live-stock"><p class="tf-live">Nothing listed in inventory has everything you’ve picked right now${maybe?` — ${maybe} may, ask us to confirm`:''}. We’ll show the closest at the end.</p></section>`;
 }
 const trimsWord=plural(new Set(elsewhere.map(r=>r.v.trim)).size,'another trim','other trims');
 const head=onHere.length?`<strong>${onHere.length}</strong> ${esc(here.name)} listed in inventory ${plural(onHere.length,'has','have')} everything you’ve picked${elsewhere.length?`, and ${elsewhere.length} on ${trimsWord}`:''}`
  :`No ${esc(here.name)} listed in inventory has everything you’ve picked — but ${elsewhere.length} on ${trimsWord} ${plural(elsewhere.length,'does','do')}`;
 return `<section class="tf-live-stock"><p class="tf-live">${head}:</p>${carList([...onHere,...elsewhere],3)}</section>`;
}

let offer=null;
function stepView(){
 const trims=trimsOf(),here=trims[state.at],next=trims[state.at+1],m=current();
 const std=standardEquipment(here);
 // The next trim's list leaves out what this trim already has: standard here, standard on a trim below, or (for a
 // lineup without a full chart) on the window sticker of one of this trim's vehicles listed in inventory.
 const entry=stockEntry();
 const onCurrent=key=>{if(m.charted)return false;const ids=entry?.rows?.[key]||[];return !!ids.length&&(entry?.vehicles||[]).some(v=>v.trim===here.id&&v.sticker&&ids.some(n=>v.y.includes(n)));};
 offer={...(next?stepUp(here,next,{below:[...(m.charted?[]:m.below),...trims.slice(0,state.at)],onCurrent}):{adds:[],changes:[],options:[]}),own:trimOptions(here).filter(o=>!state.picks.some(p=>p.key===o.key))};
 const first=state.at===0&&!state.picks.length;
 return `${pathView()}
 ${state.note?`<p class="tf-note">${esc(state.note)}</p>`:''}
 ${first&&m.below.length?`<p class="tf-note">The ${esc(listOf(m.below.map(t=>t.name)))} ${m.charted?(m.below.length===1?'isn’t a separate column':'aren’t separate columns')+' in the factory chart':(m.below.length===1?'has':'have')+' only partial details in the factory guide'}, so we start with the ${esc(here.name)}. Ask us about the ${esc(listOf(m.below.map(t=>t.name)))}.</p>`:''}
 <article class="tf-current">
  ${photo(here)}
  <div class="tf-current-text"><p class="eyebrow">${first?'Start here · the base model':'You’re on'}</p><h2>${esc(m.year+' '+m.name)} <span>${esc(here.name)}</span></h2>${here.difference?`<p>${esc(here.difference)}</p>`:''}${stockLine(here)}
  ${state.picks.length?`<div class="tf-picks"><strong>You picked:</strong> ${state.picks.map(p=>`<span>${esc(p.name)}${p.need==='option'?' (option)':''}</span>`).join('')}</div>`:''}</div>
 </article>
 ${liveStock(here)}
 <div class="tf-priorities"><h3>What matters to you?</h3><p>Find an option below, then check the ones you want.</p><div class="tf-priority-buttons">${['Seats','Screen','Audio','Roof','Camera','Towing','Engine'].map(label=>`<button type="button" data-priority="${label.toLowerCase()}">${label}</button>`).join('')}</div><label for="tf-feature-search">Search choices on this step</label><input id="tf-feature-search" type="search" placeholder="Try heated seats, Harman Kardon or sunroof"><p id="tf-feature-count" role="status"></p></div>
 <details class="tf-standard"><summary>${first?`What comes standard on the ${esc(here.name)}, the base of the lineup`:`Everything standard on the ${esc(here.name)}`} <small>(${std.length})</small></summary>${bySection(std).map(g=>`${g.name?`<h3 class="tf-section">${esc(g.name)}</h3>`:''}<ul>${g.items.map(f=>`<li><i class="bubble standard" aria-hidden="true">✓</i><span>${itemText(f)}</span></li>`).join('')}</ul>`).join('')}</details>
 ${offer.own.length?`<section class="tf-own">${pickList('Options you can add to the '+esc(here.name),offer.own,'own',here)}${next?'':`<div class="tf-actions"><button type="button" class="btn" data-act="up" disabled>Pick what you want above</button></div>`}</section>`:''}
 ${next?`<section class="tf-next">
  <div class="tf-next-head">${photo(next,'tf-next-photo')}<div><p class="eyebrow">Next trim up</p><h3>Step up to the ${esc(next.name)}</h3><p class="tf-sub">What the ${esc(next.name)} adds over the ${esc(here.name)}</p>${next.difference?`<p>${esc(next.difference)}</p>`:''}${stockLine(next)}</div></div>
  <p class="tf-how">Check anything you want — options on the ${esc(here.name)} above, or what the ${esc(next.name)} adds. We’ll take you to the first trim that has all of it.</p>
  ${pickList('New on the '+esc(next.name),offer.adds,'adds',next)}
  ${pickList('Different on the '+esc(next.name),offer.changes,'changes',next)}
  ${pickList('Options you can add on the '+esc(next.name),offer.options,'options',next)}
  ${!offer.adds.length&&!offer.changes.length&&!offer.options.length?`<p class="tf-small">The factory chart lists nothing the ${esc(next.name)} adds over the ${esc(here.name)}.</p>`:''}
  <div class="tf-actions"><button type="button" class="btn" data-act="up" disabled>Pick what you want above</button><button type="button" class="tf-secondary" data-act="skip">Skip the ${esc(next.name)} — show the next trim</button><button type="button" class="tf-secondary" data-act="done">I’m done — the ${esc(here.name)} is my trim</button></div>
 </section>`:`<section class="tf-next tf-top"><h3>You’re at the top of the ${esc(m.year+' '+m.name)} lineup.</h3><div class="tf-actions"><button type="button" class="btn" data-act="done">See my match</button></div></section>`}
 ${sourceNote()}
 <p class="tf-restart"><button type="button" class="tf-link" data-act="restart">Choose a different vehicle</button></p>`;
}

// Every vehicle of this lineup listed in inventory, matched to the picks by VIN and its own window sticker, whatever its trim.
function inventoryView(here){
 const m=current(),entry=stockEntry(),label=`${m.year} ${m.name}`;
 if(!entry?.vehicles?.length)return `<section class="tf-instock"><h3>No ${esc(label)} listed in this snapshot</h3><p>Text Sam and he’ll look for one.</p></section>`;
 if(!state.picks.length){
  const list=inventoryFit(entry,allTrims(),[]).rows,mine=list.filter(r=>r.v.trim===here.id),rest=list.filter(r=>r.v.trim!==here.id);
  if(mine.length)return `<section class="tf-instock"><h3>${mine.length} ${esc(here.name)} listed in inventory</h3>${carList(mine)}</section>`;
  return `<section class="tf-instock"><h3>No ${esc(here.name)} listed in this snapshot</h3>${rest.length?`<p class="tf-small">These ${esc(label)}s are listed in this snapshot:</p>${carList(rest)}`:'<p>Text Sam and he’ll look for one.</p>'}</section>`;
 }
 const fit=inventoryFit(entry,allTrims(),state.picks),total=entry.vehicles.length;
 const mine=fit.exact.filter(r=>r.v.trim===here.id),others=fit.exact.filter(r=>r.v.trim!==here.id);
 const gone=fit.availability.filter(a=>!a.yes);
 const summary=`<ul class="tf-avail">${fit.availability.map(a=>`<li class="${a.yes?'':'tf-gone'}">${a.yes?'<i class="bubble standard" aria-hidden="true">✓</i>':'<i class="bubble unavailable" aria-hidden="true">−</i>'}<span><strong>${esc(a.pick.name)}</strong> <small>${a.yes?`on ${a.yes} of our ${total} ${esc(label)}s`:a.check?`not confirmed on any of our ${total} — ${a.check} to check with us`:`not on any ${esc(label)} listed in this snapshot`}</small></span></li>`).join('')}</ul>`;
 let body;
 if(fit.exact.length)body=`<h3>${mine.length?`${mine.length} ${esc(here.name)}`:`No ${esc(here.name)}`} listed in inventory ${mine.length===1?'has':mine.length?'have':'has'} everything you picked</h3>${mine.length?`<p class="tf-small">Checked against each vehicle’s own window sticker.</p>${carList(mine)}`:''}${others.length?`<h4 class="tf-subhead">${mine.length?'Also listed in inventory':'Listed in inventory'} — other trims with everything you picked</h4>${carList(others)}`:''}`;
 else body=`<h3>No vehicle in this inventory snapshot has everything you picked</h3><p class="tf-small">Here’s what we have of each pick, checked against every ${esc(label)}’s window sticker:</p>${summary}${fit.possible.length?`<h4 class="tf-subhead">May have it all — ask us to confirm</h4>${carList(fit.possible)}`:''}${fit.rows.length?`<h4 class="tf-subhead">Closest listed in inventory</h4>${carList(fit.rows.filter(r=>!fit.possible.includes(r)).slice(0,12))}`:''}<p class="tf-small">Want it exactly? Text Sam — he can locate or order one with everything on your list.</p>`;
 return `<section class="tf-instock">${body}${fit.exact.length&&gone.length?summary:''}</section>`;
}
function resultView(){
 const trims=trimsOf(),here=trims[state.at],m=current(),s=stockFor(here);
 const status=pickStatus(here,state.picks),options=status.filter(p=>p.on==='option'),missing=status.filter(p=>!p.on);
 const prev=state.path.length>1?trims[state.path[state.path.length-2]]:trims[state.at-1];
 const compare=`/trim-guide?model=${encodeURIComponent(current().stockId||state.model)}&trims=${[prev?.id,here.id].filter(Boolean).map(encodeURIComponent).join(',')}`;
 const request=`I used ${toolName} on Cars With Sam and landed on the ${fullName(here)}.`+(state.picks.length?` What I want: ${state.picks.map(p=>p.name+(p.need==='option'?' (option)':'')).join(', ')}.`:'')+(maxPrice?` My maximum listed price is ${money(maxPrice)}.`:'')+` Can you help me find the right one?`;
 return `${pathView()}
 <article class="tf-current tf-result">
  ${photo(here)}
  <div class="tf-current-text"><p class="eyebrow">Your match</p><h2>${esc(m.year+' '+m.name)} <span>${esc(here.name)}</span></h2>${here.difference?`<p>${esc(here.difference)}</p>`:''}${stockLine(here)}</div>
 </article>
 ${state.picks.length?`<section class="tf-summary"><h3>What you picked</h3><ul>${status.map(p=>{const f=factOf(here,p.base||p.key),note=f?plainFact(f).note:'';return `<li>${p.on==='standard'?'<i class="bubble standard" aria-hidden="true">✓</i>':p.on==='option'?'<i class="bubble optional" aria-hidden="true">+</i>':'<i class="bubble verify" aria-hidden="true">!</i>'}<span><strong>${esc(p.name)}</strong> <small>${p.on==='standard'?'Standard on the '+esc(here.name):p.on==='option'?'Available as an option on the '+esc(here.name)+(note?` — ${esc(note)}`:''):'Not available on the '+esc(here.name)}</small></span></li>`;}).join('')}</ul>
  ${options.length?`<p class="tf-small">Options aren’t on every ${esc(here.name)}. Each vehicle’s window sticker shows what it has — we can find one with what you want.</p>`:''}
  ${missing.length?`<p class="tf-small">No single trim has everything you picked. The ${esc(here.name)} has the most; ask us about the rest.</p>`:''}</section>`:''}
 ${inventoryView(here)}
 ${othersView()}
 ${sourceNote()}
 <div class="tf-actions tf-final"><a class="btn" href="/contact?request=${encodeURIComponent(request)}">Ask Sam about a ${esc(here.name)}</a>${prev?`<a class="tf-secondary" href="${esc(compare)}">Compare it with the ${esc(prev.name)}</a>`:''}${s?.query&&!state.picks.length?`<a class="tf-secondary" href="/inventory?q=${encodeURIComponent(s.query+(maxPrice?' under '+maxPrice:''))}">Browse this trim in Find Your Car</a>`:''}<button type="button" class="tf-secondary" data-act="back">Go back a step</button><button type="button" class="tf-link" data-act="restart">Start over</button></div>`;
}
// Trims the factory chart has no column for (special editions, packages sold as trims): named, with what is listed in inventory.
function othersView(){
 const m=current();if(!m.others.length)return '';
 const why=m.charted?'The factory chart doesn’t give these their own column (they’re special editions or packages on another trim), so they aren’t in the steps above.':'The factory guide has fewer published details for these, so they aren’t in the steps above.';
 return `<section class="tf-others"><h3>Other ${esc(m.year+' '+m.name)} trims</h3><p class="tf-small">${why} Ask us about any of them.</p><ul>${m.others.map(t=>{const s=stockFor(t);return `<li><strong>${esc(t.name)}</strong>${t.difference?` — ${esc(t.difference)}`:''} <small>${s?`${s.count} listed in inventory${s.from?' · from '+money(s.from):''}`:'None listed in inventory'}</small></li>`;}).join('')}</ul></section>`;
}
function sourceNote(){
 const m=current();
 if(m.charted&&m.chart?.url)return `<p class="tf-source">Standard and optional come straight from the factory’s own chart: <a href="${esc(m.chart.url)}" target="_blank" rel="noopener">${esc(m.chart.title||'Stellantis')} ${m.chart.kind==='fa'?'Feature Availability':'Fleet Buyer’s Guide'}</a>.</p>`;
 return `<p class="tf-source">The factory’s full chart for this lineup isn’t published yet. These details come from the manufacturer’s announcements — ask us to confirm anything you need.</p>`;
}

// The shopper's picks plus the boxes they have checked on this screen.
function withChecked(){
 const trims=trimsOf();
 const chosen=[...root.querySelectorAll('[data-pick]:checked')].map(x=>{const [kind,n]=x.dataset.pick.split(':'),it=offer[kind][Number(n)],trim=kind==='own'?trims[state.at]:trims[state.at+1];return {...it,name:pickName(factOf(trim,it.key)||it),at:state.at};});
 return [...state.picks,...chosen.filter((p,n)=>!state.picks.some(q=>q.key===p.key)&&chosen.findIndex(q=>q.key===p.key)===n)];
}
// The page's bottom bar (Perfect Match only): "See my selection" opens the match for the trim the shopper is on, with
// what they picked and the vehicles listed in inventory that have it.
const selection=document.querySelector('[data-selection]');
function syncSelection(){
 if(!selection)return;
 const n=state.done||!state.model||!current()?state.picks.length:withChecked().length;
 selection.innerHTML=!state.model||!current()?'Pick a vehicle to start':state.done?'Change my selection':`See my selection${n?` <b>${n}</b>`:''}`;
}
selection?.addEventListener('click',async()=>{
 if(!state.model||!current()){root.scrollIntoView({behavior:'smooth',block:'start'});return;}
 if(state.done){await go({done:false,note:null});return;}
 // The match is the first trim, from this one up, that has everything picked (the most of it when none has it all).
 const picks=withChecked(),match=picks.length?nextMatch(current().model,state.at-1,picks):null,at=match?match.index:state.at;
 await go({done:true,note:null,picks,at,path:state.path.includes(at)?state.path:[...state.path,at]});
});
root.addEventListener('change',e=>{if(e.target.id==='tf-budget'){maxPrice=Math.max(0,Math.min(1000000,Number(e.target.value)||0));save(true);draw(false);}});
function draw(scroll){
 if(!state.model||!current())root.innerHTML=pickerView();
 else root.innerHTML=state.done?resultView():stepView();
 const freshness=document.createElement('p');freshness.className='tf-snapshot';freshness.textContent='Inventory snapshot'+(Number.isFinite(Date.parse(stock.generatedAt))?' checked '+new Date(stock.generatedAt).toLocaleString('en-US',{timeZone:'America/Chicago',dateStyle:'medium',timeStyle:'short'})+' CT':'')+(maxPrice?' · Listed prices up to '+money(maxPrice):'')+'. Confirm current price and availability with Sam or Ryan.';root.prepend(freshness);
 syncSelection();
 const search=root.querySelector('#tf-feature-search');
 if(search){const terms={seats:/seat|leather|upholstery/i,screen:/screen|display|uconnect/i,audio:/audio|speaker|sound|harman|alpine|mcintosh/i,roof:/roof|sunroof|top/i,camera:/camera|view|parksense/i,towing:/tow|trailer|hitch/i,engine:/engine|hemi|hurricane|pentastar|powertrain/i};
 const filter=()=>{const value=search.value.trim().toLowerCase(),pattern=terms[value];let count=0;root.querySelectorAll('.tf-item').forEach(item=>{const text=item.textContent.toLowerCase(),show=!value||(pattern?pattern.test(text):text.includes(value));item.hidden=!show;if(show)count++;});root.querySelectorAll('.tf-group').forEach(group=>{group.hidden=![...group.querySelectorAll('.tf-item')].some(i=>!i.hidden);});root.querySelector('#tf-feature-count').textContent=value?count?`${count} choices on this step match. Clear the search to see all choices.`:"No matching choices at this step. Clear the search, or skip to the next trim to see more equipment.":'';};
 search.addEventListener('input',filter);root.querySelectorAll('[data-priority]').forEach(b=>b.addEventListener('click',()=>{search.value=b.dataset.priority;filter();}));}
 if(scroll)root.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
 const ups=root.querySelectorAll('[data-act=up]');
 if(ups.length){
  const sync=()=>{const n=root.querySelectorAll('[data-pick]:checked').length;ups.forEach(up=>{up.disabled=!n;up.textContent=n?`Continue with ${n===1?'this':'these '+n}`:'Pick what you want above';});};
  root.querySelectorAll('[data-pick]').forEach(b=>b.addEventListener('change',()=>{sync();syncSelection();}));sync();
 }
}

root.addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b||!root.contains(b))return;
 if(b.dataset.brand){state={...state,brand:b.dataset.brand};draw(false);return;}
 if(b.dataset.model){b.disabled=true;await go({...blank,brand:state.brand,model:b.dataset.model});return;}
 // Back to a trim on the path: the picks made from that trim on (which moved the shopper off it) are dropped.
 if(b.dataset.back){const i=Number(b.dataset.back),keep=state.path.slice(0,state.path.indexOf(i)+1);await go({at:i,path:keep,done:false,note:null,picks:state.picks.filter(p=>p.at<i&&keep.includes(p.at))});return;}
 const act=b.dataset.act;
 if(act==='restart'){await go({...blank,brand:state.brand});return;}
 if(act==='more'){b.previousElementSibling?.querySelectorAll('.tf-more').forEach(a=>a.hidden=false);b.remove();return;}
 if(act==='back'){history.back();return;}
 if(act==='done'){await go({done:true,note:null});return;}
 const trims=trimsOf();
 if(act==='skip'){await go({at:state.at+1,path:[...state.path,state.at+1],note:null});return;}
 if(act==='up'){
  // The first trim, this one included, with everything picked: options on this trim keep the shopper here.
  const picks=withChecked(),match=nextMatch(current().model,state.at-1,picks);
  if(match&&match.index===state.at&&match.missing.length){await go({picks,note:`No trim has everything you picked. The ${trims[state.at].name} has the most of it.`});return;}
  if(match&&match.index===state.at){await go({picks,note:`The ${trims[state.at].name} can have everything you picked so far.`});return;}
  if(!match){await go({done:true,picks,note:null});return;}
  const skipped=trims.slice(state.at+1,match.index).map(t=>t.name);
  const note=match.missing.length?`No single trim has everything you picked. The ${trims[match.index].name} has the most of it.`:skipped.length?`The ${trims[match.index].name} is the first trim with everything you picked (we skipped the ${skipped.join(', ')}).`:null;
  await go({at:match.index,path:[...state.path,match.index],picks,note});
 }
});

try{
 const [guide,index,inStock]=await Promise.all([
  fetch('/trim-standard-data.json').then(r=>{if(!r.ok)throw Error('guide');return r.json();}),
  fetch('/data/factory/index.json').then(r=>{if(!r.ok)throw Error('charts');return r.json();}),
  fetch('/data/trim-stock.json').then(r=>r.ok?r.json():{trims:{}}).catch(()=>({trims:{}}))]);
 stock=inStock;
 const charted=lineups(guide,index,{fleet}),chartedIds=new Set(charted.map(m=>m.stockId));
 // Lineups without a published factory chart stay in the guide when we have them listed in inventory (or, for fleet, always for
 // the ProMaster vans): built from the trim guide, and labeled as such.
 const fallback=finderModels(guide).filter(m=>!chartedIds.has(m.id)&&FLEET.includes(m.id)===fleet&&(fleet||stock.models?.[m.id]?.vehicles?.length))
  .map(m=>({...m,stockId:m.id,charted:false}));
 const order=x=>{const i=['Jeep','Ram','Dodge','Chrysler'].indexOf(x.brand);return i<0?9:i;},bare=x=>x.name.replace(/^(?:Ram|Chrysler)\s+/,'');
 models=[...charted,...fallback].sort((a,b)=>order(a)-order(b)||bare(a).localeCompare(bare(b))||a.year-b.year);
 const start=params.get('model');
 if(start&&modelOf(start)){state.model=start;state.brand=modelOf(start).brand;await ensureChart();}
 save(true);draw(false);
}catch(e){console.error(e);root.innerHTML='<p class="empty-state">The trim guide could not load. Please refresh the page.</p>';}
