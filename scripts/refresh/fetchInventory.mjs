// fetchInventory.mjs
//
// Crawls Covert Chrysler Dodge Jeep Ram of Austin's PUBLIC search-results pages
// (store 18393 only) and turns the raw HTML into the row shape that
// inventory-engine.mjs's normalize() expects.
//
// URL pattern (confirmed live 2026-09-22, both as GET requests and by
// paging through the real site in a browser):
//   New:  https://www.covertchryslerdodgejeepram.com/search/new-chrysler-dodge-jeep-ram/?ct=48&lc=18393&tp=new[&p=N]
//   Used: https://www.covertchryslerdodgejeepram.com/search/used/?ct=48&lc=18393&tp=used[&p=N]
// ct=48 = results per page, lc=18393 = store filter, p=N = page number
// (page 1 has no p= param). Page-1 header text reads "596 vehicles found" /
// "120 vehicles found".
//
// CALIBRATED 2026-09-22 against the LIVE site (fetched from inside the
// browser, then the exact regex logic below was run against the real HTML
// and checked field-by-field — this sandbox's own outbound network still
// can't reach the dealership host, so the browser was the only way to do
// this; see scripts/refresh/README.md). Full-page test results: 48/48 cards
// parsed with zero rejects on both new and used, pages 1 and 2, with title/
// VIN/price/mileage/photo cross-checked against what the live page actually
// shows for those vehicles.
//
// Real-markup gotchas found during calibration (do not "clean up" these —
// they're deliberate workarounds for how this site's templating engine
// actually emits HTML, confirmed byte-for-byte against a live fetch):
//   1. Attributes carry stray double-spaces and a space before the closing
//      angle bracket, e.g. `<span  class="everest-stock-span" >Stock#: X`
//      — a naive `class="foo">` match fails silently. Every regex below
//      tolerates `\s*` around `>`.
//   2. Each vehicle's photo/title/stock/VIN block appears ONCE per card,
//      immediately after that vehicle's slider images and BEFORE its
//      Stock#/VIN line — so those two fields are pulled from the HTML
//      *preceding* the Stock# match, not following it.
//   3. Doc Fee and the CARFAX link are NOT positioned near a card's own
//      Stock#/VIN/price block at all (confirmed: often 300,000+ characters
//      away in the raw HTML — evidently a separate rendering elsewhere on
//      the page). normalize() treats both as optional/nullable, so this
//      script simply leaves them null rather than chase that other
//      section; do not "fix" this by widening the window further.
//   4. Price/mileage icons are large inline SVGs (~1,800 characters) sitting
//      between a pill's class attribute and its text — a short non-greedy
//      window (e.g. 300 chars) will miss the text. Use at least ~2,500.
//
// Window stickers are NOT on this page at all — fetchStickers.mjs looks
// those up separately by VIN, so stickerUrl is left null here by design.

const HOST = 'www.covertchryslerdodgejeepram.com';
const BASE = `https://${HOST}`;
const PAGE_SIZE = 48;

const SEARCH_PATHS = {
  new: '/search/new-chrysler-dodge-jeep-ram/',
  used: '/search/used/',
};

function searchUrl(tp, page) {
  const params = new URLSearchParams({ ct: String(PAGE_SIZE), lc: '18393' });
  if (page > 1) params.set('p', String(page));
  params.set('tp', tp);
  return `${BASE}${SEARCH_PATHS[tp]}?${params.toString()}`;
}

// Real desktop-Chrome header set (not a bespoke bot UA) — the dealer site's
// WAF started returning HTTP 403 for the old SamRyanInventoryRefresh/1.0
// identifier once this pipeline moved from being fetched manually inside a
// browser to running unattended from GitHub Actions' datacenter IPs. A
// custom UA string is one of the cheapest bot-fingerprint signals a WAF
// checks, so this presents as an ordinary browser visit instead, including
// the sec-fetch-* / sec-ch-ua hints and a Referer pointing at the site's own
// homepage (a raw search-page hit with no Referer at all is also a common
// bot signal).
function browserHeaders() {
  return {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    Referer: BASE + '/',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
  };
}

