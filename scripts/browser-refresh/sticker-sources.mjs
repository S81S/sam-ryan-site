// Where an original window sticker can be read, by make.
//
// Every source here was tested against real VINs from this store's inventory (October 2026):
//   stellantis  chrysler.com serves Jeep, Ram, Dodge, Chrysler, Fiat and Alfa Romeo stickers.
//   gm          cws.gm.com serves Chevrolet, GMC, Buick and Cadillac. An empty reply means GM has none for that VIN.
//   ford        windowsticker.forddirect.com serves Ford and Lincoln, but only while Ford keeps the label on file;
//               otherwise it returns a "not yet released" page.
//   subaru      subaru.com serves Subaru (roughly 2021 and newer). A web page instead of a PDF means none.
//   relay       this site's own /api/original-sticker, which asks WindowSticker.org for the manufacturer's PDF.
//               Used for makes whose manufacturer address is not public (Kia, Toyota, Lexus, Nissan, Infiniti), and
//               for Hyundai: hyundaiusa.com has the file, but it refuses anyone who opens the address directly
//               ("Sorry, you have been blocked"), so a link to it is useless to a shopper.
//               Toyota and Lexus only answer for 2025+ vehicles still in a Toyota dealer's stock. Nissan and Infiniti
//               answer for most 2014+ vehicles, but with a picture of the label (no text), so it is linked, not read.
// Makes with no public source at all are not listed, so no lookup is attempted for them. Checked October 2026:
// Honda, Acura, Mazda, Mitsubishi, Volkswagen, Audi, BMW, Mini, Mercedes-Benz, Porsche, Land Rover, Jaguar, Maserati,
// Volvo and Tesla publish stickers or build data only for vehicles in their own dealers' stock, or not at all.
// Ford and Lincoln stay listed because the address still answers for a unit Ford has not yet marked sold.
//
// scripts/browser-refresh/sticker-setup.js carries the same host-to-path table for the browser side; keep them in step.
export const SOURCES = {
  stellantis: { origin: 'https://www.chrysler.com', path: '/hostd/windowsticker/getWindowStickerPdf.do?vin=' },
  gm: { origin: 'https://cws.gm.com', path: '/vs-cws/vehshop/v2/vehicle/windowsticker?vin=' },
  ford: { origin: 'https://www.windowsticker.forddirect.com', path: '/windowsticker.pdf?vin=' },
  subaru: { origin: 'https://www.subaru.com', path: '/services/vehicles/windowsticker/' },
  relay: { origin: 'https://carswithsam.com', path: '/api/original-sticker?vin=' },
};
// make at the start of the title (after "New 2026 " / "Used 2021 ") -> [source, the document layout its sticker must have]
const MAKES = [
  [/^(?:Chevrolet|GMC|Buick|Cadillac)\b/i, 'gm', 'GM'],
  [/^Hyundai\b/i, 'relay', 'Hyundai'],
  [/^(?:Ford|Lincoln)\b/i, 'ford', 'Ford'],
  [/^Kia\b/i, 'relay', 'Kia'],
  [/^Subaru\b/i, 'subaru', 'Subaru'],
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
// The VIN a sticker address is for: the vin= value, or the last part of the path for sources that put it there.
export const stickerUrlVin = url => { const u = new URL(url); return u.searchParams.get('vin') || u.pathname.split('/').pop(); };
export const sourceHosts = () => Object.values(SOURCES).map(s => new URL(s.origin).hostname);
