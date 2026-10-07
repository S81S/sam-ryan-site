// Engine queries use VIN-verified original sticker engine lines, not trim assumptions.
const sizes=Array.from({length:90},(_,i)=>((i+10)/10).toFixed(1));
const kinds=[['engineCyl4','4-cylinder engine'],['engineCyl6','6-cylinder engine'],['engineCyl8','8-cylinder engine'],['engineInline4','Inline-four engine'],['engineInline6','Inline-six engine']];
export const engineDefinitions=[...kinds,...sizes.map(s=>['engineSize'+s.replace('.',''),s+'-liter engine'])].map(([id,label])=>[id,label,/$a/]);
export function engineTerms(text){
 let q=text;
 // Protect cylinder count before the general dictionary (six cylinders does not imply V6).
 const number={four:4,six:6,eight:8};
 q=q.replace(/\b(4|6|8|four|six|eight)[ -]?(?:cylinders?|cyl)\b/g,(_,n)=>' featuretokenenginecyl'+(number[n]||n)+' ');
 q=q.replace(/\b(?:in[ -]?line|straight)[ -]?(4|6|four|six)\b|\bi[ -]?(4|6)\b/g,(_,a,b)=>' featuretokenengineinline'+(number[a]||a||b)+' ');
 q=q.replace(/\b(?:turbo|turbocharged)[ -]+(four|six)\b/g,(_,n)=>' turbo featuretokenenginecyl'+number[n]+' ');
 q=q.replace(/\bv[ -]?(six|eight|6|8)\b/g,(_,n)=>' v'+(number[n]||n)+' ');
 q=q.replace(/\b([1-9]\.\d)(?:\s*-?\s*(?:liters?|litres?|l))?\b/g,(_,s)=>' featuretokenenginesize'+s.replace('.','')+' ');
 q=q.replace(/\b([1-9])\s*-?\s*(?:liters?|litres?|l)\b/g,(_,s)=>' featuretokenenginesize'+s+'0 ');
 return q.replace(/\b(?:engine|motor|displacement)\b/g,' ');
}
export const engineAliases=engineDefinitions.map(([id])=>[id,new RegExp('\\bfeaturetoken'+id.toLowerCase()+'\\b','g')]);
// What a factory "Engine:" line says, read the way the sales floor reads it (Sam's rulings, 7 Oct 2026):
// every 5.7, 6.2 and 6.4 V8 here is a HEMI, with or without eTorque and whether or not the line says so; the 6.2
// HEMI is supercharged; every 3.6 V6 is a Pentastar; Hurricane Twin Turbo and Sixpack are 3.0-liter inline-sixes and
// "Hurricane 4" is an inline-four; eTorque is not a hybrid. Only Stellantis stickers print an "Engine:" line.
export function engineProfile(text){
 const t=String(text||'');
 const sixpack=/\bsix[ -]?pack\b/i.test(t),named=/\bhurricane\b/i.test(t)||sixpack;
 const stated=t.match(/\b([iv])\s*-?\s*([3468])\b|\b(in[ -]?line|straight)[ -]?([3468])\b/i);
 let layout=stated?(stated[1]?.toLowerCase()==='v'?'v':'i'):null,count=stated?.[2]||stated?.[4]||t.match(/\b([3468])[ -]?(?:cylinders?|cyl)\b/i)?.[1]||null;
 let size=t.match(/\b([1-9](?:\.\d)?)\s*-?\s*(?:l\b|lit(?:er|re)s?\b)/i)?.[1]||null;
 if(/\b392\b/.test(t)&&!size)size='6.4';
 if(named&&!count){if(/\bhurricane 4\b/i.test(t)||size==='2.0'){layout='i';count='4';}else if(/\btwin[ -]turbo\b/i.test(t)||sixpack||size==='3.0'){layout='i';count='6';}}
 if(named&&!size&&count==='6')size='3.0';
 const tenths=size?Math.round(Number(size)*10):null,v8=layout==='v'&&count==='8';
 const hemi=/\bhemi\b/i.test(t)||(v8&&[57,62,64].includes(tenths));
 const diesel=/\bdiesel\b/i.test(t);
 return {layout,count,size:tenths,hemi,v8,v6:layout==='v'&&count==='6',pentastar:/\bpentastar\b/i.test(t)||(layout==='v'&&count==='6'&&tenths===36&&!diesel),
  // Only an engine the sticker names Hurricane (or Sixpack) is one; the older 2.0 turbo four is not.
  hurricane:named,dieselCummins:/\bcummins\b/i.test(t),diesel,turbo:/\bturbo/i.test(t)||sixpack,
  supercharged:/\bsupercharg/i.test(t)||(hemi&&tenths===62),hybrid:/\bhybrid\b|\bphev\b|\b4xe\b/i.test(t),electric:false};
}
const engineKinds=['hemi','v8','v6','pentastar','hurricane','dieselCummins','diesel','turbo','supercharged','hybrid','electric'];
export const engineKindIds=engineKinds;
export function engineFact(id,sticker){
 if(sticker?.status!=='verified')return null;
 const known=id.startsWith('engineSize')||/^engine(?:Cyl[468]|Inline[46])$/.test(id)||engineKinds.includes(id);
 if(!known)return null;
 const lines=[...new Set([sticker.engine,...(sticker.lines||[]).filter(l=>/^engine:/i.test(l))].filter(Boolean))];
 if(!lines.length){
  // A battery-electric vehicle has a "Motor:" line and no engine at all.
  const motor=(sticker.lines||[]).find(l=>/^motor:.*\belectric\b/i.test(l));
  return motor?{value:id==='electric',evidence:[motor]}:null;
 }
 const e=engineProfile(lines.join(' '));
 let value;
 if(id.startsWith('engineSize')){if(!e.size)return null;value=e.size===Number(id.slice(10));}
 else if(/^engineCyl[468]$/.test(id)){if(!e.count)return null;value=e.count===id.slice(-1);}
 else if(/^engineInline[46]$/.test(id)){if(!e.layout)return null;value=e.layout==='i'&&e.count===id.slice(-1);}
 else if(id==='v6'||id==='v8'){if(!e.layout)return null;value=e[id];}
 else{value=e[id];if(value===null)return null;}
 return {value,evidence:lines};
}
