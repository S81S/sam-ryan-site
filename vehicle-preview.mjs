import {shoppingContext,comparisonLink,vehicleLink} from './shopping-context.mjs';
import {vehiclePhotos} from './vehicle-photos.mjs';
// Keep the shopper's vehicle context on Cars With Sam.
let dialog;
const element = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
};
const action = (label, href) => {
  const node = element('a', label, 'btn');
  node.href = href;
  return node;
};
export function openVehiclePreview(vehicle, request = '') {
  if (vehicle.locationId !== '18393') return;
  if (!dialog) {
    dialog = element('dialog', null, 'vehicle-preview');
    dialog.setAttribute('aria-labelledby', 'vehicle-preview-title');
    document.body.append(dialog);
  }
  dialog.replaceChildren();
  const close = element('button', 'Close ×', 'mini-btn');
  close.type = 'button';close.autofocus=true;
  close.classList.add('vehicle-preview-close');
  close.addEventListener('click', () => dialog.close());
  const title = element('h2', vehicle.title);
  title.id = 'vehicle-preview-title';
  dialog.append(close, title);
  // The page's inventory carries one main photo; the rest of the gallery loads when this preview opens.
  const usable=list=>[...new Set(list.filter(u=>typeof u==='string'&&u.startsWith('https://')))];
  const galleryLoaded=Array.isArray(vehicle.photoUrls),opened=dialog.previewOpened=Symbol(vehicle.vin);
  let photoUrls=usable([vehicle.photoUrl,...(galleryLoaded?vehicle.photoUrls:[])]);
  if(photoUrls.length){
    let current=0,hasButtons=false;const image=element('img');image.className='vehicle-preview-photo';image.alt=vehicle.title;image.decoding='async';
    const count=element('p');count.setAttribute('role','status');
    const show=()=>{image.src=photoUrls[current];count.textContent=`Photo ${current+1} of ${photoUrls.length}`;};
    image.addEventListener('error',()=>{count.textContent='This photo is unavailable. Ask your advisor for current photos.';});
    const nav=element('div',null,'gallery-nav');nav.append(count);
    const addButtons=()=>{if(hasButtons||photoUrls.length<2)return;hasButtons=true;for(const [label,step] of [['Previous photo',-1],['Next photo',1]]){const button=element('button',label,'mini-btn');button.type='button';button.addEventListener('click',()=>{current=(current+step+photoUrls.length)%photoUrls.length;show()});nav.insertBefore(button,count)}};
    const onePhoto=()=>{if(photoUrls.length===1)nav.after(element('p','One listing photo is available here. Ask us for more photos or a walkaround video.','stock-small'));};
    addButtons();dialog.append(image,nav);show();
    if(galleryLoaded)onePhoto();
    else{
      if(vehicle.photoCount>1)count.textContent=`Photo 1 of ${vehicle.photoCount} · loading the rest…`;
      vehiclePhotos(vehicle).then(more=>{if(dialog.previewOpened!==opened)return;photoUrls=usable([vehicle.photoUrl,...more]);addButtons();show();onePhoto();})
        .catch(()=>{if(dialog.previewOpened===opened)count.textContent='Photo 1. More photos could not load. Ask us for current photos.';});
    }
  } else dialog.append(element('p','Ask us for current photos of this vehicle.'));
  const checked=vehicle.photoCheckedAt||vehicle.observedAt; if(checked)dialog.append(element('p','Listing photo saved '+new Date(checked).toLocaleDateString()+'. Listing photos may include manufacturer stock images.','stock-small'));
  const price = vehicle.price == null ? 'Ask for price' : new Intl.NumberFormat('en-US', {style:'currency', currency:'USD', maximumFractionDigits:0}).format(vehicle.price);
  dialog.append(element('p', `${price} · ${vehicle.condition || ''} · Stock ${vehicle.stock || 'not listed'}`), element('p', `VIN ${vehicle.vin}`, 'stock-small'));
  dialog.append(element('p', 'Please confirm current price and availability. Equipment is only confirmed by the original VIN-matched window sticker.', 'stock-small'));
  const label = element('label', 'Talk with ');
  const advisor = element('select');
  advisor.setAttribute('aria-label', 'Choose your advisor');
  for (const name of ['Sam', 'Ryan']) { const option = element('option', name); option.value = name; advisor.append(option); }
  advisor.value=shoppingContext().advisor;
  label.append(advisor); dialog.append(label);
  const actions = element('div', null, 'hero-actions');
  const text = action('Text Sam about this vehicle', '#');
  const ask = action('Check availability', '#');
  const walkaround = action('Request a walkaround', '#');
  const drive = action('Request a test drive', '#');
  const compare=action('Compare window stickers','#');
  const driveway=action('Try a driveway preview','#');
  const sync = () => {
    const who = advisor.value;
    const context={...shoppingContext(),advisor:who};
    compare.href=comparisonLink([vehicle.vin],context);
    driveway.href='see-yourself.html?'+new URLSearchParams({vehicle:vehicle.vin,advisor:who});
    const query = new URLSearchParams({vehicle:vehicle.vin, advisor:who, request:request ? request+'\nCondition: '+context.condition : ''});
    text.textContent = `Text ${who} about this vehicle`;
    text.href = `sms:${who === 'Ryan' ? '+14014104727' : '+17372091320'}?body=${encodeURIComponent(`Hi ${who}, I'm interested in ${vehicle.title}, stock ${vehicle.stock || 'not listed'}, VIN ${vehicle.vin}. Is it available?${request ? '\nMy search: ' + request : ''}`)}`;
    ask.href = 'contact.html?' + query;
    query.set('purpose','walkaround'); walkaround.href='contact.html?'+query;
    query.set('purpose', 'test-drive'); drive.href = 'contact.html?' + query;
  };
  advisor.addEventListener('change', sync); sync();
  actions.append(text, ask, walkaround, drive, compare, driveway);
  actions.append(action('Full vehicle details',vehicleLink(vehicle.vin,shoppingContext())));dialog.append(actions);
  const photos = action('More photos on dealer site ↗', vehicle.sourceUrl);
  photos.className = 'mini-btn'; photos.target = '_blank'; photos.rel = 'noopener';
  dialog.append(photos);
  dialog.showModal();
  dialog.scrollTop=0;
}
