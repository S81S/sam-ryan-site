// Shared by fresh sticker extraction, saved-record search and comparison.
export const dualRearWheelPattern=/\bdual[ -]rear[ -]wheels?\b|\bDRW\b/i;
export const secondRowBenchPattern=/\b(?:2nd|second)[ -]row\b[^.;\n]*\bbench\b|\bbench\b[^.;\n]*\b(?:2nd|second)[ -]row\b/i;
const secondRowCaptainPattern=/\b(?:2nd|second)[ -]row\b[^.;\n]*\b(?:captain(?:s|'s)?|bucket)[ -]?(?:chairs?|seats?)\b/i;
const excluded=/\b(?:delete|deleted|deletion|without|not equipped|not included)\b/i;
export function wheelSeatFeatures(lines){
 const features={};
 const wheels=lines.filter(l=>dualRearWheelPattern.test(l));
 if(wheels.length)features.dualRearWheels={value:!wheels.some(l=>excluded.test(l)),evidence:wheels.slice(0,2)};
 const layouts=lines.map((line,index)=>({line,index,bench:secondRowBenchPattern.test(line),captain:secondRowCaptainPattern.test(line)})).filter(x=>x.bench||x.captain);
 const optionIndex=lines.findIndex(l=>/^optional equipment/i.test(l));
 const optional=optionIndex<0?[]:layouts.filter(x=>x.index>optionIndex);
 const relevant=optional.length?optional:layouts;
 const bench=relevant.filter(x=>x.bench),captain=relevant.filter(x=>x.captain);
 // Conflicting layouts in the same equipment section require review.
 if(bench.length&&!captain.length)features.secondRowBench={value:!bench.some(x=>excluded.test(x.line)),evidence:bench.map(x=>x.line).slice(0,2)};
 else if(captain.length&&!bench.length&&!captain.some(x=>excluded.test(x.line)))features.secondRowBench={value:false,evidence:captain.map(x=>x.line).slice(0,2)};
 return features;
}
export function repairWheelSeatEvidence(sticker){
 if(sticker?.status!=='verified')return sticker;
 const lines=sticker.lines||[],features={...sticker.features,...wheelSeatFeatures(lines)};
 // VIN identifies the exact reviewed model year; the model is from the original,
 // never from a listing title. No rule for unreviewed years or Wagoneer S.
 const model=lines.find(l=>/^(?:JEEP )?(?:GRAND )?WAGONEER\b/i.test(l))||'';
 const year={N:2022,S:2025,T:2026}[sticker.vin?.[9]];
 const source=wagoneerSources[year];
 if(source&&/^(?:JEEP )?(?:GRAND )?WAGONEER(?: L)?(?: |$)/i.test(model)&&!/^.*WAGONEER S\b/i.test(model)&&(year!==2026||/GRAND WAGONEER/.test(model))){
  const layouts=lines.map((line,index)=>({line,index,eight:/^8[ -]Passenger Seating(?: Package)?(?:\s+\$[\d,.]+)?$/i.test(line),seven:/^7[ -]Passenger Seating(?:\s+\$[\d,.]+)?$/i.test(line),captain:secondRowCaptainPattern.test(line)})).filter(x=>x.eight||x.seven||x.captain);
  const start=lines.findIndex(l=>/^optional equipment/i.test(l)),options=start<0?[]:layouts.filter(x=>x.index>start),selected=options.length?options:layouts;
  const eight=selected.filter(x=>x.eight),other=selected.filter(x=>x.seven||x.captain);
  if(eight.length&&!other.length&&start>=0&&!lines.some(l=>/\b(?:delete|deleted|deletion)\b/i.test(l)&&/seat/i.test(l)))features.secondRowBench={value:true,method:'factory-seating-layout',sourceUrl:source,evidence:[eight[0].line,`${year} factory manual identifies eight-passenger seating as a second-row bench layout.`]};
 }
 return {...sticker,features};
}
const wagoneerSources={
 2022:'https://vehicleinfo.mopar.com/assets/publications/en-us/Wagoneer/2022/Wagoneer/HTML-TG/GUID-C44CF163-AD53-498C-88CB-DCDDB9447081.html',
 2025:'https://vehicleinfo.mopar.com/assets/publications/en-us/Jeep/2025/Wagoneer/103579_25_WS_OM_EN_USC_DIGITAL_E2.pdf',
 2026:'https://vehicleinfo.mopar.com/assets/publications/en-us-ca/2026/Jeep/Grand_Wagoneer/105358_26_WS_OM_EN_USC_DIGITAL_E2.pdf'
};
