import {optionInventoryLink} from './option-inventory.mjs';
import {audioInventoryFeature} from './audio-evidence.mjs';
import {equipmentReviewReason} from './equipment-review.mjs';
import {featureInventoryLink} from './feature-inventory-link.mjs';
import {appendStickerCredit} from './sticker-credit.mjs';
import {appendEquipmentFact} from './comparison-layout.mjs';
import {applyFactoryEquipment} from './factory-equipment.mjs';
import {comparisonRows,visibleComparisonRows} from './comparison-rows.mjs';
import {withComparisonSpecifications,specificationDefinitions} from './comparison-specs.mjs';
import {definitions,parseQuery} from './equipment-search.mjs';
import {guideTrim,guideDifferences,guideFeatureFacts,guideLink,guideColumnName} from './trim-link.mjs';
import {featureMatches} from './trim-comparison.mjs';
const $=id=>document.getElementById(id),el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
const short=v=>v.stock?`Stock ${v.stock}`:`VIN …${v.vin.slice(-6)}`;
const indexEngine=v=>{const s=window.equipmentIndex.records[v.vin];return s?.status==='verified'?s.engine?.replace(/^Engine:\s*/i,''):null;};
const viewState={mode:'complete',search:''};
// The factory trim guide behind the Compare Trims page. It loads once, then the comparison redraws with it.
let trimGuide=null;
const trimGuideReady=fetch('trim-standard-data.json').then(r=>r.ok?r.json():null).then(d=>{trimGuide=d;}).catch(()=>{});
// Guide rows the window stickers already answer for these exact vehicles (the engine each one has, its
// wheels, its seats…). Showing the trim's starting equipment beside the real thing would only confuse.
const answeredBySticker=[[/^(?:engine|engine-output|horsepower|torque|power|powertrain)$/,['engineSpecification']],[/^(?:transmission|gearbox)$/,['transmissionSpecification']],[/^(?:drive|drivetrain|awd|four_wheel_drive)$/,['fourWheel','awd']],[/^(?:front-seats|front-seat-material|seat-material|upholstery)$/,['seatUpholstery']],[/^(?:wheels|tires)$/,['wheelSize']],[/^(?:touchscreen|screen|screen-navigation)$/,['infotainmentScreen']],[/^(?:driver-display|cluster|instrument-display)$/,['instrumentScreen']],[/^driver[-_]seat$/,['driverAdjustment']],[/^passenger[-_]seat$/,['passengerAdjustment']],[/^(?:audio|premium[-_]audio)$/,['audioSystem']],[/^climate$/,['dualClimate']]];
function render(){
 const out=$('automatic-equipment');out.replaceChildren();
 const recs=['1','2','3','4','5'].map(side=>({side,v:window.usedInventoryData.vehicles.find(v=>v.vin===$('choose-'+side)?.value)})).filter(r=>r.v).map(r=>({...r,s:withComparisonSpecifications(r.v,applyFactoryEquipment(r.v,window.equipmentIndex.records[r.v.vin]))}));
 if(recs.length<2){out.append(el('p','Choose two vehicles above to compare.'));return;}
 const pendingEquipment=recs.some(({s,side,v})=>s?.status!=='verified'&&(v.decodePending||$('lookup-status-'+side)?.getAttribute('aria-busy')==='true'));
 const contextParams=new URLSearchParams(location.search);
 const requested=[...new Set(parseQuery([$('group-query')?.value||contextParams.get('q')||'',contextParams.get('requestedEquipment')||''].join(' ')).requirements.map(r=>r.id))];
 const matches=recs.map(r=>trimGuide?guideTrim(r.v,r.s,trimGuide):null);
 const guides=matches.map((m,i)=>m?{name:m.trim.name,facts:guideFeatureFacts(m.trim,recs[i].s?.features||{})}:null);
 const allRows=comparisonRows([...specificationDefinitions,...definitions.filter(([id])=>!/^engine(?:Size|Cyl|Inline)|^engine20$|^engine36$|^(?:rwd|fwd)$/.test(id))],recs.map(r=>r.s),requested,guides);
 // With every vehicle's engine and transmission named in full, the one-word rows (V8, HEMI, turbo…) only repeat them.
 const named=id=>allRows.find(r=>r.id===id)?.facts.every(Boolean);
 const rows=allRows.filter(r=>r.requested||!(named('engineSpecification')&&/^(?:dieselCummins|hurricane|pentastar|supercharged|turbo|v6|v8|hemi|diesel|electric|hybrid)$/.test(r.id))&&!(named('transmissionSpecification')&&/^(?:manual|automatic)Transmission$/.test(r.id)));
 const settled=id=>{const row=rows.find(r=>r.id===id);return !!row&&row.facts.every(Boolean);};
 // The searchable features a guide row is about, on any of the compared trims.
 const rowFeatures=row=>{const ids=new Set();for(const g of guides)for(const [id,fact] of g?.facts||[])if(fact.key===row.key)ids.add(id);return [...ids];};
 const trimRows=guideDifferences(matches).filter(row=>{const ids=rowFeatures(row);if(ids.length&&ids.every(settled))return false;return !answeredBySticker.some(([key,ids])=>key.test(row.key)&&ids.every(settled));});
 const trimLink=guideLink(matches),sameTrim=matches.every(Boolean)&&new Set(matches.map(m=>m.model.id+'/'+m.trim.id)).size===1;
 const counts={difference:rows.filter(r=>r.group==='difference'||r.group==='listed-on-some').length+trimRows.length,oneSided:rows.filter(r=>r.group==='listed-on-some').length,same:rows.filter(r=>r.group==='same').length,check:rows.filter(r=>r.group==='check'||(r.requested&&r.group==='unknown')).length};
 out.append(el('h2','Compare side by side'));if(pendingEquipment)out.append(el('p','Checking original equipment. The comparison updates as each vehicle’s source is read.'));out.append(el('p',`${counts.same} shared details · ${counts.difference} differences`+(counts.oneSided?` (${counts.oneSided} where another vehicle’s sticker does not say)`:'')+(counts.check?` · ${counts.check} items need source details`:'')));if(matches.some(Boolean)){const p=el('p');p.className='comparison-trim-note';
  const found=matches.filter(Boolean),oneModel=new Set(found.map(m=>m.model.id)).size===1;
  const extra=m=>m.variant?' ('+m.variant.replace(/^G T$/,'G/T').toLowerCase().replace(/\b[a-z]/g,c=>c.toUpperCase())+')':'';
  const names=[...new Set(found.map(m=>(oneModel?m.trim.name:guideColumnName(m))+extra(m)))];
  p.append(sameTrim?`Both are the ${guideColumnName(matches[0])}, so they start with the same standard equipment. The differences are the options on each one. `:matches.every(Boolean)?`Comparing ${names.length>2?names.slice(0,-1).join(', ')+' and '+names.at(-1):names.join(' and ')}. Window stickers leave off much of the standard equipment, so the factory trim guide fills that in. `:'The factory trim guide fills in standard equipment where a window sticker leaves it off. ');
  if(trimLink){const one=new Set(found.map(m=>m.trim.id)).size===1;const a=el('a',one?`See the ${found[0].trim.name} in Compare Trims ↗`:'See these trims side by side in Compare Trims ↗');a.href=trimLink;p.append(a);}out.append(p);}
 out.append(el('p','Like a feature? Click an Included checkmark to find inventory with that equipment.'));
 const controls=el('div');controls.className='comparison-controls';
 const label=el('label','Find a feature');label.htmlFor='comparison-feature-filter';const search=el('input');search.id='comparison-feature-filter';search.type='search';search.placeholder='Seats, cameras, roof, towing…';search.value=viewState.search;
 controls.append(label,search);const buttons=el('div');buttons.className='comparison-view-buttons';controls.append(buttons);
 const status=el('p');status.setAttribute('role','status');
 const wrap=el('div');wrap.className='comparison-table-wrap';wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Vehicle equipment comparison; scroll sideways for more vehicles');
 let mode=viewState.mode==='requested'&&!requested.length?'important':viewState.mode;const buttonRefs=[];
 const legend=el('p','“Not stated on sticker” means that vehicle’s window sticker does not list the feature. Stickers leave some standard equipment off, so ask us to confirm anything that matters to you.');legend.className='comparison-legend';
 function draw(){
  wrap.replaceChildren();for(const [id,b] of buttonRefs)b.setAttribute('aria-pressed',String(id===mode));
  const visible=visibleComparisonRows(rows,mode,search.value);viewState.mode=mode;viewState.search=search.value;
  status.textContent=search.value?'Matching '+(mode==='important'?'differences':mode==='all'?'shared equipment':mode==='check'?'items to check':'equipment'):mode==='complete'?'All confirmed equipment — shared details and differences':mode==='important'?'Differences: what one vehicle has that another does not':mode==='check'?'Why these items need checking':mode==='requested'?'Your requested features':'Shared equipment';
  legend.hidden=!visible.some(r=>r.facts.some(f=>!f));
  if(!visible.length&&!((mode==='important'||mode==='complete')&&trimRows.some(row=>!search.value||featureMatches(row,search.value)))){wrap.append(el('p',search.value?'No features match that wording.':pendingEquipment?'Checking original equipment. Shared details and differences will appear as the sources are read.':mode==='complete'?'No fully confirmed shared details or differences yet. Open Items to check for the source-specific reasons.':mode==='check'?'No evidence gaps in these recorded features.':mode==='all'?'No fully confirmed shared equipment in these recorded features.':'No confirmed differences in these recorded features. Check All equipment or Items to check.'));return;}
  const table=el('table');table.className='equipment-matrix';const caption=el('caption','Equipment at a glance');caption.className='matrix-caption';table.append(caption);
  const head=el('thead'),tr=el('tr'),corner=el('th','Feature');corner.scope='col';tr.append(corner);
  for(const {v} of recs){const th=el('th');th.scope='col';th.append(el('strong',v.title),el('small',short(v)));tr.append(th)}head.append(tr);table.append(head);
  const body=el('tbody');
  if(recs.some(({v})=>v.external)){
   const fields=[['Data source',v=>v.external?(v.decodedAt?'External VIN identity confirmed; dealer listing unverified':'External VIN; identity and dealer listing unverified'):'Covert dealer listing snapshot'],['VIN',v=>v.vin],['Advertised price',v=>Number.isFinite(v.price)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v.price):'Not supplied for this outside vehicle'],['Mileage',v=>Number.isFinite(v.miles)?v.miles.toLocaleString():'Not supplied for this outside vehicle'],['Body / cab',v=>v.decodedSpecs?.body||(/CREW CAB/i.test(v.title)?'Crew cab (listing)':v.decodePending?'Checking VIN…':'VIN decoder did not provide this field')],['Engine',v=>indexEngine(v)||v.decodedSpecs?.engine||(v.decodePending?'Checking VIN…':'VIN decoder did not provide this field')],['Fuel',v=>v.decodedSpecs?.fuel||(v.decodePending?'Checking VIN…':'VIN decoder did not provide this field')]];
   for(const [label,value] of fields){const row=el('tr'),th=el('th',label);th.scope='row';row.append(th);for(const {v} of recs)row.append(el('td',value(v)));body.append(row);}
  }
  for(const row of visible){const tr=el('tr'),name=el('th');name.scope='row';name.append(el('strong',(row.requested?'★ ':'')+row.label),el('small',row.group==='difference'?'Different':row.group==='listed-on-some'?(recs.length===2?'Listed for one; not stated for the other':'Not stated for every vehicle'):row.group==='same'?'Same on all vehicles':'Source details needed'));tr.dataset.comparisonGroup=row.group;tr.append(name);
   row.facts.forEach((f,i)=>{const td=el('td');appendEquipmentFact(td,f,document,equipmentReviewReason(window.equipmentIndex.records[recs[i].v.vin],recs[i].v.vin));
    const audioFeature=['audioSystem','premiumAudio'].includes(row.id)?audioInventoryFeature(recs[i].s?.features?.audioSystem):null;
    const inventoryFeature=audioFeature||(!row.specification&&definitions.some(([id])=>id===row.id)?row.id:null);
    const optionKey=row.specification?'comparison-'+row.id:null;
    if(f?.value===true&&(inventoryFeature||optionKey)){
     const badge=td.querySelector('.equipment-answer');const a=el('a',badge.textContent);
     const context=parseQuery($('group-query')?.value||new URLSearchParams(location.search).get('q')||'');
     const linkContext={condition:recs[i].v.condition,advisor:new URLSearchParams(location.search).get('advisor'),modelTerms:context.terms};
     a.href=optionKey?optionInventoryLink({key:optionKey,label:row.label,value:f.displayValue||''},linkContext):featureInventoryLink(inventoryFeature,linkContext);
     a.className=badge.className+' equipment-feature-link';a.style.cssText='display:inline-block;min-height:44px;padding:10px 12px;text-decoration:underline;text-underline-offset:3px;border:1px solid currentColor;border-radius:6px';
     const targetLabel=definitions.find(([id])=>id===inventoryFeature)?.[1]||row.label;a.title='Find vehicles with '+targetLabel;a.setAttribute('aria-label','Find vehicles with '+targetLabel);badge.replaceWith(a);
    }tr.append(td)});body.append(tr);
  }if(body.children.length){table.append(body);wrap.append(table);}
  drawTrimRows();
  // Shared equipment is not a difference, so say where it went: shoppers look for the safety features here.
  if(mode==='important'&&!search.value&&counts.same){
   const lead=['blindSpot','adaptiveCruise','emergencyBrake','forwardWarning','laneAssist','parkingSensors','backupCamera','remoteStart','carplay','heatedSeats'];
   const shared=rows.filter(r=>r.group==='same'&&r.facts.every(f=>f?.value===true)&&!r.specification).sort((a,b)=>(lead.indexOf(a.id)+1||99)-(lead.indexOf(b.id)+1||99)).slice(0,5).map(r=>r.label.toLowerCase());
   const note=el('p');note.className='comparison-shared-note';
   note.append(el('strong',recs.length===2?'Not in this list because both have it: ':'Not in this list because every vehicle has it: '),shared.length?shared.join(', ')+(counts.same>shared.length?`, and ${counts.same-shared.length} more shared details. `:'. '):`${counts.same} shared details. `);
   const all=el('button','Show shared equipment');all.type='button';all.addEventListener('click',()=>{mode='all';draw();wrap.scrollIntoView({block:'nearest'})});note.append(all);wrap.prepend(note);
  }
  if(!wrap.children.length)wrap.append(el('p','No confirmed differences in the recorded equipment. Open Items to check for the evidence gaps and what needs checking.'));
 }
 // What each trim starts with, from the same factory guide as the Compare Trims page.
 function drawTrimRows(){
  if(mode!=='important'&&mode!=='complete')return;
  const shown=trimRows.filter(row=>!search.value||featureMatches(row,search.value));if(!shown.length)return;
  const section=el('section');section.className='comparison-trim-rows';section.append(el('h3','How the trims differ from the factory'));
  const note=el('p','Standard equipment for each trim, from the factory trim guide. An option on one of these vehicles shows in the window-sticker rows above. ');if(trimLink){const a=el('a','Open in Compare Trims ↗');a.href=trimLink;note.append(a);}section.append(note);
  const table=el('table');table.className='equipment-matrix trim-guide-matrix';const caption=el('caption','Standard equipment by trim');caption.className='matrix-caption';table.append(caption);
  const head=el('thead'),tr=el('tr'),corner=el('th','Factory equipment');corner.scope='col';tr.append(corner);
  recs.forEach(({v},i)=>{const th=el('th');th.scope='col';th.append(el('strong',matches[i].trim.name),el('small',short(v)));tr.append(th)});head.append(tr);table.append(head);
  const body=el('tbody'),word={standard:['✓ Standard','yes'],optional:['+ Optional','unknown'],unavailable:['— Not offered','no']};
  for(const row of shown){const tr=el('tr'),name=el('th');name.scope='row';name.append(el('strong',row.label),el('small','Factory trim guide'));tr.dataset.comparisonGroup='trim-guide';tr.append(name);
   const features=rowFeatures(row);
   row.cells.forEach((cell,i)=>{const td=el('td'),badge=el('strong',word[cell.status][0]);badge.className='equipment-answer '+word[cell.status][1];td.append(badge,el('p',cell.value));
    if(cell.note&&!/shown (?:below|above)|see (?:below|above)/i.test(cell.note))td.append(el('small',cell.note));
    for(const option of cell.options||[]){const p=el('p');p.append(el('strong','Available upgrade: '),option.value);td.append(p);}
    if(cell.status==='optional'&&features.some(id=>recs[i].s?.features?.[id]?.value===true))td.append(el('p','✓ This one has it, per its window sticker.'));
    if(cell.sourceUrl){const a=el('a','Factory reference ↗');a.href=cell.sourceUrl;a.target='_blank';a.rel='noopener';a.className='trim-guide-source';td.append(a);}
    tr.append(td)});body.append(tr);}
  table.append(body);section.append(table);wrap.append(section);
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
document.addEventListener('compare:changed',render);render();trimGuideReady.then(()=>{if(trimGuide)render();});
