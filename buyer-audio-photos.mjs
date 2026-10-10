// OEM feature illustrations only: no image here is evidence of VIN equipment.
// Images were linked by Ram's 2026 Canadian pages and visually inspected on
// 2026-10-10. Original JPEGs have no dealer/promotional overlays; no pixels edited.
const factorySource='https://www.stellantisfleet.com/content/dam/fca-fleet/na/fleet/en_us/shopping-tools/brochures-literature/docs/buyers-guide/2026/26DOMMOP_FBG_Ram1500.pdf';
const audioPhotos={
 f1uh0zqe:{
  factText:'Klipsch® 23-speaker premiere audio system (RGE)',
  image:'/ram1500-2026-klipsch-oem.jpg',
  imageSource:'https://medias.fcacanada.ca//specs/ramtruck/1500dt/year-2026/media/images/feature/2026-ram-1500DT-design-feature-1_dc1f6a21f46fc3f8d7a807394e1cec32-1200x800.jpg',
  sourceUrl:'https://www.ramtruck.ca/en/1500/features-design',
  title:'Klipsch 23-speaker audio',
  label:'Klipsch Reference Premiere dashboard speaker in a 2026 Ram 1500 Tungsten.',
  caption:'Ram OEM photo: Canadian-market 2026 Ram 1500 Tungsten. Dashboard speaker shown; cabin colors may vary.',
  offeredTrimIds:['tungsten']
 },
 f19v1dzs:{
  factText:'Harman Kardon® 19-speaker audio system (included with P2 and X2 Groups) (RCA)',
  image:'/ram1500-2026-harman-kardon-oem.jpg',
  imageSource:'https://medias.fcacanada.ca//specs/ramtruck/1500dt/year-2026/media/images/gallery/2026-ram-1500DT-gallery-4_bd270aac47c3a190a9f70d094597af5a-1920x1280.jpg',
  sourceUrl:'https://www.ramtruck.ca/en/1500/gallery-page',
  title:'Harman Kardon 19-speaker audio',
  label:'Harman Kardon door speaker in Ram’s 2026 Ram 1500 Limited and Limited Longhorn audio gallery.',
  caption:'Ram OEM photo: Canadian-market 2026 Ram 1500 Harman Kardon door speaker. Example image; cabin trim and colors may vary.',
  offeredTrimIds:['laramie','rebel','limited','limited-longhorn']
 }
};
/**
 * Return display metadata for an exact sourced 2026 Ram 1500 factory choice.
 * Keep this result separate from the choice and VIN evidence. When a trim is
 * selected, that trim must explicitly offer this same audio system in the US
 * factory chart; an absent trim cell never grants availability.
 */
export function buyerAudioPhoto(lineup,choice,{trimId=''}={}){
 if(lineup?.id!=='ram-1500'||lineup.year!==2026||choice?.model!==lineup.id||choice.year!==lineup.year||choice.kind!=='factory'||choice.feature!=='factoryChoice'||choice.value!==choice.id)return null;
 const photo=audioPhotos[choice.id],canonical=lineup.choices?.get(choice.id);
 if(!photo||!canonical||canonical.model!==lineup.id||canonical.year!==lineup.year||canonical.kind!=='factory'||canonical.feature!=='factoryChoice'||canonical.value!==choice.id)return null;
 const offered=([id,fact])=>photo.offeredTrimIds.includes(id)&&fact?.sourceUrl===factorySource&&fact.parent==='Sound System'&&fact.text===photo.factText&&['standard','optional'].includes(fact.status);
 if(trimId?!offered([trimId,canonical.facts?.[trimId]]):!Object.entries(canonical.facts||{}).some(offered))return null;
 const {factText,offeredTrimIds,...display}=photo;
 return {...display,photoKind:'oem',equipmentSourceUrl:factorySource};
}
