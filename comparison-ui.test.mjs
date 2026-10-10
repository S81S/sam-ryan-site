import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Execute the real page renderer and evidence modules without a browser or network.
const source=fs.readFileSync(new URL('./equipment-compare.mjs',import.meta.url),'utf8');
const imports={};
for(const [,names,path] of source.matchAll(/^import \{([^}]+)\} from '([^']+)';$/gm)){
 const module=await import(path);
 for(const name of names.split(',').map(n=>n.trim()))imports[name]=module[name];
}
function node(tag='div'){
 const n={tagName:tag,children:[],attributes:{},dataset:{},style:{},listeners:{},className:'',value:'',hidden:false,
  append(...items){for(const item of items){const child=typeof item==='string'?Object.assign(node('#text'),{textContent:item}):item;child.parent=this;this.children.push(child);}},
  prepend(...items){for(const child of items.reverse()){child.parent=this;this.children.unshift(child);}},
  replaceChildren(...items){this.children=[];this.ownText='';this.append(...items);},
  replaceWith(next){const index=this.parent.children.indexOf(this);this.parent.children[index]=next;next.parent=this.parent;},
  setAttribute(k,v){this.attributes[k]=String(v);},getAttribute(k){return this.attributes[k]??null;},
  addEventListener(k,fn){this.listeners[k]=fn;},scrollIntoView(){},
  querySelectorAll(selector){return this.children.flatMap(child=>[...(selector.startsWith('.')?child.className.split(/\s+/).includes(selector.slice(1)):child.tagName===selector)?[child]:[],...child.querySelectorAll(selector)]);},
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 };
 Object.defineProperty(n,'textContent',{get(){return (this.ownText||'')+this.children.map(c=>c.textContent).join('');},set(value){this.ownText=String(value);this.children=[];}});
 return n;
}
const packageGroup=(name,equipment,exclusions=[])=>({name,equipment,exclusions,method:'sticker-package-layout'});
function renderComparison(groups=[
 [packageGroup('Comfort Group',['Heated Front Seats','Heated Steering Wheel','Power Driver Seat','Dual-Zone Automatic Temperature Control','115-Volt Power Outlet','Remote Start System'],['Available separately: panoramic roof'])],
 [packageGroup('Comfort Group',['Heated Front Seats','Heated Steering Wheel'])]
],{titles=['Used 2020 Test vehicle 1','Used 2020 Test vehicle 2'],search=''}={}){
 const root=node('section'),selectors=Object.fromEntries([1,2,3,4,5].map((i)=>['choose-'+i,{value:i<3?'VIN'+i:''}]));
 const records=Object.fromEntries(groups.map((packageGroups,i)=>{const vin='VIN'+(i+1);return [vin,{vin,status:'verified',sourceUrl:'https://example.test/sticker/'+vin,identityLines:['2020 MODEL YEAR','TEST VEHICLE'],lines:['Heated Front Seats',...(i===0?['Power Sunroof']:[]),'OPTIONAL EQUIPMENT',...packageGroups.map(g=>g.name)],packageGroups,features:{heatedSeats:{value:true,evidence:['Heated Front Seats']},...(i===0?{sunroof:{value:true,evidence:['Power Sunroof']}}:{})}}];}));
 const document={createElement:node,getElementById:id=>id==='automatic-equipment'?root:selectors[id]||null,addEventListener(k,fn){this[k]=fn;}};
 const window={usedInventoryData:{vehicles:[1,2].map(i=>({vin:'VIN'+i,stock:'TEST'+i,title:titles[i-1],condition:'Used'}))},equipmentIndex:{records}};
 const context={...imports,document,window,location:{search},URLSearchParams,Intl,console,
  createComparisonGuideLoader:()=>()=>new Promise(()=>{}),ensurePackageContents:()=>{},shoppingContext:()=>({})};
 vm.runInNewContext(source.replace(/^import .*;\n/gm,''),context);
 return {root,records,change:()=>document['compare:changed'](),buttons:()=>root.querySelector('.comparison-view-buttons').querySelectorAll('button'),
  category(label){const button=this.buttons().find(n=>n.textContent.startsWith(label));assert.ok(button,label);button.listeners.click();},
  rows:()=>root.querySelector('.comparison-table-wrap').querySelectorAll('tr').filter(n=>n.dataset.comparisonGroup)};
}

