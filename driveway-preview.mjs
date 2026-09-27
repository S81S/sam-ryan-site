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

export function inventoryChoices(vehicles,condition='New',query='') {
  const terms=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return (vehicles||[]).filter(v=>v.locationId==='18393'&&!v.external&&v.status!=='not-observed'&&(condition==='Both'||v.condition===condition)&&terms.every(t=>(v.title+' '+v.stock+' '+v.vin).toLowerCase().includes(t)));
}
export function outlinePoint(x,y,width,height) {
  return {x:Math.max(0,Math.min(1,x/width)),y:Math.max(0,Math.min(1,y/height))};
}
export function approvedPhoto(value) {
  try {const u=new URL(value);return u.protocol==='https:'&&u.hostname==='cloudflareimages.dealereprocess.com'&&u.pathname.startsWith('/resrc/images/');}catch{return false;}
}

export function installDrivewayPreview(document) {
  const $ = id => document.getElementById(id);
  const canvas = $('driveway-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d'), status = $('driveway-status'), save = $('driveway-save');
  const fields = ['x', 'y', 'size', 'rotate'];
  const controls = Object.fromEntries(fields.map(key => [key, $('driveway-' + key)]));
  const images = {}, versions = {scene: 0, vehicle: 0};
  let outline=[],appliedOutline=[],selectedVehicle=null;
  let dragging = null;
  const editor=$('driveway-outline'),editorPanel=$('driveway-outline-panel');
  let keyboardPoint=null;
  function paintOutline() {
    if(!editor)return;
    editorPanel.hidden=!images.vehicle;
    if(!images.vehicle)return;
    Object.assign(editor,previewSize(images.vehicle.naturalWidth,images.vehicle.naturalHeight));
    const c=editor.getContext('2d');c.drawImage(images.vehicle,0,0,editor.width,editor.height);
    c.strokeStyle='#ffcf49';c.fillStyle='#ffcf49';c.lineWidth=Math.max(2,editor.width/350);
    if(outline.length){c.beginPath();outline.forEach((p,i)=>i?c.lineTo(p.x*editor.width,p.y*editor.height):c.moveTo(p.x*editor.width,p.y*editor.height));if(outline.length>2)c.closePath();c.stroke();for(const p of outline){c.beginPath();c.arc(p.x*editor.width,p.y*editor.height,Math.max(4,editor.width/150),0,2*Math.PI);c.fill();}}
    if(keyboardPoint){const x=keyboardPoint.x*editor.width,y=keyboardPoint.y*editor.height;c.strokeStyle='#fff';c.beginPath();c.moveTo(x-12,y);c.lineTo(x+12,y);c.moveTo(x,y-12);c.lineTo(x,y+12);c.stroke();}
    $('driveway-cutout').disabled=outline.length<3;
    $('driveway-outline-status').textContent=outline.length+' outline points. '+(outline.length<3?'Add at least three points around the vehicle.':'Keep adding points around the edges, then apply your outline.');
  }
  function syncInquiry(){
    for(const who of ['Sam','Ryan']){
      const a=$('driveway-ask-'+who.toLowerCase());if(!a)continue;
      const params=new URLSearchParams({advisor:who,request:'I tried the driveway preview. Please help me check vehicle dimensions, features and availability.'});
      if(selectedVehicle)params.set('vehicle',selectedVehicle.vin);
      a.href='contact.html?'+params;
    }
  }
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
    if(appliedOutline.length>=3){ctx.beginPath();appliedOutline.forEach((p,i)=>{const x=(p.x-.5)*box.width,y=(p.y-.5)*box.height;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.closePath();ctx.clip();}
    ctx.drawImage(images.vehicle, -box.width / 2, -box.height / 2, box.width, box.height);
    ctx.restore();
  }
  for (const kind of ['scene', 'vehicle']) {
    $('driveway-' + kind).addEventListener('change', async event => {
      const file = event.target.files?.[0];
      if (!file) return;
      const version = ++versions[kind];
      if(kind==='vehicle'){outline=[];appliedOutline=[];selectedVehicle=null;if($('driveway-inventory'))$('driveway-inventory').value='';if($('driveway-photo')){$('driveway-photo').replaceChildren();$('driveway-photo').disabled=true;}syncInquiry();}
      delete images[kind]; draw();
      paintOutline();
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
        images[kind] = img; draw();paintOutline();
        status.textContent = images.scene && images.vehicle ? 'Preview ready. Drag the vehicle or use the position and size controls below.' : images.scene ? 'Driveway photo opened. Now choose a vehicle photo.' : 'Vehicle photo opened. Now choose your driveway photo.';
      } catch (error) {
        if (version === versions[kind]) status.textContent = error.message;
      } finally { URL.revokeObjectURL(url); }
    });
  }
  editor?.addEventListener('click',event=>{if(!images.vehicle)return;const r=editor.getBoundingClientRect();outline.push(outlinePoint(event.clientX-r.left,event.clientY-r.top,r.width,r.height));paintOutline();});
  editor?.addEventListener('keydown',event=>{if(!images.vehicle||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' '].includes(event.key))return;event.preventDefault();keyboardPoint??={x:.5,y:.5};const step=event.shiftKey?.05:.01;const delta={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]}[event.key];if(delta)keyboardPoint=outlinePoint(keyboardPoint.x+delta[0],keyboardPoint.y+delta[1],1,1);else outline.push({...keyboardPoint});paintOutline();});
  $('driveway-undo')?.addEventListener('click',()=>{outline.pop();paintOutline();});
  $('driveway-cutout')?.addEventListener('click',()=>{if(outline.length<3)return;appliedOutline=outline.map(p=>({...p}));draw();editorPanel.open=false;status.textContent='Your outline is applied. Adjust the vehicle in your driveway below.';if(images.scene)canvas.scrollIntoView?.({block:'center',behavior:'smooth'});});
  $('driveway-whole-photo')?.addEventListener('click',()=>{outline=[];appliedOutline=[];paintOutline();draw();});
  const picker=$('driveway-inventory'),photoPicker=$('driveway-photo');
  const vehicles=document.defaultView?.usedInventoryData?.vehicles||[];
  function updateInventory(){
    if(!picker)return;
    const chosen=picker.value;picker.replaceChildren();
    const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Choose a vehicle';picker.append(placeholder);
    const matches=inventoryChoices(vehicles,$('driveway-condition').value,$('driveway-search').value);
    for(const v of matches){const o=document.createElement('option');o.value=v.vin;o.textContent=v.title+' · Stock '+v.stock;picker.append(o);}
    if(matches.some(v=>v.vin===chosen))picker.value=chosen;
    else if(chosen){++versions.vehicle;delete images.vehicle;selectedVehicle=null;outline=[];appliedOutline=[];photoPicker.replaceChildren();photoPicker.disabled=true;draw();paintOutline();syncInquiry();}
    $('driveway-inventory-count').textContent=matches.length+' vehicles in the saved Austin inventory. Confirm availability with us.';
  }
  async function loadInventoryPhoto(){
    const version=++versions.vehicle;delete images.vehicle;outline=[];appliedOutline=[];draw();paintOutline();
    const url=photoPicker.value;if(!approvedPhoto(url))return;
    status.textContent='Opening inventory photo…';
    try{
      const img=await new Promise((resolve,reject)=>{const image=new Image();image.crossOrigin='anonymous';image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('This inventory photo cannot be used in a downloadable preview. Upload a saved vehicle photo instead.'));image.src=url;});
      if(version!==versions.vehicle)return;
      images.vehicle=img;draw();paintOutline();status.textContent=images.scene?'Vehicle photo ready. You can outline the vehicle to hide its background.':'Vehicle photo ready. Choose your driveway photo next.';
    }catch(e){if(version===versions.vehicle)status.textContent=e.message;}
  }
  picker?.addEventListener('change',()=>{
    selectedVehicle=vehicles.find(v=>v.vin===picker.value)||null;syncInquiry();
    photoPicker.replaceChildren();const photos=[...new Set([...(selectedVehicle?.photoUrls||[]),selectedVehicle?.photoUrl].filter(approvedPhoto))];
    photos.forEach((url,i)=>{const o=document.createElement('option');o.value=url;o.textContent='Photo '+(i+1);photoPicker.append(o);});photoPicker.disabled=!photos.length;
    if(photos.length)loadInventoryPhoto();else{++versions.vehicle;delete images.vehicle;draw();paintOutline();status.textContent='Choose another vehicle or upload a vehicle photo.';}
  });
  photoPicker?.addEventListener('change',loadInventoryPhoto);
  for(const id of ['driveway-condition','driveway-search'])$(id)?.addEventListener('input',updateInventory);
  updateInventory();
  if(picker){
    const requested=new URLSearchParams(document.defaultView?.location?.search||'').get('vehicle');
    const selected=vehicles.find(v=>v.vin===requested&&v.locationId==='18393'&&v.status!=='not-observed'&&!v.external);
    if(selected){$('driveway-condition').value=selected.condition;updateInventory();picker.value=selected.vin;picker.dispatchEvent(new Event('change'));}
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
    try {link.href = canvas.toDataURL('image/png');link.click();status.textContent = 'Your preview is ready to save. Photos stay on this device.';}
    catch {status.textContent='This photo does not allow downloads. Upload a saved vehicle photo and try again.';}
  });
  draw();
}

if (typeof document !== 'undefined') installDrivewayPreview(document);
