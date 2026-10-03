import {repairWheelSeatEvidence} from './wheel-seat-evidence.mjs?v=clean-shopping1';
import {stickerAudits} from './factory-sticker-audits.mjs?v=shopping1';
import {repairSeatEvidence} from './seat-evidence.mjs?v=coverage4';
import {repairTowEvidence,repairTrailerBrakeEvidence} from './tow-evidence.mjs?v=next3';
import {additionalFactoryRules} from './factory-catalog-2026.mjs?v=complete1';
import {repairCameraTireEvidence} from './camera-tire-evidence.mjs?v=equipment1';
import {repairWheelFinishEvidence} from './wheel-finish-evidence.mjs?v=wheel1';
const ramSource='https://www.stellantisfleet.com/content/dam/fca-fleet/na/fleet/en_us/shopping-tools/brochures-literature/docs/buyers-guide/2026/26DOMMOP_FBG_Ram1500.pdf';
const pacificaSource='https://www.chrysler.com/news/2027-chrysler-pacifica-debut.html';
const norm=s=>String(s||'').normalize('NFKC').replace(/[®™]/g,'').replace(/[\u2010-\u2015]/g,'-').replace(/\s+/g,' ').trim().toLowerCase();
const allRam=['Tradesman','Express','Warlock','Big Horn','Lone Star','Laramie','Rebel','Limited','Longhorn','Tungsten'];
export const factoryRules=[];
function add(model,year,trims,kind,features,packages=[],page=1){for(const feature of features)factoryRules.push({id:[model,year,trims.join('-'),kind,feature,packages.join('-')].join(':'),model,year,trims,kind,feature,packages,sourceUrl:model==='Ram 1500'?ramSource+'#page='+page:pacificaSource,reviewedAt:'2026-09-26'});}
// Reviewed against the original factory table columns, not extracted text alignment.
add('Ram 1500',2026,allRam,'standard',['adaptiveCruise','pushStart'],[],6);
add('Ram 1500',2026,allRam,'standard',['blindSpot','rearCross','laneAssist','parkingSensors','remoteStart','keylessEntry','forwardWarning','emergencyBrake','carplay','androidAuto'],[],7);
add('Ram 1500',2026,['Laramie','Limited','Longhorn','Tungsten'],'standard',['heatedSeats','heatedWheel','ventilated','powerDriver','powerPassenger','memorySeats','rearHeated','leather'],[],5);
add('Ram 1500',2026,['Limited','Longhorn','Tungsten'],'standard',['rearVented','airSuspension','bedliner'],[],6);
add('Ram 1500',2026,['Tungsten'],'standard',['massage','sunroof','panoramic'],[],6);
add('Ram 1500',2026,['Tungsten'],'standard',['surroundCamera','driverAlert','trafficSigns','brakeController'],[],7);
add('Ram 1500',2026,['Limited','Longhorn'],'standard',['harman','premiumAudio'],[],7);
add('Ram 1500',2026,['Laramie','Rebel','Limited','Longhorn','Tungsten'],'standard',['navigation'],[],7);
add('Ram 1500',2026,['Laramie'],'package',['wireless','rainWipers'],['Laramie Level 1 Equipment Group','Laramie Level 2 Equipment Group'],8);
add('Ram 1500',2026,['Laramie'],'package',['rearHeated','harman','premiumAudio','navigation'],['Laramie Level 2 Equipment Group'],8);
add('Ram 1500',2026,['Rebel'],'package',['wireless','adjustPedals'],['Rebel Level 1 Equipment Group','Rebel Level 2 Equipment Group'],8);
add('Ram 1500',2026,['Rebel'],'package',['powerPassenger','memorySeats','passiveEntry','rainWipers','rearHeated','harman','premiumAudio','outlet','navigation'],['Rebel Level 2 Equipment Group'],8);
add('Ram 1500',2026,['Rebel'],'package',['ventilated','heatedSeats','heatedWheel','leather','powerDriver','powerPassenger','memorySeats'],['G/T Package'],5);
add('Ram 1500',2026,['Big Horn','Lone Star'],'package',['heatedSeats','heatedWheel','powerDriver','outlet','slidingWindow','adjustPedals'],['Big Horn Level 1 Equipment Group','Big Horn Level 2 Equipment Group'],8);
add('Ram 1500',2026,['Big Horn','Lone Star'],'package',['dualClimate','premiumAudio','alpine','navigation'],['Big Horn Level 2 Equipment Group'],8);
add('Ram 1500',2026,['Limited','Longhorn'],'package',['tonneau','driverAlert','hud','trafficSigns','surroundCamera','rambox'],['Limited Level 1 Equipment Group'],8);
add('Ram 1500',2026,allRam,'package',['bedliner','outlet'],['Bed Utility Group'],9);
add('Ram 1500',2026,allRam,'package',['brakeController','towMirrors'],['Trailer-Tow Group','Trailer Tow Group'],9);
add('Ram 1500',2026,['Laramie','Rebel'],'package',['surroundCamera','trafficSigns','driverAlert'],['Advanced Safety Group'],9);
add('Ram 1500',2026,['Laramie','Rebel'],'package',['hud'],['Technology Group'],9);
add('Ram 1500',2026,['Tradesman','Express','Warlock','Big Horn','Lone Star','Laramie','Limited','Longhorn','Tungsten'],'package',['towHooks','skidPlates','rearLocker'],['Off-Road Group','Off Road Group'],9);
// Absence rules have narrow trim scope and require an audited, complete original.
// Listed packages that could include the feature prevent an absence conclusion.
add('Ram 1500',2026,['Big Horn','Lone Star','Laramie','Rebel','Limited','Longhorn'],'optional',['sunroof','panoramic'],['Dual-Pane Panoramic Sunroof','Power Sunroof','Laramie Southwest Edition','Rebel X'],6);
add('Ram 1500',2026,['Laramie','Rebel'],'optional',['surroundCamera'],['Advanced Safety Group','360 Surround View Camera','Surround View Camera System'],7);
add('Ram 1500',2026,['Limited','Longhorn'],'optional',['surroundCamera','hud'],['Limited Level 1 Equipment Group','Technology Group'],8);
add('Ram 1500',2026,['Laramie','Rebel'],'optional',['hud'],['Technology Group'],9);
add('Ram 1500',2026,['Big Horn','Lone Star','Laramie','Rebel'],'optional',['airSuspension'],['4-Corner Air Suspension','Active-Level Four-Corner Air Suspension'],2);
add('Ram 1500',2026,['Tradesman','Express','Warlock','Big Horn','Lone Star','Laramie','Rebel'],'optional',['bedliner'],['Bed Utility Group','Spray-In Bedliner by Mopar'],2);
add('Pacifica',2027,['Select','Limited','Pinnacle'],'package',['familyCamera','navigation','powerPassenger'],['Family Tech Group']);
add('Pacifica',2027,['LX','Select','Limited','Pinnacle'],'standard',['powerLiftgate']);
add('Pacifica',2027,['Select','Limited'],'package',['surroundCamera'],['Safety Sphere']);
add('Pacifica',2027,['Pinnacle'],'standard',['surroundCamera']);
factoryRules.push(...additionalFactoryRules);

