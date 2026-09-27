export function installVehiclePickers(vehicles) {
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
      for(const v of matches)picker.add(new Option(`${v.title} — ${money(v.price)} — Stock ${v.stock||'not listed'}`,v.vin));
      picker.value=selection.value;
      count.textContent=`${matches.length} vehicle${matches.length===1?'':'s'} to choose from.`+(current&&!matches.some(v=>v.vin===current.vin)?' Your selected vehicle is kept until you replace or clear it.':'');
    }
    condition.addEventListener('change',render);filter.addEventListener('input',render);
    let fromPicker=false;
    picker.addEventListener('change',()=>{if(!picker.value){render();return;}selection.value=picker.value;document.getElementById('lookup-'+side).value='';document.getElementById('lookup-status-'+side).textContent='';fromPicker=true;selection.dispatchEvent(new Event('change'));fromPicker=false;});
    let previous=selection.value;
    const current=selectedVehicle();if(current&&['New','Used'].includes(current.condition))condition.value=current.condition;
    document.addEventListener('compare:changed',()=>{
      if(selection.value!==previous){previous=selection.value;const v=selectedVehicle();if(!fromPicker){if(v&&['New','Used'].includes(v.condition))condition.value=v.condition;filter.value='';}render();}
    });
    render();
  }
}
