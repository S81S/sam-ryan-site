const el=(document,tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node};

export function preferredLayout(selectedLayout, narrowScreen, vehicleCount) {
 return selectedLayout || 'table';
}

// Both layouts use exactly the same answer and evidence renderer.
export function appendEquipmentFact(container,fact,document=globalThis.document) {
 const badge=el(document,'strong',!fact?'Verify / Unknown':fact.value?'✓ Included':'— Not equipped');
 badge.className='equipment-answer '+(!fact?'unknown':fact.value?'yes':'no');
 if(!fact)badge.setAttribute('aria-label','Equipment evidence incomplete');
 container.append(badge);if(!fact)return;
 const details=el(document,'details');details.className='equipment-proof';details.append(el(document,'summary','View source'));
 const method=fact.method==='factory-standard'?'Standard on this trim':fact.method==='factory-package'?'Included in the listed package':fact.method==='factory-option-omission'?'Not ordered on the complete original sticker':'Original sticker evidence';
 details.append(el(document,'small',method));
 for(const line of fact.evidence||[])details.append(el(document,'p',line));
 if(fact.sourceUrl){const a=el(document,'a','Factory reference ↗');a.href=fact.sourceUrl;a.target='_blank';a.rel='noopener';details.append(a);}
 container.append(details);
}

export function appendFeatureCards(container,rows,records,groups,document=globalThis.document) {
 for(const row of rows){
  const card=el(document,'article');card.className='equipment-feature-card';
  card.append(el(document,'h3',(row.requested?'★ ':'')+row.label),el(document,'p',groups[row.group]));
  const vehicles=el(document,'div');vehicles.className='equipment-card-vehicles';
  records.forEach(({side,v},index)=>{
   const vehicle=el(document,'section');vehicle.className='equipment-card-vehicle';
   vehicle.append(el(document,'h4',`Vehicle ${side} · ${v.title}`),el(document,'small',v.stock?`Stock ${v.stock}`:`VIN …${v.vin.slice(-6)}`));
   appendEquipmentFact(vehicle,row.facts[index],document);vehicles.append(vehicle);
  });
  card.append(vehicles);container.append(card);
 }
}
