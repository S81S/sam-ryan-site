import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {shoppingContext} from './shopping-context.mjs';
import {findInventoryByIdentifier} from './compare-picker.mjs';

const origin='https://carswithsam.com';
const vin1='3C63RRGL5TG354434',vin2='1C6RREJP2TN381273';
function link(href){return {href:new URL(href,origin).href,textContent:'',getAttribute(name){return this[name];}};}
function detailSession(search){
 const back=link('/inventory'),contact=link('/contact?vehicle='+vin1+'&advisor=Ryan'),compare=link('/compare?vehicles='+vin1+'&condition=New'),sms=link('sms:+17372091320?body=Hi%20Sam');
 const document={getElementById:()=>back,querySelectorAll:selector=>selector==='.photo-strip a'?[]:[contact,compare,sms],querySelector:()=>null};
 const source=readFileSync(new URL('./vehicle-page-context.js',import.meta.url),'utf8').replace(/^import\('\/sticker-credit.mjs'\).*$/m,'');
 vm.runInNewContext(source,{document,location:{search},URL,URLSearchParams});
 return {back,contact,compare,sms};
}
const preferences='Want: 14.4-inch screen; Exclude: cloth seats; Panoramic roof: no preference';
const search=new URLSearchParams({q:'2026 Ram 1500 under 65000',condition:'Both',maxPrice:'65000',requestedEquipment:preferences,from:'photo-guide'});

test('Photo guide preferences and budget survive details, both advisor routes and Compare',()=>{
 const s=detailSession('?'+search);
 const contact=new URL(s.contact.href),compare=new URL(s.compare.href),body=new URL(s.sms.href).searchParams.get('body');
 assert.equal(contact.searchParams.get('advisor'),'Ryan');
 assert.ok(contact.searchParams.get('request').includes(preferences));
 assert.ok(body.includes(preferences));
 assert.match(body,/Maximum listed price: \$65,000/);
 assert.equal(compare.searchParams.get('requestedEquipment'),preferences);
 assert.equal(compare.searchParams.get('condition'),'Both');
 assert.equal(compare.searchParams.get('maxPrice'),'65000');
 assert.equal(compare.searchParams.get('vehicles'),vin1);
 assert.ok(!s.sms.href.includes('+under+'),'SMS encodes spaces for messaging apps');
 assert.equal(new URL(s.back.href,origin).pathname,'/perfect-match');
 assert.equal(new URL(s.back.href,origin).hash,'#photo-finder');
 assert.match(s.back.textContent,/photo guide/);
});

test('Feature-only detail requests are retained even without a free-text query',()=>{
 const s=detailSession('?requestedEquipment='+encodeURIComponent(preferences));
 assert.equal(new URL(s.compare.href).searchParams.get('requestedEquipment'),preferences);
 assert.ok(new URL(s.contact.href).searchParams.get('request').includes(preferences));
});

test('Back to comparison restores the full valid shortlist and keeps the shopping request',()=>{
 const params=new URLSearchParams(search);params.set('from','compare');params.set('vehicles',[vin1,vin2,vin1,'not-a-vin'].join(','));
 const s=detailSession('?'+params),back=new URL(s.back.href,origin);
 assert.equal(back.pathname,'/compare');assert.equal(back.searchParams.get('vehicles'),vin1+','+vin2);
 assert.equal(back.searchParams.get('requestedEquipment'),preferences);
 assert.equal(new URL(s.compare.href).searchParams.get('vehicles'),vin1+','+vin2);
});

function compareSession(){
 const nodes=new Map(),listeners={};
 function node(){return {value:'',textContent:'',hidden:false,options:[],listeners:{},attributes:{},classList:{add(){}},append(...children){this.options.push(...children);},replaceChildren(){},after(){},insertAdjacentElement(){},removeAttribute(name){delete this[name];delete this.attributes[name];},setAttribute(name,value){this.attributes[name]=value;},getAttribute(name){return this.attributes[name];},closest(){return this;},addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);},dispatchEvent(event){for(const fn of this.listeners[event.type]||[])fn(event);}};}
 const get=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
 const document={getElementById:get,createElement:()=>node(),createDocumentFragment:()=>node(),querySelector:()=>node(),addEventListener(name,fn){(listeners[name]??=[]).push(fn);},dispatchEvent(event){for(const fn of listeners[event.type]||[])fn(event);}};
 class FakeEvent {constructor(type){this.type=type;}}
 const vehicles=[vin1,vin2].map((vin,i)=>({vin,stock:'R'+i,title:'New 2026 Ram 1500',condition:'New',price:45000,miles:0,locationId:'18393',decodedSpecs:{},photoUrl:'https://example.com/photo-'+i+'.jpg',stickerUrl:'https://example.com/sticker-'+i+'.pdf'}));
 const params=new URLSearchParams(search);params.set('vehicles',vin1);
 const location={search:'?'+params};
 const context={document,window:{usedInventoryData:{vehicles,capturedAt:'2026-10-08'},equipmentIndex:{records:Object.fromEntries(vehicles.map(v=>[v.vin,{status:'verified'}]))},addEventListener(){}},location,URL,URLSearchParams,Event:FakeEvent,CustomEvent:FakeEvent,Intl,console,shoppingContext:()=>shoppingContext(document,location.search),findInventoryByIdentifier,vehicleImage:url=>url,vehicleImageSet:url=>url+' 640w',appendStickerCredit(){},usesWindowStickerOrg:()=>false,installVehiclePickers(){},normalizeVIN:q=>q.toUpperCase().replace(/\s/g,'')};
 const source=readFileSync(new URL('./sticker-compare.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/^export \{SIDES,vehicle\};$/m,'');
 vm.runInNewContext(source,context);
 return {get,select(side,vin){get('choose-'+side).value=vin;get('choose-'+side).dispatchEvent(new FakeEvent('change'));}};
}

test('Comparison detail links retain preferences and update every vehicle with the latest shortlist',()=>{
 const s=compareSession();
 const first=new URL(s.get('listing-1').href,origin);
 assert.equal(first.searchParams.get('q'),search.get('q'),'initial query is ready before group module runs');
 assert.equal(first.searchParams.get('condition'),'Both');
 assert.equal(first.searchParams.get('requestedEquipment'),preferences);
 assert.equal(first.searchParams.get('maxPrice'),'65000');
 s.select('2',vin2);
 for(const side of ['1','2']){
  const url=new URL(s.get('listing-'+side).href,origin);
  assert.equal(url.searchParams.get('vehicles'),vin1+','+vin2);
  assert.equal(url.searchParams.get('from'),'compare');
 }
 s.select('2','');
 assert.equal(new URL(s.get('listing-1').href,origin).searchParams.get('vehicles'),vin1);
 assert.equal(s.get('vehicle-photo-2').srcset,undefined,'clearing the vehicle clears its responsive image');
});
