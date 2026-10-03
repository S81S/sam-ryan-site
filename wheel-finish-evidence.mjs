// Wheel finish is a fact about the installed wheel specification, not trim text.
export const wheelFinishDefinitions=[
 ['wheelChrome','Chrome / chrome-clad wheels (factory)',/\bchrome\b/i],
 ['wheelBlack','Black-finish wheels (factory)',/\bblack(?:noise)?\b/i],
 ['wheelPolished','Polished wheels (factory)',/\bpolish(?:ed)?\b/i]
];
export const wheelFinishAliases=wheelFinishDefinitions.map(([id])=>[id,new RegExp('\\bfeaturetoken'+id.toLowerCase()+'\\b','g')]);
const norm=s=>String(s||'').normalize('NFKC').replace(/[\u2010-\u2015]/g,'-').replace(/\s+/g,' ').trim();
// Preserve negation outside the replaced phrase. Consume the component color
// before the independent exterior-paint parser sees it.
export function wheelFinishSearchTerms(text){
 const finishes='chrome(?:[ -]clad|[ -]plated)?|black|polished';
 const modifiers='(?:(?:gloss|matte|satin|painted|aluminum|aluminium|alloy|steel|finish|finished|mid[ -]gloss)[ -]+)*';
 const prefix=new RegExp('\\b(?:'+modifiers+')('+finishes+')[ -]+'+modifiers+'(?:wheels?|rims?)\\b','g');
 const suffix=new RegExp('\\b(?:wheels?|rims?)\\s+(?:(?:in|are|with|finished in)\\s+)?'+modifiers+'('+finishes+')\\b','g');
 const token=finish=>'featuretokenwheel'+(/^chrome/.test(finish)?'chrome':finish==='black'?'black':'polished');
 return text.replace(prefix,(_,finish)=>token(finish)).replace(suffix,(_,finish)=>token(finish));
}
const excludedComponent=/\b(?:steering|spare|fifth|5th|wheelhouse|cover|covers|cap|caps|locks?|flares?|moldings?|mouldings?|mirrors?|grille|bumper|fascia|key fob)\b/i;
const conditional=/\b(?:if equipped|available|may be|optional wheels|not included|not equipped|without)\b/i;
const deleted=/\b(?:delete|deleted|deletion|removed)\b/i;
function wheelSpec(line){
 return /\b(?:wheels|rims)\b/i.test(line)&&!excludedComponent.test(line)&&!/^\s*(?:standard|optional) equipment/i.test(line)&&!/^dual[ -]rear/i.test(line);
}
function classify(line){
 // A dark/chrome mixed finish or chrome inserts alone is not a bright chrome wheel.
 const chrome=/\bchrome\b/i.test(line)&&!/(?:black|dark|smoked)[ -]chrome|chrome.*\b(?:inserts?|pockets?|accents?)\b/i.test(line);
 const main=line.split(/\b(?:with|w\/)\s+/i)[0].split(/,|;/)[0];
 const black=/\bblack(?:noise)?\b/i.test(main)&&!/(?:black|dark)[ -]chrome/i.test(main);
 const polished=/\bpolish(?:ed)?\b/i.test(main);
 return {wheelChrome:chrome,wheelBlack:black,wheelPolished:polished,known:chrome||black||polished||/\b(?:silver|gr[ae]y|bronze|gold|white)\b/i.test(main)};
}
export function wheelFinishFeatures(raw=[]){
 const lines=raw.map(norm),start=lines.findIndex(l=>/^(?:optional equipment|options & pricing|additional installed equipment)/i.test(l));
 const all=lines.map((line,index)=>({line,index})).filter(x=>wheelSpec(x.line));
 // Even an unclassified optional wheel replaces the standard wheel; never fall
 // back to the standard finish in that case. Conflicting options need review.
 const optional=start<0?[]:all.filter(x=>x.index>start),selected=optional.length?optional:all;
 if(!selected.length)return {};
 const rows=selected.filter(x=>!deleted.test(x.line));
 if(!rows.length||rows.some(x=>conditional.test(x.line)))return {};
 if(selected.some(x=>deleted.test(x.line))&&!optional.some(x=>!deleted.test(x.line)))return {};
 const facts=rows.map(x=>classify(x.line));
 if(facts.some(f=>!f.known))return {};
 const features={};
 for(const [id]of wheelFinishDefinitions){
  if(facts.every(f=>f[id]===facts[0][id]))features[id]={value:facts[0][id],evidence:rows.map(x=>x.line).slice(0,3),method:'sticker-wheel-finish'};
 }
 return features;
}
export function repairWheelFinishEvidence(sticker){
 if(sticker?.status!=='verified')return sticker;
 const features={...sticker.features};
 for(const [id]of wheelFinishDefinitions)delete features[id];
 return {...sticker,features:{...features,...wheelFinishFeatures(sticker.lines)}};
}
