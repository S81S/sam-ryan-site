// Compare installed specifications, not just yes/no feature flags. Only read
// explicit wording from a verified sticker belonging to the selected VIN.
const norm=s=>String(s||'').normalize('NFKC').replace(/[\u2010-\u2015]/g,'-').replace(/′′|[“”″]/g,'"').replace(/\s+/g,' ').trim();
const blocked=/\b(?:if equipped|available separately|available with|optional accessory|delete[ds]?|deletion|without|not equipped|not included)\b/i;
const inch=/\b(\d{1,2}(?:\.\d+)?)(?:\s*-?\s*(?:inch(?:es)?|in\b)|\s*")/i;
const infotainment=line=>/\b(?:uconnect|infotainment|touch[ -]?screen|center(?: stack)? display|centre(?: stack)? display)\b/i.test(line)&&!(/\b(?:cluster|instrument|passenger|rear[ -]seat|head[ -]?up)\b/i.test(line));
const cluster=line=>/\b(?:cluster|instrument (?:panel|display))\b/i.test(line)&&/display|screen/i.test(line);
export const specificationDefinitions=[['infotainmentScreen','Infotainment screen size'],['instrumentScreen','Instrument cluster screen size'],['equipmentGroup','Equipment group'],['listedPackages','Listed factory packages'],['driverAdjustment','Driver seat adjustment'],['passengerAdjustment','Front passenger seat adjustment'],['audioSystem','Audio system / speakers'],['bedPower','Truck-bed power outlet'],['powerInverter','Power inverter capacity'],['tailgateOperation','Tailgate operation'],['passengerDisplay','Front passenger display'],['digitalMirror','Digital rear-view mirror'],['handsFreeDriving','Hands-free driving assistance'],['wheelSize','Road wheel diameter'],['fuelTankCapacity','Fuel tank capacity']];

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
  fuelTankCapacity:installedFact(sticker,l=>/\bfuel[ -]tank\b/i.test(l)&&!/skid|plate|shield|cover|strap/i.test(l),l=>{const m=l.match(/\b(\d+(?:\.\d+)?)[ -]+gallon\b/i);return m?Number(m[1])+' gallons':null;}),
  equipmentGroup:installedFact(sticker,l=>/\blevel\s+[\dA-Z]+\s+(?:equipment\s+)?group\b/i.test(l),l=>l.replace(/\s+\$[\d,.]+\s*$/,'').replace(/[®™]/g,'')),
  driverAdjustment:installedFact(sticker,l=>/\b\d+[ -]+way\b.*\b(?:power|manual)\b.*\bdriver seat\b/i.test(l)&&!/lumbar/i.test(l),l=>{const m=l.match(/\b(\d+)[ -]+way\b.*\b(power|manual)\b/i);return m?m[1]+'-way '+m[2].toLowerCase():null;}),
  passengerAdjustment:installedFact(sticker,l=>/\b\d+[ -]+way\b.*\b(?:power|manual)\b.*\b(?:front )?passenger seat\b/i.test(l)&&!/lumbar/i.test(l),l=>{const m=l.match(/\b(\d+)[ -]+way\b.*\b(power|manual)\b/i);return m?m[1]+'-way '+m[2].toLowerCase():null;}),
  audioSystem:installedFact(sticker,l=>/\b\d+[ -]+(?:amplified[ -]+)?speakers?\b/i.test(l),l=>l.replace(/\s+\$[\d,.]+\s*$/,'').replace(/[®™]/g,'')),
  bedPower:installedFact(sticker,l=>/\bbed\b/i.test(l)&&/\b(?:outlet|power[ -]point|power[ -]supply)\b/i.test(l),l=>{const m=l.match(/\b(\d{2,3})[ -]?(?:volt|v)\b/i);return m?m[1]+'-volt bed outlet':'Bed power outlet (rating: Verify)';}),
  powerInverter:installedFact(sticker,l=>/\binverter\b/i.test(l),l=>{const m=l.match(/\b(\d+(?:\.\d+)?)[ -]*(k?w)(?:att)?\b/i);return m?Number(m[1])+' '+m[2].toUpperCase()+' inverter':null;}),
  tailgateOperation:installedFact(sticker,l=>/\b(?:power|multifunction|multi-function)[ -]+tailgate\b/i.test(l),l=>/release/i.test(l)?'Power tailgate release':/multi/i.test(l)?'Multifunction tailgate':'Power tailgate'),
  passengerDisplay:installedFact(sticker,l=>/\b(?:front )?passenger\b.*\b(?:display|screen)\b/i.test(l),l=>{const size=screen(l);return size?'Passenger display, '+size:'Passenger interactive display';}),
  digitalMirror:installedFact(sticker,l=>/\bdigital[ -]+rear[ -]?view[ -]+mirror\b/i.test(l),()=> 'Digital rear-view mirror'),
  handsFreeDriving:installedFact(sticker,l=>/\bhands[ -]?free\b.*\bdriving\b/i.test(l),()=> 'Hands-free driving assistance'),
  wheelSize:installedFact(sticker,l=>/\b(?:wheels?|whls)\b/i.test(l)&&!/\b(?:spare|steering|covers?|wheelbase|brakes?|drive|controls?|sensors?)\b/i.test(l),l=>{const m=l.match(inch),diameter=l.match(/\b(\d{2})(?:[ -]*inch)?\s*[x×]\s*\d/i);const value=Number(diameter?.[1]||m?.[1]);return value>=12&&value<=30?value+' inches':null;})
 };
 const packages=sticker.lines.map(norm).filter(l=>!blocked.test(l)&&!/^optional equipment/i.test(l)&&/\b(?:package|(?:equipment|utility|off-road|tow|technology|safety) group|night edition)\b/i.test(l)).map(l=>l.replace(/\s+\$[\d,.]+\s*$/,''));
 if(packages.length){const values=[...new Set(packages)].sort();specs.listedPackages={value:true,displayValue:values.join('; '),comparisonValue:values.map(v=>v.toLowerCase()).join('|'),method:'sticker-specification',evidence:values,sourceUrl:sticker.sourceUrl};}
 for(const [id,fact] of Object.entries(specs))if(fact)features[id]=fact;
 return {...sticker,features};
}
