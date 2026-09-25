// refresh.mjs — the orchestrator.
//
// Replaces the "runs every four hours in the local Codex app / requires the
// computer to stay on" step described in README.txt. This script is meant
// to run unattended from GitHub Actions (see ../../.github/workflows/
// refresh-inventory.yml): it re-crawls the dealership's public search pages,
// re-checks window stickers for VINs that don't have verified equipment yet
// (or whose sticker data has gone stale), merges the result into
// data/used-inventory.json / data/equipment-index.json in the SAME shape the
// site's front-end code already reads, and exits. GitHub Actions then
// commits the changed files, and Cloudflare Pages redeploys automatically.
//
// It deliberately reuses the project's own validation/parsing logic instead
// of re-implementing it:
//   - normalize()      from inventory-engine.mjs  (per-vehicle validation)
//   - analyzeSticker()  from equipment-search.mjs   (via fetchStickers.mjs)
// so this pipeline can't drift from what the rest of the site trusts.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalize } from '../../inventory-engine.mjs';
import { crawlAll } from './fetchInventory.mjs';
import { fetchStickersForVins } from './fetchStickers.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const INVENTORY_JSON = path.join(ROOT, 'data/used-inventory.json');
const INVENTORY_JS = path.join(ROOT, 'data/used-inventory.js');
const EQUIPMENT_JSON = path.join(ROOT, 'data/equipment-index.json');
const EQUIPMENT_JS = path.join(ROOT, 'data/equipment-index.js');

const STICKER_STALE_DAYS = 14; // re-check a verified sticker at most this often
const STICKER_RECHECK_UNAVAILABLE_DAYS = 3; // retry "unavailable" stickers sooner — often just not published yet

async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

function daysSince(iso) {
  if (!iso) return Infinity;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return Infinity;
  return (Date.now() - t) / 86400000;
}

// ---- Phase A: crawl + validate inventory --------------------------------

async function refreshInventory(previous, { log = console } = {}) {
  const capture = await crawlAll({ log });
  const capturedAt = capture.capturedAt;

  const seen = new Map();
  const rejects = [];
  for (const raw of capture.records) {
    try {
      const v = normalize(raw, capturedAt);
      if (seen.has(v.vin)) {
        rejects.push({ vin: v.vin, reason: 'duplicate VIN in this capture' });
        continue;
      }
      seen.set(v.vin, v);
    } catch (err) {
      rejects.push({ stock: raw.stock, vin: raw.vin, reason: String(err.message || err) });
    }
  }

  const old = new Map((previous?.vehicles || []).map((v) => [v.vin, v]));
  const changes = [];
  for (const [vin, v] of seen) {
    const prior = old.get(vin);
    if (prior) {
      // Preserve identity/history fields normalize() can't know about.
      v.firstSeenAt = prior.firstSeenAt || capturedAt;
      v.stickerUrl = v.stickerUrl || prior.stickerUrl;
      v.stickerCheckedAt = prior.stickerCheckedAt;
      v.features = prior.features;
      v.featuresVerified = prior.featuresVerified;
      for (const key of ['price', 'miles', 'status']) {
        if (prior[key] !== v[key]) {
          changes.push({ vin, field: key, before: prior[key], after: v[key], at: capturedAt });
        }
      }
    } else {
      changes.push({ vin, field: 'first-observed', before: null, after: v.title, at: capturedAt });
    }
    old.set(vin, v);
  }

  // Conservative "not observed" marking: only when this pass covered both
  // segments cleanly (no unparsed cards) and the advertised totals line up,
  // matching inventory-engine.mjs's own "missing is never sold" rule.
  const complete = capture.complete && rejects.length === 0;
  if (complete) {
    for (const [vin, v] of old) {
      if (!seen.has(vin) && v.status !== 'not-observed') {
        const updated = { ...v, status: 'not-observed', observedAt: capturedAt };
        old.set(vin, updated);
        changes.push({ vin, field: 'status', before: v.status, after: 'not-observed', at: capturedAt });
      }
    }
  } else {
    log.warn?.(
      `[refresh] capture incomplete (${rejects.length} rejected records, complete=${capture.complete}) — skipping "not observed" pass this run`,
    );
  }

  const vehicles = [...old.values()];
  const newCount = vehicles.filter((v) => v.condition === 'New' && v.status !== 'not-observed').length;
  const usedCount = vehicles.filter((v) => v.condition === 'Used' && v.status !== 'not-observed').length;

  const merged = {
    version: 2,
    scope: 'store-18393-new-and-used',
    capturedAt,
    advertisedTotal: capture.advertisedTotal ?? seen.size,
    capturedCount: seen.size,
    complete,
    staleHours: 24,
    vehicles,
    changes: [...(previous?.changes || []), ...changes].slice(-500), // keep a bounded rolling log
    newCount,
    usedCount,
  };

  return { merged, rejects, capture };
}

