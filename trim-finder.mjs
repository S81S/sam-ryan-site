// Perfect Match (the interactive car-buying guide) and Fleet Match (the same guide for fleet lineups): pick a color, start
// at the base trim, see everything each trim above it adds, pick what you want and land on the first trim that has it —
// with the matching vehicles in stock, whatever their trim. Trim equipment comes from the factory's own standard/optional
// charts (data/factory, see factory-facts.mjs); vehicles are matched by their own window stickers (data/trim-stock.json).
import {finderModels,standardEquipment,stepUp,trimOptions,nextMatch,pickStatus,inventoryFit} from './trim-ladder.mjs';
import {lineups,withChart,FLEET} from './factory-facts.mjs';
import {colorKey,swatch} from './color-names.mjs';

const root=document.getElementById('finder');
const fleet=root.dataset.mode==='fleet';
const toolName=fleet?'Fleet Match':'Perfect Match';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number.isFinite(n)?'$'+Math.round(n).toLocaleString('en-US'):'';
const params=new URLSearchParams(location.search);
let stock={trims:{}},models=[];
const loaded=new Map();
// Where the shopper is: the lineup, the color (undefined = not asked yet, null = any), the trim they are on, the trims
// they passed, and what they picked.
const blank={model:null,color:undefined,at:0,path:[0],picks:[],done:false,note:null};
let state={...blank};

const modelOf=id=>models.find(m=>m.id===id);
const current=()=>modelOf(state.model);
const sid=()=>current()?.stockId||state.model;
const trimsOf=()=>current().model.trims;
const allTrims=()=>{const m=current();return [...m.model.trims,...m.others];};
// Lineups that share one stock model (the Grand Cherokee and Grand Cherokee L) keep only their own vehicles, by title.
const ownVehicle=(m,v)=>{const f=m?.stockFilter;if(!f)return true;const t=String(v.title||'').toUpperCase();return f.only?new RegExp(f.only).test(t):!new RegExp(f.not).test(t);};
function stockFor(trim,m=current()){
 if(!m?.stockFilter)return stock.trims?.[(m?.stockId||state.model)+'/'+trim.id]||null;
 const vs=(stock.models?.[m.stockId]?.vehicles||[]).filter(v=>v.trim===trim.id&&ownVehicle(m,v)),prices=vs.map(v=>v.price).filter(Number.isFinite);
 return vs.length?{count:vs.length,from:prices.length?Math.min(...prices):null,query:stock.trims?.[m.stockId+'/'+trim.id]?.query||null}:null;
}
const fullName=trim=>{const m=current();return `${m.year} ${m.name.startsWith(m.brand)?'':m.brand+' '}${m.name} ${trim.name}`;};
const plural=(n,one,many)=>n===1?one:many;

function save(replace){
 const url=new URL(location.href);url.search='';
 if(state.model)url.searchParams.set('model',state.model);
 history[replace?'replaceState':'pushState']({...state},'',url);
}
window.addEventListener('popstate',async e=>{state=e.state?{...e.state}:{...blank};await ensureChart();draw(false);});
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

// ---- Inventory, filtered to the chosen color ----
function stockEntry(){
 const e=stock.models?.[sid()]||null,m=current();
 return e&&m?.stockFilter?{...e,vehicles:e.vehicles.filter(v=>ownVehicle(m,v))}:e;
}
function colorEntry(){
 const e=stockEntry();if(!e||!state.color)return e;
 return {...e,vehicles:e.vehicles.filter(v=>v.colorKey===state.color.key)};
}
function stockColors(){
 const by=new Map();
 for(const v of stockEntry()?.vehicles||[]){if(!v.colorKey)continue;const c=by.get(v.colorKey)||{key:v.colorKey,name:v.color,count:0};c.count++;by.set(v.colorKey,c);}
 return [...by.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));
}

function stockLine(trim){
 const s=stockFor(trim);
 return s?`<p class="tf-stock"><strong>${s.count} in stock</strong>${s.from?` · from ${money(s.from)}`:''}</p>`:`<p class="tf-stock tf-none">None in stock right now</p>`;
}
function photo(trim,cls='tf-photo'){return trim.imageUrl?`<img class="${cls}" src="${esc(trim.imageUrl)}" alt="${esc(fullName(trim))}" loading="lazy">`:'';}

