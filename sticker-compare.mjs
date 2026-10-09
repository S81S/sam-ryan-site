import {vehicleImage,vehicleImageSet} from './vehicle-images.mjs';
import {decodeVIN,normalizeVIN} from './vin-decoder.mjs';
import {appendStickerCredit,usesWindowStickerOrg} from './sticker-credit.mjs';
import {installVehiclePickers,findInventoryByIdentifier} from './compare-picker.mjs';
const readSticker=async(...args)=>(await import('./sticker-reader.mjs')).readSticker(...args);
import {shoppingContext} from './shopping-context.mjs';
import {openVehiclePreview} from './vehicle-preview.mjs';
const vehicles=window.usedInventoryData.vehicles.filter(v=>v.locationId==='18393');
const index=window.equipmentIndex;
const validVIN=s=>/^[A-HJ-NPR-Z0-9]{17}$/.test(s);
const SIDES=['1','2','3','4','5'];
const $=id=>document.getElementById(id), urls={};
const initialParams=new URLSearchParams(location.search);
if(initialParams.has('q')&&$('group-query'))$('group-query').value=initialParams.get('q').slice(0,1000);
if(['New','Used','Both'].includes(initialParams.get('condition'))&&$('group-condition'))$('group-condition').value=initialParams.get('condition');
const cash=n=>n===null?'Not listed':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
function vehicle(side){return vehicles.find(v=>v.vin===$('choose-'+side).value)}
function updateStickerCredit(side, source) {
 let credit=$('sticker-credit-'+side);
 if(!credit){credit=document.createElement('span');credit.id='sticker-credit-'+side;$('sticker-'+side).insertAdjacentElement('afterend',credit)}
 credit.replaceChildren();appendStickerCredit(credit,source,index.records[vehicle(side)?.vin]?.sourceUrl);
}
const previousSelection={},inventoryDecodes=new Map();
function hydrateInventorySpecs(v){
 if(!v||v.external||v.decodedSpecs||inventoryDecodes.has(v.vin))return;
 v.decodePending=true;
 const task=decodeVIN(v.vin).then(({decodedSpecs,decodedSourceUrl,decodedAt})=>{Object.assign(v,{decodedSpecs,decodedSourceUrl,decodedAt});}).catch(()=>{v.decodeUnavailable=true;}).finally(()=>{v.decodePending=false;document.dispatchEvent(new CustomEvent('compare:changed'));});
 inventoryDecodes.set(v.vin,task);
}

function updateDetailLink(side){
 const v=vehicle(side);if(!v)return;
 const context=shoppingContext(),detailParams=new URLSearchParams({q:context.q||'',condition:context.condition||'Both',from:'compare',vehicles:SIDES.map(id=>$('choose-'+id).value).filter(Boolean).join(',')});
 if(context.requestedEquipment)detailParams.set('requestedEquipment',context.requestedEquipment);
 if(context.advisor)detailParams.set('advisor',context.advisor);
 const budget=new URLSearchParams(location.search).get('maxPrice');if(budget)detailParams.set('maxPrice',budget);
 $('listing-'+side).hidden=!!v.external;$('listing-'+side).href='/vehicle-'+encodeURIComponent(v.vin)+'?'+detailParams;
}
document.addEventListener('compare:changed',()=>SIDES.forEach(updateDetailLink));
for(const id of ['group-query','group-condition'])$(id)?.addEventListener('input',()=>SIDES.forEach(updateDetailLink));

