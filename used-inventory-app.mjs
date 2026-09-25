import {issues,draft,ingest} from './inventory-engine.mjs';
const base=window.usedInventoryData;
let data=base;let visibleLimit=24;
const panel=document.body.dataset.inventoryPanel==='true';
const $=id=>document.getElementById(id);
const money=n=>n===null?'Call for Price':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n}
function link(text,url){const n=el('a',text,'mini-btn');n.href=url;n.target='_blank';n.rel='noopener';return n}
function download(name,value){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([value],{type:'application/json'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function render(){
 $('coverage').textContent=`${data.capturedCount} new and used listings at Covert CDJR Austin, 8107 Research Blvd. Checked ${new Date(data.capturedAt).toLocaleString()}. ${data.complete?'':'This list includes only part of the store inventory. '}Last successful inventory capture; please confirm current price and availability.`;
 const q=$('stock-search').value.toLowerCase().trim(),limit=Number($('price-limit').value)||Infinity;
 const condition=$('stock-condition').value;const rows=data.vehicles.filter(v=>(!condition||v.condition===condition)&&(!q||`${v.title} ${v.stock} ${v.vin}`.toLowerCase().includes(q))&&(limit===Infinity||(v.price!==null&&v.price<=limit)));
 $('result-count').textContent=`${rows.length} of ${data.vehicles.length} vehicles shown`;
 const fragment=document.createDocumentFragment();
 for(const v of rows.slice(0,visibleLimit)){const card=el('article',undefined,'stock-card');const stale=issues(v).some(i=>i.includes('24 hours'));const photo=el('a',undefined,'stock-photo');photo.href=v.sourceUrl;photo.target='_blank';photo.rel='noopener';photo.setAttribute('aria-label','See all listing photos: '+v.title);const fallback=el('span','Photo unavailable — open listing');if(v.photoUrl){const img=el('img');img.src=v.photoUrl;img.alt=v.title+' — stock '+v.stock;img.width=400;img.height=300;img.loading='lazy';img.decoding='async';img.addEventListener('error',()=>photo.replaceChildren(fallback),{once:true});photo.append(img)}else photo.append(fallback);card.append(photo,el('span',v.condition||'Used','stock-condition'));if(v.condition==='New')card.append(el('p','Advertised price may include incentives with eligibility requirements. Confirm your price and available offers.','stock-small'));
 card.append(el('span',stale?'Needs refresh':v.status==='listed'?'Ask us about availability':'Needs availability check','stock-badge'),el('h2',v.title),el('p',`${money(v.price)}${v.price===null?'':` · listed sale price`}`,'stock-price'),el('p',`${v.miles===null?'Mileage unverified':v.miles.toLocaleString()+' miles'} · Stock ${v.stock}`),el('p',`VIN ${v.vin}`,'stock-small'));
 if(v.docFee!==null)card.append(el('p',`The listing also shows a $${v.docFee} documentation fee. Ask us for the total price, including applicable taxes and fees.`,'stock-small'));
 card.append(el('p',`Checked ${new Date(v.observedAt).toLocaleString()}. Confirm availability and features before visiting.`,'stock-small'));
 const actions=el('div',undefined,'stock-actions');actions.append(link('Open official listing',v.sourceUrl));
 const ask=link('Check availability',`contact.html?vehicle=${encodeURIComponent(v.vin)}&stock=${encodeURIComponent(v.stock)}`);ask.removeAttribute('target');actions.append(ask);const drive=link('Request a test drive',`contact.html?vehicle=${encodeURIComponent(v.vin)}&purpose=test-drive`);drive.removeAttribute('target');actions.append(drive);
 const compare=link('Compare window stickers',`compare.html?vehicle=${encodeURIComponent(v.vin)}`);compare.removeAttribute('target');actions.append(compare);if(v.stickerUrl)actions.append(link('Read original window sticker',v.stickerUrl));if(v.carfaxUrl)actions.append(link('Vehicle history / sticker source',v.carfaxUrl));if(panel){const button=el('button','Prepare draft','mini-btn');button.type='button';button.addEventListener('click',()=>{$('draft-text').value=draft(v);$('draft-heading').textContent=v.title+' — draft';$('draft-panel').hidden=false;$('draft-text').focus()});actions.append(button)}
 card.append(actions);fragment.append(card)}
 $('stock-results').replaceChildren(fragment);$('show-more-stock').hidden=rows.length<=visibleLimit;$('result-count').textContent=`Showing ${Math.min(rows.length,visibleLimit)} of ${rows.length} matching vehicles`; 
 if(panel){$('changes').replaceChildren(...data.changes.slice(0,100).map(c=>el('li',`${c.vin}: ${c.field} — ${c.before??'not previously captured'} → ${c.after??'unknown'}`)))}
}
const resetResults=()=>{visibleLimit=24;render()};$('stock-search').addEventListener('input',resetResults);$('price-limit').addEventListener('change',resetResults);$('stock-condition').addEventListener('change',resetResults);$('show-more-stock').addEventListener('click',()=>{visibleLimit+=24;render()});
if(panel){
 $('export-data').addEventListener('click',()=>download('sam-ryan-inventory.json',JSON.stringify(data,null,2)));
 $('import-capture').addEventListener('change',async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>10000000)throw new Error('File exceeds 10 MB');const capture=JSON.parse(await f.text());const next=ingest(data,capture);data=next;render();$('import-status').textContent='Imported for this session only. Export to retain it; the public website has not changed.'}catch(error){$('import-status').textContent='Import rejected: '+error.message+' Existing data preserved.'}finally{e.target.value=''}});
 $('copy-draft').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('draft-text').value);$('copy-status').textContent='Draft copied. Review all details before posting.'}catch{$('draft-text').select();$('copy-status').textContent='Select and copy the draft manually.'}});
}
render();