function pickerView(){
 const brands=[...new Set(models.map(m=>m.brand))];
 const brand=state.brand&&brands.includes(state.brand)?state.brand:brands[0];
 return `<h2 class="tf-title">${fleet?'What does your business need?':'What are you shopping for?'}</h2>
 ${fleet?'':`<p class="tf-small">Shopping for a work fleet — chassis cabs or vans? <a href="/fleet-match">Try Fleet Match</a>.</p>`}
 <div class="tf-brands" role="group" aria-label="Brand">${brands.map(b=>`<button type="button" data-brand="${esc(b)}" aria-pressed="${b===brand}">${esc(b)}</button>`).join('')}</div>
 <div class="tf-models">${models.filter(m=>m.brand===brand).map(m=>{const base=m.model.trims[0],all=[...m.model.trims,...m.others],count=all.reduce((n,t)=>n+(stockFor(t,m)?.count||0),0);
  return `<button type="button" class="tf-model" data-model="${esc(m.id)}">${base.imageUrl?`<img src="${esc(base.imageUrl)}" alt="" loading="lazy">`:''}<span><small>${m.year}</small><strong>${esc(m.name)}</strong><small>${all.length} ${plural(all.length,'trim','trims')}${count?` · ${count} in stock`:''}</small></span></button>`;}).join('')}</div>`;
}

// ---- Step 1: color ----
function colorView(){
 const m=current(),onLot=stockColors(),lotKeys=new Set(onLot.map(c=>c.key));
 const factory=m.colors.filter(n=>!lotKeys.has(colorKey(n))).filter((n,i,a)=>a.findIndex(x=>colorKey(x)===colorKey(n))===i);
 const btn=(key,name,sub)=>`<button type="button" class="tf-color" data-color="${esc(key)}" data-color-name="${esc(name)}"><span class="tf-swatch" style="background:${swatch(name)}" aria-hidden="true"></span><span><strong>${esc(name)}</strong><small>${esc(sub)}</small></span></button>`;
 return `<p class="eyebrow">Step 1 · Color</p><h2 class="tf-title">What color ${esc(m.year+' '+m.name)}?</h2>
 <div class="tf-colors">
  <button type="button" class="tf-color tf-any" data-color=""><span class="tf-swatch tf-swatch-any" aria-hidden="true"></span><span><strong>Any color</strong><small>Show me everything</small></span></button>
  ${onLot.map(c=>btn(c.key,c.name,`${c.count} on our lot`)).join('')}
  ${factory.map(n=>btn(colorKey(n),n,'Factory color · none on our lot')).join('')}
 </div>
 <p class="tf-small">Colors on our lot come from each vehicle’s window sticker${factory.length?'; the others are from the factory buyer’s guide':''}. Not every color is offered on every trim — ask us about any color not shown.</p>
 <p class="tf-restart"><button type="button" class="tf-link" data-act="restart">Choose a different vehicle</button></p>`;
}

function pathView(){
 const trims=trimsOf();
 return `<ol class="tf-path" aria-label="Trims in this lineup">${state.color!==undefined&&(stockColors().length||current().colors?.length)?`<li class="visited"><button type="button" data-act="color">${state.color?`<span class="tf-dot" style="background:${swatch(state.color.name)}" aria-hidden="true"></span>${esc(state.color.name)}`:'Any color'}</button></li>`:''}${trims.map((t,i)=>{const visited=state.path.includes(i),here=i===state.at;
  return `<li class="${here?'here':visited?'visited':i<state.at?'passed':''}">${visited&&!here?`<button type="button" data-back="${i}">${esc(t.name)}</button>`:`<span${here?' aria-current="step"':''}>${esc(t.name)}</span>`}</li>`;}).join('')}</ol>`;
}