// ---- Phase B: refresh window stickers for VINs that need it -------------

function vinsNeedingSticker(vehicles, equipmentIndex) {
  const records = equipmentIndex?.records || {};
  return vehicles
    .filter((v) => v.status !== 'not-observed')
    .map((v) => v.vin)
    .filter((vin) => {
      const r = records[vin];
      if (!r) return true;
      if (r.status === 'verified') return daysSince(r.checkedAt) > STICKER_STALE_DAYS;
      return daysSince(r.checkedAt) > STICKER_RECHECK_UNAVAILABLE_DAYS;
    });
}

async function refreshStickers(vehicles, previousIndex, { log = console, limit } = {}) {
  let vins = vinsNeedingSticker(vehicles, previousIndex);
  if (limit) vins = vins.slice(0, limit);
  log.info?.(`[refresh] fetching ${vins.length} window sticker(s)`);
  const fresh = vins.length ? await fetchStickersForVins(vins, { log }) : new Map();

  const records = { ...(previousIndex?.records || {}) };
  for (const [vin, rec] of fresh) records[vin] = rec;

  // Drop records for VINs no longer in inventory to keep the file bounded.
  const currentVins = new Set(vehicles.map((v) => v.vin));
  for (const vin of Object.keys(records)) {
    if (!currentVins.has(vin)) delete records[vin];
  }

  const verified = Object.values(records).filter((r) => r.status === 'verified').length;
  const total = Object.keys(records).length;

  // Reflect verified-status back onto the vehicle rows, same as the rest of
  // the site expects (features/featuresVerified live on both files).
  for (const v of vehicles) {
    const r = records[v.vin];
    if (r?.status === 'verified') {
      v.stickerUrl = r.sourceUrl;
      v.stickerCheckedAt = r.checkedAt;
      v.featuresVerified = true;
    }
  }

  return {
    index: {
      version: 1,
      method: 'VIN-matched original window stickers only',
      checkedAt: new Date().toISOString(),
      total,
      verified,
      unavailable: total - verified,
      records,
    },
    fetchedCount: vins.length,
  };
}

// ---- main -----------------------------------------------------------------

export async function run({ log = console, stickerLimit } = {}) {
  const previousInventory = await readJson(INVENTORY_JSON);
  const previousEquipment = await readJson(EQUIPMENT_JSON);

  log.info?.('[refresh] phase A: crawling inventory');
  const { merged: inventory, rejects } = await refreshInventory(previousInventory, { log });
  log.info?.(
    `[refresh] inventory: ${inventory.vehicles.length} total (${inventory.newCount} new, ${inventory.usedCount} used), ${rejects.length} rejected records`,
  );

  log.info?.('[refresh] phase B: refreshing window stickers');
  const { index: equipment, fetchedCount } = await refreshStickers(inventory.vehicles, previousEquipment, {
    log,
    limit: stickerLimit,
  });
  log.info?.(`[refresh] stickers: ${equipment.verified}/${equipment.total} verified (${fetchedCount} fetched this run)`);

  await fs.mkdir(path.dirname(INVENTORY_JSON), { recursive: true });
  await fs.writeFile(INVENTORY_JSON, JSON.stringify(inventory));
  await fs.writeFile(INVENTORY_JS, `window.usedInventoryData=${JSON.stringify(inventory)};`);
  await fs.writeFile(EQUIPMENT_JSON, JSON.stringify(equipment));
  await fs.writeFile(EQUIPMENT_JS, `window.equipmentIndex=${JSON.stringify(equipment)};`);

  if (rejects.length) {
    const rejectFile = path.join(ROOT, 'scripts/refresh/last-run-rejects.json');
    await fs.writeFile(rejectFile, JSON.stringify(rejects, null, 2));
    log.warn?.(`[refresh] wrote ${rejects.length} rejected record(s) to ${rejectFile}`);
  }

  return { inventory, equipment, rejects };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const stickerLimitArg = process.argv.find((a) => a.startsWith('--sticker-limit='));
  const stickerLimit = stickerLimitArg ? Number(stickerLimitArg.split('=')[1]) : undefined;
  run({ stickerLimit })
    .then(() => {
      console.log('[refresh] done');
    })
    .catch((err) => {
      console.error('[refresh] FAILED:', err);
      process.exitCode = 1;
    });
}
