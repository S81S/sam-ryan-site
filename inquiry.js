(() => {
  const form = document.getElementById('contactForm');
  if (!form) return;
  const byId = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const vehicle = (window.usedInventoryData?.vehicles || []).find(v => v.vin === params.get('vehicle') && v.locationId === '18393');
  const purpose = byId('inquiry-purpose');
  if (params.get('purpose') === 'test-drive') purpose.value = 'Request a test drive';
  const syncPurpose = () => { byId('visit-field').hidden = purpose.value !== 'Request a test drive'; };
  purpose.addEventListener('change', syncPurpose);
  syncPurpose();
  const sharedRequest=params.get('request');
  let wishlistRequest=null;try{wishlistRequest=sessionStorage.getItem('samRyanWishlistInquiry');sessionStorage.removeItem('samRyanWishlistInquiry');}catch{}
  if(!vehicle&&(sharedRequest||wishlistRequest)){byId('field-message').value=(sharedRequest||wishlistRequest).slice(0,2500);purpose.value='Get help finding a vehicle';syncPurpose();}
  if(params.has('vehicle')&&!vehicle){byId('contactMessage').textContent='That vehicle is no longer in this saved inventory. Tell us what you were looking for and we’ll help you check availability.';}
  if (vehicle) {
    const card = byId('inquiry-vehicle');
    if (vehicle.photoUrl) {
      const photo = document.createElement('img');
      photo.src = vehicle.photoUrl; photo.alt = vehicle.title;
      photo.width = 400; photo.height = 300;
      photo.addEventListener('error', () => photo.remove(), {once:true});
      card.append(photo);
    }
    const title = document.createElement('h3'); title.textContent = vehicle.title;
    const detail = document.createElement('p'); detail.textContent = `Stock ${vehicle.stock} · VIN ${vehicle.vin}`;
    card.append(title, detail); card.hidden = false;
  }
  form.addEventListener('input', () => { byId('request-preview').hidden = true; byId('copy-inquiry-status').textContent = ''; });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form));
    const name = values.name.trim(), reply = values.reply.trim();
    if (!name || !reply) { byId('contactMessage').textContent = 'Please enter your name and a phone number or email so we can reply.'; return; }
    const lines = [`Hi Sam and Ryan,`, '', `I'd like to: ${values.purpose}.`, '', `Name: ${name}`, `Reply to: ${reply}`, `Preferred advisor: ${values.advisor}`];
    if (vehicle) lines.push('', `Vehicle: ${vehicle.title}`, `Stock: ${vehicle.stock}`, `VIN: ${vehicle.vin}`, `Listing: ${vehicle.sourceUrl}`);
    if (values.purpose === 'Request a test drive' && values.visit.trim()) lines.push('', `Preferred visit: ${values.visit.trim()} (please confirm)`);
    if (values.message.trim()) lines.push('', values.message.trim());
    lines.push('', 'Store: Covert CDJR Austin, 8107 Research Blvd, Austin, TX 78758', 'Source: Sam + Ryan website');
    const body = lines.join('\n');
    byId('request-text').textContent = body;
    byId('send-inquiry').href = `mailto:samuelsweitzer@covertauto.com?subject=${encodeURIComponent(`${values.purpose}${vehicle ? ' — stock '+vehicle.stock : ''} | Sam + Ryan`)}&body=${encodeURIComponent(body)}`;
    byId('request-preview').hidden = false;
    byId('contactMessage').textContent = 'Your request is ready below. Nothing has been sent yet. Open your email app, review and press Send there, or copy your request.';
    byId('send-inquiry').focus();
  });
  byId('copy-inquiry').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(byId('request-text').textContent); byId('copy-inquiry-status').textContent = 'Copied. Paste it into your email to Sam. Nothing has been sent automatically.'; }
    catch { byId('copy-inquiry-status').textContent = 'Copy the request text above manually, or use Open email to send.'; }
  });
})();