function pickList(title,items,kind){
 if(!items.length)return '';
 const here=trimsOf()[state.at],option=kind==='options'||kind==='own';
 return `<fieldset class="tf-group tf-${kind}"><legend>${title}</legend>${items.map((it,n)=>`<label class="tf-item"><input type="checkbox" data-pick="${kind}:${n}"><span class="tf-check" aria-hidden="true"></span><span class="tf-text"><strong>${esc(it.label)}</strong>${option||it.value||it.note?`<span>${option?'<i class="bubble optional" aria-hidden="true">+</i> Option':''}${it.value?(option?': ':'')+esc(it.value):''}${it.note?`${option||it.value?' · ':''}${esc(it.note)}`:''}</span>`:''}${it.before?`<small>${esc(here.name)}: ${esc(it.before)}</small>`:''}</span></label>`).join('')}</fieldset>`;
}

const listOf=a=>a.length>1?a.slice(0,-1).join(', ')+' and '+a.at(-1):a[0]||'';
// Trims the factory chart has no column for (special editions, packages sold as trims): named, with what is in stock.
function othersView(){
 const m=current();if(!m.others.length)return '';
 const why=m.charted?'The factory chart doesn’t give these their own column (they’re special editions or packages on another trim), so they aren’t in the steps above.':'The factory guide has fewer published details for these, so they aren’t in the steps above.';
 return `<section class="tf-others"><h3>Other ${esc(m.year+' '+m.name)} trims</h3><p class="tf-small">${why} Ask us about any of them.</p><ul>${m.others.map(t=>{const s=stockFor(t);return `<li><strong>${esc(t.name)}</strong>${t.difference?` — ${esc(t.difference)}`:''} <small>${s?`${s.count} in stock${s.from?' · from '+money(s.from):''}`:'None in stock'}</small></li>`;}).join('')}</ul></section>`;
}
function sourceNote(){
 const m=current();
 if(m.charted&&m.chart?.url)return `<p class="tf-source">Every item comes from the factory’s own chart: <a href="${esc(m.chart.url)}" target="_blank" rel="noopener">${esc(m.chart.title||'Stellantis')} ${m.chart.kind==='fa'?'Feature Availability':'Fleet Buyer’s Guide'}</a>.</p>`;
 return `<p class="tf-source">The factory’s full chart for this lineup isn’t published yet. These details come from the manufacturer’s announcements — ask us to confirm anything you need.</p>`;
}

// ---- What's in stock with everything picked so far, on any trim ----
function carCard(r,i,limit){
 const t=allTrims().find(x=>x.id===r.v.trim),name=t?.name||'',missing=r.fit.filter(f=>f.on==='no'),check=r.fit.filter(f=>f.on==='check');
 return `<a class="tf-car${i>=limit?' tf-more':''}" href="/vehicle-${esc(r.v.vin)}"${i>=limit?' hidden':''}>${r.v.photo?`<img src="${esc(r.v.photo)}" alt="" loading="lazy">`:''}<span><em class="tf-trimtag">${esc(name)}</em><strong>${esc(r.v.title)}</strong><span>${r.v.price?money(r.v.price):'Ask for price'}${r.v.stock?` · Stock ${esc(r.v.stock)}`:''}</span>${r.v.color?`<small class="tf-paint"><span class="tf-dot" style="background:${swatch(r.v.color)}" aria-hidden="true"></span>${esc(r.v.color)}</small>`:''}${state.picks.length?(missing.length||check.length?`${missing.length?`<small class="tf-miss">Missing: ${esc(missing.map(f=>f.pick.label).join(', '))}</small>`:''}${check.length?`<small class="tf-ask">Ask us: ${esc(check.map(f=>f.pick.label).join(', '))}</small>`:''}`:`<small class="tf-hit">✓ Everything you picked</small>`):''}</span></a>`;
}
function carList(list,key,limit=6){
 return `<div class="tf-cars">${list.map((r,i)=>carCard(r,i,limit)).join('')}</div>${list.length>limit?`<button type="button" class="tf-secondary" data-act="more" data-list="${key}">Show all ${list.length}</button>`:''}`;
}
const colorWord=()=>state.color?` in ${state.color.name}`:'';
function liveStock(here){
 const e=colorEntry();if(!stockEntry())return '';
 if(!state.picks.length&&!state.color)return '';
 const fit=inventoryFit(e,allTrims(),state.picks),exact=fit.exact,onHere=exact.filter(r=>r.v.trim===here.id),elsewhere=exact.filter(r=>r.v.trim!==here.id);
 const picked=state.picks.length>0;
 if(!exact.length){
  const anyColor=state.color&&picked?inventoryFit(stockEntry(),allTrims(),state.picks).exact:[];
  return `<section class="tf-live-stock"><p class="tf-live">${picked?`Nothing in our inventory${colorWord()} has everything you’ve picked right now${anyColor.length?` — but ${anyColor.length} in other colors ${plural(anyColor.length,'does','do')}`:''}. We’ll show the closest matches at the end.`:`Nothing${colorWord()} on our lot right now. Keep going — Sam can locate or order one.`}</p></section>`;
 }
 const trimsWord=plural(new Set(elsewhere.map(r=>r.v.trim)).size,'another trim','other trims');
 const head=!picked&&onHere.length?`<strong>${onHere.length}</strong> ${esc(here.name)}${colorWord()} on our lot${elsewhere.length?`, plus ${elsewhere.length} on ${trimsWord}`:''}`
  :onHere.length?`<strong>${onHere.length}</strong> ${esc(here.name)}${colorWord()} in our inventory ${plural(onHere.length,'has','have')} everything you’ve picked${elsewhere.length?`, and ${elsewhere.length} on ${trimsWord}`:''}`
  :state.picks.length?`No ${esc(here.name)}${colorWord()} in our inventory has everything you’ve picked — but ${elsewhere.length} on ${trimsWord} ${plural(elsewhere.length,'does','do')}`
  :`No ${esc(here.name)}${colorWord()} on our lot right now — but ${elsewhere.length} on ${trimsWord} ${plural(elsewhere.length,'is','are')}`;
 return `<section class="tf-live-stock"><p class="tf-live">${head}:</p>${carList([...onHere,...elsewhere],'live',3)}</section>`;
}

