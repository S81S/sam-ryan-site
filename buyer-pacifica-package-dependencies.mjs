// Exact 2026 gasoline Pacifica Limited AEZ package inclusion links.
// These explain a chosen configuration, never equipment installed on a VIN.
const SOURCE="https://www.stellantisfleet.com/content/dam/fca-fleet/na/fleet/en_us/shopping-tools/brochures-literature/docs/buyers-guide/2026/26DOMMOP_FBG_Pacifica.pdf";
const ROWS={
 "feszh61": {
  "key": "f:packages-equipment-groups|uconnect-theater-family-group|includes-rear-seat-entertainment-w",
  "parent": "Uconnect® Theater Family Group",
  "text": "Includes rear-seat entertainment with Amazon Fire TV®(18) Built-In, interior rear-facing FamCAMTM(41) camera, 115-volt auxiliary power outlet, video remote control, HDMI input, video USB port, two 10-inch seatback touchscreens, 220-amp alternator, Stow ’n Vac® integrated vacuum cleaner, heated second-row seats, Blu-rayTM/DVD player (Select), eight-passenger seating on FWD Select, Auto Advance ’n Return front-passenger seat, eight-way power front-passenger seat, hands-free power liftgate, hands-free power-sliding doors and 19-speaker Harman Kardon® premium audio system (AEZ)",
  "note": ""
 },
 "fan5lv9": {
  "key": "f:safety-security|famcamtm-41-|interior-rear-facing-camera-xpr",
  "parent": "FamCAMTM(41)",
  "text": "Interior rear-facing camera (XPR)",
  "note": "Part of a package"
 },
 "fneu0ag": {
  "key": "f:interior-features|power-outlets|auxiliary-115-volt-included-with-uconnect-theater-family-g",
  "parent": "Power Outlets",
  "text": "Auxiliary, 115-volt (included with Uconnect® Theater Family Group) (JKV)",
  "note": "included with Uconnect Theater Family Group"
 },
 "f12wqoyt": {
  "key": "f:interior-features||stow-n-vac-integrated-vacuum-cleaner-non-phev-only-cjw",
  "parent": "",
  "text": "Stow ’n Vac® Integrated Vacuum Cleaner (non-PHEV only) (CJW)",
  "note": "non-PHEV only · Part of a package"
 },
 "fftsay3": {
  "key": "f:exterior-features|doors|hands-free-power-sliding-doors-included-with-uconnect-theater-and-",
  "parent": "Doors",
  "text": "Hands-free power-sliding doors (included with Uconnect Theater and Sound Group) (XZ3)",
  "note": "included with Uconnect Theater and Sound Group"
 },
 "f194qpwp": {
  "key": "f:uconnect-multimedia|sound-systems|harman-kardon-19-speakers-with-10-inch-subwoofer-include",
  "parent": "Sound Systems",
  "text": "Harman Kardon 19 speakers with 10-inch subwoofer (includes 760-watt amplifier; non-PHEV only; included with Uconnect Theater Family Group) (RCA)",
  "note": "includes 760-watt amplifier; non-PHEV only; included with Uconnect Theater Family Group"
 },
 "f171wxhn": {
  "key": "f:seating-and-trim|seats|eight-way-power-front-passenger-included-with-uconnect-theater-fami",
  "parent": "Seats",
  "text": "Eight-way power front-passenger (included with Uconnect® Theater Family Group) (JWG)",
  "note": "included with Uconnect Theater Family Group"
 }
};
const CHILDREN=["fan5lv9","fneu0ag","f12wqoyt","fftsay3","f194qpwp","f171wxhn"];
function reviewed(choice){
 const expected=ROWS[choice?.id],fact=choice?.facts?.limited;
 return choice?.kind==='factory'&&fact?.factory===true&&fact.sourceUrl===SOURCE&&['standard','optional'].includes(fact.status)&&expected&&Object.entries(expected).every(([key,value])=>(fact[key]||'')===value);
}
export function sourcedPacificaPackageDependency({lineup,parent,child,trimId,excludedChoiceIds=[]}={}){
 if(lineup?.id!=='chrysler-pacifica'||lineup.year!==2026||trimId!=='limited'||parent?.id!=='feszh61'||!CHILDREN.includes(child?.id))return null;
 if(excludedChoiceIds.includes(parent.id)||excludedChoiceIds.includes(child.id)||!reviewed(parent)||!reviewed(child))return null;
 return {sourceUrl:SOURCE,parentChoiceId:parent.id,choiceId:child.id,trimId,conditionEvidence:[]};
}
