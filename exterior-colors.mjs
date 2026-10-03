// Exterior colors are facts about the paint field, never whole-sticker keywords.
export const exteriorColors=[
 ['White','White',/\bwhite\b/i],['Black','Black',/\bblack\b/i],
 ['Gray','Gray / grey',/\bgr[ae]y\b/i],['Silver','Silver',/\bsilver\b/i],
 ['Red','Red',/\bred\b/i],['Blue','Blue',/\bblue\b/i],
 ['Green','Green',/\bgreen\b/i],['Yellow','Yellow',/\byellow\b/i],
 ['Orange','Orange',/\borange\b/i],['Purple','Purple',/\b(?:purple|violet)\b/i],
 ['Pink','Pink',/\bpink\b/i],['Brown','Brown',/\bbrown\b/i],
 ['Tan','Tan / beige',/\b(?:tan|beige)\b/i],['Gold','Gold',/\bgold\b/i],
 ['Bronze','Bronze',/\bbronze\b/i],['Ivory','Ivory / cream',/\b(?:ivory|cream)\b/i]
].map(([name,label,pattern])=>({id:'exterior'+name,label:label+' exterior paint',pattern}));
const colorWords=/\b(?:white|black|gr[ae]y|silver|red|blue|green|yellow|orange|purple|violet|pink|brown|tan|beige|gold|bronze|ivory|cream)\b/g;
const norm=s=>String(s||'').normalize('NFKC').replace(/[\u2010-\u2015]/g,'-').replace(/\s+/g,' ').trim();
export function exteriorPaintLines(lines=[]){
 return lines.filter(l=>/^exterior(?:\s+(?:colou?r|paint))?\s*:/i.test(norm(l)))
  .map(l=>norm(l).split(/\s+interior(?:\s+colou?r)?\s*:/i)[0]);
}
export function exteriorColorFact(id,sticker){
 if(sticker?.status!=='verified')return null;
 const evidence=exteriorPaintLines(sticker.lines),seen=new Set();
 if(!evidence.length)return null;
 for(const line of evidence){
  const value=line.slice(line.indexOf(':')+1);
  const colors=exteriorColors.filter(c=>c.pattern.test(value));
  // A trade name without a recognizable family, or multiple paint colors, needs
  // review. Missing words do not prove absence, and a roof/accent is not body paint.
  if(colors.length!==1||/\broof\b|\bwheels?\b|\binterior\b|\btwo[ -]?tone\b|\//i.test(value))return null;
  seen.add(colors[0].id);
 }
 if(seen.size!==1)return null;
 return {value:seen.has(id),evidence,method:'sticker-exterior-color'};
}
export function extractExteriorColors(text,result){
 const q=text;
 const remaining=q.replace(colorWords,(word,offset)=>{
  const before=q.slice(Math.max(0,offset-65),offset),after=q.slice(offset+word.length);
  // Explicit component requests stay component requests. Interior phrases are
  // already handled by the existing interior-color parser before this function.
  const component='(?:wheels?|rims?|roof|hard[ -]?top|soft[ -]?top|mirrors?|grille|badges?|accents?|trim|appearance|package|edition|interior|seats?|upholstery|leather|cloth)';
  if(new RegExp('^\\s+(?:(?:painted|alloy|steel|aluminum|aluminium|gloss|matte)\\s+)*'+component+'\\b').test(after)||new RegExp('\\b'+component+'(?:\\s+colou?r)?\\s+(?:(?:in|is|are)\\s+)?$').test(before))return word;
  const color=exteriorColors.find(c=>c.pattern.test(word));
  const wanted=!/(?:\bno|\bwithout|\bnot|\bdon.t want|\bdo not want|\bmust not have)\s+(?:a\s+|any\s+)?$/.test(before);
  const previous=result.requirements.find(r=>r.id===color.id);
  if(previous&&previous.wanted!==wanted)result.warnings.push('Conflicting request for '+color.label+'.');
  else if(!previous)result.requirements.push({id:color.id,wanted});
  return ' ';
 });
 if(result.requirements.filter(r=>r.id.startsWith('exterior')&&r.wanted).length>1)result.ambiguity='Choose one exterior paint color for this search, or search each color separately.';
 return remaining;
}