const presencePatterns={sunroof:/sun.?roof|moon.?roof|panoramic|dual.?pane/i,panoramic:/sun.?roof|moon.?roof|panoramic|dual.?pane/i,surroundCamera:/surround|360.*camera/i,hud:/head.?up|\bhud\b/i,airSuspension:/air.suspension|active.level/i,bedliner:/bed.?liner|spray.in/i};
function identity(sticker){
 const lines=sticker.identityLines||[],year=Number(lines.join(' ').match(/\b(20\d\d)\b/)?.[1]);
 const name=norm(lines.filter(l=>!/^20\d\d model year\b/i.test(l)).join(' ')).replace(/^20\d\d\s+/,'');
 const ram=name.match(/^ram 1500 (tradesman|black express|express|warlock|big horn|lone star|laramie|rebel|limited longhorn|longhorn|limited|tungsten) (crew|quad) cab\b/);
 if(ram)return {year,model:'Ram 1500',trim:ram[1]==='black express'?'express':ram[1]==='limited longhorn'?'longhorn':ram[1],cab:ram[2]};
 const compass=name.match(/^(?:jeep )?compass (latitude altitude|limited altitude|latitude|limited|trailhawk) (?:4x4|4x2|fwd)$/);
 if(compass)return {year,model:'Compass',trim:compass[1]};
 const gladiator=name.match(/^(?:jeep )?gladiator (sport s|sport|willys|mojave|rubicon) 4x4$/);
 if(gladiator)return {year,model:'Gladiator',trim:gladiator[1]};
 // Only the reviewed V6 GT column; HEMI, SRT and other years stay outside it.
 const durango=name.match(/^(?:dodge )?durango gt (?:rwd|awd)$/);
 if(durango&&/3\.6[ -]?l.*v6/i.test(sticker.engine||''))return {year,model:'Durango',trim:'gt'};
 const cherokee=name.match(/^(?:jeep )?cherokee (base|laredo|limited|overland) 4x4$/);
 if(cherokee&&/1\.6[ -]?l.*(?:hybrid|hev)/i.test(sticker.engine||''))return {year,model:'Cherokee',trim:cherokee[1]};
 const grand=name.match(/^(?:jeep )?grand cherokee (laredo altitude|limited reserve|limited|summit) (?:4x4|4x2)$/);
 // The refreshed 2026 guide covers Hurricane 4 models, not carryover V6 or L/4xe.
 if(grand&&/2\.0[ -]?l.*(?:hurricane|i4)|hurricane.*(?:2\.0|4 turbo)/i.test(sticker.engine||''))return {year,model:'Grand Cherokee',trim:grand[1]};
 if(/phev|hybrid|plug.in/i.test(name+' '+(sticker.engine||'')))return null;
 const pacifica=name.match(/^(?:chrysler )?pacifica (lx|select|limited|pinnacle)(?: (?:awd|fwd))?$/);
 return pacifica?{year,model:'Pacifica',trim:pacifica[1]}:null;
}
function packageOn(lines,name){const n=norm(name);return lines.find(l=>{const value=norm(l).replace(/\s+\$[\d,.]+$/,'');return value===n||value===n+' package';});}
export function applyFactoryEquipment(vehicle,sticker){
 if(sticker?.status!=='verified'||!vehicle?.vin||sticker.vin&&sticker.vin!==vehicle.vin)return sticker;
 sticker=repairWheelSeatEvidence(repairTowEvidence(repairSeatEvidence(sticker)));
 if(sticker.vin===vehicle.vin){sticker=repairCameraTireEvidence(sticker);sticker=repairWheelFinishEvidence(sticker);}
 const audit=stickerAudits[vehicle.vin];
 if(!audit||!sticker.sha256||audit.sha256!==sticker.sha256||audit.market!=='US')return sticker;
 // Add newly recognized printed wording only after matching the audited original.
 if(sticker.vin===vehicle.vin)sticker=repairTrailerBrakeEvidence(sticker);
 // Saved parser split the display year into individual digits on these originals.
 // Recovered identity is independently checked against that exact cached PDF;
 // never use listing identity, a different fingerprint, or overwrite a valid identity.
 if(sticker.vin===vehicle.vin&&sticker.identityLines?.length===2&&sticker.identityLines[0]==='2'&&sticker.identityLines[1]==='0'&&audit.identityLines){
  sticker={...sticker,identityLines:[...audit.identityLines]};
 }
 const id=identity(sticker);if(!id)return sticker;
 const lines=sticker.lines||[],text=lines.join('\n');
 const complete=audit.optionSectionVerifiedComplete&&sticker.equipmentSectionComplete===true;
 const features={...sticker.features};
 // Standard equipment can be replaced/deleted; never add it from a partial sticker
 // or when an unhandled deletion is present. Explicit feature evidence wins.
 const deletionLines=lines.filter(l=>/\bdelete(?:d)?|deletion|without|not equipped|not included/i.test(l));
 for(const rule of factoryRules){
  if(rule.year!==id.year||rule.model!==id.model||!rule.trims.some(t=>norm(t)===id.trim))continue;
  const f=rule.feature;
  const trimLabel=rule.trims.find(t=>norm(t)===id.trim);
  if(id.model==='Ram 1500'&&rule.kind==='optional'&&['sunroof','panoramic','airSuspension'].includes(f)&&id.cab!=='crew')continue;
  // Some Monroney labels abbreviate this deletion without repeating 'bedliner'.
  if(f==='bedliner'&&lines.some(l=>/spray.in(?: bedliner)? delete/i.test(l))){features[f]={value:false,method:'sticker-deletion',evidence:lines.filter(l=>/spray.in(?: bedliner)? delete/i.test(l))};continue;}
  if(features[f])continue;
  let value,method,evidence;
  if(rule.kind==='package'){
   const matched=rule.packages.map(p=>packageOn(lines,p)).find(Boolean);
   if(!matched||!complete||deletionLines.length)continue;
   value=true;method='factory-package';evidence=[matched,`Included in this package according to the ${rule.year} factory guide.`];
  }else if(rule.kind==='standard'){
   if(!complete||deletionLines.length)continue;
   value=true;method='factory-standard';evidence=[`Standard factory equipment for ${rule.year} ${rule.model} ${trimLabel}.`];
  }else{
   if(!complete||deletionLines.length||!presencePatterns[f]||presencePatterns[f].test(text))continue;
   if(rule.packages.some(p=>packageOn(lines,p)))continue;
   // Special editions and custom option groups need their own reviewed ordering rules.
   if(/edition|\brebel x\b|custom package/i.test(text))continue;
   value=false;method='factory-option-omission';evidence=[`Optional on ${rule.year} ${rule.model} ${trimLabel}; not ordered on this complete original sticker.`];
  }
  features[f]={value,method,evidence,sourceUrl:rule.sourceUrl,ruleId:rule.id};
 }
 return {...sticker,features};
}
export function equipmentStatus(fact){
 if(!fact)return '? Not confirmed';
 if(fact.method==='factory-option-omission')return '− Not factory-equipped';
 if(fact.method==='factory-standard')return '✓ Standard on this trim';
 if(fact.method==='factory-package')return '✓ Included in listed package';
 return fact.value?'✓ Listed on sticker':'− Explicitly excluded';
}
