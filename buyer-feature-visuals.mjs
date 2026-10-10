// Sourced specifications, illustrated schematically. These are never presented
// as photographs, exact vehicle hardware, screen interfaces or paint samples.
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=value=>String(value||'').normalize('NFKC').replace(/[®™]/g,'').replace(/[\u2010-\u2015]/g,'-').replace(/\s+/g,' ').trim();
const numberWords={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,twelve:12,nineteen:19};
const numeric=text=>text.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve|nineteen)\b/gi,s=>numberWords[s.toLowerCase()]);
const unique=values=>[...new Set(values.filter(Boolean))];
const positive=(text,word)=>new RegExp(word,'i').test(text)&&!new RegExp('(?:no|without|not|delete[ds]?)\\s+(?:\\w+\\s+){0,2}(?:'+word+')','i').test(text);
const categoryKinds={engine:'engine',transmission:'transmission',roof:'roof',upholstery:'seat','driver-seat':'seat','passenger-seat':'seat','front-seat-adjustment':'seat',screen:'screen',cluster:'screen',audio:'audio',climate:'climate',paint:'color','interior-color':'color','roof-finish':'color',wheels:'wheel',tires:'wheel','spare-tire':'wheel','spare-wheel':'wheel',drive:'drivetrain',transfer:'drivetrain','rear-differential':'drivetrain','front-differential':'drivetrain','axle-ratio':'drivetrain',body:'body',headlamps:'lighting','fuel-tank':'fuel','exterior-mirrors':'mirror','steering-column':'steering','floor-covering':'floor','floor-mats':'floor','tailgate-operation':'tailgate','liftgate-operation':'tailgate','rock-rails':'offroad',bumpers:'offroad','tow-hooks':'tow','tire-package':'wheel'};
function kindFor(category,text,isPackage=false){
 const key=category.replace(/^options-/,'');if(categoryKinds[key])return categoryKinds[key];
 if(isPackage)return 'package';
 if(/heatedwheel|steering/.test(key+' '+text))return 'steering';
 if(/engine|powertrain|\b[iv][ -]?[468]\b|\bliter\b/.test(text))return 'engine';
 if(/transmission|[ -]speed (?:manual|automatic)/.test(text))return 'transmission';
 if(/(?:soft|hard)[ -]?top|sunrider|sky one|sunroof|panoramic|\btops?:/.test(text))return 'roof';
 if(/seat|upholstery|leather|cloth|vinyl|lumbar/.test(text))return 'seat';
 if(/display|touchscreen|uconnect|head.up/.test(text))return 'screen';
 if(/speaker|audio|harman|alpine|mcintosh|sound system/.test(text))return 'audio';
 if(/air conditioning|climate|temperature control/.test(text))return 'climate';
 if(/wheel|tire/.test(text))return 'wheel';
 if(/differential|transfer case|[24]wd|[24]x[24]|wheel drive|axle|sway.bar/.test(text))return 'drivetrain';
 if(/winch|tow|hitch|trailer/.test(text))return 'tow';
 if(/skid|off.road|rock rail|bumper|side step|running board|suspension/.test(text))return 'offroad';
 if(/camera|park|blind.spot|cruise|collision|cross.path|cross.traffic|lane|braking|pedestrian|night.vision/.test(text))return 'safety';
 if(/headlamp|headlight|fog.lamp|lighting|high.beam/.test(text))return 'lighting';
 if(/windshield|wipers?/.test(text))return 'wipers';
 if(/mirror/.test(text))return 'mirror';
 if(/fuel tank/.test(text))return 'fuel';
 if(/floor|carpet|mat\b/.test(text))return 'floor';
 if(/tailgate|liftgate/.test(text))return 'tailgate';
 if(/paint|color|colour|appearance|badge|graphics|edition identification/.test(text))return 'color';
 if(/charging|phone|navigation|carplay|android|wi.fi|media|usb|connect/.test(text))return 'connectivity';
 if(/start|entry|key|opener|switch|outlet|power|control/.test(text))return 'controls';
 if(/door|cab|body|box|cargo|storage/.test(text))return 'body';
 return 'equipment';
}
function engineSpecs(text){
 return text.split(/\s+or\s+/i).map(part=>{
  const t=numeric(part),layout=t.match(/\b([iv])[ -]?([468])\b|\b(inline|in-line|straight)[ -]?([468])(?:[ -]cylinder)?\b/i),size=t.match(/\b(\d(?:\.\d)?)\s*-?\s*(?:l\b|liters?\b)/i);
  return {size:size?.[1]||'',layout:layout?(layout[1]?.toUpperCase()||'I'):'',cylinders:Number(layout?.[2]||layout?.[4])||null,turbo:positive(t,'turbo'),hybrid:positive(t,'hybrid|phev|4xe'),electric:positive(t,'electric|battery-electric')};
 }).filter(s=>s.size||s.cylinders||s.hybrid||s.electric).slice(0,2);
}
function dimensions(text){return unique([...numeric(text).matchAll(/\b(\d+(?:\.\d+)?)\s*(?:[ -]?(?:inch(?:es)?|in\.)(?!\w)|[″"])/gi)].map(m=>m[1]));}
function commonFactValue(choice,fact){
 if(fact)return clean(fact.value||fact.detail);
 const values=unique(Object.values(choice.facts||{}).map(f=>clean(f.value||f.detail)));
 return values.length===1?values[0]:Object.keys(choice.facts||{}).length?'':clean(choice.detail);
}
export function describeBuyerFeatureVisual(choice={},options={}){
 const label=clean(choice.fullLabel||choice.label||'Factory equipment'),detail=commonFactValue(choice,options.fact),text=clean(label+' '+detail),lower=text.toLowerCase(),n=numeric(lower),category=String(options.category||'');
 const kind=kindFor(category,lower,Boolean(choice.package));
 const brands=[...new Map([...text.matchAll(/Harman[ -]Kardon|Alpine|McIntosh|Klipsch|Bose|JBL/gi)].map(m=>[m[0].toLowerCase().replace('-',' '),m[0]])).values()],audioBrand=brands.length===1?brands[0]:'';
 const sizes=dimensions(text),speakerMatch=n.match(/\b(\d{1,2})[ -]?(?:amplified |premium )?speakers?\b|\bspeakers?\s*:\s*(\d{1,2})\b/i);
 const transmissions=[...n.matchAll(/\b(\d{1,2})[ -]speed(?:\s+(manual|automatic))?\b/g)].map(m=>({speed:Number(m[1]),type:m[2]||''})),speeds=unique(transmissions.map(t=>t.speed)),ways=unique([...n.matchAll(/\b(\d{1,2})[ -]way\b/g)].map(m=>Number(m[1])));
 const material=lower.match(/leatherette|vinyl|cloth|suede|alcantara|leather|mckinley|capri|nappa|palermo/)?.[0]||'';
 const roof=/dual[ -]?top/.test(lower)?'dual':/sky one|power.top/.test(lower)?'sliding':/soft[ -]?top|sunrider/.test(lower)?'soft':/hard[ -]?top|three.piece|3.piece/.test(lower)?'hard':/panoramic/.test(lower)?'panoramic':/sunroof/.test(lower)?'sunroof':'roof';
 const colorName=lower.match(/\b(?:black|white|red|blue|green|silver|gray|grey|orange|yellow|brown|tan|beige|bronze|purple)\b/)?.[0]||'';
 const packageText=clean(options.includes??choice.includes??choice.detail);
 const components=kind==='package'?unique(packageText.split(/[;,]/).filter(s=>!/(?:if equipped|requires?|available|only with|not included|delete|without)/i.test(s)).map(s=>kindFor('',s.toLowerCase())).filter(k=>k!=='equipment'&&k!=='package')).slice(0,4):[];
 const chips=[];
 if(kind==='engine')for(const e of engineSpecs(text)){const label=[e.size?e.size+' L':'',e.layout&&e.cylinders?e.layout+e.cylinders:'',e.turbo?'Turbo':'',e.hybrid?'Hybrid':'',e.electric?'Electric':''].filter(Boolean).join(' · ');if(label)chips.push(label);}
 if(['engine','transmission'].includes(kind))for(const t of transmissions)chips.push(t.speed+'-speed'+(t.type?' '+t.type:''));
 if(kind==='screen')for(const size of sizes.slice(0,3))chips.push(size+' inches');
 if(kind==='wheel'){const wheelDimensions=text.match(/\b(\d{2})\s*[x×]\s*(\d+(?:\.\d+)?)[ -]?inch/i);if(wheelDimensions)chips.push(wheelDimensions[1]+' × '+wheelDimensions[2]+' inches');else for(const size of sizes.slice(0,3))chips.push(size+' inches');}
 if(kind==='audio'){if(speakerMatch)chips.push((speakerMatch[1]||speakerMatch[2])+' speakers');if(audioBrand)chips.push(audioBrand);}
 if(kind==='seat'){if(material)chips.push(material[0].toUpperCase()+material.slice(1));for(const way of ways)chips.push(way+'-way');if(positive(lower,'heated'))chips.push('Heated');if(positive(lower,'ventilat'))chips.push('Ventilated');}
 if(kind==='drivetrain'){const drive=text.match(/\b[24]x[24]\b|\b[24]WD\b|\bAWD\b/i)?.[0],ratio=text.match(/\b\d(?:\.\d+)?:1\b/)?.[0];if(drive)chips.push(drive);if(ratio)chips.push(ratio);}
 if(kind==='color'&&colorName)chips.push(colorName[0].toUpperCase()+colorName.slice(1));
 if(kind==='fuel'){const gallons=n.match(/\b(\d+(?:\.\d+)?)[ -]gallon/)?.[1];if(gallons)chips.push(gallons+' gallons');}
 return {kind,label,sourceText:text,category,chips:unique(chips).slice(0,3),engines:engineSpecs(text),speeds,ways,sizes,audioBrand,speakers:speakerMatch?Number(speakerMatch[1]||speakerMatch[2]):null,material,roof,roofPanels:/\b3[ -]piece/.test(n)?3:null,colorName,components,
  heated:positive(lower,'heated'),ventilated:positive(lower,'ventilat'),massage:positive(lower,'massag'),power:positive(lower,'power'),bench:/bench|40\/20\/40/.test(lower),rear:/rear|second.row|third.row/.test(lower),
  note:kind==='screen'?'Screen schematic · Actual layout varies':kind==='color'?'Illustrative color · View actual vehicle photos':'Feature illustration · Not a vehicle photograph'};
}

const gold='#e6bf86',ice='#a6d6e8',ink='#15232e',light='#f1e3d0',muted='#93a8b5';
const path=(d,extra='')=>`<path d="${d}" ${extra}/>`;
const rect=(x,y,w,h,r=8,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ${extra}/>`;
const circle=(x,y,r,extra='')=>`<circle cx="${x}" cy="${y}" r="${r}" ${extra}/>`;
const text=(x,y,value,size=18,extra='')=>`<text x="${x}" y="${y}" fill="${light}" stroke="none" font-size="${size}" text-anchor="middle" ${extra}>${esc(value)}</text>`;
const group=(content,transform='',extra='')=>`<g${transform?` transform="${transform}"`:''} ${extra}>${content}</g>`;
const arrow=(x1,y1,x2,y2)=>path(`M${x1} ${y1}L${x2} ${y2}m-7 -5l7 5-7 5`);
function gear(cx,cy,r=44){return group(circle(0,0,r)+circle(0,0,r*.48)+Array.from({length:8},(_,i)=>group(rect(-6,-r-10,12,20,2),`rotate(${i*45})`)).join(''),`translate(${cx} ${cy})`);}
function carTop(){return rect(214,91,212,187,48,`fill="${ink}"`)+rect(243,125,154,65,20,`stroke="${muted}"`)+path('M243 225H397M230 100l-15 -12M410 100l15 -12')+rect(199,120,15,42,5)+rect(426,120,15,42,5)+rect(199,217,15,42,5)+rect(426,217,15,42,5);}
function wheel(cx,cy,r=65){return circle(cx,cy,r,`fill="#101820"`)+circle(cx,cy,r*.72,`stroke="${muted}"`)+circle(cx,cy,r*.3)+Array.from({length:8},(_,i)=>{const a=i*Math.PI/4;return circle(cx+Math.cos(a)*r*.51,cy+Math.sin(a)*r*.51,4,`fill="${gold}" stroke="none"`);}).join('');}
function seat(cx=310,cy=185,scale=1){return group(path('M-39 -57Q-42 -73-22 -74H11Q27 -73 28 -57L37 3Q39 16 20 17H-21Q-33 16-34 4Z',`fill="${ink}"`)+rect(-29,-99,47,26,8,`fill="${ink}"`)+path('M-28 18H44Q55 18 57 34Q58 50 45 51H-23Q-41 49-39 33Z',`fill="${ink}"`)+path('M-27 52L-20 76H38M36 53L41 75'),`translate(${cx} ${cy}) scale(${scale})`);}
function engineDraw(spec,cx=320,scale=1){
 if(spec?.electric&&!spec?.cylinders)return group(circle(0,0,76,`fill="${ink}"`)+circle(0,0,43,`stroke="${ice}"`)+path('M-14 -34L-33 10H-3L-14 37 27-13H3L14-34')+rect(-142,-33,52,67,8,`fill="${ink}"`)+path('M-90 0H-76M76 0H130M130-18v36'),`translate(${cx} 188) scale(${scale})`);
 const count=spec?.cylinders||0,isV=spec?.layout==='V';
 let out=rect(-111,-63,222,132,18,`fill="${ink}"`)+path('M-80 -64V-82H80V-64M-114 -10H-132V39H-114M-62 70V91H63V70');
 if(count){for(let i=0;i<count;i++){const column=isV?i%2:i,row=isV?Math.floor(i/2):0,x=isV?(column?42:-42):-((count-1)*25)/2+i*25,y=isV?-33+row*31:0;out+=circle(x,y,isV?11:9,`fill="${ice}" stroke="none"`);}if(isV)out+=path('M-16 -40L0 50 16 -40',`stroke="${muted}"`);}
 else out+=path('M-70 0H70M-50 -25V25M0 -25V25M50 -25V25',`stroke="${muted}"`);
 if(spec?.turbo)out+=circle(118,-65,26,`fill="${ink}" stroke="${ice}"`)+path('M118 -78q25 4 7 26q-24 10-21-13q4-17 16-2M136 -46h22v-19',`stroke="${ice}"`);
 if(spec?.hybrid||spec?.electric)out+=rect(-63,96,126,39,6,`fill="${ink}" stroke="${ice}"`)+path('M8 103L-6 119H5L-5 129',`stroke="${ice}"`);
 return group(out,`translate(${cx} 177) scale(${scale})`);
}
function draw(d){
 const lower=d.sourceText.toLowerCase();
 switch(d.kind){
 case 'engine':return d.engines.length>1?engineDraw(d.engines[0],190,.8)+engineDraw(d.engines[1],450,.8)+text(320,185,'or',18):engineDraw(d.engines[0]);
 case 'transmission':{const speed=d.speeds.length===1?d.speeds[0]:null;return gear(283,167,64)+gear(378,218,42)+(speed?Array.from({length:Math.min(speed,10)},(_,i)=>rect(133+i*38,288,30,30,6,`fill="${ink}"`)+text(148+i*38,309,i+1,15)).join(''):path('M176 269H450'))+text(320,105,/manual/.test(lower)&&/automatic/.test(lower)?'GEARBOX OPTIONS':/manual/.test(lower)?'MANUAL':/automatic/.test(lower)?'AUTOMATIC':'GEARBOX',17);}
 case 'roof':{let roof=carTop();if(d.roof==='soft'||d.roof==='sliding')roof+=path('M254 145q22 -24 44 0t44 0t44 0M254 162q22 -24 44 0t44 0t44 0',`stroke-dasharray="5 4" stroke="${gold}"`)+arrow(280,209,369,209);else if(d.roof==='hard')roof+=rect(244,133,146,90,7,`fill="#485763"`)+(d.roofPanels===3?path('M317 133V193M244 193H390'):'');else if(d.roof==='dual')roof=group(carTop()+path('M245 135H392V208H245Z'), 'translate(-125 0) scale(.9)')+group(path('M368 142q24 -25 48 0t48 0M368 160q24 -25 48 0t48 0M368 178q24 -25 48 0t48 0'),'',`stroke="${ice}"`)+text(435,231,'+ SOFT TOP',15);else roof+=rect(246,131,147,d.roof==='panoramic'?119:62,13,`fill="#416475" fill-opacity=".75" stroke="${ice}"`)+(d.roof==='panoramic'&&/dual|two|2[ -]pane/.test(lower)?path('M248 188H391',`stroke="${ice}"`):'');return roof;}
 case 'seat':{let s=d.bench?rect(207,127,226,88,14,`fill="${ink}"`)+rect(198,218,244,40,12,`fill="${ink}"`)+path('M297 128V256M343 128V256M230 261v19H410v-19')+rect(229,105,47,23,6)+rect(367,105,47,23,6):seat(311,184,1.12);if(d.material==='cloth')s+=Array.from({length:6},(_,i)=>path(`M285 ${139+i*10}h49`, `stroke="${muted}" stroke-dasharray="3 4"`)).join('');else if(d.material)s+=path('M290 135L318 168 291 191M326 135L299 168 329 191',`stroke="${muted}"`);if(d.heated)s+=group(path('M235 212q-15-12 0-24t0-24M212 216q-15-12 0-24t0-24M189 212q-15-12 0-24t0-24'),'', 'stroke="#f3ab6d"');if(d.ventilated)s+=group(arrow(374,155,418,155)+arrow(374,180,418,180)+arrow(374,205,418,205),'',`stroke="${ice}"`);if(d.massage)s+=circle(302,160,9,`stroke="${ice}"`)+circle(316,182,9,`stroke="${ice}"`);if(d.ways.length||d.power)s+=arrow(243,288,388,288)+path('M250 283l-7 5 7 5');return s+text(320,92,d.rear?'REAR SEATING':/passenger/.test(lower)?'PASSENGER SEAT':/driver/.test(lower)?'DRIVER SEAT':'SEATING',15);}
 case 'screen':{const cluster=/cluster|instrument|driver information/.test(lower)||/cluster/.test(d.category);return rect(125,108,390,199,24,`fill="#0b151e"`)+rect(143,126,354,157,12,`fill="#1e3644" stroke="${ice}"`)+path('M157 272L482 137',`stroke="${muted}" stroke-dasharray="6 7"`)+text(320,198,d.sizes.length===1?d.sizes[0]+'″':'DISPLAY',d.sizes.length===1?57:28)+text(320,236,cluster?'Instrument display schematic':'Screen schematic',14)+circle(320,295,3,`fill="${gold}"`);}
 case 'audio':{const count=d.speakers;let s=rect(242,103,156,186,18,`fill="${ink}"`)+circle(320,213,45)+circle(320,213,24,`fill="#2c4351"`)+circle(320,138,17)+(d.audioBrand?text(320,278,d.audioBrand.toUpperCase(),d.audioBrand.length>10?12:15):'');if(count&&count<=30)s+=Array.from({length:count},(_,i)=>{const a=-Math.PI/2+i*Math.PI*2/count;return circle(320+Math.cos(a)*208,199+Math.sin(a)*118,7,`fill="${ice}" stroke="none"`);}).join('');else s+=path('M198 145q-54 48 0 96M446 145q54 48 0 96',`stroke="${ice}"`);return s;}
 case 'safety':{let s=carTop();if(/cruise|collision|brak/.test(lower))s=group(carTop(),'translate(0 55) scale(1 .8)')+rect(257,72,126,46,15)+path('M245 134H394M263 147H376',`stroke="${ice}"`);else if(/camera|view/.test(lower))s+=circle(320,203,24,`fill="${ink}" stroke="${ice}"`)+circle(320,203,11,`stroke="${ice}"`)+path('M270 76q50-35 100 0M179 131q-47 58 0 115M461 131q47 58 0 115',`stroke="${ice}" stroke-dasharray="5 6"`);else s+=path('M166 119q-37 62 0 124M473 119q37 62 0 124M229 305q91 35 182 0',`stroke="${ice}" stroke-dasharray="5 6"`);return s;}
 case 'wheel':return wheel(320,195,104)+path('M183 91V298M174 101l9-10 9 10M174 288l9 10 9-10')+(/all.terrain|off.road|mud/.test(lower)?Array.from({length:16},(_,i)=>group(path('M-7 -110l14 12'),`translate(320 195) rotate(${i*22.5})`)).join(''):'');
 case 'drivetrain':return rect(209,103,36,57,8)+rect(396,103,36,57,8)+rect(209,238,36,57,8)+rect(396,238,36,57,8)+path('M245 132H396M245 265H396M320 132V265')+circle(320,199,25,`fill="${ink}"`)+(/lock/.test(lower)?rect(300,240,40,30,5,`fill="${ink}" stroke="${ice}"`)+path('M308 240v-14q12-18 24 0v14',`stroke="${ice}"`):'')+(/disconnect/.test(lower)?path('M289 278l17-14m13 0 17-14',`stroke="${ice}"`):'');
 case 'tow':return /winch/.test(lower)?rect(203,125,234,139,13,`fill="${ink}"`)+Array.from({length:8},(_,i)=>path(`M${245+i*20} 135v119`, `stroke="${muted}"`)).join('')+path('M320 264v32q1 29 33 16l10-19',`stroke="${ice}"`):path('M120 138H254L298 216H114V164M301 214H357L395 267')+circle(196,248,30)+rect(357,126,155,115,12,`fill="${ink}"`)+circle(425,267,26)+circle(479,267,26)+circle(325,215,8,`fill="${ice}"`);
 case 'offroad':return path('M107 303l71-52 76 29 85-57 74 35 124-34',`stroke="${muted}"`)+path('M161 194l41-58h192l71 75v30H151Z',`fill="${ink}"`)+wheel(224,246,39)+wheel(413,246,39)+(/skid|protection|rock rail|bumper/.test(lower)?path('M267 264h111',`stroke="${ice}" stroke-width="9"`):'');
 case 'color':{const colors={black:'#222b31',white:'#e6e6df',red:'#a6433e',blue:'#366882',green:'#526d51',silver:'#aab6bc',gray:'#788087',grey:'#788087',orange:'#bb7a46',yellow:'#c4a660',brown:'#80634e',tan:'#c0a281',beige:'#c9b99b',bronze:'#93714a',purple:'#72566e'};return rect(174,104,292,189,25,`fill="${colors[d.colorName]||'#536773'}"`)+path('M198 128H443M198 270H443',`stroke="${light}" stroke-opacity=".5"`)+text(320,212,d.colorName?'Illustrative swatch':'Finish illustration',20);}
 case 'climate':{let s=circle(320,195,75)+circle(320,195,15,`fill="${ink}"`);for(let i=0;i<4;i++)s+=group(path('M8 -12q8-83 47-50q41 35-27 72Z',`fill="#294956" stroke="${ice}"`),`translate(320 195) rotate(${i*90})`);return s+path('M166 135q-31 60 0 119M475 135q31 60 0 119');}
 case 'lighting':return path('M313 129q-112-28-124 66q12 94 124 66Z',`fill="${ink}"`)+Array.from({length:5},(_,i)=>path(`M337 ${139+i*29}L453 ${128+i*35}`,`stroke="${ice}"`)).join('')+text(257,208,/led/.test(lower)?'LED':/halogen/.test(lower)?'HALOGEN':'LIGHT',17);
 case 'wipers':return path('M211 128h218l51 150H162Z',`fill="${ink}"`)+path('M248 266l69-82M350 266l69-82',`stroke-width="7"`)+Array.from({length:7},(_,i)=>path(`M${195+i*39} 93l-7 13`, `stroke="${ice}"`)).join('')+path('M197 250q83-139 166-25',`stroke="${muted}" stroke-dasharray="5 6"`);
 case 'mirror':return path('M338 262l-24-44M318 217q-123 29-148-68q-11-50 63-44h163q40 3 35 43q-7 67-113 69Z',`fill="${ink}"`)+path('M205 131H388M213 151H375',`stroke="${ice}"`)+(/fold/.test(lower)?path('M372 268q87-41 69-107m-7 9 7-9 11 6',`stroke="${ice}"`):'');
 case 'steering':return circle(320,197,100)+circle(320,197,30,`fill="${ink}"`)+path('M224 172l68 22M416 172l-68 22M320 228v66')+(d.heated?path('M174 205q-18-15 0-30t0-30M465 205q18-15 0-30t0-30','stroke="#f3ab6d"'):arrow(186,284,250,284));
 case 'floor':return path('M187 98h226l43 196H154Z',`fill="${ink}"`)+Array.from({length:6},(_,i)=>path(`M190 ${130+i*25}h220`, `stroke="${muted}"${/carpet/.test(lower)?' stroke-dasharray="2 7"':''}`)).join('');
 case 'tailgate':return path('M183 107h251v148H183Z',`fill="${ink}"`)+path(/liftgate/.test(lower)?'M183 107l-39-46h251l39 46':'M183 255l-39 42h251l39-42',`stroke="${ice}"`)+path('M467 134q40 62 0 110m-7-10 7 10 9-8');
 case 'fuel':return rect(219,105,149,185,12,`fill="${ink}"`)+rect(238,128,111,61,7,`fill="#2c4351"`)+path('M366 165h32q16 0 16 20v62q0 20 17 20t17-22v-100l-20-28M206 296h177')+text(292,234,'FUEL',22);
 case 'connectivity':return rect(251,103,139,200,18,`fill="${ink}"`)+rect(265,123,111,148,8,`fill="#243e4d"`)+circle(321,286,4)+path('M433 144q42 43 0 86M211 144q-42 43 0 86',`stroke="${ice}"`)+(/charg|electric/.test(lower)?path('M329 163l-28 41h23l-13 35',`stroke="${gold}"`):circle(320,192,23,`stroke="${gold}"`));
 case 'controls':return /outlet/.test(lower)?rect(221,112,199,179,24,`fill="${ink}"`)+path('M279 157v40M363 157v40M303 248v-14q18-28 36 0v14'):/opener/.test(lower)?path('M168 291V137l152-59 151 59v154M193 291V159h254v132M203 189h234M203 224h234M203 259h234'):/switch/.test(lower)?rect(160,135,320,120,20,`fill="${ink}"`)+Array.from({length:4},(_,i)=>rect(178+i*76,154,56,79,8,`fill="#2b4553"`)+circle(206+i*76,174,4,`fill="${ice}"`)).join(''):rect(233,132,170,140,24,`fill="${ink}"`)+circle(317,200,39)+path('M317 167v34',`stroke="${ice}"`)+text(317,255,/start/.test(lower)?'START':'KEY / ENTRY',13);
 case 'body':return path('M125 213h42l43-86h138l62 86h101v58H125Z',`fill="${ink}"`)+path('M214 145h49v61h-77M284 145h47l50 61h-97M408 213h90v-48h-87')+circle(209,271,31)+circle(430,271,31);
 case 'package':{const parts=d.components.length?d.components:['equipment','equipment','equipment'];return parts.slice(0,4).map((kind,i)=>{const x=parts.length<=3?103+i*153:150+(i%2)*183,y=parts.length<=3?138:92+Math.floor(i/2)*110;return rect(x,y,130,100,13,`fill="${ink}"`)+group(draw({...d,kind,components:[],chips:[]}),`translate(${x-5} ${y-13}) scale(.22)`);}).join('')+text(320,315,d.components.length?'Illustrated items from the listed contents':'Package contents: see the source list',15);}
 default:return rect(198,111,244,176,22,`fill="${ink}"`)+path('M227 146h113M227 179h186M227 214h186M227 248h113')+circle(389,143,16,`stroke="${ice}"`);
 }
}
export function renderBuyerFeatureVisual(choice,options={}){
 const d=describeBuyerFeatureVisual(choice,options);let hash=2166136261;for(const c of JSON.stringify([d.kind,d.sourceText,d.category]))hash=Math.imul(hash^c.charCodeAt(0),16777619);const id='bfv-'+(hash>>>0).toString(36);
 const chipText=d.chips.join('  ·  ');
 return `<svg class="buyer-feature-visual" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" width="640" height="400" role="img" aria-labelledby="${id}-title ${id}-desc" data-visual-kind="${d.kind}" style="display:block;width:100%;height:auto;pointer-events:none"><title id="${id}-title">${esc(d.label)} — feature illustration</title><desc id="${id}-desc">${esc(d.sourceText)}. Schematic illustration, not a photograph or a representation of the exact vehicle. ${esc(d.note)}.</desc><defs><linearGradient id="${id}-bg" x2="1" y2="1"><stop stop-color="#253b49"/><stop offset="1" stop-color="#0d1821"/></linearGradient></defs><rect width="640" height="400" fill="url(#${id}-bg)"/><path d="M32 66H608M32 353H608" fill="none" stroke="#5e6970" stroke-opacity=".6"/><text x="32" y="40" fill="${gold}" font-family="system-ui,sans-serif" font-size="13" letter-spacing="2">FEATURE ILLUSTRATION</text><g fill="none" stroke="${gold}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" font-family="system-ui,sans-serif">${draw(d)}${chipText?text(320,337,chipText,chipText.length>48?13:17):''}</g><text x="320" y="380" fill="#b5c2cc" font-family="system-ui,sans-serif" font-size="13" text-anchor="middle">${esc(d.note)}</text></svg>`;
}
