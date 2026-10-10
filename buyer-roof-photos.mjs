import {sourcedGuideFact} from './buyer-option-groups.mjs';
const source='https://media.stellantisnorthamerica.com/view-spec.do?id=27222';
const text='Body-color three-piece hardtop with rear wiper/washer, rear defroster, full-framed doors and Freedom Panel storage bag';
// Display-only OEM roof illustration, inspected 2026-10-10. Never VIN proof.
export function buyerRoofPhoto(lineup,choice,{trimId=''}={}){
 if(lineup?.id!=='wrangler'||lineup.year!==2026||choice?.id!=='f1dhm9e4'||choice.model!==lineup.id||choice.year!==2026||choice.kind!=='factory')return null;
 const canonical=lineup.choices?.get(choice.id);
 if(!canonical||!Object.values(canonical.facts||{}).some(f=>f.factory&&f.sourceUrl===source&&f.parent==='Tops'&&f.text===text))return null;
 if(trimId){const fact=sourcedGuideFact(lineup,choice.id,trimId);if(!fact||!['standard','optional'].includes(fact.status))return null;}
 return {image:'/wrangler-2026-bodycolor-hardtop-oem.jpg',photoKind:'oem',
  title:'Body-color three-piece hardtop',label:'Jeep illustration showing the matching red body-color three-piece hardtop on a four-door Wrangler.',
  caption:'Jeep OEM illustration: body-color three-piece hardtop on a four-door Rubicon. Vehicle color and trim may vary.',
  sourceUrl:'https://www.jeep.com/wrangler/design.html',
  imageSource:'https://www.jeep.com/content/dam/fca-brands/na/jeep/en_us/2026/wrangler/design/desktop/my26-jeep-wrangler-design-tab-container-tops-bodycolor-hardtop-desktop.jpg'};
}