test('Compare keeps the shared/different categories and original side-by-side table as its primary view',()=>{
 const s=renderComparison();
 assert.deepEqual(s.buttons().map(b=>b.textContent.replace(/ \(\d+\)$/,'')),['All equipment','Differences','Shared equipment','Needs confirmation']);
 assert.equal(s.buttons()[0].getAttribute('aria-pressed'),'true');
 assert.ok(s.root.querySelector('.equipment-matrix'));
 assert.equal(s.root.querySelector('.vehicle-tradeoffs'),null);
 assert.equal(s.root.querySelector('.package-overview'),null);
 assert.ok(s.root.children.indexOf(s.root.querySelector('.comparison-controls'))<s.root.children.indexOf(s.root.querySelector('.comparison-table-wrap')));
 s.category('Differences');
 assert.ok(s.rows().length);assert.ok(s.rows().every(r=>r.dataset.comparisonGroup==='difference'));
 s.category('Shared equipment');
 assert.ok(s.rows().length);assert.ok(s.rows().every(r=>r.dataset.comparisonGroup==='same'));
 assert.match(s.root.querySelector('.equipment-matrix').textContent,/Heated front seats/i);
});

test('Different package contents appear inside the corresponding vehicle cell, with expansion and source',()=>{
 const s=renderComparison();s.category('Differences');
 const row=s.rows().find(r=>/Factory packages/.test(r.children[0].textContent));assert.ok(row);
 assert.equal(row.dataset.comparisonGroup,'difference','identical package names with different documented contents still differ');
 const first=row.children[1],second=row.children[2];
 assert.match(first.textContent,/Power Driver Seat/);assert.doesNotMatch(second.textContent,/Power Driver Seat/);
 const more=first.querySelector('.package-more');assert.ok(more);assert.equal(more.getAttribute('open'),null);
 assert.match(more.textContent,/See everything in this package \(6 items\)/);
 assert.match(first.textContent,/Sticker conditions \/ exclusions: Available separately: panoramic roof/);
 assert.ok(first.querySelectorAll('a').some(a=>a.href==='https://example.test/sticker/VIN1'));
 assert.ok(second.querySelectorAll('a').some(a=>a.href==='https://example.test/sticker/VIN2'));
});

test('Shared packages stay compact and a package missing from one source is not presented as a confirmed difference',()=>{
 const shared=packageGroup('Comfort Group',['Heated Front Seats','Heated Steering Wheel']);
 const s=renderComparison([[shared],[structuredClone(shared)]]);s.category('Shared equipment');
 const row=s.rows().find(r=>/Factory packages/.test(r.children[0].textContent));assert.ok(row);
 assert.equal(row.querySelector('.comparison-package-list'),null);
 assert.match(row.textContent,/Comfort Group/);
 const gap=renderComparison([[shared],[]]);gap.category('Differences');
 assert.equal(gap.rows().find(r=>/Factory packages/.test(r.children[0].textContent)),undefined);
 gap.category('Needs confirmation');
 const gapRow=gap.rows().find(r=>/Factory packages/.test(r.children[0].textContent)&&r.dataset.comparisonGroup==='listed-on-some');assert.ok(gapRow);
 assert.match(gapRow.children[1].querySelector('.comparison-package-list').textContent,/Heated Front Seats/);
 assert.equal(gapRow.children[2].querySelector('.comparison-package-list'),null);
});

test('Category and feature search survive an equipment refresh',()=>{
 const s=renderComparison();s.category('Shared equipment');
 const input=s.root.querySelector('input');input.value='heated';input.listeners.input();
 s.change();
 assert.equal(s.buttons().find(b=>b.textContent.startsWith('Shared equipment')).getAttribute('aria-pressed'),'true');
 assert.equal(s.root.querySelector('input').value,'heated');
 assert.ok(s.rows().length);assert.ok(s.rows().every(r=>r.dataset.comparisonGroup==='same'));
});

test('Each Included link keeps the clicked vehicle model, even in a mixed-model comparison',()=>{
 for(const search of ['', '?q=2026+Ram+1500&condition=Used&advisor=Ryan']){
  const s=renderComparison(undefined,{titles:['Used 2026 Ram 1500 Laramie','Used 2026 Ram 3500 Laramie'],search});
  const row=s.rows().find(r=>/^Heated front seats/i.test(r.children[0].textContent));assert.ok(row);
  for(const [i,model] of ['1500','3500'].entries()){
   const url=new URL(row.children[i+1].querySelector('.equipment-feature-link').href,'https://carswithsam.com');
   assert.equal(url.searchParams.get('feature'),'heatedSeats');
   assert.equal(url.searchParams.get('modelScope'),'Ram '+model);
   assert.match(url.searchParams.get('q'),new RegExp('ram '+model));
   assert.doesNotMatch(url.searchParams.get('q'),new RegExp(model==='1500'?'3500':'1500'));
   if(search){assert.match(url.searchParams.get('q'),/2026/);assert.equal(url.searchParams.get('condition'),'Used');assert.equal(url.searchParams.get('advisor'),'Ryan');}
  }
 }
});
