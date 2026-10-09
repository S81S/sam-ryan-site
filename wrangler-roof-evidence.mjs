// Installed roof choices replace base equipment printed earlier on the same
// Monroney. Scope the ordering relationships to the reviewed 2026 US 4-door
// gas Wrangler guide; other models, model years and powertrains are untouched.
const orderGuide='https://www.jeepgladiatorforum.com/forum/attachments/2026-4-door-wrangler-pdf.446484/';
const norm=value=>String(value||'').normalize('NFKC').replace(/[\u2010-\u2015]/g,'-').replace(/\s+/g,' ').trim();
const blocked=/\b(?:if equipped|available separately|available with|optional accessory|delete[ds]?|deletion|without|not equipped|not included)\b/i;
const sky=/^Sky One-Touch Power[ -]Top\b/i;
const hard=/^(?:Black|Body[ -]Color) 3[ -]Piece Hard[ -]?Top\b/i;
const soft=/^(?:Black |Premium Black )?Sunrider Soft[ -]?Top\b/i;
const dual=/^Dual Top Group\b/i;
const trimCodes={B:'sport',S:'sport-s',W:'willys',G:'sahara',R:'rubicon',Y:'rubicon-x'};

export function repairWranglerRoofEvidence(vehicle,sticker){
 if(sticker?.status!=='verified'||!vehicle?.vin||sticker.vin!==vehicle.vin||vehicle.year!==2026||sticker.equipmentSectionComplete!==true||
  !Array.isArray(sticker.lines)||!sticker.lines.every(line=>typeof line==='string')||
  !Array.isArray(sticker.identityLines)||!sticker.identityLines.every(line=>typeof line==='string'))return sticker;
 const identity=sticker.identityLines.map(norm),title=norm(vehicle.title),lines=sticker.lines.map(norm);
 if(!/\b2026\b.*\bjeep wrangler\b/i.test(title)||!/\b2026 MODEL YEAR\b/i.test(identity.join(' '))||
  identity.some(line=>/\b20\d{2} MODEL YEAR\b/i.test(line)&&!/\b2026 MODEL YEAR\b/i.test(line))||
  /\b(?:2[ -]door|4xe|hybrid|phev|392|V8|RHD|right[ -]hand|Moab|anniversary|edition)\b/i.test([title,...identity,sticker.engine||''].join(' '))||
  lines.some(line=>/\b(?:anniversary|edition|America\s*250|Rockslide|Whitecap|Willys[ -]41)\b/i.test(line)))return sticker;
 // CPP and engine keep special editions with a generic Sport/Rubicon model
 // line out of this ordinary-trim rule. The suffix is a printed Jeep slogan.
 const modelLines=identity.filter(line=>/\bwrangler\b/i.test(line)).map(line=>line.replace(/ THERE['’]S ONLY ONE\.?$/i,''));
 const models=modelLines.map(line=>line.match(/^(?:JEEP )?WRANGLER 4[ -]DOOR (SPORT(?: S)?|WILLYS|SAHARA|RUBICON(?: X)?) 4X4$/i));
 if(!models.length||models.some(match=>!match))return sticker;
 const packages=lines.filter(line=>/^Customer Preferred Package\b/i.test(line));
 const codes=[...new Set(packages.map(line=>line.match(/^Customer Preferred Package (2[234][BSWGRY])(?:\s+\$[\d,]+)?$/i)?.[1]?.toUpperCase()))];
 if(codes.length!==1||!codes[0]||codes[0]==='23G')return sticker;
 const code=codes[0],trim=trimCodes[code[2]],engine=norm(sticker.engine);
 if(!(code.startsWith('22')?/\b2\.0L\s+I4\b/i:/\b3\.6L\s+V6\b/i).test(engine))return sticker;
 const compatible=trim==='sport-s'||trim==='willys'?['sport',trim]:trim==='rubicon-x'?['rubicon',trim]:[trim];
 if(models.some(match=>!compatible.includes(match[1].toLowerCase().replace(/ /g,'-'))))return sticker;
 const optionIndex=lines.findIndex(line=>/^OPTIONAL EQUIPMENT\b/i.test(line));
 if(optionIndex<0)return sticker;
 const optional=lines.slice(optionIndex+1),roofOptions=optional.filter(line=>sky.test(line)||hard.test(line)||soft.test(line)||dual.test(line));
 if(roofOptions.some(line=>blocked.test(line)))return sticker;
 const skyLine=roofOptions.find(line=>sky.test(line)),hardLine=roofOptions.find(line=>hard.test(line)),
  dualLine=roofOptions.find(line=>dual.test(line)),noSoft=optional.find(line=>/^No Soft[ -]?Top\s*$/i.test(line));
 // Conflicting option records cannot establish one installed roof system.
 if(skyLine&&(hardLine||dualLine)||dualLine&&noSoft)return sticker;
 const features={...sticker.features};
 const set=(id,value,evidence,explanation,page)=>{
  features[id]={value,evidence:[...evidence,explanation],sourceUrl:sticker.sourceUrl,
   method:'sticker-roof-replacement',ruleSourceUrl:orderGuide+'#page='+page};
 };
 if(skyLine){
  const reason='The installed Sky One-Touch Power-Top replaces the starting Sunrider soft top and is incompatible with the separate 3-piece hard top.';
  set('skyRoof',true,[skyLine],reason,11);
  set('softTop',false,[skyLine],reason,11);
  set('hardTop',false,[skyLine],reason,11);
 }else if(dualLine){
  const reason='The listed Dual Top Group includes both a 3-piece hard top and the premium Sunrider soft top.';
  set('softTop',true,[dualLine],reason,17);
  set('hardTop',true,[dualLine],reason,17);
  set('skyRoof',false,[dualLine],'Dual Top Group is incompatible with Sky One-Touch Power-Top.',3);
 }else if(hardLine){
  const page=trim==='sahara'?7:trim.startsWith('rubicon')?11:3;
  set('hardTop',true,[hardLine],'The sticker lists the installed 3-piece hard top.',page);
  // Hardtop/STJ incompatibility is independent of whether a separate soft
  // top was supplied. Do not turn an omitted deletion into softTop=false.
  if(noSoft)set('softTop',false,[hardLine,noSoft],'The sticker explicitly deletes the starting soft top.',page);
  set('skyRoof',false,[hardLine],'The installed 3-piece hard top is incompatible with Sky One-Touch Power-Top.',page);
 }else return sticker;
 return {...sticker,features};
}
