// A power driver's seat does not make a manually adjusted passenger seat powered.
// Keep this exclusion shared by new PDF readers and previously saved records.
export function validSeatEvidence(id,line){
 if(id==='powerPassenger')return !/\bmanual\b[^.;\n]*\bpassenger\b|\bpassenger\b[^.;\n]*\bmanual\b/i.test(line);
 if(id==='powerDriver')return !/\bmanual\b[^.;\n]*\bdriver\b/i.test(line);
 return true;
}
export function repairSeatEvidence(sticker){
 const fact=sticker.features?.powerPassenger;
 if(!fact?.value||!fact.evidence?.some(l=>!validSeatEvidence('powerPassenger',l)))return sticker;
 const evidence=fact.evidence.filter(l=>validSeatEvidence('powerPassenger',l));
 const features={...sticker.features};
 if(evidence.length)features.powerPassenger={...fact,evidence};
 else delete features.powerPassenger;
 // Leave it unknown: an unexpanded optional seat package could replace the manual seat.
 return {...sticker,features};
}
