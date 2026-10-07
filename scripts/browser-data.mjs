// What the browser gets from the inventory.
//
// data/used-inventory.json is the full record and stays the source of truth
// (the refresh merges into it and the vehicle pages are built from it). About
// four fifths of it is each vehicle's photo gallery, which a shopper only needs
// when they open one vehicle's photos. So the copy every search page loads
// (data/used-inventory.js) leaves the galleries out, and they go in
// data/vehicle-photos.json, fetched on demand by vehicle-photos.mjs.
export function splitInventory(inventory) {
  const photos = {};
  const vehicles = inventory.vehicles.map(({photoUrls, ...vehicle}) => {
    const gallery = Array.isArray(photoUrls) ? photoUrls : [];
    if (gallery.length) photos[vehicle.vin] = gallery;
    return {...vehicle, photoCount: gallery.length};
  });
  return {
    browser: {...inventory, vehicles},
    photos: {version: 1, capturedAt: inventory.capturedAt ?? null, photos},
  };
}
export const browserInventoryScript = inventory => 'window.usedInventoryData=' + JSON.stringify(splitInventory(inventory).browser) + ';';
export const vehiclePhotosJson = inventory => JSON.stringify(splitInventory(inventory).photos);
