// Shopping categories describe model families, not verified equipment or capability limits.
export const categoryLabels={sports:'Sports / performance cars',muscle:'Muscle cars',offroad:'Off-road vehicles',desert:'Baja / desert vehicles'};
const aliases=[
 ['sports',/\b(?:sports?|sporty|performance|sprots|sprts)[ -]*cars?\b/g],
 ['muscle',/\b(?:muscle|muscel|mussle)[ -]*cars?\b/g],
 ['desert',/\b(?:baja|desert)(?:[ -]+(?:style|performance))?(?:[ -]+(?:trucks?|pickups?|vehicles?|suvs?|runners?))?\b/g],
 ['offroad',/\boff[ -]?road(?:ing)?(?:[ -]+(?:vehicles?|cars?|trucks?|pickups?|suvs?))?\b/g]
];
const negative=/(?:\bno|\bwithout|\bnot|\bdon.t want|\bdo not want)\s+(?:an?\s+|any\s+)?$/;
const scopeOf=text=>/\b(?:trucks?|pickups?)$/.test(text)?'truck':/\bsuvs?$/.test(text)?'suv':null;
export function extractVehicleCategories(input){
 const hits=[];const warnings=[];
 for(const [id,regex] of aliases)for(const match of input.matchAll(regex)){
  const start=match.index,prefix=input.slice(0,start);let end=start+match[0].length;const suffix=input.slice(end);
  // Keep actual model and equipment requests literal: Subaru Baja, Baja mode, off-road tires, etc.
  if(id==='desert'&&(/\bsubaru\s*$/.test(prefix)||/^\s+(?:mode|lights?|lighting|paint|colou?r|yellow|sand|tan|beige|brown)\b/.test(suffix)))continue;
  if(id==='offroad'&&(/\btrd\s*$/.test(prefix)||/^\s+(?:package|group|tires?|wheels?|running boards?|suspension|pages?|plus mode)\b/.test(suffix)))continue;
  let bodyType=scopeOf(match[0]);
  const otherBody=bodyType&&/^\s+or\s+(?:trucks?|pickups?|suvs?)\b/.exec(suffix);
  if(otherBody){const alternative=scopeOf(otherBody[0]);if(alternative!==bodyType)bodyType='truckOrSuv';end+=otherBody[0].length;}
  hits.push({id,wanted:!negative.test(prefix),start,end,bodyType});
 }
 hits.sort((a,b)=>a.start-b.start);
 const categories=[];
 for(const h of hits){const old=categories.find(c=>c.id===h.id&&c.bodyType===h.bodyType);if(old&&old.wanted!==h.wanted)warnings.push('Conflicting request for '+categoryLabels[h.id]+'.');else if(!old)categories.push({id:h.id,wanted:h.wanted,bodyType:h.bodyType});}
 const positive=hits.filter(h=>h.wanted);
 const categoryMode=positive.some((h,i)=>i&&/\bor\b/.test(input.slice(positive[i-1].end,h.start)))?'any':'all';
 // Body words consumed with a category belong to that alternative. Making them global
 // would incorrectly drop sports cars from “sports car or off-road truck”.
 let text=input;for(const h of [...hits].reverse())text=text.slice(0,h.start)+' '+text.slice(h.end);
 const bodyType=positive.length&&positive[0].bodyType&&positive.every(h=>h.bodyType===positive[0].bodyType)?positive[0].bodyType:null;
 return {text,categories,categoryMode,bodyType,warnings};
}

export function vehicleBodyTypes(vehicle,sticker){
 const evidence=clean(vehicle.title)+' '+(sticker?.status==='verified'&&sticker.vin===vehicle.vin?(sticker.identityLines||[]).join(' '):'');
 return {
  truck:/\b(?:ram (?:1500|2500|3500|4500|5500)|gladiator|silverado|sierra|tundra|tacoma|frontier|titan|ridgeline|colorado|canyon|ranger|maverick|f[ -]?(?:150|250|350|450|550)|pickup|pick-up)\b/i.test(evidence),
  suv:/\b(?:suv|sport utility|wrangler|cherokee|wagoneer|compass|renegade|durango|hornet|4runner|sequoia|highlander|rav4|tahoe|suburban|yukon|escalade|expedition|explorer|bronco|traverse|acadia|enclave|pathfinder|armada|telluride|palisade|pilot|passport)\b/i.test(evidence)
 };
}