let offer=null;
function stepView(){
 const trims=trimsOf(),here=trims[state.at],next=trims[state.at+1],m=current();
 const std=standardEquipment(here);
 // The next trim's list leaves out what this trim already has: standard here, standard on a trim below, or (for a
 // lineup without a full chart) on the window sticker of one of this trim's vehicles in stock.
 const entry=stockEntry();
 const onCurrent=key=>{if(m.charted)return false;const ids=entry?.rows?.[key]||[];return !!ids.length&&(entry?.vehicles||[]).some(v=>v.trim===here.id&&v.sticker&&ids.some(n=>v.y.includes(n)));};
 offer={...(next?stepUp(here,next,{below:[...(m.charted?[]:m.below),...trims.slice(0,state.at)],onCurrent}):{adds:[],changes:[],options:[]}),own:trimOptions(here).filter(o=>!state.picks.some(p=>p.key===o.key))};
 const first=state.at===0&&!state.picks.length;
 const groups=[];for(const f of std){const g=f.section||'';let last=groups.at(-1);if(!last||last.name!==g){last={name:g,items:[]};groups.push(last);}last.items.push(f);}
 return `${pathView()}
 ${state.note?`<p class="tf-note">${esc(state.note)}</p>`:''}
 ${first&&m.below.length?`<p class="tf-note">The ${esc(listOf(m.below.map(t=>t.name)))} ${m.charted?(m.below.length===1?'isn’t a separate column':'aren’t separate columns')+' in the factory chart':(m.below.length===1?'has':'have')+' only partial details in the factory guide'}, so we start with the ${esc(here.name)}. Ask us about the ${esc(listOf(m.below.map(t=>t.name)))}.</p>`:''}
 <article class="tf-current">
  ${photo(here)}
  <div class="tf-current-text"><p class="eyebrow">${first?'Start here · the base model':'You’re on'}</p><h2>${esc(m.year+' '+m.name)} <span>${esc(here.name)}</span></h2>${here.difference?`<p>${esc(here.difference)}</p>`:''}${stockLine(here)}
  ${state.picks.length?`<div class="tf-picks"><strong>You picked:</strong> ${state.picks.map(p=>`<span>${esc(p.label)}${p.need==='option'?' (option)':''}</span>`).join('')}</div>`:''}</div>
 </article>
 ${liveStock(here)}
 <details class="tf-standard"${first?' open':''}><summary>${first?`What comes standard on the ${esc(here.name)}, the base of the lineup`:`Everything standard on the ${esc(here.name)}`} <small>(${std.length})</small></summary>${groups.map(g=>`${g.name&&groups.length>1?`<h4 class="tf-section">${esc(g.name)}</h4>`:''}<ul>${g.items.map(f=>`<li><i class="bubble standard" aria-hidden="true">✓</i><span><strong>${esc(f.label)}</strong> ${esc(f.value)}</span></li>`).join('')}</ul>`).join('')}</details>
 ${offer.own.length?`<section class="tf-own">${pickList('Options you can add to the '+esc(here.name),offer.own,'own')}${next?'':`<div class="tf-actions"><button type="button" class="btn" data-act="up" disabled>Pick what you want above</button></div>`}</section>`:''}
 ${next?`<section class="tf-next">
  <div class="tf-next-head">${photo(next,'tf-next-photo')}<div><p class="eyebrow">Next trim up</p><h3>Step up to the ${esc(next.name)}</h3><p class="tf-sub">What the ${esc(next.name)} adds over the ${esc(here.name)}</p>${next.difference?`<p>${esc(next.difference)}</p>`:''}${stockLine(next)}</div></div>
  <p class="tf-how">Check anything you want — options on the ${esc(here.name)} above, or what the ${esc(next.name)} adds. We’ll take you to the first trim that has all of it.</p>
  ${pickList('New on the '+esc(next.name),offer.adds,'adds')}
  ${pickList('Different on the '+esc(next.name),offer.changes,'changes')}
  ${pickList('Options you can add on the '+esc(next.name),offer.options,'options')}
  ${!offer.adds.length&&!offer.changes.length&&!offer.options.length?`<p class="tf-small">The factory chart lists nothing the ${esc(next.name)} adds over the ${esc(here.name)}.</p>`:''}
  <div class="tf-actions"><button type="button" class="btn" data-act="up" disabled>Pick what you want above</button><button type="button" class="tf-secondary" data-act="skip">Skip the ${esc(next.name)} — show the next trim</button><button type="button" class="tf-secondary" data-act="done">I’m done — the ${esc(here.name)} is my trim</button></div>
 </section>`:`<section class="tf-next tf-top"><h3>You’re at the top of the ${esc(m.year+' '+m.name)} lineup.</h3><div class="tf-actions"><button type="button" class="btn" data-act="done">See my match</button></div></section>`}
 ${sourceNote()}
 <p class="tf-restart"><button type="button" class="tf-link" data-act="restart">Choose a different vehicle</button></p>`;
}

