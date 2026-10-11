// Display ratings only. Model/year/variant must all match. Ratings never prove
// which engine is installed, or change the VIN-matching predicate.
const fleet=name=>'https://www.stellantisfleet.com/content/dam/fca-fleet/na/fleet/en_us/shopping-tools/brochures-literature/docs/buyers-guide/2026/26DOMMOP_FBG_'+name+'.pdf';
export const engineOutputSources=[
 {models:['chrysler-voyager'],sourceUrl:'https://www.stellantisfleet.com/chrysler/voyager.html',engines:[['3.6',287,262]]},
 {models:['jeep-grand-wagoneer'],sourceUrl:'https://www.jeep.com/wagoneer/2026/grand-wagoneer/faq.html',engines:[['3.0',420,468]]},
 {models:['ram-promaster'],sourceUrl:'https://www.ramtrucks.com/ram-promaster/specs.html',engines:[['3.6',276,250]]},
 {models:['wrangler','wrangler-2-door'],sourceUrl:'https://www.jeep.com/wrangler/capability.html',engines:[['3.6',285,260],['2.0',270,295],['6.4',470,470]]},
 {models:['jeep-gladiator'],sourceUrl:fleet('Gladiator'),engines:[['3.6',285,260]]},
 {models:['jeep-compass'],sourceUrl:fleet('Compass'),engines:[['2.0',200,221]]},
 {models:['jeep-cherokee'],sourceUrl:fleet('Cherokee'),engines:[['1.6',210,230,'hybrid']],basis:'Combined hybrid system output',engineOnly:{horsepower:177,torqueLbFt:221}},
 {models:['jeep-grand-cherokee','jeep-grand-cherokee#l'],sourceUrl:'https://www.jeep.com/grand-cherokee/capability.html',engines:[['2.0',324,332],['3.6',293,260]]},
 {models:['ram-1500'],sourceUrl:fleet('Ram1500'),engines:[['3.6',305,271],['5.7',395,410],['3.0',420,469,'so'],['3.0',540,521,'ho']]},
 {models:['ram-2500','ram-3500'],sourceUrl:fleet('RamHD'),engines:[['6.4',405,429],['6.7',430,1075,'ho']]},
 {models:['ram-chassis-cab'],sourceUrl:fleet('RamCC'),engines:[['6.4',370,429],['6.7',360,800]]},
 {models:['dodge-durango'],sourceUrl:'https://www.dodge.com/durango/performance.html',engines:[['3.6',295,260],['5.7',360,390],['6.4',475,470],['6.2',710,645]]},
 {models:['dodge-charger'],sourceUrl:'https://www.dodge.com/charger/performance.html',engines:[['3.0',420,468,'so'],['3.0',550,531,'ho']]},
 {models:['chrysler-pacifica'],sourceUrl:fleet('Pacifica'),engines:[['3.6',287,262]]},
 {models:['chrysler-pacifica-hybrid'],sourceUrl:fleet('Pacifica'),engines:[['3.6',260,null,'hybrid']],basis:'Combined plug-in hybrid system output'},
 {year:2027,models:['jeep-cherokee-2027'],sourceUrl:'https://www.prnewswire.com/news-releases/2027-jeep-cherokee-trailhawk-off-road-prowess-adventure-and-efficiency-all-come-standard-302893832.html',engines:[['1.6',210,null,'hybrid']],hybrid:true,basis:'Combined hybrid system output'},
 {year:2027,models:['wrangler-2027','wrangler-2door-2027'],sourceUrl:'https://www.jeep.com/2027/wrangler/faq.html',engines:[['3.6',285,260],['2.0',270,295],['6.4',470,470]]},
 {year:2027,models:['jeep-grand-cherokee-2027'],sourceUrl:'https://www.jeep.com/2027/grand-cherokee/capability.html',engines:[['3.6',293,260],['2.0',324,332]]},
 {year:2027,models:['jeep-grand-wagoneer-2027'],sourceUrl:'https://www.jeep.com/2027/grand-wagoneer/faq.html',engines:[['3.0',420,468]],sizeAlias:/^Hurricane twin-turbo I6$/i},
 {year:2027,models:['ram-1500-2027'],sourceUrl:'https://www.ramtrucks.com/2027/ram-1500/capability.html',engines:[['3.6',305,269],['5.7',395,410],['3.0',420,469,'so'],['3.0',540,521,'ho']]},
 {year:2027,models:['ram-1500-trx-srt-2027'],sourceUrl:'https://www.ramtrucks.com/news/2027-ram-1500-trx-srt-orders-open.html',engines:[['6.2',777,680]]},
 {year:2027,models:['ram-1500-rumble-bee-2027'],sourceUrl:'https://www.ramtrucks.com/news/2027-ram-1500-rumble-bee.html',engines:[['5.7',395,410],['6.4',470,455],['6.2',777,680]]},
 {year:2027,models:['ram-2500-2027'],sourceUrl:'https://www.ramtrucks.com/2027/ram-2500/capability.html',engines:[['6.4',405,429],['6.7',430,1075,'ho']]},
 {year:2027,models:['ram-3500-2027'],sourceUrl:'https://www.ramtrucks.com/2027/ram-3500/capability.html',engines:[['6.4',405,429],['6.7',430,1075,'ho']]},
 {year:2027,models:['ram-chassis-cab-2027'],sourceUrl:'https://www.ramtrucks.com/news/2027-chassis-cab-night-edition.html',engines:[['6.4',375,429,'hd'],['6.7',360,800]]},
 {year:2027,models:['ram-promaster-2027'],sourceUrl:'https://www.ramtrucks.com/2027/ram-promaster/capability.html',engines:[['3.6',276,250]]},
 {year:2027,models:['ram-promaster-city-2027','ram-promaster-city-passenger-2027'],sourceUrl:'https://www.ramtrucks.com/news/2027-ram-promaster-city.html',engines:[['1.6',166,221]]},
 {year:2027,models:['dodge-durango-2027'],sourceUrl:'https://www.dodge.com/2027/durango/performance.html',engines:[['3.6',295,260],['5.7',360,390],['6.4',475,470],['6.2',710,645]]},
 {year:2027,models:['dodge-charger-gas-2027'],sourceUrl:'https://www.dodge.com/2027/charger/performance.html',engines:[['3.0',420,468,'so'],['3.0',550,531,'ho']]},
 {year:2027,models:['chrysler-pacifica-gas-2027'],sourceUrl:'https://www.chrysler.com/news/2027-chrysler-pacifica-debut.html',engines:[['3.6',287,262]]},
 {year:2025,models:['jeep-wagoneer'],sourceUrl:'https://www.jeep.com/wagoneer/2024/wagoneer/capability.html',engines:[['3.0',420,468]]},
 {year:2025,models:['jeep-wrangler-4xe'],sourceUrl:'https://www.jeep.com/2025/wrangler/faq.html',engines:[['2.0',375,470,'hybrid']],hybrid:true,basis:'Combined plug-in hybrid system output'},
 {year:2025,models:['jeep-grand-cherokee-4xe'],sourceUrl:'https://www.jeep.com/grand-cherokee/grand-cherokee-4xe.html',engines:[['2.0',375,470,'hybrid']],hybrid:true,basis:'Combined plug-in hybrid system output'},
 {year:2025,models:['dodge-hornet'],sourceUrl:'https://www.dodge.com/pr/2025/hornet/performance.html',engines:[['2.0',268,295]]},
 {year:2025,models:['dodge-hornet#rt'],sourceUrl:'https://www.dodge.com/pr/2025/hornet.html',engines:[['1.3',288,383,'hybrid']],hybrid:true,basis:'Combined plug-in hybrid system output',note:'Maximum horsepower with PowerShot. The boost is temporary, not continuous engine output.'},
 {models:['jeep-recon'],sourceUrl:'https://www.jeep.com/recon/capability.html',electric:true,engines:[['electric',670,620]],basis:'Maximum combined electric output — Moab',note:'The current Jeep capability page lists 670 hp; the earlier launch material listed 650 hp.',conflictingSourceUrl:'https://www.jeepmediadrive.com/assets/documents/recon/2026-Jeep-Recon-Overview-Press-Release-EE.pdf'},
 {models:['ram-promaster-ev'],sourceUrl:'https://www.ramtrucks.com/electric/2026/ram-promaster-ev/capability.html',electric:true,engines:[['electric',268,302]],basis:'Electric propulsion system output'},
 {models:['dodge-charger-daytona'],sourceUrl:fleet('Charger'),electric:true,engines:[['electric',670,627]],basis:'Maximum combined electric output with PowerShot',note:'630 hp without PowerShot; 670 hp during the temporary PowerShot boost.'},
 {year:2027,models:['dodge-charger-daytona-2027'],sourceUrl:'https://www.dodge.com/2027/charger/performance.html',electric:true,engines:[['electric',670,627]],basis:'Maximum combined electric propulsion output'}
];
export function buyerEngineOutput(lineup,choice,group,selectedTrim=''){
 if(!lineup||choice?.year!==lineup.year||choice.model!==lineup.id||group?.id!=='options-engine')return null;
 if(choice.engineOutput)return choice.engineOutput;
 const row=engineOutputSources.find(r=>(r.year||2026)===lineup.year&&r.models.includes(lineup.id));
 const facts=Object.values(choice.facts||{}),text=[choice.fullLabel||choice.label,typeof choice.value==='string'&&choice.feature!=='factoryChoice'?choice.value:'',...facts.map(f=>f.value||f.text||'')].join(' ').replace(/[®™]/g,'').replace(/\b([SH])\.O\./gi,'$1O').replace(/[\u2010-\u2015]/g,'-');
 const sizes=[...new Set([...text.matchAll(/\b(\d\.\d)\s*-?\s*(?:l\b|liter\b)/gi)].map(m=>m[1]))];if(sizes.length===0&&row?.sizeAlias&&facts.some(f=>row.sizeAlias.test(f.value||'')))sizes.push('3.0');
 if(lineup.id==='dodge-charger-gas-2027'&&lineup.year===2027){
  const offered=Object.entries(choice.facts||{}).filter(([,f])=>['standard','optional'].includes(f.status));
  if(choice.id==='f1ni9uzq'&&sizes.length===1&&sizes[0]==='3.0'&&offered.length&&offered.every(([trim,f])=>['rt','rt-plus'].includes(trim)&&f.sourceUrl==='https://media.stellantisnorthamerica.com/view-spec.do?id=27786'&&f.text==='3.0L Twin-turbo SIXPACK with eight-speed automatic transmission'))return {horsepower:420,torqueLbFt:468,sourceUrl:row.sourceUrl,basis:'R/T SIXPACK standard-output rating'};
  if(choice.id==='f1wuio0z'&&offered.length===1&&offered[0][0]==='super-bee-launch-edition'&&offered[0][1].value==='Twin-turbo SIXPACK gasoline'&&offered[0][1].sourceUrl==='https://www.dodge.com/dodge-muscle/super-bee.html')return {horsepower:600,torqueLbFt:null,display:'600 hp target',basis:'Manufacturer development target',sourceUrl:offered[0][1].sourceUrl,note:'Dodge describes this as a horsepower target. It is not a final certified production rating; no torque figure is supplied on this source.'};
 }
 if(lineup.id==='jeep-wagoneer-s'&&lineup.year===2025&&/dual electric drive motors/i.test(text)){
  const code=/^400-kW/i.test(choice.fullLabel||choice.label)?400:/^500-kW/i.test(choice.fullLabel||choice.label)?500:0;
  if(!code)return null;return {horsepower:code===400?500:600,torqueLbFt:code===400?524:617,sourceUrl:fleet('WagoneerS'),basis:'Combined electric propulsion output',note:code===400?'Limited factory rating.':'Launch Edition maximum factory rating.'};
 }
 if(lineup.year===2023)return legacyOutput(lineup,choice,sizes,text,selectedTrim);
 if(!row)return null;
 if(row.electric){if(sizes.length||!/electric|\bEDM\b|\bkW\b/i.test(text))return null;sizes.push('electric');}
 if(sizes.length!==1)return null;
 const hybrid=!!row.hybrid||/hybrid|phev|4xe|atkinson/i.test(text),ho=/\bHO\b|high[ -]output/i.test(text),so=/\bSO\b|standard[ -]output/i.test(text);
 if(ho&&so)return null;
 const found=row.engines.find(([size,,,variant])=>size===sizes[0]&&(variant==='ho'?ho:variant==='so'?so&&!ho:variant==='hybrid'?hybrid:variant==='hd'?/torqueflite hd|8AP430/i.test(text):!hybrid));
 if(!found)return null;
 const [,horsepower,torqueLbFt]=found;
 return {horsepower,torqueLbFt,sourceUrl:row.sourceUrl,basis:row.basis||'Factory engine rating',...(row.engineOnly?{engineOnly:row.engineOnly}:{}),...(row.note?{note:row.note}:{}),...(row.conflictingSourceUrl?{conflictingSourceUrl:row.conflictingSourceUrl}:{}),
  ...(lineup.id==='ram-1500'&&sizes[0]==='3.6'?{note:'2026 factory specifications list 271 lb-ft; Ram’s retail capability page lists 269 lb-ft.',conflictingSourceUrl:'https://www.ramtrucks.com/ram-1500/capability.html'}:{})};
}

