// Run this once in a browser tab that is on https://www.chrysler.com/robots.txt (same site as the sticker files).
// It loads a PDF reader and defines window.__scanBg(list), which reads each VIN's window sticker in the background.
const lib = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/build/pdf.min.mjs');
lib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/build/pdf.worker.min.mjs';
window.__pdf = lib;
window.__readSticker = async vin => {
  const r = await fetch('/hostd/windowsticker/getWindowStickerPdf.do?vin=' + vin, { credentials: 'omit' });
  const at = new Date().toISOString();
  if (!r.ok) return { vin, at, http: r.status };
  const bytes = new Uint8Array(await r.arrayBuffer()), size = bytes.length;
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') return { vin, at, http: r.status, notPdf: true, size };
  if (size < 10000) return { vin, at, http: r.status, size, small: true }; // the "no sticker for this VIN" placeholder
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
    return { vin, at, http: r.status, size, sha256, pages: pdf.numPages, text: lines.join('\n') };
  } catch (e) { return { vin, at, http: r.status, size, sha256, error: String(e.message || e) }; }
  finally { await task.destroy(); }
};
window.__acc = {};
window.__scanBg = list => {
  window.__bgDone = false;
  (async () => {
    for (const vin of list) {
      if (window.__acc[vin]) continue;
      let res;
      try { res = await window.__readSticker(vin); } catch (e) { res = { vin, at: new Date().toISOString(), error: 'fetch: ' + String(e.message || e) }; }
      window.__acc[vin] = res;
      if (res.http && res.http !== 200) break; // stop at the first refusal instead of hammering the site
      await new Promise(r => setTimeout(r, 700));
    }
    window.__bgDone = true;
  })();
  return 'started ' + list.length;
};
'sticker reader ready'
