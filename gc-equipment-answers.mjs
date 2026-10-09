// Reviewed 2026 U.S. TWO-ROW Grand Cherokee answers. The base V6 Laredo
// is deliberately separate from the refreshed Laredo Altitude factory chart.
// All inferred factory facts require the exact audited original and configuration.
import {stickerAudits} from './factory-sticker-audits.mjs';

const orderGuide='https://www.jeepgladiatorforum.com/forum/attachments/2026-grand-cherokee-pdf.447472/';
const fleetGuide='https://www.stellantisfleet.com/content/dam/fca-fleet/na/fleet/en_us/shopping-tools/brochures-literature/docs/buyers-guide/2026/26DOMMOP_FBG_GrandCherokee.pdf';
const norm=s=>String(s||'').normalize('NFKC').replace(/[\u2010-\u2015]/g,'-').replace(/\s+/g,' ').trim();
const blocked=/\bdelete(?:d)?|\bdeletion\b|\bwithout\b|\bnot equipped\b|\bnot included\b/i;

export function grandCherokeeConfiguration(vehicle,sticker){
 if(!vehicle?.vin||sticker?.status!=='verified'||sticker.vin!==vehicle.vin||!Array.isArray(sticker.lines))return null;
 const audit=stickerAudits[vehicle.vin];
 if(!audit||audit.market!=='US'||audit.sha256!==sticker.sha256||!sticker.sha256||audit.optionSectionVerifiedComplete!==true||sticker.equipmentSectionComplete!==true)return null;
 if(sticker.lines.some(l=>blocked.test(l)))return null;
 const identity=(sticker.identityLines||[]).map(norm);
 if(!identity.some(l=>/^2026 MODEL YEAR(?: \(26MY\))?$/i.test(l)))return null;
 const body=identity.find(l=>/^(?:JEEP )?GRAND CHEROKEE (?:LAREDO|LIMITED|SUMMIT) 4X[24]$/i.test(l));
 if(!body)return null; // GC L, 4xe, other years and unreviewed trim variants stay separate.
 const [,trim,drive]=body.match(/GRAND CHEROKEE (LAREDO|LIMITED|SUMMIT) (4X[24])/i);
 const engine=norm(sticker.engine||sticker.lines.find(l=>/^Engine:/i.test(l))||'');
 const packages=sticker.lines.map(norm).filter(l=>/^Customer Preferred Package\b/i.test(l));
 const code=packages.length===1?packages[0].match(/^Customer Preferred Package ([A-Z0-9]{3})(?: \$[\d,.]+)?$/i)?.[1]?.toUpperCase():null;
 const id=trim.toLowerCase();
 if(id==='laredo'){
  // 22D is the reviewed V6 Laredo. 22J/X and 2BB/Altitude cannot inherit it.
  if(code!=='22D'||!/\b3\.6L\b.*\bV6\b/i.test(engine)||!sticker.lines.some(l=>/^Uconnect 5 with 8\.4-Inch Touch Screen Display$/i.test(norm(l))))return null;
  return {trim:id,name:'Laredo',drive:drive.toLowerCase(),variant:'base-v6',modelCode:drive.toUpperCase()==='4X2'?'WLTH74':'WLJH74'};
 }
 if(!/\b2\.0L\b.*\bHurricane 4 Turbo\b/i.test(engine))return null;
 if(id==='limited'&&code==='2BE')return {trim:id,name:'Limited',drive:drive.toLowerCase(),variant:'refreshed-hurricane',modelCode:drive.toUpperCase()==='4X2'?'WLTP74':'WLJP74'};
 if(id==='summit'&&code==='2CU'&&drive.toUpperCase()==='4X4')return {trim:id,name:'Summit',drive:'4x4',variant:'refreshed-hurricane',modelCode:'WLJT74'};
 return null;
}

// Standard-equipment table columns on pp. 17–20 match the model codes above.
// The FCA-authored order guide is mirrored publicly; the separate fleet chart
// corroborates the refreshed configurations, but does not cover base V6 Laredo.
const common=[
 ['pushStart','GX4',20,'Push-button start'],
 ['bluetooth','XRB',19,'Integrated voice command with Bluetooth'],
 ['wifi','RTQ',17,'4G LTE Wi-Fi hotspot capability; a data plan is required for service'],
 ['pedestrianBrake','LST',20,'Pedestrian/cyclist emergency braking'],
 ['tintedWindows','GEG',18,'Deep-tint privacy glass']
];

export function applyGrandCherokeeAnswers(vehicle,sticker){
 const config=grandCherokeeConfiguration(vehicle,sticker);if(!config)return sticker;
 const features={...sticker.features};
 const standard=(id,code,page,label,value)=>{
  if(features[id])return;
  features[id]={value:true,method:value?'factory-specification':'factory-standard',sourceUrl:orderGuide+'#page='+page,sourceCode:code,
   evidence:[`2026 two-row Grand Cherokee ${config.name}, ${config.modelCode}: ${label} (${code}), standard-equipment table page ${page}.`],
   ...(value?{displayValue:value,comparisonValue:value.toLowerCase()}:{} )};
 };
 for(const row of common)standard(...row);
 standard('ledLights',config.trim==='summit'?'LM6':'LPX',19,'LED headlamps');
 standard('fuelTankCapacity','NF5',17,'Fuel tank capacity','23 gallons');
 if(config.trim!=='summit')standard('backupCamera','XAC',20,'ParkView rear backup camera');
 if(config.trim==='laredo'){
  standard('passiveEntry','GXD',20,'Passive entry for the front doors and liftgate');
  // This negative is explicit installed manual-seat evidence, not a missing option.
  const manual=sticker.lines.find(l=>/^4-Way Manual Adjustable Front Passenger Seat$/i.test(norm(l)));
  const power=sticker.lines.some(l=>/\bpower\b.*\b(?:front )?passenger seat\b/i.test(l));
  if(manual&&!power&&!features.powerPassenger)features.powerPassenger={value:false,displayValue:'— Manual passenger seat',method:'sticker-specification',sourceUrl:sticker.sourceUrl,evidence:[manual]};
 }else{
  standard('outlet','JKV',17,'115-volt auxiliary AC outlet');
 }
 if(config.trim==='summit'){
  standard('driverAdjustment','JVJ',18,'Driver seat adjustment','12-way power');
  standard('instrumentScreen','JAU',18,'Instrument cluster display','10.25 inches');
  const digital=sticker.lines.find(l=>/^Digital Auto-Dimming Rear-View Mirror$/i.test(norm(l)));
  if(digital&&!features.digitalMirror)features.digitalMirror={value:true,displayValue:'Digital rear-view mirror',comparisonValue:'digital rear-view mirror',method:'sticker-specification',sourceUrl:sticker.sourceUrl,evidence:[digital]};
 }
 return {...sticker,features};
}

export const grandCherokeeAnswerSources={orderGuide,fleetGuide,reviewedAt:'2026-10-09',scope:'2026 US two-row 22D V6 Laredo; 2BE Hurricane Limited; 2CU Hurricane Summit only'};
