// Audited 2026 Wrangler factory-row / sticker-description pairs. This does not
// equate a diameter, generic finish, or unspecified aluminum wheel to a design.
const chart='https://media.stellantisnorthamerica.com/view-spec.do?id=27222';
const rows={
 fxewvuk:{text:'17-in. full face steel painted Low Gloss Black',sticker:/^17-Inch x 7\.5-Inch Black Steel Styled Wheels$/i,image:'17-inch-black-steel-styled-wheels'},
 fzd4we4:{text:'17-in. aluminum painted Baltic Gray',sticker:/^17-Inch x 7\.5-Inch Gray Wheels$/i,image:'17-inch-mineral-gray-wheels',note:'Jeep’s design gallery calls the standard Sport S wheel Mineral Gray; its equipment chart calls it Baltic Gray.'},
 f1becs80:{text:'17-in. aluminum Rubicon machined with black pockets',sticker:/^17-Inch x 7\.5-Inch Machined\/Painted Black Wheels$/i,image:'17-inch-machined-painted-black-wheels'},
 f1yfjb1t:{text:'18-in. aluminum machined Baltic Gray',sticker:/^18-Inch x 7\.5-Inch Machined\/Painted Gray Wheels$/i,image:'18-inch-machined-painted-baltic-gray-wheels',baseOnly:true},
 f8ywabd:{key:'wheels',sticker:/^17-Inch x 7\.5-Inch Painted Black Wheels$/i,image:'17-inch-painted-black-wheels'}
};
const valid=(lineup,choice)=>{
 const row=rows[choice?.id];if(!row||lineup?.id!=='wrangler'||lineup.year!==2026||choice?.model!=='wrangler'||choice.year!==2026)return null;
 return Object.values(choice.facts||{}).some(f=>row.text?f.factory&&f.parent==='Wheels'&&f.text===row.text&&f.sourceUrl===chart:f.key===row.key&&/17.*black/i.test(f.value||'')&&f.sourceUrl)?row:null;
};
export function wranglerWheelEvidence(lineup,choice,fact,record,resolved){
 const row=valid(lineup,choice),wheel=resolved?.features?.wheelSize;
 if(!row||!fact||!['standard','optional'].includes(fact.status)||!wheel?.evidence?.length)return null;
 const clean=s=>String(s).normalize('NFKC').replace(/[\u2010-\u2015]/g,'-').replace(/\s+\$[\d,.]+\s*$/,'').trim();
 const lines=wheel.evidence.map(clean);
 if(lines.length!==1||!row.sticker.test(lines[0]))return null;
 if(row.baseOnly){const start=record.lines.findIndex(l=>/^OPTIONAL EQUIPMENT/i.test(l));if(start>=0&&record.lines.slice(start+1).some(l=>row.sticker.test(clean(l))))return null;}
 return {has:true,evidence:wheel.evidence,method:'reviewed-wheel-configuration'};
}
export function buyerWheelPhoto(lineup,choice){
 const row=valid(lineup,choice);if(!row)return null;
 return {image:'/wrangler-wheel-'+row.image+'-oem.jpg',title:choice.fullLabel||choice.label,photoKind:'oem',
  sourceUrl:'https://www.jeep.com/wrangler/design.html',
  caption:'Jeep manufacturer image of the '+row.image.replaceAll('-',' ')+'. '+(row.note||'Wheel design shown; tires and body color may vary.'),
  crop:{x:426,y:415,width:260,height:290,sourceWidth:1400,sourceHeight:1000}};
}
