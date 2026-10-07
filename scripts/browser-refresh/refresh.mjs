// Inventory refresh from a browser-driven capture. See RUNBOOK.md in this folder.
//   node refresh.mjs ingest [--results <dir>]   collect captured pages and sticker texts from saved tool results
//   node refresh.mjs build                      validate the capture and build a candidate; lists the VINs to sticker-check
//   node refresh.mjs apply                      merge sticker results and write data/*.json and data/*.js in the repo
// Nothing is written to the site's data files until `apply` passes every check.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalize } from '../../inventory-engine.mjs';
import { analyzeSticker } from '../../equipment-search.mjs';
import { browserInventoryScript, vehiclePhotosJson } from '../browser-data.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const WORK = process.env.REFRESH_WORK || path.join(os.tmpdir(), 'cws-browser-refresh');
const PFX = 'https://cloudflareimages.dealereprocess.com/resrc/images/c_limit,fl_lossy,w_auto/v1/dvp/5427/';
const PER_PAGE = 48, STORE = '18393', HOST = 'www.covertchryslerdodgejeepram.com';
const STICKER_URL = 'https://www.chrysler.com/hostd/windowsticker/getWindowStickerPdf.do?vin=';
const STALE_HOURS = 30;          // the site warns shoppers once the snapshot is older than this
const MAX_CAPTURE_AGE = 60 * 60e3; // a capture must be built within an hour of being read
const STICKER_CAP = 60;          // most sticker lookups in one run
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const write = (p, v) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, typeof v === 'string' ? v : JSON.stringify(v)); };
const work = name => path.join(WORK, name);
const kindOf = url => new URL(url).searchParams.get('tp');
const pageUrl = (kind, p) => `https://${HOST}/search/${kind === 'new' ? 'new-chrysler-dodge-jeep-ram' : 'used'}/?ct=${PER_PAGE}&lc=${STORE}&p=${p}&tp=${kind}`;

// ---------- ingest ----------
function payloads(text, tag) {
  const out = [], re = new RegExp(tag + '([\\[{][\\s\\S]*?[\\]}])END' + tag, 'g');
  for (const m of text.matchAll(re)) {
    let value;
    try { value = JSON.parse(m[1]); }
    catch { try { value = JSON.parse(JSON.parse('"' + m[1] + '"')); } catch { continue; } } // the tool may have string-escaped it
    out.push(value);
  }
  return out;
}
function resultFiles(extraDirs) {
  const dirs = [...extraDirs];
  const projects = path.join(os.homedir(), '.claude', 'projects');
  if (fs.existsSync(projects)) for (const project of fs.readdirSync(projects)) {
    const base = path.join(projects, project);
    if (!fs.statSync(base).isDirectory()) continue;
    for (const session of fs.readdirSync(base)) { const dir = path.join(base, session, 'tool-results'); if (fs.existsSync(dir)) dirs.push(dir); }
  }
  const files = [];
  for (const dir of dirs) for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name), stat = fs.statSync(file);
    if (stat.isFile() && /\.(txt|json)$/.test(name) && Date.now() - stat.mtimeMs < 3 * 3600e3) files.push([stat.mtimeMs, file]);
  }
  return files.sort((a, b) => a[0] - b[0]).map(f => f[1]);
}
function ingest(extraDirs) {
  const pages = new Map(), stickers = {};
  for (const file of resultFiles(extraDirs)) {
    const raw = fs.readFileSync(file, 'utf8');
    if (!raw.includes('ENDCAPTURE') && !raw.includes('ENDSTICKERS')) continue;
    let texts = [raw];
    try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) texts = parsed.map(x => x?.text || ''); } catch { /* plain text */ }
    for (const text of texts) {
      if (text.includes('truncated: content too large')) { console.log('TRUNCATED result ignored:', path.basename(file)); continue; }
      for (const pg of payloads(text, 'CAPTURE')) {
        if (!pg?.sourceUrl || !Array.isArray(pg.records)) continue;
        for (const r of pg.records) {
          r.photoUrls = (r.photoUrls || []).map(u => u.startsWith('~') ? PFX + u.slice(1) : u);
          r.photoUrl = r.photoUrls[0] || null; r.locationEvidence = pg.sourceUrl;
        }
        const key = kindOf(pg.sourceUrl) + '|' + pg.page, old = pages.get(key);
        if (!old || old.capturedAt < pg.capturedAt) pages.set(key, pg); // keep the newest read of each page
      }
      for (const list of payloads(text, 'STICKERS')) for (const r of list) if (r?.vin && (!stickers[r.vin] || stickers[r.vin].at < r.at)) stickers[r.vin] = r;
    }
  }
  const list = [...pages.values()].sort((a, b) => (kindOf(a.sourceUrl) + String(a.page).padStart(3, '0')).localeCompare(kindOf(b.sourceUrl) + String(b.page).padStart(3, '0')));
  write(work('pages.json'), list); write(work('sticker-texts.json'), stickers);
  for (const kind of ['new', 'used']) {
    const group = list.filter(p => kindOf(p.sourceUrl) === kind), total = group[0]?.advertisedTotal;
    console.log(`\n${kind.toUpperCase()}: ${group.length} page(s) captured` + (Number.isInteger(total) ? `, site says ${total} vehicles = ${Math.ceil(total / PER_PAGE)} page(s)` : ''));
    for (const p of group) console.log(`  page ${p.page}: ${p.records.length} vehicles, total ${p.advertisedTotal}, store ${p.storeVerified ? 'ok' : 'NOT VERIFIED'}, width ${p.viewportWidth ?? '?'}, read ${p.capturedAt}`);
    if (!group.length) console.log('  next: ' + pageUrl(kind, 1));
    else if (Number.isInteger(total)) {
      const have = new Set(group.map(p => p.page)), missing = [];
      for (let p = 1; p <= Math.ceil(total / PER_PAGE); p++) if (!have.has(p)) missing.push(p);
      if (missing.length) { console.log('  MISSING pages: ' + missing.join(', ')); for (const p of missing) console.log('    ' + pageUrl(kind, p)); }
    }
  }
  const got = Object.values(stickers);
  console.log(`\nSticker results: ${got.length} (${got.filter(r => r.text).length} with text, ${got.filter(r => r.small).length} no sticker published, ${got.filter(r => !r.text && !r.small).length} other)`);
}

