import {comparisonRows} from './comparison-rows.mjs?v=conversion1';
import {definitions,parseQuery} from './equipment-search.mjs';
const $=id=>document.getElementById(id), el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
function render(){
 const vehicles=window.usedInventoryData.vehicles;
 const selected=['1','2','3','4','5'].map(side=>({side,v:vehicles.find(v=>v.vin===$('choose-'+side)?.value)})).filter(r=>r.v);
 const out=$('automatic-equipment');out.replaceChildren();
 if(selected.length<2){out.append(el('p','Add two vehicles to see what they share and where they differ.'));return;}
 const recs=selected.map(r=>({...r,s:window.equipmentIndex.records[r.v.vin]}));
 out.append(el('h2','What’s different? What’s the same?'),el('p','Compare one feature at a time. “Not confirmed” means we need more evidence, not that the vehicle lacks that feature.'));
 const key=el('div');key.className='compare-key';
 for(const {side,v,s} of recs){const item=el('div');item.append(el('strong',`Vehicle ${side} · ${v.stock||'Your vehicle'}`),el('span',v.title));if(s?.sourceType==='customer-upload')item.append(el('span','Evidence: your supplied PDF, VIN matched'));key.append(item);if(s?.status==='verified'&&s.sourceUrl){$('sticker-'+side).href=s.sourceUrl;$('sticker-'+side).hidden=false;$('lookup-note-'+side).textContent='Original sticker matched to this VIN.';}}
 out.append(key);
 const requested=parseQuery($('group-query')?.value||'').requirements.map(r=>r.id);
 const rows=comparisonRows(definitions,recs.map(r=>r.s),requested);
 const categories=[['difference','Confirmed differences'],['wording','Different details'],['check','Needs checking'],['same','Shared equipment'],['unknown','Not confirmed']];
 let current=categories.find(([id])=>rows.some(r=>r.group===id))?.[0]||'unknown';
 const controls=el('div');controls.className='compare-tabs';controls.setAttribute('aria-label','Choose equipment category');
 const result=el('div');result.className='compare-feature-list';const status=el('p');status.setAttribute('role','status');const buttons=[];
 function draw(){
  result.replaceChildren();const visible=rows.filter(r=>r.group===current);
  for(const [id,b] of buttons)b.setAttribute('aria-pressed',String(id===current));
  status.textContent=current==='wording'?'These features have different sticker descriptions. Wording alone does not prove a different capability.':current==='same'?'The selected stickers agree on these features.':current==='check'?'Some stickers establish the answer; others do not.':current==='unknown'?'These features are not confirmed by the available sticker evidence.': 'The stickers explicitly establish different equipment.';
  if(!visible.length){result.append(el('p','No features in this category.'));return;}
  for(const row of visible){
   const card=el('article');card.className='compare-feature';card.append(el('h3',(row.requested?'★ ':'')+row.label));
   const grid=el('div');grid.className='compare-facts';
   recs.forEach(({side,v},i)=>{const f=row.facts[i],box=el('div');box.className='compare-fact '+(f?(f.value?'confirmed':'excluded'):'unconfirmed');box.append(el('span',`Vehicle ${side} · ${v.stock||'Your vehicle'}`),el('strong',f?(f.value?'✓ Listed on sticker':'− Explicitly excluded'):'? Not confirmed'));grid.append(box)});
   card.append(grid);
   if(row.facts.some(Boolean)){const d=el('details');d.append(el('summary','Read the exact evidence'));row.facts.forEach((f,i)=>{if(!f)return;d.append(el('strong',`Vehicle ${recs[i].side} · ${recs[i].v.stock||'Your vehicle'}`));for(const line of f.evidence||[])d.append(el('p',line));if(f.sourceUrl){const a=el('a','Factory instructions ↗');a.href=f.sourceUrl;a.target='_blank';a.rel='noopener';d.append(a)}});card.append(d)}
   result.append(card);
  }
 }
 for(const [id,label] of categories){const b=el('button',`${label} (${rows.filter(r=>r.group===id).length})`);b.type='button';b.addEventListener('click',()=>{current=id;draw()});buttons.push([id,b]);controls.append(b)}
 out.append(controls,status,result);draw();
 for(const {side,v,s} of recs){if(s?.status!=='verified')continue;const d=el('details');d.className='compare-original';d.append(el('summary',`All extracted sticker lines · Vehicle ${side} · ${v.stock||v.vin}`));const ul=el('ul');for(const line of s.lines||[])ul.append(el('li',line));d.append(ul);out.append(d)}
 out.append(el('p','A factory sticker describes original equipment. For a used vehicle, ask us to confirm its current condition, modifications and working features.'));
}
document.addEventListener('compare:changed',render);render();
