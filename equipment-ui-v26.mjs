import {parseQuery,matchVehicle,labels} from './equipment-search.mjs?v=23-tow26';
const $=id=>document.getElementById(id),data=window.usedInventoryData,index=window.equipmentIndex;
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const cash=n=>n===null?'Call for price':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
const link=(label,url)=>{const a=el('a',label,'mini-btn');a.href=url;return a;};
$('sticker-coverage').textContent=`${index.verified} of ${index.total} vehicles have a readable, VIN-matched window sticker in this search. Equipment on the other ${index.unavailable} is unverified. Scanned ${new Date(index.checkedAt).toLocaleDateString()}.`;
const pageSize=()=>Number($('results-per-page').value);
// --- Compare selection: nothing is preloaded. Shoppers opt in per vehicle with a checkbox,
// then go to Compare with only the vehicles they picked (or they can enter a stock #/VIN there directly).
let compareVins=[];
try{compareVins=JSON.parse(sessionStorage.getItem('samRyanCompareVins')||'[]')}catch{}
const compareBar=el('div');
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
 compareGo.href='compare.html?vehicles='+compareVins.map(encodeURIComponent).join(',');
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


let lastQuery=null,visible=pageSize(),restoringSearch=true;
function revealResults(){if(!restoringSearch){$('search-results').scrollIntoView({behavior:'instant',block:'start'});$('search-results').focus({preventScroll:true});}}
function render(){
 const out=$('matchResults');out.replaceChildren();$('visible-count').textContent='';const q=lastQuery;if(!q)return;
 const summary=el('div',undefined,'search-summary');
 const items=[...(q.bodyType?[q.bodyType==='truck'?'Pickup trucks':q.bodyType==='suv'?'SUVs':'Pickup trucks or SUVs']:[]),...q.terms,...(q.condition?[q.condition]:[]),...(q.budget!==null?['Price up to '+cash(q.budget)]:[]),...(q.mileage!==null?['Mileage up to '+q.mileage.toLocaleString()]:[]),...q.requirements.map(r=>(r.wanted?'With ':'Without ')+labels[r.id])];
 summary.append(el('h3','Your search'),el('p',items.join(' · ')||'All vehicles at 8107 Research Blvd'));
 for(const warning of q.warnings)summary.append(el('p',warning,'stock-small'));out.append(summary);
 if(q.ambiguity||q.warnings.some(w=>/Conflicting|not both|More than one/.test(w))){out.append(el('p',q.ambiguity||'Please resolve the conflicting choices above, then search again.'));$('more-matches').hidden=true;return;}
 const matches=[],unknown=[];
 for(const vehicle of data.vehicles){const result=matchVehicle(vehicle,index.records[vehicle.vin],q);if(result.kind==='match')matches.push({vehicle,result});else if(result.kind==='unknown')unknown.push({vehicle,result});}
 out.append(el('p',`${matches.length} ${q.requirements.length?(q.requirements.some(r=>r.id==='flatTow')?'matches supported by stickers and towing manuals':'sticker-backed matches'):'matches'}${q.requirements.length&&unknown.length?' · '+unknown.length+' need equipment confirmation':''}`,'result-count'));
 const order=$('search-sort').value;
 const sort=(a,b)=>order==='mileage'?(a.vehicle.miles??Infinity)-(b.vehicle.miles??Infinity):order==='year'?b.vehicle.year-a.vehicle.year:(a.vehicle.price??Infinity)-(b.vehicle.price??Infinity);
 matches.sort(sort);unknown.sort(sort);
 const rows=[...matches,...($('show-unverified').checked?unknown:[])];
 if(!rows.length)out.append(el('p',unknown.length?'No exact equipment matches are confirmed. Select “Show vehicles needing equipment confirmation” or adjust your must-haves.':'No matches found. Try a broader model or budget, or ask us to help with your shortlist.'));
 for(const {vehicle:v,result} of rows.slice(0,visible)){
  const sticker=index.records[v.vin],card=el('article',undefined,'match');
  const photo=link('',v.sourceUrl);photo.className='stock-photo';const img=el('img');img.src=v.photoUrl;img.alt=v.title;img.width=400;img.height=300;img.loading='lazy';img.addEventListener('error',()=>photo.replaceChildren(el('span','View photos on the official listing')),{once:true});photo.append(img);card.append(photo);
  card.append(el('span',result.kind==='unknown'?'Equipment needs confirmation':result.checks.some(c=>c.state==='not-listed')?'Sunroof not listed on sticker':q.requirements.some(r=>r.id==='flatTow')?'Sticker + towing manual checked':q.requirements.length?'Requested equipment confirmed on sticker':sticker?.status==='verified'?'Window sticker available':'Equipment unverified','stock-badge'),el('h3',v.title),el('p',cash(v.price),'vehicle-price'),el('p',`${v.condition||''} · ${v.miles==null?'Mileage unknown':v.miles.toLocaleString()+' miles'}${v.stock?' · Stock '+v.stock:''}`,'vehicle-meta'));
  if(v.condition==='New')card.append(el('p','Advertised price may include conditional incentives. Ask us to confirm your price.','stock-small'));
  for(const check of result.checks)card.append(el('p',`${check.state==='match'?'✓':check.state==='not-listed'?'—':'?'} ${check.wanted?'':'Without '}${check.label}: ${check.state==='unknown'?'not confirmed by the sticker':check.evidence.join(' / ')}`,'equipment-check'));
  for(const check of result.checks)if(check.sourceUrl)card.append(link('Read factory flat-towing instructions ↗',check.sourceUrl));
  if(sticker?.status==='verified')card.append(link('Read original window sticker ↗',sticker.sourceUrl));
  const actions=el('div',undefined,'stock-actions');actions.append(link('Check availability',`contact.html?vehicle=${v.vin}&request=${encodeURIComponent(q.original)}`),link('Compare equipment',`compare.html?vehicle=${v.vin}`),link('Request a test drive',`contact.html?vehicle=${v.vin}&purpose=test-drive&request=${encodeURIComponent(q.original)}`));const compareLabel=el('label','Add to compare');const cb=document.createElement('input');cb.type='checkbox';cb.dataset.compareVin=v.vin;cb.checked=compareVins.includes(v.vin);cb.addEventListener('change',()=>toggleCompare(v.vin,cb.checked));compareLabel.prepend(cb);actions.append(compareLabel);card.append(actions);out.append(card);
 }
 $('more-matches').hidden=rows.length<=visible;
 $('more-matches').textContent=`Show ${Math.min(pageSize(),Math.max(0,rows.length-visible))} more vehicles`;
 $('visible-count').textContent=rows.length?`Showing ${Math.min(visible,rows.length)} of ${rows.length} vehicles`:'';
 if(!rows.length){out.append(link('Ask us to help with this search','contact.html?request='+encodeURIComponent(q.original)));}
}
$('matchBtn').addEventListener('click',()=>{const value=$('request').value.trim();if(!value){lastQuery=null;$('more-matches').hidden=true;$('matchResults').textContent='Tell us a model, budget or equipment you want.';return;}lastQuery=parseQuery(value);const selectedCondition=$('search-condition').value;if(lastQuery.condition&&selectedCondition!=='Both'&&lastQuery.condition!==selectedCondition){lastQuery.ambiguity=`Your request says ${lastQuery.condition.toLowerCase()}. Choose ${lastQuery.condition} above, or edit your request.`;}lastQuery.condition=selectedCondition==='Both'?null:selectedCondition;const searchUrl=new URL(location.href);searchUrl.searchParams.set('q',value);searchUrl.searchParams.set('condition',selectedCondition);history.replaceState(null,'',searchUrl);try{sessionStorage.setItem('samRyanLastSearch',value);}catch{}visible=pageSize();render();revealResults();});
$('results-per-page').addEventListener('change',()=>{visible=pageSize();render();});
$('search-sort').addEventListener('change',()=>{visible=pageSize();render();});
$('show-unverified').addEventListener('change',()=>{visible=pageSize();render();});
$('more-matches').addEventListener('click',()=>{visible+=pageSize();render();});
$('request').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('matchBtn').click();}});
const savedCondition=new URLSearchParams(location.search).get('condition');if(['New','Used','Both'].includes(savedCondition))$('search-condition').value=savedCondition;
$('search-condition').addEventListener('change',()=>{if($('request').value.trim())$('matchBtn').click();});
let initial=new URLSearchParams(location.search).get('q');try{initial??=sessionStorage.getItem('samRyanLastSearch');}catch{}
if(initial){$('request').value=initial.slice(0,1000);$('matchBtn').click();}

restoringSearch=false;
document.querySelectorAll('[data-feature]').forEach(b=>b.addEventListener('click',()=>{
 const current=$('request').value.trim(), addition=b.dataset.feature;
 const existing=parseQuery(current).requirements, requested=parseQuery(addition).requirements;
 const alreadyIncluded=requested.length&&requested.every(feature=>existing.some(r=>r.id===feature.id&&r.wanted===feature.wanted));
 if(!alreadyIncluded)$('request').value=current?`${current}, ${addition}`:addition;
 $('matchBtn').click();
}));

$('edit-search').addEventListener('click',()=>{$('request').scrollIntoView({behavior:'instant',block:'center'});$('request').focus({preventScroll:true});});
