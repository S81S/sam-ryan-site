// Vehicle-specific factory evidence shared by saved records and fresh scans.
const norm=s=>String(s||'').normalize('NFKC').replace(/[\u2010-\u2015]/g,'-').replace(/[“”″]/g,'"').replace(/[‘’]/g,"'").replace(/\s+/g,' ').trim();
const excluded=/\b(?:delete|deleted|deletion|without|not equipped|not included|no)\b/i;
const conditional=/\b(?:if equipped|available separately|available with|optional accessory)\b/i;
export const surroundCameraPattern=/\b(?:surround[ -]?view|360(?:\s*(?:[ -]?degrees?|°))?(?:[ -]+surround)?(?:[ -]+view)?|around[ -]view|bird'?s?[ -]?eye(?:[ -]+view)?)[ -]+(?:camera|monitor)(?:s|ing)?\b/i;
export function cameraSearchTerms(q){
 return q.replace(/\b(?:surround[ -]?(?:view)?|around[ -]view|bird'?s?[ -]?eye(?:[ -]+view)?|overhead|360(?:\s*(?:[ -]?degrees?|°))?(?:[ -]+surround)?(?:[ -]+view)?)[ -]*(?:(?:cameras?|cams?|monitor)(?:[ -]+system)?\b|view\b)|\b(?:surround[ -]view|bird'?s?[ -]?eye[ -]view)\b/g,' featuretokensurroundcamera ');
}
export const tireDefinitions=Array.from({length:16},(_,i)=>[30+i]).map(([n])=>['tireDiameter'+n,n+'-inch tires (factory size)',/$a/]);
export const tireAliases=tireDefinitions.map(([id])=>[id,new RegExp('\\bfeaturetoken'+id.toLowerCase()+'\\b','g')]);
export function tireSearchTerms(q){
 q=q.replace(/′′/g,'"');
 q=q.replace(/\bthirty[ -](three|five|seven)\b/g,(_,n)=>({three:33,five:35,seven:37}[n]));
 // Protect tire diameter before engine/displacement parsing. Bare numbers need
 // a tire noun; inch notation and familiar 33s/35s shorthand are self-contained.
 return q.replace(/\b(3\d|4[0-5])(?:\s*-?\s*(?:inches|inch|in\b)|\s*["“”″]|'?s\b)(?:\s+(?:(?:all[ -]terrain|mud[ -]terrain|off[ -]road)\s+)?(?:tires?|tyres?))?|\b(3\d|4[0-5])\s+(?:tires?|tyres?)\b|\b(?:tires?|tyres?)\s+(?:size\s+)?(3\d|4[0-5])(?:\s*-?\s*(?:inches|inch|in\b)|\s*["“”″])?/g,(match,a,b,c,offset)=>{
  // A requested wheel diameter must never be converted into a tire diameter.
  const before=q.slice(Math.max(0,offset-25),offset),after=q.slice(offset+match.length);
  if(/^\s*(?:wheels?|rims?)\b/.test(after)||/\b(?:wheels?|rims?)(?:\s+size)?\s*$/.test(before))return match;
  return ' featuretokentirediameter'+(a||b||c)+' ';
 });
}
// Reviewed dimension aliases, not equipment inferred from a trim/package name.
// 285/70R17 is the 33-inch size: BFGoodrich's published size/diameter table.
// 315/70R17 is explicitly printed as 35-inch on the original Jeep stickers
// reviewed for this release; the reference VINs are retained in the release notes.
const metricClasses={'285/70R17':33,'315/70R17':35};
function tireLine(line){
 if(!/\b(?:tires?|tyres?)\b/i.test(line)||/\b(?:spare|carrier|cover|pressure|fill|repair|sealant|kit|chains?)\b/i.test(line))return null;
 const metric=line.match(/\b(?:LT|P)?(\d{3})\s*\/\s*(\d{2})\s*(?:Z?R)\s*(\d{2})(?:[A-Z])?\b/i);
 const explicit=line.match(/\b(3\d|4[0-5])(?:[ -]*(?:inch|inches)\b|\s*")/i)||line.match(/\b(3\d|4[0-5])(?:\.0)?\s*[x×]\s*\d{1,2}(?:\.\d+)?\s*R\s*\d{2}\b/i);
 if(!metric&&!explicit)return null;
 const key=metric?metric[1]+'/'+metric[2]+'R'+metric[3]:null;
 const size=explicit?Number(explicit[1]):metricClasses[key]||null;
 if(explicit&&metricClasses[key]&&size!==metricClasses[key])return {line,size:null};
 return {line,size,metric:key,mapped:!explicit&&!!size};
}
export function cameraTireFeatures(input){
 const lines=(input||[]).map(norm),features={};
 const camera=lines.filter(l=>surroundCameraPattern.test(l)&&!conditional.test(l)&&!/^optional equipment/i.test(l)&&!(/\btrailer\b/i.test(l)));
 if(camera.length){const negative=camera.filter(l=>excluded.test(l));features.surroundCamera={value:!negative.length,evidence:(negative.length?negative:camera).slice(0,2),method:'sticker-camera'};}
 const optionIndex=lines.findIndex(l=>/^optional equipment/i.test(l));
 const candidates=lines.map((l,index)=>({...tireLine(l),index})).filter(x=>x.line&&!conditional.test(x.line));
 const optional=optionIndex<0?[]:candidates.filter(x=>x.index>optionIndex);
 // Installed optional tire specifications replace the standard tire size.
 const selected=optional.length?optional:candidates;
 if(!selected.length||selected.some(x=>!x.size||excluded.test(x.line)))return features;
 const sizes=new Set(selected.map(x=>x.size));if(sizes.size!==1)return features;
 const evidence=[...new Set(selected.map(x=>x.line))];
 if(selected.some(x=>x.mapped))evidence.push('Metric tire size matched to its nominal inch-size class; this is the factory specification.');
 for(const [id] of tireDefinitions)features[id]={value:sizes.has(Number(id.slice(12))),evidence,method:'sticker-tire-size'};
 return features;
}
export function repairCameraTireEvidence(sticker){
 if(sticker?.status!=='verified')return sticker;
 const features={...sticker.features};
 if(!features.surroundCamera?.method?.startsWith('factory-'))delete features.surroundCamera;
 for(const [id] of tireDefinitions)delete features[id];
 // Preserve independently reviewed factory camera rules if no printed wording
 // exists; explicit printed deletion takes priority over a cached presence.
 Object.assign(features,cameraTireFeatures(sticker.lines));
 return {...sticker,features};
}
