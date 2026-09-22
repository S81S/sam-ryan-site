export const definitions = [
 ['hemi','HEMI engine',/\bhemi\b/i], ['v8','V8 engine',/\bv\s*8\b/i],
 ['ventilated','Ventilated / cooled front seats',/ventilat\w* (?:front )?seats?|cooled (?:front )?seats?|air.conditioned (?:front )?seats?/i],
 ['sunroof','Sunroof / moonroof',/sun\s*roof|moon\s*roof/i],
 ['panoramic','Panoramic sunroof',/panoramic.*(?:sunroof|moonroof)|dual.pane.*sunroof/i],
 ['heatedSeats','Heated front seats',/heated front seats|front.*heated seats/i],
 ['heatedWheel','Heated steering wheel',/heated steering.wheel/i],
 ['leather','Leather-trimmed seats',/leather.*(?:seats|trimmed bucket)|(?:seats).*leather/i],
 ['adaptiveCruise','Adaptive cruise control',/adaptive cruise/i],
 ['blindSpot','Blind-spot monitoring',/blind.spot/i],
 ['surroundCamera','Surround-view camera',/surround.view camera|360.*camera/i],
 ['backupCamera','Rear-view camera',/rear.back.up camera|rear.view camera|back.up camera/i],
 ['remoteStart','Remote start',/remote.start/i],
 ['thirdRow','Third-row seats',/(?:third|3rd).row.*seat/i],
 ['tow','Trailer hitch / tow equipment',/receiver.hitch|trailer.tow|tow.package/i],
 ['fourWheel','Four-wheel drive',/\b4x4\b|\b4wd\b|four.wheel.drive|4.wheel.drive/i],
 ['awd','All-wheel drive',/all.wheel.drive|\bawd\b/i],
 ['carplay','Apple CarPlay',/apple carplay/i], ['androidAuto','Android Auto',/android auto/i],
 ['navigation','Navigation',/\bnav\b|navigation/i], ['diesel','Diesel engine',/diesel/i],
 ['electric','Electric powertrain',/electric.drive|electric.motor|battery.electric/i],
 ['hybrid','Hybrid powertrain',/hybrid|phev/i], ['bedliner','Spray-in bedliner',/spray.in bedliner/i],
 ['hud','Head-up display',/head.up display/i], ['wireless','Wireless charging',/wireless charg/i],
 ['powerLiftgate','Power liftgate',/power.liftgate|hands.free.*liftgate/i],
];
export const labels=Object.fromEntries(definitions.map(([id,label])=>[id,label]));
export const normalizeText=s=>String(s||'').normalize('NFKC').replace(/[\u2010-\u2015]/g,'-').replace(/[‘’]/g,"'").replace(/[®™]/g,'').replace(/\s+/g,' ').trim();
export function analyzeSticker(text,vin){
 if(!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)||!String(text).toUpperCase().replace(/[^A-Z0-9]/g,'').includes(vin))throw Error('Sticker VIN does not match vehicle');
 const raw=String(text).split(/\r?\n/).map(normalizeText).filter(Boolean);
 const start=raw.findIndex(l=>/^(?:engine:|standard equipment)/i.test(l));
 const end=raw.findIndex((l,i)=>i>start&&/^(?:warranty coverage|fuel economy|government .*star)/i.test(l));
 if(start<0)throw Error('Could not locate the equipment section');
 const lines=raw.slice(Math.max(0,start-5),end<0?raw.length:end).filter(l=>!/^\$|^total price|^base price|^destination charge|^manufacturer/i.test(l));
 const engine=lines.find(l=>/^engine:/i.test(l));
 const features={};
 for(const [id,,pattern] of definitions){
  const pool=['hemi','v8','diesel','electric','hybrid'].includes(id)?(engine?[engine]:[]):lines;
  const evidence=pool.filter(l=>pattern.test(l));
  const negative=evidence.filter(l=>/\b(?:delete|deleted|deletion|without|not equipped|not included|no sunroof|no moonroof)\b/i.test(l));
  const positive=evidence.filter(l=>!negative.includes(l)&&!/^optional equipment|if equipped|available separately/i.test(l)&&(!/N\/A.*manual transmission/i.test(l)||lines.some(x=>/^transmission:.*automatic/i.test(x))));
  // A factory deletion overrides a standard-equipment mention.
  if(negative.length)features[id]={value:false,evidence:negative.slice(0,2)};
  else if(positive.length)features[id]={value:true,evidence:positive.slice(0,2)};
  else if(id==='v8'&&engine&&/\b(?:i[346]|v[46]|[346].cylinder)\b/i.test(engine))features[id]={value:false,evidence:[engine]};
 }
 return {features,lines,engine:engine||null};
}
const aliases=[
 ['panoramic',/\bpanoramic(?:\s+(?:sun\s*roof|moon\s*roof))?/g],
 ['sunroof',/\b(?:sun\s*roof|sunrrof|moon\s*roof)s?\b/g],
 ['ventilated',/\b(?:(?:air[ -]?conditioned|air conditioning|cooled|cooling|ventilated|vented)(?:\s+front)?\s+seats?)\b/g],
 ['heatedSeats',/\bheated(?:\s+front)?\s+seats?\b/g],['heatedWheel',/\bheated steering wheel\b/g],
 ['hemi',/\bhemi\b/g],['v8',/\bv[ -]?8\b/g],['leather',/\bleather(?:[ -]trimmed)?(?:\s+seats?)?\b/g],
 ['adaptiveCruise',/\badaptive cruise(?: control)?\b/g],['blindSpot',/\bblind[ -]spot(?: monitoring)?\b/g],
 ['surroundCamera',/\b(?:360(?:[ -]degree)?|surround[ -]view)\s*cameras?\b/g],
 ['backupCamera',/\b(?:back[ -]?up|rear[ -]view) camera\b/g],['remoteStart',/\bremote start\b/g],
 ['thirdRow',/\b(?:third|3rd|3)[ -]row(?:\s+seats?)?\b/g],['tow',/\b(?:tow(?:ing)? package|trailer hitch|tow hitch)\b/g],
 ['fourWheel',/\b(?:4x4|4wd|four wheel drive)\b/g],['awd',/\b(?:awd|all wheel drive)\b/g],
 ['carplay',/\b(?:apple )?carplay\b/g],['androidAuto',/\bandroid auto\b/g],
 ['navigation',/\b(?:navigation|nav)\b/g],['diesel',/\bdiesel\b/g],['electric',/\belectric\b/g],['hybrid',/\bhybrid\b/g],
 ['bedliner',/\b(?:spray[ -]in )?bedliner\b/g],['hud',/\b(?:head[ -]up display|hud)\b/g],['wireless',/\bwireless charging\b/g],['powerLiftgate',/\bpower liftgate\b/g]
];
const numeric=s=>Number(s.replace(/[$, ]/g,''));
export function parseQuery(input){
 const original=String(input||'').trim();let q=normalizeText(original).toLowerCase();
 const result={original,budget:null,mileage:null,condition:null,requirements:[],terms:[],warnings:[],ambiguity:null};
 if(/\b15000\b/.test(q)&&!/\$\s*15[,]?000|(?:under|budget|price|below|max)\s*15[,]?000|15[,]?000\s*(?:dollars|miles)/.test(q))result.ambiguity='Did you mean a Ram 1500, or a $15,000 budget? Please edit that part of your search.';
 q=q.replace(/\b(?:under|below|less than|up to|max(?:imum)?(?: of)?)?\s*(\d[\d,]*(?:\.\d+)?)\s*(k)?\s*(?:miles|mi)\b/g,(all,n,k)=>{result.mileage=numeric(n)*(k?1000:1);return ' ';});
 q=q.replace(/(?:\b(?:under|below|less than|up to|max(?:imum)?|budget(?: of)?|for|around)\s*)?\$\s*(\d[\d,]*(?:\.\d+)?)\s*(k)?\b|\b(?:under|below|less than|up to|max(?:imum)?|budget(?: of)?|for|around)\s+(\d[\d,]*(?:\.\d+)?)\s*(k)?\b/g,(all,a,ak,b,bk)=>{const amount=numeric(a||b)*((ak||bk)?1000:1);if(result.budget!==null&&result.budget!==amount)result.warnings.push('More than one price limit was entered; use one budget.');result.budget=amount;return ' ';});
 const eitherCondition=/\bnew\b/.test(q)&&/\b(?:used|pre[ -]owned)\b/.test(q);
 q=q.replace(/\b(new|used|pre[ -]owned)\b/g,(all,c)=>{result.condition=eitherCondition?null:c==='new'?'New':'Used';return ' ';});
 for(const [id,regex] of aliases){
  q=q.replace(regex,(match,offset)=>{
   const prefix=q.slice(Math.max(0,offset-35),offset);const suffix=q.slice(offset+match.length,offset+match.length+35);
   if(/(?:or\s+no\s+)$/.test(prefix)||/^\s+or\s+no\s+(?:sunroof|sunrrof|moonroof)/.test(suffix)){result.warnings.push('Choose either “with sunroof” or “no sunroof”, not both.');}
   const wanted=!/(?:\bno|\bwithout|\bnot|\bdon.t want|\bdo not want|\bdoesn.t have|\bdoes not have|\bmust not have)\s+(?:a\s+|any\s+)?$/.test(prefix);
   const previous=result.requirements.find(x=>x.id===id);
   if(previous&&previous.wanted!==wanted)result.warnings.push(`Conflicting request for ${labels[id]}.`);
   else if(!previous)result.requirements.push({id,wanted});
   return ' ';
  });
 }
 // Explicit model shorthand is safe; the five-digit 15000 ambiguity is never silently corrected.
 q=q.replace(/\b(?:i am looking for|i'm looking for|i want|i need|looking for|show me|find me|can you find|do you have|i would like|i'd like)\b/g,' ');
 const stop=new Set('a an the with without no not any and or but please seats seat car vehicle truck suv cars trucks suvs that has have me my of for want dont don\'t do does doesn\'t doesn’t must to at in either'.split(' '));
 result.terms=q.split(/[^a-z0-9'-]+/).filter(w=>w&&!stop.has(w));
 if(result.requirements.some(x=>x.id==='ventilated'))result.warnings.push('“Air-conditioned seats” is treated as ventilated/cooled seats. The exact factory wording is shown.');
 return result;
}
export function matchVehicle(vehicle,sticker,query){
 if(vehicle.locationId!=='18393')return {kind:'excluded',reason:'store'};
 if(query.condition&&vehicle.condition!==query.condition)return {kind:'excluded',reason:'condition'};
 if(query.budget!==null&&(vehicle.price===null||vehicle.price>query.budget))return {kind:'excluded',reason:'price'};
 if(query.mileage!==null&&(vehicle.miles===null||vehicle.miles>query.mileage))return {kind:'excluded',reason:'mileage'};
 const title=normalizeText(vehicle.title+' '+vehicle.stock+' '+vehicle.vin).toLowerCase();
 const unmatched=query.terms.filter(t=>!title.includes(t));
 // Remaining words must be found in the VIN-verified equipment text; listing descriptions are never searched.
 const lines=sticker?.status==='verified'?sticker.lines||[]:[];
 const text=normalizeText(lines.join(' ')).toLowerCase();
 if(unmatched.length&&!unmatched.every(t=>text.includes(t)))return {kind:'excluded',reason:'terms'};
 const checks=query.requirements.map(req=>{const fact=sticker?.status==='verified'?sticker.features?.[req.id]:null;return {...req,label:labels[req.id],state:fact?fact.value===req.wanted?'match':'conflict':'unknown',evidence:fact?.evidence||[]};});
 if(checks.some(c=>c.state==='conflict'))return {kind:'excluded',reason:'equipment',checks};
 if(checks.some(c=>c.state==='unknown'))return {kind:'unknown',checks};
 return {kind:'match',checks};
}
