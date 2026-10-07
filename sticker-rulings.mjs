// How window-sticker wording is read, as ruled by Sam on 7 Oct 2026. One place, used both when a new sticker is
// read (the patterns below feed the search definitions) and every time a saved sticker is searched or compared
// (applyRulings re-reads the saved sticker text, so older records follow the same rules without being re-fetched).
import {engineFact,engineKindIds} from './engine-search.mjs';
import {wheelSeatFeatures} from './wheel-seat-evidence.mjs';

const near='(?:[- /]+[\\w.\'"]+){0,5}?[- /]+';
export const wording={
 // Leather: leather, Nappa, Laguna, "Leather Seating Surfaces", "Leather Seat Trim", McKinley-trimmed.
 // Leatherette is its own material and is not leather. Steering wheels and door trim are not seats.
 leather:new RegExp('\\bleather\\b(?![- ]wrapped)'+near+'(?:seats?|seating)\\b|\\bseat(?:s|ing)?(?: trim| surfaces)?[,:]?(?: \\w+){0,2} leather\\b(?![- ]wrapped)|\\bnappa\\b'+near+'seat|\\bmckinley[ -]trimmed\\b.*\\bseats?\\b','i'),
 leatherette:new RegExp('\\bleatherette\\b(?:'+near+'|[- /]+)seat|^interior:.*\\bleatherette\\b','i'),
 // "2nd Row Buckets" are captain's chairs.
 captains:/(?:second|2nd)[ -]row.*captain|captain'?s?[ -]chair|(?:second|2nd)[ -]row[^.;]*\bbuckets?\b/i,
 // Seven- or eight-passenger seating, or any third-row line, means a third row.
 thirdRow:/\b(?:third|3rd)[ -]row\b|\b[78][ -]passenger seating\b/i,
 // "Radio / Driver Seat / Mirrors / Pedals Memory" is driver seat memory. Pedal, mirror and column memory alone are not.
 memorySeats:/\bdriver(?:'s)?[ -]seat\b.*\bmemory\b|\bmemory\b.*\bdriver(?:'s)?[ -]?seat|\bmemory settings, driver\b|\bmemory\b.*\bseats\b/i,
 // Tru-Lok on the rear axle is a locking rear differential (front-only Tru-Lok is not).
 rearLocker:/locking rear[ -]axle|rear.*locking differential|electronic.*rear.*locker|\btru[ -]?lok (?:rear|front and rear)\b/i,
 // Trac-Lok / anti-spin is a limited-slip rear differential.
 limitedSlip:/\banti[ -]spin\b|\btrac[ -]?lok\b|\blimited[ -]slip\b/i,
 // Trailer-tow mirrors. On Ram heavy-duty stickers "TT Mirrors" is Trailer Tow, and the telescoping (extending)
 // mirrors are the tow mirrors: the factory guide lists trailer-tow mirrors as standard on every 2500/3500 trim,
 // manual on Tradesman and power-adjustable, heated, manual fold and extension from Big Horn up — the sticker's wording.
 towMirrors:/trailer[ -]tow.*mirror|tow[ -]mirror|\bTT mirrors?\b|\btelescop\w*\b[^,;]*\bmirrors?\b|\bmirrors?\b[^,;]*\btelescop/i,
 // GM prints its automatic high beams as "IntelliBeam - Auto High Beam".
 autoHighBeam:/automatic high.?beam|\bintellibeam\b|\bauto high.?beam|\bhigh beam assist\b/i,
 // Recovery hooks and tow hooks are the same thing.
 towHooks:/\btow[ -]hooks?\b|\brecovery[ -]hooks?\b/i,
 // GM's "Forward Collision Alert" is forward collision warning.
 forwardWarning:/\bforward[ -]collision[ -](?:warning|warn\b|alert)/i,
 // Spray-in and spray-on are the same thing: a bedliner.
 bedliner:/spray.(?:in|on) bed.?liner|bed.?liner, spray.on/i,
 foldMirrors:/\b(?:power|pwr)[ -]fold(?:ing|[ -]away)?\b.*\bmirrors?\b|\bmirrors?\b.*\b(?:power|pwr)[ -]fold|\bpower heat\/fold\b/i,
 // Automatic emergency braking. Brake-hold and post-crash "multi-collision" braking are different things.
 emergencyBrake:/\bemergency[ -]brak|\bcollision\b[^,;]*\b(?:active[ -])?brak|\bcrash mitigation\b|\bpedestrian\b[^,;]*\bbrak/i,
 // Pedestrian emergency braking is its own feature, separate from forward collision warning with braking.
 pedestrianBrake:/\bpedestrian\b[^,;]*\bbrak/i,
 // "Remote Proximity (Keyless) Entry" is both passive entry and keyless entry.
 passiveEntry:/passive[ -]entry|keyless[ -]enter|\bremote[ -]proximity\b.*\bentry\b/i,
 keylessEntry:/\bremote[ -]keyless[ -]{0,2}entry|\bremote[ -]proximity\b.*\bentry\b|\bkeyless[ -]{0,2}entry\b/i,
 // "Pushbutton Start" and "Keyless Go" are push-button start.
 pushStart:/push[ -]?button(?: (?:&|and) remote)? start|\bkeyless (?:enter 'n )?go/i,
 // Klipsch, "High-Performance Audio" and the 950-watt amplifier are premium audio.
 premiumAudio:/amplified speakers|harman.kardon|alpine|mcintosh|\bklipsch\b|\bhigh[ -]performance audio\b|\b950[ -]watt amplifier\b/i,
 // A power inverter is an AC outlet.
 outlet:/115.volt|115v|120.volt|120v|ac.outlet|\b\d{3,4} ?w(?:att)? inverter\b/i,
 dualClimate:/\bdual[ -]?zone\b|\bdual auto(?:matic)? temperature control\b/i,
 triClimate:/\b3[ -]zone\b|\btri[ -]zone\b|\bthree[ -]zone\b/i,
 quadClimate:/\b4[ -]zone\b|\bfour[ -]zone\b|\bquad[ -]zone\b/i
};
const notThese={emergencyBrake:/\bbrake[ -]hold\b|\bmulti[ -]collision\b/i,foldMirrors:/\bmanual[ -]fold/i,leather:/\b(?:steering wheel|door trim|shift knob)\b/i};
const removed=/\b(?:delete|deleted|deletion|without|not equipped|not included)\b/i,notInstalled=/^optional equipment|if equipped|available separately/i;
function read(lines,id){
 const evidence=lines.filter(l=>wording[id].test(l)&&!notThese[id]?.test(l));
 const negative=evidence.filter(l=>removed.test(l)),positive=evidence.filter(l=>!negative.includes(l)&&!notInstalled.test(l));
 return negative.length?{value:false,evidence:negative.slice(0,2)}:positive.length?{value:true,evidence:positive.slice(0,2)}:null;
}
// Wording that used to count and no longer does. A saved "yes" that rests only on such a line is withdrawn;
// any other saved answer (another make's reader, a reviewed record) is left alone.
const retired={leather:/\bleatherette\b|\b(?:steering wheel|door trim|shift knob)\b/i,emergencyBrake:/\bbrake[ -]hold\b|\bmulti[ -]collision\b/i};
// Added when the wording is there; a saved answer is never taken away.
const added=['towMirrors','autoHighBeam','bedliner','towHooks','forwardWarning','leatherette','captains','thirdRow','memorySeats','rearLocker','limitedSlip','foldMirrors','pedestrianBrake','passiveEntry','keylessEntry','pushStart','premiumAudio','outlet','dualClimate','triClimate','quadClimate'];

// Four-wheel drive, all-wheel drive and two-wheel drive are different things. Go by what the sticker's model line
// calls this vehicle (the listing title when that line does not say).
const driveKind=text=>/\b(?:4X4|4WD)\b/i.test(text)?'fourWheel':/\bAWD\b|\ball[ -]wheel[ -]drive\b/i.test(text)?'awd':/\bFWD\b|\bfront[ -]wheel[ -]drive\b/i.test(text)?'fwd':/\bRWD\b|\brear[ -]wheel[ -]drive\b/i.test(text)?'rwd':/\b(?:4X2|2WD)\b/i.test(text)?'two':null;
// When neither the model line nor the title says, a transmission or cab line that names one drive type does.
const driveLine=l=>/^transmission:|\bcab\b|^htrac awd$|\ball[ -]wheel[ -]drive\b/i.test(l)&&!/\b(?:FWD\/AWD|transfer[ -]case|mode)\b/i.test(l)&&driveKind(l);
export function driveFacts(vehicle,sticker){
 const said=(sticker.identityLines||[]).find(driveKind)||(driveKind(vehicle?.title||'')?vehicle.title:null)||(sticker.lines||[]).find(driveLine);
 if(!said)return {};
 const kind=driveKind(said),fact=value=>({value,evidence:[said]});
 // A "4x2" or "2WD" truck or SUV here is rear-wheel drive; front-wheel-drive models print FWD.
 return {fourWheel:fact(kind==='fourWheel'),awd:fact(kind==='awd'),twoWheel:fact(['two','rwd','fwd'].includes(kind)),rwd:fact(kind==='rwd'||kind==='two'),fwd:fact(kind==='fwd')};
}
// The sticker's "Interior:" line names what the seats are made of. Leather, leatherette and cloth are three
// different materials, and Capri, Natura, Rewind, suede, vinyl and the like are materials of their own — so a
// line naming any of them is a plain yes or no for each, never something left to confirm.
const material={leather:/\bleather\b|\bnappa\b|\blaguna\b|\bmckinley[ -]trimmed\b/i,leatherette:/\bleatherette\b/i,cloth:/\bcloth\b/i},otherMaterial=/\b(?:vinyl|suede|capri|natura|rewind|fabric|alcantara|denim|h-tex|evotex)\b/i;
export function seatMaterialFacts(lines){
 const seat=lines.find(l=>/^interior:/i.test(l)&&!/^interior color/i.test(l));
 if(!seat||!(otherMaterial.test(seat)||Object.values(material).some(p=>p.test(seat))))return {};
 return Object.fromEntries(Object.entries(material).map(([id,p])=>[id,{value:p.test(seat),evidence:[seat]}]));
}

const cache=new WeakMap();
export function applyRulings(vehicle,sticker){
 if(sticker?.status!=='verified'||!vehicle?.vin||sticker.vin!==vehicle.vin)return sticker;
 if(cache.has(sticker))return cache.get(sticker);
 const lines=sticker.lines||[],features={...sticker.features},set=(id,fact)=>{features[id]={...fact,sourceUrl:fact.sourceUrl||sticker.sourceUrl};};
 for(const id of Object.keys(retired)){const fact=read(lines,id),saved=features[id];if(fact)set(id,fact);else if(saved?.value===true&&saved.evidence?.length&&saved.evidence.every(l=>retired[id].test(l)))delete features[id];}
 for(const id of added){if(features[id])continue;const fact=read(lines,id);if(fact)set(id,fact);}
 for(const [id,fact] of Object.entries(seatMaterialFacts(lines)))set(id,fact);
 // The engine and transmission lines answer every engine and transmission question, yes or no.
 for(const id of engineKindIds){const fact=engineFact(id,sticker);if(fact)set(id,fact);}
 const gearbox=lines.find(l=>/^transmission:/i.test(l));
 if(gearbox){const manual=/\bmanual\b/i.test(gearbox);set('manualTransmission',{value:manual,evidence:[gearbox]});set('automaticTransmission',{value:!manual,evidence:[gearbox]});}
 for(const [id,fact] of Object.entries(driveFacts(vehicle,sticker)))set(id,fact);
 const yes=id=>features[id]?.value===true,because=(...ids)=>ids.flatMap(id=>features[id]?.evidence||[]).slice(0,2);
 // More zones cover fewer: four-zone is also three-zone, both are also dual-zone, and both cool the rear seats.
 if(yes('quadClimate')&&!yes('triClimate'))set('triClimate',{value:true,evidence:because('quadClimate')});
 if(yes('triClimate')&&!yes('dualClimate'))set('dualClimate',{value:true,evidence:because('triClimate')});
 if(yes('triClimate')&&!features.rearAir)set('rearAir',{value:true,evidence:because('quadClimate','triClimate')});
 // A stated dual-zone system is not three-zone; a stated three-zone system is not four-zone.
 if(yes('dualClimate')&&!features.triClimate)set('triClimate',{value:false,evidence:because('dualClimate')});
 if(yes('dualClimate')&&!features.quadClimate)set('quadClimate',{value:false,evidence:because('triClimate','dualClimate')});
 // A stated second-row bench means no captain's chairs.
 const bench=features.secondRowBench?.value===true?features.secondRowBench:wheelSeatFeatures(lines).secondRowBench;
 if(bench?.value===true&&!features.captains)set('captains',{value:false,evidence:bench.evidence||[]});
 // Tops: a Sky One-Touch roof is not a soft top; a hard top with no soft top listed has no soft top, and the reverse.
 // A "No Soft Top" line means exactly that: the hard top replaced it.
 const noSoftTop=lines.find(l=>/^no soft[ -]?top\b/i.test(l));
 if(noSoftTop)set('softTop',{value:false,evidence:[noSoftTop]});
 if(yes('skyRoof'))set('softTop',{value:false,evidence:because('skyRoof')});
 if(yes('hardTop')&&!features.softTop)set('softTop',{value:false,evidence:because('hardTop')});
 if(yes('softTop')&&!features.hardTop)set('hardTop',{value:false,evidence:because('softTop')});
 // Ram 4500 and 5500 chassis cabs are built only with dual rear wheels.
 const chassis=(sticker.identityLines||[]).find(l=>/\bRAM [45]500 CHASSIS\b/i.test(l));
 if(chassis&&!features.dualRearWheels)set('dualRearWheels',{value:true,evidence:[chassis]});
 const result={...sticker,features};cache.set(sticker,result);return result;
}