function reset(side){
 const chosen=$('choose-'+side).value;
 if(chosen&&SIDES.some(id=>id!==side&&$('choose-'+id).value===chosen)){$('choose-'+side).value=previousSelection[side]||'';$('lookup-status-'+side).textContent='That vehicle is already selected. Choose a different vehicle to compare.';document.dispatchEvent(new CustomEvent('compare:changed'));return false;}
 previousSelection[side]=chosen;
 const v=vehicle(side);
 hydrateInventorySpecs(v);
 updateStickerCredit(side,v?.stickerUrl);
 const photo=$('vehicle-photo-'+side);$('clear-'+side).hidden=!v;
 if(!v){photo.hidden=true;photo.removeAttribute('srcset');photo.removeAttribute('src');$('summary-'+side).textContent='';$('listing-'+side).hidden=true;$('listing-'+side).removeAttribute('href');$('sticker-'+side).hidden=true;$('sticker-'+side).removeAttribute('href');$('lookup-note-'+side).textContent='';if(urls[side]){URL.revokeObjectURL(urls[side]);delete urls[side]}$('pdf-'+side).removeAttribute('src');$('pdf-'+side).hidden=true;$('file-'+side).value='';$('file-status-'+side).textContent='No local PDF selected.';$('pdf-link-'+side).hidden=true;$('pdf-link-'+side).removeAttribute('href');document.dispatchEvent(new CustomEvent('compare:changed'));return}
 photo.hidden=!v.photoUrl;photo.alt=v.title+' — stock '+v.stock;photo.onerror=()=>{photo.hidden=true};if(v.photoUrl){photo.src=vehicleImage(v.photoUrl);photo.srcset=vehicleImageSet(v.photoUrl);photo.sizes='(max-width:700px) calc(100vw - 40px), 40vw';}else {photo.removeAttribute('srcset');photo.removeAttribute('src');}
 if(urls[side]){URL.revokeObjectURL(urls[side]);delete urls[side]}
 $('pdf-'+side).removeAttribute('src');$('pdf-'+side).hidden=true;$('file-'+side).value='';$('file-status-'+side).textContent='No local PDF selected.';
 $('summary-'+side).textContent=`${v.title} · ${cash(v.price)} · ${v.miles===null?'':v.miles.toLocaleString()+' miles · '}Stock ${v.stock}`;
 if(v.external){$('summary-'+side).textContent=`${v.title} · VIN ${v.vin} · ${v.decodedAt?'External decoded specs only (NHTSA)':'VIN identity lookup in progress'} · Price and mileage are not supplied for this outside vehicle. Availability must be confirmed with its seller.`;if(v.decodedSpecs){const specs=document.createElement('p');specs.textContent=Object.entries(v.decodedSpecs).map(([key,value])=>key+': '+value).join(' · ');const source=document.createElement('a');source.href=v.decodedSourceUrl;source.target='_blank';source.rel='noopener';source.textContent='NHTSA decoder source ↗';$('summary-'+side).append(specs,source);}}
 else {const evidence=document.createElement('small');evidence.textContent='Covert dealer listing snapshot • '+(v.observedAt||window.usedInventoryData.capturedAt)+' • Confirm current price and availability.';$('summary-'+side).append(document.createElement('br'),evidence);}
 updateDetailLink(side);$('listing-'+side).textContent='View photos & vehicle details';$('listing-'+side).removeAttribute('target');$('listing-'+side).onclick=null;
 const originalSource=v.stickerUrl||index.records[v.vin]?.sourceUrl;$('sticker-'+side).hidden=!v.carfaxUrl&&!originalSource;$('sticker-'+side).href=originalSource||v.carfaxUrl||v.sourceUrl;$('sticker-'+side).textContent=originalSource?(usesWindowStickerOrg(originalSource)?'Open window sticker via WindowSticker.org ↗':'Open original window sticker ↗'):'Open CARFAX → Original Window Sticker ↗';
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
  const v=vehicle(side);
 updateStickerCredit(side,v?.stickerUrl);if(!v)return;
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
   if(parsed.analysis&&index.records[selectedVIN]?.status!=='verified'){index.records[selectedVIN]={...parsed.analysis,vin:selectedVIN,status:'verified',sourceType:'customer-upload',checkedAt:new Date().toISOString()};document.dispatchEvent(new CustomEvent('compare:changed'));}

  }catch(err){if(vehicle(side)?.vin===selectedVIN&&e.target.files[0]===f)$('file-status-'+side).textContent=err.message}
 });
 reset(side);
}
// Preselect vehicles only from an explicit link — a single ?vehicle=VIN (e.g. from the inventory page)
// or several via ?vehicles=VIN1,VIN2,... (e.g. "Add to compare" on Find My Car). Nothing is preloaded
// otherwise; shoppers pick from the dropdowns or enter a stock number/VIN below.
const params=initialParams;
const multi=(params.get('vehicles')||'').split(',').map(s=>s.trim()).filter(Boolean);
const requested=multi.length?multi:(params.get('vehicle')?[params.get('vehicle')]:[]);
requested.forEach((vin,i)=>{
 const side=SIDES[i];if(!side)return;
 if(vehicles.some(v=>v.vin===vin)){$('choose-'+side).value=vin;reset(side);if(index.records[vin]?.status!=='verified')addExternal(vin,side)}
 else if(validVIN(vin))addExternal(vin,side);
});

