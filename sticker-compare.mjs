import {installVehiclePickers} from './compare-picker.mjs?v=next3';
const readSticker=async(...args)=>(await import('./sticker-reader.mjs?v=clean-shopping1')).readSticker(...args);
import {shoppingContext} from './shopping-context.mjs?v=shopping1';
import {openVehiclePreview} from './vehicle-preview.mjs?v=next3';
const vehicles=window.usedInventoryData.vehicles.filter(v=>v.locationId==='18393');
const index=window.equipmentIndex;
const validVIN=s=>/^[A-HJ-NPR-Z0-9]{17}$/.test(s);
const SIDES=['1','2','3','4','5'];
const $=id=>document.getElementById(id), urls={};
const cash=n=>n===null?'Not listed':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
function vehicle(side){return vehicles.find(v=>v.vin===$('choose-'+side).value)}
const previousSelection={};
function reset(side){
 const chosen=$('choose-'+side).value;
 if(chosen&&SIDES.some(id=>id!==side&&$('choose-'+id).value===chosen)){$('choose-'+side).value=previousSelection[side]||'';$('lookup-status-'+side).textContent='That vehicle is already selected. Choose a different vehicle to compare.';document.dispatchEvent(new CustomEvent('compare:changed'));return false;}
 previousSelection[side]=chosen;
 const v=vehicle(side);
 const photo=$('vehicle-photo-'+side);$('clear-'+side).hidden=!v;
 if(!v){photo.hidden=true;photo.removeAttribute('src');$('summary-'+side).textContent='';$('listing-'+side).hidden=true;$('listing-'+side).removeAttribute('href');$('sticker-'+side).hidden=true;$('sticker-'+side).removeAttribute('href');$('lookup-note-'+side).textContent='';if(urls[side]){URL.revokeObjectURL(urls[side]);delete urls[side]}$('pdf-'+side).removeAttribute('src');$('pdf-'+side).hidden=true;$('file-'+side).value='';$('file-status-'+side).textContent='No local PDF selected.';$('pdf-link-'+side).hidden=true;$('pdf-link-'+side).removeAttribute('href');document.dispatchEvent(new CustomEvent('compare:changed'));return}
 photo.hidden=!v.photoUrl;photo.alt=v.title+' — stock '+v.stock;photo.onerror=()=>{photo.hidden=true};if(v.photoUrl)photo.src=v.photoUrl;else photo.removeAttribute('src');
 if(urls[side]){URL.revokeObjectURL(urls[side]);delete urls[side]}
 $('pdf-'+side).removeAttribute('src');$('pdf-'+side).hidden=true;$('file-'+side).value='';$('file-status-'+side).textContent='No local PDF selected.';
 $('summary-'+side).textContent=`${v.title} · ${cash(v.price)} · ${v.miles===null?'Mileage unknown':v.miles.toLocaleString()+' miles'} · Stock ${v.stock} · VIN ${v.vin}`;
 $('listing-'+side).hidden=!!v.external;$('listing-'+side).href='contact.html?vehicle='+encodeURIComponent(v.vin);$('listing-'+side).textContent='View photos & vehicle details';$('listing-'+side).removeAttribute('target');$('listing-'+side).onclick=e=>{e.preventDefault();openVehiclePreview(v,shoppingContext().q)};
 $('sticker-'+side).hidden=!v.carfaxUrl&&!v.stickerUrl;$('sticker-'+side).href=v.stickerUrl||v.carfaxUrl||v.sourceUrl;$('sticker-'+side).textContent=v.stickerUrl?'Open original window sticker ↗':'Open CARFAX → Original Window Sticker ↗';
 $('lookup-note-'+side).textContent=v.stickerUrl?'Open the original document to check its VIN and equipment.':v.carfaxUrl?'Open the Covert-provided CARFAX report, then choose Original Window Sticker. A direct sticker link has not yet been checked for this vehicle.':'No CARFAX/sticker link captured for this vehicle. Open its official listing to check,.';
 $('pdf-link-'+side).hidden=true;$('pdf-link-'+side).removeAttribute('href');
 document.dispatchEvent(new CustomEvent('compare:changed'));
}
for(const side of SIDES){
 const opts=document.createDocumentFragment();
 for(const v of vehicles){const o=document.createElement('option');o.value=v.vin;o.textContent=`${v.title} — ${v.stock}`;opts.append(o)}
 $('choose-'+side).append(opts);
 $('choose-'+side).value='';
 $('choose-'+side).addEventListener('change',()=>reset(side));
 $('clear-'+side)?.addEventListener('click',()=>{$('choose-'+side).value='';$('lookup-'+side).value='';$('lookup-status-'+side).textContent='';reset(side)});
 $('file-'+side).addEventListener('change',async e=>{
  const f=e.target.files[0];if(!f)return;
  const v=vehicle(side);if(!v)return;
  const selectedVIN=v.vin;$('file-status-'+side).textContent='Reading your PDF on this device…';
  try{
   if(f.size>20*1024*1024)throw new Error('Choose a PDF smaller than 20 MB');
   const signature=new TextDecoder().decode(await f.slice(0,5).arrayBuffer());
   if(vehicle(side)?.vin!==selectedVIN||e.target.files[0]!==f)return;
   if(signature!=='%PDF-')throw new Error('This is not a PDF file');
   const parsed=await readSticker(new Uint8Array(await f.arrayBuffer()),selectedVIN);
   if(vehicle(side)?.vin!==selectedVIN||e.target.files[0]!==f)return;
   if(urls[side])URL.revokeObjectURL(urls[side]);
   urls[side]=URL.createObjectURL(f);
   $('pdf-'+side).src=urls[side];$('pdf-'+side).hidden=false;
   $('pdf-link-'+side).href=urls[side];$('pdf-link-'+side).hidden=false;
   $('file-status-'+side).textContent=parsed.analysis?'VIN matched. Equipment read from your supplied PDF; confirm it is an unaltered original sticker.':'VIN matched. This document layout needs review before equipment can be compared automatically.';
   if(v.external&&parsed.analysis?.identityLines?.length){
    const name=parsed.analysis.identityLines.join(' ').split(/EXTERIOR:/i)[0].trim();
    if(name){v.title=name;$('summary-'+side).textContent=name+' · VIN '+selectedVIN;}
   }
   if(parsed.analysis&&index.records[selectedVIN]?.status!=='verified'){index.records[selectedVIN]={...parsed.analysis,status:'verified',sourceType:'customer-upload',checkedAt:new Date().toISOString()};document.dispatchEvent(new CustomEvent('compare:changed'));}

  }catch(err){if(vehicle(side)?.vin===selectedVIN&&e.target.files[0]===f)$('file-status-'+side).textContent=err.message}
 });
 reset(side);
}
// Preselect vehicles only from an explicit link — a single ?vehicle=VIN (e.g. from the inventory page)
// or several via ?vehicles=VIN1,VIN2,... (e.g. "Add to compare" on Find My Car). Nothing is preloaded
// otherwise; shoppers pick from the dropdowns or enter a stock number/VIN below.
const params=new URLSearchParams(location.search);
const multi=(params.get('vehicles')||'').split(',').map(s=>s.trim()).filter(Boolean);
const requested=multi.length?multi:(params.get('vehicle')?[params.get('vehicle')]:[]);
requested.forEach((vin,i)=>{
 const side=SIDES[i];if(!side)return;
 if(vehicles.some(v=>v.vin===vin)){$('choose-'+side).value=vin;reset(side);if(index.records[vin]?.status!=='verified')addExternal(vin,side)}
 else if(validVIN(vin))addExternal(vin,side);
});

