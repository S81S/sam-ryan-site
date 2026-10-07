import {validSeatEvidence} from './seat-evidence.mjs?v=coverage4';
import {wheelFinishDefinitions,wheelFinishFeatures} from './wheel-finish-evidence.mjs?v=wheel1';
import {definitions,normalizeText} from './equipment-search.mjs?v=wheel1';
// Only validated document families activate interpretation. No generic VIN decoding.
export function analyzeOtherOriginal(text,vin){
 const raw=String(text).split(/\r?\n/).map(normalizeText).filter(Boolean);
 if(!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)||!text.toUpperCase().replace(/[^A-Z0-9]/g,'').includes(vin))throw Error('Sticker VIN does not match vehicle');
 // Each family is a layout checked against real documents: what marks it, where its equipment list starts and
 // ends, and where it prints the paint and interior colours.
 const at=pattern=>raw.findIndex(l=>pattern.test(l)),after=(from,pattern)=>raw.findIndex((l,i)=>i>from&&pattern.test(l));
 const value=pattern=>{const line=raw.find(l=>pattern.test(l));return line?line.replace(pattern,'').trim():''};
 let family,start,end,exterior='',interior='';
 if(/General Motors LLC|GMLBL_PROD/.test(text)&&/STANDARD EQUIPMENT/.test(text)&&/OPTIONS & PRICING/.test(text)){
  family='GM';start=at(/^STANDARD EQUIPMENT$/i);end=after(start,/^TOTAL VEHICLE PRICE/i);
  exterior=value(/^.*\bEXTERIOR:\s*/i).split(/\s+INTERIOR:/i)[0];interior=value(/^(?:.*\s)?INTERIOR:\s*/i);
 }else if(/KIA DRIVE WISE|Kia America/i.test(text)&&/STANDARD FEATURES/.test(text)&&/ADDITIONAL INSTALLED EQUIPMENT/.test(text)){
  family='Kia';start=at(/^STANDARD FEATURES$/i);end=after(start,/^MSRP INCLUDING OPTIONS/i);
  exterior=value(/^EXTERIOR COLOR:\s*/i);interior=value(/^INTERIOR COLOR:\s*/i);
 }else if(/Hyundai Motor America/i.test(text)&&/^STANDARD FEATURES:/m.test(text)&&/^ADDED FEATURES:/m.test(text)){
  family='Hyundai';start=at(/^STANDARD FEATURES:$/i);end=after(start,/^Total Price\s*:/i);
  exterior=value(/^EXTERIOR COLOR:\s*/i);interior=value(/^INTERIOR\/SEAT COLOR:\s*/i);
 }else if(/\bSUBARU\b/.test(text)&&/^STANDARD EQUIPMENT$/m.test(text)&&/^OPTIONAL EQUIPMENT AND OTHER ITEMS$/m.test(text)){
  family='Subaru';start=at(/^STANDARD EQUIPMENT$/i);end=after(start,/^Total Suggested Retail Price/i);
 }else return null;
 if(start<0||end<=start)return null;
 // Some PDFs carry the label's text more than once, with the earlier copies cut short. Read the last copy before the total.
 for(let i=end-1;i>start;i--)if(raw[i]===raw[start]){start=i;break}
 let section=raw.slice(start+1,end);
 if(family==='GM'){
  // GM wraps one feature over several lines ("• DRIVER & FRONT PASSENGER" / "HEATED SEATS"). Rejoin each bullet so the
  // feature is read whole; section headings, package names with a price, and totals stay on their own lines.
  const standsAlone=l=>/^[•*]/.test(l)||/^(?:OWNER BENEFITS|(?:PERFORMANCE & )?MECHANICAL|CONNECTIVITY(?: & TECHNOLOGY)?|TECHNOLOGY|INFOTAINMENT|ENTERTAINMENT|INTERIOR|EXTERIOR|SAFETY(?: & SECURITY)?|OPTIONS & PRICING|OPTIONS INSTALLED BY\b.*|STANDARD EQUIPMENT SHOWN\)?|ITEMS FEATURED\b.*|THE STANDARD VEHICLE PRICE SHOWN|MANUFACTURER'S SUGGESTED RETAIL PRICE|STANDARD VEHICLE PRICE\b.*|TOTAL\b.*|DESTINATION CHARGE\b.*)$/i.test(l)||/\d\.\d{2}$/.test(l)||/\bINC\.?$/i.test(l);
  // "CREDIT - NOT EQUIPPED WITH" names the removed item on the next line; keep them together so it reads as removed.
  const joined=[];for(const l of section){if(joined.length&&/^(?:[•*]|CREDIT\b)/i.test(joined.at(-1))&&!standsAlone(l))joined[joined.length-1]+=' '+l;else joined.push(l);}
  section=joined;
 }
 const lines=[...new Set(section.filter(l=>!/^\$|^(?:manufacturer|standard vehicle price|total options|total vehicle &|destination charge|[\d,]+\.\d{2}$)/i.test(l)))];
 // Colour is read from the document's own colour fields, in the wording the search expects, never from equipment text.
 if(exterior&&!lines.some(l=>/^exterior(?:\s+colou?r)?\s*:/i.test(l)))lines.push('Exterior Color: '+exterior);
 if(interior)lines.push('Interior Color: '+interior);
 const features={};
 const additional={
  ventilated:/seats?,.*ventilated|ventilated.*(?:driver|passenger)/i,
  heatedSeats:/seats?,.*heated|heated.*(?:driver|passenger)|heated front (?:and|&) [\w ]*seats/i,
  backupCamera:/rear vision camera/i,remoteStart:/remote vehicle start/i,
  adaptiveCruise:/smart cruise control/i,wireless:/wireless phone charg(?:er|ing)/i,
  dualClimate:/dual.zone.*(?:temperature|climate)|air conditioning, dual zone|dual auto(?:matic)? temperature control/i,
  premiumAudio:/audio system.*premium.*bose|\bbose\b.*(?:premium|audio|speaker)/i,
  surroundCamera:/surround vision/i,blindSpot:/blind zone/i,tow:/trailering package/i,
  emergencyBrake:/collision.avoidance assist/i,
  driverAlert:/driver attention warning/i,
  autoHighBeam:/high beam assist/i,
  laneAssist:/lane keeping assist/i,
  powerDriver:/power driver.s seat/i,
 };
 // Wording that names the feature but does not grant it: LED running lights on halogen or projector headlights.
 const notThis={ledLights:/(?:projector|halogen)[^,;]*headl[^,;]*led daytime/i};
 for(const [id,,pattern] of definitions){
  // Cross-brand paint/upholstery abbreviations and powertrain implications need
  // their own validated readers. Only direct feature wording is used here.
  if(id.startsWith('interior')||id.startsWith('exterior')||['cloth','flatTow','v8','v6','hemi','electric','hybrid','diesel','fourWheel','awd'].includes(id))continue;
  const evidence=lines.filter(l=>(pattern.test(l)||additional[id]?.test(l))&&validSeatEvidence(id,l)&&!/\b(?:available|if equipped|sold separately|warranty)\b/i.test(l)&&!notThis[id]?.test(l));
  const negative=evidence.filter(l=>/\b(?:delete|deleted|deletion|without|not included|not equipped)\b/i.test(l));
  const positive=evidence.filter(l=>!negative.includes(l)&&!(id==='leather'&&!/leather.*(?:seats?|seating|bucket)|seats?.*leather/i.test(l)));
  if(negative.length)features[id]={value:false,evidence:negative.slice(0,2)};
  else if(positive.length)features[id]={value:true,evidence:positive.slice(0,2)};
 }
 for(const [id]of wheelFinishDefinitions)delete features[id];Object.assign(features,wheelFinishFeatures(lines));
 return {identityLines:raw.filter(l=>/^(?:Model\/Code\s+)?20\d{2}\b/i.test(l)).slice(0,1),features,lines,engine:null,equipmentSectionComplete:false,documentFamily:family};
}
