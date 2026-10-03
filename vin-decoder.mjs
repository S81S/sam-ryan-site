export const normalizeVIN = value => String(value || '').trim().toUpperCase().replace(/\s+/g, '');
export const validVIN = value => /^[A-HJ-NPR-Z0-9]{17}$/.test(value);
export async function decodeVIN(vin, fetcher = fetch) {
 if (!validVIN(vin)) throw Error('Enter a complete 17-character VIN (no I, O or Q).');
 const sourceUrl = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/' + vin + '?format=json';
 const response = await fetcher(sourceUrl, {signal: AbortSignal.timeout(20000), credentials: 'omit'});
 if (!response.ok) throw Error('Public VIN decoder unavailable. Retry or use an original sticker PDF.');
 const data = (await response.json()).Results?.[0];
 if (!data || normalizeVIN(data.VIN) !== vin || data.ErrorCode !== '0' || !data.Make || !data.Model || !data.ModelYear)
  throw Error('The decoder could not confirm this VIN. Check the VIN or supply its original sticker.');
 // Only identity and basic specifications; never map decoder trim/options to factory equipment.
 return {title: [data.ModelYear, data.Make, data.Model].join(' '), year: Number(data.ModelYear),
  decodedSpecs: {body: data.BodyClass || 'Unknown', engine: Number(data.DisplacementL)>0 ? Number(data.DisplacementL).toFixed(1) + ' L' : 'Unknown',
   cylinders: data.EngineCylinders || 'Unknown', fuel: data.FuelTypePrimary || 'Unknown', drive: data.DriveType || 'Unknown'},
  decodedSourceUrl: sourceUrl, decodedAt: new Date().toISOString()};
}
