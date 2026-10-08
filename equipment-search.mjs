import {installedOptionFact,optionEvidenceReason} from './option-inventory.mjs';
import {engineDefinitions,engineAliases,engineTerms,engineFact} from './engine-search.mjs';
import {dualRearWheelPattern,secondRowBenchPattern,wheelSeatFeatures} from './wheel-seat-evidence.mjs';
import {validSeatEvidence} from './seat-evidence.mjs';
import {towEquipmentPattern,brakeControllerPattern} from './tow-evidence.mjs';
import {applyFactoryEquipment} from './factory-equipment.mjs';
import {flatTowEvidence} from './flat-tow-rules.mjs';
import {interiorColors} from './interior-colors.mjs';
import {exteriorColors,exteriorPaintLines,exteriorColorFact,extractExteriorColors} from './exterior-colors.mjs';
import {translateSearchTerms} from './search-dictionary.mjs';
import {surroundCameraPattern,cameraSearchTerms,tireDefinitions,tireAliases,tireSearchTerms,cameraTireFeatures} from './camera-tire-evidence.mjs';
import {wheelFinishDefinitions,wheelFinishAliases,wheelFinishSearchTerms,wheelFinishFeatures} from './wheel-finish-evidence.mjs';
import {extractVehicleCategories,matchVehicleCategories,vehicleBodyTypes} from './vehicle-categories.mjs';
import {wording} from './sticker-rulings.mjs';
export const definitions = [
 ...wheelFinishDefinitions,
 ...engineDefinitions,
 ...tireDefinitions,
 ['engine20','2.0-liter engine',/\bengine:.*\b2\.0\s*(?:l\b|lit(?:er|re))/i],
 ['engine36','3.6-liter engine',/\bengine:.*\b3\.6\s*(?:l\b|lit(?:er|re))/i],
 ["dualRearWheels","Dual rear wheels / dually",dualRearWheelPattern],
 ["secondRowBench","Second-row bench seat",secondRowBenchPattern],
 ...exteriorColors.map(c=>[c.id,c.label,c.pattern]),
 ["flatTow","Flat-tow capability",/flat[ -]tow(?:able|ing)?|four[ -]wheels[ -]down tow/i],
 ["tintedWindows","Factory tinted / privacy windows",/deep[ -]tint(?:ed)?|privacy glass|tinted (?:windows|side glass|rear glass)/i],
 ...interiorColors.map(c=>[c.id,c.label,new RegExp(c.pattern,"i")]),
 ["familyCamera","Rear-seat passenger camera",/fam[ -]?cam|family camera|rear[ -]seat (?:monitoring )?camera|rear passenger (?:monitoring )?camera|interior rear[ -]facing camera/i],
 ["rearHeated","Heated rear seats",new RegExp("heated (?:second.row|rear) seats","i")],
 ["rearVented","Ventilated rear seats",new RegExp("ventilated (?:rear|second.row) seats","i")],
 ["memorySeats","Driver seat memory",wording.memorySeats],
 ["powerDriver","Power driver seat",new RegExp("power.*(?:driver.*seat|adjustable driver)","i")],
 ["powerPassenger","Power passenger seat",new RegExp("power.*(?:front )?passenger.*seat","i")],
 ["lumbar","Power lumbar adjustment",new RegExp("power lumbar","i")],
 ["massage","Massaging seats",new RegExp("massag","i")],
 ["cloth","Cloth seats",new RegExp("cloth.*(?:seat|bucket)|interior:.*cloth","i")],
 ["captains","Second-row captain chairs",wording.captains],
 ["dualClimate","Dual-zone climate control",wording.dualClimate],
 ["triClimate","Three-zone climate control",wording.triClimate],
 ["quadClimate","Four-zone climate control",wording.quadClimate],
 ["airConditioning","Cabin air conditioning",new RegExp("air conditioning|\\ba/c\\b","i")],
 ["rearAir","Rear air conditioning",new RegExp("rear.*air.condition|rear.*a/c","i")],
 ["parkingSensors","Parking sensors",new RegExp("parksense|park.assist","i")],
 ["laneAssist","Lane assistance",new RegExp("lane.management|lane.keep|lane.departure|lanesense","i")],
 ["forwardWarning","Forward collision warning",wording.forwardWarning],
 ["emergencyBrake","Automatic emergency braking",wording.emergencyBrake],
 ["pedestrianBrake","Pedestrian emergency braking",wording.pedestrianBrake],
 ["rearCross","Rear cross-path detection",new RegExp("cross.path|cross.traffic","i")],
 ["trafficSigns","Traffic sign recognition",new RegExp("traffic.sign recognition","i")],
 ["driverAlert","Drowsy driver detection",new RegExp("drowsy.driver|driver.attention","i")],
 ["rainWipers","Rain-sensing wipers",new RegExp("rain.sens","i")],
 ["autoHighBeam","Automatic high beams",wording.autoHighBeam],
 ["ledLights","LED headlights",new RegExp("led.*(?:headlamp|headlight|reflector)|(?:headlamp|headlight).*led","i")],
 ["fogLights","Fog lamps",new RegExp("fog.lamp|fog.light","i")],
 ["pushStart","Push-button start",wording.pushStart],
 ["passiveEntry","Passive entry",wording.passiveEntry],
 ["keylessEntry","Remote keyless entry",wording.keylessEntry],
 ["garageOpener","Garage-door opener",new RegExp("garage.door opener|homelink","i")],
 ["wifi","Wi-Fi hotspot",new RegExp("wi.fi.*hot.spot|wi.fi.*hotspot","i")],
 ["bluetooth","Hands-free phone / Bluetooth",new RegExp("bluetooth|handsfree phone|hands.free phone","i")],
 ["premiumAudio","Premium / amplified audio",wording.premiumAudio],
 ["alpine","Alpine audio",new RegExp("alpine","i")],
 ["harman","Harman Kardon audio",new RegExp("harman.kardon","i")],
 ["mcintosh","McIntosh audio",new RegExp("mcintosh","i")],
 ["subwoofer","Subwoofer",new RegExp("subwoofer","i")],
 ["satelliteRadio","Satellite radio",new RegExp("siriusxm|satellite.radio","i")],
 ["outlet","AC power outlet",wording.outlet],
 ["brakeController","Trailer brake controller",brakeControllerPattern],
 ["towMirrors","Trailer tow mirrors",wording.towMirrors],
 ["airSuspension","Air suspension",new RegExp("air.suspension","i")],
 ["rearLocker","Locking rear differential",wording.rearLocker],
 ["limitedSlip","Limited-slip rear differential",wording.limitedSlip],
 ["skidPlates","Skid plates",new RegExp("skid.plate","i")],
 ["towHooks","Tow hooks",wording.towHooks],
 // A winch, not a bumper that can take one.
 ["winch","Factory winch",/\bwinch\b(?![- ]capable|[- ]ready)/i],
 ["runningBoards","Running boards / side steps",new RegExp("running.board|side.step|tubular.side","i")],
 ["powerBoards","Power running boards",new RegExp("power.*running.board","i")],
 ["tonneau","Tonneau cover",new RegExp("tonneau","i")],
 ["rambox","RamBox storage",new RegExp("rambox","i")],
 ["slidingWindow","Power sliding rear window",new RegExp("rear.power.sliding window|power.sliding.rear.window","i")],
 ["foldMirrors","Power-folding mirrors",wording.foldMirrors],
 ["adjustPedals","Power adjustable pedals",new RegExp("power.adjustable pedals","i")],
 ["softTop","Soft top",new RegExp("soft.top","i")],
 ["hardTop","Hard top",new RegExp("hard.top","i")],
 ["skyRoof","Sky One-Touch roof",new RegExp("sky one.touch","i")],
 ["dieselCummins","Cummins engine",new RegExp("engine:.*cummins","i")],
 ["hurricane","Hurricane engine",new RegExp("engine:.*hurricane","i")],
 ["pentastar","Pentastar engine",new RegExp("engine:.*pentastar","i")],
 ["supercharged","Supercharged engine",new RegExp("engine:.*supercharg","i")],
 ["turbo","Turbocharged engine",new RegExp("engine:.*turbo","i")],
 ["v6","V6 engine",new RegExp("engine:.*\\bv6\\b","i")],
 ["manualTransmission","Manual transmission",new RegExp("transmission:.*manual","i")],
 ["automaticTransmission","Automatic transmission",new RegExp("transmission:.*automatic","i")],
 ['hemi','HEMI engine',/\bhemi\b/i], ['v8','V8 engine',/\bv\s*8\b/i],
 ['ventilated','Ventilated / cooled front seats',/ventilat\w* (?:front )?seats?|cooled (?:front )?seats?|air.conditioned (?:front )?seats?/i],
 ['sunroof','Sunroof / moonroof',/sun\s*roof|moon\s*roof/i],
 ['panoramic','Panoramic sunroof',/panoramic.*(?:sunroof|moonroof)|dual.pane.*sunroof/i],
 ['heatedSeats','Heated front seats',/heated front seats|front.*heated seats/i],
 ['heatedWheel','Heated steering wheel',/heated steering.wheel/i],
 // Jeep's window stickers print "McKinley-Trimmed Seats" for what Jeep's own releases call McKinley leather-trimmed seats.
 ['leather','Leather-trimmed seats',wording.leather],
 // Leatherette is its own material, not leather.
 ['leatherette','Leatherette seats',wording.leatherette],
 ['adaptiveCruise','Adaptive cruise control',/adaptive cruise/i],
 ['blindSpot','Blind-spot monitoring',/blind.spot/i],
 ['surroundCamera','Surround-view camera',surroundCameraPattern],
 ['backupCamera','Rear-view camera',/rear.back.up camera|rear.view camera|back.up camera/i],
 ['remoteStart','Remote start',/remote.start/i],
 ['thirdRow','Third-row seats',wording.thirdRow],
 ['tow','Trailer hitch / tow equipment',towEquipmentPattern],
 ['fourWheel','Four-wheel drive',/\b4x4\b|\b4wd\b|four.wheel.drive|4.wheel.drive/i],
 ['awd','All-wheel drive',/all.wheel.drive|\bawd\b/i],
 // Answered from the sticker's model line (4X2, RWD, FWD), never from a loose equipment line.
 ['twoWheel','Two-wheel drive (4x2)',/$a/],['rwd','Rear-wheel drive',/$a/],['fwd','Front-wheel drive',/$a/],
 ['carplay','Apple CarPlay',/apple carplay/i], ['androidAuto','Android Auto',/android auto/i],
 ['navigation','Navigation',/\bnav\b|navigation/i], ['diesel','Diesel engine',/diesel/i],
 ['electric','Electric powertrain',/electric.drive|electric.motor|battery.electric/i],
 ['hybrid','Hybrid powertrain',/hybrid|phev/i], ['bedliner','Spray-in bedliner',wording.bedliner],
 ['hud','Head-up display',/head.up display/i], ['wireless','Wireless charging',/wireless charg/i],
 ['powerLiftgate','Power liftgate',/power.liftgate|hands.free.*liftgate/i],
];
export const labels=Object.fromEntries(definitions.map(([id,label])=>[id,label]));
export const normalizeText=s=>String(s||'').normalize('NFKC').replace(/[\u2010-\u2015]/g,'-').replace(/[‘’]/g,"'").replace(/[®™]/g,'').replace(/\s+/g,' ').trim();
export function analyzeSticker(text,vin){
 if(!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)||!String(text).toUpperCase().replace(/[^A-Z0-9]/g,'').includes(vin))throw Error('Sticker VIN does not match vehicle');
 const raw=String(text).split(/\r?\n/).map(normalizeText).filter(Boolean);
 const start=raw.findIndex(l=>/^(?:engine:|standard equipment)/i.test(l));
 const end=raw.findIndex((l,i)=>i>start&&/^(?:warranty coverage|fuel economy|government .*star)/i.test(l));
 if(start<0)throw Error('Could not locate the equipment section');
 const lines=raw.slice(Math.max(0,start-5),end<0?raw.length:end).filter(l=>!/^\$|^total price|^base price|^destination charge|^manufacturer/i.test(l));
 const engine=lines.find(l=>/^engine:/i.test(l));
 const features={};
 for(const [id,,pattern] of definitions){
  const pool=id.startsWith('exterior')?exteriorPaintLines(raw):id.startsWith('interior')?raw.filter(l=>/^interior(?: color)?:/i.test(l)).map(l=>l.split(/exterior(?: color)?:/i)[0]):['hemi','v8','diesel','electric','hybrid'].includes(id)?(engine?[engine]:[]):lines;
  const evidence=pool.filter(l=>pattern.test(l)&&validSeatEvidence(id,l));
  const negative=evidence.filter(l=>/\b(?:delete|deleted|deletion|without|not equipped|not included|no sunroof|no moonroof|no soft[ -]?top|no hard[ -]?top)\b/i.test(l));
  const positive=evidence.filter(l=>!negative.includes(l)&&!/^optional equipment|if equipped|available separately/i.test(l)&&(!/N\/A.*manual transmission/i.test(l)||lines.some(x=>/^transmission:.*automatic/i.test(x))));
  // A factory deletion overrides a standard-equipment mention.
  if(negative.length)features[id]={value:false,evidence:negative.slice(0,2)};
  else if(positive.length)features[id]={value:true,evidence:positive.slice(0,2)};
  else if(id==='v8'&&engine&&/\b(?:i[346]|v[46]|[346].cylinder)\b/i.test(engine))features[id]={value:false,evidence:[engine]};
 }
 Object.assign(features,wheelSeatFeatures(lines));
 for(const [id]of wheelFinishDefinitions)delete features[id];Object.assign(features,wheelFinishFeatures(lines));
 delete features.surroundCamera;Object.assign(features,cameraTireFeatures(lines));
 for(const color of exteriorColors){delete features[color.id];const fact=exteriorColorFact(color.id,{status:'verified',lines:raw});if(fact)features[color.id]=fact;}
 const towing=flatTowEvidence(raw);if(towing)features.flatTow=towing;
 const equipmentSectionComplete=raw.some(l=>/^standard equipment/i.test(l))&&raw.some(l=>/^optional equipment/i.test(l))&&raw.some(l=>/^total price/i.test(l))&&lines.length>=20;
 const identityStart=Math.max(0,raw.findIndex(l=>/^20\d{2} MODEL YEAR/i.test(l)));
 return {identityLines:raw.slice(identityStart,identityStart+2),features,lines,engine:engine||null,equipmentSectionComplete};
}
const aliases=[
 ...wheelFinishAliases,
 ...engineAliases,
 ...tireAliases,
 ['surroundCamera',/\bfeaturetokensurroundcamera\b/g],
 ['engine20',/\b2\.0(?:\s*-?\s*(?:liters?|litres?|l))?\b(?:\s+engine)?/g],
 ['engine36',/\b3\.6(?:\s*-?\s*(?:liters?|litres?|l))?\b(?:\s+engine)?/g],
 ["dualRearWheels",/\bfeaturetokendualrearwheels\b/g],
 ["secondRowBench",/\bfeaturetokensecondrowbench\b/g],
 ["flatTow",/\b(?:flat[ -]tow(?:able|ing)?(?: capable)?|dinghy tow(?:ing)?|four[ -]down tow(?:ing)?|tow(?:able)? behind (?:an? )?(?:rv|motorhome|motor home))\b/g],
 ["tintedWindows",/\b(?:tinted windows|window tint|privacy glass|privacy windows|deep[ -]tint(?:ed)?(?: windows| glass)?)\b/g],
 ...interiorColors.map(c=>[c.id,new RegExp('\\b(?:'+c.terms.join('|')+')\\b'+(c.exact?'':'(?=\\s+(?:(?:nappa|premium|quilted|vegan)\\s+)?(?:leatherette|leather|cloth|featuretokencloth|interior|seats?|upholstery|cabin))'),'g')]),
 ["rearHeated",/\bfeaturetokenrearheated\b/g],
 ["rearVented",/\bfeaturetokenrearvented\b/g],
 ["memorySeats",/\bfeaturetokenmemoryseats\b/g],
 ["powerDriver",/\bfeaturetokenpowerdriver\b/g],
 ["powerPassenger",/\bfeaturetokenpowerpassenger\b/g],
 ["lumbar",/\bfeaturetokenlumbar\b/g],
 ["massage",/\bfeaturetokenmassage\b/g],
 ["cloth",/\bfeaturetokencloth\b/g],
 ["captains",/\bfeaturetokencaptains\b/g],
 ["dualClimate",/\bfeaturetokendualclimate\b/g],
 ["triClimate",/\bfeaturetokentriclimate\b/g],
 ["quadClimate",/\bfeaturetokenquadclimate\b/g],
 ["airConditioning",/\bfeaturetokenairconditioning\b/g],
 ["rearAir",/\bfeaturetokenrearair\b/g],
 ["parkingSensors",/\bfeaturetokenparkingsensors\b/g],
 ["laneAssist",/\bfeaturetokenlaneassist\b/g],
 ["forwardWarning",/\bfeaturetokenforwardwarning\b/g],
 ["pedestrianBrake",/\bfeaturetokenpedestrianbrake\b/g],
 ["emergencyBrake",/\bfeaturetokenemergencybrake\b/g],
 ["rearCross",/\bfeaturetokenrearcross\b/g],
 ["trafficSigns",/\bfeaturetokentrafficsigns\b/g],
 ["driverAlert",/\bfeaturetokendriveralert\b/g],
 ["rainWipers",/\bfeaturetokenrainwipers\b/g],
 ["autoHighBeam",/\bfeaturetokenautohighbeam\b/g],
 ["ledLights",/\bfeaturetokenledlights\b/g],
 ["fogLights",/\bfeaturetokenfoglights\b/g],
 ["pushStart",/\bfeaturetokenpushstart\b/g],
 ["passiveEntry",/\bfeaturetokenpassiveentry\b/g],
 ["keylessEntry",/\bfeaturetokenkeylessentry\b/g],
 ["garageOpener",/\bfeaturetokengarageopener\b/g],
 ["wifi",/\bfeaturetokenwifi\b/g],
 ["bluetooth",/\bfeaturetokenbluetooth\b/g],
 ["premiumAudio",/\bfeaturetokenpremiumaudio\b/g],
 ["alpine",/\bfeaturetokenalpine\b/g],
 ["harman",/\bfeaturetokenharman\b/g],
 ["mcintosh",/\bfeaturetokenmcintosh\b/g],
 ["subwoofer",/\bfeaturetokensubwoofer\b/g],
 ["satelliteRadio",/\bfeaturetokensatelliteradio\b/g],
 ["outlet",/\bfeaturetokenoutlet\b/g],
 ["brakeController",/\bfeaturetokenbrakecontroller\b/g],
 ["towMirrors",/\bfeaturetokentowmirrors\b/g],
 ["airSuspension",/\bfeaturetokenairsuspension\b/g],
 ["rearLocker",/\bfeaturetokenrearlocker\b/g],
 ["limitedSlip",/\bfeaturetokenlimitedslip\b/g],
 ["skidPlates",/\bfeaturetokenskidplates\b/g],
 ["towHooks",/\bfeaturetokentowhooks\b/g],
 ["winch",/\bwinch(?:es)?\b/g],
 ["runningBoards",/\bfeaturetokenrunningboards\b/g],
 ["powerBoards",/\bfeaturetokenpowerboards\b/g],
 ["tonneau",/\bfeaturetokentonneau\b/g],
 ["rambox",/\bfeaturetokenrambox\b/g],
 ["slidingWindow",/\bfeaturetokenslidingwindow\b/g],
 ["foldMirrors",/\bfeaturetokenfoldmirrors\b/g],
 ["adjustPedals",/\bfeaturetokenadjustpedals\b/g],
 ["softTop",/\bfeaturetokensofttop\b/g],
 ["hardTop",/\bfeaturetokenhardtop\b/g],
 ["familyCamera",/\bfeaturetokenfamilycamera\b/g],
 ["skyRoof",/\bfeaturetokenskyroof\b/g],
 ["dieselCummins",/\bfeaturetokendieselcummins\b/g],
 ["hurricane",/\bfeaturetokenhurricane\b/g],
 ["pentastar",/\bfeaturetokenpentastar\b/g],
 ["supercharged",/\bfeaturetokensupercharged\b/g],
 ["turbo",/\bfeaturetokenturbo\b/g],
 ["v6",/\bfeaturetokenv6\b/g],
 ["manualTransmission",/\bfeaturetokenmanualtransmission\b/g],
 ["automaticTransmission",/\bfeaturetokenautomatictransmission\b/g],
 ['panoramic',/\bpanoramic(?:\s+(?:sun\s*roof|moon\s*roof))?/g],
 ['sunroof',/\b(?:sun\s*roof|sunrrof|moon\s*roof)s?\b/g],
 ['ventilated',/\b(?:(?:air[ -]?condition(?:ed|ing)?|a\/?c|ac|cooled|cooling|ventilated|vented)(?:\s+front)?\s+seats?)\b/g],
 ['heatedSeats',/\bheated(?:\s+front)?\s+seats?\b/g],['heatedWheel',/\bheated steering wheel\b/g],
 ['hemi',/\bhemi\b/g],['v8',/\bv[ -]?8\b/g],['leatherette',/\b(?:leatherette|faux[ -]leather|vegan[ -]leather|synthetic[ -]leather|imitation[ -]leather|pleather)(?:\s+seats?)?\b/g],['leather',/\bleather(?:[ -]trimmed)?(?:\s+seats?)?\b/g],
 ['adaptiveCruise',/\badaptive cruise(?: control)?\b/g],['blindSpot',/\bblind[ -]spot(?: monitoring)?\b/g],
 ['surroundCamera',/\b(?:360(?:[ -]degree)?|surround[ -]view)\s*cameras?\b/g],
 ['backupCamera',/\b(?:back[ -]?up|rear[ -]view) camera\b/g],['remoteStart',/\bremote start\b/g],
 ['thirdRow',/\b(?:third|3rd|3)[ -]row(?:\s+seats?)?\b/g],['tow',/\b(?:tow(?:ing)? package|trailer hitch|tow hitch)\b/g],
 ['fourWheel',/\b(?:4x4|4wd|four wheel drive)\b/g],['awd',/\b(?:awd|all wheel drive)\b/g],
 ['rwd',/\b(?:rwd|rear[ -]wheel[ -]drive)\b/g],['fwd',/\b(?:fwd|front[ -]wheel[ -]drive)\b/g],['twoWheel',/\b(?:2wd|4x2|2x4|(?:two|2)[ -]wheel[ -]drive)\b/g],
 ['carplay',/\b(?:apple )?carplay\b/g],['androidAuto',/\bandroid auto\b/g],
 ['navigation',/\b(?:navigation|nav)\b/g],['diesel',/\bdiesel\b/g],['electric',/\belectric\b/g],['hybrid',/\bhybrid\b/g],
 ['bedliner',/\b(?:spray[ -]in )?bedliner\b/g],['hud',/\b(?:head[ -]up display|hud)\b/g],['wireless',/\bwireless charging\b/g],['powerLiftgate',/\bpower liftgate\b/g]
];
const numeric=s=>Number(s.replace(/[$, ]/g,''));
// Shoppers type "33 gallon tank" or "12 inch screen"; window stickers print "33-GALLON" and "12-INCH".
// Join a number to its unit the same way on both sides so the words line up; the exact size is still required.
const unitNames={gal:'gallon',gallons:'gallon',inches:'inch',speeds:'speed',volts:'volt',amps:'amp',speakers:'speaker',watts:'watt',passengers:'passenger'};
const joinUnits=s=>s.replace(/\b(\d+(?:\.\d+)?)[\s-]+(gallons?|gal|inch(?:es)?|speeds?|volts?|amps?|way|speakers?|watts?|passengers?)\b/g,(_,n,u)=>n+'-'+(unitNames[u]||u));
export function parseQuery(input){
 const original=String(input||'').trim();let q=normalizeText(original).toLowerCase();
 q=q.replace(/\b(?:whit|whtie)\b/g,'white').replace(/\bbalck\b/g,'black');
 q=q.replace(/\b(?:i am looking for|i'm looking for|looking for|shopping for|searching for)\b/g,' ');
 const categorySearch=extractVehicleCategories(q);q=categorySearch.text;
 const words={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,fifteen:15,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
 q=q.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\s+(bands?|racks?|grand|stacks?|thousand|k)\b/g,(_,n,u)=>words[n]+' '+u);
 q=q.replace(/\b(\d+(?:\.\d+)?)\s*(?:bands?|racks?|grand|stacks?|thousand)\b/g,(_,n)=>'$'+(Number(n)*1000));
 q=q.replace(/\b(\d[\d,]*(?:\.\d+)?)\s*(?:bucks|dollars)\b/g,(_,n)=>'$'+n);
 q=q.replace(/\b(\d+(?:\.\d+)?)\s*k\b(?!\s*(?:miles|mi)\b)/g,(_,n)=>'$'+(Number(n)*1000));
 q=q.replace(/\b(leatherette|leather|cloth|interior|seats|upholstery)\s+(?:in\s+)?(tan|beige|brown|black|gray|grey|white|cream|ivory|red|blue|green|purple|violet|lavender|lilac|plum|pink|fuchsia|orange|yellow)\b/g,'$2 $1');
 q=q.replace(/\bclack(?=\s+(?:leather|cloth|interior|seats?))/g,'black');
 q=q.replace(/\b(vented|ventilated|cooled|heated|massaging)\s+and\s+(?=(?:vented|ventilated|cooled|heated|massaging)\s+seats)/g,'$1 seats and ');
 q=translateSearchTerms(engineTerms(cameraSearchTerms(tireSearchTerms(wheelFinishSearchTerms(q)))));
 q=q.replace(/\bflat[ -]towed\b/g,'flat tow');
 const wantsTruck=/\b(?:trucks?|pick[ -]?ups?)\b/.test(q),wantsSuv=/\b(?:suvs?|sport utility vehicles?)\b/.test(q);
 q=q.replace(/\b(?:trucks?|pick[ -]?ups?|suvs?|sport utility vehicles?)\b/g,' ');
 const result={bodyType:wantsTruck&&wantsSuv?'truckOrSuv':wantsTruck?'truck':wantsSuv?'suv':categorySearch.bodyType,original,budget:null,mileage:null,condition:null,requirements:[],terms:[],warnings:[...categorySearch.warnings],ambiguity:null,categories:categorySearch.categories,categoryMode:categorySearch.categoryMode};
 if(/\b15000\b/.test(q)&&!/\$\s*15[,]?000|(?:under|budget|price|below|max)\s*15[,]?000|15[,]?000\s*(?:dollars|miles)/.test(q))result.ambiguity='Did you mean a Ram 1500, or a $15,000 budget? Please edit that part of your search.';
 q=q.replace(/\b(?:under|below|less than|up to|max(?:imum)?(?: of)?)?\s*(\d[\d,]*(?:\.\d+)?)\s*(k)?\s*(?:miles|mi)\b/g,(all,n,k)=>{result.mileage=numeric(n)*(k?1000:1);return ' ';});
 q=q.replace(/(?:\b(?:under|below|less than|up to|max(?:imum)?|budget(?: of)?|for|around|about|at|price(?:d)?(?: at)?|spend(?:ing)?)\s*)?\$\s*(\d[\d,]*(?:\.\d+)?)\s*(k)?\b|\b(?:under|below|less than|up to|max(?:imum)?|budget(?: of)?|for|around|about|at|price(?:d)?(?: at)?|spend(?:ing)?)\s+(\d[\d,]*(?:\.\d+)?)\s*(k)?\b/g,(all,a,ak,b,bk)=>{const amount=numeric(a||b)*((ak||bk)?1000:1);if(result.budget!==null&&result.budget!==amount)result.warnings.push('More than one price limit was entered; use one budget.');result.budget=amount;return ' ';});
 const eitherCondition=/\bnew\b/.test(q)&&/\b(?:used|pre[ -]owned)\b/.test(q);
 q=q.replace(/\b(new|used|pre[ -]owned)\b/g,(all,c)=>{result.condition=eitherCondition?null:c==='new'?'New':'Used';return ' ';});
 for(const [id,regex] of aliases){
  q=q.replace(regex,(match,offset)=>{
   const prefix=q.slice(Math.max(0,offset-35),offset);const suffix=q.slice(offset+match.length,offset+match.length+35);
   if(/(?:or\s+no\s+)$/.test(prefix)||/^\s+or\s+no\s+(?:sunroof|sunrrof|moonroof)/.test(suffix)){result.warnings.push('Choose either “with sunroof” or “no sunroof”, not both.');}
   const wanted=!/(?:\bno|\bwithout|\bnot|\bdon.t want|\bdo not want|\bdoesn.t have|\bdoes not have|\bmust not have)\s+(?:a\s+|any\s+)?$/.test(prefix);
   const previous=result.requirements.find(x=>x.id===id);
   if(previous&&previous.wanted!==wanted)result.warnings.push(`Conflicting request for ${labels[id]}.`);
   else if(!previous)result.requirements.push({id,wanted});
   return ' ';
  });
 }
 q=extractExteriorColors(q,result);
 q=q.replace(/\b(?:that|which)\s+(?:is|are)\b/g,' ');
 // Explicit model shorthand is safe; the five-digit 15000 ambiguity is never silently corrected.
 q=q.replace(/\b(?:i am looking for|i'm looking for|i want|i need|looking for|show me|find me|can you find|do you have|i would like|i'd like)\b/g,' ');
 const stop=new Set('color colour colored coloured paint exterior body under interior upholstery cabin a an the with without no not any and or but please seats seat car vehicle truck suv cars trucks suvs that has have me my of for want dont don\'t do does doesn\'t doesn’t must to at in either equipped comes come something need looking looking at least than less more only must should be would like can you it its that has have has got gimme get give us me a just preferably ideally about approx approximately around price priced budget cost costs spending spend tops all total out door'.split(' '));
 result.terms=joinUnits(q).split(/[^a-z0-9'-]+/).filter(w=>w&&!stop.has(w));
 if(result.requirements.some(x=>x.id==='flatTow'))result.warnings.push('Flat towing means pulling this vehicle behind an RV with all four wheels on the ground. Matches require a verified model-year and drivetrain rule; unreviewed configurations remain unconfirmed. Follow the linked factory procedure and confirm towing equipment, weight limits and vehicle condition; a trailer-tow package alone does not qualify.');
 if(result.requirements.some(x=>x.id==='ventilated'))result.warnings.push('“Air-conditioned seats” is treated as ventilated/cooled seats. The exact factory wording is shown.');
 if(result.requirements.some(x=>x.id.startsWith('tireDiameter')))result.warnings.push('Tire sizes refer to factory specifications on the window sticker. Confirm the currently fitted tires on a used vehicle.');
 if(result.requirements.some(x=>x.id.startsWith('wheel')))result.warnings.push('Wheel finishes are matched to the factory wheel specification. Chrome, polished and black finishes are checked separately. Confirm the currently fitted wheels on a used vehicle.');
 return result;
}
export function matchVehicle(vehicle,sticker,query){
 if(vehicle.locationId!=='18393')return {kind:'excluded',reason:'store'};
 sticker=applyFactoryEquipment(vehicle,sticker);
 if(query.condition&&vehicle.condition!==query.condition)return {kind:'excluded',reason:'condition'};
 if(query.budget!==null&&(vehicle.price===null||vehicle.price>query.budget))return {kind:'excluded',reason:'price'};
 if(query.mileage!==null&&(vehicle.miles===null||vehicle.miles>query.mileage))return {kind:'excluded',reason:'mileage'};
 const categoryMatch=matchVehicleCategories(vehicle,sticker,query);
 if(!categoryMatch.matches)return {kind:'excluded',reason:'vehicle category'};
 const title=joinUnits(normalizeText(vehicle.title+' '+vehicle.stock+' '+vehicle.vin).toLowerCase());
 if(query.bodyType){
  const {truck,suv}=vehicleBodyTypes(vehicle,sticker);
  if(!(query.bodyType==='truck'?truck:query.bodyType==='suv'?suv:truck||suv))return {kind:'excluded',reason:'body type'};
 }
 // Requested trim names must identify the vehicle, not appear inside unrelated package text.
 const identity=title+' '+(sticker?.status==='verified'?(sticker.identityLines||[]).join(' ').toLowerCase():'');
 // Multiword trims are phrases, never independent matches against wheel sizes or package descriptions.
 const specialTrim=['rubicon','mojave'].find(t=>query.terms.includes(t)&&query.terms.includes('x'));
 if(specialTrim){
  const phrase=new RegExp('\\b'+specialTrim+'[ -]+x\\b','i');
  const packageLine=new RegExp('^'+specialTrim+'[ -]+x\\s+(?:package|group)\\b','i');
  const verifiedLines=sticker?.status==='verified'?sticker.lines||[]:[];
  if(!phrase.test(identity)&&!verifiedLines.some(l=>packageLine.test(normalizeText(l))))return {kind:'excluded',reason:'trim'};
 }
 // Cherokee is a separate model; it must not silently include Grand Cherokee.
 if(query.terms.includes('cherokee')){
  const grand=/\bgrand cherokee\b/.test(identity);
  if(!/\bcherokee\b/.test(identity)||grand!==query.terms.includes('grand'))return {kind:'excluded',reason:'model'};
 }
 for(const trim of ['rho','trx','rebel','rubicon','mojave'])if(query.terms.includes(trim)&&!identity.split(/[^a-z0-9'-]+/).includes(trim))return {kind:'excluded',reason:'trim'};
 const titleWords=title.split(/[^a-z0-9'-]+/);
 // Remaining words must be found in the VIN-verified equipment text; listing descriptions are never searched.
 const lines=sticker?.status==='verified'?sticker.lines||[]:[];
 const text=joinUnits(normalizeText(lines.join(' ')).toLowerCase());
 // A named edition is one thing, not two loose words: "Night Edition" must not match an 85th Anniversary Edition
 // that happens to have a day/night mirror. The word before "edition" has to name this vehicle (its title), or sit
 // on the same sticker line as "edition".
 const named=new Set();
 for(let i=1;i<query.terms.length;i++){
  if(query.terms[i]!=='edition')continue;
  const name=query.terms[i-1];
  if(!titleWords.includes(name)&&!lines.some(l=>{const words=joinUnits(normalizeText(l).toLowerCase()).split(/[^a-z0-9'-]+/);return words.includes(name)&&words.includes('edition');}))return {kind:'excluded',reason:'terms'};
  named.add(i).add(i-1);
 }
 const unmatched=query.terms.filter((t,i)=>!named.has(i)&&!titleWords.includes(t));
 // Read displacement from the original engine line even for previously scanned stickers.
 if(sticker?.status==='verified'){
  const engineLines=[sticker.engine,...lines.filter(l=>/^engine:/i.test(l))].filter(Boolean);
  if(engineLines.length){
   const features={...sticker.features};
   for(const [id,,pattern] of definitions.filter(d=>/^engine(?:20|36)$/.test(d[0])))features[id]={value:engineLines.some(l=>pattern.test(normalizeText(l))),evidence:engineLines};
   sticker={...sticker,features};
  }
 }
 if(unmatched.length&&!unmatched.every(t=>text.split(/[^a-z0-9'-]+/).includes(t)))return {kind:'excluded',reason:'terms'};
 const checks=query.requirements.map(req=>{let fact=engineFact(req.id,sticker)||(sticker?.status==='verified'?sticker.features?.[req.id]:null);if(req.id.startsWith('interior')&&sticker?.status==='verified'){const color=interiorColors.find(c=>c.id===req.id);const interior=lines.filter(l=>/^interior(?: color)?:/i.test(l)).map(l=>l.split(/exterior(?: color)?:/i)[0]);if(color&&interior.length)fact={value:interior.some(l=>new RegExp(color.pattern,'i').test(l)),evidence:interior};}if(sticker?.vin!==vehicle.vin)fact=null;if(req.id.startsWith('exterior'))fact=sticker?.vin===vehicle.vin?exteriorColorFact(req.id,sticker):null;return {...req,label:labels[req.id],sourceUrl:fact?.sourceUrl,method:fact?.method,state:fact?fact.value===req.wanted?'match':'conflict':'unknown',evidence:fact?.evidence||[]};});
 if(query.equipmentOption){const fact=installedOptionFact(vehicle,sticker,query.equipmentOption);checks.push({id:'selectedOption',label:query.equipmentOption.label,wanted:true,state:fact?fact.value?'match':'conflict':'unknown',evidence:fact?.evidence||[],sourceUrl:fact?.sourceUrl,reason:fact?null:optionEvidenceReason(vehicle,sticker,query.equipmentOption)});}
 if(checks.some(c=>c.state==='conflict'))return {kind:'excluded',reason:'equipment',checks};
 if(checks.some(c=>c.state==='unknown'))return {kind:'unknown',checks,categoryChecks:categoryMatch.checks};
 return {kind:'match',checks,categoryChecks:categoryMatch.checks};
}

