import {applyFactoryEquipment,equipmentStatus} from './factory-equipment.mjs?v=coverage4';
import {parseQuery,matchVehicle,definitions} from './equipment-search.mjs?v=coverage4';
const $=id=>document.getElementById(id),el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
function compareGroup(){
 const out=$('group-results');out.replaceChildren();const text=$('group-query').value.trim();if(!text){out.append(el('p','Enter a model and any must-have features.'));return;}
 const q=parseQuery(text);if(q.ambiguity||q.warnings.some(w=>/Conflicting|not both|More than one/.test(w))){out.append(el('p',q.ambiguity||q.warnings.join(' ')));return;}
 const selected=$('group-condition').value;if(q.condition&&selected!=='Both'&&q.condition!==selected){out.append(el('p',`Choose ${q.condition} above to match your request.`));return;}q.condition=selected==='Both'?null:selected;
 const base={...q,requirements:[]}, index=window.equipmentIndex;
 const rows=window.usedInventoryData.vehicles.filter(v=>v.locationId==='18393'&&matchVehicle(v,index.records[v.vin],base).kind==='match').map(v=>({v,s:applyFactoryEquipment(v,index.records[v.vin]),result:matchVehicle(v,index.records[v.vin],q)}));
 rows.sort((a,b)=>(a.result.kind==='match'?0:1)-(b.result.kind==='match'?0:1)||(a.v.price??Infinity)-(b.v.price??Infinity));
 const confirmed=rows.filter(r=>r.result.kind==='match').length;
 out.append(el('h3',q.requirements.length?`${confirmed} of ${rows.length} confirm your requested features`:`${rows.length} vehicles to explore`));
 if(!rows.length){out.append(el('p','No vehicles match that model, condition and budget in the saved inventory.'));return;}
 out.append(el('p','Choose two to five vehicles for a closer comparison. Unconfirmed equipment needs checking; it is not automatically absent.'));
 const chosen=new Set(),compare=el('button','Choose at least 2 vehicles');compare.type='button';compare.className='btn';compare.disabled=true;out.append(compare);
 compare.addEventListener('click',()=>{location.href='compare.html?vehicles='+encodeURIComponent([...chosen].join(','))+'&q='+encodeURIComponent(text)+'&condition='+encodeURIComponent(selected)});
 const grid=el('div');grid.className='group-card-grid';out.append(grid);
 const compareBottom=compare.cloneNode(true);compareBottom.addEventListener('click',()=>compare.click());out.append(compareBottom);
 const syncButtons=()=>{compareBottom.disabled=compare.disabled;compareBottom.textContent=compare.textContent;};
 let limit=12;const more=el('button','Show 12 more');more.type='button';more.className='btn ghost';out.append(more);
 function draw(){grid.replaceChildren();for(const {v,s,result} of rows.slice(0,limit)){
  const card=el('article');card.className='group-vehicle-card';if(v.photoUrl){const img=el('img');img.src=v.photoUrl;img.alt=v.title;img.loading='lazy';card.append(img)}
  card.append(el('h4',v.title),el('p',`Stock ${v.stock} · ${v.condition} · ${v.price==null?'Ask for price':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v.price)}`));
  if(q.requirements.length){card.append(el('strong',result.kind==='match'?'✓ Matches your requested features':result.kind==='excluded'?'Does not match every requested feature':'Equipment needs checking'));const ul=el('ul');for(const r of q.requirements){const f=s?.status==='verified'?s.features[r.id]:null;ul.append(el('li',`${definitions.find(d=>d[0]===r.id)?.[1]||r.id}: ${equipmentStatus(f)}`))}card.append(ul)}
  const label=el('label'),input=el('input');input.type='checkbox';input.checked=chosen.has(v.vin);input.addEventListener('change',()=>{if(input.checked&&chosen.size>=5){input.checked=false;compare.textContent='Five selected — compare or remove one';syncButtons();return;}input.checked?chosen.add(v.vin):chosen.delete(v.vin);compare.disabled=chosen.size<2;compare.textContent=chosen.size<2?'Choose at least 2 vehicles':`Compare ${chosen.size} selected vehicles →`;syncButtons();});label.append(input,document.createTextNode(' Add to comparison'));card.append(label);grid.append(card);
 }more.hidden=limit>=rows.length;}
 more.addEventListener('click',()=>{limit+=12;draw()});draw();
}
$('group-compare').addEventListener('click',compareGroup);$('group-query').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();compareGroup()}});


const savedGroup=new URLSearchParams(location.search);
if(savedGroup.has('q'))$('group-query').value=savedGroup.get('q');
if(['New','Used','Both'].includes(savedGroup.get('condition')))$('group-condition').value=savedGroup.get('condition');
