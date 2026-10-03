import {appendStickerCredit} from './sticker-credit.mjs?v=source2';
import {appendEquipmentFact} from './comparison-layout.mjs?v=specs1';
import {applyFactoryEquipment} from './factory-equipment.mjs?v=wheel1';
import {comparisonRows,visibleComparisonRows} from './comparison-rows.mjs?v=specs2';
import {withComparisonSpecifications,specificationDefinitions} from './comparison-specs.mjs?v=specs2';
import {definitions,parseQuery} from './equipment-search.mjs?v=wheel1';
const $=id=>document.getElementById(id),el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
const short=v=>v.stock?`Stock ${v.stock}`:`VIN …${v.vin.slice(-6)}`;
const viewState={mode:'important',search:''};
function render(){
 const out=$('automatic-equipment');out.replaceChildren();
 const recs=['1','2','3','4','5'].map(side=>({side,v:window.usedInventoryData.vehicles.find(v=>v.vin===$('choose-'+side)?.value)})).filter(r=>r.v).map(r=>({...r,s:withComparisonSpecifications(r.v,applyFactoryEquipment(r.v,window.equipmentIndex.records[r.v.vin]))}));
 if(recs.length<2){out.append(el('p','Choose two vehicles above to compare.'));return;}
 const requested=parseQuery($('group-query')?.value||new URLSearchParams(location.search).get('q')||'').requirements.map(r=>r.id);
 const rows=comparisonRows([...specificationDefinitions,...definitions.filter(([id])=>!/^engine(?:Size|Cyl|Inline)|^engine20$|^engine36$/.test(id))],recs.map(r=>r.s),requested);
 out.append(el('h2','Compare side by side'));
 const controls=el('div');controls.className='comparison-controls';
 const label=el('label','Find a feature');label.htmlFor='comparison-feature-filter';const search=el('input');search.id='comparison-feature-filter';search.type='search';search.placeholder='Seats, cameras, roof, towing…';search.value=viewState.search;
 controls.append(label,search);const buttons=el('div');buttons.className='comparison-view-buttons';controls.append(buttons);
 const status=el('p');status.setAttribute('role','status');
 const wrap=el('div');wrap.className='comparison-table-wrap';wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Vehicle equipment comparison; scroll sideways for more vehicles');
 let mode=viewState.mode==='requested'&&!requested.length?'important':viewState.mode;const buttonRefs=[];
 const legend=el('p','Verify / Unknown means vehicle-specific evidence is incomplete. Externally decoded specs do not verify dealer listings, options or packages.');legend.className='comparison-legend';
 function draw(){
  wrap.replaceChildren();for(const [id,b] of buttonRefs)b.setAttribute('aria-pressed',String(id===mode));
  const visible=visibleComparisonRows(rows,mode,search.value);viewState.mode=mode;viewState.search=search.value;
  status.textContent=search.value?'Matching features':mode==='important'?(visible.some(r=>r.facts.some(f=>!f))?'Confirmed differences and details to verify':'Confirmed differences'):mode==='requested'?'Your requested features':'Shared equipment';
  legend.hidden=!visible.some(r=>r.facts.some(f=>!f));
  if(!visible.length&&mode!=='important'){wrap.append(el('p',search.value?'No features match that wording.':'No confirmed equipment differences to show. See Shared equipment or ask us about a specific feature.'));return;}
  const table=el('table');table.className='equipment-matrix';const caption=el('caption','Equipment at a glance');caption.className='matrix-caption';table.append(caption);
  const head=el('thead'),tr=el('tr'),corner=el('th','Feature');corner.scope='col';tr.append(corner);
  for(const {v} of recs){const th=el('th');th.scope='col';th.append(el('strong',v.title),el('small',short(v)));tr.append(th)}head.append(tr);table.append(head);
  const body=el('tbody');
  if(recs.some(({v})=>v.external)){
   const fields=[['Data source',v=>v.external?(v.decodedAt?'External decoded/spec-only; dealer listing unverified':'External VIN; identity and dealer listing unverified'):'Covert dealer listing snapshot'],['VIN',v=>v.vin],['Advertised price',v=>Number.isFinite(v.price)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v.price):'Unknown — Verify'],['Mileage',v=>Number.isFinite(v.miles)?v.miles.toLocaleString():'Unknown — Verify'],['Decoded body',v=>v.decodedSpecs?.body||'Unknown'],['Decoded engine',v=>v.decodedSpecs?.engine||'Unknown'],['Decoded fuel',v=>v.decodedSpecs?.fuel||'Unknown']];
   for(const [label,value] of fields){const row=el('tr'),th=el('th',label);th.scope='row';row.append(th);for(const {v} of recs)row.append(el('td',value(v)));body.append(row);}
  }
  if(mode==='important'&&!search.value){
   for(const [label,pattern] of [['Engine',/^Engine:/i],['Transmission',/^Transmission:/i],['Exterior color',/^Exterior Color:/i],['Interior color',/^Interior Color:/i],['Seat upholstery',/^Interior:(?! Color)/i]]){
    const values=recs.map(({s})=>s?.status==='verified'?(s.lines||[]).find(l=>pattern.test(l))?.replace(/^[^:]+:\s*/,'')||null:null);
    if(values.every(Boolean)&&new Set(values).size>1){const tr=el('tr'),th=el('th',label);th.scope='row';tr.append(th);values.forEach(value=>tr.append(el('td',value)));body.append(tr);}
   }
  }
  for(const row of visible){const tr=el('tr'),name=el('th');name.scope='row';name.append(el('strong',(row.requested?'★ ':'')+row.label));tr.append(name);
   row.facts.forEach(f=>{const td=el('td');appendEquipmentFact(td,f);tr.append(td)});body.append(tr);
  }if(!body.children.length){wrap.append(el('p','No differences found in the equipment we could verify. This does not confirm the vehicles are identical. Check More equipment details or the original stickers for features that still need verification.'));return;}table.append(body);wrap.append(table);
 }
 for(const [id,text] of [['important','Differences'],...(requested.length?[['requested','Your must-haves']]:[]),['all','Shared equipment']]){const b=el('button',text);b.type='button';b.addEventListener('click',()=>{mode=id;draw()});buttons.append(b);buttonRefs.push([id,b])}
 search.addEventListener('input',draw);out.append(controls,status,wrap,legend);draw();
 const unresolved=rows.filter(r=>r.group==='check'&&r.facts.some(f=>f?.value));
 if(unresolved.length){const panel=el('details');panel.className='comparison-unresolved';panel.append(el('summary','More equipment details'));
 panel.append(el('p','These features are documented on some of your choices. A missing entry is not proof that another vehicle lacks the feature.'));
 for(const row of unresolved){const p=el('p');p.append(el('strong',row.label+': '));p.append(recs.filter((_,i)=>row.facts[i]?.value).map(r=>short(r.v)).join(', '));panel.append(p)}out.append(panel);}
 const sources=el('details');sources.className='compare-original';sources.append(el('summary','Original window stickers'));
 for(const {v,s} of recs){if(s?.status!=='verified')continue;const details=el('details');details.append(el('summary',`${v.title} · ${short(v)}`));if(s.sourceUrl){const a=el('a','Open original sticker ↗');a.href=s.sourceUrl;a.target='_blank';a.rel='noopener';details.append(a);appendStickerCredit(details,s.sourceUrl,v.stickerUrl)}const ul=el('ul');for(const line of s.lines||[])ul.append(el('li',line));details.append(ul);sources.append(details)}out.append(sources);
 out.append(el('p','Factory equipment describes the vehicle as built. Ask Sam or Ryan about current condition and any later modifications.'));
}
document.addEventListener('compare:changed',render);render();
