// Window stickers from makes other than Jeep, Ram, Dodge and Chrysler.
// The fixtures are the text of real stickers pulled for vehicles in this store's inventory in October 2026.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {analyzeOtherOriginal} from '../../multibrand-sticker.mjs';
import {parseQuery, matchVehicle} from '../../equipment-search.mjs';
import {SOURCES, stickerSource, stickerUrl, stickerUrlVin, sourceHosts} from './sticker-sources.mjs';
import {stickerCandidates, stickerPlan, stickerOutcome} from './refresh.mjs';

const fixture = name => fs.readFileSync(new URL('./fixtures/' + name + '.txt', import.meta.url), 'utf8');
const read = name => analyzeOtherOriginal(fixture(name), name.split('-')[1]);
const has = (sticker, id) => sticker.features[id]?.value === true;

test('each make is read from its own source, and makes without a public source are left alone', () => {
  const source = title => stickerSource({title})?.id ?? null;
  assert.equal(source('Used 2026 Chevrolet Traverse Z71'), 'gm');
  assert.equal(source('Used 2025 GMC Sierra 1500 SLT'), 'gm');
  assert.equal(source('Used 2023 Cadillac XT4 Premium Luxury'), 'gm');
  assert.equal(source('Used 2025 Hyundai Palisade XRT'), 'hyundai');
  assert.equal(source('Used 2022 Ford F-150 Lariat'), 'ford');
  assert.equal(source('Used 2023 Kia Telluride SX X-LINE'), 'relay');
  assert.equal(source('Used 2024 Subaru Forester Sport'), 'subaru');
  assert.equal(source('Used 2020 Toyota Tacoma TRD Pro'), 'relay');
  assert.equal(source('New 2026 Jeep Wrangler Sahara'), 'stellantis');
  assert.equal(source('Used 2022 Ram 1500 Laramie'), 'stellantis');
  for (const title of ['Used 2021 Tesla Model Y Long Range', 'Used 2017 Honda CR-V EX-L', 'Used 2016 BMW X5 xDrive35i', 'Used 2024 Land Rover Range Rover Sport', 'Used 2017 Maserati Ghibli Base'])
    assert.equal(source(title), null, title);
  assert.equal(stickerUrl(stickerSource({title: 'Used 2026 Chevrolet Traverse Z71'}), '1GNEVJKS2TJ172614'), 'https://cws.gm.com/vs-cws/vehshop/v2/vehicle/windowsticker?vin=1GNEVJKS2TJ172614');
});

test('the browser-side table lists the same sites and addresses', () => {
  const setup = fs.readFileSync(new URL('./sticker-setup.js', import.meta.url), 'utf8');
  for (const s of Object.values(SOURCES)) assert.ok(setup.includes(`'${new URL(s.origin).hostname}': '${s.path}'`), s.origin);
  assert.equal(sourceHosts().length, Object.keys(SOURCES).length);
});

test('GM: wrapped lines are read whole and colours come from the colour fields', () => {
  const s = read('gm-1GNEVJKS2TJ172614');
  assert.equal(s.documentFamily, 'GM');
  for (const id of ['heatedSeats', 'heatedWheel', 'adaptiveCruise', 'surroundCamera', 'blindSpot', 'remoteStart', 'wireless', 'powerLiftgate', 'carplay', 'tow']) assert.ok(has(s, id), id);
  assert.ok(s.lines.includes('• DRIVER & FRONT PASSENGER HEATED SEATS'));
  assert.ok(s.lines.includes('Exterior Color: STERLING GRAY METALLIC'));
  // Black wheels are not black paint.
  assert.ok(!Object.keys(s.features).some(id => id.startsWith('exterior')));
});

test('GM: equipment removed for a credit reads as not equipped, even when the standard list names it', () => {
  const text = fixture('gm-1GNEVJKS2TJ172614').replace('TOTAL OPTIONS', 'CREDIT - NOT EQUIPPED WITH   -50.00\nHEATED STEERING WHEEL\nTOTAL OPTIONS');
  const s = analyzeOtherOriginal(text, '1GNEVJKS2TJ172614');
  assert.equal(s.features.heatedWheel.value, false);
  assert.ok(has(s, 'heatedSeats'));
});

