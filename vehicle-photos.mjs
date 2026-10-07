// A vehicle's photo gallery, loaded only when someone asks to see it.
// The inventory every page loads carries one main photo per vehicle; the full
// galleries live in data/vehicle-photos.json (see scripts/browser-data.mjs).
let galleries = null;
export function vehiclePhotos(vehicle) {
  if (Array.isArray(vehicle?.photoUrls)) return Promise.resolve(vehicle.photoUrls);
  if (!vehicle?.vin) return Promise.resolve([]);
  galleries ??= fetch('/data/vehicle-photos.json')
    .then(response => { if (!response.ok) throw new Error('Photo list unavailable (' + response.status + ')'); return response.json(); })
    .then(file => file.photos || {})
    .catch(error => { galleries = null; throw error; });
  return galleries.then(photos => Array.isArray(photos[vehicle.vin]) ? photos[vehicle.vin] : []);
}