const rules=[
 ['sports',/\bdodge (?:challenger|charger)\b|\bchevrolet (?:camaro|corvette)\b|\bford mustang\b(?![ -]+mach[ -]?e)|\bmazda (?:mx[ -]?5|miata)\b|\bsubaru brz\b|\btoyota (?:gr[ -]?(?:86|supra)|86|supra)\b|\bscion fr[ -]?s\b|\bnissan (?:350z|370z|z|gt[ -]?r)\b|\bporsche (?:911|718|boxster|cayman)\b|\baudi (?:tt|r8)\b|\bjaguar f[ -]?type\b|\bhonda s2000\b|\bacura nsx\b|\bbmw z[34]\b/i],
 ['muscle',/\bdodge (?:challenger|charger)\b|\bchevrolet camaro\b|\bford mustang\b(?![ -]+mach[ -]?e)/i],
 ['offroad',/\bjeep (?:wrangler|gladiator)\b|\bford bronco\b(?!\s+sport\b)|\bford bronco sport\b.*\bbadlands\b|\bjeep (?:grand cherokee|cherokee|compass|renegade)\b.*\btrailhawk\b|\bram (?:1500|2500)\b.*\b(?:rebel|power wagon|rho|trx)\b|\bford (?:f[ -]?150|ranger)\b.*\braptor\b|\btoyota (?:tacoma|tundra|4runner|sequoia)\b.*\btrd[ -]+(?:off[ -]?road|pro)\b|\btoyota land cruiser\b|\bnissan (?:frontier|titan)\b.*\bpro[ -]?4x\b|\bchevrolet (?:colorado|silverado)\b.*\bzr2\b|\bgmc (?:canyon|sierra)\b.*\bat4x?\b|\bland rover defender\b|\bineos grenadier\b/i],
 ['desert',/\bram 1500\b.*\b(?:rho|trx)\b|\bjeep gladiator\b.*\bmojave\b|\bford (?:f[ -]?150|ranger|bronco)\b.*\braptor\b/i]
];
const clean=s=>String(s||'').replace(/[–—‑]/g,'-').replace(/\s+/g,' ').trim();
export function vehicleCategories(vehicle,sticker){
 const title=clean(vehicle.title);
 const facts={};
 for(const [id,pattern] of rules)if(pattern.test(title))facts[id]={id,label:categoryLabels[id],evidence:'Listed model / trim: '+title,sourceUrl:vehicle.sourceUrl,method:'listing-model-category'};
 // A VIN-matched, explicitly listed off-road package is also useful category evidence.
 // Individual tires, wheels, flares, AWD or the word Sport are insufficient.
 if(!facts.offroad&&sticker?.status==='verified'&&sticker.vin===vehicle.vin){
  const line=(sticker.lines||[]).map(clean).find(l=>/^(?:off[ -]?road (?:group|package)|(?:fx4|z71) off[ -]?road package|trd off[ -]?road package)(?:\s+\$?[\d,.]+)?$/i.test(l));
  if(line)facts.offroad={id:'offroad',label:categoryLabels.offroad,evidence:'Window sticker: '+line,sourceUrl:sticker.sourceUrl,method:'sticker-package-category'};
 }
 return facts;
}
export function matchVehicleCategories(vehicle,sticker,query){
 const requested=query.categories||[];if(!requested.length)return {matches:true,checks:[]};
 const facts=vehicleCategories(vehicle,sticker),positive=requested.filter(c=>c.wanted),negative=requested.filter(c=>!c.wanted);
 const bodies=vehicleBodyTypes(vehicle,sticker),qualifies=c=>Boolean(facts[c.id])&&(!c.bodyType||(c.bodyType==='truckOrSuv'?bodies.truck||bodies.suv:bodies[c.bodyType]));
 const matches=!negative.some(qualifies)&&(!positive.length||(query.categoryMode==='any'?positive.some(qualifies):positive.every(qualifies)));
 return {matches,checks:matches?[...new Set(positive.filter(qualifies).map(c=>facts[c.id]))]:[]};
}
