import {applyFactoryEquipment} from './factory-equipment.mjs?v=shopping1';
import {comparisonRows} from './comparison-rows.mjs?v=matrix1';
import {definitions,parseQuery} from './equipment-search.mjs?v=shopping1';
const $=id=>document.getElementById(id),el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
const money=n=>Number.isFinite(n)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n):'Ask for price';
const short=v=>v.stock?`Stock ${v.stock}`:`VIN …${v.vin.slice(-6)}`;
function render(){
 const out=$('automatic-equipment');out.replaceChildren();
 const recs=['1','2','3','4','5'].map(side=>({side,v:window.usedInventoryData.vehicles.find(v=>v.vin===$('choose-'+side)?.value)})).filter(r=>r.v).map(r=>({...r,s:applyFactoryEquipment(r.v,window.equipmentIndex.records[r.v.vin])}));
 if(recs.length<2){out.append(el('p','Choose at least two vehicles to see their differences side by side.'));return;}
 const requested=parseQuery($('group-query')?.value||new URLSearchParams(location.search).get('q')||'').requirements.map(r=>r.id);
 const rows=comparisonRows(definitions,recs.map(r=>r.s),requested);
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
 const label=el('label','Find a feature');label.htmlFor='comparison-feature-filter';const search=el('input');search.id='comparison-feature-filter';search.type='search';search.placeholder='Seats, cameras, roof, towing…';
 controls.append(label,search);const buttons=el('div');buttons.className='comparison-view-buttons';controls.append(buttons);
 const status=el('p');status.setAttribute('role','status');
 const wrap=el('div');wrap.className='comparison-table-wrap';wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Vehicle equipment comparison; scroll sideways for more vehicles');
 let mode='important';const buttonRefs=[];
 const groups={difference:'Confirmed difference',wording:'Different descriptions',check:'Needs confirmation',same:'Same equipment evidence',unknown:'Not confirmed on any selection'};
 function draw(){
  wrap.replaceChildren();for(const [id,b] of buttonRefs)b.setAttribute('aria-pressed',String(id===mode));
  const term=search.value.trim().toLowerCase();const visible=rows.filter(r=>(mode==='all'||r.requested||['difference','wording','check'].includes(r.group))&&(!term||(r.label+' '+r.facts.flatMap(f=>f?.evidence||[]).join(' ')).toLowerCase().includes(term)));
  status.textContent=`${visible.length} features shown · ${rows.filter(r=>r.group==='difference').length} confirmed differences · ${rows.filter(r=>r.group==='check').length} need confirmation`;
  if(!visible.length){wrap.append(el('p',term?'No features match that wording. Try another term or show all equipment.':'No confirmed differences or description differences were found. Show all equipment to review what they share.'));return;}
  const table=el('table');table.className='equipment-matrix';const caption=el('caption','Factory equipment comparison');caption.className='matrix-caption';table.append(caption);
  const head=el('thead'),tr=el('tr'),corner=el('th','Feature');corner.scope='col';tr.append(corner);
  for(const {v} of recs){const th=el('th');th.scope='col';th.append(el('strong',v.title),el('small',short(v)));tr.append(th)}head.append(tr);table.append(head);
  const body=el('tbody');for(const row of visible){const tr=el('tr'),name=el('th');name.scope='row';name.append(el('strong',(row.requested?'★ ':'')+row.label),el('small',groups[row.group]));tr.append(name);
   row.facts.forEach(f=>{const td=el('td'),badge=el('strong',!f?'? Not confirmed':f.value?'✓ Equipped':'— Not equipped');badge.className='equipment-answer '+(!f?'unknown':f.value?'yes':'no');td.append(badge);
    if(f){const method=f.method==='factory-standard'?'Standard on this trim':f.method==='factory-package'?'Included in the listed package':f.method==='factory-option-omission'?'Not ordered on the complete original sticker':'Original sticker evidence';td.append(el('small',method));for(const line of f.evidence||[])td.append(el('p',line));if(f.sourceUrl){const a=el('a','Factory reference ↗');a.href=f.sourceUrl;a.target='_blank';a.rel='noopener';td.append(a)}}else td.append(el('p','Available evidence does not establish this feature.'));
    tr.append(td);
   });body.append(tr);
  }table.append(body);wrap.append(table);
 }
 for(const [id,text] of [['important','Differences & items to check'],['all','All equipment']]){const b=el('button',text);b.type='button';b.addEventListener('click',()=>{mode=id;draw()});buttons.append(b);buttonRefs.push([id,b])}
 const clear=el('button','Clear feature filter');clear.type='button';clear.addEventListener('click',()=>{search.value='';draw();search.focus()});buttons.append(clear);
 search.addEventListener('input',draw);out.append(controls,status,el('p','On smaller screens, swipe the table sideways to compare vehicles.'),wrap);draw();
 for(const {v,s} of recs){if(s?.status!=='verified')continue;const details=el('details');details.className='compare-original';details.append(el('summary',`Full sticker text · ${short(v)}`));const ul=el('ul');for(const line of s.lines||[])ul.append(el('li',line));details.append(ul);out.append(details)}
 out.append(el('p','A factory sticker describes original equipment. Ask us to confirm current pricing, availability and, for used vehicles, condition and any modifications.'));
}
document.addEventListener('compare:changed',render);render();
