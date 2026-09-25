const vehicles=window.usedInventoryData.vehicles.filter(v=>v.locationId==='18393');
const SIDES=['1','2','3','4','5'];
const $=id=>document.getElementById(id), urls={};
const cash=n=>n===null?'Not listed':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
function vehicle(side){return vehicles.find(v=>v.vin===$('choose-'+side).value)}
function reset(side){
 const v=vehicle(side);
 const photo=$('vehicle-photo-'+side);
 if(!v){photo.hidden=true;photo.removeAttribute('src');$('summary-'+side).textContent='';$('listing-'+side).hidden=true;$('listing-'+side).removeAttribute('href');$('sticker-'+side).hidden=true;$('sticker-'+side).removeAttribute('href');$('lookup-note-'+side).textContent='';if(urls[side]){URL.revokeObjectURL(urls[side]);delete urls[side]}$('pdf-'+side).removeAttribute('src');$('pdf-'+side).hidden=true;$('file-'+side).value='';$('file-status-'+side).textContent='No local PDF selected.';$('pdf-link-'+side).hidden=true;$('pdf-link-'+side).removeAttribute('href');document.dispatchEvent(new CustomEvent('compare:changed'));return}
 photo.hidden=!v.photoUrl;photo.alt=v.title+' — stock '+v.stock;photo.onerror=()=>{photo.hidden=true};if(v.photoUrl)photo.src=v.photoUrl;else photo.removeAttribute('src');
 if(urls[side]){URL.revokeObjectURL(urls[side]);delete urls[side]}
 $('pdf-'+side).removeAttribute('src');$('pdf-'+side).hidden=true;$('file-'+side).value='';$('file-status-'+side).textContent='No local PDF selected.';
 $('summary-'+side).textContent=`${v.title} · ${cash(v.price)} observed · ${v.miles===null?'Mileage unknown':v.miles.toLocaleString()+' miles'} · Stock ${v.stock} · VIN ${v.vin}`;
 $('listing-'+side).hidden=false;$('listing-'+side).href=v.sourceUrl;
 $('sticker-'+side).hidden=!v.carfaxUrl&&!v.stickerUrl;$('sticker-'+side).href=v.stickerUrl||v.carfaxUrl||v.sourceUrl;$('sticker-'+side).textContent=v.stickerUrl?'Open original window sticker ↗':'Open CARFAX → Original Window Sticker ↗';
 $('lookup-note-'+side).textContent=v.stickerUrl?'Direct sticker link found in the Covert-linked CARFAX report. Confirm the VIN on the document. If the link expires, open the official listing and CARFAX again.':v.carfaxUrl?'Open the Covert-provided CARFAX report, then choose Original Window Sticker. A direct sticker link has not yet been checked for this vehicle.':'No CARFAX/sticker link captured for this vehicle. Open its official listing to check, or load your PDF.';
 $('pdf-link-'+side).hidden=true;$('pdf-link-'+side).removeAttribute('href');
 document.dispatchEvent(new CustomEvent('compare:changed'));
}
for(const side of SIDES){
 const opts=document.createDocumentFragment();
 for(const v of vehicles){const o=document.createElement('option');o.value=v.vin;o.textContent=`${v.title} — ${v.stock}`;opts.append(o)}
 $('choose-'+side).append(opts);
 $('choose-'+side).value='';
 $('choose-'+side).addEventListener('change',()=>reset(side));
 $('file-'+side).addEventListener('change',async e=>{
  const f=e.target.files[0];if(!f)return;
  const v=vehicle(side);if(!v)return;
  const selectedVIN=v.vin;
  try{
   if(f.size>20*1024*1024)throw new Error('Choose a PDF smaller than 20 MB');
   const signature=new TextDecoder().decode(await f.slice(0,5).arrayBuffer());
   if(vehicle(side)?.vin!==selectedVIN||e.target.files[0]!==f)return;
   if(signature!=='%PDF-')throw new Error('This is not a PDF file');
   if(urls[side])URL.revokeObjectURL(urls[side]);
   urls[side]=URL.createObjectURL(f);
   $('pdf-'+side).src=urls[side];$('pdf-'+side).hidden=false;
   $('pdf-link-'+side).href=urls[side];$('pdf-link-'+side).hidden=false;
   $('file-status-'+side).textContent=`${f.name} opened locally. Confirm it shows VIN ${selectedVIN}. The file is not uploaded and its VIN has not been automatically verified.`;
  }catch(err){$('file-status-'+side).textContent=err.message}
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
 if(vehicles.some(v=>v.vin===vin)){$('choose-'+side).value=vin;reset(side)}
});

function findByStockOrVin(q){const norm=q.trim().toUpperCase().replace(/\s+/g,'');if(!norm)return null;return vehicles.find(v=>(v.stock||'').toUpperCase()===norm)||vehicles.find(v=>(v.vin||'').toUpperCase()===norm)}
for(const side of SIDES){
 const input=$('lookup-'+side),status=$('lookup-status-'+side),go=()=>{
  const q=input.value;status.className='lookup-status';
  if(!q.trim()){status.textContent='Enter a stock number or VIN.';status.classList.add('is-error');return}
  const match=findByStockOrVin(q);
  if(!match){status.textContent=`No vehicle found at 8107 Research Blvd with stock # or VIN "${q.trim()}". Double-check the number, or use the dropdown above.`;status.classList.add('is-error');return}
  $('choose-'+side).value=match.vin;$('choose-'+side).dispatchEvent(new Event('change'));
  status.textContent=`Matched: ${match.title} — Stock ${match.stock} — VIN ${match.vin}.`;status.classList.add('is-ok');
 };
 $('lookup-go-'+side).addEventListener('click',go);
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();go()}});
}
window.addEventListener('beforeunload',()=>Object.values(urls).forEach(URL.revokeObjectURL));
export {SIDES,vehicle};