function findByStockOrVin(q){const norm=q.trim().toUpperCase().replace(/\s+/g,'');if(!norm)return null;return vehicles.find(v=>(v.stock||'').toUpperCase()===norm)||vehicles.find(v=>(v.vin||'').toUpperCase()===norm)}
for(const side of SIDES){
 const input=$('lookup-'+side),status=$('lookup-status-'+side),go=()=>{
  const q=input.value;status.className='lookup-status';
  if(!q.trim()){status.textContent='Type a model, trim, stock number or VIN.';status.classList.add('is-error');return}
  const match=findByStockOrVin(q);
  if(!match&&validVIN(q.trim().toUpperCase())){addExternal(q.trim().toUpperCase(),side);return;}
  if(!match){status.textContent='Choose a matching vehicle below, or narrow your search. To add your own vehicle, enter its complete 17-character VIN.';return}
  $('choose-'+side).value=match.vin;$('choose-'+side).dispatchEvent(new Event('change'));
  if(vehicle(side)?.vin!==match.vin)return;
  status.textContent=`Matched: ${match.title} — Stock ${match.stock} — VIN ${match.vin}.`;status.classList.add('is-ok');
  if(index.records[match.vin]?.status!=='verified')addExternal(match.vin,side);
 };
 $('lookup-go-'+side).addEventListener('click',go);
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();go()}});
}
window.addEventListener('beforeunload',()=>Object.values(urls).forEach(URL.revokeObjectURL));
export {SIDES,vehicle};

