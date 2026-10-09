// An optional sound system replaces the base system printed elsewhere on the
// same VIN-matched sticker. Never keep both brands as installed equipment.
const normalize=s=>String(s||'').normalize('NFKC').replace(/[\u2010-\u2015]/g,'-').replace(/[®™]/g,'').replace(/\s+/g,' ').trim();
const brands={harman:/harman[ -]?kardon/i,alpine:/\balpine\b/i,mcintosh:/\bmcintosh\b/i};
const blocked=/\b(?:if equipped|available separately|available with|optional accessory|delete[ds]?|deletion|without|not equipped|not included)\b/i;
export function installedAudioFact(vehicle,sticker){
 if(sticker?.status!=='verified'||!vehicle?.vin||sticker.vin!==vehicle.vin||!Array.isArray(sticker.lines))return null;
 const lines=sticker.lines.map(normalize),start=lines.findIndex(l=>/^optional equipment|^options & pricing|^optional features/i.test(l));
 const candidates=lines.map((line,i)=>({line,i})).filter(({line})=>/\b\d+[ -]+(?:amplified[ -]+)?speakers?\b/i.test(line)||Object.values(brands).some(p=>p.test(line))&&/speaker|audio|sound/i.test(line));
 const upgrades=start<0?[]:candidates.filter(c=>c.i>start),selected=upgrades.length?upgrades:candidates;
 if(!selected.length||selected.some(c=>blocked.test(c.line)))return null;
 let values=[...new Set(selected.map(c=>c.line.replace(/\s+\$[\d,.]+\s*$/,'')))];
 // A flattened source may omit the optional-equipment heading. The higher speaker-count system replaces its base system.
 if(values.length>1){const sizes=values.map(v=>Number(v.match(/\b(\d+)[ -]+(?:amplified[ -]+)?speakers?\b/i)?.[1]));if(sizes.every(n=>n>0)){const max=Math.max(...sizes);values=values.filter((v,i)=>sizes[i]===max);}}
 if(values.length!==1)return null;
 return {value:true,displayValue:values[0],comparisonValue:values[0].toLowerCase(),method:'sticker-specification',evidence:values,sourceUrl:sticker.sourceUrl};
}
export function repairInstalledAudioEvidence(vehicle,sticker){
 if(sticker?.status!=='verified'||sticker.vin!==vehicle?.vin)return sticker;
 const installed=installedAudioFact(vehicle,sticker),features={...sticker.features};
 if(installed&&/amplified|harman|alpine|mcintosh/i.test(installed.displayValue))features.premiumAudio={value:true,method:'sticker-installed-audio',evidence:installed.evidence,sourceUrl:sticker.sourceUrl};
 for(const id of Object.keys(brands)){
  delete features[id];
  if(!installed)continue;
  const present=brands[id].test(installed.displayValue),otherBrand=Object.entries(brands).some(([key,p])=>key!==id&&p.test(installed.displayValue));
  if(present||otherBrand)features[id]={value:present,method:'sticker-installed-audio',evidence:installed.evidence,sourceUrl:sticker.sourceUrl};
 }
 return {...sticker,features};
}

export function audioInventoryFeature(fact){
 const text=fact?.displayValue||fact?.evidence?.join(' ')||'';
 return Object.entries(brands).find(([,pattern])=>pattern.test(text))?.[0]||null;
}