// ---------- validate + build ----------
export function validatePages(pages, now = Date.now()) {
  if (!Array.isArray(pages) || !pages.length) throw Error('No capture pages');
  const vins = new Set();
  for (const kind of ['new', 'used']) {
    const group = pages.filter(p => kindOf(p.sourceUrl) === kind), total = group[0]?.advertisedTotal;
    if (!Number.isInteger(total) || total < 1 || group.length !== Math.ceil(total / PER_PAGE)) throw Error('Incomplete ' + kind + ' pagination');
    const nums = new Set();
    for (const p of group) {
      const u = new URL(p.sourceUrl), t = Date.parse(p.capturedAt);
      if (u.hostname !== HOST || u.searchParams.get('lc') !== STORE || !p.storeVerified) throw Error('Wrong or unverified store on ' + kind + ' page ' + p.page);
      if (!Number.isFinite(t) || t > now + 300000 || now - t > MAX_CAPTURE_AGE) throw Error('Stale capture: ' + kind + ' page ' + p.page + ' was read at ' + p.capturedAt);
      if (p.advertisedTotal !== total || nums.has(p.page) || p.page < 1 || p.page > group.length) throw Error('Totals changed during the capture, or a duplicate page (' + kind + ' page ' + p.page + ')');
      nums.add(p.page);
      if (p.records.length !== Math.min(PER_PAGE, total - (p.page - 1) * PER_PAGE)) throw Error('Partial page: ' + kind + ' page ' + p.page + ' has ' + p.records.length + ' vehicles');
      for (const r of p.records) {
        if (vins.has(r.vin) || !new RegExp('^' + kind + ' ', 'i').test(r.title)) throw Error('Duplicate VIN or wrong condition: ' + r.vin);
        normalize({ ...r, salePrice: /^\d+(\.\d+)?$/.test(r.salePrice || '') ? r.salePrice : null }, p.capturedAt);
        for (const photo of r.photoUrls || []) { const v = new URL(photo); if (v.protocol !== 'https:' || v.hostname !== 'cloudflareimages.dealereprocess.com' || !v.pathname.startsWith('/resrc/images/')) throw Error('Unexpected photo source'); }
        vins.add(r.vin);
      }
    }
  }
  if (pages.some(p => !['new', 'used'].includes(kindOf(p.sourceUrl)))) throw Error('Unexpected segment');
  return vins.size;
}
export function build(pages, previous, previousEquipment, now = Date.now()) {
  const count = validatePages(pages, now);
  const earliest = Math.min(...pages.map(p => Date.parse(p.capturedAt)));
  const latestPrevious = Math.max(Date.parse(previous.capturedAt) || 0, ...(previous.vehicles || []).map(v => Date.parse(v.observedAt) || 0));
  if (earliest < latestPrevious) throw Error('Out-of-order capture; the published inventory is newer');
  for (const kind of ['New', 'Used']) {
    const oldCount = (previous.vehicles || []).filter(v => v.condition === kind && v.status !== 'not-observed').length;
    const newCount = pages.filter(p => kindOf(p.sourceUrl) === kind.toLowerCase()).reduce((n, p) => n + p.records.length, 0);
    if (newCount < oldCount * .75) throw Error('Large ' + kind + ' inventory drop (' + oldCount + ' to ' + newCount + '); needs a person to confirm');
  }
  const prior = new Map(previous.vehicles.map(v => [v.vin, v]));
  const records = {}, changes = [], vehicles = [];
  for (const p of pages) for (const row of p.records) {
    const fee = row.priceDetails?.find(d => /^(Doc Fee:|Documentation Fee:?)$/i.test(d.label))?.value;
    const docFee = fee && /^\+?\$[\d,]+(?:\.\d{2})?$/.test(fee) ? Number(fee.replace(/[$+,]/g, '')) : row.docFee;
    const v = normalize({ ...row, docFee, salePrice: /^\d+(\.\d+)?$/.test(row.salePrice || '') ? row.salePrice : null }, p.capturedAt);
    const old = prior.get(v.vin), evidence = previousEquipment.records[v.vin];
    v.carfaxUrl = old?.carfaxUrl || null;
    v.title = v.title.replace(/^NEW /, 'New ').replace(/^USED /, 'Used ');
    v.firstSeenAt = old?.firstSeenAt || p.capturedAt;
    v.photoUrls = row.photoUrls; v.photoCheckedAt = p.capturedAt;
    v.priceLabel = row.priceLabel || v.priceLabel; v.priceDetails = row.priceDetails;
    if (evidence) { records[v.vin] = evidence; if (evidence.status === 'verified') { v.stickerUrl = evidence.sourceUrl; v.stickerCheckedAt = evidence.checkedAt; v.featuresVerified = true; v.features = old?.features || []; } }
    else records[v.vin] = { vin: v.vin, status: 'unavailable', checkedAt: null, sourceUrl: null, features: {}, lines: [], reason: 'Original window sticker has not yet been verified.' };
    if (!old) changes.push({ vin: v.vin, field: 'first-observed', after: v.title, at: p.capturedAt });
    else for (const key of ['price', 'miles', 'status']) if (old[key] !== v[key]) changes.push({ vin: v.vin, field: key, before: old[key], after: v[key], at: p.capturedAt });
    vehicles.push(v);
  }
  const keys = v => Object.keys(v).sort().join();
  if (previous.vehicles[0] && vehicles.some(v => keys(v) !== keys(previous.vehicles[0]))) throw Error('Vehicle record shape differs from the published data');
  const current = new Set(vehicles.map(v => v.vin));
  const removed = previous.vehicles.filter(v => !current.has(v.vin) && v.status !== 'not-observed').map(v => v.vin);
  const capturedAt = pages.map(p => p.capturedAt).sort().at(-1);
  const inventory = { version: 2, scope: 'store-18393-new-and-used', capturedAt, advertisedTotal: count, capturedCount: count, complete: true, staleHours: STALE_HOURS, newCount: vehicles.filter(v => v.condition === 'New').length, usedCount: vehicles.filter(v => v.condition === 'Used').length, vehicles, changes };
  const verified = Object.values(records).filter(r => r.status === 'verified').length;
  const equipment = { ...previousEquipment, total: count, verified, unavailable: count - verified, records };
  const report = { capturedAt, count, new: inventory.newCount, used: inventory.usedCount, added: changes.filter(c => c.field === 'first-observed').length, removed: removed.length, priceChanges: changes.filter(c => c.field === 'price').length, mileageChanges: changes.filter(c => c.field === 'miles').length, verified, unverified: count - verified };
  return { inventory, equipment, report };
}
// Which unverified vehicles are worth a sticker lookup this run: Stellantis brands only (the sticker site covers no
// others), never-checked first, then new vehicles not checked for 2 days and used ones not checked for 14.
export function stickerCandidates(inventory, equipment, now = Date.now()) {
  const due = [];
  for (const v of inventory.vehicles) {
    const r = equipment.records[v.vin];
    if (r.status === 'verified' || !/\b(Jeep|Ram|Dodge|Chrysler|Fiat|Wagoneer|Alfa Romeo)\b/i.test(v.title)) continue;
    const age = r.checkedAt ? now - Date.parse(r.checkedAt) : Infinity;
    if (age >= (v.condition === 'New' ? 2 : 14) * 86400e3) due.push([age, v.vin]);
  }
  return due.sort((a, b) => b[0] - a[0]).slice(0, STICKER_CAP).map(d => d[1]);
}

