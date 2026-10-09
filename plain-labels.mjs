// Factory chart lines in shopper's words: "Blind Spot Monitoring (BSM)(7) and Rear Cross-Path Detection System(4)
// (XAN)" → "Blind Spot Monitoring and Rear Cross-Path Detection System". Order codes and footnote numbers go; notes such
// as "(included with Convenience Group)" or "(4x4 only)" move to a note; a package row splits into its name and what it
// includes. The words are the chart's own — nothing is reworded beyond that.

const marks=/[®™]/g;
// "(XAC)", "(LST/LSU)", "(9)", "(–91)", "(*GJ)": codes and footnotes.
const code=/^\s*[*–\-]?[A-Z0-9]{1,4}(?:\s*[\/,]\s*[*–\-]?[A-Z0-9]{1,4})*\s*$/;
const noteWords=/\b(?:includ\w*|packag\w*|requires?|required|standard on|standard with|available|optional|only|late availability|not with)\b/i;

function tidy(s){
 return String(s||'').replace(marks,'').replace(/([a-z’'])TM\b/g,'$1').replace(/\(\s*\)/g,'').replace(/\s+([,;.])/g,'$1').replace(/\s+/g,' ').trim();
}
// Pull parenthetical pieces out of a line: codes dropped, notes returned, descriptive words ("rear door") kept.
function split(text){
 const notes=[];
 let s=String(text||'');
 for(let i=0;i<3;i++)s=s.replace(/\(([^()]*)\)/g,(all,inner)=>{
  if(code.test(inner))return '';
  if(noteWords.test(inner)){notes.push(tidy(inner));return '';}
  return all;
 });
 return {text:tidy(s).replace(/[\s,;:—–-]+$/,''),notes};
}
const cap=s=>s?s[0].toUpperCase()+s.slice(1):s;
const section=s=>String(s||'').toLowerCase().replace(/(^|[\s/&(-])([a-z])/g,(m,a,b)=>a+b.toUpperCase()).replace(/\bAnd\b/g,'and');

// → {name, group, includes, note, section} for one fact (factory chart fact or trim-guide fact).
export function plainFact(f){
 if(!f.factory)return {name:f.label,group:'',includes:'',note:f.note||'',detail:f.value||'',section:''};
 let parent=split(f.parent),text=split(f.text??f.label);
 let name=text.text,group=parent.text,includes='';
 const notes=[...text.notes];
 // A package: "Convenience Group — includes …", or parent "Laramie Level 1 Equipment (P1 Group)" with "Includes …".
 const dash=/^(.{3,80}?)\s+[—–-]\s+(?:includes|including)\s+(.+)$/i.exec(name)||/^(.{3,80}?\b(?:Group|Package|Pack|Edition))\s+(?:includes|including)\s+(.+)$/i.exec(name);
 if(/^includes?\b/i.test(name)&&group){includes=name.replace(/^includes?\s*/i,'');name=group;group='';}
 else if(dash){name=dash[1];includes=dash[2];}
 if(!name&&group){name=group;group='';}
 return {name:cap(name),group,includes:includes.replace(/[.;]\s*$/,''),note:[...notes,notes.some(n=>/includ|packag/i.test(n))&&/package/i.test(f.note||'')?'':f.note].filter(Boolean).join(' · '),detail:'',section:section(f.section)};
}