// Keep the starting view compact; reveal more slots only when requested.
const addSlot=document.createElement('button');addSlot.type='button';addSlot.className='btn ghost';addSlot.textContent='+ Add another vehicle';
document.querySelector('.sticker-grid').after(addSlot);
const panels=SIDES.map(side=>$('choose-'+side).closest('.sticker-side'));
panels.forEach((p,i)=>{p.hidden=i>1&&!vehicle(SIDES[i])});
addSlot.addEventListener('click',()=>{const next=panels.find(p=>p.hidden);if(next)next.hidden=false;addSlot.hidden=!panels.some(p=>p.hidden)});

function addExternal(vin,side){
 if(SIDES.some(id=>id!==side&&$('choose-'+id).value===vin)){$('lookup-status-'+side).textContent='That VIN is already selected. Choose another vehicle.';return;}
 let v=vehicles.find(v=>v.vin===vin);
 if(!v){v={vin,title:'Your vehicle',stock:'',price:null,miles:null,external:true,condition:'Used'};vehicles.push(v);window.usedInventoryData.vehicles.push(v);for(const id of SIDES){const o=document.createElement('option');o.value=vin;o.textContent='Your vehicle — '+vin;$('choose-'+id).append(o)}}
 $('choose-'+side).value=vin;reset(side);$('lookup-status-'+side).textContent='Vehicle added. Open a sticker PDF below, or check the original-sticker service.';
 const b=document.createElement('button');b.type='button';b.className='btn ghost';b.textContent='Look for original sticker';
 const disclosure=document.createElement('p');disclosure.textContent='This lookup sends the VIN to WindowSticker.org. Availability varies by manufacturer and model year. Your PDF uploads stay on your device.';
 $('lookup-status-'+side).append(disclosure,b);
 b.addEventListener('click',async()=>{
  b.disabled=true;b.textContent='Checking…';
  try{const response=await fetch('https://windowsticker.org/api/v1/vin/'+vin,{signal:AbortSignal.timeout(25000)});if(!response.ok)throw Error('Sticker service is unavailable. Try your original PDF instead.');const info=await response.json();
   if(vehicle(side)?.vin!==vin)return;
   if(info.vin!==vin||!info.ok)throw Error('The service did not confirm this VIN.');
   if(info.windowSticker?.available!==true)throw Error('No original sticker returned for this VIN. You can still open your own PDF below.');
   const url='https://windowsticker.org/api/sticker/'+vin;
   v.title=[info.vehicle?.year,info.vehicle?.make,info.vehicle?.model,info.vehicle?.trim].filter(Boolean).join(' ')||'Your vehicle';v.stickerUrl=url;reset(side);
   $('lookup-status-'+side).textContent='Original sticker found. Checking its VIN and reading equipment…';
   try{
    const pdfResponse=await fetch('/api/original-sticker?vin='+vin,{signal:AbortSignal.timeout(30000)});
    if(!pdfResponse.ok)throw Error('The PDF could not be read automatically.');
    const pdfBytes=new Uint8Array(await pdfResponse.arrayBuffer());
    const parsed=await readSticker(pdfBytes.slice(),vin);
    if(vehicle(side)?.vin!==vin)return;
    if(urls[side])URL.revokeObjectURL(urls[side]);
    urls[side]=URL.createObjectURL(new Blob([pdfBytes],{type:'application/pdf'}));
    $('pdf-'+side).src=urls[side];$('pdf-'+side).hidden=false;
    $('pdf-link-'+side).href=urls[side];$('pdf-link-'+side).hidden=false;
    if(parsed.analysis&&index.records[vin]?.status!=='verified'){
     index.records[vin]={...parsed.analysis,status:'verified',sourceType:'original-service',sourceUrl:url,checkedAt:new Date().toISOString()};
     document.dispatchEvent(new CustomEvent('compare:changed'));
    }
    $('lookup-status-'+side).textContent=parsed.analysis?'Original sticker VIN matched. Its readable equipment is now included in your comparison.':'Original sticker VIN matched and opened below. This layout still needs review before automatic feature comparison.';
   }catch{
    if(vehicle(side)?.vin===vin)$('lookup-status-'+side).textContent='Original sticker found, but automatic reading was unavailable. Open the original link below, save it and select the PDF here. Existing equipment evidence has been kept.';
   }
  }catch(e){if(vehicle(side)?.vin===vin){b.disabled=false;b.textContent='Try sticker lookup again';disclosure.textContent=e.message;}}
 });
}

installVehiclePickers(vehicles);