// These older engines vary by trim, transmission or fuel. A broad saved engine
// preference cannot safely inherit the highest available rating.
function legacyOutput(lineup,choice,sizes,text,selectedTrim){
 if(sizes.length!==1)return null;
 const size=sizes[0],scope=Object.entries(choice.facts||{}).filter(([id,f])=>['standard','optional'].includes(f.status)&&(!selectedTrim||id===selectedTrim)).map(([id])=>id);
 const pack=(variants,sourceUrl)=>{if(!variants.length)return null;const unique=[...new Map(variants.map(v=>[JSON.stringify(v),v])).values()],hp=unique.map(v=>v[1]),tq=unique.map(v=>v[2]),range=a=>Math.min(...a)===Math.max(...a)?String(a[0]):Math.min(...a)+'–'+Math.max(...a);return {horsepower:Math.max(...hp),torqueLbFt:Math.max(...tq),display:range(hp)+' hp · '+range(tq)+' lb-ft',sourceUrl,basis:'Factory rating by configuration',note:unique.map(([label,h,t])=>label+': '+h+' hp / '+t+' lb-ft').join('; ')};};
 if(lineup.id==='chrysler-300'){
  const sourceUrl='https://s3.amazonaws.com/chryslermedia.iconicweb.com/mediasite/specs/2023_CH_300_SP44guksaq10cds9bad0v517qa15.pdf';
  if(size==='3.6')return pack([...(scope.some(t=>['touring','touring-l'].includes(t))?[['Touring / Touring L V6',292,260]]:[]),...(scope.includes('300s')?[['300S V6',300,264]]:[])],sourceUrl);
  if(size==='5.7')return pack([['300S V8',363,394]],sourceUrl);
  if(size==='6.4')return pack([['300C',485,475]],'https://blog.stellantisnorthamerica.com/2022/09/13/last-of-a-legend-6-4l-hemi-powered-2023-chrysler-300c-celebrates-iconic-chrysler-300-model/');
 }
 if(lineup.id==='dodge-challenger'){
  const sourceUrl='https://s3.amazonaws.com/chryslermedia.iconicweb.com/mediasite/specs/2023_DG_Challenger_ChallengerSRT_SP.pdf';
  if(size==='3.6')return pack([['3.6L V6',303,268]],sourceUrl);
  if(size==='5.7')return pack([...( !/automatic/i.test(text)?[['6-speed manual',375,410]]:[]),...(!/manual/i.test(text)?[['8-speed automatic',372,400]]:[])],sourceUrl);
  if(size==='6.4')return pack([['6.4L HEMI V8',485,475]],sourceUrl);
  if(size==='6.2'){
   if(scope.includes('srt-demon-170'))return pack([['Demon 170 on E85',1025,945],['Demon 170 on E10',900,810],...(scope.some(t=>/^srt-hellcat-(?:widebody-)?jailbreak$/.test(t))?[['Hellcat Jailbreak',717,656]]:[]),...(scope.includes('black-ghost')?[['Black Ghost',807,707]]:[])],'https://blog.stellantisnorthamerica.com/2023/03/20/the-most-powerful-muscle-car-in-the-world-1025-horsepower-dodge-challenger-srt-demon-170-sets-new-performance-benchmarks/');
   return pack([...(scope.some(t=>/^srt-hellcat-(?:widebody-)?jailbreak$/.test(t))?[['Hellcat Jailbreak',717,656]]:[]),...(scope.some(t=>/redeye|super-stock|black-ghost/.test(t))?[['Redeye Jailbreak / Super Stock / Black Ghost',807,707]]:[])],sourceUrl);
  }
 }
 return null;
}
