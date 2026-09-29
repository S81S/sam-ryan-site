import {appendEquipmentFact} from './comparison-layout.mjs?v=clean-shopping1';
import {applyFactoryEquipment} from './factory-equipment.mjs?v=clean-shopping1';
import {comparisonRows,visibleComparisonRows} from './comparison-rows.mjs?v=clean-shopping1';
import {definitions,parseQuery} from './equipment-search.mjs?v=clean-shopping1';
const $=id=>document.getElementById(id),el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
const short=v=>v.stock?`Stock ${v.stock}`:`VIN …${v.vin.slice(-6)}`;
const viewState={mode:'important',search:''};
function render(){
 const out=$('automatic-equipment');out.replaceChildren();
 const recs=['1','2','3','4','5'].map(side=>({side,v:window.usedInventoryData.vehicles.find(v=>v.vin===$('choose-'+side)?.value)})).filter(r=>r.v).map(r=>({...r,s:applyFactoryEquipment(r.v,window.equipmentIndex.records[r.v.vin])}));
 if(recs.length<2){out.append(el('p','Choose two vehicles above to compare.'));return;}
 const requested=parseQuery($('group-query')?.value||new URLSearchParams(location.search).get('q')||'').requirements.map(r=>r.id);
 const rows=comparisonRows(definitions,recs.map(r=>r.s),requested);
 out.append(el('h2','What sets them apart'));
 const controls=el('div');controls.className='comparison-controls';
 const label=el('label','Find a feature');label.htmlFor='comparison-feature-filter';const search=el('input');search.id='comparison-feature-filter';search.type='search';search.placeholder='Seats, cameras, roof, towing…';search.value=viewState.search;
 controls.append(label,search);const buttons=el('div');buttons.className='comparison-view-buttons';controls.append(buttons);
 const status=el('p');status.setAttribute('role','status');
 const wrap=el('div');wrap.className='comparison-table-wrap';wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Vehicle equipment comparison; scroll sideways for more vehicles');
 let mode=viewState.mode==='requested'&&!requested.length?'important':viewState.mode;const buttonRefs=[];
 const legend=el('p','? means the available documents do not settle that feature. It does not mean the vehicle lacks it.');legend.className='comparison-legend';
 function draw(){
  wrap.replaceChildren();for(const [id,b] of buttonRefs)b.setAttribute('aria-pressed',String(id===mode));
  const visible=visibleComparisonRows(rows,mode,search.value);viewState.mode=mode;viewState.search=search.value;
  status.textContent=search.value?'Matching features':mode==='important'?'Equipment differences and specifications':mode==='requested'?'Your requested features':'All equipment';
  legend.hidden=!visible.some(r=>r.facts.some(f=>!f));
  if(!visible.length){wrap.append(el('p',search.value?'No features match that wording.':'No established equipment differences in the available records. Choose All equipment to see shared features.'));return;}
  const table=el('table');table.className='equipment-matrix';const caption=el('caption','Equipment at a glance');caption.className='matrix-caption';table.append(caption);
  const head=el('thead'),tr=el('tr'),corner=el('th','Feature');corner.scope='col';tr.append(corner);
  for(const {v} of recs){const th=el('th');th.scope='col';th.append(el('strong',v.title),el('small',short(v)));tr.append(th)}head.append(tr);table.append(head);
  const body=el('tbody');for(const row of visible){const tr=el('tr'),name=el('th');name.scope='row';name.append(el('strong',(row.requested?'★ ':'')+row.label));tr.append(name);
   row.facts.forEach(f=>{const td=el('td');appendEquipmentFact(td,f);if(row.group==='wording'&&f?.evidence?.length)td.append(el('p',f.evidence.join(' · ')));tr.append(td)});body.append(tr);
  }table.append(body);wrap.append(table);
 }
 for(const [id,text] of [['important','Differences'],...(requested.length?[['requested','Your must-haves']]:[]),['all','All equipment']]){const b=el('button',text);b.type='button';b.addEventListener('click',()=>{mode=id;draw()});buttons.append(b);buttonRefs.push([id,b])}
 search.addEventListener('input',draw);out.append(controls,status,wrap,legend);draw();
 const unresolved=rows.filter(r=>['check','unknown'].includes(r.group));
 if(unresolved.length){const panel=el('details');panel.className='comparison-unresolved';panel.append(el('summary','Equipment still to verify'));
  panel.append(el('p','These items are separate from the established differences. We need more vehicle-specific evidence before calling them included or absent.'));
  const list=el('ul');for(const row of unresolved){const missing=recs.filter((_,i)=>!row.facts[i]).map(r=>short(r.v));list.append(el('li',row.label+' · '+missing.join(', ')))}panel.append(list);out.append(panel);
 }
 const sources=el('details');sources.className='compare-original';sources.append(el('summary','Original window stickers'));
 for(const {v,s} of recs){if(s?.status!=='verified')continue;const details=el('details');details.append(el('summary',`${v.title} · ${short(v)}`));if(s.sourceUrl){const a=el('a','Open original sticker ↗');a.href=s.sourceUrl;a.target='_blank';a.rel='noopener';details.append(a)}const ul=el('ul');for(const line of s.lines||[])ul.append(el('li',line));details.append(ul);sources.append(details)}out.append(sources);
 out.append(el('p','Factory equipment describes the vehicle as built. Ask Sam or Ryan about current condition and any later modifications.'));
}
document.addEventListener('compare:changed',render);render();
