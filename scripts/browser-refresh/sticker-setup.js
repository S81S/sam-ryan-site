// Run this once in a browser tab that is on one of the sticker sources below (the refresh tells you which address to
// open for each group of VINs). The tab has to be on the same site as the sticker files so they can be read.
// It loads a PDF reader and defines window.__scanBg(list), which reads each VIN's window sticker in the background.
// Keep this table in step with scripts/browser-refresh/sticker-sources.mjs.
const PATHS = {
  'www.chrysler.com': '/hostd/windowsticker/getWindowStickerPdf.do?vin=',
  'cws.gm.com': '/vs-cws/vehshop/v2/vehicle/windowsticker?vin=',
  'www.hyundaiusa.com': '/var/hyundai/services/inventory/monroney.pdf?model=Venue&vin=',
  'www.windowsticker.forddirect.com': '/windowsticker.pdf?vin=',
  'carswithsam.com': '/api/original-sticker?vin=',
};
const source = location.hostname, path = PATHS[source];
if (!path) throw new Error('This tab is on ' + source + ', which is not a window sticker source. Open the address the refresh listed.');
const lib = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/build/pdf.min.mjs');
lib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/build/pdf.worker.min.mjs';
window.__pdf = lib;
window.__readSticker = async vin => {
  const r = await fetch(path + vin, { credentials: 'omit' });
  const at = new Date().toISOString();
  if (!r.ok) return { vin, at, source, http: r.status };
  const bytes = new Uint8Array(await r.arrayBuffer()), size = bytes.length;
  // An empty or non-PDF reply is how GM and Hyundai say "no sticker for this VIN".
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') return { vin, at, source, http: r.status, notPdf: true, size };
  if (size < 10000) return { vin, at, source, http: r.status, size, small: true }; // Chrysler's "no sticker for this VIN" placeholder
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const sha256 = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  const task = window.__pdf.getDocument({ data: bytes, isEvalSupported: false, disableFontFace: true });
  try {
    const pdf = await task.promise, lines = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const content = await (await pdf.getPage(i)).getTextContent(); let line = '';
      for (const item of content.items) { line += item.str + ' '; if (item.hasEOL) { lines.push(line.trim()); line = ''; } }
      if (line.trim()) lines.push(line.trim());
    }
    return { vin, at, source, http: r.status, size, sha256, pages: pdf.numPages, text: lines.join('\n') };
  } catch (e) { return { vin, at, source, http: r.status, size, sha256, error: String(e.message || e) }; }
  finally { await task.destroy(); }
};
window.__acc = {};
window.__scanBg = list => {
  window.__bgDone = false;
  (async () => {
    for (const vin of list) {
      if (window.__acc[vin]) continue;
      let res;
      try {
        res = await window.__readSticker(vin);
        // GM sometimes answers with an empty body for a VIN it does have; ask once more before accepting "none".
        if (res.notPdf && res.size === 0) { await new Promise(r => setTimeout(r, 1500)); res = await window.__readSticker(vin); }
      } catch (e) { res = { vin, at: new Date().toISOString(), source, error: 'fetch: ' + String(e.message || e) }; }
      window.__acc[vin] = res;
      // 404 is an ordinary "no sticker" answer. Anything else that is not 200 is a refusal: stop instead of hammering the site.
      if (res.http && res.http !== 200 && res.http !== 404) break;
      await new Promise(r => setTimeout(r, source === 'carswithsam.com' ? 1500 : 700));
    }
    window.__bgDone = true;
  })();
  return 'started ' + list.length + ' on ' + source;
};
'sticker reader ready on ' + source
