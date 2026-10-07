(() => {
  const params = new URLSearchParams(location.search);
  const request = (params.get('q') || '').slice(0, 1000);
  const condition = ['New', 'Used', 'Both'].includes(params.get('condition')) ? params.get('condition') : '';
  const back = document.getElementById('back-results');
  const search = new URLSearchParams();
  if (request) search.set('q', request);
  if (condition) search.set('condition', condition);
  if (back && search.size) back.href = '/inventory?' + search;
  const description = [request, condition ? 'Shopping: ' + condition : ''].filter(Boolean).join('\n');
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
      if (request) url.searchParams.set('q', request);
      if (condition) url.searchParams.set('condition', condition);
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
