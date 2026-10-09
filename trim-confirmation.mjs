// Reviewed factory rows that answer specific gaps in the vehicle comparison.
// This is deliberately an explicit mapping: a search synonym is not sufficient to
// turn an entire factory chart (with package/variant footnotes) into installed facts.
import {factoryFacts} from './factory-facts.mjs';
import {guideFeatureFacts} from './trim-link.mjs';
import {stickerAudits} from './factory-sticker-audits.mjs';

const reviewedModels=new Set(['ram-1500','ram-3500','chrysler-pacifica']);
const rows={
 'ram-3500':[
  ['towHooks','f:mechanical-features|tow-hooks|black-xea'],
  ['ledLights','f:exterior-features|headlamps-taillamps|led-reflector-headlamps-lm3'],
  ['fogLights','f:exterior-features|fog-lamps|led-with-cornering-feature-lnv'],
  ['keylessEntry','f:interior-features|door-locks|remote-keyless-entry-gxm'],
  ['wireless','f:uconnect-multimedia|connectivity-radio|dual-wireless-charging-pads-requires-bucket-seats-i'],
  ['garageOpener','f:interior-features||universal-garage-door-opener-in-visor-included-with-h2-h2-plus-x1-and-x']
 ],
 'ram-1500':[
  ['tintedWindows','f:exterior-features|glass|tinted-windows-gac'],
  ['passiveEntry','f:interior-features|keyless-enter-n-gotm|passive-included-with-x2-group-gxd'],
  ['slidingWindow','f:interior-features|window-control|rear-backlight-power-sliding-included-with-black-express-'],
  ['outlet','f:uconnect-multimedia|power|front-seat-115-volt-outlet-three-prong-battery-fed-included-with']
 ],
 'chrysler-pacifica':[
  ['tintedWindows','f:exterior-features|glass|sunscreen-gae'],
  ['autoHighBeam','f:exterior-features|headlamps|auto-high-beam-headlamp-control-lms'],
  ['lumbar','f:seating-and-trim|seats|driver-s-four-way-power-lumbar-adjust-included-with-power-driver-s-']
 ]
};
// A reviewed NA cell is used only where the entire feature (rather than one
// version of it) is unavailable. For example, unavailable reflector headlamps
// would not establish the absence of a different type of LED headlamp.
const reviewedAbsences=new Set(['ram-3500/tradesman/wireless','ram-3500/tradesman/garageOpener']);
const deleted=s=>(s?.lines||[]).some(l=>/\bdelete(?:d)?|deletion|without|not equipped|not included/i.test(l));
const complete=s=>s?.equipmentSectionComplete===true&&!!s.sha256&&stickerAudits[s.vin]?.sha256===s.sha256&&stickerAudits[s.vin]?.optionSectionVerifiedComplete===true;
const pacificaRetail='https://cdn.dealereprocess.org/cdn/brochures/chrysler/2026-pacifica.pdf#page=4';

export function comparisonFactoryChart(match,vehicle,sticker,index){
 if(!match||match.model.year!==2026||!reviewedModels.has(match.model.id))return null;
 if(sticker?.status==='verified'&&sticker.vin!==vehicle.vin)return null;
 const identity=(sticker?.identityLines||[]).join(' ')||vehicle.title||'';
 const found=Object.values(index?.models||{}).filter(m=>m.model===match.model.id&&m.trims.includes(match.trim.id)&&(!m.stock?.only||new RegExp(m.stock.only,'i').test(identity))&&(!m.stock?.not||!new RegExp(m.stock.not,'i').test(identity)));
 return found.length===1?found[0]:null;
}

