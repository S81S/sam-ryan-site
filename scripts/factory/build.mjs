// Builds data/factory/ (index.json plus one file per lineup): for each trim-guide model, every row of the factory's own standard/optional
// chart and the mark it carries for each trim. Sources (extracted by extract_fbg.py / extract_fa.py into factory/sources):
//  - fbg-*: Stellantis fleet buyer's guides (• standard, O optional, P with package, F fleet only; a blank cell is not
//    available).
//  - fa-*: Stellantis media "Feature Availability" charts (S, O, P, NA, F; a cell left empty is not documented).
// A trim is listed only when the chart has a column for exactly that trim. Trims the charts do not cover (special
// editions, packages sold as trims) are left out here and shown by Perfect Match as "not in the factory chart".
// Usage: node scripts/factory/build.mjs
import {readFileSync,writeFileSync,readdirSync,mkdirSync,unlinkSync} from 'node:fs';
export const fileOf=id=>id.replace(/#/g,'--')+'.json';

const root=new URL('../../',import.meta.url);
const read=f=>JSON.parse(readFileSync(new URL(f,root),'utf8'));
const guide=read('trim-standard-data.json');
const colors=read('factory/fbg-colors.json');

// model id → {src: source file(s), trims: {trim id: column (or columns to combine)}, colors: fleet-guide name, fleet}
const W4='Wrangler (four- door) ',W2='Wrangler (two-door) ',WX='Wrangler (four-door) ';
export const MAP={
 'wrangler':{src:'fa-2026-Jeep-Wrangler',colors:'Wrangler',trims:{sport:W4+'Sport','sport-s':W4+'Sport S',sahara:W4+'Sahara',rubicon:W4+'Rubicon','moab-392':W4+'Moab 392'}},
 'wrangler-2-door':{src:'fa-2026-Jeep-Wrangler',colors:'Wrangler',trims:{sport:W2+'Sport','sport-s':W2+'Sport S',rubicon:W2+'Rubicon'}},
 'jeep-gladiator':{src:'fa-2026-Jeep-Gladiator',colors:'Gladiator',trims:{sport:'Sport','sport-s':'Sport S',willys:'Willys',rubicon:'Rubicon',mojave:'Mojave'}},
 'jeep-compass':{src:'fbg-2026-Compass',colors:'Compass',trims:{'latitude-altitude':'2DN','limited-altitude':'2DW',trailhawk:'2DE'}},
 'jeep-cherokee':{src:'fbg-2026-Cherokee',colors:'Cherokee',trims:{cherokee:'2TL',laredo:'2TF',limited:'2TG',overland:'2TQ'}},
 // The Grand Cherokee guide holds two charts with the same columns: the two-row model (pages 1-5) and the Grand Cherokee L
 // (pages 6-10). They share one trim-guide model and one stock list, told apart by the vehicle title.
 'jeep-grand-cherokee':{src:'fbg-2026-GrandCherokee',pages:[1,5],stock:{not:'\\bGRAND CHEROKEE L\\b'},colors:'GrandCherokee',trims:{'laredo-altitude':'2TB',limited:'2TE','limited-reserve':'2TR',summit:'2TU'}},
 'jeep-grand-cherokee#l':{model:'jeep-grand-cherokee',src:'fbg-2026-GrandCherokee',pages:[6,10],stock:{only:'\\bGRAND CHEROKEE L\\b'},split:'Grand Cherokee L',colors:'GrandCherokee',trims:{'laredo-altitude':'2TB',limited:'2TE','limited-reserve':'2TR',summit:'2TU'}},
 'jeep-grand-wagoneer':{src:'fa-2026-Jeep-Grand-Wagoneer',colors:'Wagoneer',trims:{'grand-wagoneer':['Grand Wagoneer','Grand Wagoneer L'],limited:['Grand Wagoneer Limited','Grand Wagoneer Limited L'],summit:['Grand Wagoneer Summit','Grand Wagoneer Summit L']},versions:'standard or L length'},
 'jeep-wagoneer-s':{src:'fbg-2025-WagoneerS',colors:'WagoneerS',trims:{limited:'2TD','launch-edition':'2TE'}},
 'jeep-recon':{src:'fa-2026-Jeep-Recon',trims:{moab:'Moab Trim'}},
 'jeep-wrangler-4xe':{src:'fa-2025-Jeep-Wrangler-4xe',colors:'Wrangler',trims:{'sport-s-4xe':WX+'Sport S 4xe','willys-4xe':WX+'Willys 4xe','sahara-4xe':WX+'Sahara 4xe','rubicon-4xe':WX+'Rubicon 4xe','high-altitude-4xe':WX+'High Altitude 4xe'}},
 'jeep-grand-cherokee-4xe':{src:'fa-2025-Jeep-Grand-Cherokee-4xe',colors:'GrandCherokee',trims:{'4xe':'4xe','trailhawk-4xe':'4xe Trailhawk','overland-4xe':'4xe Overland','summit-4xe':'4xe Summit'}},
 'jeep-wagoneer':{src:'fa-2025-Jeep-Wagoneer-Grand-Wagoneer',colors:'Wagoneer',trims:{wagoneer:'Wagoneer','series-ii':'Wagoneer Series II','series-iii':'Wagoneer Series III'}},
 'ram-1500':{src:'fbg-2026-Ram1500',colors:'Ram1500',trims:{tradesman:'A',express:'D',warlock:'B','big-horn-lone-star':'Z/R',laramie:'H',rebel:'W',limited:'M','limited-longhorn':'K',tungsten:'V'}},
 'ram-2500':{src:'fbg-2026-RamHD',only:'2500',colors:'RamHD',trims:{tradesman:'2TA','black-express':'2TC',warlock:'2TB','big-horn-lone-star':'2TZ/2TY',rebel:'2TR','power-wagon':'2TP',laramie:'2TH','limited-longhorn':'2TK',limited:'2TM'}},
 'ram-3500':{src:'fbg-2026-RamHD',only:'3500',colors:'RamHD',trims:{tradesman:'2TA','big-horn-lone-star':'2TZ/2TY',laramie:'2TH','limited-longhorn':'2TK',limited:'2TM'}},
 'ram-chassis-cab':{src:'fbg-2026-RamCC',colors:'RamCC',fleet:true,trims:{tradesman:'2TA','big-horn':'2TZ'}},
 'dodge-durango':{src:'fa-2026-Dodge-Durango-Durango-SRT',colors:'Durango',trims:{gt:'GT','gt-plus':'GT PLUS','gt-hemi':'GT HEMI','gt-hemi-plus':'GT HEMI Plus','gt-hemi-premium':'GT HEMI Premium','rt-392':'R/T 392 Launch Edition','rt-392-premium':'R/T 392 Premium Launch Edition','srt-hellcat':'SRT Hellcat','srt-hellcat-jailbreak':'SRT Hellcat Jailbreak'}},
 'dodge-charger':{src:'fa-2026-Dodge-Charger-SIXPACK-engine',colors:'Charger',trims:{rt:'R/T','rt-plus':'R/T Plus','scat-pack':'Scat Pack','scat-pack-plus':'Scat Pack Plus'}},
 'dodge-charger-daytona':{src:'fa-2026-Dodge-Charger-Daytona',colors:'Charger',trims:{'daytona-scat-pack':['Scat Pack Two-door','Scat Pack Four-door'],'daytona-scat-pack-plus':['Scat Pack Plus Two-door','Scat Pack Plus Four-door']},versions:'two-door or four-door'},
 // The Hornet GT and R/T have separate charts with their own wording, so they are walked as two lineups.
 'dodge-hornet':{src:'fa-2025-Dodge-Hornet-GT',trims:{gt:'GT','gt-plus':'GT Plus'},split:'Hornet GT'},
 'dodge-hornet#rt':{model:'dodge-hornet',src:'fa-2025-Dodge-Hornet-R-T',trims:{rt:'R/T','rt-plus':'R/T Plus'},split:'Hornet R/T'},
 'chrysler-pacifica':{src:'fbg-2026-Pacifica',colors:'Pacifica',trims:{select:'2DL',limited:'2DP',pinnacle:'2DS'}},
 'chrysler-pacifica-hybrid':{src:'fbg-2026-Pacifica',colors:'Pacifica',trims:{select:'2DP/2DT',pinnacle:'2DS#2'}},
 'chrysler-voyager':{src:'fbg-2026-Pacifica',colors:'Pacifica',trims:{lx:'2DE'}},
 'ram-1500-2027':{src:'fa-2027-Ram-1500',trims:{tradesman:'TRADESMAN',express:'EXPRESS',warlock:'WARLOCK','big-horn-lone-star':'BIGHORN/ LONESTAR',laramie:'LARAMIE',rebel:'REBEL',limited:'LIMITED','limited-longhorn':'LIMITED LONGHORN',tungsten:'TUNGSTEN',rho:'RHO'}},
 'ram-1500-trx-srt-2027':{src:'fa-2027-Ram-1500',trims:{'trx-srt':'TRXSRT'}},
 'ram-1500-rumble-bee-2027':{src:'fa-2027-Ram-1500',trims:{'rumble-bee':'RUMBLEBEE','rumble-bee-392':'RUMBLEBEE392/ 392TRACKPACK','rumble-bee-srt':'RUMBLEBEESRT'}},
 // The 2027 heavy-duty chart prints its trim names one letter at a time, out of order; the columns are, left to right,
 // Tradesman, Black Express, Warlock, Big Horn/Lone Star, Power Wagon, Rebel, Laramie, Limited Longhorn, Limited.
 'ram-2500-2027':{src:'fa-2027-Ram-2500-3500-Heavy-Duty',only:'2500',trims:{tradesman:'TDARSEMNA','black-express':'SSE KCA R PXE L B',warlock:'WRALOKC','big-horn-lone-star':'BIGHONR/ LONESTRA','power-wagon':'POWER WAOGN',rebel:'REBEL',laramie:'LARAMIE','limited-longhorn':'LIMITED LONGHONR',limited:'LIMITED'}},
 'ram-3500-2027':{src:'fa-2027-Ram-2500-3500-Heavy-Duty',only:'3500',trims:{tradesman:'TDARSEMNA','big-horn':'BIGHONR/ LONESTRA',laramie:'LARAMIE','limited-longhorn':'LIMITED LONGHONR',limited:'LIMITED'}},
 'ram-chassis-cab-2027':{src:'fa-2027-Ram-3500-4500-5500-Chassis-Cab',fleet:true,trims:{'big-horn':'BIG HORN'}},
 'ram-promaster-city-2027':{src:'fa-2027-Ram-Professional-ProMaster-City',fleet:true,trims:{tradesman:'Tradesman Cargo Van',slt:'SLT Cargo Van'}},
 'ram-promaster-city-passenger-2027':{src:'fa-2027-Ram-Professional-ProMaster-City',fleet:true,trims:{tradesman:'Tradesman Passenger Van',slt:'SLT Passenger Van'}},
 'dodge-durango-2027':{src:'fa-2027-Dodge-Durango-Durango-SRT',colors:'Durango',trims:{'gt-hemi':'GT HEMI','gt-hemi-plus':'GT HEMI Plus','gt-hemi-premium':'GT HEMI Premium','rt-392':'R/T 392','rt-392-plus':'R/T 392 Plus','rt-392-premium':'R/T 392 Premium','srt-hellcat':'SRT Hellcat','srt-hellcat-jailbreak':'SRT Hellcat Jailbreak'}},
 'dodge-charger-gas-2027':{src:'fa-2027-Dodge-Charger-SIXPACK-engine',colors:'Charger',trims:{rt:'R/T','rt-plus':'R/T Plus','scat-pack':'Scat Pack','scat-pack-plus':'Scat Pack Plus'}},
 'dodge-charger-daytona-2027':{src:'fa-2027-Dodge-Charger-Daytona-Scat-Pack',colors:'Charger',trims:{'daytona-scat-pack':'Daytona Scat Pack','daytona-scat-pack-plus':'Daytona Scat Pack Plus'}},
 'chrysler-pacifica-gas-2027':{src:'fa-2027-Chrysler-Pacifica',colors:'Pacifica',trims:{lx:'Pacifica LX',select:'Pacifica Select',limited:'Pacifica Limited',pinnacle:'Pacifica Pinnacle'}}
};
// Fleet lineups sold to businesses: shown in Fleet Match, not in the retail Perfect Match. The ProMaster vans have no
// trim columns in the factory charts (their columns are body styles), so they keep the trim guide's rows.
export const FLEET=['ram-chassis-cab','ram-chassis-cab-2027','ram-promaster','ram-promaster-ev','ram-promaster-2027','ram-promaster-city-2027','ram-promaster-city-passenger-2027'];

// One mark per cell: S standard, O optional, P part of a package, F fleet only, NA not offered, '' not documented.
// Combinations keep their parts ("S/P", "O/F"). Two columns combined into one trim that disagree keep both ("S~NA").
function mark(raw,fbg){
 if(raw==null||raw==='')return fbg?'NA':'';
 const parts=String(raw).replace(/•/g,'S').replace(/0/g,'O').replace(/[—–-]/g,'NA').replace(/N\/A/g,'NA').split('/').map(s=>s.trim()).filter(Boolean);
 return [...new Set(parts)].join('/');
}
// Chart text as printed, minus PDF artifacts: private-use glyphs, words broken across lines ("variable- valve").
const clean=t=>String(t||'').replace(/[\uE000-\uF8FF\u00AD]/g,'').replace(/^[^A-Za-z0-9(“"']+/,'').replace(/([a-z])- (?!and |or |to )([a-z])/g,'$1-$2').replace(/\s+/g,' ').trim();
// The heavy-duty chart covers the 2500 and the 3500 in one table: rows it marks for one of them only ("(2500 only)",
// "3500 Axle Ratios", dual-rear-wheel equipment, which only the 3500 has) are left out of the other lineup.
function otherModelOnly(r,only){
 const s=`${r.parent||''} ${r.text||''}`,parent=String(r.parent||'');
 const only3500=(/\b3500\b[^;]*\bonly\b/.test(s)&&!/\b2500\b/.test(s))||/^3500\b/.test(parent)||(/\b(?:DRW|Dual Rear Wheel)\b/i.test(s)&&!/\b2500\b|\bSRW\b|Single Rear/i.test(s));
 // The Power Wagon is a 2500; "(2500 HEMI ... only)" stays 2500-only even when the row also mentions a 3500 part.
 const only2500=(/\b2500\b[^;]*\bonly\b/.test(s)&&!/\b3500\b/.test(s))||/\(2500\b[^()]*\bonly\b/.test(s)||/^2500\b/.test(parent)||/\bPower Wagon\b/.test(s);
 return only==='2500'?only3500:only==='3500'?only2500:false;
}
// "Rear antispin (2500: optional; ...; 3500: standard)" is printed as "O/•": the first mark is the 2500's, the second the
// 3500's.
function perModel(r,only){
 const m=/\b2500:\s*(standard|optional)\b[^)]*\b3500:\s*(standard|optional)\b/i.exec(r.text||'');
 if(!m||!only)return x=>x;
 const want=(only==='2500'?m[1]:m[2]).toLowerCase()==='standard'?'S':'O';
 return x=>x&&x.includes('/')&&x.split('/').every(p=>p==='S'||p==='O')?want:x;
}
function combine(marks){
 const known=[...new Set(marks.filter(Boolean))];
 return known.length<=1?(known[0]||''):known.join('~');
}

const out={generatedAt:new Date().toISOString().slice(0,10),models:{}};
const problems=[];
for(const [id,cfg] of Object.entries(MAP)){
 const modelId=cfg.model||id,model=guide.models.find(m=>m.id===modelId);
 if(!model){problems.push(`${id}: no trim-guide model`);continue;}
 const src=read(`factory/sources/${cfg.src}.json`),fbg=src.kind==='fbg';
 const trimIds=Object.keys(cfg.trims).filter(t=>{const ok=model.trims.some(x=>x.id===t);if(!ok)problems.push(`${id}: no guide trim ${t}`);return ok;});
 const columns=new Set(fbg?src.columns.map(c=>c.code):src.rows.flatMap(r=>Object.keys(r.marks)));
 for(const t of trimIds)for(const c of [cfg.trims[t]].flat())if(!columns.has(c))problems.push(`${id}/${t}: no column "${c}" in ${cfg.src}`);
 const rows=[],seen=new Map();
 for(const r of src.rows){
  if(!r.text||/^(?:NOTE|Note):/.test(r.text)||otherModelOnly(r,cfg.only))continue;
  if(cfg.pages&&(r.page<cfg.pages[0]||r.page>cfg.pages[1]))continue;
  const split=perModel(r,cfg.only);
  const cells=trimIds.map(t=>combine([cfg.trims[t]].flat().map(c=>split(mark(r.marks[c],fbg)))));
  // A row with nothing documented for any trim in this lineup belongs to another lineup in the same chart.
  if(cells.every(c=>c===''||c==='NA'))continue;
  rows.push([clean(r.section),clean(r.parent),clean(r.text),cells]);
 }
 // Keys: the row's own words, numbered when a chart repeats a line.
 for(const row of rows){const k=(row[0]+'|'+row[1]+'|'+row[2]).toLowerCase().replace(/[^a-z0-9|]+/g,' ').trim();const n=(seen.get(k)||0)+1;seen.set(k,n);row.unshift('f:'+k.replace(/\s+/g,'-').slice(0,90)+(n>1?'-'+n:''));}
 const paint=cfg.colors&&colors[cfg.colors]?.colors||[];
 out.models[id]={model:modelId,name:cfg.split||null,fleet:!!cfg.fleet||FLEET.includes(modelId),versions:cfg.versions||null,
  source:{kind:src.kind,title:src.title,url:src.url},colors:paint.map(c=>c.replace(/\*$/,'').replace(/^‘/,"'")),colorsUrl:cfg.colors?colors[cfg.colors]?.url:null,
  stock:cfg.stock||null,trims:trimIds,rows};
}
// One small index for the lineup picker, and one file per lineup loaded when a shopper opens it.
mkdirSync(new URL('data/factory/',root),{recursive:true});
for(const f of readdirSync(new URL('data/factory/',root)))if(f.endsWith('.json'))unlinkSync(new URL('data/factory/'+f,root));
const index={generatedAt:out.generatedAt,models:{}};
for(const [id,m] of Object.entries(out.models)){
 const {rows,...meta}=m;index.models[id]={...meta,file:fileOf(id)};
 writeFileSync(new URL('data/factory/'+fileOf(id),root),JSON.stringify({id,...m}));
}
writeFileSync(new URL('data/factory/index.json',root),JSON.stringify(index));
for(const [id,m] of Object.entries(out.models))console.log(id.padEnd(34),String(m.rows.length).padStart(4),'rows',m.trims.join(','));
if(problems.length){console.error('PROBLEMS:\n'+problems.join('\n'));process.exitCode=1;}
