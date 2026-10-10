(() => {
  const params = new URLSearchParams(location.search);
  const request = (params.get('q') || '').slice(0, 1000);
  const preferences = (params.get('preferences') || '').slice(0, 18000);
  const equipment = (params.get('requestedEquipment') || '').slice(0, 2000);
  const condition = ['New', 'Used', 'Both'].includes(params.get('condition')) ? params.get('condition') : '';
  const budget = Math.max(0, Math.min(1000000, Number(params.get('maxPrice')) || 0));
  const source = ['photo-guide', 'buyers-guide', 'compare'].includes(params.get('from')) ? params.get('from') : '';
  const shortlist = [...new Set((params.get('vehicles') || '').split(',').filter(vin => /^[A-HJ-NPR-Z0-9]{17}$/.test(vin)))].slice(0, 5).join(',');
  const back = document.getElementById('back-results');
  const search = new URLSearchParams();
  if (request) search.set('q', request);
  if (params.get('modelScope')) search.set('modelScope', params.get('modelScope').slice(0,300));
  if (condition) search.set('condition', condition);
  if (equipment) search.set('requestedEquipment', equipment);
  if (preferences) search.set('preferences', preferences);
  if (budget) search.set('maxPrice', budget);
  if (source) search.set('from', source);
  if (params.get('guideTrim')) search.set('guideTrim',params.get('guideTrim').slice(0,100));
  if (params.get('advisor') === 'Ryan') search.set('advisor', 'Ryan');
  if (back && (search.size || source)) {
    if (source === 'photo-guide'||source === 'buyers-guide') {
      back.href = '/perfect-match?' + search + '#photo-finder';
      back.textContent = source==='buyers-guide'?'← Back to my buying guide':'← Back to my photo guide';
    } else if (source === 'compare') {
      if (shortlist) search.set('vehicles', shortlist);
      back.href = '/compare?' + search;
      back.textContent = '← Back to my comparison';
    } else back.href = '/inventory?' + search;
  }
  const description = [request, condition ? 'Shopping: ' + condition : '', equipment ? 'My feature preferences: ' + equipment : '', budget ? 'Maximum listed price: $' + budget.toLocaleString('en-US') : ''].filter(Boolean).join('\n');
  if (!description && !preferences) return;
  for (const link of document.querySelectorAll('a[href^="/contact?"], a[href^="/compare?"], a[href^="sms:"]')) {
    const url = new URL(link.href);
    if (url.protocol === 'sms:') {
      // Text-message links must percent-encode spaces: URLSearchParams would write "+",
      // and messaging apps show those plus signs literally.
      const body = (url.searchParams.get('body') || '') + '\n' + description;
      link.href = link.getAttribute('href').split('?')[0] + '?body=' + encodeURIComponent(body);
      continue;
    } else if (url.pathname === '/contact') {
      url.searchParams.set('request', description+(source==='buyers-guide'&&preferences?'\nMy complete guide: https://carswithsam.com/perfect-match?'+search:''));
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
  const initialAlt = main.alt;
  if (count) {
    count.setAttribute('role', 'status');
    count.setAttribute('aria-live', 'polite');
    count.setAttribute('aria-atomic', 'true');
  }
  let current = 0;
  const markCurrent = () => links.forEach((a, k) => a.setAttribute('aria-current', k === current ? 'true' : 'false'));
  markCurrent();
  const show = (n, scrollThumb = true) => {
    current = (n + links.length) % links.length;
    // A stale srcset takes precedence over src and keeps showing the previous photo.
    main.removeAttribute('srcset');
    main.src = links[current].href;
    main.alt = links[current].querySelector('img')?.alt || `${initialAlt} — photo ${current + 1} of ${links.length}`;
    markCurrent();
    if (count) count.textContent = (current + 1) + ' / ' + links.length;
    if (scrollThumb) {
      const strip = links[current].parentNode;
      const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      strip.scrollTo({ left: links[current].offsetLeft - strip.clientWidth / 2 + links[current].clientWidth / 2, behavior: reducedMotion ? 'instant' : 'smooth' });
    }
  };
  links.forEach((a, k) => {
    a.addEventListener('click', e => {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || (e.button != null && e.button !== 0)) return;
      e.preventDefault(); show(k);
    });
    a.addEventListener('keydown', e => {
      if (e.altKey || e.ctrlKey || e.metaKey || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      show(e.key === 'Home' ? 0 : e.key === 'End' ? links.length - 1 : k + (e.key === 'ArrowRight' ? 1 : -1));
      links[current].focus({ preventScroll: true });
    });
  });
  document.querySelector('.photo-prev')?.addEventListener('click', () => show(current - 1));
  document.querySelector('.photo-next')?.addEventListener('click', () => show(current + 1));
  let touchStart = null;
  main.addEventListener('touchstart', e => {
    const touch = e.touches.length === 1 ? e.touches[0] : null;
    touchStart = touch ? { x: touch.clientX, y: touch.clientY, id: touch.identifier } : null;
  }, { passive: true });
  main.addEventListener('touchmove', e => { if (e.touches.length !== 1) touchStart = null; }, { passive: true });
  main.addEventListener('touchcancel', () => { touchStart = null; }, { passive: true });
  main.addEventListener('touchend', e => {
    const start = touchStart; touchStart = null;
    if (!start || e.touches.length) return;
    const touch = [...e.changedTouches].find(t => t.identifier === start.id);
    if (!touch) return;
    const dx = touch.clientX - start.x, dy = touch.clientY - start.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) show(current + (dx < 0 ? 1 : -1));
  }, { passive: true });
})();
