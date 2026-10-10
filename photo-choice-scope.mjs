const wranglerScope='2026-wrangler-four-door-gas';
const wranglerTrims={B:'sport',S:'sport-s',W:'willys',G:'sahara',R:'rubicon',Y:'rubicon-x'};
const normalized=value=>String(value||'').normalize('NFKC').replace(/[\u2010-\u2015]/g,'-').replace(/\s+/g,' ').trim();
// The manufacturer 2026 four-door order guide distinguishes E7 Sport/Sahara
// cloth from K7 Rubicon cloth although their short sticker descriptions match.
// Its CPP codes also keep special editions out when a listing just says Sport.
export function wranglerConfiguration(vehicle,record){
 if(vehicle?.year!==2026||record?.status!=='verified'||record.vin!==vehicle.vin||record.equipmentSectionComplete!==true||
  !Array.isArray(record.lines)||!record.lines.every(line=>typeof line==='string')||
  !Array.isArray(record.identityLines)||!record.identityLines.every(line=>typeof line==='string'))return null;
 const identity=record.identityLines.map(normalized),lines=record.lines.map(normalized),title=normalized(vehicle.title);
 if(!/\b2026\b.*\bjeep wrangler\b/i.test(title)||
  !identity.some(line=>/^2026 MODEL YEAR\b/i.test(line))||
  identity.some(line=>/\b20\d{2} MODEL YEAR\b/i.test(line)&&!/^2026 MODEL YEAR\b/i.test(line)))return null;
 const context=[title,...identity,record.engine||''].join(' ');
 if(/\b(?:2[ -]door|4xe|hybrid|phev|392|V8|RHD|right[ -]hand|Moab|anniversary|edition)\b/i.test(context))return null;
 // Explicit edition packages can survive a generic dealer/model title.
 if(lines.some(line=>/\b(?:anniversary|edition|America\s*250|Rockslide|Whitecap|Willys[ -]41)\b/i.test(line)))return null;
 const modelLines=identity.filter(line=>/\bwrangler\b/i.test(line)).map(line=>line.replace(/ THERE['’]S ONLY ONE\.?$/i,''));
 const models=modelLines.map(line=>line.match(/^(?:JEEP )?WRANGLER 4[ -]DOOR (SPORT(?: S)?|WILLYS|SAHARA|RUBICON(?: X)?) 4X4$/i));
 if(!models.length||models.some(match=>!match))return null;
 const packages=lines.filter(line=>/^Customer Preferred Package\b/i.test(line));
 const codes=[...new Set(packages.map(line=>line.match(/^Customer Preferred Package (2[234][BSWGRY])(?:\s+\$[\d,]+)?$/i)?.[1]?.toUpperCase()))];
 if(codes.length!==1||!codes[0]||codes[0]==='23G')return null;
 const code=codes[0],trim=wranglerTrims[code[2]],engine=normalized(record.engine);
 if(!(code.startsWith('22')?/\b2\.0L\s+I4\b/i:/\b3\.6L\s+V6\b/i).test(engine))return null;
 const compatible=trim==='sport-s'||trim==='willys'?['sport',trim]:trim==='rubicon-x'?['rubicon',trim]:[trim];
 if(models.some(match=>!compatible.includes(match[1].toLowerCase().replace(/ /g,'-'))))return null;
 return {trim,code};
}
