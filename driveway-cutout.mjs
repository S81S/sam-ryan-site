/**
 * Local, on-demand vehicle background removal. No photos are uploaded.
 * await removeVehicleBackground(blobOrLoadedImageOrCanvasOrImageBitmap, {
 *   signal, timeoutMs: 60000, maxSize: 1600,
 *   onProgress: ({stage, message}) => { ... }
 * });
 * Returns {canvas, blob, bounds, sourceWidth, sourceHeight, maskCoverage}.
 * bounds are in the resized source's pixels; canvas/blob are trimmed transparent PNG.
 * Use returned canvas.width/height for layout (not naturalWidth/naturalHeight).
 * A rejected request must offer another photo/manual outlining; never draw the rectangle.
 */
const EDGE = 320;
const queue = [];
let worker, active, nextId = 0;

function abortError() { return new DOMException('Vehicle background removal canceled.', 'AbortError'); }
function progress(job, stage, message) {
  try { job.onProgress?.({stage, message}); } catch { /* A UI callback must not stop processing. */ }
}
function discardWorker() { worker?.terminate(); worker = undefined; }
function finish(job, error, result) {
  if (job.done) return;
  job.done = true;
  clearTimeout(job.timer);
  job.signal?.removeEventListener('abort', job.abort);
  const at = queue.indexOf(job);
  if (at !== -1) queue.splice(at, 1);
  if (active === job) active = undefined;
  error ? job.reject(error) : job.resolve(result);
  pump();
}
function failActive(error) {
  const job = active;
  discardWorker();
  if (job) finish(job, error);
}
function ensureWorker() {
  if (worker) return worker;
  if (typeof Worker !== 'function') throw new Error('Automatic background removal is unavailable in this browser. Use a transparent vehicle photo or trace its outline.');
  worker = new Worker(new URL('./driveway-cutout-worker.mjs', import.meta.url), {type: 'module'});
  worker.onmessage = ({data}) => {
    if (!active || data.id !== active.id) return;
    if (data.type === 'progress') progress(active, data.stage, data.message);
    else if (data.type === 'result') finish(active, null, data);
    else if (data.type === 'error') finish(active, new Error(data.message));
  };
  worker.onerror = event => {
    event.preventDefault();
    failActive(new Error('Background removal could not load on this device. Try again or trace the vehicle outline.'));
  };
  worker.onmessageerror = () => failActive(new Error('The vehicle cutout could not be read. Try another photo or trace the outline.'));
  return worker;
}
function pump() {
  if (active || !queue.length) return;
  const job = active = queue.shift();
  if (job.signal?.aborted) { finish(job, abortError()); return; }
  try {
    const engine = ensureWorker();
    job.timer = setTimeout(() => {
      if (active !== job) return;
      failActive(new Error('Background removal is taking too long on this device. Try a different photo or trace the outline.'));
    }, job.timeoutMs);
    engine.postMessage({type: 'cutout', id: job.id, pixels: job.pixels.buffer}, [job.pixels.buffer]);
  } catch (error) { failActive(error); }
}
function requestMask(pixels, options) {
  return new Promise((resolve, reject) => {
    const job = {...options, id: ++nextId, pixels, resolve, reject, done: false};
    job.abort = () => {
      if (active === job) discardWorker();
      finish(job, abortError());
    };
    if (job.signal?.aborted) { reject(abortError()); return; }
    job.signal?.addEventListener('abort', job.abort, {once: true});
    queue.push(job);
    pump();
  });
}

export function normalizeVehiclePixels(rgba) {
  if (rgba.length !== EDGE * EDGE * 4) throw new Error('Expected a 320 by 320 RGBA image.');
  let max = 0;
  for (let i = 0; i < rgba.length; i += 4) max = Math.max(max, rgba[i], rgba[i + 1], rgba[i + 2]);
  max = Math.max(max, 0.000001);
  const out = new Float32Array(EDGE * EDGE * 3), plane = EDGE * EDGE;
  const mean = [0.485, 0.456, 0.406], std = [0.229, 0.224, 0.225];
  for (let i = 0; i < plane; i++) for (let channel = 0; channel < 3; channel++) out[channel * plane + i] = (rgba[i * 4 + channel] / max - mean[channel]) / std[channel];
  return out;
}
function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  return canvas;
}
async function decodeSource(source, signal) {
  if (!(source instanceof Blob)) return {image: source, cleanup() {}};
  if (!/^image\/(jpeg|png|webp)$/i.test(source.type) || source.size > 20 * 1024 * 1024) throw new Error('Choose a JPG, PNG or WebP vehicle photo smaller than 20 MB.');
  const url = URL.createObjectURL(source), image = new Image();
  try {
    await new Promise((resolve, reject) => {
      const done = fn => { image.onload = null; image.onerror = null; signal?.removeEventListener('abort', abort); fn(); };
      const abort = () => { image.src = ''; done(() => reject(abortError())); };
      image.onload = () => done(resolve);
      image.onerror = () => done(() => reject(new Error('The vehicle photo could not be opened. Try a JPG, PNG or WebP image.')));
      signal?.addEventListener('abort', abort, {once: true});
      if (signal?.aborted) { abort(); return; }
      image.src = url;
    });
    return {image, cleanup() { URL.revokeObjectURL(url); }};
  } catch (error) { URL.revokeObjectURL(url); throw error; }
}
function pngBlob(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('The cutout could not be saved. Try a smaller vehicle photo.')), 'image/png'));
}

