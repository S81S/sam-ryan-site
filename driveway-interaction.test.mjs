import test from 'node:test';
import assert from 'node:assert/strict';
import {installDrivewayPreview,previewSize} from './driveway-preview.mjs';

function fixture(vehicles=[]){
 const elements=new Map(),frames=[];
 const document={activeElement:null,defaultView:{usedInventoryData:{vehicles},location:{search:''},requestAnimationFrame:f=>{frames.push(f);return frames.length;}},getElementById:id=>{if(!elements.has(id))elements.set(id,makeElement(id));return elements.get(id);},createElement:tag=>makeElement(tag)};
 function makeElement(id){
  let width=300,height=150;
  const ctx={draws:0,clears:0,drawImage(){this.draws++;},clearRect(){this.clears++;},getImageData(x,y,w,h){return {data:new Uint8ClampedArray(w*h*4).fill(255)};}};
  for(const name of ['beginPath','closePath','lineTo','moveTo','stroke','fill','arc','ellipse','save','restore','translate','rotate','fillRect'])ctx[name]=()=>{};
  const el={id,ownerDocument:document,value:'',min:0,max:100,attrs:{},dataset:{},events:{},children:[],resizes:0,context:ctx,hidden:false,
   get width(){return width;},set width(v){width=v;this.resizes++;},get height(){return height;},set height(v){height=v;this.resizes++;},
   setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,f){(this.events[k]??=[]).push(f);},getContext:()=>ctx,
   append(...items){this.children.push(...items);},replaceChildren(...items){this.children=[...items];},contains:()=>false,
   getBoundingClientRect:()=>({left:0,top:0,width:100,height:100}),setPointerCapture(id){this.captured=id;},focus(){document.activeElement=this;},
   async fire(type,data={}){const event={type,preventDefault(){},...data};for(const f of this.events[type]||[])await f(event);},
  };
  return el;
 }
 const $=document.getElementById;
 for(const [key,value] of Object.entries({x:50,y:85,size:50,rotate:0,pitch:0,yaw:0}))$('driveway-'+key).value=value;
 $('driveway-condition').value='Both';
 installDrivewayPreview(document);
 return {document,$,frames,flush(){while(frames.length)frames.shift()();}};
}

test('driveway drag follows only the primary pointer and paints once per animation frame',async t=>{
 const oldImage=globalThis.Image,oldDocument=globalThis.document;
 globalThis.Image=class {naturalWidth=100;naturalHeight=100;set src(value){queueMicrotask(()=>this.onload?.());}};
 t.after(()=>{if(oldImage===undefined)delete globalThis.Image;else globalThis.Image=oldImage;if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;});
 const f=fixture(),{$}=f,canvas=$('driveway-canvas');
 globalThis.document=f.document;
 const file=new Blob(['fixture'],{type:'image/jpeg'});
 await $('driveway-scene').fire('change',{target:{files:[file]}});
 // Exercise the real manual fallback after this Node environment declines automatic removal.
 await $('driveway-vehicle').fire('change',{target:{files:[file]}});
 for(const [clientX,clientY] of [[10,10],[80,10],[80,80]])await $('driveway-outline').fire('click',{clientX,clientY});
 $('driveway-cutout').onclick();
 assert.equal($('driveway-save').disabled,false,$('driveway-status').textContent);
 const pointer={pointerId:1,isPrimary:true,button:0,clientX:50,clientY:50};
 const start=Number($('driveway-x').value);
 await canvas.fire('pointerdown',{...pointer,isPrimary:false});
 await canvas.fire('pointermove',{...pointer,clientX:80});assert.equal(Number($('driveway-x').value),start);
 await canvas.fire('pointerdown',{...pointer,button:2});
 await canvas.fire('pointermove',{...pointer,clientX:80});assert.equal(Number($('driveway-x').value),start);
 await canvas.fire('pointerdown',pointer);assert.equal(canvas.captured,1);
 await canvas.fire('pointerdown',{...pointer,pointerId:2,isPrimary:false});
 await canvas.fire('pointermove',{...pointer,pointerId:2,clientX:80});assert.equal(Number($('driveway-x').value),start);
 await canvas.fire('pointerup',{pointerId:2});
 const draws=canvas.context.draws,resizes=canvas.resizes,previewDraws=$('driveway-cutout-result').context.draws;
 await canvas.fire('pointermove',{...pointer,clientX:60});
 await canvas.fire('pointermove',{...pointer,clientX:70});
 assert.equal(Number($('driveway-x').value),start+20);
 assert.equal(f.frames.length,1);assert.equal(canvas.context.draws,draws);
 f.flush();assert.equal(canvas.context.draws,draws+2);
 assert.equal(canvas.resizes,resizes);assert.equal($('driveway-cutout-result').context.draws,previewDraws);
 await canvas.fire('pointercancel',{pointerId:1});
 await canvas.fire('pointermove',{...pointer,clientX:90});assert.equal(Number($('driveway-x').value),start+20);
});

test('driveway photo buttons use small responsive previews while selection retains the original source',async()=>{
 const original='https://cloudflareimages.dealereprocess.com/resrc/images/c_limit,fl_lossy,w_1600/v1/photo.jpg';
 const vehicle={vin:'1C6SRFHP8TN435804',title:'Ram 1500',stock:'R1',condition:'New',locationId:'18393',photoUrl:original,photoUrls:[original]};
 const {$}=fixture([vehicle]);$('driveway-inventory').value=vehicle.vin;
 await $('driveway-inventory').fire('change');
 const button=$('driveway-photos').children[0],image=button.children[0];
 assert.match(image.src,/w_320\//);assert.match(image.srcset,/w_160\/.*160w.*w_320\/.*320w/);
 assert.equal(image.width,160);assert.equal(image.height,120);assert.equal(image.loading,'lazy');
 assert.equal($('driveway-photo').children[1].value,original);
});

test('driveway preview dimensions retain source proportions and the existing 1600-pixel limit',()=>{
 assert.deepEqual(previewSize(4032,3024),{width:1600,height:1200});
 assert.deepEqual(previewSize(3024,4032),{width:1200,height:1600});
 assert.deepEqual(previewSize(640,480),{width:640,height:480});
});
