// Rendering metadata only. These helpers never add or change a requirement,
// trim fact, canonical choice ID or VIN equipment claim.
const cropRows=[
 ['r12315-dashboard','ram1500-r12315-dashboard.jpg',60,115,780,510,682],
 ['r12315-leather','ram1500-r12315-leather.jpg',110,180,740,490,682],
 ['r12315-panoramic','ram1500-r12315-panoramic.jpg',0,90,780,570,682],
 ['j22138-dashboard','grandcherokee-j22138-dashboard.jpg',90,220,860,440,682],
 ['j22138-capri','grandcherokee-j22138-capri.jpg',100,240,870,430,682],
 ['j22109-cloth','wrangler-j22109-cloth.jpg',120,180,720,490,682],
 ['j22412-nappa','wrangler-j22412-nappa.jpg',120,180,720,490,682],
 ['j22109-hardtop','wrangler-j22109-hardtop.jpg',145,190,725,515,768],
 ['j22412-skyroof','wrangler-j22412-skyroof.jpg',0,110,780,500,682],
 ['r12249a-dashboard','ram3500-r12249a-dashboard.jpg',0,0,1024,600,682],
 ['p04984-nappa','pacifica-p04984-nappa.jpg',0,0,1024,600,682]
];
// All 27 catalog images were inspected locally. These 11 contain promotional
// ribbons/strips; the other 16 need no promotional crop. Original bytes stay intact.
export function reviewedPhotoCrop(photoOrId){
 const input=typeof photoOrId==='string'?photoOrId:photoOrId?.image||photoOrId?.id;
 const row=cropRows.find(([id,file])=>input===id||input===file||input==='/assets/feature-photos/'+file);
 if(!row)return null;
 const [, ,x,y,width,height,sourceHeight]=row;
 return {x,y,width,height,sourceWidth:1024,sourceHeight};
}
const normalize=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[®™]/g,'').replace(/[\u2010-\u2015]/g,'-').replace(/\s+/g,' ').trim();
const ubwSource='https://static.nhtsa.gov/odi/tsbs/2026/MC-11034895-0001.pdf';
const fleetRadio=/26DOMMOP_FBG_Ram(?:1500|HD)\.pdf(?:[?#]|$)/;
const specs=[
 ['ram-1500','f1e0k45y','r12546-dashboard','infotainmentScreen','8.4 inches',f=>/Uconnect 5 with 8\.4-inch touchscreen display \(UBE\)/i.test(f.text||'')],
 ['ram-1500','fh01t86','r12527-dashboard','infotainmentScreen','12 inches',f=>/Uconnect 5 NAV with 12-inch touchscreen display/.test(f.text||'')&&/\bUBQ\b/.test(f.text)],
 // Exact UBW crosswalk already reviewed by the shared preference resolver.
 // This is never a generic 14.4/14.5 size alias.
 ['ram-1500','f13a33dn','r12315-dashboard','infotainmentScreen','14.4 inches',f=>/14\.5-inch touchscreen/.test(f.text||'')&&/\bUBW\b/.test(f.text)&&fleetRadio.test(f.sourceUrl||''),ubwSource],
 ['ram-3500','f123o6b','r12500-dashboard','infotainmentScreen','12 inches',f=>/Uconnect 5 NAV with 12-inch touchscreen/.test(f.text||'')&&/\bUBQ\b/.test(f.text)],
 ['ram-3500','f10mbyu8','r12249a-dashboard','infotainmentScreen','14.4 inches',f=>/14\.5-inch touchscreen/.test(f.text||'')&&/\bUBW\b/.test(f.text)&&fleetRadio.test(f.sourceUrl||''),ubwSource],
 ['jeep-grand-cherokee','f3x3ws','j22138-dashboard','infotainmentScreen','12.3 inches',f=>/Uconnect 5 NAV with 12\.3-inch Display/i.test(f.parent||'')&&/\bUBX\b/.test(f.text||'')],
 ['ram-1500','f1816siy','r12315-panoramic','panoramic',true,f=>f.parent==='Sunroof'&&/^Dual-pane, power-operated/.test(f.text||'')&&/\bGWJ\b/.test(f.text)],
 ['jeep-grand-cherokee','flfl6gd','j22560-panoramic','panoramic',true,f=>f.parent==='Sunroof'&&/^Dual-Pane Panoramic/.test(f.text||'')&&/\bGWJ\b/.test(f.text)],
 ['chrysler-pacifica','fequ0mu','c02225-panoramic','panoramic',true,f=>f.parent==='Sunroof'&&/^Dual-pane panoramic/.test(f.text||'')&&/\bGWJ\b/.test(f.text)],
 ['chrysler-pacifica','f1bzgmzl','c02225-leatherette','seatUpholstery','Caprice Leatherette Bucket Seats',f=>f.parent==='Seats'&&/^Caprice leatherette-trimmed bucket \(\*SJ\)$/.test(f.text||'')],
 ['chrysler-pacifica','fv1g51y','p04984-nappa','seatUpholstery','Nappa Leather Bucket Seats',f=>f.parent==='Seats'&&/^Nappa leather-trimmed bucket \(\*AL\)$/.test(f.text||'')],
 ['jeep-grand-cherokee','f1vszy2n','j22138-capri','seatUpholstery','Capri Leatherette Seats',f=>f.parent==='Seat Fabrics'&&/^Capri leatherette \(available/.test(f.text||'')&&/\(\*B6\)$/.test(f.text)],
 ['jeep-grand-cherokee','f1o50nvc','j22560-palermo','seatUpholstery','Palermo Leather Seats',f=>f.parent==='Seat Fabrics'&&/^Palermo leather with quilted Palermo leather bolsters/.test(f.text||'')&&/\(\*EC\)$/.test(f.text)],
 ['wrangler','f1dj1wzb','j22109-hardtop','hardTop',true,f=>f.parent==='Tops'&&/^Freedom Top three-piece modular hardtop/.test(f.text||'')],
 ['wrangler','feeakr0','j22412-skyroof','skyRoof',true,f=>f.parent==='Tops'&&normalize(f.text)==='sky one-touch powertop'],
 ['wrangler','f1s1eh1p','j22412-nappa','seatUpholstery','Nappa Leather Seats',f=>f.key==='upholstery'&&normalize(f.value)==='nappa leather']
];
function candidates(photos){
 if(photos instanceof Map)return [...photos.values()];
 if(photos?.photos instanceof Map)return [...photos.photos.values()];
 return [];
}
const verified=p=>p?.reviewed===true&&typeof p.reviewedAt==='string'&&p.reviewedAt&&/^\/assets\/feature-photos\/[a-z0-9-]+\.jpg$/.test(p.image||'')&&p.stickerSource&&p.listingSource;
const equalScope=(a,b)=>a.reviewedScope===b.reviewedScope&&JSON.stringify(a.allowedTrimIds||[])===JSON.stringify(b.allowedTrimIds||[]);
/**
 * `photos` is createPhotoGuide() (its validated .photos Map), or that Map itself.
 * Returns separate photo metadata, never a replacement choice. Consumers must
 * preserve choice.feature/value/facts/id and apply photo fields for display only.
 */
export function buyerFeaturePhoto(lineup,choice,photos,{trimId=''}={}){
 if(!lineup||!choice||choice.model!==lineup.id||choice.year!==lineup.year)return null;
 const pool=candidates(photos).filter(p=>verified(p)&&p.model===lineup.id&&p.year===lineup.year);
 const finish=(p,extra={})=>({...p,crop:reviewedPhotoCrop(p),...extra});
 // Retain original reviewed choices and exact same-predicate equipment cards.
 if(choice.kind!=='factory'){
  const p=pool.find(p=>p.id===choice.id&&p.feature===choice.feature&&p.value===choice.value&&equalScope(p,choice))||pool.find(p=>p.feature===choice.feature&&p.value===choice.value&&equalScope(p,choice));
  return p?finish(p):null;
 }
 if(choice.feature!=='factoryChoice'||choice.value!==choice.id||lineup.year!==2026)return null;
 const rule=specs.find(([model,id])=>model===lineup.id&&id===choice.id);if(!rule)return null;
 const [, ,photoId,feature,value,test,crosswalkSource]=rule,p=pool.find(p=>p.id===photoId&&p.feature===feature&&p.value===value);
 if(!p)return null;
 const canonical=lineup.choices?.get(choice.id);if(!canonical||canonical.model!==lineup.id||canonical.year!==lineup.year)return null;
 const facts=Object.entries(canonical.facts||{});
 if(!facts.some(([,f])=>f.sourceUrl&&test(f)))return null;
 // A Sport cloth or Rubicon Nappa photograph is not an interchangeable picture
 // of every Wrangler seat code. Restrict any such reuse to its reviewed trims.
 if(p.allowedTrimIds?.length){
  const offered=facts.filter(([,f])=>['standard','optional'].includes(f.status));
  const selected=canonical.facts?.[trimId];
  if(trimId?(!p.allowedTrimIds.includes(trimId)||!selected?.sourceUrl||!['standard','optional'].includes(selected.status)||!test(selected)):!offered.length||offered.some(([id])=>!p.allowedTrimIds.includes(id)))return null;
 }
 const caption=crosswalkSource?'The pictured UBW radio is listed as 14.4 inches on its sticker and 14.5 inches in the factory chart.':choice.id==='f1dj1wzb'?'Black three-piece hardtop shown; this is not a body-color hardtop.':p.label;
 return finish(p,{caption,...(crosswalkSource?{crosswalkSource}:{})});
}