export async function removeVehicleBackground(source, options = {}) {
  const {signal, onProgress} = options;
  if (signal?.aborted) throw abortError();
  const maxSize = Math.max(320, Math.min(2048, Number(options.maxSize) || 1600));
  const timeoutMs = Math.max(5000, Math.min(120000, Number(options.timeoutMs) || 60000));
  const decoded = await decodeSource(source, signal);
  try {
    const width = decoded.image?.naturalWidth || decoded.image?.width;
    const height = decoded.image?.naturalHeight || decoded.image?.height;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 2 || height < 2) throw new Error('The vehicle photo has not loaded. Please choose it again.');
    const scale = Math.min(1, maxSize / Math.max(width, height));
    const original = makeCanvas(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
    const context = original.getContext('2d', {willReadFrequently: true});
    context.drawImage(decoded.image, 0, 0, original.width, original.height);
    let originalPixels;
    try { originalPixels = context.getImageData(0, 0, original.width, original.height); }
    catch { throw new Error('This photo source does not allow background removal. Upload a saved vehicle photo instead.'); }
    if (signal?.aborted) throw abortError();
    const modelImage = makeCanvas(EDGE, EDGE), modelContext = modelImage.getContext('2d', {willReadFrequently: true});
    modelContext.fillStyle = '#fff'; modelContext.fillRect(0, 0, EDGE, EDGE);
    modelContext.drawImage(original, 0, 0, EDGE, EDGE);
    const pixels = normalizeVehiclePixels(modelContext.getImageData(0, 0, EDGE, EDGE).data);
    const mask = await requestMask(pixels, {signal, timeoutMs, onProgress});
    if (signal?.aborted) throw abortError();
    const alpha = new Uint8ClampedArray(mask.alpha), smallMask = makeCanvas(mask.width, mask.height);
    const maskContext = smallMask.getContext('2d'), maskPixels = maskContext.createImageData(mask.width, mask.height);
    for (let i = 0; i < alpha.length; i++) { maskPixels.data[i * 4] = alpha[i]; maskPixels.data[i * 4 + 3] = 255; }
    maskContext.putImageData(maskPixels, 0, 0);
    const fullMask = makeCanvas(original.width, original.height), fullMaskContext = fullMask.getContext('2d', {willReadFrequently: true});
    fullMaskContext.imageSmoothingEnabled = true; fullMaskContext.imageSmoothingQuality = 'high';
    fullMaskContext.drawImage(smallMask, 0, 0, original.width, original.height);
    const expanded = fullMaskContext.getImageData(0, 0, original.width, original.height).data;
    let left = original.width, top = original.height, right = -1, bottom = -1;
    for (let i = 0; i < expanded.length; i += 4) {
      const value = Math.round(originalPixels.data[i + 3] * expanded[i] / 255);
      originalPixels.data[i + 3] = value;
      if (value >= 12) {
        const x = (i / 4) % original.width, y = Math.floor(i / 4 / original.width);
        left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
      }
    }
    if (right < left || bottom < top) throw new Error('No usable vehicle outline was found. Try another exterior photo or trace its outline.');
    // Include a small transparent border to retain soft antialiased edges.
    left = Math.max(0, left - 2); top = Math.max(0, top - 2);
    right = Math.min(original.width - 1, right + 2); bottom = Math.min(original.height - 1, bottom + 2);
    context.putImageData(originalPixels, 0, 0);
    const bounds = {x: left, y: top, width: right - left + 1, height: bottom - top + 1};
    const canvas = makeCanvas(bounds.width, bounds.height);
    canvas.getContext('2d').drawImage(original, left, top, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height);
    const blob = await pngBlob(canvas);
    if (signal?.aborted) throw abortError();
    return {canvas, blob, bounds, sourceWidth: original.width, sourceHeight: original.height, maskCoverage: mask.coverage};
  } finally { decoded.cleanup(); }
}
