#!/usr/bin/env node
// Keeps the home page search bar's typed examples honest.
//
// The search bar on the home page and on Find Your Car types example searches. Inventory changes daily, so an
// example that found vehicles last week can come up empty today. This script
// runs every example in home-search-examples.json through the site's own search
// (parseQuery + matchVehicle, the same code the Find Your Car page uses) against
// the current data files, and writes the examples that still find vehicles into
// both pages, in their listed order. An example that comes back later returns
// on its own.
//
//   node scripts/home-examples.mjs           update the pages if needed
//   node scripts/home-examples.mjs --check   report only; exit 1 if a page is out of date
import {readFileSync, writeFileSync} from 'node:fs';
import {parseQuery, matchVehicle} from '../equipment-search.mjs';

const at = path => new URL('../' + path, import.meta.url);
const read = path => readFileSync(at(path), 'utf8');
const checkOnly = process.argv.includes('--check');
const KEEP_AT_LEAST = 5;        // never shrink the rotation below this; leave the page alone instead
const MAX_LENGTH = 24;          // widest example that fits the bar on a narrow phone

const config = JSON.parse(read('home-search-examples.json'));
const minimum = Number.isInteger(config.minimumMatches) ? config.minimumMatches : 3;
const data = JSON.parse(read('data/used-inventory.json'));
const index = JSON.parse(read('data/equipment-index.json'));
if (!Array.isArray(config.examples) || !config.examples.length) throw new Error('home-search-examples.json has no examples');
if (!Array.isArray(data.vehicles) || !data.vehicles.length || !index.records) throw new Error('inventory data is missing or empty');

const count = text => {
  const query = parseQuery(text);
  return data.vehicles.filter(vehicle => matchVehicle(vehicle, index.records[vehicle.vin], query).kind === 'match').length;
};
const rows = config.examples.map(text => ({text, matches: count(text), tooLong: text.length > MAX_LENGTH}));
const kept = rows.filter(row => row.matches >= minimum && !row.tooLong).map(row => row.text);
for (const row of rows) {
  const verdict = row.tooLong ? 'skipped: longer than ' + MAX_LENGTH + ' characters' : row.matches >= minimum ? 'shown' : 'hidden: fewer than ' + minimum + ' matches';
  console.log(String(row.matches).padStart(4) + '  ' + row.text.padEnd(26) + verdict);
}
if (kept.length < KEEP_AT_LEAST) {
  console.log('Only ' + kept.length + ' examples find vehicles; leaving the pages unchanged. Check the inventory data.');
  process.exit(checkOnly ? 1 : 0);
}

const attribute = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
// Every search bar that types examples: the home page and Find Your Car.
const pages = ['index.html', 'inventory.html'];
const pattern = /(<input [^>]*? placeholder=")[^"]*("[^>]*? data-examples=')[^']*(')/;
let stale = 0;
for (const page of pages) {
  const html = read(page);
  if (!pattern.test(html)) throw new Error(page + ': search bar with data-examples not found');
  const updated = html.replace(pattern, (all, a, b, c) => a + attribute(kept[0]) + b + attribute(JSON.stringify(kept)).replace(/&quot;/g, '"') + c);
  if (updated === html) { console.log(page + ' already shows these ' + kept.length + ' examples.'); continue; }
  stale++;
  if (checkOnly) { console.log(page + ' is out of date: it should show ' + kept.length + ' examples.'); continue; }
  writeFileSync(at(page), updated);
  console.log(page + ' updated: ' + kept.length + ' of ' + rows.length + ' examples shown.');
}
process.exit(checkOnly && stale ? 1 : 0);
