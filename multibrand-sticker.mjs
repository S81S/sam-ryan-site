import {validSeatEvidence} from './seat-evidence.mjs?v=coverage3';
import {definitions,normalizeText} from './equipment-search.mjs?v=coverage3';
// Only validated document families activate interpretation. No generic VIN decoding.
export function analyzeOtherOriginal(text,vin){
 const raw=String(text).split(/\r?\n/).map(normalizeText).filter(Boolean);
 if(!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)||!text.toUpperCase().replace(/[^A-Z0-9]/g,'').includes(vin))throw Error('Sticker VIN does not match vehicle');
 let family,start,end;
 if(/General Motors LLC|GMLBL_PROD/.test(text)&&/STANDARD EQUIPMENT/.test(text)&&/OPTIONS & PRICING/.test(text)){
  family='GM';start=raw.findIndex(l=>/^STANDARD EQUIPMENT$/i.test(l));end=raw.findIndex((l,i)=>i>start&&/^TOTAL VEHICLE PRICE/i.test(l));
 }else if(/KIA DRIVE WISE|Kia America/i.test(text)&&/STANDARD FEATURES/.test(text)&&/ADDITIONAL INSTALLED EQUIPMENT/.test(text)){
  family='Kia';start=raw.findIndex(l=>/^STANDARD FEATURES$/i.test(l));end=raw.findIndex((l,i)=>i>start&&/^MSRP INCLUDING OPTIONS/i.test(l));
 }else return null;
 if(start<0||end<=start)return null;
 const lines=raw.slice(start+1,end).filter(l=>!/^\$|^(?:manufacturer|standard vehicle price|total options|total vehicle &|destination charge|[\d,]+\.\d{2}$)/i.test(l));
 const features={};
 const additional={
  ventilated:/seats?,.*ventilated|ventilated.*(?:driver|passenger)/i,
  heatedSeats:/seats?,.*heated|heated.*(?:driver|passenger)/i,
  backupCamera:/rear vision camera/i,remoteStart:/remote vehicle start/i,
  adaptiveCruise:/smart cruise control/i,wireless:/wireless phone charger/i,
  dualClimate:/dual.zone.*(?:temperature|climate)|air conditioning, dual zone/i,
  premiumAudio:/audio system.*premium.*bose/i,
  emergencyBrake:/collision.avoidance assist/i,
  driverAlert:/driver attention warning/i,
  autoHighBeam:/high beam assist/i,
  laneAssist:/lane keeping assist/i,
  powerDriver:/power driver.s seat/i,
 };
 for(const [id,,pattern] of definitions){
  // Cross-brand paint/upholstery abbreviations and powertrain implications need
  // their own validated readers. Only direct feature wording is used here.
  if(id.startsWith('interior')||['cloth','exteriorGray','flatTow','v8','v6','hemi','electric','hybrid','diesel','fourWheel','awd'].includes(id))continue;
  const evidence=lines.filter(l=>(pattern.test(l)||additional[id]?.test(l))&&validSeatEvidence(id,l)&&!/\b(?:available|if equipped|sold separately|warranty)\b/i.test(l));
  const negative=evidence.filter(l=>/\b(?:delete|deleted|deletion|without|not included|not equipped)\b/i.test(l));
  const positive=evidence.filter(l=>!negative.includes(l)&&!(id==='leather'&&!/leather.*(?:seats?|seating|bucket)|seats?.*leather/i.test(l)));
  if(negative.length)features[id]={value:false,evidence:negative.slice(0,2)};
  else if(positive.length)features[id]={value:true,evidence:positive.slice(0,2)};
 }
 return {identityLines:raw.filter(l=>/^20\d{2}\b/.test(l)).slice(0,1),features,lines,engine:null,equipmentSectionComplete:false,documentFamily:family};
}
