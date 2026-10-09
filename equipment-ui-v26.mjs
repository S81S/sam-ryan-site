import {collectInventoryMatches} from './inventory-matches.mjs';
import {vehicleImage,vehicleImageSet} from './vehicle-images.mjs';
import {optionFromParams} from './option-inventory.mjs';
import {applyFeatureFilter} from './feature-inventory-link.mjs';
import {sameModelOptions,modelName} from './same-model-options.mjs';
import {optionGuidance,noMatchGuidance} from './option-guidance.mjs';
import {shoppingContext,comparisonLink} from './shopping-context.mjs';
import {recoveryOptions} from './search-recovery.mjs';
import {openVehiclePreview} from './vehicle-preview.mjs';
import {parseQuery,matchVehicle,labels,definitions} from './equipment-search.mjs';
import {categoryLabels} from './vehicle-categories.mjs';
// Display-only cleanup of ALL-CAPS new-vehicle titles from the dealer feed (data keeps the original).
const KEEP_UPPER=new Set(['SRT','TRX','RHO','AWD','RWD','FWD','GT','R/T','HEMI','WB','CA','II','III','L','S','X','SXT','SLT','HD','EV']),SPECIAL_CASE={PROMASTER:'ProMaster','4X4':'4x4','4X2':'4x2','4XE':'4xe','85TH':'85th'};
const displayTitle=title=>{const t=String(title||''),m=t.match(/^(New|Used) (\d{4}) (.+)$/);if(!m||m[3]!==m[3].toUpperCase())return t;return m[1]+' '+m[2]+' '+m[3].split(' ').map(w=>SPECIAL_CASE[w]??(KEEP_UPPER.has(w)?w:/^[A-Z]+$/.test(w)?w[0]+w.slice(1).toLowerCase():/^\d+-[A-Z]+$/.test(w)?w.replace(/[A-Z]+$/,x=>x[0]+x.slice(1).toLowerCase()):w)).join(' ');};
const $=id=>document.getElementById(id),data=window.usedInventoryData,index=window.equipmentIndex;
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const cash=n=>n===null?'Call for price':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
const link=(label,url)=>{const a=el('a',label,'mini-btn');a.href=url;return a;};
const drivewayLink=vehicle=>link('See in Your Driveway','/see-yourself?'+new URLSearchParams({vehicle:vehicle.vin,advisor:shoppingContext().advisor})+'#driveway-heading');
let selectedOption=optionFromParams(new URLSearchParams(location.search));
let featureParam=new URLSearchParams(location.search).get('feature');
if(featureParam&&definitions.some(([id])=>id===featureParam)){const featureNotice=el('p','Showing only confirmed '+labels[featureParam]+' matches');featureNotice.id='active-feature-filter';featureNotice.setAttribute('role','status');const remove=el('button','Remove feature filter','mini-btn');remove.type='button';remove.addEventListener('click',()=>{const u=new URL(location.href);u.searchParams.delete('feature');featureParam=null;history.replaceState(null,'',u);featureNotice.remove();$('matchBtn').click();});featureNotice.append(document.createTextNode(' '),remove);($('request').closest('[data-search-notices]')||$('request').parentNode).append(featureNotice);}
if(selectedOption){const notice=el('p','Showing only confirmed '+selectedOption.label+(selectedOption.value?' — '+selectedOption.value:'')+' matches');notice.id='active-option-filter';notice.setAttribute('role','status');const remove=el('button','Remove option filter','mini-btn');remove.type='button';remove.addEventListener('click',()=>{const url=new URL(location.href);for(const key of ['option','optionLabel','optionValue'])url.searchParams.delete(key);history.replaceState(null,'',url);selectedOption=null;notice.remove();$('matchBtn').click();});notice.append(document.createTextNode(' '),remove);($('request').closest('[data-search-notices]')||$('request').parentNode).append(notice);}
$('sticker-coverage').textContent='Explore equipment using original window stickers and reviewed factory specifications.';
const browseInventory=document.body.dataset.browseInventory==='true';
const conditionRadios=[...document.querySelectorAll('input[name="vehicle-condition"]')];
let keepSearchPosition=false;
function syncConditionChoices(){for(const radio of conditionRadios)radio.checked=radio.value===$('search-condition').value;}
for(const radio of conditionRadios)radio.addEventListener('change',()=>{if(radio.checked){$('search-condition').value=radio.value;keepSearchPosition=true;try{if(browseInventory||$('request').value.trim())$('matchBtn').click();}finally{keepSearchPosition=false;}}});
const pageSize=()=>Number($('results-per-page').value);
// --- Compare selection: nothing is preloaded. Shoppers opt in per vehicle with a checkbox,
// then go to Compare with only the vehicles they picked (or they can enter a stock #/VIN there directly).
let compareVins=[];
try{compareVins=JSON.parse(sessionStorage.getItem('samRyanCompareVins')||'[]')}catch{}
const compareBar=el('div');
compareBar.className='compare-selection-bar';
compareBar.style.cssText='display:none;position:fixed;left:0;right:0;bottom:58px;z-index:1000;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;padding:12px 16px;border-top:1px solid rgba(255,255,255,.25);background:#0d1117;box-shadow:0 -6px 20px rgba(0,0,0,.45)';
const compareText=el('span');
const compareGo=link('Compare selected →','#');
const compareClear=el('button','Clear','mini-btn');compareClear.type='button';
compareBar.append(compareText,compareGo,compareClear);
$('matchResults').parentNode.insertBefore(compareBar,$('matchResults'));