test('Hyundai, Subaru and Kia layouts are read', () => {
  const hyundai = read('hyundai-5NMP5DG18SH062691');
  assert.equal(hyundai.documentFamily, 'Hyundai');
  for (const id of ['ventilated', 'heatedSeats', 'heatedWheel', 'panoramic', 'thirdRow', 'captains', 'surroundCamera', 'hud', 'navigation', 'powerLiftgate']) assert.ok(has(hyundai, id), 'Hyundai ' + id);
  assert.ok(hyundai.lines.includes('Exterior Color: ATLANTIS BLUE'));
  const subaru = read('subaru-JF2SKAGC0RH407132');
  assert.equal(subaru.documentFamily, 'Subaru');
  for (const id of ['panoramic', 'heatedSeats', 'adaptiveCruise', 'blindSpot', 'backupCamera', 'harman']) assert.ok(has(subaru, id), 'Subaru ' + id);
  const kia = read('kia-5XYP5DGC3PG386683');
  assert.equal(kia.documentFamily, 'Kia');
  for (const id of ['captains', 'surroundCamera', 'adaptiveCruise', 'navigation', 'heatedWheel']) assert.ok(has(kia, id), 'Kia ' + id);
});

test('a document for another VIN, or in a layout that has not been checked, is not read', () => {
  assert.throws(() => analyzeOtherOriginal(fixture('gm-1GNEVJKS2TJ172614'), '1GNEVJKS2TJ172615'), /VIN does not match/);
  assert.equal(analyzeOtherOriginal('2026 SOMETHING ELSE\nVIN 1FMUK8KHXTGA36945\nSTANDARD THINGS\nHeated Seats', '1FMUK8KHXTGA36945'), null);
});

test('a verified sticker from another make answers searches like any other', () => {
  const vin = '5NMP5DG18SH062691', sticker = {...read('hyundai-' + vin), vin, status: 'verified'};
  const vehicle = {vin, stock: 'X1', title: 'Used 2025 Hyundai Santa Fe Hybrid CALLIGRAPHY', condition: 'Used', price: 41000, miles: 12000, locationId: '18393'};
  const kind = text => matchVehicle(vehicle, sticker, parseQuery(text)).kind;
  assert.equal(kind('Hyundai with cooled seats and a panoramic sunroof'), 'match');
  assert.equal(kind("captain's chairs under $45k"), 'match');
  assert.equal(kind('blue Hyundai'), 'match');
  assert.equal(kind('red Hyundai'), 'excluded');
});

test('the nightly plan asks every source for its own makes', () => {
  const vehicles = [['1GNEVJKS2TJ172614', 'Used 2026 Chevrolet Traverse Z71'], ['5NMP5DG18SH062691', 'Used 2025 Hyundai Santa Fe Hybrid'], ['5YJYGDEEXMF255823', 'Used 2021 Tesla Model Y Long Range'], ['1C4PJXEG3VW581069', 'New 2027 Jeep Wrangler Sahara']]
    .map(([vin, title]) => ({vin, title, condition: title.startsWith('New') ? 'New' : 'Used'}));
  const records = Object.fromEntries(vehicles.map(v => [v.vin, {vin: v.vin, status: 'unavailable', checkedAt: null}]));
  const due = stickerCandidates({vehicles}, {records});
  assert.deepEqual(due.sort(), ['1C4PJXEG3VW581069', '1GNEVJKS2TJ172614', '5NMP5DG18SH062691']);
  assert.deepEqual(stickerPlan(due, {vehicles}).map(g => g.source).sort(), ['gm', 'hyundai', 'stellantis']);
});

