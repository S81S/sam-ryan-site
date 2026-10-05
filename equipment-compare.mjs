import {audioInventoryFeature} from './audio-evidence.mjs?v=errors1';
import {equipmentReviewReason} from './equipment-review.mjs?v=errors1';
import {featureInventoryLink} from './feature-inventory-link.mjs?v=1';
import {appendStickerCredit} from './sticker-credit.mjs?v=source2';
import {appendEquipmentFact} from './comparison-layout.mjs?v=errors1';
import {applyFactoryEquipment} from './factory-equipment.mjs?v=errors1';
import {comparisonRows,visibleComparisonRows} from './comparison-rows.mjs?v=errors1';
import {withComparisonSpecifications,specificationDefinitions} from './comparison-specs.mjs?v=errors1';
import {definitions,parseQuery} from './equipment-search.mjs?v=errors1';
const $=id=>document.getElementById(id),el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
const short=v=>v.stock?`Stock ${v.stock}`:`VIN …${v.vin.slice(-6)}`;
const indexEngine=v=>{const s=window.equipmentIndex.records[v.vin];return s?.status==='verified'?s.engine?.replace(/^Engine:\s*/i,''):null;};
const viewState={mode:'complete',search:''};
function render(){
 const out=$('automatic-equipment');out.replaceChildren();
 const recs=['1','2','3','4','5'].map(side=>({side,v:window.usedInventoryData.vehicles.find(v=>v.vin===$('choose-'+side)?.value)})).filter(r=>r.v).map(r=>({...r,s:withComparisonSpecifications(r.v,applyFactoryEquipment(r.v,window.equipmentIndex.records[r.v.vin]))}));
 if(recs.length<2){out.append(el('p','Choose two vehicles above to compare.'));return;}
 const requested=parseQuery($('group-query')?.value||new URLSearchParams(location.search).get('q')||'').requirements.map(r=>r.id);
 const rows=comparisonRows([...specificationDefinitions,...definitions.filter(([id])=>!/^engine(?:Size|Cyl|Inline)|^engine20$|^engine36$/.test(id))],recs.map(r=>r.s),requested);
 const counts={difference:rows.filter(r=>r.group==='difference').length,same:rows.filter(r=>r.group==='same').length,check:rows.filter(r=>r.group==='check'||r.group==='unknown').length};
 out.append(el('h2','Compare side by side'));out.append(el('p',`${counts.same} shared details · ${counts.difference} confirmed differences · ${counts.check} items need source details`));out.append(el('p','Like a feature? Click an Included checkmark to find inventory with that equipment.'));
 const controls=el('div');controls.className='comparison-controls';
 const label=el('label','Find a feature');label.htmlFor='comparison-feature-filter';const search=el('input');search.id='comparison-feature-filter';search.type='search';search.placeholder='Seats, cameras, roof, towing…';search.value=viewState.search;
 controls.append(label,search);const buttons=el('div');buttons.className='comparison-view-buttons';controls.append(buttons);
 const status=el('p');status.setAttribute('role','status');
 const wrap=el('div');wrap.className='comparison-table-wrap';wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Vehicle equipment comparison; scroll sideways for more vehicles');
 let mode=viewState.mode==='requested'&&!requested.length?'important':viewState.mode;const buttonRefs=[];
 const legend=el('p','Items to check explain where sticker or factory-reference evidence is missing. A missing entry does not establish that a feature is absent.');legend.className='comparison-legend';
 function draw(){
  wrap.replaceChildren();for(const [id,b] of buttonRefs)b.setAttribute('aria-pressed',String(id===mode));
  const visible=visibleComparisonRows(rows,mode,search.value);viewState.mode=mode;viewState.search=search.value;
  status.textContent=search.value?'Matching '+(mode==='important'?'differences':mode==='all'?'shared equipment':mode==='check'?'items to check':'equipment'):mode==='complete'?'All confirmed equipment — shared details and differences':mode==='important'?'Confirmed differences':mode==='check'?'Why these items need checking':mode==='requested'?'Your requested features':'Shared equipment';
  legend.hidden=!visible.some(r=>r.facts.some(f=>!f));
  if(!visible.length){wrap.append(el('p',search.value?'No features match that wording.':mode==='check'?'No evidence gaps in these recorded features.':mode==='all'?'No fully confirmed shared equipment in these recorded features.':'No confirmed differences in these recorded features. Check All equipment or Items to check.'));return;}
  const table=el('table');table.className='equipment-matrix';const caption=el('caption','Equipment at a glance');caption.className='matrix-caption';table.append(caption);
  const head=el('thead'),tr=el('tr'),corner=el('th','Feature');corner.scope='col';tr.append(corner);
  for(const {v} of recs){const th=el('th');th.scope='col';th.append(el('strong',v.title),el('small',short(v)));tr.append(th)}head.append(tr);table.append(head);
  const body=el('tbody');
  if(recs.some(({v})=>v.external)){
   const fields=[['Data source',v=>v.external?(v.decodedAt?'External VIN identity confirmed; dealer listing unverified':'External VIN; identity and dealer listing unverified'):'Covert dealer listing snapshot'],['VIN',v=>v.vin],['Advertised price',v=>Number.isFinite(v.price)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v.price):'Not supplied for this outside vehicle'],['Mileage',v=>Number.isFinite(v.miles)?v.miles.toLocaleString():'Not supplied for this outside vehicle'],['Body / cab',v=>v.decodedSpecs?.body||(/CREW CAB/i.test(v.title)?'Crew cab (listing)':v.decodePending?'Checking VIN…':'VIN decoder did not provide this field')],['Engine',v=>indexEngine(v)||v.decodedSpecs?.engine||(v.decodePending?'Checking VIN…':'VIN decoder did not provide this field')],['Fuel',v=>v.decodedSpecs?.fuel||(v.decodePending?'Checking VIN…':'VIN decoder did not provide this field')]];
   for(const [label,value] of fields){const row=el('tr'),th=el('th',label);th.scope='row';row.append(th);for(const {v} of recs)row.append(el('td',value(v)));body.append(row);}
  }
  for(const row of visible){const tr=el('tr'),name=el('th');name.scope='row';name.append(el('strong',(row.requested?'★ ':'')+row.label),el('small',row.group==='difference'?'Different':row.group==='same'?'Same on all vehicles':'Source details needed'));tr.dataset.comparisonGroup=row.group;tr.append(name);
   row.facts.forEach((f,i)=>{const td=el('td');appendEquipmentFact(td,f,document,equipmentReviewReason(window.equipmentIndex.records[recs[i].v.vin],recs[i].v.vin));
    const audioFeature=['audioSystem','premiumAudio'].includes(row.id)?audioInventoryFeature(recs[i].s?.features?.audioSystem):null;
    const inventoryFeature=audioFeature||(!row.specification&&definitions.some(([id])=>id===row.id)?row.id:null);
    if(f?.value===true&&inventoryFeature){
     const badge=td.querySelector('.equipment-answer');const a=el('a',badge.textContent);
     const context=parseQuery($('group-query')?.value||new URLSearchParams(location.search).get('q')||'');
     a.href=featureInventoryLink(inventoryFeature,{condition:recs[i].v.condition,advisor:new URLSearchParams(location.search).get('advisor'),modelTerms:context.terms});
     a.className=badge.className+' equipment-feature-link';a.style.cssText='display:inline-block;min-height:44px;padding:10px 12px;text-decoration:underline;text-underline-offset:3px;border:1px solid currentColor;border-radius:6px';
     const targetLabel=definitions.find(([id])=>id===inventoryFeature)?.[1]||row.label;a.title='Find vehicles with '+targetLabel;a.setAttribute('aria-label','Find vehicles with '+targetLabel);badge.replaceWith(a);
    }tr.append(td)});body.append(tr);
  }if(!body.children.length){wrap.append(el('p','No confirmed differences in the recorded equipment. Open Items to check for the evidence gaps and what needs checking.'));return;}table.append(body);wrap.append(table);
 }
 for(const [id,text] of [['complete','All equipment ('+(counts.same+counts.difference)+')'],['important','Differences ('+counts.difference+')'],...(requested.length?[['requested','Your must-haves']]:[]),['all','Shared equipment ('+counts.same+')'],['check','Items to check ('+counts.check+')']]){const b=el('button',text);b.type='button';b.addEventListener('click',()=>{mode=id;draw()});buttons.append(b);buttonRefs.push([id,b])}
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
