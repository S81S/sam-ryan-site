// Compare installed specifications, not just yes/no feature flags. Only read
// explicit wording from a verified sticker belonging to the selected VIN.
const norm=s=>String(s||'').normalize('NFKC').replace(/[\u2010-\u2015]/g,'-').replace(/′′|[“”″]/g,'"').replace(/\s+/g,' ').trim();
const blocked=/\b(?:if equipped|available separately|available with|optional accessory|delete[ds]?|deletion|without|not equipped|not included)\b/i;
const inch=/\b(\d{1,2}(?:\.\d+)?)(?:\s*-?\s*(?:inch(?:es)?|in\b)|\s*")/i;
const infotainment=line=>/\b(?:uconnect|infotainment|touch[ -]?screen|center(?: stack)? display|centre(?: stack)? display)\b/i.test(line)&&!(/\b(?:cluster|instrument|passenger|rear[ -]seat|head[ -]?up)\b/i.test(line));
const cluster=line=>/\b(?:cluster|instrument (?:panel|display))\b/i.test(line)&&/display|screen/i.test(line);
export const specificationDefinitions=[['infotainmentScreen','Infotainment screen size'],['instrumentScreen','Instrument cluster screen size'],['fuelTankCapacity','Fuel tank capacity'],['equipmentGroup','Equipment group']];

function installedFact(sticker,selector,extract){
 const lines=sticker.lines.map(norm),optionIndex=lines.findIndex(l=>/^(?:optional equipment|options & pricing|optional features)\b/i.test(l));
 const candidates=lines.map((line,index)=>({line,index})).filter(x=>selector(x.line));
 const optional=optionIndex<0?[]:candidates.filter(x=>x.index>optionIndex);
 const selected=optional.length?optional:candidates;
 // A replacement of unspecified size must not leave a standard size in place.
 if(!selected.length||selected.some(x=>blocked.test(x.line)))return null;
 const values=selected.map(x=>extract(x.line));
 if(values.some(x=>!x)||new Set(values).size!==1)return null;
 return {value:true,displayValue:values[0],comparisonValue:values[0].toLowerCase(),method:'sticker-specification',evidence:[...new Set(selected.map(x=>x.line))],sourceUrl:sticker.sourceUrl};
}
export function withComparisonSpecifications(vehicle,sticker){
 if(sticker?.status!=='verified'||!vehicle?.vin||sticker.vin!==vehicle.vin||!Array.isArray(sticker.lines))return null;
 const features={...sticker.features};
 for(const [id] of specificationDefinitions)delete features[id];
 const screen=line=>{const match=line.match(inch);return match&&Number(match[1])>=4&&Number(match[1])<=40?Number(match[1])+' inches':null;};
 const specs={
  infotainmentScreen:installedFact(sticker,infotainment,screen),
  instrumentScreen:installedFact(sticker,cluster,screen),
  fuelTankCapacity:installedFact(sticker,l=>/\bfuel[ -]tank\b/i.test(l),l=>{const m=l.match(/\b(\d+(?:\.\d+)?)[ -]+gallon\b/i);return m?Number(m[1])+' gallons':null;}),
  equipmentGroup:installedFact(sticker,l=>/\blevel\s+[\dA-Z]+\s+(?:equipment\s+)?group\b/i.test(l),l=>l.replace(/\s+\$[\d,.]+\s*$/,'').replace(/[®™]/g,''))
 };
 for(const [id,fact] of Object.entries(specs))if(fact)features[id]=fact;
 return {...sticker,features};
}
