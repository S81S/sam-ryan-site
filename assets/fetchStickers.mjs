// fetchStickers.mjs
//
// For each VIN in the current inventory, fetches the official Stellantis
// Monroney (window-sticker) PDF and runs it through V22's OWN
// equipment-search.mjs analyzeSticker() — the exact same VIN-matched,
// evidence-only parsing logic the rest of the site already trusts, so this
// automation can't quietly drift from the site's own equipment semantics.
//
// Hostname note (corrected from an earlier assumption of mine): every brand
// — Jeep, Ram, Dodge, Chrysler — resolves through the SAME host,
// www.chrysler.com. This is confirmed by inventory-engine.mjs's own
// stickerLink() validator, which only accepts:
//   https://www.chrysler.com/hostd/windowsticker/getWindowStickerPdf.do?vin=<VIN>
//   https://www.carfax.com/phoenix/sticker/...
// Do not reintroduce jeep.com/dodge.com/ramtrucks.com hosts here.

import { analyzeSticker } from '../../equipment-search.mjs';

const STICKER_HOST = 'www.chrysler.com';
const STICKER_PATH = '/hostd/windowsticker/getWindowStickerPdf.do';

export function stickerUrlFor(vin) {
  return `https://${STICKER_HOST}${STICKER_PATH}?vin=${encodeURIComponent(vin)}`;
}

async function fetchPdfText(url) {
  // unpdf is already a dependency choice from the earlier Worker build; it
  // works fine in plain Node too (it has no Cloudflare-Workers-only APIs).
  const { extractText, getDocumentProxy } = await import('unpdf');
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SamRyanInventoryRefresh/1.0)' },
  });
  if (!res.ok) {
    if (res.status === 404) return { status: 'unavailable', text: null };
    throw new Error(`HTTP ${res.status} fetching sticker for ${url}`);
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  // A missing sticker sometimes comes back as a small HTML "not found" page
  // with a 200 status rather than a real 404 — guard on the PDF magic bytes.
  const isPdf = buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46; // %PDF
  if (!isPdf) return { status: 'unavailable', text: null };
  // Calibrated live 2026-09-22: a VIN with no real sticker on file (e.g. a
  // non-Stellantis trade-in) still returns HTTP 200 with a genuine, tiny
  // one-page "Error PDF" (~1.1KB) rather than a 404 — a real Monroney label
  // PDF runs ~80KB. Short-circuit on size rather than paying for a doomed
  // text-extraction + analyzeSticker() call (which would just throw
  // "Sticker VIN does not match vehicle" after burning a retry).
  const MIN_REAL_STICKER_BYTES = 10000;
  if (buf.length < MIN_REAL_STICKER_BYTES) return { status: 'unavailable', text: null };
  const doc = await getDocumentProxy(buf);
  const { text } = await extractText(doc, { mergePages: true });
  return { status: 'ok', text };
}

export async function fetchOneSticker(vin, { retries = 2 } = {}) {
  const url = stickerUrlFor(vin);
  const now = new Date().toISOString();
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { status, text } = await fetchPdfText(url);
      if (status === 'unavailable') {
        return { vin, status: 'unavailable', checkedAt: now, sourceUrl: null, features: {}, lines: [] };
      }
      const analysis = analyzeSticker(text, vin);
      return {
        vin,
        status: 'verified',
        checkedAt: now,
        sourceUrl: url,
        features: analysis.features,
        lines: analysis.lines,
        engine: analysis.engine,
      };
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  // Could not confirm — record as unavailable rather than guessing. This is
  // the same "unknown is a first-class state" principle used everywhere
  // else in this project.
  return {
    vin,
    status: 'unavailable',
    checkedAt: now,
    sourceUrl: null,
    features: {},
    lines: [],
    error: String(lastErr?.message || lastErr || 'unknown error'),
  };
}

// Fetches stickers for a list of VINs with limited concurrency (the
// dealership/manufacturer endpoint is a shared public resource — be polite).
export async function fetchStickersForVins(vins, { concurrency = 4, log = console } = {}) {
  const results = new Map();
  let i = 0;
  async function worker() {
    while (i < vins.length) {
      const vin = vins[i++];
      log.info?.(`[fetchStickers] ${i}/${vins.length} ${vin}`);
      results.set(vin, await fetchOneSticker(vin));
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, vins.length) }, worker));
  return results;
}

// CLI entry point: `node fetchStickers.mjs <inventory.json> [outFile]`
if (import.meta.url === `file://${process.argv[1]}`) {
  const fs = await import('node:fs/promises');
  const invFile = process.argv[2] || 'data/used-inventory.json';
  const outFile = process.argv[3] || 'sticker-capture.json';
  const inv = JSON.parse(await fs.readFile(invFile, 'utf8'));
  const vins = inv.vehicles.map((v) => v.vin);
  const results = await fetchStickersForVins(vins);
  const records = Object.fromEntries(results);
  const verified = [...results.values()].filter((r) => r.status === 'verified').length;
  const out = {
    version: 1,
    method: 'VIN-matched original window stickers only',
    checkedAt: new Date().toISOString(),
    total: vins.length,
    verified,
    unavailable: vins.length - verified,
    records,
  };
  await fs.writeFile(outFile, JSON.stringify(out, null, 2));
  console.log(`[fetchStickers] verified ${verified}/${vins.length} -> ${outFile}`);
}