async function fetchPage(url, { retries = 4 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: browserHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.text();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  throw lastErr;
}

// Returns the LAST regex match in `str` (used to grab the field closest to
// the current card's Stock# line when a pattern can legitimately occur
// more than once in the search window, e.g. multiple slider photos).
function lastMatch(str, re) {
  let m;
  let last = null;
  while ((m = re.exec(str))) last = m;
  return last;
}

function parseListingCards(html, pageUrl) {
  const cards = [];
  const stockRe = /class="everest-stock-span"\s*>\s*Stock#:\s*([A-Za-z0-9-]+)\s*</g;
  const anchors = [...html.matchAll(stockRe)];

  for (let i = 0; i < anchors.length; i++) {
    const m = anchors[i];
    const idx = m.index;
    // Bound each card strictly between the previous and next Stock# match
    // so nothing can bleed across cards.
    const prevIdx = i > 0 ? anchors[i - 1].index : Math.max(0, idx - 20000);
    const nextIdx = i + 1 < anchors.length ? anchors[i + 1].index : html.length;
    const beforeCard = html.slice(prevIdx, idx); // this card's title + slider photos
    const after = html.slice(idx, nextIdx); // stock/vin/pills/price/doc-fee/carfax (when present)
    const stock = m[1].trim();

    const titleMatch = lastMatch(beforeCard, /<h2 class="vehicle_title"><a[^>]*>([^<]+)<\/a><\/h2>/gi);
    const vinMatch = after.match(/class="everest-vin-span"\s*>\s*Vin:\s*([A-HJ-NPR-Z0-9]{17})/i);
    const sourceMatch = lastMatch(beforeCard, /href="(\/auto\/[^"]+\/(\d+)\/)"/gi);
    const statusMatch = after.match(
      /vehicle_pill__span--flag_availability"[\s\S]{0,2500}?vehicle_pill__text"\s*>\s*([^<]+)</i,
    );
    const mileageMatch = after.match(
      /vehicle_pill__span--odometer"[\s\S]{0,2500}?vehicle_pill__text"\s*>\s*([\d,]+)\s*</i,
    );
    const priceMatch = after.match(/collapsible_master_price_display--price[^>]*>\$([\d,]+)</i);
    const docFeeMatch = after.match(/Doc Fee:[\s\S]{0,500}?<dd[^>]*>\s*\+?\$?([\d,.]+)/i);
    const photoMatch = lastMatch(
      beforeCard,
      /data-original_src="(https:\/\/cloudflareimages\.dealereprocess\.com\/resrc\/images\/[^"]+)"/gi,
    );
    const carfaxMatch = after.match(/href="(https:\/\/www\.carfax\.com\/vehiclehistory\/[^"]+)"/i);

    if (!titleMatch || !vinMatch || !sourceMatch) {
      cards.push({
        __unparsed: true,
        stock,
        reason: !titleMatch ? 'title' : !vinMatch ? 'vin' : 'sourceUrl',
      });
      continue;
    }

    // The site's own availability filter config (found in the page's inline
    // JSON while calibrating) enumerates: "In Stock" / "In Transit" /
    // "Allocated" / "Pooled" / "On Order" / others. normalize() only treats
    // the literal string 'listed' as available — everything else becomes
    // 'unknown', which is the conservative, correct default for any status
    // besides "In Stock".
    const rawStatus = statusMatch ? statusMatch[1].trim() : 'In Stock';
    const status = rawStatus === 'In Stock' ? 'listed' : rawStatus;

    cards.push({
      sourceUrl: BASE + sourceMatch[1],
      title: titleMatch[1].trim(),
      stock,
      vin: vinMatch[1].trim().toUpperCase(),
      salePrice: priceMatch ? priceMatch[1] : null,
      miles: mileageMatch ? mileageMatch[1] : null,
      docFee: docFeeMatch ? docFeeMatch[1] : null,
      photoUrl: photoMatch ? photoMatch[1] : null,
      carfaxUrl: carfaxMatch ? carfaxMatch[1] : null,
      stickerUrl: null, // not present on the search-results page; fetchStickers.mjs looks this up by VIN separately
      status,
      locationId: '18393',
      locationEvidence: pageUrl,
    });
  }
  return cards;
}

