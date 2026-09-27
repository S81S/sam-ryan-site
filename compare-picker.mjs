export function installVehiclePickers(vehicles) {
  const sides=['1','2','3','4','5'];
  const bar=document.createElement('section');bar.className='compare-selection-bar';bar.setAttribute('aria-label','Your selected vehicles');
  const heading=document.createElement('h2'),chips=document.createElement('div'),jump=document.createElement('button');
  heading.setAttribute('aria-live','polite');chips.className='compare-selection-chips';jump.type='button';jump.className='btn';jump.textContent='See equipment comparison ↓';
  bar.append(heading,chips,jump);document.querySelector('.sticker-grid').before(bar);
  jump.addEventListener('click',()=>{const results=document.getElementById('automatic-equipment');results.setAttribute('tabindex','-1');results.scrollIntoView({behavior:'smooth',block:'start'});results.focus({preventScroll:true});});
  function updateBar(){
    const selected=sides.map(side=>({side,vehicle:vehicles.find(v=>v.vin===document.getElementById('choose-'+side).value)})).filter(item=>item.vehicle);
    heading.textContent=selected.length<2?`${selected.length} of 2 vehicles selected to start`:`${selected.length} vehicles ready to compare`;
    jump.disabled=selected.length<2;chips.replaceChildren();
    for(const {side,vehicle} of selected){const chip=document.createElement('div'),name=document.createElement('span'),remove=document.createElement('button');
      name.textContent=`${side}. ${vehicle.title} · ${vehicle.stock||vehicle.vin}`;remove.type='button';remove.textContent='Remove';remove.setAttribute('aria-label',`Remove vehicle ${side}: ${vehicle.stock||vehicle.vin}`);
      remove.addEventListener('click',()=>{document.getElementById('clear-'+side).click();document.getElementById('browse-vehicle-'+side).focus();});chip.append(name,remove);chips.append(chip);
    }
  }
  document.addEventListener('compare:changed',updateBar);
  const money=value=>value==null?'Ask for price':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
  for(const side of ['1','2','3','4','5']) {
    const selection=document.getElementById('choose-'+side);
    const box=document.createElement('div');box.className='comparison-picker';
    box.innerHTML=`<label for="browse-condition-${side}">Browse inventory</label><select id="browse-condition-${side}"><option value="New">New vehicles</option><option value="Used">Used vehicles</option><option value="Both">New and used vehicles</option></select><label for="browse-filter-${side}">Narrow the list (optional)</label><input id="browse-filter-${side}" type="search" placeholder="Model, trim or stock number" autocomplete="off"><label for="browse-vehicle-${side}">Choose vehicle ${side}</label><select id="browse-vehicle-${side}"></select><p class="picker-count" role="status"></p>`;
    selection.after(box);
    const condition=box.querySelector('#browse-condition-'+side),filter=box.querySelector('input'),picker=box.querySelector('#browse-vehicle-'+side),count=box.querySelector('.picker-count');
    const selectedVehicle=()=>vehicles.find(v=>v.vin===selection.value);
    function render() {
      const terms=filter.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
      const matches=vehicles.filter(v=>v.locationId==='18393'&&!v.external&&(condition.value==='Both'||v.condition===condition.value)&&terms.every(t=>`${v.title} ${v.stock} ${v.vin}`.toLowerCase().includes(t)))
        .sort((a,b)=>a.title.localeCompare(b.title)||(a.price??Infinity)-(b.price??Infinity));
      picker.replaceChildren(new Option(matches.length?'Select a vehicle…':'No vehicles match this filter',''));
      const current=selectedVehicle();
      if(current&&!matches.some(v=>v.vin===current.vin))picker.add(new Option(`Selected: ${current.title} — ${current.stock||current.vin}`,current.vin));
      for(const v of matches){const alreadySelected=sides.some(id=>id!==side&&document.getElementById('choose-'+id).value===v.vin);const option=new Option(`${v.title} — ${money(v.price)} — Stock ${v.stock||'not listed'}${alreadySelected?' — Already selected':''}`,v.vin);option.disabled=alreadySelected;picker.add(option);}
      picker.value=selection.value;
      count.textContent=`${matches.length} vehicle${matches.length===1?'':'s'} to choose from.`+(current&&!matches.some(v=>v.vin===current.vin)?' Your selected vehicle is kept until you replace or clear it.':'');
    }
    condition.addEventListener('change',render);filter.addEventListener('input',render);
    let fromPicker=false;
    picker.addEventListener('change',()=>{if(!picker.value){render();return;}selection.value=picker.value;document.getElementById('lookup-'+side).value='';document.getElementById('lookup-status-'+side).textContent='';fromPicker=true;selection.dispatchEvent(new Event('change'));fromPicker=false;});
    let previous=selection.value;
    const current=selectedVehicle();if(current&&['New','Used'].includes(current.condition))condition.value=current.condition;
    document.addEventListener('compare:changed',()=>{
      if(selection.value!==previous){previous=selection.value;const v=selectedVehicle();if(!fromPicker){if(v&&['New','Used'].includes(v.condition))condition.value=v.condition;filter.value='';}}
      render();
    });
    render();
  }
  updateBar();
}