// Every in-stock vehicle of this lineup, matched to the picks by its own window sticker (VIN data), whatever its trim.
function inventoryView(here){
 const m=current(),all=stockEntry(),entry=colorEntry(),label=`${m.year} ${m.name}`;
 if(!all?.vehicles?.length)return `<section class="tf-instock"><h3>No ${esc(label)} in our inventory right now</h3><p>Text Sam and he’ll look for one.</p></section>`;
 if(!state.picks.length){
  const list=inventoryFit(entry,allTrims(),[]).rows,mine=list.filter(r=>r.v.trim===here.id),rest=list.filter(r=>r.v.trim!==here.id);
  if(mine.length)return `<section class="tf-instock"><h3>${mine.length} ${esc(here.name)}${colorWord()} in our inventory</h3>${carList(mine,'trim')}</section>`;
  return `<section class="tf-instock"><h3>No ${esc(here.name)}${colorWord()} in our inventory right now</h3>${rest.length?`<p class="tf-small">These ${esc(label)}s${colorWord()} are on our lot now:</p>${carList(rest,'rest')}`:'<p>Text Sam and he’ll look for one.</p>'}</section>`;
 }
 const fit=inventoryFit(entry,allTrims(),state.picks),total=entry.vehicles.length;
 const gone=fit.availability.filter(a=>!a.yes);
 const summary=`<ul class="tf-avail">${fit.availability.map(a=>`<li class="${a.yes?'':'tf-gone'}">${a.yes?'<i class="bubble standard" aria-hidden="true">✓</i>':'<i class="bubble unavailable" aria-hidden="true">−</i>'}<span><strong>${esc(a.pick.label)}</strong> <small>${a.yes?`on ${a.yes} of our ${total} ${esc(label)}s${colorWord()}`:a.check?`not confirmed on any of our ${total}${colorWord()} — ${a.check} to check with us`:`not on any ${esc(label)}${colorWord()} in our inventory right now`}</small></span></li>`).join('')}</ul>`;
 let body;
 if(fit.exact.length)body=`<h3>${fit.exact.length} in our inventory${colorWord()} ${plural(fit.exact.length,'has','have')} everything you picked</h3><p class="tf-small">Checked against each vehicle’s own window sticker, on any trim — not just the ${esc(here.name)}.</p>${carList(fit.exact,'exact')}`;
 else{
  const other=state.color?inventoryFit(all,allTrims(),state.picks).exact:[];
  body=`<h3>Nothing in our inventory${colorWord()} has everything you picked right now</h3>${other.length?`<h4 class="tf-subhead">In another color: ${other.length} ${plural(other.length,'has','have')} everything you picked</h4>${carList(other,'other')}`:''}<p class="tf-small">Here’s what we have of each feature, checked against every ${esc(label)}’s window sticker${colorWord()}:</p>${summary}${fit.possible.length?`<h4 class="tf-subhead">May have it all — ask us to confirm</h4>${carList(fit.possible,'possible')}`:''}${fit.rows.length?`<h4 class="tf-subhead">Closest matches in stock${colorWord()}</h4>${carList(fit.rows.filter(r=>!fit.possible.includes(r)).slice(0,12),'closest')}`:''}<p class="tf-small">Want it exactly? Text Sam — he can locate or order one with everything on your list.</p>`;
 }
 return `<section class="tf-instock">${body}${fit.exact.length&&gone.length?summary:''}</section>`;
}
function resultView(){
 const trims=trimsOf(),here=trims[state.at],m=current(),s=stockFor(here);
 const status=pickStatus(here,state.picks),options=status.filter(p=>p.on==='option'),missing=status.filter(p=>!p.on);
 const prev=state.path.length>1?trims[state.path[state.path.length-2]]:trims[state.at-1];
 const compare=`/trim-guide?model=${encodeURIComponent(sid())}&trims=${[prev?.id,here.id].filter(Boolean).map(encodeURIComponent).join(',')}`;
 const request=`I used ${toolName} on Cars With Sam and landed on the ${fullName(here)}${state.color?` in ${state.color.name}`:''}.`+(state.picks.length?` What I want: ${state.picks.map(p=>p.label+(p.need==='option'?' (option)':'')).join(', ')}.`:'')+` Can you help me find the right one?`;
 return `${pathView()}
 <article class="tf-current tf-result">
  ${photo(here)}
  <div class="tf-current-text"><p class="eyebrow">Your match</p><h2>${esc(m.year+' '+m.name)} <span>${esc(here.name)}</span></h2>${here.difference?`<p>${esc(here.difference)}</p>`:''}${state.color?`<p class="tf-paint"><span class="tf-dot" style="background:${swatch(state.color.name)}" aria-hidden="true"></span>${esc(state.color.name)}</p>`:''}${stockLine(here)}</div>
 </article>
 ${state.picks.length?`<section class="tf-summary"><h3>What you picked</h3><ul>${status.map(p=>`<li>${p.on==='standard'?'<i class="bubble standard" aria-hidden="true">✓</i>':p.on==='option'?'<i class="bubble optional" aria-hidden="true">+</i>':'<i class="bubble verify" aria-hidden="true">!</i>'}<span><strong>${esc(p.label)}</strong> ${esc(p.value)} <small>${p.on==='standard'?'Standard on the '+esc(here.name):p.on==='option'?'Available as an option on the '+esc(here.name)+(p.note?` (${esc(p.note.toLowerCase())})`:''):'Not listed for the '+esc(here.name)+' in the factory chart'}</small></span></li>`).join('')}</ul>
  ${options.length?`<p class="tf-small">Options aren’t on every ${esc(here.name)}. Each vehicle’s window sticker shows what it has — we can find one with what you want.</p>`:''}
  ${missing.length?`<p class="tf-small">No single trim lists everything you picked. The ${esc(here.name)} has the most; ask us about the rest.</p>`:''}</section>`:''}
 ${inventoryView(here)}
 ${othersView()}
 ${sourceNote()}
 <div class="tf-actions tf-final"><a class="btn" href="/contact?request=${encodeURIComponent(request)}">Ask Sam about a ${esc(here.name)}</a>${prev?`<a class="tf-secondary" href="${esc(compare)}">Compare it with the ${esc(prev.name)}</a>`:''}${s?.query?`<a class="tf-secondary" href="/inventory?q=${encodeURIComponent(s.query)}">Search Find Your Car</a>`:''}<button type="button" class="tf-secondary" data-act="back">Go back a step</button><button type="button" class="tf-link" data-act="restart">Start over</button></div>`;
}

