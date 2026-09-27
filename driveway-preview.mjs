export function imageFileError(file) {
  if (!file || !/^image\/(jpeg|png|webp)$/i.test(file.type)) return 'Choose a JPG, PNG or WebP photo. Export HEIC photos as JPG first.';
  if (file.size > 20 * 1024 * 1024) return 'Choose a photo smaller than 20 MB.';
  return '';
}

export function previewSize(width, height) {
  const scale = Math.min(1, 1600 / Math.max(width, height));
  return {width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale))};
}

export function vehicleBox(canvas, image, placement) {
  const width = canvas.width * Number(placement.size) / 100;
  const height = width * image.naturalHeight / image.naturalWidth;
  return {width, height, x: canvas.width * Number(placement.x) / 100 - width / 2, y: canvas.height * Number(placement.y) / 100 - height / 2};
}

export function installDrivewayPreview(document) {
  const $ = id => document.getElementById(id);
  const canvas = $('driveway-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d'), status = $('driveway-status'), save = $('driveway-save');
  const fields = ['x', 'y', 'size', 'rotate'];
  const controls = Object.fromEntries(fields.map(key => [key, $('driveway-' + key)]));
  const images = {}, versions = {scene: 0, vehicle: 0};
  let dragging = null;
  function draw() {
    save.disabled = !images.scene || !images.vehicle;
    $('driveway-controls').disabled = save.disabled;
    canvas.hidden = !images.scene;
    if (!images.scene) return;
    Object.assign(canvas, previewSize(images.scene.naturalWidth, images.scene.naturalHeight));
    ctx.drawImage(images.scene, 0, 0, canvas.width, canvas.height);
    if (!images.vehicle) return;
    const placement = Object.fromEntries(fields.map(key => [key, controls[key].value]));
    const box = vehicleBox(canvas, images.vehicle, placement);
    ctx.save();
    ctx.translate(box.x + box.width / 2, box.y + box.height / 2);
    ctx.rotate(Number(placement.rotate) * Math.PI / 180);
    ctx.drawImage(images.vehicle, -box.width / 2, -box.height / 2, box.width, box.height);
    ctx.restore();
  }
  for (const kind of ['scene', 'vehicle']) {
    $('driveway-' + kind).addEventListener('change', async event => {
      const file = event.target.files?.[0];
      if (!file) return;
      const version = ++versions[kind];
      delete images[kind]; draw();
      const error = imageFileError(file);
      if (error) { status.textContent = error; return; }
      status.textContent = 'Opening your photo…';
      const url = URL.createObjectURL(file);
      try {
        const img = await new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error('This photo could not be opened. Try a JPG, PNG or WebP image.'));
          image.src = url;
        });
        if (version !== versions[kind]) return;
        images[kind] = img; draw();
        status.textContent = images.scene && images.vehicle ? 'Preview ready. Drag the vehicle or use the position and size controls below.' : images.scene ? 'Driveway photo opened. Now choose a vehicle photo.' : 'Vehicle photo opened. Now choose your driveway photo.';
      } catch (error) {
        if (version === versions[kind]) status.textContent = error.message;
      } finally { URL.revokeObjectURL(url); }
    });
  }
  for (const input of Object.values(controls)) input.addEventListener('input', draw);
  $('driveway-reset').addEventListener('click', () => {
    for (const [key, value] of Object.entries({x: 50, y: 65, size: 45, rotate: 0})) controls[key].value = value;
    draw();
  });
  canvas.addEventListener('pointerdown', event => {
    if (!images.vehicle) return;
    const rect = canvas.getBoundingClientRect();
    dragging = {x: event.clientX, y: event.clientY, startX: Number(controls.x.value), startY: Number(controls.y.value), width: rect.width, height: rect.height};
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!dragging) return;
    controls.x.value = Math.max(0, Math.min(100, dragging.startX + (event.clientX - dragging.x) / dragging.width * 100));
    controls.y.value = Math.max(0, Math.min(100, dragging.startY + (event.clientY - dragging.y) / dragging.height * 100));
    draw();
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, () => { dragging = null; });
  save.addEventListener('click', () => {
    if (save.disabled) return;
    const link = document.createElement('a');
    link.download = 'my-driveway-preview.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    status.textContent = 'Your preview is ready to save. Photos stay on this device.';
  });
  draw();
}

if (typeof document !== 'undefined') installDrivewayPreview(document);
