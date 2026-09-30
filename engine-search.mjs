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
export function engineFact(id,sticker){
 if(sticker?.status!=='verified')return null;
 const lines=[...new Set([sticker.engine,...(sticker.lines||[]).filter(l=>/^engine:/i.test(l))].filter(Boolean))];
 if(!lines.length)return null;
 const text=lines.join(' '),layout=text.match(/\b([iv])\s*-?\s*([3468])\b|\b(in[ -]?line|straight)[ -]?([3468])\b/i);
 const count=layout?.[2]||layout?.[4]||text.match(/\b([3468])[ -]?(?:cylinders?|cyl)\b/i)?.[1];
 const size=text.match(/\b([1-9](?:\.\d)?)\s*-?\s*(?:l\b|lit(?:er|re)s?\b)/i)?.[1];
 let value;
 if(id.startsWith('engineSize')){if(!size)return null;value=Math.round(Number(size)*10)===Number(id.slice(10));}
 else if(/^engineCyl[468]$/.test(id)){if(!count)return null;value=count===id.slice(-1);}
 else if(/^engineInline[46]$/.test(id)){if(!layout)return null;value=(layout[1]?.toLowerCase()==='i'||!!layout[3])&&count===id.slice(-1);}
 else if(id==='v6'||id==='v8'){if(!layout)return null;value=layout[1]?.toLowerCase()==='v'&&count===id.slice(-1);}
 else if(id==='turbo'){if(!/turbo/i.test(text))return null;value=true;}
 else return null;
 return {value,evidence:lines};
}
