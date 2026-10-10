const el=(document,tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node};

export function preferredLayout(selectedLayout, narrowScreen, vehicleCount) {
 return selectedLayout || 'table';
}

const packageKey=s=>String(s||'').toLowerCase().replace(/[®™]/g,'').replace(/[\u2010-\u2015]/g,'-').replace(/\s+/g,' ').trim();
const packageFamily=s=>packageKey(s).replace(/\blevel\s+[\da-z]+\s+/g,'');
const itemPriority=s=>/screen|display|uconnect/i.test(s)?0:/speaker|subwoofer/i.test(s)?1:/camera|surround/i.test(s)?2:/outlet|inverter/i.test(s)?3:/temperature|climate|a\/c/i.test(s)?4:/heated|ventilated|power.*seat/i.test(s)?5:/tailgate/i.test(s)?6:10;
export const orderedPackageItems=items=>[...items].sort((a,b)=>itemPriority(a)-itemPriority(b));

// Compare printed membership only. A missing package or different wording is
// never an assertion that the other vehicle lacks that equipment altogether.
export function packageComparisonSections(records){
 const families=new Map();
 records.forEach(({s},i)=>{for(const p of s?.features?.listedPackages?.packages||[]){const id=packageFamily(p.name);if(!families.has(id))families.set(id,{id,label:p.name.replace(/\bLevel\s+[\dA-Z]+\s+/gi,''),groups:records.map(()=>[])});families.get(id).groups[i].push(p);}});
 return [...families.values()].sort((a,b)=>Number(/equipment group/i.test(b.label))-Number(/equipment group/i.test(a.label))).map(section=>{
  const comparable=section.groups.every(gs=>gs.length===1&&gs[0].status==='documented');
  const shared=comparable?section.groups[0][0].equipment.filter(item=>section.groups.every(gs=>gs[0].equipment.some(s=>packageKey(s)===packageKey(item)))):[];
  const sharedKeys=new Set(shared.map(packageKey));
  return {...section,comparable,shared:orderedPackageItems(shared),groups:section.groups.map(gs=>gs.map(g=>({...g,highlights:orderedPackageItems(g.equipment.filter(item=>!sharedKeys.has(packageKey(item))))})))};
 });
}

export function appendPackageOverview(container,records,document=globalThis.document){
 const sections=packageComparisonSections(records);if(!sections.length)return;
 const overview=el(document,'section');overview.className='package-overview';overview.setAttribute('aria-labelledby','package-overview-title');
 const title=el(document,'h3','What’s inside each package?');title.id='package-overview-title';overview.append(title);
 overview.append(el(document,'p','Each package or option bundle is matched to its vehicle below. Items that differ between the printed lists come first.'));
 for(const section of sections){
  const family=el(document,'section');family.className='package-family';family.append(el(document,'h4',section.label));
  const grid=el(document,'div');grid.className='package-vehicle-grid';
  section.groups.forEach((groups,i)=>{
   const {v,side}=records[i],card=el(document,'article');card.className='package-vehicle-card';
   const identity=el(document,'p',v.stock?`Vehicle ${side} · Stock ${v.stock}`:`Vehicle ${side} · VIN …${v.vin.slice(-6)}`);identity.className='package-vehicle-label';card.append(identity);card.append(el(document,'p',v.title));
   if(!groups.length)card.append(el(document,'p','This package is not listed on this vehicle’s available sticker.'));
   for(const group of groups){
    const name=el(document,'h5',group.name);name.className='package-name';card.append(name);
    if(group.status==='documented'){
     const count=el(document,'p',`${group.equipment.length} included items listed`);count.className='package-count';card.append(count);
     if(group.highlights.length){card.append(el(document,'strong',section.comparable?'Different items in this package list':group.kind==='option'?'Included with this option':'Included in this package'));const list=el(document,'ul');list.className='package-highlight-items';for(const item of group.highlights)list.append(el(document,'li',item));card.append(list);}
     else card.append(el(document,'p','Includes the shared package equipment below.'));
     if(section.shared.length)card.append(el(document,'small',`Also includes the ${section.shared.length} shared items below.`));
    }else card.append(el(document,'p',group.status==='pending'?'Reading this package’s equipment…':'Open this vehicle’s original sticker to confirm the package contents.'));
    if(group.exclusions?.length)card.append(el(document,'p','Sticker exclusions: '+group.exclusions.join('; ')));
    if(group.sourceUrl){const a=el(document,'a','See this package on the original sticker ↗');a.href=group.sourceUrl;a.target='_blank';a.rel='noopener';card.append(a);}
   }
   grid.append(card);
  });
  family.append(grid);
  if(section.shared.length){const shared=el(document,'div');shared.className='package-shared';shared.append(el(document,'h5',`Included in ${records.length===2?'both':'all '+records.length} packages (${section.shared.length})`));
   const addList=(parent,items)=>{const list=el(document,'ul');for(const item of items)list.append(el(document,'li',item));parent.append(list);};
   addList(shared,section.shared.slice(0,4));
   if(section.shared.length>4){const more=el(document,'details');more.append(el(document,'summary',`See all ${section.shared.length} shared items`));addList(more,section.shared.slice(4));shared.append(more);}family.append(shared);
  }
  overview.append(family);
 }
 const note=el(document,'p','These are package lists. Equipment can also be standard or ordered separately; the full vehicle comparison follows.');note.className='package-scope-note';overview.append(note);container.append(overview);
}

// Both layouts use exactly the same answer and evidence renderer.
export function appendEquipmentFact(container,fact,document=globalThis.document,missingReason,{showPackageContents=true}={}) {
 const badge=el(document,'strong',!fact?(missingReason?.title||'Sticker evidence needed'):fact.displayValue??(fact.value?'✓ Included':'— Not equipped'));
 badge.className='equipment-answer '+(!fact?'unknown':fact.value?'yes':'no');
 if(!fact)badge.setAttribute('aria-label',missingReason?.title||'Sticker evidence needed');
 container.append(badge);if(!fact){
 const reason=el(document,'p',missingReason?.detail||'This feature has no supporting sticker evidence yet. Check the original sticker and factory equipment guide before confirming it.');reason.className='equipment-review-reason';container.append(reason);
 if(missingReason?.sourceUrl){const link=el(document,'a',missingReason.sourceLabel||'Check original sticker ↗');link.href=missingReason.sourceUrl;link.target='_blank';link.rel='noopener';container.append(link);}return;
 }
 if(showPackageContents&&fact.packages?.length){
  const list=el(document,'div');list.className='comparison-package-list';
  for(const group of fact.packages){
   const section=el(document,'section');section.className='comparison-package';
   section.append(el(document,'h4',group.name));
   if(group.equipment.length){
    section.append(el(document,'p','This package includes:'));
    const addItems=(parent,items)=>{const ul=el(document,'ul');for(const item of items)ul.append(el(document,'li',item));parent.append(ul);};
    const items=orderedPackageItems(group.equipment);addItems(section,items.slice(0,4));
    if(items.length>4){const more=el(document,'details');more.className='package-more';more.append(el(document,'summary',`See everything in this package (${items.length} items)`));addItems(more,items.slice(4));section.append(more);}
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
