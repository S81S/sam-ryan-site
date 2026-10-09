// Exhaust requests are equipment phrases, not unrelated words in a trim/title.
// Keep the specific factory descriptions separate; a GT trim, exhaust tips,
// diesel exhaust brake or an unrelated performance package proves none of them.
export const exhaustDefinitions=[
 ['gtExhaust','G/T exhaust',/\bg\s*[/-]?\s*t\s+exhaust\b/i],
 ['performanceExhaust','Performance exhaust',/\b(?:high[ -]+)?performance[ -]+exhaust\b/i],
 ['sportExhaust','Sport exhaust',/\bsport(?:s)?[ -]+exhaust\b/i],
 ['upgradedExhaust','Explicitly described upgraded exhaust',/\bupgraded[ -]+exhaust\b/i]
];
export const exhaustAliases=exhaustDefinitions.map(([id,,pattern])=>[id,new RegExp(pattern.source,'g')]);
export function exhaustFact(id,sticker){
 const definition=exhaustDefinitions.find(d=>d[0]===id);
 if(!definition||sticker?.status!=='verified')return null;
 const lines=(sticker.lines||[]).map(line=>String(line).normalize('NFKC').replace(/[\u2010-\u2015]/g,'-'));
 const evidence=lines.filter(line=>definition[2].test(line)&&
  ! /\bexhaust[ -]+(?:tips?|brakes?|shields?|hangers?)\b/i.test(line)&&
  ! /\b(?:if equipped|available separately|available with|optional accessory)\b/i.test(line));
 const negative=evidence.filter(line=>/\b(?:delete[ds]?|deletion|without|not equipped|not included|no)\b/i.test(line));
 if(!evidence.length)return null;
 return {value:!negative.length,evidence:negative.length?negative:evidence,sourceUrl:sticker.sourceUrl,method:'sticker-exhaust'};
}