// ---------- apply ----------
function apply() {
  const inv = read(work('candidate-inventory.json')), eq = read(work('candidate-equipment.json'));
  const texts = fs.existsSync(work('sticker-texts.json')) ? read(work('sticker-texts.json')) : {};
  const prevEq = read(path.join(REPO, 'data/equipment-index.json'));
  const wanted = new Set(fs.existsSync(work('sticker-vins.json')) ? read(work('sticker-vins.json')) : []);
  let newly = 0, none = 0;
  for (const v of inv.vehicles) {
    const t = texts[v.vin];
    if (!t || !wanted.has(v.vin) || eq.records[v.vin].status === 'verified') continue;
    const unavailable = reason => { eq.records[v.vin] = { vin: v.vin, status: 'unavailable', checkedAt: t.at, sourceUrl: null, features: {}, lines: [], reason }; none++; };
    if (!t.text) { unavailable(t.small ? 'Manufacturer returned no window sticker for this VIN.' : t.error || (t.notPdf ? 'Sticker address did not return a PDF.' : 'HTTP ' + t.http)); continue; }
    let a;
    // The browser's PDF reader puts a stray "A" before the header on some stickers; the analyzer expects the header first.
    try { a = analyzeSticker(t.text.replace(/^A\s+(?=20\d{2} MODEL YEAR)/, ''), v.vin); } catch (e) { unavailable(String(e.message || e)); continue; }
    if (!a.lines?.length) { unavailable('Sticker had no readable equipment lines.'); continue; }
    eq.records[v.vin] = { vin: v.vin, status: 'verified', checkedAt: t.at, sourceUrl: STICKER_URL + v.vin, features: a.features, lines: a.lines, identityLines: a.identityLines, engine: a.engine, equipmentSectionComplete: a.equipmentSectionComplete, sha256: t.sha256 };
    v.stickerUrl = STICKER_URL + v.vin; v.stickerCheckedAt = t.at; v.featuresVerified = true; v.features = v.features || [];
    newly++;
  }
  const recs = Object.values(eq.records);
  eq.total = inv.vehicles.length; eq.verified = recs.filter(r => r.status === 'verified').length; eq.unavailable = eq.total - eq.verified; eq.checkedAt = new Date().toISOString();
  if (recs.length !== inv.vehicles.length) throw Error('Record count mismatch');
  for (const v of inv.vehicles) {
    const r = eq.records[v.vin];
    if ((r.status === 'verified') !== !!v.featuresVerified) throw Error('Verified flag mismatch ' + v.vin);
    if (r.status === 'verified') {
      const u = new URL(r.sourceUrl);
      if (!['www.chrysler.com', 'www.carfax.com'].includes(u.hostname)) throw Error('Unexpected sticker host ' + u.hostname);
      if (u.hostname === 'www.chrysler.com' && u.searchParams.get('vin') !== v.vin) throw Error('Sticker address is for another VIN ' + v.vin);
      if (!r.lines.length) throw Error('Verified record with no lines ' + v.vin);
    }
    const p = prevEq.records[v.vin];
    if (p?.status === 'verified' && JSON.stringify(p) !== JSON.stringify(r)) throw Error('An already-verified sticker record changed ' + v.vin);
  }
  const a = JSON.stringify(inv), b = JSON.stringify(eq);
  write(path.join(REPO, 'data/used-inventory.json'), a); write(path.join(REPO, 'data/used-inventory.js'), browserInventoryScript(inv)); write(path.join(REPO, 'data/vehicle-photos.json'), vehiclePhotosJson(inv));
  write(path.join(REPO, 'data/equipment-index.json'), b); write(path.join(REPO, 'data/equipment-index.js'), 'window.equipmentIndex=' + b + ';');
  const report = { ...read(work('report.json')), newlyVerified: newly, checkedNoSticker: none, verified: eq.verified, unverified: eq.unavailable };
  write(work('report.json'), JSON.stringify(report, null, 2));
  console.log('Data files written.', report);
  console.log(`\nSuggested commit message:\nRefresh inventory: ${report.count} vehicles (${report.new} new, ${report.used} used), ${report.added} added, ${report.removed} removed, ${report.priceChanges} price changes, ${report.verified} sticker-verified`);
}

// ---------- command line ----------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, ...rest] = process.argv.slice(2);
  if (command === 'ingest') {
    const extra = []; for (let i = 0; i < rest.length; i++) if (rest[i] === '--results') extra.push(rest[++i]);
    ingest(extra);
  } else if (command === 'build') {
    const previous = read(path.join(REPO, 'data/used-inventory.json')), previousEquipment = read(path.join(REPO, 'data/equipment-index.json'));
    const result = build(read(work('pages.json')), previous, previousEquipment);
    write(work('candidate-inventory.json'), result.inventory); write(work('candidate-equipment.json'), result.equipment); write(work('report.json'), JSON.stringify(result.report, null, 2));
    const vins = stickerCandidates(result.inventory, result.equipment); write(work('sticker-vins.json'), vins);
    console.log('Capture is valid.', result.report);
    console.log(`\nSticker lookups due: ${vins.length}` + (vins.length ? '\n' + JSON.stringify(vins) : ' (skip the sticker step)'));
  } else if (command === 'apply') apply();
  else { console.log('Usage: node refresh.mjs ingest|build|apply   (work folder: ' + WORK + ')'); process.exit(1); }
}
