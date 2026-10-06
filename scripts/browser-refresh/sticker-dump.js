// Run once the scan is done. Returns every result as STICKERS[json]ENDSTICKERS, padded so it is saved to a file.
// If there are more than 25 results, dump them in slices of 25 (replace the slice bounds) to stay under the transfer limit.
const all = Object.values(window.__acc).slice(0, 25);
const s = 'STICKERS' + JSON.stringify(all) + 'ENDSTICKERS';
s + ' '.repeat(Math.max(0, 135000 - s.length))