function saveCompare(){try{sessionStorage.setItem('samRyanCompareVins',JSON.stringify(compareVins))}catch{}}
function updateCompareBar(){
 compareBar.style.display=compareVins.length?'flex':'none';
 compareText.textContent=compareVins.length+(compareVins.length===1?' vehicle selected to compare.':' vehicles selected to compare.');
 compareGo.href=comparisonLink(compareVins,shoppingContext());
}
function toggleCompare(vin,checked){
 if(checked){
  if(compareVins.length>=5){alert('You can compare up to 5 vehicles at a time. Remove one before adding another.');const cb=document.querySelector(`input[data-compare-vin="${CSS.escape(vin)}"]`);if(cb)cb.checked=false;return;}
  if(!compareVins.includes(vin))compareVins.push(vin);
 } else compareVins=compareVins.filter(x=>x!==vin);
 saveCompare();updateCompareBar();
}
compareClear.addEventListener('click',()=>{compareVins=[];saveCompare();updateCompareBar();document.querySelectorAll('input[data-compare-vin]').forEach(cb=>cb.checked=false)});
updateCompareBar();


let searchCounts={},lastQuery=null,visible=pageSize(),restoringSearch=true;
function revealResults(){if(!restoringSearch&&!keepSearchPosition){$('search-results').scrollIntoView({behavior:'instant',block:'start'});$('search-results').focus({preventScroll:true});}}
let renderSequence=0;
async function render(){
 const sequence=++renderSequence;
 syncConditionChoices();
 const out=$('matchResults');out.replaceChildren();out.removeAttribute('aria-busy');$('visible-count').textContent='';const q=lastQuery;if(!q)return;
 const customerRequest=[q.original,q.equipmentOption?[q.equipmentOption.label,q.equipmentOption.value].filter(Boolean).join(': '):featureParam?labels[featureParam]:''].filter(Boolean).join(' — ');
 const summary=el('div',undefined,'search-summary');
 const items=[...(q.bodyType?[q.bodyType==='truck'?'Pickup trucks':q.bodyType==='suv'?'SUVs':'Pickup trucks or SUVs']:[]),...q.terms,...(q.condition?[q.condition]:[]),...(q.budget!==null?['Price up to '+cash(q.budget)]:[]),...(q.mileage!==null?['Mileage up to '+q.mileage.toLocaleString()]:[]),...(q.equipmentOption?['With '+q.equipmentOption.label+(q.equipmentOption.value?' — '+q.equipmentOption.value:'')]:[]),...q.requirements.map(r=>(r.wanted?'With ':'Without ')+labels[r.id])];
 summary.append(el('h3','Your search'),el('p',items.join(' · ')||'All vehicles at 8107 Research Blvd'));
 if(q.categories?.length){const describe=c=>categoryLabels[c.id]+(c.bodyType==='truck'?' (pickups)':c.bodyType==='suv'?' (SUVs)':c.bodyType==='truckOrSuv'?' (pickups or SUVs)':'');const positive=q.categories.filter(c=>c.wanted).map(describe).join(q.categoryMode==='any'?' or ':' · '),negative=q.categories.filter(c=>!c.wanted).map(c=>'Exclude '+describe(c)).join(' · ');summary.lastChild.textContent=[positive,negative,...items].filter(Boolean).join(' · ');summary.append(el('p','Categories use listed models, trims or a verified off-road package. Specific options are checked separately against the window sticker.','stock-small'));if(q.categories.some(c=>c.id==='desert'&&c.wanted))summary.append(el('p','Baja / desert describes the vehicle category; it does not confirm a drive mode named Baja.','stock-small'));}
 if(featureParam||selectedOption){$('show-unverified').checked=false;$('show-unverified').disabled=true;}else $('show-unverified').disabled=false;
 for(const warning of q.warnings)summary.append(el('p',warning,'stock-small'));out.append(summary);
 if(q.ambiguity||q.warnings.some(w=>/Conflicting|not both|More than one/.test(w))){out.append(el('p',q.ambiguity||'Please resolve the conflicting choices above, then search again.'));$('more-matches').hidden=true;return;}
 for(const notice of optionGuidance(q)){const message=el('p',notice.message,'stock-small');message.append(document.createTextNode(' '),link('View factory options',notice.sourceUrl));out.append(message);}
 const loading=el('p','Checking inventory against your choices…','stock-small');loading.setAttribute('role','status');out.append(loading);out.setAttribute('aria-busy','true');$('more-matches').hidden=true;
 const groups=await collectInventoryMatches(data.vehicles,index.records,q,{isCurrent:()=>sequence===renderSequence});
 if(!groups)return false;
 const {matches,unknown,equipmentConflicts}=groups;loading.remove();out.removeAttribute('aria-busy');
 out.append(el('p',`${matches.length} ${(q.requirements.length||q.equipmentOption)?(q.requirements.some(r=>r.id==='flatTow')?'matches supported by stickers and towing manuals':'equipment-confirmed matches'):'matches'}${(q.requirements.length||q.equipmentOption)&&unknown.length?' · '+unknown.length+' need equipment confirmation':''}`,'result-count'));
 if(q.equipmentOption&&!matches.length){
  const reasons=new Map();for(const {result} of unknown){const reason=result.checks.find(c=>c.id==='selectedOption'&&c.state==='unknown')?.reason;if(reason)reasons.set(reason,(reasons.get(reason)||0)+1);}
  const explanation=el('div',undefined,'search-summary');explanation.append(el('h3','Why no confirmed matches are shown'));
  if(equipmentConflicts.length)explanation.append(el('p',equipmentConflicts.length+' vehicles do not satisfy the selected equipment requirements based on their sticker evidence.'));
  for(const [reason,count] of reasons)explanation.append(el('p',count+' vehicles: '+reason));
  if(!equipmentConflicts.length&&!unknown.length)explanation.append(el('p','No current vehicles satisfy the model, condition and other search filters.'));
  explanation.append(el('p','Only vehicles with evidence for your selected configuration appear as matches.'));
  out.append(explanation);
 }
 searchCounts={condition:q.condition||'Both',result_count:matches.length,unknown_count:unknown.length,feature_count:q.requirements.length};{const t=Date.parse(data.capturedAt);if(Number.isFinite(t)){const when=new Date(t).toLocaleString('en-US',{timeZone:'America/Chicago',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+' CT';const hours=(Date.now()-t)/36e5,stale=hours>(data.staleHours||24);const stamp=el('p',stale?`Listings last checked ${when}. Some prices or vehicles may have changed since then — ask us to confirm before you visit.`:`Listings checked ${when}.`,'snapshot-note listing-checked'+(stale?' is-stale':''));stamp.id='listing-checked';out.append(stamp);}}
 if(matches.length&&(q.terms.length||q.requirements.length||q.equipmentOption)){const heading=el('h3','Exact matches');heading.style.gridColumn='1/-1';out.append(heading);}
 const order=$('search-sort').value;
 const sort=(a,b)=>order==='recent'?((Date.parse(b.vehicle.firstSeenAt)||0)-(Date.parse(a.vehicle.firstSeenAt)||0)||b.vehicle.year-a.vehicle.year):order==='mileage'?(a.vehicle.miles??Infinity)-(b.vehicle.miles??Infinity):order==='year'?b.vehicle.year-a.vehicle.year:(a.vehicle.price??Infinity)-(b.vehicle.price??Infinity);
 matches.sort(sort);unknown.sort(sort);
 const rows=[...matches,...(!featureParam&&!selectedOption&&$('show-unverified').checked?unknown:[])];
 if(!rows.length)out.append(el('p',noMatchGuidance(q)||(unknown.length?'No exact equipment matches are confirmed. Adjust your search or ask us to confirm the equipment.':'No matches found. Try a broader model or budget, or ask us to help with your shortlist.')));
 if(!matches.length&&q.condition&&!parseQuery(q.original).condition){
  const otherCondition=q.condition==='Used'?'New':'Used';
  const otherCount=data.vehicles.filter(v=>matchVehicle(v,index.records[v.vin],{...q,condition:otherCondition}).kind==='match').length;
  if(otherCount){const hint=el('div',undefined,'search-summary');hint.append(el('p',`You are searching ${q.condition.toLowerCase()} vehicles. ${otherCount} ${otherCondition.toLowerCase()} vehicles match this same search.`));const change=el('button',`Show ${otherCount} matching ${otherCondition.toLowerCase()} vehicles`,'mini-btn');change.type='button';change.addEventListener('click',()=>{$('search-condition').value=otherCondition;$('matchBtn').click();});hint.append(change);out.append(hint);}
 }
 for(const {vehicle:v,result} of rows.slice(0,visible)){
  const sticker=index.records[v.vin],card=el('article',undefined,'match');
  const detailUrl=`/vehicle-${v.vin}?${new URLSearchParams({q:customerRequest,condition:q.condition||'Both'})}`;const photo=link('',detailUrl);photo.className='stock-photo';photo.setAttribute('aria-label','View vehicle details: '+displayTitle(v.title));const img=el('img');img.src=vehicleImage(v.photoUrl);img.srcset=vehicleImageSet(v.photoUrl);img.sizes='(max-width:700px) calc(100vw - 40px), (max-width:1050px) 45vw, 30vw';img.alt=displayTitle(v.title);img.width=400;img.height=300;img.loading='lazy';img.addEventListener('error',()=>photo.replaceChildren(el('span','View vehicle details')),{once:true});photo.append(img);card.append(photo);
  card.append(el('span',result.kind==='unknown'?'Equipment needs confirmation':result.checks.some(c=>c.state==='not-listed')?'Sunroof not listed on sticker':q.requirements.some(r=>r.id==='flatTow')?'Sticker + towing manual checked':(q.requirements.length||q.equipmentOption)?(result.checks.some(c=>c.method?.startsWith('factory-'))?'Sticker + factory guide checked':'Requested equipment confirmed on sticker'):sticker?.status==='verified'?'Window sticker available':'Ask us to confirm equipment','stock-badge'),(()=>{const h=el('h3');h.append(link(displayTitle(v.title),detailUrl));return h;})(),el('p',cash(v.price),'vehicle-price'),el('p',`${v.condition||''} · ${v.miles==null?'Ask for current mileage':v.miles.toLocaleString()+' miles'}${v.stock?' · Stock '+v.stock:''}`,'vehicle-meta'));
  if(v.condition==='New')card.append(el('p','Advertised price may include conditional incentives. Ask us to confirm your price.','stock-small'));
  for(const category of result.categoryChecks||[])card.append(el('p',`${category.label} · ${category.evidence}`,'stock-small'));
  for(const check of result.checks)card.append(el('p',`${check.state==='match'?'✓':check.state==='not-listed'?'—':'?'} ${check.wanted?'':'Without '}${check.label}: ${check.state==='unknown'?'not confirmed by the sticker':check.evidence.join(' / ')}`,'equipment-check'));
  for(const check of result.checks)if(check.sourceUrl&&check.sourceUrl!==sticker?.sourceUrl)card.append(link(check.id==='flatTow'?'Read factory flat-towing instructions ↗':'Read factory equipment reference ↗',check.sourceUrl));
  if(sticker?.status==='verified')card.append(link('Read original window sticker ↗',sticker.sourceUrl));
  else if(sticker?.stickerFound&&sticker.sourceUrl&&sticker.vin===v.vin)card.append(link('View the window sticker on file ↗',sticker.sourceUrl));
  const actions=el('div',undefined,'stock-actions');const detailsLink=link('View details',`/vehicle-${v.vin}?${new URLSearchParams({q:customerRequest,condition:q.condition||'Both'})}`);const availability=link('Check availability',`contact.html?vehicle=${v.vin}&request=${encodeURIComponent(customerRequest)}`);availability.classList.add('secondary-action');const compareLabel=el('label','Add to compare');compareLabel.className='compare-pick';const cb=document.createElement('input');cb.type='checkbox';cb.dataset.compareVin=v.vin;cb.checked=compareVins.includes(v.vin);cb.addEventListener('change',()=>toggleCompare(v.vin,cb.checked));compareLabel.prepend(cb);const more=el('details',undefined,'more-actions');more.append(el('summary','More options'));const moreList=el('div',undefined,'more-actions-list');if(browseInventory){const quick=el('button','Quick photo preview','mini-btn');quick.type='button';quick.addEventListener('click',()=>openVehiclePreview(v,customerRequest));moreList.append(quick);}moreList.append(link('Request a walkaround video',`contact.html?vehicle=${v.vin}&purpose=walkaround&request=${encodeURIComponent(customerRequest)}`),link('Request a test drive',`contact.html?vehicle=${v.vin}&purpose=test-drive&request=${encodeURIComponent(customerRequest)}`),link('Compare equipment',comparisonLink([v.vin],shoppingContext())),drivewayLink(v));more.append(moreList);actions.append(detailsLink,availability,compareLabel,more);card.append(actions);out.append(card);
 }
 const otherOptions=sameModelOptions(data.vehicles,index.records,q,matches.map(x=>x.vehicle.vin));
 otherOptions.sort(sort);
 if(otherOptions.length){
  const section=el('section',undefined,'same-model-options');
  section.style.cssText='grid-column:1/-1;margin:18px 0;padding:16px;border:1px solid #526173;border-radius:12px';
  const base=modelName(q.terms.join(' '));const name=(/^\d+$/.test(base)?'Ram '+base:base.replace(/\b\w/g,c=>c.toUpperCase()));
  section.append(el('h3','Other '+name+' options'),el('p','Different trims that meet your other search requirements.','stock-small'));
  const list=el('div');section.append(list);let shown=0;
  const more=el('button','Show more options','mini-btn');more.type='button';
  const addRows=()=>{for(const {vehicle:v,reason} of otherOptions.slice(shown,shown+5)){
   const row=el('div');row.style.cssText='display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:12px 0;border-top:1px solid #526173';
   const info=el('div');info.style.cssText='flex:1 1 240px;min-width:0';
   const title=link(displayTitle(v.title),`/vehicle-${v.vin}`);title.className='';title.style.cssText='font-weight:700;text-decoration:underline';
   info.append(title,el('div',`${cash(v.price)} · ${v.miles==null?'Mileage not listed':v.miles.toLocaleString()+' miles'} · Stock ${v.stock}`,'stock-small'),el('div','Different trim','stock-small'));
   const details=el('button','View details','mini-btn');details.type='button';details.addEventListener('click',()=>openVehiclePreview(v,customerRequest));
   const label=el('label','Compare');label.style.cssText='display:flex;gap:6px;align-items:center;font-size:14px';
   const cb=el('input');cb.type='checkbox';cb.dataset.compareVin=v.vin;cb.checked=compareVins.includes(v.vin);cb.addEventListener('change',()=>toggleCompare(v.vin,cb.checked));label.prepend(cb);
   row.append(info,details,label,drivewayLink(v));list.append(row);
  }shown+=5;more.hidden=shown>=otherOptions.length;};
  more.addEventListener('click',addRows);section.append(more);addRows();out.append(section);
 }
 $('more-matches').hidden=rows.length<=visible;
 $('more-matches').textContent=`Show ${Math.min(pageSize(),Math.max(0,rows.length-visible))} more vehicles`;
 $('visible-count').textContent=rows.length?`Showing ${Math.min(visible,rows.length)} of ${rows.length} vehicles`:'';
 if(!matches.length&&!otherOptions.length){
  const help=el('section',undefined,'search-summary');help.append(el('h3','Let’s find your next vehicle'),el('p','Keep your must-haves and send us your search. We can check availability and help confirm the details.'));
  const request=`${q.condition||'New or used'} vehicles. My search: ${customerRequest}`;
  help.append(link('Help me find this vehicle','contact.html?purpose=find&request='+encodeURIComponent(request)));
  if(!featureParam&&!selectedOption&&unknown.length&&!$('show-unverified').checked){const show=el('button',`Show ${unknown.length} vehicles needing confirmation`,'mini-btn');show.type='button';show.addEventListener('click',()=>{$('show-unverified').checked=true;render();});help.append(show);}
  const alternatives=selectedOption?[]:recoveryOptions(data.vehicles,index.records,q).filter(option=>!featureParam||option.key!==featureParam);
  if(alternatives.length){help.append(el('h3','Options if you’re flexible'),el('p','These are not exact matches. Each group sets aside one requirement; your original search stays unchanged.'));
   for(const option of alternatives){const group=el('div',undefined,'recovery-option');group.append(el('h4',option.label.replace('Search without my','Set aside my').replace('See prices above my budget','Above your budget').replace('Include higher mileage','Higher mileage')),el('p',`${option.count} match your remaining requirements.`));
    for(const v of option.vehicles){const button=el('button',`${displayTitle(v.title)} · ${cash(v.price)} · Stock ${v.stock}`,'mini-btn');button.type='button';button.addEventListener('click',()=>openVehiclePreview(v,request+'\nI’m considering this alternative: '+option.label));group.append(button);}
    help.append(group);
   }
  } else if(!unknown.length)help.append(el('p','We couldn’t find an alternative by changing just one equipment, price or mileage requirement. Check the model spelling or let us help.'));
  out.append(help);
 }
 return true;
}
$('matchBtn').addEventListener('click',async()=>{const value=$('request').value.trim();if(!value&&!browseInventory){renderSequence++;lastQuery=null;$('more-matches').hidden=true;$('matchResults').textContent='Tell us a model, budget or equipment you want.';return;}lastQuery=applyFeatureFilter(parseQuery(value),new URLSearchParams(location.search).get("feature"),definitions);lastQuery.equipmentOption=selectedOption;const selectedCondition=$('search-condition').value;if(lastQuery.condition&&selectedCondition!=='Both'&&lastQuery.condition!==selectedCondition){lastQuery.ambiguity=`Your request says ${lastQuery.condition.toLowerCase()}. Choose ${lastQuery.condition} above, or edit your request.`;}lastQuery.condition=selectedCondition==='Both'?lastQuery.condition:selectedCondition;const searchUrl=new URL(location.href);searchUrl.searchParams.set('q',value);searchUrl.searchParams.set('condition',selectedCondition);history.replaceState(null,'',searchUrl);try{sessionStorage.setItem('samRyanLastSearch',value);}catch{}visible=pageSize();searchCounts={};const wasRestoring=restoringSearch,pending=render();updateCompareBar();revealResults();const finished=await pending;if(finished&&!wasRestoring&&Object.keys(searchCounts).length)window.cwsTrack?.('search_results',searchCounts);});
$('results-per-page').addEventListener('change',()=>{visible=pageSize();render();});
$('search-sort').addEventListener('change',()=>{visible=pageSize();render();});
$('show-unverified').addEventListener('change',()=>{visible=pageSize();render();});
$('more-matches').addEventListener('click',()=>{visible+=pageSize();render();});
$('request').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('matchBtn').click();}});
const savedCondition=new URLSearchParams(location.search).get('condition');if(['New','Used','Both'].includes(savedCondition))$('search-condition').value=savedCondition;
$('search-condition').addEventListener('change',()=>{if(browseInventory||$('request').value.trim())$('matchBtn').click();});
let initial=new URLSearchParams(location.search).get('q');try{if(!browseInventory)initial??=sessionStorage.getItem('samRyanLastSearch');}catch{}
if(initial){$('request').value=initial.slice(0,1000);$('matchBtn').click();}else if(browseInventory){$('matchBtn').click();}
$('clear-inventory-search')?.addEventListener('click',()=>{const clearUrl=new URL(location.href);clearUrl.searchParams.delete('feature');featureParam=null;for(const key of ['option','optionLabel','optionValue'])clearUrl.searchParams.delete(key);selectedOption=null;$('active-option-filter')?.remove();history.replaceState(null,'',clearUrl);$('active-feature-filter')?.remove();$('request').value='';$('show-unverified').checked=false;$('matchBtn').click();});

restoringSearch=false;
document.querySelectorAll('[data-feature]').forEach(b=>b.addEventListener('click',()=>{
 const current=$('request').value.trim(), addition=b.dataset.feature;
 const existing=parseQuery(current).requirements, requested=parseQuery(addition).requirements;
 const alreadyIncluded=requested.length&&requested.every(feature=>existing.some(r=>r.id===feature.id&&r.wanted===feature.wanted));
 if(!alreadyIncluded)$('request').value=current?`${current}, ${addition}`:addition;
 $('matchBtn').click();
}));

$('edit-search').addEventListener('click',()=>{$('request').scrollIntoView({behavior:'instant',block:'center'});$('request').focus({preventScroll:true});});