function draw(scroll){
 // No colors to choose from (none on the lot, none in the guide): skip straight to the trims.
 if(state.model&&current()&&state.color===undefined&&!stockColors().length&&!current().colors?.length)state.color=null;
 if(!state.model||!current())root.innerHTML=pickerView();
 else if(state.color===undefined)root.innerHTML=colorView();
 else root.innerHTML=state.done?resultView():stepView();
 if(scroll)root.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
 const up=root.querySelector('[data-act=up]');
 if(up){
  const sync=()=>{const n=root.querySelectorAll('[data-pick]:checked').length;up.disabled=!n;up.textContent=n?`Continue with ${n===1?'this':'these '+n}`:'Pick what you want above';};
  root.querySelectorAll('[data-pick]').forEach(b=>b.addEventListener('change',sync));sync();
 }
}

root.addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b||!root.contains(b))return;
 if(b.dataset.brand){state={...state,brand:b.dataset.brand};draw(false);return;}
 if(b.dataset.model){b.disabled=true;await go({...blank,brand:state.brand,model:b.dataset.model});return;}
 if(b.dataset.color!==undefined){const key=b.dataset.color;await go({color:key?{key,name:b.dataset.colorName}:null,note:null});return;}
 if(b.dataset.back){const i=Number(b.dataset.back),keep=state.path.slice(0,state.path.indexOf(i)+1);await go({at:i,path:keep,done:false,note:null,picks:state.picks.filter(p=>p.at<i&&keep.includes(p.at))});return;}
 const act=b.dataset.act;
 if(act==='restart'){await go({...blank,brand:state.brand});return;}
 if(act==='color'){await go({color:undefined,done:false,note:null});return;}
 if(act==='more'){b.previousElementSibling?.querySelectorAll('.tf-more').forEach(a=>a.hidden=false);b.remove();return;}
 if(act==='back'){history.back();return;}
 if(act==='done'){await go({done:true,note:null});return;}
 const trims=trimsOf();
 if(act==='skip'){await go({at:state.at+1,path:[...state.path,state.at+1],note:null});return;}
 if(act==='up'){
  const chosen=[...root.querySelectorAll('[data-pick]:checked')].map(x=>{const [kind,n]=x.dataset.pick.split(':');return {...offer[kind][Number(n)],at:state.at};});
  // The first trim, this one included, with everything picked: options on this trim keep the shopper here.
  const picks=[...state.picks,...chosen.filter((p,n)=>!state.picks.some(q=>q.key===p.key)&&chosen.findIndex(q=>q.key===p.key)===n)],match=nextMatch(current().model,state.at-1,picks);
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
 // Lineups without a published factory chart stay in the guide when we have them in stock (or, for fleet, always for the
 // ProMaster vans): built from the trim guide, and labeled as such.
 const fallback=finderModels(guide).filter(m=>!chartedIds.has(m.id)&&FLEET.includes(m.id)===fleet&&(fleet||stock.models?.[m.id]?.vehicles?.length))
  .map(m=>({...m,stockId:m.id,charted:false,colors:[]}));
 models=[...charted,...fallback].sort((a,b)=>{const o=x=>{const i=['Jeep','Ram','Dodge','Chrysler'].indexOf(x.brand);return i<0?9:i;};return o(a)-o(b)||a.name.replace(/^(?:Ram|Chrysler)\s+/,'').localeCompare(b.name.replace(/^(?:Ram|Chrysler)\s+/,''))||a.year-b.year;});
 const start=params.get('model');
 if(start&&modelOf(start)){state.model=start;state.brand=modelOf(start).brand;await ensureChart();}
 save(true);draw(false);
}catch(e){console.error(e);root.innerHTML='<p class="empty-state">The trim guide could not load. Please refresh the page.</p>';}
