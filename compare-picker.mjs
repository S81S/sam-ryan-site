export function searchVehicles(vehicles,query,condition='New') {
 const text=query.trim().toLowerCase(),terms=text.split(/\s+/).filter(Boolean),exact=text.replace(/\s/g,'');
 if(text.length<2)return {matches:[],total:0};
 const rank=v=>[v.stock,v.vin].some(value=>String(value||'').toLowerCase().replace(/\s/g,'')===exact)?0:1;
 const matches=vehicles.filter(v=>v.locationId==='18393'&&!v.external&&v.status!=='not-observed'&&(condition==='Both'||v.condition===condition)&&terms.every(term=>`${v.title} ${v.stock||''} ${v.vin}`.toLowerCase().includes(term)))
  .sort((a,b)=>rank(a)-rank(b)||a.title.localeCompare(b.title)||(a.price??Infinity)-(b.price??Infinity));
 return {matches:matches.slice(0,6),total:matches.length};
}

export function installVehiclePickers(vehicles,document=globalThis.document) {
 const sides=['1','2','3','4','5'],$=id=>document.getElementById(id);
 const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
 const bar=el('section');bar.className='compare-selection-bar';bar.setAttribute('aria-label','Your selected vehicles');
 const heading=el('h2'),chips=el('div'),jump=el('button','See equipment comparison ↓');
 heading.setAttribute('aria-live','polite');chips.className='compare-selection-chips';jump.type='button';jump.className='btn';
 bar.append(heading,chips,jump);document.querySelector('.sticker-grid').before(bar);
 jump.addEventListener('click',()=>{const results=$('automatic-equipment');results.setAttribute('tabindex','-1');results.scrollIntoView({behavior:'smooth',block:'start'});results.focus({preventScroll:true});});
 function updateBar(){
  const selected=sides.map(side=>({side,vehicle:vehicles.find(v=>v.vin===$('choose-'+side).value)})).filter(item=>item.vehicle);
  heading.textContent=selected.length<2?`${selected.length} of 2 vehicles selected to start`:`${selected.length} vehicles ready to compare`;
  jump.disabled=selected.length<2;chips.replaceChildren();
  for(const {side,vehicle} of selected){const chip=el('div'),name=el('span',`${side}. ${vehicle.title} · ${vehicle.stock||vehicle.vin}`),remove=el('button','Remove');
   remove.type='button';remove.setAttribute('aria-label',`Remove vehicle ${side}: ${vehicle.stock||vehicle.vin}`);
   remove.addEventListener('click',()=>{$('clear-'+side).click();$('lookup-'+side).focus();});chip.append(name,remove);chips.append(chip);
  }
 }
 document.addEventListener('compare:changed',updateBar);
 const money=value=>Number.isFinite(value)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value):'Ask for price';
 for(const side of sides){
  const selection=$('choose-'+side),input=$('lookup-'+side),lookup=input.closest('.lookup-row');
  selection.hidden=true;selection.tabIndex=-1;selection.setAttribute('aria-hidden','true');
  const box=el('div');box.className='comparison-picker';
  const label=el('label','Vehicle condition');label.htmlFor='browse-condition-'+side;
  const condition=el('select');condition.id=label.htmlFor;
  for(const [value,text] of [['New','New vehicles'],['Used','Used vehicles'],['Both','New and used vehicles']]){const option=el('option',text);option.value=value;condition.append(option);}
  condition.value='New';box.append(label,condition);selection.after(box);box.append(lookup);
  lookup.querySelector('label').textContent=`Find vehicle ${side}`;
  input.type='search';input.placeholder='Model, trim, stock number or VIN';input.setAttribute('aria-describedby','picker-count-'+side);
  const count=el('p');count.id='picker-count-'+side;count.className='picker-count';count.setAttribute('role','status');
  const results=el('ul');results.className='picker-results';results.setAttribute('aria-label',`Matches for vehicle ${side}`);
  input.closest('.lookup-input-row').after(count,results);
  let choosing=false,previous=selection.value;
  function render(){
   results.replaceChildren();
   const query=input.value.trim(),{matches,total}=searchVehicles(vehicles,query,condition.value);
   count.textContent=query.length<2?'Type at least two characters to find a vehicle.':total?`Showing ${matches.length} of ${total} matches.${total>6?' Add a model, trim or stock number to narrow your search.':''}`:'No inventory matches. Try another term or condition. For your own vehicle, enter its complete VIN and press Find.';
   for(const v of matches){
    const chosen=sides.some(id=>$('choose-'+id).value===v.vin),row=el('li'),details=el('div');
    details.append(el('strong',v.title),el('small',`${v.condition} · ${money(v.price)} · ${v.stock?'Stock '+v.stock:'VIN …'+v.vin.slice(-6)}`));
    const choose=el('button',chosen?'Selected':'Choose');choose.type='button';choose.className='btn ghost';choose.disabled=chosen;choose.setAttribute('aria-label',`${chosen?'Already selected':'Choose'} ${v.title}, ${v.stock||v.vin}`);
    choose.addEventListener('click',()=>{
     if(sides.some(id=>$('choose-'+id).value===v.vin))return;
     choosing=true;selection.value=v.vin;input.value='';$('lookup-status-'+side).textContent='';selection.dispatchEvent(new Event('change'));choosing=false;
     render();$('clear-'+side).focus();
    });
    row.append(details,choose);results.append(row);
   }
  }
  input.addEventListener('input',()=>{$('lookup-status-'+side).textContent='';render();});condition.addEventListener('change',render);
  function sync(){
   const v=vehicles.find(v=>v.vin===selection.value);
   if(selection.value!==previous){previous=selection.value;if(!choosing){input.value='';if(v&&['New','Used'].includes(v.condition))condition.value=v.condition;}}
   render();
  }
  const current=vehicles.find(v=>v.vin===selection.value);if(current&&['New','Used'].includes(current.condition))condition.value=current.condition;
  document.addEventListener('compare:changed',sync);render();
 }
 updateBar();
}
