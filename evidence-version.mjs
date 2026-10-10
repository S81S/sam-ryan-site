// Cache keys include content, not object identity: callers may update records in place.
export const evidenceVersion=(vehicle,sticker)=>JSON.stringify([vehicle?.vin,vehicle?.year,vehicle?.title,sticker]);
const basis=(vehicle,sticker)=>JSON.stringify([vehicle?.vin,vehicle?.year,vehicle?.title,sticker?.vin,sticker?.status,sticker?.sha256,
 sticker?.equipmentSectionComplete,sticker?.engine,sticker?.identityLines,sticker?.lines]);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function freshEquipmentInput(vehicle,sticker){
 const features={...sticker.features},prior=sticker.equipmentDerivation;
 const unchanged=prior?.version===1&&prior.basis===basis(vehicle,sticker);
 // Undo only facts this resolver wrote. Preserve newly supplied replacements.
 for(const [id,change] of Object.entries(prior?.changes||{}))if(same(features[id]??null,change.result)){
  if(unchanged&&change.original)features[id]=change.original;else delete features[id];
 }
 // Older enriched records have no provenance. Recompute factory conclusions
 // instead of trusting them under a new VIN, document fingerprint or configuration.
 for(const [id,f] of Object.entries(features))if(/^factory-|^sticker-roof-replacement$/.test(f?.method||''))delete features[id];
 const {equipmentDerivation,...rest}=sticker;
 return {...rest,features};
}
export function stampEquipment(vehicle,input,result){
 if(!result||result.status!=='verified'||result.vin!==vehicle.vin)return result;
 const features={...result.features},changes={};
 for(const id of new Set([...Object.keys(input.features||{}),...Object.keys(features)])){
  if(same(input.features?.[id],features[id]))continue;
  if(features[id])features[id]={...features[id],sourceVin:result.vin,sourceSha256:result.sha256||null};
  changes[id]={original:input.features?.[id]||null,result:features[id]||null};
 }
 return {...result,features,equipmentDerivation:{version:1,basis:basis(vehicle,result),changes}};
}
