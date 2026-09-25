import {parseQuery,matchVehicle,labels} from './equipment-search.mjs';
const $=id=>document.getElementById(id),data=window.usedInventoryData,index=window.equipmentIndex;
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const cash=n=>n===null?'Call for price':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
const link=(label,url)=>{const a=el('a',label,'mini-btn');a.href=url;return a;};
$('sticker-coverage').textContent=`${index.verified} of ${index.total} vehicles have a readable, VIN-matched window sticker in this search. Equipment on the other ${index.unavailable} is unverified. Scanned ${new Date(index.checkedAt).toLocaleDateString()}.`;
let lastQuery=null,visible=12;
function render(){
 const out=$('matchResults');out.replaceChildren();const q=lastQuery;if(!q)return;
 const summary=el('div',undefined,'search-summary');
 const items=[...q.terms,...(q.condition?[q.condition]:[]),...(q.budget!==null?['Price up to '+cash(q.budget)]:[]),...(q.mileage!==null?['Mileage up to '+q.mileage.toLocaleString()]:[]),...q.requirements.map(r=>(r.wanted?'With ':'Without ')+labels[r.id])];
 summary.append(el('h3','Your search'),el('p',items.join(' · ')||'All vehicles at 8107 Research Blvd'));
 for(const warning of q.warnings)summary.append(el('p',warning,'stock-small'));out.append(summary);
 if(q.ambiguity||q.warnings.some(w=>/Conflicting|not both|More than one/.test(w))){out.append(el('p',q.ambiguity||'Please resolve the conflicting choices above, then search again.'));$('more-matches').hidden=true;return;}
 const matches=[],unknown=[];
 for(const vehicle of data.vehicles){const result=matchVehicle(vehicle,index.records[vehicle.vin],q);if(result.kind==='match')matches.push({vehicle,result});else if(result.kind==='unknown')unknown.push({vehicle,result});}
 out.append(el('p',`${matches.length} ${q.requirements.length?'sticker-confirmed equipment matches':'matches'}${q.requirements.length?'; '+unknown.length+' additional vehicles need equipment confirmation':''}. Prices and mileage come from saved dealership listings. Factory stickers do not confirm today’s availability or condition.`));
 const order=$('search-sort').value;
 const sort=(a,b)=>order==='mileage'?(a.vehicle.miles??Infinity)-(b.vehicle.miles??Infinity):order==='year'?b.vehicle.year-a.vehicle.year:(a.vehicle.price??Infinity)-(b.vehicle.price??Infinity);
 matches.sort(sort);unknown.sort(sort);
 const rows=[...matches,...($('show-unverified').checked?unknown:[])];
 if(!rows.length)out.append(el('p',unknown.length?'No exact equipment matches are confirmed. Select “Show vehicles needing equipment confirmation” or adjust your must-haves.':'No matches found. Try a broader model or budget, or ask us to help with your shortlist.'));
 for(const {vehicle:v,result} of rows.slice(0,visible)){
  const sticker=index.records[v.vin],card=el('article',undefined,'match');
  const photo=link('',v.sourceUrl);photo.className='stock-photo';const img=el('img');img.src=v.photoUrl;img.alt=v.title;img.width=400;img.height=300;img.loading='lazy';img.addEventListener('error',()=>photo.replaceChildren(el('span','View photos on the official listing')),{once:true});photo.append(img);card.append(photo);
  card.append(el('span',result.kind==='unknown'?'Equipment needs confirmation':q.requirements.length?'Requested equipment confirmed on sticker':sticker?.status==='verified'?'Window sticker available':'Equipment unverified','stock-badge'),el('h3',v.title),el('p',`${cash(v.price)} · ${v.miles===null?'Mileage unknown':v.miles.toLocaleString()+' miles'} · Stock ${v.stock}`));
  if(v.condition==='New')card.append(el('p','Advertised price may include conditional incentives. Ask us to confirm your price.','stock-small'));
  for(const check of result.checks)card.append(el('p',`${check.state==='match'?'✓':'?'} ${check.wanted?'':'Without '}${check.label}: ${check.state==='unknown'?'not confirmed by the sticker':check.evidence.join(' / ')}`,'equipment-check'));
  if(sticker?.status==='verified')card.append(link('Read original window sticker ↗',sticker.sourceUrl));
  const actions=el('div',undefined,'stock-actions');actions.append(link('Check availability',`contact.html?vehicle=${v.vin}`),link('Compare equipment',`compare.html?vehicle=${v.vin}`),link('Request a test drive',`contact.html?vehicle=${v.vin}&purpose=test-drive`));card.append(actions);out.append(card);
 }
 $('more-matches').hidden=rows.length<=visible;
 if(!rows.length){out.append(link('Ask us to help with this search','contact.html?request='+encodeURIComponent(q.original)));}
}
$('matchBtn').addEventListener('click',()=>{const value=$('request').value.trim();if(!value){lastQuery=null;$('more-matches').hidden=true;$('matchResults').textContent='Tell us a model, budget or equipment you want.';return;}lastQuery=parseQuery(value);try{sessionStorage.setItem('samRyanLastSearch',value);}catch{}visible=12;render();});
$('search-sort').addEventListener('change',()=>{visible=12;render();});
$('show-unverified').addEventListener('change',()=>{visible=12;render();});
$('more-matches').addEventListener('click',()=>{visible+=12;render();});
$('request').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('matchBtn').click();}});
let initial=new URLSearchParams(location.search).get('q');try{initial??=sessionStorage.getItem('samRyanLastSearch');}catch{}
if(initial){$('request').value=initial.slice(0,1000);$('matchBtn').click();}
