import {preferredLayout,appendEquipmentFact,appendFeatureCards} from './comparison-layout.mjs?v=next3';
import {applyFactoryEquipment} from './factory-equipment.mjs?v=next3';
import {comparisonRows,visibleComparisonRows} from './comparison-rows.mjs?v=complete1';
import {definitions,parseQuery} from './equipment-search.mjs?v=option1';
const $=id=>document.getElementById(id),el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
const money=n=>Number.isFinite(n)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n):'Ask for price';
const short=v=>v.stock?`Stock ${v.stock}`:`VIN …${v.vin.slice(-6)}`;
const viewState={mode:'important',search:'',layout:null};
const narrowScreen=window.matchMedia('(max-width: 700px)');
function render(){
 const out=$('automatic-equipment');out.replaceChildren();
 const recs=['1','2','3','4','5'].map(side=>({side,v:window.usedInventoryData.vehicles.find(v=>v.vin===$('choose-'+side)?.value)})).filter(r=>r.v).map(r=>({...r,s:applyFactoryEquipment(r.v,window.equipmentIndex.records[r.v.vin])}));
 if(recs.length<2){out.append(el('p','Choose at least two vehicles to see their differences side by side.'));return;}
 const requested=parseQuery($('group-query')?.value||new URLSearchParams(location.search).get('q')||'').requirements.map(r=>r.id);
 const rows=comparisonRows(definitions,recs.map(r=>r.s),requested);
 const requestedCount=rows.filter(row=>row.requested).length;
 out.append(el('h2','Your vehicles, side by side'),el('p','Start with what sets them apart. Equipment descriptions appear directly under each answer so you can see the details without opening extra panels.'));
 const overview=el('div');overview.className='comparison-overview';
 for(const [i,{v,s,side}] of recs.entries()){
  const card=el('article');card.append(el('small',short(v)),el('h3',v.title),el('strong',money(v.price)));
  card.append(el('p',`${v.condition||'Condition not listed'} · ${Number.isFinite(v.miles)?new Intl.NumberFormat('en-US').format(v.miles)+' miles':'Mileage not listed'}`));
  const advantages=rows.filter(r=>r.facts[i]?.value===true&&r.facts.some((f,j)=>j!==i&&f?.value===false));
  card.append(el('h4','Confirmed equipment advantages'));
  if(advantages.length){const ul=el('ul');for(const r of advantages)ul.append(el('li',r.label+' — not equipped on '+recs.filter((_,j)=>j!==i&&r.facts[j]?.value===false).map(r=>short(r.v)).join(', ')));card.append(ul)}
  else card.append(el('p','No confirmed equipment advantage over the other selections. Check the differences and unconfirmed items below.'));
  if(s?.sourceType==='customer-upload')card.append(el('p','Evidence: your supplied PDF, VIN matched'));
  if(s?.status==='verified'&&s.sourceUrl){const a=el('a','Open original window sticker ↗');a.href=s.sourceUrl;a.target='_blank';a.rel='noopener';card.append(a);if($('sticker-'+side)){$('sticker-'+side).href=s.sourceUrl;$('sticker-'+side).hidden=false;$('sticker-'+side).textContent='Open original window sticker ↗';if($('lookup-note-'+side))$('lookup-note-'+side).textContent='Original sticker matched to this VIN.';}}
  overview.append(card);
 }
 out.append(overview,el('p','“Not confirmed” is not “Not equipped.” A different description can mean a different specification, but wording alone does not prove one vehicle has more equipment.'));
 const controls=el('div');controls.className='comparison-controls';
 const label=el('label','Find a feature');label.htmlFor='comparison-feature-filter';const search=el('input');search.id='comparison-feature-filter';search.type='search';search.placeholder='Seats, cameras, roof, towing…';search.value=viewState.search;
 controls.append(label,search);const buttons=el('div');buttons.className='comparison-view-buttons';controls.append(buttons);
 const layoutControls=el('div');layoutControls.className='comparison-view-buttons comparison-layout-controls';layoutControls.setAttribute('role','group');layoutControls.setAttribute('aria-label','Comparison layout');
 const layoutButtons=[];const layoutHint=el('p');
 const status=el('p');status.setAttribute('role','status');
 const wrap=el('div');wrap.className='comparison-table-wrap';wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Vehicle equipment comparison; scroll sideways for more vehicles');
 let mode=viewState.mode==='requested'&&!requestedCount?'important':viewState.mode;const buttonRefs=[];
 const groups={difference:'Confirmed difference',wording:'Different descriptions',check:'Needs confirmation',same:'Same equipment evidence',unknown:'Not confirmed on any selection'};
 function draw(){
  wrap.replaceChildren();for(const [id,b] of buttonRefs)b.setAttribute('aria-pressed',String(id===mode));
  const layout=preferredLayout(viewState.layout,narrowScreen.matches,recs.length);
  for(const [id,b] of layoutButtons)b.setAttribute('aria-pressed',String(id===layout));
  wrap.className=layout==='cards'?'comparison-feature-cards':'comparison-table-wrap';wrap.tabIndex=layout==='table'?0:-1;
  wrap.setAttribute('aria-label',layout==='cards'?'Vehicle equipment comparison by feature':'Vehicle equipment comparison; scroll sideways for more vehicles');
  layoutHint.textContent=layout==='cards'?'Each feature lists every selected vehicle and its evidence below.':'On smaller screens, swipe the table sideways, or choose Feature cards to read without horizontal scrolling.';
  const term=search.value.trim().toLowerCase();const visible=visibleComparisonRows(rows,mode,term);viewState.mode=mode;viewState.search=search.value;
  status.textContent=`${term?'Searching all equipment · ':mode==='requested'?'Your requested features · ':''}${visible.length} features shown · ${visible.filter(r=>r.group==='difference').length} confirmed differences · ${visible.filter(r=>r.group==='check'||r.group==='unknown').length} need confirmation`;
  if(!visible.length){wrap.append(el('p',term?'No features match that wording. Try another term or show all equipment.':'No confirmed differences or description differences were found. Show all equipment to review what they share.'));return;}
  if(layout==='cards'){appendFeatureCards(wrap,visible,recs,groups);return;}
  const table=el('table');table.className='equipment-matrix';const caption=el('caption','Factory equipment comparison');caption.className='matrix-caption';table.append(caption);
  const head=el('thead'),tr=el('tr'),corner=el('th','Feature');corner.scope='col';tr.append(corner);
  for(const {v} of recs){const th=el('th');th.scope='col';th.append(el('strong',v.title),el('small',short(v)));tr.append(th)}head.append(tr);table.append(head);
  const body=el('tbody');for(const row of visible){const tr=el('tr'),name=el('th');name.scope='row';name.append(el('strong',(row.requested?'★ ':'')+row.label),el('small',groups[row.group]));tr.append(name);
   row.facts.forEach(f=>{const td=el('td');appendEquipmentFact(td,f);
    tr.append(td);
   });body.append(tr);
  }table.append(body);wrap.append(table);
 }
 for(const [id,text] of [...(requestedCount?[['requested',`Your requested features (${requestedCount})`]]:[]),['important','Differences & items to check'],['all','All equipment']]){const b=el('button',text);b.type='button';b.addEventListener('click',()=>{mode=id;draw()});buttons.append(b);buttonRefs.push([id,b])}
 for(const [id,text] of [['cards','Feature cards'],['table','Side-by-side table']]){const b=el('button',text);b.type='button';b.addEventListener('click',()=>{viewState.layout=id;draw()});layoutControls.append(b);layoutButtons.push([id,b]);}
 const clear=el('button','Clear feature filter');clear.type='button';clear.addEventListener('click',()=>{search.value='';draw();search.focus()});buttons.append(clear);
 search.addEventListener('input',draw);if(requestedCount)out.append(el('p','★ marks features from your request. They remain visible even when equipment is shared or unconfirmed.'));out.append(controls,layoutControls,status,layoutHint,wrap);draw();
 for(const {v,s} of recs){if(s?.status!=='verified')continue;const details=el('details');details.className='compare-original';details.append(el('summary',`Full sticker text · ${short(v)}`));const ul=el('ul');for(const line of s.lines||[])ul.append(el('li',line));details.append(ul);out.append(details)}
 out.append(el('p','A factory sticker describes original equipment. Ask us to confirm current pricing, availability and, for used vehicles, condition and any modifications.'));
}
narrowScreen.addEventListener('change',()=>{if(!viewState.layout)render();});
document.addEventListener('compare:changed',render);render();
