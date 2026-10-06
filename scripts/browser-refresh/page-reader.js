// Run this in the browser on ONE dealer search page, after it has loaded at desktop width (1440px or wider).
// It returns that page's listings as CAPTURE{json}ENDCAPTURE, padded so the result is saved to a file
// instead of being pasted into the conversation. `node refresh.mjs ingest` reads those files.
await new Promise(r => setTimeout(r, 1500));
(() => {
  const PFX = 'https://cloudflareimages.dealereprocess.com/resrc/images/c_limit,fl_lossy,w_auto/v1/dvp/5427/';
  const body = document.body.innerText, sourceUrl = location.href;
  const pg = {
    sourceUrl, capturedAt: new Date().toISOString(), viewportWidth: window.innerWidth,
    advertisedTotal: Number((body.match(/([\d,]+)\s*Results Found/i) || [])[1]?.replaceAll(',', '')),
    storeVerified: body.includes('8107 Research Blvd') && !!document.querySelector('a.selected[data-filter-field="location_id"][data-filter-value="18393"]'),
    page: Number(document.querySelector('input[name="pagination_settings_input"]')?.value),
    records: Array.from(document.querySelectorAll('.vehicle_item')).map(c => {
      const txt = s => c.querySelector(s)?.textContent.trim() || null;
      const photos = [...new Set(Array.from(c.querySelectorAll('img.loopslider__image')).map(i => i.getAttribute('data-original_src') || i.src).filter(u => u?.startsWith('https://cloudflareimages.dealereprocess.com/resrc/images/')))];
      return {
        title: txt('h2.vehicle_title'), stock: txt('.everest-stock-span')?.replace(/^Stock#:\s*/i, ''), vin: txt('.everest-vin-span')?.replace(/^Vin:\s*/i, ''),
        sourceUrl: c.querySelector('h2.vehicle_title a')?.href,
        salePrice: txt('.collapsible_master_price_display--price')?.replace(/[$,]/g, ''), priceLabel: txt('.collapsible_master_price_display--text'),
        miles: txt('.vehicle_pill__span--odometer .vehicle_pill__text')?.replaceAll(',', ''),
        status: txt('.vehicle_pill__span--flag_availability .vehicle_pill__text') === 'In Stock' ? 'listed' : 'unknown',
        // Photo addresses share one long prefix; "~" stands for it to keep each page under the transfer limit.
        photoUrls: photos.map(u => u.startsWith(PFX) ? '~' + u.slice(PFX.length) : u),
        docFee: Array.from(c.querySelectorAll('dt')).find(e => /Documentation Fee/i.test(e.textContent))?.nextElementSibling?.textContent.trim().replace(/[$+,]/g, '') || null,
        priceDetails: Array.from(c.querySelectorAll('dt')).map(e => ({ label: e.textContent.trim(), value: e.nextElementSibling?.textContent.trim() })),
        locationId: '18393',
      };
    }),
  };
  const s = 'CAPTURE' + JSON.stringify(pg) + 'ENDCAPTURE';
  return s + ' '.repeat(Math.max(0, 135000 - s.length));
})()
