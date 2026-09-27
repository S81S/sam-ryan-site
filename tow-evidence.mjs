// Trailer-tow mirrors are their own feature; they do not establish a hitch/package.
// A separately printed receiver hitch or tow package remains valid on the same line.
export const towEquipmentPattern=/receiver.hitch|trailer.tow(?![^.;\n]*\bmirrors?\b)|tow.package/i;
export function repairTowEvidence(sticker){
 const fact=sticker.features?.tow;
 if(!fact?.value||!fact.evidence?.some(l=>/trailer.tow.*\bmirrors?\b/i.test(l)&&!towEquipmentPattern.test(l)))return sticker;
 // Rescan all saved equipment lines: old evidence was limited to two matches and
 // could have omitted a valid hitch after the mirror lines. Never infer absence.
 const evidence=(sticker.lines||fact.evidence).filter(l=>towEquipmentPattern.test(l));
 const negative=evidence.filter(l=>/\b(?:delete|deleted|deletion|without|not equipped|not included)\b/i.test(l));
 const positive=evidence.filter(l=>!negative.includes(l)&&!/^optional equipment|if equipped|available separately/i.test(l));
 const features={...sticker.features};
 if(negative.length)features.tow={value:false,evidence:negative.slice(0,2)};
 else if(positive.length)features.tow={value:true,evidence:positive.slice(0,2)};
 else delete features.tow;
 return {...sticker,features};
}