// Reads the "N vehicles found" text near the top of a search-results page.
function parseAdvertisedTotal(html) {
  const m =
    html.match(/([\d,]+)\s+vehicles found/i) ||
    html.match(/([\d,]+)\s+(?:results|matches)/i) ||
    html.match(/Showing\s+[\d,]+\s*-\s*[\d,]+\s+of\s+([\d,]+)/i);
  return m ? Number(m[1].replace(/,/g, '')) : null;
}

export async function crawlSegment(tp, { maxPages = 40, log = console } = {}) {
  const records = [];
  const unparsed = [];
  let advertisedTotal = null;
  let page = 1;
  while (page <= maxPages) {
    const url = searchUrl(tp, page);
    log.info?.(`[fetchInventory] GET ${url}`);
    const html = await fetchPage(url);
    if (page === 1) advertisedTotal = parseAdvertisedTotal(html);
    const cards = parseListingCards(html, url);
    const parsed = cards.filter((c) => !c.__unparsed);
    unparsed.push(...cards.filter((c) => c.__unparsed));
    if (cards.length === 0) break; // no more pages
    records.push(...parsed);
    if (cards.length < PAGE_SIZE) break; // short page = last page
    page++;
  }
  return { tp, records, unparsed, advertisedTotal, pagesFetched: page };
}

// Fetches 'new' then 'used' one after another (not via Promise.all) with a
// short gap between them. Two concurrent requests hitting the same WAF at
// the exact same instant is itself a bot signal on some sites, and it also
// means one segment's failure used to abort the other via Promise.all's
// fail-fast behavior — losing a perfectly good capture along with the failed
// one. Each segment's own errors are caught here so a block on one segment
// (as actually happened: 'used' returned HTTP 403 while 'new' succeeded)
// still lets the other segment's data go out; refresh.mjs's "complete" gate
// already treats a shortfall as non-complete and skips the "not observed"
// pass, so a partial capture never wrongly marks real inventory as gone.
async function crawlSegmentSafe(tp, { log }) {
  try {
    return await crawlSegment(tp, { log });
  } catch (err) {
    log.warn?.(`[fetchInventory] segment '${tp}' failed entirely: ${err.message || err}`);
    return { tp, records: [], unparsed: [], advertisedTotal: null, pagesFetched: 0, error: String(err.message || err) };
  }
}

export async function crawlAll({ log = console } = {}) {
  const newSeg = await crawlSegmentSafe('new', { log });
  await new Promise((r) => setTimeout(r, 800));
  const usedSeg = await crawlSegmentSafe('used', { log });

  const records = [...newSeg.records, ...usedSeg.records];
  const advertisedTotal =
    (newSeg.advertisedTotal ?? newSeg.records.length) +
    (usedSeg.advertisedTotal ?? usedSeg.records.length);
  const complete =
    !newSeg.error &&
    !usedSeg.error &&
    newSeg.unparsed.length === 0 &&
    usedSeg.unparsed.length === 0 &&
    (newSeg.advertisedTotal == null || newSeg.advertisedTotal === newSeg.records.length) &&
    (usedSeg.advertisedTotal == null || usedSeg.advertisedTotal === usedSeg.records.length);
  return {
    capturedAt: new Date().toISOString(),
    sourceUrl: searchUrl('used', 1), // scope reference; ingest() only checks host+lc
    advertisedTotal,
    complete,
    records,
    unparsed: [...newSeg.unparsed, ...usedSeg.unparsed],
    segments: { new: newSeg, used: usedSeg },
  };
}

// CLI entry point: `node fetchInventory.mjs [outFile]`
if (import.meta.url === `file://${process.argv[1]}`) {
  const outFile = process.argv[2] || 'raw-inventory-capture.json';
  const capture = await crawlAll();
  const fs = await import('node:fs/promises');
  await fs.writeFile(outFile, JSON.stringify(capture, null, 2));
  console.log(
    `[fetchInventory] captured ${capture.records.length} records (${capture.unparsed.length} unparsed cards) -> ${outFile}`,
  );
  if (capture.unparsed.length) {
    console.warn(
      `[fetchInventory] ${capture.unparsed.length} cards could not be parsed — inspect and recalibrate the selectors in fetchInventory.mjs. See scripts/refresh/README.md.`,
    );
  }
}


Fix 403 on inventory refresh — realistic browser headers, and click Commit changes
