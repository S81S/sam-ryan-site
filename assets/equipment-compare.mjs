import {definitions} from './equipment-search.mjs';
const $=id=>document.getElementById(id),index=window.equipmentIndex;
const vehicles=window.usedInventoryData.vehicles.filter(v=>v.locationId==='18393');
const el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
function render(){
 const a=vehicles.find(v=>v.vin===$('choose-a').value),b=vehicles.find(v=>v.vin===$('choose-b').value);if(!a||!b)return;
 const out=$('automatic-equipment');out.replaceChildren();
 const sa=index.records[a.vin],sb=index.records[b.vin];
 out.append(el('h2','Factory equipment, side by side'),el('p','Only VIN-matched window stickers supply equipment evidence. “Not confirmed” means the sticker does not establish the answer—not that the feature is absent. Ask us to check the vehicle’s current condition and any modifications.'));
 for(const [side,v,s] of [['a',a,sa],['b',b,sb]]){
  if(s?.status==='verified'){$('sticker-'+side).href=s.sourceUrl;$('sticker-'+side).hidden=false;$('sticker-'+side).textContent='Read VIN-matched window sticker ↗';$('lookup-note-'+side).textContent=`Sticker matched to VIN ${v.vin}. Scanned ${new Date(s.checkedAt).toLocaleDateString()}.`;}
 }
 const wrap=el('div');wrap.className='equipment-table-wrap';const table=el('table');table.className='equipment-table';
 const head=el('thead'),row=el('tr');for(const title of ['Equipment',`A: ${a.title}`,`B: ${b.title}`]){const th=el('th',title);th.scope='col';row.append(th);}head.append(row);table.append(head);
 const body=el('tbody');
 for(const [id,label] of definitions){const tr=el('tr');const th=el('th',label);th.scope='row';tr.append(th);for(const s of [sa,sb]){const fact=s?.status==='verified'?s.features[id]:null;const td=el('td');td.append(el('strong',fact?(fact.value?'Listed on sticker':'Explicitly excluded'):'Not confirmed'));if(fact)td.append(el('p',fact.evidence.join(' / ')));tr.append(td);}body.append(tr);}table.append(body);wrap.append(table);out.append(wrap);
 const norm=l=>l.toLowerCase().replace(/\$[\d,.]+/g,'').replace(/\s+/g,' ').trim();
 const al=sa?.status==='verified'?sa.lines:[],bl=sb?.status==='verified'?sb.lines:[];
 for(const [label,lines,other] of [['A',al,bl],['B',bl,al]]){
  const d=el('details');d.append(el('summary',`Read all extracted sticker equipment — vehicle ${label}`));
  if(!lines.length)d.append(el('p','A readable, VIN-matched sticker is not available for this vehicle yet.'));
  else {const otherSet=new Set(other.map(norm));const list=el('ul');for(const line of lines){const li=el('li',line);if(otherSet.has(norm(line)))li.append(el('small',' — same wording on both'));list.append(li);}d.append(list);}out.append(d);
 }
 out.append(el('p','Different wording or a missing line does not establish a missing feature. Original MSRP on a sticker is separate from the current advertised selling price.'));
}
for(const side of ['a','b'])$('choose-'+side).addEventListener('change',render);
// Start with readable stickers when the shopper has not brought a selected vehicle.
const available=vehicles.filter(v=>index.records[v.vin]?.status==='verified');
if(!new URLSearchParams(location.search).has('vehicle')&&available.length>1){
 for(const [side,v] of [['a',available[0]],['b',available[1]]]){$('choose-'+side).value=v.vin;$('choose-'+side).dispatchEvent(new Event('change'));}
}
render();
