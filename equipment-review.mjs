export function equipmentReviewReason(sticker,vin,{guide,feature}={}){
 const availability=guide?.facts?.get(feature);
 if(sticker?.status==='verified'&&sticker.vin!==vin)return {title:'Sticker VIN needs checking',detail:'The equipment record does not identify this selected VIN. Its equipment cannot be assigned to this vehicle.',sourceUrl:sticker.sourceUrl};
 if(availability?.status==='optional')return {title:'Optional on '+guide.name,detail:[availability.value||availability.label,availability.note,'Available on this trim; installation on this vehicle requires its option or package record.'].filter(Boolean).join(' '),sourceUrl:availability.sourceUrl,sourceLabel:'Factory availability reference ↗'};
 if(availability?.status==='verify')return {title:'Factory sources disagree',detail:availability.note,sourceUrl:availability.sourceUrl,sourceLabel:'Factory availability reference ↗'};
 if(!sticker||sticker.status!=='verified')return {title:'Original sticker needed',detail:'No readable, VIN-matched original sticker is available in this comparison. Retry the lookup or upload the original PDF.',sourceUrl:sticker?.sourceUrl};
 return {title:'Needs confirmation',detail:sticker.equipmentSectionComplete?'The readable original sticker does not establish this feature or specification. Check the factory trim/package reference or the vehicle before confirming it.':'No explicit evidence for this feature was read, and the equipment section has not been confirmed complete. Review the original PDF and its factory trim/package reference.',sourceUrl:sticker.sourceUrl};
}
