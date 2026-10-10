// Synchronous source registry shared by the guide, inventory, VIN and Compare.
// Loading stays in buyer-sources; this module has no imports or browser effects.
let models=new Map(),photos=new Map();
export function registerReviewedPreferenceEvidence(catalog,pathData){
 models=new Map((pathData?.models||[]).map(m=>[m.id+':'+m.year,m]));
 photos=new Map((catalog?.photos||[]).filter(p=>p.reviewed===true).map(p=>[p.id,p]));
}
const valid=(v,r)=>r?.status==='verified'&&r.vin===v.vin&&Array.isArray(r.lines)&&r.lines.every(l=>typeof l==='string')&&Array.isArray(r.identityLines)&&r.identityLines.every(l=>typeof l==='string');
const ubwSource='https://static.nhtsa.gov/odi/tsbs/2026/MC-11034895-0001.pdf';
export function resolveReviewedPreference({vehicle,record,resolved,requirement:r,base,requirements,lineup,match}){
 if(!valid(vehicle,record)||!lineup||!match)return base;
 const model=models.get(lineup.id+':'+lineup.year),trim=model?.trims.find(t=>t.id===match.trim.id);
 if(r.model==='wrangler'&&r.reviewedScope==='2026-wrangler-four-door-gas'&&record.identityLines.some(l=>/^2026 MODEL YEAR\b/i.test(l))&&record.identityLines.some(l=>/\bWRANGLER\b/i.test(l))){
  const identity=record.identityLines.filter(l=>/\b(?:2[ -]door|4xe|hybrid|phev|392|V8|RHD|right[ -]hand|Moab|anniversary|edition)\b/i.test(l));
  const editions=record.lines.filter(l=>/\b(?:anniversary|edition|America\s*250|Rockslide|Whitecap|Willys[ -]41)\b/i.test(l)&&!/\b(?:delete|without|removed|not included)\b/i.test(l));
  if(identity.length||editions.length)return {...base,state:'conflict',method:'reviewed-photo-scope',evidence:['This verified vehicle configuration is outside the configurations covered by this photo choice.',...identity,...editions],sourceUrl:record.sourceUrl};
 }
 // Exact installed equipment is stronger than a factory starting configuration.
 if(base.state==='match')return base;
 if(r.feature==='factoryChoice'&&lineup.year===2026&&['ram-1500','ram-3500'].includes(lineup.id)){
  const choice=lineup.choices.get(r.value),fact=choice?.facts[match.trim.id];
  if(fact&&/\bUBW\b/.test(fact.text||'')&&/14\.5[ -]inch/i.test(fact.text||'')&&/26DOMMOP_FBG_Ram(?:1500|HD)\.pdf(?:[?#]|$)/.test(fact.sourceUrl||'')){
   for(const photo of photos.values()){
    if(photo.model!==lineup.id||photo.year!==lineup.year||photo.feature!=='infotainmentScreen'||photo.value!=='14.4 inches')continue;
    const rule=trim?.choices[photo.id],screen=resolved?.features?.infotainmentScreen;
    if(rule?.radioCode!=='UBW'||rule.crosswalkSource!==ubwSource||!rule.crosswalkEvidence||!/14\.5[ -]inch/i.test(rule.factoryLabel||'')||!/14\.4[ -]inch/i.test(rule.stickerLabel||'')||screen?.method!=='sticker-specification'||screen.value!==true||typeof screen.comparisonValue!=='string'||!screen.evidence?.length)continue;
    // Alternative/conditional wording is not an installed radio, even if a
    // size can be extracted from the line. Do not generalize the code crosswalk.
    if(screen.evidence.some(line=>typeof line!=='string'||/\b(?:or|either|if equipped|without|delete[ds]?|not equipped)\b/i.test(line))||screen.comparisonValue==='14.5 inches')continue;
    return {...base,state:((screen.comparisonValue==='14.4 inches')===r.wanted)?'match':'conflict',method:'reviewed-radio-code',evidence:[...(screen.evidence||[]),'UBW: the reviewed factory/service crosswalk identifies the chart’s 14.5-inch radio as the sticker’s 14.4-inch radio.'],sourceUrl:ubwSource};
   }
  }
 }
 if(base.state!=='unknown'||match.basis!=='sticker')return base;
 const photo=photos.get(r.choiceId),fact=trim?.choices[r.choiceId];
 if(!photo||photo.model!==r.model||photo.year!==r.year||photo.feature!==r.feature||photo.value!==r.value||!fact?.sourceUrl)return base;
 const positives=requirements.filter(x=>x.wanted),rejected=new Set(requirements.filter(x=>!x.wanted).map(x=>x.choiceId));
 const conflict=r.wanted&&(fact.status==='unavailable'||(fact.conflictsWith||[]).some(id=>positives.some(p=>p.choiceId===id))||(fact.requires||[]).some(id=>{
  const required=photos.get(id);
  return rejected.has(id)||trim.choices[id]?.status==='unavailable'||required&&positives.some(p=>p.feature===required.feature&&p.value!==required.value);
 }));
 if(conflict)return {...base,state:'conflict',method:'photo-factory-conflict',evidence:[`${match.trim.name}: ${fact.note||'This factory configuration conflicts with the selected photo features.'}`],sourceUrl:fact.sourceUrl};
 if(!r.wanted&&fact.status==='unavailable')return {...base,state:'match',method:'photo-factory-unavailable',evidence:[`${match.trim.name}: this photographed feature is not offered by the factory.`,fact.note].filter(Boolean),sourceUrl:fact.sourceUrl};
 return base;
}
