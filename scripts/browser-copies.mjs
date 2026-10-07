// Keeps the files the browser loads in step with the two source files.
//
// data/used-inventory.json and data/equipment-index.json are the source of truth. Three other files are made from
// them: data/used-inventory.js (the copy search pages load), data/vehicle-photos.json (the photo galleries, fetched
// on demand) and data/equipment-index.js. The refresh writes all five, but whoever publishes can leave one out of
// the commit, and then shoppers see stale galleries or equipment. The "Build searchable vehicle pages" workflow runs
// this after every data push so a missed file is repaired within a minute.
//
//   node scripts/browser-copies.mjs           rewrite any copy that is out of step
//   node scripts/browser-copies.mjs --check   report only; exit code 1 when a copy is out of step
import fs from 'node:fs';
import {browserInventoryScript, vehiclePhotosJson} from './browser-data.mjs';

const root = new URL('../', import.meta.url);
const read = name => fs.readFileSync(new URL(name, root), 'utf8');
const inventory = JSON.parse(read('data/used-inventory.json'));
// The equipment copy is the source text itself, so it is wrapped without re-serializing.
const copies = {
  'data/used-inventory.js': browserInventoryScript(inventory),
  'data/vehicle-photos.json': vehiclePhotosJson(inventory),
  'data/equipment-index.js': 'window.equipmentIndex=' + read('data/equipment-index.json').trim() + ';',
};
const check = process.argv.includes('--check'), stale = [];
for (const [name, wanted] of Object.entries(copies)) {
  const current = fs.existsSync(new URL(name, root)) ? read(name) : null;
  if (current === wanted) continue;
  stale.push(name);
  if (!check) fs.writeFileSync(new URL(name, root), wanted);
}
console.log(stale.length ? (check ? 'Out of step: ' : 'Rewritten: ') + stale.join(', ') : 'Browser copies are in step with the source files.');
if (check && stale.length) process.exit(1);
