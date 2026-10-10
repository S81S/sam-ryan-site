import {withComparisonSpecifications} from './comparison-specs.mjs';

const normalize=s=>String(s||'').normalize('NFKC').replace(/[\u2010-\u2015]/g,'-').replace(/[®™]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
// A sticker retains the trim's base equipment even when an option replaces it.
// Display the installed specification once, preserving the original document separately.
const families=[
 ['audioSystem',line=>/\b\d+[ -]+(?:amplified[ -]+)?speakers?\b|\b(?:harman[ -]?kardon|alpine|mcintosh)\b.*\b(?:audio|sound|speakers?)\b/i.test(line)],
 ['infotainmentScreen',line=>/\b(?:uconnect|infotainment|touch[ -]?screen|center(?: stack)? display)\b/i.test(line)&&!/cluster|instrument|passenger|rear[ -]seat|head[ -]?up/i.test(line)],
 ['instrumentScreen',line=>/\b(?:cluster|instrument (?:panel|display))\b/i.test(line)&&/display|screen/i.test(line)],
 ['driverAdjustment',line=>/\b\d+[ -]+way\b.*\b(?:power|manual)\b.*\bdriver seat\b/i.test(line)&&!/lumbar/i.test(line)],
 ['passengerAdjustment',line=>/\b\d+[ -]+way\b.*\b(?:power|manual)\b.*\b(?:front )?passenger seat\b/i.test(line)&&!/lumbar/i.test(line)],
 ['wheelSize',line=>/\b(?:wheels?|whls)\b/i.test(line)&&!/spare|steering|covers?|wheelbase|brakes?|drive|controls?|sensors?/i.test(line)],
 ['fuelTankCapacity',line=>/\bfuel[ -]tank\b/i.test(line)&&!/skid|plate|shield|cover|strap/i.test(line)],
];
export function installedEquipmentDisplay(vehicle,sticker){
 const resolved=withComparisonSpecifications(vehicle,sticker);
 if(!resolved)return {evidence:[],replaced:[],needsReview:[],specifications:{}};
 const raw=[...new Set(Object.values(sticker.features||{}).filter(f=>f.value===true).flatMap(f=>f.evidence||[]))];
 const replaced=[],needsReview=[],evidence=[];
 // Only suppress a printed base roof when the reviewed roof resolver explicitly
 // proves it absent. A hard top alone does not prove a separate soft top absent.
 const roofLines=[['softTop',/^(?:Black |Premium Black )?Sunrider Soft[ -]?Top\b/i],['hardTop',/^(?:Black|Body[ -]Color) 3[ -]Piece Hard[ -]?Top\b/i],['skyRoof',/^Sky One-Touch Power[ -]Top\b/i]];
 for(const line of raw){
  const roof=roofLines.find(([,matches])=>matches.test(line.normalize('NFKC').replace(/[\u2010-\u2015]/g,'-')));
  const roofFact=roof&&resolved.features[roof[0]];
  if(roofFact?.method==='sticker-roof-replacement'&&roofFact.value===false){replaced.push(line);continue;}
  const family=families.find(([,matches])=>matches(line));
  if(family){
   const fact=resolved.features[family[0]];
   if(fact&&!fact.evidence.some(selected=>normalize(selected)===normalize(line))){replaced.push(line);continue;}
   // If replacement cannot be resolved, keep the original wording under the source explanation,
   // rather than presenting conflicting equipment as two installed systems.
   if(!fact){needsReview.push(line);continue;}
  }
  evidence.push(line);
 }
 for(const [id] of families){const fact=resolved.features[id];if(fact)for(const line of fact.evidence)if(!evidence.some(e=>normalize(e)===normalize(line)))evidence.push(line);}
 return {evidence,replaced,needsReview,specifications:resolved.features};
}
