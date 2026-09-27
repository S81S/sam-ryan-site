// General inquiries do not need the full inventory snapshot.
const form = document.getElementById('contactForm');
if (form) {
  const holdSubmit = event => event.preventDefault();
  form.addEventListener('submit', holdSubmit);
  const requestedVin = new URLSearchParams(location.search).get('vehicle');
  if (requestedVin) {
    try {
      await import('./data/used-inventory.js?v=23-search2');
    } catch {
      // The inquiry preserves the requested VIN even when inventory is unavailable.
    }
  }
  try {
    await import('./inquiry.js?v=campaign1');
    form.removeEventListener('submit', holdSubmit);
    await import('./inquiry-delivery.js?v=funnel1');
  } catch {
    const status = document.getElementById('contactMessage');
    status.textContent = 'The inquiry form could not finish loading. Please use the call, text or email links on this page to reach Sam or Ryan.';
  }
}
