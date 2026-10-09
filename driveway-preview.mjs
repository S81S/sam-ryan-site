import {vehiclePhotos} from './vehicle-photos.mjs';
import {vehicleImage,vehicleImageSet} from './vehicle-images.mjs';
export function imageFileError(file) {
  if (!file || !/^image\/(jpeg|png|webp)$/i.test(file.type)) return 'Choose a JPG, PNG or WebP photo. Export HEIC photos as JPG first.';
  return file.size > 20 * 1024 * 1024 ? 'Choose a photo smaller than 20 MB.' : '';
}
export function previewSize(width, height) { const scale=Math.min(1,1600/Math.max(width,height));return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))}; }
export function inventoryChoices(vehicles,condition='New',query='') {const terms=query.toLowerCase().trim().split(/\s+/).filter(Boolean);return (vehicles||[]).filter(v=>v.locationId==='18393'&&!v.external&&v.status!=='not-observed'&&(condition==='Both'||v.condition===condition)&&terms.every(t=>(v.title+' '+v.stock+' '+v.vin).toLowerCase().includes(t)));}
export function outlinePoint(x,y,width,height){return {x:Math.max(0,Math.min(1,x/width)),y:Math.max(0,Math.min(1,y/height))};}
export function approvedPhoto(value){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='cloudflareimages.dealereprocess.com'&&u.pathname.startsWith('/resrc/images/');}catch{return false;}}
export function vehicleBox(canvas,image,placement){const width=canvas.width*Number(placement.size)/100,height=width*(image.naturalHeight||image.height)/(image.naturalWidth||image.width);return {width,height,x:canvas.width*Number(placement.x)/100-width/2,y:canvas.height*Number(placement.y)/100-height};}
// Perspective adjustment of the existing photo plane, hinged at its bottom edge.
// This preserves the tire anchor and does not synthesize another vehicle view.
export function pitchGeometry(width,height,pitch){
 const radians=-Math.max(-35,Math.min(35,Number(pitch)||0))*Math.PI/180;
 const focal=Math.max(width,height)*2.5,sine=Math.sin(radians),cosine=Math.cos(radians);
 const topScale=focal/(focal+height*sine),projectedHeight=height*cosine*topScale;
 return {focal,sine,cosine,topScale,projectedHeight,width:Math.ceil(width*Math.max(1,topScale)),height:Math.ceil(projectedHeight)};
}
export function pitchCutout(source,pitch){
 if(!Number(pitch))return source;
 const {width,height}=source,g=pitchGeometry(width,height,pitch),out=source.ownerDocument.createElement('canvas');
 out.width=g.width;out.height=g.height;const ctx=out.getContext('2d');ctx.imageSmoothingEnabled=true;
 const sourceDistance=y=>y*g.focal/(g.cosine*g.focal-y*g.sine);
 // Inverse-map one destination row at a time so transparent edges have no
 // overlapping triangles or gaps. Cache this bitmap while moving or resizing.
 for(let y=0;y<out.height;y++){
  const upper=Math.min(g.projectedHeight,out.height-y),lower=Math.min(g.projectedHeight,out.height-y-1);
  const top=Math.min(height,sourceDistance(upper)),bottom=Math.max(0,sourceDistance(lower));
  const span=top-bottom;if(span<=0)continue;
  const d=sourceDistance((upper+lower)/2),rowWidth=width*g.focal/(g.focal+d*g.sine);
  ctx.drawImage(source,0,Math.max(0,height-top),width,span,(out.width-rowWidth)/2,y,rowWidth,1);
 }
 return out;
}
// Turn the photo plane around its vertical center. Symmetric output bounds
// retain the same bottom-center anchor when combined with pitch and sizing.
export function yawGeometry(width,height,yaw){
 const radians=-Math.max(-35,Math.min(35,Number(yaw)||0))*Math.PI/180;
 const focal=Math.max(width,height)*2.5,sine=Math.sin(radians),cosine=Math.cos(radians);
 const leftScale=focal/(focal-width/2*sine),rightScale=focal/(focal+width/2*sine);
 const left=-width/2*cosine*leftScale,right=width/2*cosine*rightScale;
 return {focal,sine,cosine,left,right,width:Math.ceil(2*Math.max(-left,right)),height:Math.ceil(height*Math.max(leftScale,rightScale))};
}
export function yawCutout(source,yaw){
 if(!Number(yaw))return source;
 const {width,height}=source,g=yawGeometry(width,height,yaw),out=source.ownerDocument.createElement('canvas');
 out.width=g.width;out.height=g.height;const ctx=out.getContext('2d');ctx.imageSmoothingEnabled=true;
 const sourceX=x=>x*g.focal/(g.cosine*g.focal-x*g.sine);
 // Inverse-map adjacent destination columns without overlapping alpha edges.
 for(let x=0;x<out.width;x++){
  const origin=x-out.width/2,left=Math.max(g.left,origin),right=Math.min(g.right,origin+1);
  if(right<=left)continue;
  const sourceLeft=Math.max(0,sourceX(left)+width/2),sourceRight=Math.min(width,sourceX(right)+width/2);
  const span=sourceRight-sourceLeft;if(span<=0)continue;
  const center=sourceX((left+right)/2),columnHeight=height*g.focal/(g.focal+center*g.sine);
  ctx.drawImage(source,sourceLeft,0,span,height,x+left-origin,out.height-columnHeight,right-left,columnHeight);
 }
 return out;
}
export function parkingPlacement(points,canvas,image){
  if(points.length!==2)throw Error('Mark both sides of one parking space.');
  const [a,b]=[...points].sort((p,q)=>p.x-q.x),dx=(b.x-a.x)*canvas.width,dy=(b.y-a.y)*canvas.height;
  if(dx<canvas.width*.08)throw Error('Mark the left and right sides of the space farther apart.');
  const angle=Math.atan2(dy,dx)*180/Math.PI;
  if(Math.abs(angle)>20)throw Error('Mark the left and right edges where the tires will sit, rather than the front and back of the space.');
  const y=(a.y+b.y)/2;
  if(y<.15)throw Error('Mark the space lower in the photo so there is room above the tires for the vehicle.');
  const subject=image||{width:1,height:1},radians=angle*Math.PI/180;
  const width=Math.min(dx*.9,(canvas.height*y-2)/(subject.height/subject.width*Math.cos(radians)+.5*Math.abs(Math.sin(radians))));
  return constrainParkingPlacement({x:(a.x+b.x)*50,y:y*100,size:width/canvas.width*100,rotate:angle},points,canvas,subject);
}
export function constrainParkingPlacement(placement,points,canvas,image){
 const ratio=image.height/image.width,angle=placement.rotate*Math.PI/180,co=Math.cos(angle),si=Math.sin(angle),left=Math.min(...points.map(p=>p.x))*canvas.width,right=Math.max(...points.map(p=>p.x))*canvas.width;
 const maxWidth=Math.min((right-left)*.98/(co+ratio*Math.abs(si)),canvas.height*.9/(ratio*co+Math.abs(si)));
 const width=Math.min(maxWidth,Math.max(1,placement.size/100*canvas.width)),height=width*ratio;
 const minX=-width/2*co+Math.min(0,height*si),maxX=width/2*co+Math.max(0,height*si);
 const minY=-height*co-width/2*Math.abs(si),maxY=width/2*Math.abs(si);
 const x=Math.max(left-minX,Math.min(right-maxX,placement.x/100*canvas.width)),y=Math.max(-minY+2,Math.min(canvas.height-maxY-2,placement.y/100*canvas.height));
 return {x:x/canvas.width*100,y:y/canvas.height*100,size:width/canvas.width*100,rotate:placement.rotate,maxSize:maxWidth/canvas.width*100};
}
function loadImage(url,cors=false){return new Promise((resolve,reject)=>{const image=new Image();if(cors)image.crossOrigin='anonymous';image.onload=()=>resolve(image);image.onerror=()=>reject(Error('This photo could not be opened for editing. Choose another view or upload a saved vehicle photo.'));image.src=url;});}
function canvasFromImage(image){const c=document.createElement('canvas');Object.assign(c,previewSize(image.naturalWidth||image.width,image.naturalHeight||image.height));c.getContext('2d').drawImage(image,0,0,c.width,c.height);return c;}
function trimCanvas(source){const c=source.getContext('2d'),data=c.getImageData(0,0,source.width,source.height).data;let left=source.width,top=source.height,right=-1,bottom=-1;for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++)if(data[(y*source.width+x)*4+3]>20){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}if(right<left||bottom<top)throw Error('No vehicle is inside that outline. Try again.');const out=document.createElement('canvas');out.width=right-left+1;out.height=bottom-top+1;out.getContext('2d').drawImage(source,left,top,out.width,out.height,0,0,out.width,out.height);return out;}
export function installDrivewayPreview(document){
 const $=id=>document.getElementById(id),canvas=$('driveway-canvas');if(!canvas)return;
 const controls=Object.fromEntries(['x','y','size','rotate','pitch','yaw'].map(k=>[k,$('driveway-'+k)])),save=$('driveway-save'),status=$('driveway-status'),editor=$('driveway-outline'),panel=$('driveway-outline-panel'),picker=$('driveway-inventory'),photoPicker=$('driveway-photo');
 const vehicles=document.defaultView?.usedInventoryData?.vehicles||[];
 let scene=null,original=null,cutout=null,selectedVehicle=null,photos=[],shown=8,outline=[],outlineCursor=null,parking=[],parkingBackup=null,parkingBackupCutout=null,marking=false,parkingCursor=null,drag=null,sceneVersion=0,vehicleVersion=0,cutoutJob=null;
 let pitchedSource=null,pitchedAngle=null,pitched=null,turnedSource=null,turnedAngle=null,turned=null;
 function currentCutout(pitch,yaw){if(pitchedSource!==cutout||pitchedAngle!==pitch){pitchedSource=cutout;pitchedAngle=pitch;pitched=pitchCutout(cutout,pitch);}if(turnedSource!==pitched||turnedAngle!==yaw){turnedSource=pitched;turnedAngle=yaw;turned=yawCutout(pitched,yaw);}return turned;}
 const defaultParking=()=>[{x:.25,y:.85},{x:.75,y:.85}];
 let drawingFrame=null;
 function scheduleDraw(){if(drawingFrame===null)drawingFrame=document.defaultView.requestAnimationFrame(()=>{drawingFrame=null;draw();});}
 function say(message,error=false){status.textContent=message;status.dataset.error=String(error);}
 function syncInquiry(){for(const who of ['Sam','Ryan']){const a=$('driveway-ask-'+who.toLowerCase());if(!a)continue;const p=new URLSearchParams({advisor:who,request:'I tried the driveway preview. Please help me check vehicle dimensions, features and availability.'});if(selectedVehicle)p.set('vehicle',selectedVehicle.vin);a.href='contact.html?'+p;}}
 function paintOutline(){panel.hidden=!original;if(!original)return;Object.assign(editor,previewSize(original.naturalWidth||original.width,original.naturalHeight||original.height));const c=editor.getContext('2d');c.drawImage(original,0,0,editor.width,editor.height);c.strokeStyle='#ffd05a';c.fillStyle='#ffd05a';c.lineWidth=Math.max(2,editor.width/350);if(outline.length){c.beginPath();outline.forEach((p,i)=>i?c.lineTo(p.x*editor.width,p.y*editor.height):c.moveTo(p.x*editor.width,p.y*editor.height));if(outline.length>2)c.closePath();c.stroke();for(const p of outline){c.beginPath();c.arc(p.x*editor.width,p.y*editor.height,Math.max(4,editor.width/150),0,Math.PI*2);c.fill();}}if(outlineCursor){const x=outlineCursor.x*editor.width,y=outlineCursor.y*editor.height;c.strokeStyle='white';c.beginPath();c.moveTo(x-12,y);c.lineTo(x+12,y);c.moveTo(x,y-12);c.lineTo(x,y+12);c.stroke();}$('driveway-cutout').disabled=outline.length<3;$('driveway-outline-status').textContent=outline.length+' outline points. Follow the outside edge of the vehicle.';}
 let previewedCutout=null;
 function previewCutout(){const box=$('driveway-cutout-preview');box.hidden=!cutout;if(!cutout){previewedCutout=null;return;}if(previewedCutout===cutout)return;const out=$('driveway-cutout-result');out.width=cutout.width;out.height=cutout.height;out.getContext('2d').drawImage(cutout,0,0);previewedCutout=cutout;}
 function paint(target,showGuides=true){const ctx=target.getContext('2d');if(!scene)return;const size=previewSize(scene.naturalWidth,scene.naturalHeight);if(target.width!==size.width)target.width=size.width;if(target.height!==size.height)target.height=size.height;ctx.clearRect(0,0,target.width,target.height);ctx.drawImage(scene,0,0,target.width,target.height);
  if(cutout&&parking.length===2&&!marking){const placement=Object.fromEntries(Object.entries(controls).map(([k,v])=>[k,Number(v.value)])),box=vehicleBox(target,cutout,placement);ctx.save();ctx.translate(box.x+box.width/2,box.y+box.height);ctx.rotate(placement.rotate*Math.PI/180);ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(0,0,box.width*.43,Math.max(2,box.width*.035),0,0,Math.PI*2);ctx.fill();const view=currentCutout(placement.pitch,placement.yaw),width=box.width*view.width/cutout.width,height=box.height*view.height/cutout.height;ctx.drawImage(view,-width/2,-height,width,height);ctx.restore();}
  if(showGuides&&marking){ctx.lineWidth=Math.max(2,target.width/350);ctx.strokeStyle='#ffc447';ctx.fillStyle='#ffc447';if(parking.length){ctx.beginPath();parking.forEach((p,i)=>i?ctx.lineTo(p.x*target.width,p.y*target.height):ctx.moveTo(p.x*target.width,p.y*target.height));ctx.stroke();}for(const p of [...parking,...(parkingCursor?[parkingCursor]:[])]){ctx.beginPath();ctx.arc(p.x*target.width,p.y*target.height,Math.max(6,target.width/100),0,2*Math.PI);ctx.stroke();}}
 }
 // Markers set the initial fit only. Manual resizing keeps the tire anchor fixed
 // and may extend past the markers or photo edges, just like a photo editor.
 function draw(){canvas.hidden=!scene;canvas.setAttribute('aria-label',marking?'Optional parking guide. Tap the left edge, then the right edge. Arrow keys move the marker; Enter places it.':'Your driveway preview. Drag the vehicle to position it, or use the arrow keys.');const ready=!!(scene&&cutout&&parking.length===2&&!marking);save.disabled=!ready;$('driveway-controls').disabled=!ready;$('driveway-mark').disabled=!scene;$('driveway-cancel-mark').hidden=!marking;$('driveway-smaller').disabled=Number(controls.size.value)<=Number(controls.size.min);$('driveway-larger').disabled=Number(controls.size.value)>=Number(controls.size.max);$('driveway-pitch-forward').disabled=Number(controls.pitch.value)>=Number(controls.pitch.max);$('driveway-pitch-back').disabled=Number(controls.pitch.value)<=Number(controls.pitch.min);$('driveway-yaw-left').disabled=Number(controls.yaw.value)<=Number(controls.yaw.min);$('driveway-yaw-right').disabled=Number(controls.yaw.value)>=Number(controls.yaw.max);if(scene)paint(canvas);previewCutout();}
 function fit(){if(!scene||!cutout||parking.length!==2)return;try{const p={...parkingPlacement(parking,canvas,cutout),pitch:0,yaw:0};for(const k of Object.keys(controls))controls[k].value=p[k];marking=false;parkingBackup=null;parkingBackupCutout=null;parkingCursor=null;$('driveway-parking-guide').open=false;$('driveway-parking-status').textContent='Guide applied. You can still change the size and position.';say('Your preview is ready. Drag the vehicle into place, then adjust its size and tilt.');draw();}catch(e){parking=[];marking=true;$('driveway-parking-status').textContent=e.message;draw();}}
 function beginMark(){if(!scene)return;if(!marking){parkingBackup=parking.map(p=>({...p}));parkingBackupCutout=cutout;}parking=[];parkingCursor=null;marking=true;$('driveway-parking-guide').open=true;$('driveway-parking-status').textContent='Tap the left edge of one parking space, near where the tires will sit.';draw();}
 function markPoint(p){parking.push(p);if(parking.length===1)$('driveway-parking-status').textContent='Now tap the right edge of that same parking space.';if(parking.length===2){try{parkingPlacement(parking,canvas,cutout);marking=false;if(cutout)fit();else $('driveway-parking-status').textContent='Space marked. Choose an exterior vehicle view to place here.';}catch(e){parking=[];$('driveway-parking-status').textContent=e.message;}}draw();}
 async function processVehicle(version){if(!original)return;cutoutJob?.abort();const job=cutoutJob=new AbortController();cutout=null;draw();say('Removing the vehicle photo’s background…');try{const {removeVehicleBackground}=await import('./driveway-cutout.mjs');const result=await removeVehicleBackground(original,{signal:job.signal,timeoutMs:90000,onProgress:({message})=>{if(version===vehicleVersion)say(message);}});if(version!==vehicleVersion||job.signal.aborted)return;cutout=result.canvas;panel.open=false;if(scene&&parking.length===2)fit();else draw();say(scene?(marking?'Background removed. Finish the optional parking guide or cancel it to place your vehicle.':'Your vehicle is ready. Drag it into place, then adjust its size and tilt.'):'Background removed. Choose your driveway photo next.');}catch(e){if(version!==vehicleVersion||e.name==='AbortError')return;say(e.message+' You can also use Touch up the cutout below.',true);panel.open=true;}finally{if(cutoutJob===job)cutoutJob=null;}}
 function clearVehicle(){cutoutJob?.abort();++vehicleVersion;original=null;cutout=null;outline=[];outlineCursor=null;paintOutline();draw();return vehicleVersion;}
 async function receiveVehicle(image,version){if(version!==vehicleVersion)return;original=image;paintOutline();await processVehicle(version);}
 for(const kind of ['scene','vehicle'])$('driveway-'+kind).addEventListener('change',async event=>{const file=event.target.files?.[0];if(!file)return;const error=imageFileError(file);if(error){say(error,true);return;}let version;if(kind==='scene'){version=++sceneVersion;scene=null;parking=[];draw();}else{version=clearVehicle();selectedVehicle=null;picker.value='';photoPicker.replaceChildren();photoPicker.disabled=true;photos=[];renderPhotos();syncInquiry();}const url=URL.createObjectURL(file);say('Opening your photo…');try{const img=await loadImage(url);if(kind==='scene'){if(version!==sceneVersion)return;scene=img;parking=defaultParking();parkingBackup=null;parkingBackupCutout=null;marking=false;$('driveway-parking-guide').open=false;draw();if(cutout)fit();else say('Driveway ready. Pick an exterior vehicle photo and it will appear below.');}else await receiveVehicle(img,version);}catch(e){if(version===(kind==='scene'?sceneVersion:vehicleVersion))say(e.message,true);}finally{URL.revokeObjectURL(url);}});
 editor.addEventListener('click',e=>{if(!original)return;const r=editor.getBoundingClientRect();outline.push(outlinePoint(e.clientX-r.left,e.clientY-r.top,r.width,r.height));paintOutline();});
 editor.addEventListener('keydown',e=>{if(!original||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' '].includes(e.key))return;e.preventDefault();outlineCursor??={x:.5,y:.5};const step=e.shiftKey?.05:.01,d={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]}[e.key];if(d)outlineCursor=outlinePoint(outlineCursor.x+d[0],outlineCursor.y+d[1],1,1);else outline.push({...outlineCursor});paintOutline();});
 $('driveway-undo').onclick=()=>{outline.pop();paintOutline();};
 $('driveway-cutout').onclick=()=>{if(!original||outline.length<3)return;cutoutJob?.abort();++vehicleVersion;try{const c=canvasFromImage(original),ctx=c.getContext('2d');ctx.globalCompositeOperation='destination-in';ctx.beginPath();outline.forEach((p,i)=>i?ctx.lineTo(p.x*c.width,p.y*c.height):ctx.moveTo(p.x*c.width,p.y*c.height));ctx.closePath();ctx.fill();cutout=trimCanvas(c);panel.open=false;if(parking.length===2)fit();else draw();say('Your cutout is applied. Drag the vehicle into place, then adjust the size and tilt below.');}catch(e){say(e.message,true);}};
 $('driveway-retry').onclick=()=>{if(original)processVehicle(vehicleVersion);};
 function renderPhotos(){const grid=$('driveway-photos'),focused=grid.contains(document.activeElement);grid.replaceChildren();photos.slice(0,shown).forEach((url,i)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-label','Use vehicle photo '+(i+1));b.setAttribute('aria-pressed',String(photoPicker.value===url));const img=document.createElement('img');img.src=vehicleImage(url,320);img.srcset=vehicleImageSet(url,[160,320]);img.sizes='(max-width:600px) 28vw, 160px';img.width=160;img.height=120;img.alt='Vehicle view '+(i+1);img.loading='lazy';img.decoding='async';const text=document.createElement('span');text.textContent='View '+(i+1);b.append(img,text);b.onclick=()=>{photoPicker.value=url;loadInventoryPhoto();};grid.append(b);if(focused&&photoPicker.value===url)b.focus();});$('driveway-more-photos').hidden=photos.length<=shown;}
 async function loadInventoryPhoto(){const version=clearVehicle(),url=photoPicker.value;renderPhotos();if(!approvedPhoto(url))return;say('Opening the selected vehicle view…');try{await receiveVehicle(await loadImage(url,true),version);}catch(e){if(version===vehicleVersion)say(e.message,true);}}
 // The page's inventory carries one main photo per vehicle; the gallery loads when a vehicle is chosen.
 const showViews=(vehicle,gallery)=>{photos=[...new Set([...gallery,vehicle?.photoUrl].filter(approvedPhoto))];shown=8;photoPicker.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent='Choose the view that matches your driveway';photoPicker.append(empty);photos.forEach((url,i)=>{const o=document.createElement('option');o.value=url;o.textContent='View '+(i+1);photoPicker.append(o);});photoPicker.disabled=!photos.length;renderPhotos();say(photos.length?'Choose an exterior view that faces the same way as your parking space.':'Choose another vehicle or upload your own vehicle photo.');};
 picker.addEventListener('change',async()=>{clearVehicle();const chosen=selectedVehicle=vehicles.find(v=>v.vin===picker.value)||null;syncInquiry();if(!chosen||Array.isArray(chosen.photoUrls)){showViews(chosen,chosen?.photoUrls||[]);return;}photos=[];photoPicker.replaceChildren();photoPicker.disabled=true;renderPhotos();say('Loading this vehicle’s photos…');let gallery=[];try{gallery=await vehiclePhotos(chosen);}catch{}if(selectedVehicle===chosen)showViews(chosen,gallery);});
 photoPicker.addEventListener('change',loadInventoryPhoto);$('driveway-more-photos').onclick=()=>{shown+=12;renderPhotos();};
 function updateInventory(){const chosen=picker.value;picker.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent='Choose a vehicle';picker.append(empty);const matches=inventoryChoices(vehicles,$('driveway-condition').value,$('driveway-search').value);for(const v of matches){const o=document.createElement('option');o.value=v.vin;o.textContent=v.title+' · Stock '+v.stock;picker.append(o);}if(matches.some(v=>v.vin===chosen))picker.value=chosen;else if(chosen){clearVehicle();selectedVehicle=null;photos=[];photoPicker.replaceChildren();photoPicker.disabled=true;renderPhotos();syncInquiry();}$('driveway-inventory-count').textContent=matches.length+' vehicles in the saved Austin inventory. Confirm availability with us.';}
 for(const id of ['driveway-condition','driveway-search'])$(id).addEventListener('input',updateInventory);updateInventory();
 const requested=new URLSearchParams(document.defaultView?.location?.search||'').get('vehicle'),selected=vehicles.find(v=>v.vin===requested&&v.locationId==='18393'&&v.status!=='not-observed'&&!v.external);if(selected){$('driveway-condition').value=selected.condition;updateInventory();picker.value=selected.vin;picker.dispatchEvent(new Event('change'));}
 $('driveway-mark').onclick=beginMark;$('driveway-reset').onclick=fit;for(const input of Object.values(controls))input.addEventListener('input',scheduleDraw);
 function cancelGuide(){const needsFit=!!cutout&&cutout!==parkingBackupCutout;parking=parkingBackup||defaultParking();parkingBackup=null;parkingBackupCutout=null;marking=false;parkingCursor=null;$('driveway-parking-guide').open=false;$('driveway-parking-status').textContent='';say(cutout?'Drag the vehicle into place, then adjust its size and tilt.':'Choose a vehicle photo to place in your driveway.');if(needsFit)fit();else draw();}
 $('driveway-cancel-mark').onclick=cancelGuide;
 $('driveway-parking-guide').addEventListener('toggle',()=>{if(!$('driveway-parking-guide').open&&marking)cancelGuide();});
 for(const [id,factor] of [['driveway-smaller',1/1.1],['driveway-larger',1.1]])$(id).onclick=()=>{controls.size.value=Math.max(Number(controls.size.min),Math.min(Number(controls.size.max),Math.round(Number(controls.size.value)*factor*10)/10));draw();};
 for(const [id,step] of [['driveway-pitch-forward',2.5],['driveway-pitch-back',-2.5]])$(id).onclick=()=>{controls.pitch.value=Math.max(Number(controls.pitch.min),Math.min(Number(controls.pitch.max),Number(controls.pitch.value)+step));draw();};
 $('driveway-pitch-reset').onclick=()=>{controls.pitch.value=0;draw();};
 for(const [id,step] of [['driveway-yaw-left',-2.5],['driveway-yaw-right',2.5]])$(id).onclick=()=>{controls.yaw.value=Math.max(Number(controls.yaw.min),Math.min(Number(controls.yaw.max),Number(controls.yaw.value)+step));draw();};
 $('driveway-yaw-reset').onclick=()=>{controls.yaw.value=0;draw();};
 canvas.addEventListener('pointerdown',e=>{if(!scene||e.isPrimary===false||e.button!==0||drag)return;const r=canvas.getBoundingClientRect();if(marking){markPoint(outlinePoint(e.clientX-r.left,e.clientY-r.top,r.width,r.height));return;}if(!cutout||parking.length!==2)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,startX:Number(controls.x.value),startY:Number(controls.y.value),width:r.width,height:r.height};canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;controls.x.value=Math.max(0,Math.min(100,drag.startX+(e.clientX-drag.x)/drag.width*100));controls.y.value=Math.max(0,Math.min(100,drag.startY+(e.clientY-drag.y)/drag.height*100));scheduleDraw();});for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(e.pointerId===drag?.id)drag=null;});
 canvas.addEventListener('keydown',e=>{if(!scene||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' '].includes(e.key))return;e.preventDefault();const step=e.shiftKey?.05:.01,d={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]}[e.key];if(marking){parkingCursor??={x:parking.length?.65:.35,y:.75};if(d){parkingCursor=outlinePoint(parkingCursor.x+d[0],parkingCursor.y+d[1],1,1);$('driveway-parking-status').textContent=(parking.length?'Right':'Left')+' marker: '+Math.round(parkingCursor.x*100)+'% across, '+Math.round(parkingCursor.y*100)+'% down. Press Enter to place it.';}else{markPoint({...parkingCursor});parkingCursor=null;}}else if(d&&cutout){controls.x.value=Number(controls.x.value)+d[0]*100;controls.y.value=Number(controls.y.value)+d[1]*100;}draw();});
 save.onclick=()=>{if(save.disabled)return;try{const output=document.createElement('canvas');paint(output,false);output.toBlob(blob=>{if(!blob){say('The preview could not be saved. Try another photo.',true);return;}const url=URL.createObjectURL(blob),link=document.createElement('a');link.download='my-driveway-preview.png';link.href=url;link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);say('Your preview is ready to save. Your photos stay on this device.');},'image/png');}catch{say('This photo does not allow downloads. Upload a saved vehicle photo and try again.',true);}};
 draw();
}
if(typeof document!=='undefined'&&document.getElementById('driveway-canvas'))installDrivewayPreview(document);