test('Subaru is read from subaru.com, which puts the VIN in the path', () => {
  const subaru = {vin: 'JF2SKAGC0RH407132', title: 'Used 2024 Subaru Forester Sport'}, source = stickerSource(subaru);
  const url = stickerUrl(source, subaru.vin);
  assert.equal(url, 'https://www.subaru.com/services/vehicles/windowsticker/JF2SKAGC0RH407132');
  assert.equal(stickerUrlVin(url), subaru.vin);
  assert.equal(stickerUrlVin('https://cws.gm.com/vs-cws/vehshop/v2/vehicle/windowsticker?vin=1GNEVJKS2TJ172614'), '1GNEVJKS2TJ172614');
  assert.ok(sourceHosts().includes('www.subaru.com'));
  // The same document read from subaru.com is verified like any other.
  const read = stickerOutcome(subaru, {vin: subaru.vin, at: '2026-10-07T03:29:35.865Z', source: 'www.subaru.com', http: 200, size: 440388, sha256: 'x', text: fixture('subaru-JF2SKAGC0RH407132')});
  assert.equal(read.kind, 'verified');
  assert.equal(read.record.sourceUrl, url);
  assert.equal(read.record.documentFamily, 'Subaru');
  // Subaru's "not available at this time" page is a PDF too; it does not carry the VIN, so it is not a sticker.
  const none = stickerOutcome(subaru, {vin: subaru.vin, at: 'now', source: 'www.subaru.com', http: 200, size: 16483, sha256: 'y', text: 'We are sorry, the window sticker for the vehicle you selected is not available\nat this time. Please contact your Subaru Retailer for more information. (c:01)'});
  assert.equal(none.kind, 'none');
  assert.equal(none.record.sourceUrl, null);
  // A result read from another site is not this vehicle's source.
  assert.equal(stickerOutcome(subaru, {vin: subaru.vin, at: 'now', source: 'carswithsam.com', http: 200, size: 440388, text: fixture('subaru-JF2SKAGC0RH407132')}), null);
});

test('a sticker that exists but cannot be read is linked, and claims no equipment', () => {
  // A rental-fleet Hyundai label: price and colours, no equipment list.
  const palisade = {vin: 'KM8R24GE7SU862018', title: 'Used 2025 Hyundai Palisade SEL'};
  const fleet = stickerOutcome(palisade, {vin: palisade.vin, at: '2026-10-07T03:30:59.118Z', source: 'www.hyundaiusa.com', http: 200, size: 212670, sha256: 'z', text: fixture('hyundai-fleet-KM8R24GE7SU862018')});
  assert.equal(fleet.kind, 'found');
  assert.equal(fleet.record.status, 'unavailable');
  assert.equal(fleet.record.stickerFound, true);
  assert.equal(fleet.record.sourceUrl, 'https://www.hyundaiusa.com/var/hyundai/services/inventory/monroney.pdf?model=Venue&vin=KM8R24GE7SU862018');
  assert.deepEqual([fleet.record.features, fleet.record.lines], [{}, []]);
  // Nissan's copy is a picture: the only text is its notice, with no VIN.
  const kicks = {vin: '3N8AP6DA4SL312953', title: 'Used 2025 Nissan Kicks SR'};
  const notice = '**Not actual Monroney Label. Provided for informational purposes only. Unofficial Copy**';
  const picture = stickerOutcome(kicks, {vin: kicks.vin, at: 'now', source: 'carswithsam.com', http: 200, size: 637671, sha256: 'n', text: notice});
  assert.equal(picture.kind, 'found');
  assert.equal(picture.record.sourceUrl, 'https://carswithsam.com/api/original-sticker?vin=3N8AP6DA4SL312953');
  assert.match(picture.record.reason, /picture/);
  // The same notice for a make that is not Nissan, or Ford's "not yet released" page, is not a sticker.
  assert.equal(stickerOutcome({vin: '4T1DAACK9TU678241', title: 'Used 2026 Toyota Camry XLE'}, {at: 'now', source: 'carswithsam.com', http: 200, size: 637671, text: notice}).kind, 'none');
  assert.equal(stickerOutcome({vin: '1FTFW1E54NFA27483', title: 'Used 2022 Ford F-150 Lariat'}, {at: 'now', source: 'www.windowsticker.forddirect.com', http: 200, size: 300000, text: 'The window sticker for this vehicle has not yet been released.'}).kind, 'none');
  // No reply, a web page instead of a PDF, and "not found" all mean none.
  for (const t of [{notPdf: true, size: 82}, {small: true, size: 900}, {http: 404}])
    assert.equal(stickerOutcome({vin: '1GNSKRKD0MR306602', title: 'Used 2021 Chevrolet Tahoe RST'}, {at: 'now', source: 'cws.gm.com', http: 200, ...t}).kind, 'none');
});