export function reviewedComparisonGuide(match,vehicle,sticker,entry){
 if(!match)return null;
 const guide={name:match.trim.name,facts:guideFeatureFacts(match.trim,sticker?.features||{}),resolvedFacts:new Map()};
 // The original fleet Group II description includes FamCAM for Select, while
 // the retail brochure and the standalone fleet row do not agree. Neither an
 // omission nor that conflicting package prose can settle the actual vehicle.
 if(match.model.id==='chrysler-pacifica'&&match.model.year===2026&&match.trim.id==='select'&&guide.facts.has('familyCamera')){
  const f=guide.facts.get('familyCamera');
  guide.facts.set('familyCamera',{...f,status:'verify',note:'The 2026 fleet package description and retail brochure disagree about FamCAM in Select’s Theater Family Group II. An exact vehicle or package record is needed to resolve that conflict.',sourceUrl:'https://cdn.dealereprocess.org/cdn/brochures/chrysler/2026-pacifica.pdf#page=4'});
 }
 if(!entry||match.model.year!==2026||!/^2026\b/.test(entry.source?.title||'')||entry.model!==match.model.id||!reviewedModels.has(entry.model)||!entry.trims.includes(match.trim.id)||match.basis!=='sticker'||sticker?.status!=='verified'||sticker.vin!==vehicle.vin||deleted(sticker))return guide;
 const chart=new Map(factoryFacts(entry,match.trim.id).map(f=>[f.key,f]));
 for(const [id,key] of rows[entry.model]||[]){
  const fact=chart.get(key);if(!fact)continue;
  if(fact.status==='unavailable'&&!reviewedAbsences.has(entry.model+'/'+match.trim.id+'/'+id))continue;
  guide.facts.set(id,fact);
 }
 const addSpecification=(id,key,value,condition=true)=>{
  const f=chart.get(key);if(!f||!condition||f.status!=='standard'||sticker.features?.[id])return;
  guide.resolvedFacts.set(id,{value:true,displayValue:value,comparisonValue:value.toLowerCase(),method:'factory-specification',sourceUrl:f.sourceUrl,evidence:[`${match.model.year} ${match.model.name} ${match.trim.name}: ${f.label}`]});
 };
 // Availability is a separate answer from installation. These reviewed package
 // paths retain their prerequisites instead of turning an optional chart row
 // into a yes/no answer for this VIN.
 const addAvailability=(id,key,note)=>{
  const f=chart.get(key);if(f?.status!=='optional')return;
  guide.facts.set(id,{...f,note:[f.note,note].filter(Boolean).join('. ')});
 };
 if(entry.model==='ram-1500'&&match.trim.id==='laramie'){
  const technology='Technology Group requires Laramie Level 2, Advanced Safety Group and UBQ or UBW radio';
  addAvailability('digitalMirror','f:interior-features|mirror-interior-rearview|auto-dimming-digital-display-included-with-tech',technology);
  addAvailability('hud','f:interior-features|clusters|head-up-display-included-with-technology-group-and-m1-group-lbk',technology);
  addAvailability('handsFreeDriving','f:safety-security|active-driving-assist-system-5-|hands-free-included-with-m1-group-requires','Requires Laramie Level 2; Level 2 alone does not include hands-free driving assistance');
  addAvailability('driverAlert','f:safety-security||drowsy-driver-detection-6-included-with-advanced-safety-group-and-m1-grou','Advanced Safety Group requires Laramie Level 2');
  addAvailability('trafficSigns','f:safety-security||traffic-sign-recognition-13-included-with-advanced-safety-group-and-m1-gr','Advanced Safety Group requires Laramie Level 2');
  addAvailability('bedPower','f:uconnect-multimedia|power|exterior-115-volt-outlet-three-prong-battery-fed-included-with-b','Available with Bed Utility Group; Laramie requires Level 1 or Level 2. This is separate from the standard cabin outlet');
 }
 if(entry.model==='chrysler-pacifica'){
  addSpecification('fuelTankCapacity','f:mechanical-features|fuel-tank|19-gallon-non-phev-only-nf1','19 gallons');
  addSpecification('instrumentScreen','f:interior-features|trip-computer|electronic-vehicle-information-center-evic-7-inch-configur','7 inches');
  if(match.trim.id==='select'){
   // The retail Select page explicitly identifies these Group II contents.
   // Unlike FamCAM, these items do not conflict with its fleet package description.
   for(const [id,label,value] of [
    ['powerPassenger','Power front-passenger seat','8-way power seat with 2-way lumbar adjustment'],
    ['passengerAdjustment','Front passenger seat adjustment','8-way power seat with 2-way lumbar adjustment'],
    ['alpine','Alpine audio','13 speakers with a 506-watt amplifier'],
    ['premiumAudio','Premium / amplified audio','Alpine 13 speakers with a 506-watt amplifier'],
    ['outlet','AC power outlet','115-volt auxiliary power outlet']
   ])guide.facts.set(id,{status:'optional',label,value:'Uconnect Theater Family Group II — '+value,note:'Available on Select with Uconnect Theater Family Group II; the package name must be confirmed for this vehicle.',sourceUrl:pacificaRetail});
   const optionIndex=sticker.lines.findIndex(l=>/^OPTIONAL EQUIPMENT\b/i.test(l)),options=optionIndex<0?[]:sticker.lines.slice(optionIndex+1);
   const knownPackages=/^(?:Customer Preferred Package 27L|100th Anniversary Buzz Model Package|S Appearance Package|Safety Sphere(?: Group)?)(?:\s+\$[\d,.]+)?$/i;
   const unknownPackage=options.some(l=>/\bpackage\b|\bgroup\b|\bedition\b/i.test(l)&&!knownPackages.test(l));
   // Only a complete original with the reviewed cosmetic/safety options can
   // establish the retained base system. An unreviewed or audio option blocks it.
   const audioUpgrade=['premiumAudio','alpine','harman','mcintosh','subwoofer'].some(id=>sticker.features?.[id]?.value===true);
   const baseAudio=complete(sticker)&&optionIndex>=0&&!unknownPackage&&!audioUpgrade&&!options.some(l=>/theater|speakers?|alpine|harman|amplifier|premium.*(?:sound|audio)|uconnect.*\bnav\b/i.test(l));
   addSpecification('audioSystem','f:uconnect-multimedia|sound-systems|six-speakers-includes-active-noise-cancellation-rcg','6 speakers',baseAudio);
  }
 }
 if(entry.model==='ram-1500')addSpecification('powerInverter','f:uconnect-multimedia|power|400-watt-inverter-included-with-jkv-bed-utility-group-and-h1-and','400 W inverter',complete(sticker)&&!sticker.lines.some(l=>/\b(?:2[ -]?kW|2,?000[ -]?watt)\b/i.test(l)));
 if(entry.model==='ram-3500'&&match.trim.id==='tradesman'&&/\bcrew cab\b/i.test(sticker.identityLines.join(' '))){
  const bedOutlet=chart.get('f:uconnect-multimedia|power|exterior-115-volt-400-watt-outlet-three-prong-located-in-driver-');
  const printedOutlet=sticker.lines.find(l=>/^Exterior 115[ -]?V(?:olt)? AC Outlet$/i.test(l.trim()));
  if(bedOutlet?.status==='optional'&&printedOutlet&&complete(sticker)&&!sticker.features?.bedPower){
   guide.resolvedFacts.set('bedPower',{value:true,displayValue:'115-volt bed outlet',comparisonValue:'115-volt bed outlet',method:'factory-specification',sourceUrl:bedOutlet.sourceUrl,evidence:[printedOutlet,'The factory XBE row locates this exterior outlet in the pickup box or RamBox.']});
  }
  const seatKey='f:interior-features|seats|heavy-duty-vinyl-40-20-40-split-bench-front-with-manual-adjust-and';
  const vinyl=/heavy[ -]duty vinyl.*40\s*\/\s*20\s*\/\s*40.*bench/i.test(sticker.features?.seatUpholstery?.displayValue||'');
  addSpecification('driverAdjustment',seatKey,'Manual adjustment',vinyl);
  addSpecification('passengerAdjustment',seatKey,'Manual adjustment',vinyl);
  const audio=chart.get('f:uconnect-multimedia|speaker-systems-audio|base-six-speaker-system-standard-on-crew-cab-inc');
  // This row is S/P because Regular Cab orders differ. Its own wording explicitly
  // establishes six speakers as standard on this VIN's Crew Cab configuration.
  if(audio&&/standard on Crew Cab/i.test(audio.text)&&complete(sticker)&&!sticker.features?.audioSystem&&!sticker.lines.some(l=>/speakers?|\b(?:alpine|harman|klipsch|premium sound)\b/i.test(l))){
   guide.resolvedFacts.set('audioSystem',{value:true,displayValue:'6 speakers',comparisonValue:'6 speakers',method:'factory-specification',sourceUrl:audio.sourceUrl,evidence:[audio.label,'Crew Cab confirmed by this vehicle’s original window sticker.']});
  }
 }
 return guide;
}
