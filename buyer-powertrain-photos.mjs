const sourceUrl='https://www.jeep.com/wrangler/capability.html';
const manual='https://vehicleinfo.mopar.com/assets/publications/en-us-ca/2026/Jeep/Wrangler/102316_26_JL_OM_EN_USC_DIGITAL_E1.pdf';
const engines={36:'pentastar',20:'turbo',64:'moab-392'};
export function buyerPowertrainPhoto(lineup,choice){
 if(lineup?.id!=='wrangler'||lineup.year!==2026||choice?.model!=='wrangler'||choice.year!==2026)return null;
 const legacy={f1fd7xjl:'36',fbixrjd:'20',f1j10ide:'64',f1aoc2mo:'36',f199h3de:'64'};
 const canonical=lineup.choices?.get(choice.id);
 const engine=choice.id.match(/^fwranglerengine(36|20|64)$/)||legacy[choice.id]&&canonical?.fullLabel===choice.fullLabel&&[choice.id,legacy[choice.id]];
 if(engine&&(choice.guidePowertrain||legacy[choice.id]))return {
  image:'/wrangler-'+engines[engine[1]]+'-engine-oem.jpg',title:choice.label,photoKind:'oem',sourceUrl,
  caption:'Jeep manufacturer image: '+choice.label+' for the 2026 Wrangler.',
  crop:{x:720,y:0,width:610,height:595,sourceWidth:1440,sourceHeight:595}
 };
 const transmission=choice.id.match(/^fwranglertransmission(6|8)$/);
 if(transmission&&choice.guidePowertrain)return {
  image:'/wrangler-'+(transmission[1]==='6'?'manual':'automatic')+'-shifter-oem.jpeg',title:choice.label,photoKind:'oem',width:330,height:189,
  sourceUrl:manual+'#page='+(transmission[1]==='6'?177:174),
  caption:'2026 Wrangler owner’s manual: actual '+(transmission[1]==='6'?'six-speed manual gear lever and shift pattern':'eight-speed automatic selector')+'. Manufacturer reference image; interior finishes vary.'
 };
 return null;
}
