(() => {
  const form = document.getElementById('contactForm');
  if (!form) return;
  const byId = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const requestedVin = (params.get('vehicle') || '').slice(0,100);
  const vehicle = (window.usedInventoryData?.vehicles || []).find(v => v.vin === params.get('vehicle') && v.locationId === '18393');
  const advisor=document.getElementById('contactAdvisor'); const requestedAdvisor=String(params.get('advisor')||'').trim().toLowerCase(); if(['sam','ryan'].includes(requestedAdvisor))advisor.value=requestedAdvisor==='ryan'?'Ryan':'Sam';
  const contactActions = document.createElement('p');
  contactActions.className = 'hero-actions';
  const callAdvisor = document.createElement('a');
  const textAdvisor = document.createElement('a');
  callAdvisor.className = textAdvisor.className = 'btn';
  contactActions.append(callAdvisor, textAdvisor);
  advisor.insertAdjacentElement('afterend', contactActions);
  const syncAdvisor = () => {
    const ryan = advisor.value === 'Ryan';
    const who = ryan ? 'Ryan' : 'Sam';
    const cell = ryan ? '+14014104727' : '+17372091320';
    callAdvisor.href = 'tel:' + cell; callAdvisor.textContent = 'Call ' + who;
    textAdvisor.href = 'sms:' + cell + '?body=' + encodeURIComponent(`Hi ${who}, ${byId('inquiry-purpose').value}.` + (vehicle ? `\n${vehicle.title} — Stock ${vehicle.stock} — VIN ${vehicle.vin}` : requestedVin ? `\nRequested VIN: ${requestedVin}` : '') + (byId('field-message').value.trim() ? '\n'+byId('field-message').value.trim() : '') + (byId('inquiry-purpose').value==='Request a test drive' && byId('visit-time').value.trim() ? '\nPreferred visit: '+byId('visit-time').value.trim()+' (please confirm)' : '')); textAdvisor.textContent = 'Text ' + who;
  };
  advisor.addEventListener('change', syncAdvisor); syncAdvisor();
  const purpose = byId('inquiry-purpose');
  if (params.get('purpose') === 'walkaround') purpose.value = 'Request a walkaround video';
  if (params.get('purpose') === 'test-drive') purpose.value = 'Request a test drive';
  const syncPurpose = () => { byId('visit-field').hidden = purpose.value !== 'Request a test drive'; };
  purpose.addEventListener('change', syncPurpose);
  syncPurpose();
  const sharedRequest=params.get('request');
  let wishlistRequest=null;try{wishlistRequest=sessionStorage.getItem('samRyanWishlistInquiry');sessionStorage.removeItem('samRyanWishlistInquiry');}catch{}
  if(!vehicle&&(sharedRequest||wishlistRequest)){byId('field-message').value=(sharedRequest||wishlistRequest).slice(0,2500);purpose.value='Get help finding a vehicle';syncPurpose();}
  if(params.has('vehicle')&&!vehicle){byId('contactMessage').textContent='We could not confirm that vehicle from the saved inventory. Your requested VIN will stay in your inquiry so we can check it for you.';}
  if(vehicle&&sharedRequest)byId('field-message').value=('I’m looking for: '+sharedRequest).slice(0,2500);
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
  for(const [id,who,number] of [['quick-text-sam','Sam','+17372091320'],['quick-text-ryan','Ryan','+14014104727']]){const a=byId(id);if(a){const about=vehicle?`stock ${vehicle.stock}, VIN ${vehicle.vin}`:requestedVin?`VIN ${requestedVin}`:'';a.href=`sms:${number}?body=${encodeURIComponent(`Hi ${who}, `+(about?`can you help me with ${about}? `:'')+(sharedRequest||''))}`;}}
  syncAdvisor();
  form.addEventListener('input', syncAdvisor);
  form.addEventListener('change', syncAdvisor);
  form.addEventListener('input', () => { byId('request-preview').hidden = true; byId('copy-inquiry-status').textContent = ''; });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form));
    const name = values.name.trim(), reply = values.reply.trim();
    if (!name || !reply) { byId('contactMessage').textContent = 'Please enter your name and a phone number or email so we can reply.'; return; }
    const recipient=values.advisor==='Ryan'?'ryansugrue@covertauto.com':'samuelsweitzer@covertauto.com';
    const lines = [`Hi ${values.advisor==='Ryan'?'Ryan':'Sam'},`, '', `I'd like to: ${values.purpose}.`, '', `Name: ${name}`, `Reply to: ${reply}`, `Preferred advisor: ${values.advisor}`];
    if (!vehicle && requestedVin) lines.push('', `Requested VIN: ${requestedVin} (please confirm availability)`);
    if (vehicle) lines.push('', `Vehicle: ${vehicle.title}`, `Stock: ${vehicle.stock}`, `VIN: ${vehicle.vin}`, `Listing: ${vehicle.sourceUrl}`);
    if (values.purpose === 'Request a test drive' && values.visit.trim()) lines.push('', `Preferred visit: ${values.visit.trim()} (please confirm)`);
    if (values.message.trim()) lines.push('', values.message.trim());
    lines.push('', 'Store: Covert CDJR Austin, 8107 Research Blvd, Austin, TX 78758', 'Source: Cars With Sam website');
    // Only recognized campaign labels are copied; no arbitrary URL text or referrer data.
    const campaignSources = new Map([['facebook','Facebook'],['instagram','Instagram'],['youtube','YouTube'],['tiktok','TikTok']]);
    const campaignNames = new Map([['first-week-sam','Sam launch post'],['first-week-ryan','Ryan launch post']]);
    const campaignSource = campaignSources.get((params.get('utm_source') || '').toLowerCase());
    const campaignName = campaignNames.get(params.get('utm_campaign'));
    if (campaignSource) lines.push(`Campaign link: ${campaignSource}${campaignName ? ' / ' + campaignName : ''}`);
    const body = lines.join('\n');
    byId('request-text').textContent = body;
    byId('send-inquiry').href = `mailto:${recipient}?subject=${encodeURIComponent(`${values.purpose}${vehicle ? ' — stock '+vehicle.stock : ''} | Cars With Sam`)}&body=${encodeURIComponent(body)}`;
    byId('request-preview').hidden = false;
    window.cwsTrack?.('inquiry_review',{advisor:values.advisor==='Ryan'?'Ryan':'Sam',purpose:values.purpose});
    byId('contactMessage').textContent = 'Your request is ready below. Nothing has been sent yet. Open your email app, review and press Send there, or copy your request.';
    if (!form.dataset.directDelivery) byId('send-inquiry').focus();
  });
  byId('copy-inquiry').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(byId('request-text').textContent); byId('copy-inquiry-status').textContent = 'Copied. Paste it into your email to your advisor. Nothing has been sent automatically.'; }
    catch { byId('copy-inquiry-status').textContent = 'Copy the request text above manually, or use Open email to send.'; }
  });
})();
