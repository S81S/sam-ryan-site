(async () => {
  const form = document.getElementById('contactForm');
  if (!form) return;
  let config;
  try {
    const response = await fetch('/api/inquiry', {signal:AbortSignal.timeout(5000)});
    if (!response.ok) return;
    config = await response.json();
  } catch { return; }
  if (!config.enabled || !config.siteKey) return;
  form.dataset.directDelivery = 'available';
  form.querySelector('button[type=submit]').textContent = 'REVIEW MY INQUIRY →';
  document.getElementById('contactMessage').textContent = 'Review your request, then send it directly to Sam or Ryan. You can also call, text or use your email app. Your details are shared only when you choose to send.';
  const preview = document.getElementById('request-preview');
  const box = document.createElement('div');
  const explanation = document.createElement('p');
  explanation.textContent = 'Send this inquiry directly to your selected advisor. Your contact details and request will be shared so they can respond. This does not book an appointment.';
  const challenge = document.createElement('div');
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'btn'; button.textContent = 'SEND MY INQUIRY'; button.disabled = true;
  const status = document.createElement('p'); status.setAttribute('role', 'status');
  box.append(explanation, challenge, button, status); preview.prepend(box);
  let token = '', widget, sending = false, accepted = false;
  const script = document.createElement('script');
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; script.async = true;
  let challengeReady = false;
  const renderChallenge = () => {
    if (!challengeReady || preview.hidden || widget !== undefined) return;
    widget = window.turnstile.render(challenge, {sitekey:config.siteKey, action:'inquiry',
      callback:value => { token=value; button.disabled=sending || accepted; },
      'expired-callback':() => {token=''; button.disabled=true;},
      'error-callback':() => {token=''; button.disabled=true; status.textContent='Verification is unavailable. You can still send your request by text or email below.';}
    });
  };
  script.onload = () => { challengeReady = true; renderChallenge(); };
  form.addEventListener('submit', () => { if (preview.hidden) return; renderChallenge(); document.getElementById('contactMessage').textContent = 'Review your request below, then choose Send my inquiry. Nothing has been sent yet.'; box.scrollIntoView({behavior:'smooth',block:'center'}); });
  script.onerror = () => {status.textContent='Online sending is unavailable. Please use text or email below.';};
  document.head.append(script);
  form.addEventListener('input', () => {accepted=false; button.disabled=sending || !token; status.textContent='';});
  button.addEventListener('click', async () => {
    if (sending || accepted || !token || !form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form));
    sending=true; button.disabled=true; const locked=[...form.querySelectorAll('input,select,textarea,button')].filter(e=>!e.disabled); locked.forEach(e=>e.disabled=true); status.textContent='Sending your inquiry…';
    try {
      const response = await fetch('/api/inquiry', {method:'POST', headers:{'Content-Type':'application/json'}, signal:AbortSignal.timeout(25000),
        body:JSON.stringify({name:values.name.trim(),reply:values.reply.trim(),advisor:values.advisor==='Ryan'?'Ryan':'Sam',purpose:values.purpose,message:document.getElementById('request-text').textContent,token})});
      const result = await response.json();
      if (!response.ok || result.accepted !== true) throw new Error('not-confirmed');
      accepted=true;
      status.textContent='Your inquiry was accepted for sending to your advisor. Please wait for their reply to confirm availability or an appointment.';
      document.getElementById('contactMessage').textContent='Your inquiry was accepted for sending. You can also reach your advisor directly if you need a quicker answer.';
    } catch {
      status.textContent='We could not confirm your inquiry was sent. Your details are still here. Please use text or email below.';
    } finally {
      sending=false; locked.forEach(e=>e.disabled=false); token=''; button.disabled=true;
      if (widget !== undefined && !accepted) window.turnstile.reset(widget);
    }
  });
})();
