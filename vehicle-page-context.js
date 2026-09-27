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
      url.searchParams.set('body', (url.searchParams.get('body') || '') + '\n' + description);
    } else if (url.pathname === '/contact') {
      url.searchParams.set('request', description);
    } else if (url.pathname === '/compare') {
      if (request) url.searchParams.set('q', request);
      if (condition) url.searchParams.set('condition', condition);
    }
    link.href = url.toString();
  }
})();

