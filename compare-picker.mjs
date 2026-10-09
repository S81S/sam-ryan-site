import {parseQuery,matchVehicle} from './equipment-search.mjs';
export function findInventoryByIdentifier(vehicles,query) {
 const identifier=String(query||'').trim().toLowerCase().replace(/\s+/g,'');
 if(!identifier)return null;
 return vehicles.find(v=>!v.external&&v.status!=='not-observed'&&[v.stock,v.vin].some(value=>String(value||'').toLowerCase().replace(/\s+/g,'')===identifier))||null;
}
export function searchVehicles(vehicles,query,condition='New',records={}) {
 const text=query.trim().toLowerCase();
 if(text.length<2)return {matches:[],total:0};
 // A complete identifier names one vehicle, even when its condition differs
 // from the browsing filter. Pressing Enter uses the same identifier match.
 const identified=findInventoryByIdentifier(vehicles,query);
 if(identified)return {matches:[identified],total:1};
 const parsed=parseQuery(query);
 // Explicit “used” or “new” in the search takes precedence over the browsing filter.
 const eitherCondition=/\bnew\b/.test(text)&&/\b(?:used|pre[ -]owned)\b/.test(text);
 if(!parsed.condition&&!eitherCondition&&condition!=='Both')parsed.condition=condition;
 const matches=vehicles.filter(v=>!v.external&&v.status!=='not-observed'&&matchVehicle(v,records[v.vin],parsed).kind==='match')
  .sort((a,b)=>a.title.localeCompare(b.title)||(a.price??Infinity)-(b.price??Infinity));
 return {matches:matches.slice(0,6),total:matches.length};
}

export function installVehiclePickers(vehicles,document=globalThis.document) {
 const sides=['1','2','3','4','5'],$=id=>document.getElementById(id);
 const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
 const bar=el('section');bar.className='compare-selection-bar';bar.setAttribute('aria-label','Your selected vehicles');
 const heading=el('h2'),chips=el('div'),jump=el('button','See equipment comparison ↓');
 heading.setAttribute('aria-live','polite');chips.className='compare-selection-chips';jump.type='button';jump.className='btn';
 bar.append(heading,chips,jump);document.querySelector('.sticker-grid').before(bar);
 jump.addEventListener('click',()=>{const results=$('automatic-equipment');results.setAttribute('tabindex','-1');results.scrollIntoView({behavior:globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});results.focus({preventScroll:true});});
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
  const startingCondition=new URLSearchParams(globalThis.location?.search||'').get('condition');
  condition.value=['New','Used','Both'].includes(startingCondition)?startingCondition:'New';box.append(label,condition);selection.after(box);box.append(lookup);
  lookup.querySelector('label').textContent=`Find vehicle ${side}`;
  input.type='search';input.placeholder='Try Ram 1500 with Harman Kardon under $60k';input.setAttribute('aria-describedby','picker-count-'+side);input.setAttribute('enterkeyhint','search');input.setAttribute('autocapitalize','none');input.spellcheck=false;
  const count=el('p');count.id='picker-count-'+side;count.className='picker-count';count.setAttribute('role','status');
  const results=el('ul');results.className='picker-results';results.id='picker-results-'+side;input.setAttribute('aria-controls',results.id);results.setAttribute('aria-label',`Matches for vehicle ${side}`);
  input.closest('.lookup-input-row').after(count,results);
  // Change vehicle reveals this picker again; keep keyboard users at its search field.
  $('clear-'+side).addEventListener('click',()=>input.focus());
  let choosing=false,previous=selection.value,searchTimer;
  function render(){
   results.replaceChildren();
   const query=input.value.trim(),selected=vehicles.find(v=>v.vin===selection.value),{matches,total}=searchVehicles(vehicles,query,condition.value,globalThis.window?.equipmentIndex?.records||{});
   count.textContent=selected&&!query?`✓ Selected: ${selected.title} · ${selected.stock?'Stock '+selected.stock:'VIN '+selected.vin}`:query.length<2?'Search by model, features, color, budget, stock number or VIN, just like Find Your Car.':total?`Showing ${matches.length} of ${total} matches.${total>6?' Add features, a budget, model or trim to narrow your search.':''}`:'No inventory matches. Try another term or condition. For your own vehicle, enter its complete VIN and press Enter or your keyboard’s Search key.';
   for(const v of matches){
    const chosen=sides.some(id=>$('choose-'+id).value===v.vin),row=el('li'),details=el('div');
    details.append(el('strong',v.title),el('small',`${v.condition} · ${money(v.price)} · ${v.stock?'Stock '+v.stock:'VIN …'+v.vin.slice(-6)}`));
    const choose=el('button',chosen?'Selected':'Choose');choose.type='button';choose.className='btn ghost';choose.disabled=chosen;choose.setAttribute('aria-label',`${chosen?'Already selected':'Choose'} ${v.title}, ${v.stock||v.vin}`);
    choose.addEventListener('click',()=>{
     if(sides.some(id=>$('choose-'+id).value===v.vin))return;
     choosing=true;selection.value=v.vin;input.value='';if(['New','Used'].includes(v.condition))condition.value=v.condition;$('lookup-status-'+side).textContent='';selection.dispatchEvent(new Event('change'));choosing=false;
     render();$('clear-'+side).focus();
    });
    row.append(details,choose);results.append(row);
   }
  }
  input.addEventListener('input',()=>{$('lookup-status-'+side).textContent='';clearTimeout(searchTimer);searchTimer=setTimeout(render,180);});condition.addEventListener('change',()=>{clearTimeout(searchTimer);render();});
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
