// Package membership comes from indentation on the VIN's original Stellantis
// label. Flattened equipment text alone cannot distinguish a free-standing option.
const normalize=s=>String(s||'').normalize('NFKC').replace(/[\u2010-\u2015]/g,'-').replace(/[®™]/g,'').replace(/\s+/g,' ').trim();
const price=/\s+(?:\$[\d,.]+(?:\s*(?:CR|CREDIT))?|NO CHARGE)\s*$/i;
export const packageName=s=>normalize(s).replace(price,'');
const key=s=>packageName(s).toLowerCase();
const excluded=/\b(?:delete[ds]?|deletion|without|not equipped|not included|if equipped|available separately|available with|not available|N\/A|except|only with|requires)\b/i;
export function isPackageName(text){
 const value=packageName(text);
 return !excluded.test(value)&&!/[;:]|\b(?:included|includes|requires|available|optional equipment)\b/i.test(value)&&/\b(?:package(?:\s+[a-z0-9]{2,5})?|group(?:\s+[a-z0-9]{1,4})?|night edition)\s*$/i.test(value);
}
export function listedPackageNames(sticker){
 if(Array.isArray(sticker?.packageGroups))return [...new Set(sticker.packageGroups.map(g=>g.name))];
 return [...new Set((sticker?.lines||[]).filter(isPackageName).map(packageName))];
}

export function readPositionedPackages(rows){
 const start=rows.findIndex(r=>/^OPTIONAL EQUIPMENT\b/i.test(normalize(r.text)));
 if(start<0)return [];
 let end=rows.findIndex((r,i)=>i>start&&/^(?:Destination Charge|TOTAL PRICE|WARRANTY COVERAGE|FUEL ECONOMY)\b/i.test(normalize(r.text)));
 if(end<0)return []; // A truncated option section has no trustworthy closing boundary.
 const options=rows.slice(start+1,end).filter(r=>normalize(r.text));
 if(!options.length||options.some(r=>!Number.isFinite(r.x)||!Number.isFinite(r.page)))return [];
 // On this layout adjacent baselines are 3.6pt apart; columns are >100pt apart.
 // A continuation starts with indented equipment. Determine its baseline from
 // all option rows in that column before walking the document's reading order.
 const columns=[];
 for(const r of [...options,rows[end]]){let col=columns.find(c=>c.page===r.page&&Math.abs(c.x-r.x)<40);if(!col){col={page:r.page,x:r.x};columns.push(col);}col.x=Math.min(col.x,r.x);}
 const groups=[];let active=null;
 for(const r of options){
  const text=normalize(r.text),col=columns.find(c=>c.page===r.page&&Math.abs(c.x-r.x)<40);
  const indent=r.x-col.x;
  if(indent<1.5){
   active=null;
   // A printed option heading with indented children is a bundle even when its
   // name has no word "package" (e.g. Safety Sphere). Preserve its exact label.
   if(!excluded.test(text)){active={name:packageName(text),kind:isPackageName(text)?'package':'option',equipment:[],exclusions:[],method:'sticker-package-layout'};groups.push(active);}
  }else if(active&&indent>=2&&indent<=12){
   // Priced entries and conditional wording never become included equipment.
   if(price.test(text)){active=null;continue;}
   if(excluded.test(text)){active.exclusions.push(text);continue;}
   // An indented group name is included in its parent. It must not end the
   // parent list or capture the following sibling items as its own children.
   active.equipment.push(text);
  }else active=null;
 }
 return groups.filter(g=>g.kind==='package'||g.equipment.length||g.exclusions.length).map(g=>({...g,equipment:[...new Set(g.equipment)],exclusions:[...new Set(g.exclusions)]}));
}

export function packageDetails(sticker,names=listedPackageNames(sticker)){
 const deletionKey=s=>normalize(s).toLowerCase().replace(/\b(?:delete[ds]?|deletion|without|not equipped|not included)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim();
 const deletions=(sticker.lines||[]).filter(s=>/\b(?:delete[ds]?|deletion|without|not equipped|not included)\b/i.test(s));
 return names.map(name=>{
  const matches=(sticker.packageGroups||[]).filter(g=>key(g.name)===key(name)&&g.method==='sticker-package-layout');
  const group=matches.length===1?matches[0]:null;
  const removed=[];const equipment=(group?.equipment||[]).filter(item=>{const itemKey=deletionKey(item);const deletion=deletions.find(d=>{const k=deletionKey(d);return k.length>5&&(itemKey.includes(k)||k.includes(itemKey));});if(deletion)removed.push(deletion);return !deletion;});
  return {name,kind:group?.kind||'package',equipment,exclusions:[...new Set([...(group?.exclusions||[]),...removed])],sourceUrl:sticker.packageSourceUrl||sticker.sourceUrl,
   status:group?.equipment?.length?'documented':sticker.packageLookupState||(Array.isArray(sticker.packageGroups)?'checked':sticker.sha256?'pending':'unavailable')};
 });
}

export function mergePackageEvidence(existing,parsed,sourceUrl){
 // Never replace an already verified sticker with an unrelated revision or upload.
 if(existing?.status!=='verified'||!existing.vin||parsed?.vin!==existing.vin||!existing.sha256||existing.sha256!==parsed.sha256||!Array.isArray(parsed.packageGroups))return null;
 return {...existing,packageGroups:parsed.packageGroups,packageSourceUrl:sourceUrl||existing.sourceUrl,packageLookupState:'checked'};
}
