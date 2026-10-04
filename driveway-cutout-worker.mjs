// U²-Net preprocessing/postprocessing follows rembg's MIT-licensed U2netpSession.
// Model: U²-Net (Apache-2.0); inference: ONNX Runtime Web 1.22.0 (MIT).
const ASSET_ROOT = '/vendor/vehicle-cutout/';
const EDGE = 320;
let sessionPromise;

export function alphaFromPrediction(values) {
  if (!values || values.length !== EDGE * EDGE) throw new Error('The vehicle outline could not be read. Try another exterior photo or refine the outline manually.');
  let min = Infinity, max = -Infinity;
  for (const value of values) {
    if (!Number.isFinite(value)) throw new Error('The vehicle outline could not be read. Try another exterior photo.');
    min = Math.min(min, value); max = Math.max(max, value);
  }
  if (max - min < 0.00001) throw new Error('No clear vehicle outline was found. Try a photo showing the whole vehicle, or trace its outline.');
  const alpha = new Uint8ClampedArray(values.length);
  let foreground = 0;
  for (let i = 0; i < values.length; i++) {
    const value = (values[i] - min) / (max - min);
    // Keep a soft edge, without eroding thin mirrors or replacing glass/body pixels.
    alpha[i] = value < 0.02 ? 0 : value > 0.98 ? 255 : Math.round(value * 255);
    if (value >= 0.5) foreground++;
  }
  const coverage = foreground / values.length;
  if (coverage < 0.005 || coverage > 0.985) throw new Error('This photo did not produce a usable vehicle cutout. Choose another exterior angle or trace the vehicle outline.');

  // Saliency models can leave disconnected signs/poles or faint lot haze. Keep
  // the largest confident 8-connected subject, plus three model pixels of soft
  // boundary. Diagonal connections retain thin mirrors; we do not erode the car.
  const labels = new Uint32Array(alpha.length), work = new Int32Array(alpha.length);
  let label = 0, largestLabel = 0, largestSize = 0;
  for (let start = 0; start < alpha.length; start++) {
    if (labels[start] || alpha[start] < 128) continue;
    label++;
    let head = 0, tail = 1;
    work[0] = start; labels[start] = label;
    while (head < tail) {
      const index = work[head++], x = index % EDGE, y = Math.floor(index / EDGE);
      for (let ny = Math.max(0, y - 1); ny <= Math.min(EDGE - 1, y + 1); ny++) {
        for (let nx = Math.max(0, x - 1); nx <= Math.min(EDGE - 1, x + 1); nx++) {
          const next = ny * EDGE + nx;
          if (!labels[next] && alpha[next] >= 128) { labels[next] = label; work[tail++] = next; }
        }
      }
    }
    if (tail > largestSize) { largestSize = tail; largestLabel = label; }
  }
  if (largestSize / alpha.length < 0.005) throw new Error('No clear vehicle outline was found. Choose a photo showing one whole vehicle, or trace its outline.');

  const distance = new Uint8Array(alpha.length);
  distance.fill(255);
  let head = 0, tail = 0;
  for (let i = 0; i < alpha.length; i++) if (labels[i] === largestLabel) { distance[i] = 0; work[tail++] = i; }
  while (head < tail) {
    const index = work[head++];
    if (distance[index] >= 3) continue;
    const x = index % EDGE, y = Math.floor(index / EDGE), nextDistance = distance[index] + 1;
    for (let ny = Math.max(0, y - 1); ny <= Math.min(EDGE - 1, y + 1); ny++) {
      for (let nx = Math.max(0, x - 1); nx <= Math.min(EDGE - 1, x + 1); nx++) {
        const next = ny * EDGE + nx;
        if (distance[next] === 255) { distance[next] = nextDistance; work[tail++] = next; }
      }
    }
  }
  let keptForeground = 0;
  for (let i = 0; i < alpha.length; i++) {
    if (distance[i] === 255) alpha[i] = 0;
    if (alpha[i] >= 128) keptForeground++;
  }
  return {alpha, coverage: keptForeground / alpha.length};
}

async function getSession(progress) {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      progress('loading', 'Preparing background removal. The first use downloads about 16 MB.');
      const assetRoot = new URL(ASSET_ROOT, self.location.href).href;
      const ort = await import(assetRoot + 'ort.wasm.min.mjs');
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.proxy = false;
      ort.env.wasm.wasmPaths = assetRoot;
      const session = await ort.InferenceSession.create(assetRoot + 'u2netp.onnx', {
        executionProviders: ['wasm'], graphOptimizationLevel: 'all'
      });
      return {ort, session};
    })().catch(error => { sessionPromise = undefined; throw error; });
  }
  return sessionPromise;
}

// The main module sends one request at a time. Worker termination cancels inference.
if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
  self.onmessage = async ({data}) => {
    if (data?.type !== 'cutout') return;
    const {id, pixels} = data;
    const progress = (stage, message) => self.postMessage({type: 'progress', id, stage, message});
    let input, outputs;
    try {
      const {ort, session} = await getSession(progress);
      const rgb = new Float32Array(pixels);
      if (rgb.length !== 3 * EDGE * EDGE) throw new Error('The vehicle photo could not be prepared. Please choose it again.');
      progress('separating', 'Removing the vehicle photo background…');
      input = new ort.Tensor('float32', rgb, [1, 3, EDGE, EDGE]);
      outputs = await session.run({[session.inputNames[0]]: input}, [session.outputNames[0]]);
      const result = alphaFromPrediction(outputs[session.outputNames[0]].data);
      self.postMessage({type: 'result', id, width: EDGE, height: EDGE, alpha: result.alpha.buffer, coverage: result.coverage}, [result.alpha.buffer]);
    } catch (error) {
      const expected = /outline|cutout|exterior|photo could not be prepared/i.test(error?.message || '');
      self.postMessage({type: 'error', id, message: expected ? error.message : 'Background removal could not load on this device. Try again, choose a transparent vehicle photo, or trace the outline manually.'});
    } finally {
      input?.dispose?.();
      if (outputs) for (const tensor of Object.values(outputs)) tensor?.dispose?.();
    }
  };
}
