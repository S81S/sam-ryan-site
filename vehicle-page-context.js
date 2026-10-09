(() => {
  const params = new URLSearchParams(location.search);
  const request = (params.get('q') || '').slice(0, 1000);
  const equipment = (params.get('requestedEquipment') || '').slice(0, 2000);
  const condition = ['New', 'Used', 'Both'].includes(params.get('condition')) ? params.get('condition') : '';
  const budget = Math.max(0, Math.min(1000000, Number(params.get('maxPrice')) || 0));
  const source = ['photo-guide', 'compare'].includes(params.get('from')) ? params.get('from') : '';
  const shortlist = [...new Set((params.get('vehicles') || '').split(',').filter(vin => /^[A-HJ-NPR-Z0-9]{17}$/.test(vin)))].slice(0, 5).join(',');
  const back = document.getElementById('back-results');
  const search = new URLSearchParams();
  if (request) search.set('q', request);
  if (condition) search.set('condition', condition);
  if (equipment) search.set('requestedEquipment', equipment);
  if (budget) search.set('maxPrice', budget);
  if (source) search.set('from', source);
  if (params.get('advisor') === 'Ryan') search.set('advisor', 'Ryan');
  if (back && (search.size || source)) {
    if (source === 'photo-guide') {
      back.href = '/perfect-match?' + search + '#photo-finder';
      back.textContent = '← Back to my photo guide';
    } else if (source === 'compare') {
      if (shortlist) search.set('vehicles', shortlist);
      back.href = '/compare?' + search;
      back.textContent = '← Back to my comparison';
    } else back.href = '/inventory?' + search;
  }
  const description = [request, condition ? 'Shopping: ' + condition : '', equipment ? 'My feature preferences: ' + equipment : '', budget ? 'Maximum listed price: $' + budget.toLocaleString('en-US') : ''].filter(Boolean).join('\n');
  if (!description) return;
  for (const link of document.querySelectorAll('a[href^="/contact?"], a[href^="/compare?"], a[href^="sms:"]')) {
    const url = new URL(link.href);
    if (url.protocol === 'sms:') {
      // Text-message links must percent-encode spaces: URLSearchParams would write "+",
      // and messaging apps show those plus signs literally.
      const body = (url.searchParams.get('body') || '') + '\n' + description;
      link.href = link.getAttribute('href').split('?')[0] + '?body=' + encodeURIComponent(body);
      continue;
    } else if (url.pathname === '/contact') {
      url.searchParams.set('request', description);
    } else if (url.pathname === '/compare') {
      for (const [key, value] of search) url.searchParams.set(key, value);
    }
    link.href = url.toString();
  }
})();


import('/sticker-credit.mjs').then(m=>m.installStickerCredits()).catch(()=>{});

// Photo gallery: thumbnails and arrows swap the main photo in place.
(() => {
  const main = document.querySelector('.vehicle-photo');
  const links = [...document.querySelectorAll('.photo-strip a')];
  if (!main || links.length < 2) return;
  const count = document.querySelector('.photo-count');
  let current = 0;
  const show = (n, scrollThumb = true) => {
    current = (n + links.length) % links.length;
    // A stale srcset takes precedence over src and keeps showing the previous photo.
    main.removeAttribute('srcset');
    main.src = links[current].href;
    links.forEach((a, k) => a.setAttribute('aria-current', k === current ? 'true' : 'false'));
    if (count) count.textContent = (current + 1) + ' / ' + links.length;
    if (scrollThumb) {
      const strip = links[current].parentNode;
      strip.scrollTo({ left: links[current].offsetLeft - strip.clientWidth / 2 + links[current].clientWidth / 2, behavior: 'smooth' });
    }
  };
  links.forEach((a, k) => a.addEventListener('click', e => { e.preventDefault(); show(k); }));
  document.querySelector('.photo-prev')?.addEventListener('click', () => show(current - 1));
  document.querySelector('.photo-next')?.addEventListener('click', () => show(current + 1));
  let startX = null;
  main.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  main.addEventListener('touchend', e => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX; startX = null;
    if (Math.abs(dx) > 40) show(current + (dx < 0 ? 1 : -1));
  }, { passive: true });
})();
