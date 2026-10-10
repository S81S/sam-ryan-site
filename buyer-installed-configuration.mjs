// Narrow source-backed bridges between factory-chart wording and VIN wording.
// A factory standard alone is never evidence of what is installed.
const fleet=name=>'https://www.stellantisfleet.com/content/dam/fca-fleet/na/fleet/en_us/shopping-tools/brochures-literature/docs/buyers-guide/2026/26DOMMOP_FBG_'+name+'.pdf';
const clean=s=>String(s||'').normalize('NFKC').replace(/[®™]/g,'').replace(/[\u2010-\u2015]/g,'-').replace(/\s+/g,' ').trim();
const uncertain=/\b(?:if equipped|available|optional|without|not equipped|not included|delete[ds]?|deletion|either|or)\b/i;
const radios={
 'wrangler':{
  f14j2jpq:['https://media.stellantisnorthamerica.com/view-spec.do?id=27222','','Radio with Uconnect 5 with 12.3-in. display',12.3,false],
  f1oo6l8x:['https://media.stellantisnorthamerica.com/view-spec.do?id=27222','','Radio with Uconnect 5 NAV with 12.3-in. display',12.3,true]
 },
 'chrysler-pacifica':{
  f2m7a7w:['Pacifica','Uconnect 5 with 10.1-inch Display','Includes 10.1-inch touchscreen, AM/FM, USB host flip, hands-free phone and audio, Android Auto,TM(15) Apple CarPlayTM(16) and available SiriusXM with 360L(21) (UBG)',10.1,false],
  f6k6gmv:['Pacifica','Uconnect 5 NAV with 10.1-inch Display','Includes 10.1-inch touchscreen, AM/FM, USB host flip, Integrated Voice Command, Android Auto,(15) Apple CarPlay,(16) HD radio, Navigation and available SiriusXM with 360L(21) (included with Uconnect Theater Family Group) (UBN)',10.1,true]
 },
 'ram-1500':{
  f1e0k45y:['Ram1500','Radio Systems','Uconnect 5 with 8.4-inch touchscreen display (UBE)',8.4,false],
  fh01t86:['Ram1500','Radio Systems','Uconnect 5 NAV with 12-inch touchscreen display (included with H2 Group) (UBQ)',12,true]
 },
 'ram-3500':{
  fldke8f:['RamHD','Systems','Uconnect 5 with 8.4-inch touchscreen display (UBE)',8.4,false],
  f123o6b:['RamHD','Systems','Uconnect 5 NAV with 12-inch touchscreen display (included with Convenience Group and H1 Plus and H2 Plus Groups) (UBQ)',12,true]
 }
};
export function installedRadioEvidence(lineup,choice,fact,record,resolved){
 const rule=radios[lineup?.id]?.[choice?.id],screen=resolved?.features?.infotainmentScreen;
 if(lineup?.year!==2026||!rule||!fact?.factory||fact.sourceUrl!==(rule[0].startsWith('https:')?rule[0]:fleet(rule[0]))||fact.parent!==rule[1]||fact.text!==rule[2]||record?.status!=='verified'||record.equipmentSectionComplete!==true||!record.sourceUrl)return null;
 if(screen?.method!=='sticker-specification'||screen.value!==true||!screen.evidence?.length||!Array.isArray(record.lines))return null;
 const installed=screen.evidence.map(line=>{
  if(typeof line!=='string'||!record.lines.includes(line)||uncertain.test(line))return null;
  const match=clean(line).match(/^Uconnect 5( Nav)? with (8\.4|10\.1|12(?:\.0)?|12\.3|14\.4)-Inch Touch ?Screen Display(?:\s+\$[\d,.]+)?$/i);
  return match?{size:Number(match[2]),nav:!!match[1]}:null;
 });
 if(installed.some(x=>!x)||new Set(installed.map(x=>x.size+':'+x.nav)).size!==1)return null;
 const actual=installed[0];
 if(screen.comparisonValue!==actual.size+' inches')return null;
 return {has:actual.size===rule[3]&&actual.nav===rule[4],evidence:screen.evidence,method:'sticker-radio-system'};
}

const powertrains={
 'jeep-grand-cherokee':{source:'GrandCherokee',text:'2.0L Hurricane 4 Turbo Engine with Engine Stop/Start (ESS) Technology (EC7) and 8-speed Automatic (DCJ/DC1)',engine:/^Engine: 2\.0L Hurricane 4 Turbo Engine with Stop\s*\/\s*Start$/i,transmission:/^Transmission: 8-Speed Automatic(?: 8HP80)? Transmission$/i},
 'ram-3500':{source:'RamHD',text:'6.7L I-6 High-Output (HO) Cummins® Turbo Diesel/8-speed ZF TorqueFlite® Automatic (ETM/DFM)',engine:/^Engine: 6\.7L I6 Cummins HO Turbo Diesel Engine$/i,transmission:/^Transmission: 8-Speed TorqueFlite HD Automatic\s*Transmission$/i,
  // The same 2026 OEM towing sheet calls this ZF Powerline and explicitly
  // pairs the HO diesel exclusively with TorqueFlite HD eight-speed automatic.
  crosswalk:'https://www.ramtrucks.com/content/dam/fca-brands/na/ramtrucks/en_us/towing/towing-capacity-guide/brochure/my26_Ram_HD_Customer_TowPayChart_1.9.pdf'}
};
export function installedPowertrainEvidence(lineup,fact,record){
 const rule=powertrains[lineup?.id];
 if(!rule||lineup.year!==2026||!fact?.factory||fact.sourceUrl!==fleet(rule.source)||fact.text!==rule.text||fact.parent||record?.status!=='verified'||!record.sourceUrl||!Array.isArray(record.lines))return null;
 const engines=record.lines.filter(l=>typeof l==='string'&&/^Engine:/i.test(l)),transmissions=record.lines.filter(l=>typeof l==='string'&&/^Transmission:/i.test(l));
 if(engines.length!==1||transmissions.length!==1||[...engines,...transmissions].some(l=>uncertain.test(l)))return null;
 if(!rule.engine.test(clean(engines[0]))||!rule.transmission.test(clean(transmissions[0])))return null;
 return {has:true,evidence:[...engines,...transmissions,...(rule.crosswalk?['2026 Ram powertrain naming crosswalk: '+rule.crosswalk]:[])],method:'sticker-powertrain'};
}