function findByStockOrVin(q){return findInventoryByIdentifier(vehicles,q)}
for(const side of SIDES){
 const input=$('lookup-'+side),status=$('lookup-status-'+side),go=()=>{
  const q=input.value;status.className='lookup-status';
  if(!q.trim()){status.textContent='Type a model, trim, stock number or VIN.';status.classList.add('is-error');return}
  const match=findByStockOrVin(q);
 if(!match&&vehicles.some(v=>v.vin===normalizeVIN(q)&&v.status==='not-observed')){status.textContent='This VIN was not observed in the latest inventory. Ask Sam to confirm its availability.';return;}
 if(!match&&validVIN(normalizeVIN(q))){addExternal(normalizeVIN(q),side);return;}
  if(!match){status.textContent='Choose a matching vehicle from the results below. If no results appear, adjust your search or vehicle condition. You can also enter a complete 17-character VIN for an outside vehicle.';return}
  $('choose-'+side).value=match.vin;$('choose-'+side).dispatchEvent(new Event('change'));
  if(vehicle(side)?.vin!==match.vin)return;
  status.textContent=`Matched: ${match.title} — Stock ${match.stock} — VIN ${match.vin}.`;status.classList.add('is-ok');
  if(index.records[match.vin]?.status!=='verified')addExternal(match.vin,side);
 };

 input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();go()}});
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
 if(!v){v={vin,title:'Outside vehicle — '+vin,stock:'',price:null,miles:null,external:true,condition:'Unknown'};vehicles.push(v);window.usedInventoryData.vehicles.push(v);for(const id of SIDES){const o=document.createElement('option');o.value=vin;o.textContent='Outside vehicle — '+vin;$('choose-'+id).append(o)}}
 $('choose-'+side).value=vin;reset(side);$('lookup-status-'+side).textContent=`VIN accepted: ${vin}. Looking for its original window sticker…`;$('lookup-status-'+side).classList.add('is-ok');
 const b=document.createElement('button');b.type='button';b.className='btn ghost';b.textContent='Look for original sticker';
 const disclosure=document.createElement('p');disclosure.textContent='This lookup sends the VIN to WindowSticker.org. Availability varies by manufacturer and model year. Your PDF uploads stay on your device.';
 $('lookup-status-'+side).append(disclosure,b);
 if(v.external){
  $('file-'+side).closest('details').hidden=false;
  const note=document.createElement('p');note.id='decode-status-'+side;
  note.textContent='Not in Covert inventory. Checking the public NHTSA VIN decoder…';
  $('lookup-status-'+side).prepend(note);
  decodeVIN(vin).then(decoded=>{
   const stickerTitle=v.title;Object.assign(v,decoded);if(index.records[vin]?.status==='verified')v.title=stickerTitle;
   document.dispatchEvent(new CustomEvent('compare:changed'));
   for(const id of SIDES){for(const option of $('choose-'+id).options){if(option.value===vin)option.textContent=v.title+' — '+vin;}}
   if(vehicle(side)?.vin!==vin||!note.isConnected)return;
   if(index.records[vin]?.status!=='verified')reset(side);note.textContent='VIN found: '+v.title+' • NHTSA identity confirmed. Original-sticker lookup is separate from VIN decoding.';
   const link=document.createElement('a');link.href=decoded.decodedSourceUrl;link.target='_blank';link.rel='noopener';link.textContent='View decoder source ↗';note.append(document.createElement('br'),link);
   const specs=document.createElement('p');specs.textContent=Object.entries(decoded.decodedSpecs).map(([key,value])=>key+': '+value).join(' · ');note.append(specs);
  }).catch(error=>{if(vehicle(side)?.vin===vin&&note.isConnected)note.textContent='VIN added with unverified identity. '+error.message+' Factory options require a readable original sticker.';});
 }
 b.addEventListener('click',async()=>{
  b.disabled=true;b.textContent='Checking…';
  try{
   $('lookup-status-'+side).setAttribute('aria-busy','true');
   const pdfResponse=await fetch('/api/original-sticker?vin='+vin,{signal:AbortSignal.timeout(30000)});
   if(!pdfResponse.ok){let message='Original sticker lookup is unavailable. Try again or upload its original PDF.';try{message=(await pdfResponse.json()).error||message;}catch{}throw Error(message);}
   const url='https://windowsticker.org/api/sticker/'+vin;
    const pdfBytes=new Uint8Array(await pdfResponse.arrayBuffer());
    const parsed=await readSticker(pdfBytes.slice(),vin);
    if(vehicle(side)?.vin!==vin)return;
    if(urls[side])URL.revokeObjectURL(urls[side]);
    urls[side]=URL.createObjectURL(new Blob([pdfBytes],{type:'application/pdf'}));
    $('pdf-'+side).src=urls[side];$('pdf-'+side).hidden=false;
    $('pdf-link-'+side).href=urls[side];$('pdf-link-'+side).hidden=false;
    v.stickerUrl=url;
    if(v.external&&parsed.analysis?.identityLines?.length){const title=parsed.analysis.identityLines.find(l=>/^(?:RAM|JEEP|DODGE|CHRYSLER)\s/i.test(l));if(title)v.title=[v.year,title].filter(Boolean).join(' ');}
    $('sticker-'+side).href=url;$('sticker-'+side).hidden=false;$('sticker-'+side).textContent='Open original window sticker ↗';updateStickerCredit(side,url);
    if(parsed.analysis&&index.records[vin]?.status!=='verified'){
     index.records[vin]={...parsed.analysis,vin,status:'verified',sourceType:'original-service',sourceUrl:url,checkedAt:new Date().toISOString()};
     document.dispatchEvent(new CustomEvent('compare:changed'));
    }
    $('summary-'+side).textContent=`✓ VIN found: ${v.title} · VIN ${vin} · Original sticker found${parsed.analysis?' and equipment read':''}.`;$('lookup-status-'+side).classList.add('is-ok');$('lookup-status-'+side).removeAttribute('aria-busy');
    $('lookup-status-'+side).textContent=parsed.analysis?'Original sticker VIN matched. Its readable equipment is now included in your comparison.':'Original sticker VIN matched and opened below. This layout still needs review before automatic feature comparison.';
  }catch(e){if(vehicle(side)?.vin===vin){$('lookup-status-'+side).removeAttribute('aria-busy');b.disabled=false;b.textContent='Try sticker lookup again';disclosure.textContent=e.message;}}
 });
 b.click();
}

installVehiclePickers(vehicles);

for(const side of SIDES){const button=$('clear-'+side);button.textContent='Change vehicle';button.closest('.sticker-side').append(button);}
