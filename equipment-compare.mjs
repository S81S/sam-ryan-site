import {definitions} from './equipment-search.mjs';
const $=id=>document.getElementById(id),index=window.equipmentIndex;
const vehicles=window.usedInventoryData.vehicles.filter(v=>v.locationId==='18393');
const SIDES=['1','2','3','4','5'];
const el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};

function activeSides(){
 return SIDES.map(side=>({side,v:vehicles.find(v=>v.vin===$('choose-'+side)?.value)})).filter(x=>x.v);
}

function render(){
 const active=activeSides();
 const out=$('automatic-equipment');out.replaceChildren();
 if(active.length<2){
  out.append(el('p','Choose at least two vehicles above to see a side-by-side factory equipment comparison.'));
  return;
 }
 out.append(el('h2','Factory equipment, side by side'),el('p','Only VIN-matched window stickers supply equipment evidence. “Not confirmed” means the sticker does not establish the answer—not that the feature is absent. Ask us to check the vehicle’s current condition and any modifications.'));
 const recs=active.map(({side,v})=>({side,v,s:index.records[v.vin]}));
 for(const {side,v,s} of recs){
  if(s?.status==='verified'){$('sticker-'+side).href=s.sourceUrl;$('sticker-'+side).hidden=false;$('sticker-'+side).textContent='Read VIN-matched window sticker ↗';$('lookup-note-'+side).textContent=`Sticker matched to VIN ${v.vin}. Scanned ${new Date(s.checkedAt).toLocaleDateString()}.`;}
 }
 const wrap=el('div');wrap.className='equipment-table-wrap';const table=el('table');table.className='equipment-table';
 const head=el('thead'),headRow=el('tr');
 headRow.append(el('th','Equipment'));
 for(const {v} of recs){const th=el('th',`${v.title} — ${v.stock}`);th.scope='col';headRow.append(th)}
 head.append(headRow);table.append(head);
 const body=el('tbody');
 for(const [id,label] of definitions){
  const tr=el('tr');const th=el('th',label);th.scope='row';tr.append(th);
  for(const {s} of recs){
   const fact=s?.status==='verified'?s.features[id]:null;
   const td=el('td');
   td.append(el('strong',fact?(fact.value?'Listed on sticker':'Explicitly excluded'):'Not confirmed'));
   if(fact)td.append(el('p',fact.evidence.join(' / ')));
   tr.append(td);
  }
  body.append(tr);
 }
 table.append(body);wrap.append(table);out.append(wrap);

 const norm=l=>l.toLowerCase().replace(/\$[\d,.]+/g,'').replace(/\s+/g,' ').trim();
 for(const {side,v,s} of recs){
  const lines=s?.status==='verified'?s.lines:[];
  const others=recs.filter(r=>r.side!==side).flatMap(r=>r.s?.status==='verified'?r.s.lines:[]);
  const otherSet=new Set(others.map(norm));
  const d=el('details');d.append(el('summary',`Read all extracted sticker equipment — ${v.title} (${v.stock})`));
  if(!lines.length)d.append(el('p','A readable, VIN-matched sticker is not available for this vehicle yet.'));
  else {const list=el('ul');for(const line of lines){const li=el('li',line);if(otherSet.has(norm(line)))li.append(el('small',' — also appears on another selected vehicle'));list.append(li)}d.append(list)}
  out.append(d);
 }
 out.append(el('p','Different wording or a missing line does not establish a missing feature. Original MSRP on a sticker is separate from the current advertised selling price.'));
}

document.addEventListener('compare:changed',render);
// Nothing is pre-populated here — sticker-compare.mjs only fills a slot from an explicit
// ?vehicle=/?vehicles= link or a shopper's own dropdown/stock-VIN lookup.
render();
