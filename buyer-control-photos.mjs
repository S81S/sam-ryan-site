// Exact controls from the US/Canada 2026 Wrangler owner's manual. These are
// manufacturer reference illustrations, never claimed to be inventory photos.
const manual='https://vehicleinfo.mopar.com/assets/publications/en-us-ca/2026/Jeep/Wrangler/102316_26_JL_OM_EN_USC_DIGITAL_E1.pdf';
const images={
 remoteStart:{file:'remote-start',page:17,title:'Remote-start key fob',width:330,height:260},
 powerOutlet:{file:'power-outlet',page:121,title:'115-volt console outlet',width:330,height:189},
 auxSwitches:{file:'aux-switches',page:121,title:'Four auxiliary switches',width:330,height:189},
 swayDisconnect:{file:'sway-control',page:184,title:'Electronic sway-bar disconnect switch',width:330,height:189},
 offroadMode:{file:'offroad-plus-control',page:185,title:'Off Road+ switch',width:330,height:189}
};
const factoryIds={};
export function buyerControlPhoto(lineup,choice){
 if(lineup?.id!=='wrangler'||lineup.year!==2026||choice?.model!=='wrangler'||choice.year!==2026)return null;
 let feature=choice.kind!=='factory'&&choice.value===true?choice.feature:factoryIds[choice.id];
 if(choice.kind==='factory'&&!feature){
  const texts=Object.values(choice.facts||{}).filter(f=>f.sourceUrl).map(f=>f.text||f.value||'');
  if(texts.some(t=>/^Remote start(?: system)?$/i.test(t)))feature='remoteStart';
  if(texts.some(t=>/^Auxiliary switches$/i.test(t)))feature='auxSwitches';
  if(texts.some(t=>/^Off-Road Plus mode$/i.test(t)))feature='offroadMode';
  if(texts.some(t=>/^Sway bar disconnect - electronically controlled, front$/i.test(t)))feature='swayDisconnect';
  if(texts.some(t=>/^Auxiliary power, 115-volt outlet in center console$/i.test(t)))feature='powerOutlet';
 }
 const image=images[feature];if(!image)return null;
 return {image:'/wrangler-'+image.file+'-reference.jpeg',title:image.title,width:image.width,height:image.height,
  photoKind:'oem',sourceUrl:manual+'#page='+image.page,
  caption:'2026 Wrangler manufacturer reference illustration: '+image.title+'. Other controls shown do not establish included equipment.'};
}
