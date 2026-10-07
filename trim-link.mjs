// Connects a real vehicle to its column in the factory trim guide (trim-standard-data.json), so the
// vehicle comparison and the Compare Trims page describe a trim the same way.
// Rules: same model year only, the model and trim are read from the window sticker's own model line
// (the dealer title is used only when no sticker was read), and an unclear trim name matches nothing.
import {equipmentRows} from './trim-comparison.mjs';
import {parseQuery} from './equipment-search.mjs';

const words=s=>String(s||'').normalize('NFKC').toUpperCase().replace(/[’']/g,'').replace(/[^A-Z0-9]+/g,' ').trim();

// Model families, most specific first. Each lists the trim guide model for a model year.
const families=[
 [/\bWRANGLER\b.*\b4XE\b/,{2025:'jeep-wrangler-4xe'}],
 [/\bWRANGLER 2 DOOR\b/,{2026:'wrangler-2-door',2027:'wrangler-2door-2027'}],
 [/\bWRANGLER (?:4 DOOR|UNLIMITED)\b/,{2026:'wrangler',2027:'wrangler-2027'}],
 [/\bWRANGLER\b/,{}],
 [/\bGLADIATOR\b/,{2026:'jeep-gladiator',2027:'jeep-gladiator-2027'}],
 [/\bCOMPASS\b/,{2026:'jeep-compass'}],
 [/\bGRAND CHEROKEE\b.*\b4XE\b/,{2025:'jeep-grand-cherokee-4xe'}],
 [/\bGRAND CHEROKEE L\b/,{2026:'jeep-grand-cherokee'}],
 [/\bGRAND CHEROKEE\b/,{2026:'jeep-grand-cherokee',2027:'jeep-grand-cherokee-2027'}],
 [/\bCHEROKEE\b/,{2026:'jeep-cherokee',2027:'jeep-cherokee-2027'}],
 [/\bGRAND WAGONEER\b.*\bREV\b/,{2027:'jeep-grand-wagoneer-rev-2027'}],
 [/\bGRAND WAGONEER(?: L)?\b/,{2026:'jeep-grand-wagoneer',2027:'jeep-grand-wagoneer-2027'}],
 [/\bWAGONEER S\b/,{2025:'jeep-wagoneer-s'}],
 [/\bWAGONEER(?: L)?\b/,{2025:'jeep-wagoneer'}],
 [/\bRECON\b/,{2026:'jeep-recon'}],
 [/\bPROMASTER CITY\b/,{}],
 [/\bPROMASTER\b.*\bEV\b/,{2026:'ram-promaster-ev'}],
 [/\bPROMASTER\b/,{2026:'ram-promaster',2027:'ram-promaster-2027'}],
 [/\b[345]500 CHASSIS\b/,{2026:'ram-chassis-cab',2027:'ram-chassis-cab-2027'}],
 [/\b1500 TRX\b/,{2027:'ram-1500-trx-srt-2027'}],
 [/\b1500 RUMBLE BEE\b/,{2027:'ram-1500-rumble-bee-2027'}],
 [/\bRAM 1500\b/,{2026:'ram-1500',2027:'ram-1500-2027'}],
 [/\bRAM 2500\b/,{2026:'ram-2500',2027:'ram-2500-2027'}],
 [/\bRAM 3500\b/,{2026:'ram-3500',2027:'ram-3500-2027'}],
 [/\bDURANGO\b/,{2026:'dodge-durango',2027:'dodge-durango-2027'}],
 [/\bCHARGER DAYTONA\b/,{2026:'dodge-charger-daytona',2027:'dodge-charger-daytona-2027'}],
 [/\bCHARGER\b/,{2026:'dodge-charger',2027:'dodge-charger-gas-2027'}],
 [/\bHORNET\b/,{2025:'dodge-hornet'}],
 [/\bCHALLENGER\b/,{2023:'dodge-challenger'}],
 [/\bPACIFICA\b.*\b(?:HYBRID|PHEV|PLUG IN)\b/,{2026:'chrysler-pacifica-hybrid'}],
 [/\bPACIFICA\b/,{2026:'chrysler-pacifica',2027:'chrysler-pacifica-gas-2027'}],
 [/\bVOYAGER\b/,{2026:'chrysler-voyager'}],
 [/\bCHRYSLER 300\b/,{2023:'chrysler-300'}]
];
// Words that describe the body or drive, not the trim.
const configuration=/\b(?:NEW|USED|CERTIFIED|PRE OWNED|JEEP|RAM|DODGE|CHRYSLER|MODEL YEAR|\d\dMY|MY\d\d|CREW CAB|QUAD CAB|MEGA CAB|REGULAR CAB|REG CAB|CAB|CHASSIS|LONG BOX|SHORT BOX|BOX|4X4|4X2|4XE|V8|V6|4WD|2WD|AWD|FWD|RWD|4 DOOR|2 DOOR|UNLIMITED|SPECIAL EDITION|EDITION|CARGO|VAN|HIGH ROOF|LOW ROOF|STD ROOF|\d+ ?WB|\d+)\b/g;
const trimNames=trim=>{
 const names=new Set(trim.name.split(' / ').map(words));
 for(const n of [...names]){names.add(n.replace(/ EDITION$/,''));names.add(n.replace(/^LIMITED LONGHORN$/,'LONGHORN'));names.add(n.replace(/^WILLYS 41$/,'WILLYS41'));}
 return [...names].filter(Boolean);
};
const has=(text,name)=>(' '+text+' ').includes(' '+name+' ');

// → {model, trim, variant, basis} or null. `variant` holds extra words the sticker adds to the trim
// name (an edition or package such as NIGHT or G/T) — the guide column is the trim it is built on.
export function guideTrim(vehicle,sticker,data){
 if(!data?.models||!vehicle)return null;
 const verified=sticker?.status==='verified'&&(!sticker.vin||sticker.vin===vehicle.vin);
 const identity=verified?(sticker.identityLines||[]).join(' '):'';
 const basis=/\b20\d\d\b/.test(identity)&&families.some(([p])=>p.test(words(identity)))?'sticker':'title';
 const source=words(basis==='sticker'?identity:vehicle.title);
 const year=Number((basis==='sticker'?identity:String(vehicle.title||'')).match(/\b(20\d\d)\b/)?.[1])||Number(vehicle.year);
 const family=families.find(([p])=>p.test(source));
 const model=family&&data.models.find(m=>m.id===family[1][year]&&m.year===year);
 if(!model)return null;
 const rest=source.replace(family[0],' ').replace(configuration,' ').replace(/\s+/g,' ').trim();
 const hits=[];
 for(const trim of model.trims)for(const name of trimNames(trim))if(has(rest,name))hits.push({trim,name});
 // A base trim that carries the model's own name ("Grand Wagoneer", "Cherokee") has no trim word on the sticker.
 if(!hits.length&&!rest){const base=model.trims.find(t=>family[0].test(words(model.brand+' '+t.name))||families.some(([p,ids])=>ids[year]===model.id&&p.test(words(t.name))));if(base)return {model,trim:base,variant:'',basis};}
 if(!hits.length)return null;
 hits.sort((a,b)=>b.name.length-a.name.length);
 const best=hits[0];
 // Two different trims named on one line, neither containing the other: do not guess.
 if(hits.some(h=>h.trim!==best.trim&&!has(best.name,h.name)))return null;
 const variant=(' '+rest+' ').replace(' '+best.name+' ',' ').replace(/\b(?:SERIES|THERES ONLY ONE)\b/g,' ').replace(/\s+/g,' ').trim();
 return {model,trim:best.trim,variant,basis};
}

// The guide's rows for the chosen trims that differ, in the guide's own terms. Only rows the guide
// documents for every one of the trims are used: a row missing for one trim is not a difference.
export function guideDifferences(matches){
 const found=matches.filter(Boolean);
 if(found.length!==matches.length||found.length<2)return [];
 if(new Set(found.map(m=>m.model.id+'/'+m.trim.id)).size<2)return [];
 const sameModel=new Set(found.map(m=>m.model.id)).size===1;
 return equipmentRows(found.map(m=>m.trim)).filter(row=>row.cells.every(Boolean)&&row.cells.every(c=>c.status!=='verify')&&(row.kind==='different'||row.kind==='options'||row.knownDifference)&&(sameModel||row.cells.every(c=>c.label===row.cells[0].label)));
}

// Which searchable feature a guide row is about. The row's own name decides ("Heated rear seats",
// "Adaptive cruise control"). Drive type, engine and transmission are left to the window sticker, which
// names the vehicle's own; the guide's columns describe one stated configuration of each trim.
const leftToSticker=/^(?:fourWheel|awd|manualTransmission|automatic|airConditioning|diesel|electric|hybrid|tow|leather|cloth)$|^(?:engine|tire|wheel|exterior|interior)/;
// For standard equipment a few rows name the feature in their value instead ("Standard audio: Alpine 10 speakers").
const namedInValue=[[/audio/i,/^(?:alpine|harman|mcintosh|subwoofer)$/],[/touchscreen/i,/^navigation$/],[/adjustment$/i,/^lumbar$/],[/underbody|trail equipment/i,/^(?:skidPlates|towHooks)$/],[/differential/i,/^rearLocker$/],[/suspension/i,/^airSuspension$/],[/^second-row seat/i,/^captains$/],[/sunroof/i,/^(?:panoramic|sunroof)$/],[/^standard camera/i,/^(?:backupCamera|surroundCamera)$/],[/^parking assist/i,/^parkingSensors$/],[/^lane /i,/^laneAssist$/],[/^remote /i,/^remoteStart$/],[/seat heating/i,/^heatedSeats$/],[/headlamps/i,/^fogLights$/]];
// Plain wording in a standard row's value that names a feature the search does not pick out of a short phrase.
const statedInValue=[[/^exterior mirrors/i,/\bpower[ -]fold/i,'foldMirrors'],[/^climate control/i,/\S/,'airConditioning'],[/^climate/i,/\bdual[ -]zone/i,'dualClimate'],[/^climate/i,/\b(?:tri|three|3)[ -]zone/i,'triClimate'],[/^rear seat comfort/i,/\bheated\b/i,'rearHeated'],[/^rear seat comfort/i,/\bventilated\b/i,'rearVented']];
const wantedIds=text=>parseQuery(text).requirements.filter(r=>r.wanted).map(r=>r.id).filter(id=>!leftToSticker.test(id));
export function guideRowFeature(label){const ids=wantedIds(label);return ids.length===1?ids[0]:null;}

// What the guide says about each searchable feature on one trim: Map(feature id → guide fact).
// `installed` is the vehicle's own sticker features. A standard item named only in a row's value is
// skipped when the sticker shows the upgrade that replaces it (Harman Kardon in place of Alpine).
export function guideFeatureFacts(trim,installed={}){
 const facts=new Map(),all=trim?.comparison||[];
 for(const fact of all){
  if(fact.upgradeOf||!['standard','optional','unavailable'].includes(fact.status))continue;
  const id=guideRowFeature(fact.label);
  if(id&&!facts.has(id))facts.set(id,fact);
 }
 for(const fact of all){
  if(fact.upgradeOf||fact.status!=='standard')continue;
  const allowed=namedInValue.filter(([label])=>label.test(fact.label)).map(([,ids])=>ids);
  if(!allowed.length)continue;
  const replaced=all.some(o=>o.upgradeOf===fact.key&&wantedIds(o.label+' '+o.value).some(id=>installed[id]?.value===true&&!wantedIds(fact.value).includes(id)));
  if(replaced)continue;
  for(const id of wantedIds(fact.value))if(allowed.some(p=>p.test(id))&&!facts.has(id))facts.set(id,fact);
 }
 for(const fact of all){
  if(fact.upgradeOf||fact.status!=='standard')continue;
  for(const [label,value,id] of statedInValue)if(label.test(fact.label)&&value.test(fact.value)&&!facts.has(id))facts.set(id,fact);
 }
 return facts;
}

export function guideLink(matches){
 const found=matches.filter(Boolean);
 if(!found.length||new Set(found.map(m=>m.model.id)).size!==1)return null;
 return '/trim-guide?model='+encodeURIComponent(found[0].model.id)+'&trims='+[...new Set(found.map(m=>m.trim.id))].map(encodeURIComponent).join(',');
}
export const guideColumnName=match=>match?`${match.model.year} ${match.model.name.split(' / ')[0].replace(/\s*\([^)]*\)/g,'')} ${match.trim.name}`:'';
