// Model identity comes from the selected vehicle, never its equipment/package text.
const models=[
 [/\b(?:ram\s+)?(?:1500|2500|3500)\s+promaster\b|\bpromaster\b/i,'Ram ProMaster'],
 [/\bram\s+(1500|2500|3500|4500|5500)\b/i,m=>'Ram '+m[1]],
 [/\bgrand cherokee\b/i,'Jeep Grand Cherokee'],[/\bcherokee\b/i,'Jeep Cherokee'],
 [/\bgrand wagoneer\b/i,'Jeep Grand Wagoneer'],[/\bwagoneer\b/i,'Jeep Wagoneer'],
 [/\bwrangler\b/i,'Jeep Wrangler'],[/\b(gladiator|compass|renegade|recon)\b/i,m=>'Jeep '+m[1]],
 [/\b(durango|charger|challenger|hornet)\b/i,m=>'Dodge '+m[1]],
 [/\b(pacifica|voyager)\b|\bchrysler\s+(300)\b/i,m=>'Chrysler '+(m[1]||m[2])]
];
const clean=s=>String(s||'').normalize('NFKC').replace(/[\u2010-\u2015]/g,'-').replace(/\s+/g,' ').trim();
function modelFrom(text){
 for(const [pattern,label] of models){const match=text.match(pattern);if(!match)continue;
  let model=typeof label==='function'?label(match):label;
  if(/cherokee|wrangler/i.test(model)&&/\b4xe\b/i.test(text))model+=' 4xe';
  else if(/cherokee|wagoneer/i.test(model)&&new RegExp(model.replace(/^Jeep /,'')+' L\\b','i').test(text))model+=' L';
  else if(/wrangler/i.test(model)){const doors=text.match(/\b([24])[ -]door\b/i);if(doors)model+=' '+doors[1]+'-Door';else if(/\bunlimited\b/i.test(text))model+=' 4-Door';}
  if(/wagoneer$/i.test(model)&&/\bwagoneer s\b/i.test(text))model+=' S';
  if(/promaster/i.test(model)&&/\bcity\b/i.test(text))model+=' City';
  if(/promaster/i.test(model)&&/\bev\b/i.test(text))model+=' EV';
  return model;
 }
 return null;
}
export function vehicleFeatureModelScope(vehicle,sticker){
 const identity=sticker?.status==='verified'&&sticker.vin===vehicle?.vin?clean((sticker.identityLines||[]).join(' ')):'';
 return modelFrom(identity)||modelFrom(clean(vehicle?.title))||'';
}
export function matchesFeatureModelScope(vehicle,sticker,scope){
 const model=vehicleFeatureModelScope(vehicle,sticker).toLowerCase();
 return Boolean(model)&&String(scope).split('|').some(s=>s.toLowerCase()===model);
}
export function vehicleFeatureModelTerms(vehicle,sticker,existingTerms=[]){
 const title=clean(vehicle?.title),model=vehicleFeatureModelScope(vehicle,sticker)||[vehicle?.decodedSpecs?.make,vehicle?.decodedSpecs?.model].filter(Boolean).join(' ');
 // A title fallback keeps outside makes scoped even when no structured model is available.
 const scope=model||title.replace(/^(?:new|used|certified)\s+/i,'').replace(/^20\d\d\s+/,'');
 if(!scope)return existingTerms;
 const existingModel=modelFrom(existingTerms.join(' '));
 // Retain an explicit year, and same-model trim terms, without carrying another
 // comparison vehicle's model into the clicked vehicle's feature search.
 const keep=existingModel&&existingModel.toLowerCase()===model?.toLowerCase()?existingTerms:existingTerms.filter(t=>/^20\d\d$/.test(t));
 return [...new Set([...keep,...scope.split(' ')].map(t=>t.toLowerCase()))];
}

export function trimFeatureModelTerms(model){
 return [model.name.split(' / ')[0].replace(/\s*\([^)]*\)/g,'').replace(/\b[23]-Row\b/gi,'').trim()];
}
export function trimFeatureModelScope(model){return model.name.split(' / ').map(modelFrom).filter(Boolean).join('|');}
