// Where an original window sticker can be read, by make.
//
// Every source here was tested against real VINs from this store's inventory (October 2026):
//   stellantis  chrysler.com serves Jeep, Ram, Dodge, Chrysler, Fiat and Alfa Romeo stickers.
//   gm          cws.gm.com serves Chevrolet, GMC, Buick and Cadillac. An empty reply means GM has none for that VIN.
//   hyundai     hyundaiusa.com serves Hyundai. A small non-PDF reply means none.
//   ford        windowsticker.forddirect.com serves Ford and Lincoln, but only while Ford keeps the label on file;
//               otherwise it returns a "not yet released" page.
//   relay       this site's own /api/original-sticker, which asks WindowSticker.org for the manufacturer's PDF.
//               Used for makes whose manufacturer address is not public (Kia, Subaru, Toyota, Lexus, Nissan, Infiniti).
// Makes with no public source at all (Honda, Mazda, BMW, Mercedes-Benz, Audi, Volkswagen, Land Rover, Porsche, Tesla,
// Mitsubishi, Maserati and others) are not listed, so no lookup is attempted for them.
//
// scripts/browser-refresh/sticker-setup.js carries the same host-to-path table for the browser side; keep them in step.
export const SOURCES = {
  stellantis: { origin: 'https://www.chrysler.com', path: '/hostd/windowsticker/getWindowStickerPdf.do?vin=' },
  gm: { origin: 'https://cws.gm.com', path: '/vs-cws/vehshop/v2/vehicle/windowsticker?vin=' },
  hyundai: { origin: 'https://www.hyundaiusa.com', path: '/var/hyundai/services/inventory/monroney.pdf?model=Venue&vin=' },
  ford: { origin: 'https://www.windowsticker.forddirect.com', path: '/windowsticker.pdf?vin=' },
  relay: { origin: 'https://carswithsam.com', path: '/api/original-sticker?vin=' },
};
// make at the start of the title (after "New 2026 " / "Used 2021 ") -> [source, the document layout its sticker must have]
const MAKES = [
  [/^(?:Chevrolet|GMC|Buick|Cadillac)\b/i, 'gm', 'GM'],
  [/^Hyundai\b/i, 'hyundai', 'Hyundai'],
  [/^(?:Ford|Lincoln)\b/i, 'ford', 'Ford'],
  [/^Kia\b/i, 'relay', 'Kia'],
  [/^Subaru\b/i, 'relay', 'Subaru'],
  [/^(?:Toyota|Lexus)\b/i, 'relay', 'Toyota'],
  [/^(?:Nissan|Infiniti)\b/i, 'relay', 'Nissan'],
];
const STELLANTIS = /\b(Jeep|Ram|Dodge|Chrysler|Fiat|Wagoneer|Alfa Romeo)\b/i;

// The source to ask for this vehicle's sticker, or null when its make has no public source.
export function stickerSource(vehicle) {
  const make = (/^(?:new|used)\s+\d{4}\s+(.*)$/i.exec(vehicle?.title || '') || [])[1] || '';
  for (const [pattern, id, family] of MAKES) if (pattern.test(make)) return { id, family, ...SOURCES[id] };
  return STELLANTIS.test(vehicle?.title || '') ? { id: 'stellantis', family: 'Stellantis', ...SOURCES.stellantis } : null;
}
export const stickerUrl = (source, vin) => source.origin + source.path + vin;
export const sourceHosts = () => Object.values(SOURCES).map(s => new URL(s.origin).hostname);
