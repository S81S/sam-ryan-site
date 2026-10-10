const el=(document,tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node};

export function preferredLayout(selectedLayout, narrowScreen, vehicleCount) {
 return selectedLayout || 'table';
}

// Both layouts use exactly the same answer and evidence renderer.
export function appendEquipmentFact(container,fact,document=globalThis.document,missingReason) {
 const badge=el(document,'strong',!fact?(missingReason?.title||'Sticker evidence needed'):fact.displayValue??(fact.value?'✓ Included':'— Not equipped'));
 badge.className='equipment-answer '+(!fact?'unknown':fact.value?'yes':'no');
 if(!fact)badge.setAttribute('aria-label',missingReason?.title||'Sticker evidence needed');
 container.append(badge);if(!fact){
 const reason=el(document,'p',missingReason?.detail||'This feature has no supporting sticker evidence yet. Check the original sticker and factory equipment guide before confirming it.');reason.className='equipment-review-reason';container.append(reason);
 if(missingReason?.sourceUrl){const link=el(document,'a',missingReason.sourceLabel||'Check original sticker ↗');link.href=missingReason.sourceUrl;link.target='_blank';link.rel='noopener';container.append(link);}return;
 }
 if(fact.packages?.length){
  const list=el(document,'div');list.className='comparison-package-list';
  for(const group of fact.packages){
   const section=el(document,'section');section.className='comparison-package';
   if(fact.packages.length>1)section.append(el(document,'h4',group.name));
   if(group.equipment.length){
    section.append(el(document,'p','Included equipment on this vehicle:'));
    const addItems=(parent,items)=>{const ul=el(document,'ul');for(const item of items)ul.append(el(document,'li',item));parent.append(ul);};
    addItems(section,group.equipment.slice(0,4));
    if(group.equipment.length>4){const more=el(document,'details');more.className='package-more';more.append(el(document,'summary',`Show all ${group.equipment.length} items`));addItems(more,group.equipment.slice(4));section.append(more);}
    section.append(el(document,'small','Printed under this package on the original sticker.'));
   }else section.append(el(document,'p',group.status==='pending'?'Reading package contents from the original sticker…':'Included equipment needs confirmation from the original sticker.'));
   if(group.exclusions?.length)section.append(el(document,'p','Sticker conditions / exclusions: '+group.exclusions.join('; ')));
   if(group.sourceUrl){const a=el(document,'a',/windowsticker\.org/i.test(group.sourceUrl)?'Original sticker · WindowSticker.org ↗':'Original window sticker ↗');a.href=group.sourceUrl;a.target='_blank';a.rel='noopener';section.append(a);}
   list.append(section);
  }
  container.append(list);
 }
 const details=el(document,'details');details.className='equipment-proof';details.append(el(document,'summary','View source'));
 const method=fact.method==='trim-guide-standard'?'Standard on this trim, from the factory trim guide. Standard equipment is often not printed on the window sticker.':['trim-guide-unavailable','factory-unavailable'].includes(fact.method)?'Not offered on this trim, from the factory trim guide.':fact.method==='factory-specification'?'Factory specification for this vehicle’s trim and configuration.':fact.method==='factory-standard'?'Standard on this trim':fact.method==='factory-package'?'Included in the listed package':fact.method==='factory-option-omission'?'Not ordered on the complete original sticker':'Original sticker evidence';
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
