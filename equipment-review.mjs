export function equipmentReviewReason(sticker,vin){
 if(!sticker||sticker.status!=='verified')return {title:'Original sticker needed',detail:'No readable, VIN-matched original sticker is available in this comparison. Retry the lookup or upload the original PDF.',sourceUrl:sticker?.sourceUrl};
 if(sticker.vin!==vin)return {title:'Sticker VIN needs checking',detail:'The equipment record does not identify this selected VIN. Its equipment cannot be assigned to this vehicle.',sourceUrl:sticker.sourceUrl};
 return {title:'Not stated on sticker',detail:sticker.equipmentSectionComplete?'The readable original sticker does not establish this feature or specification. Check the factory trim/package reference or the vehicle before confirming it.':'No explicit evidence for this feature was read, and the equipment section has not been confirmed complete. Review the original PDF and its factory trim/package reference.',sourceUrl:sticker.sourceUrl};
}
