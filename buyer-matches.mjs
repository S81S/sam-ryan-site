import {trimAssessment} from './buyer-catalog.mjs';
import {preferenceChecks} from './preference-evidence.mjs';
import {photoPreferences,readPreferences} from './shopping-preferences.mjs';
import {registerReviewedPreferenceEvidence} from './reviewed-preference-evidence.mjs';
import {sourcedGuideFact} from './buyer-option-groups.mjs';

const selectedRequirements=(lineup,answers,unresolved=[])=>[
 ...(photoPreferences(lineup,answers)?.requirements||[]),
 ...(readPreferences({version:1,requirements:unresolved})?.requirements||[])
];
const photoLineup=(lineup,photos)=>photos?.lineups?.find(l=>l.id===lineup.id&&l.year===lineup.year);
function reviewedAnswers(lineup,answers,photos){
 const reviewed=photoLineup(lineup,photos);
 return Object.fromEntries((reviewed?.questions||[]).filter(q=>q.choices.some(c=>c.image)&&answers[q.id]!==undefined).map(q=>[q.id,answers[q.id]]));
}
let registeredPhotos,registeredPath;
function registerGuideEvidence(photos,photoPath){
 if(!photos||!photoPath||photos===registeredPhotos&&photoPath===registeredPath)return;
 const models=photos.lineups.map(l=>({id:l.id,year:l.year,trims:photoPath.resolve(l,{}).assessments.map(a=>a.trim)}));
 registerReviewedPreferenceEvidence({photos:[...photos.photos.values()]},{models});
 registeredPhotos=photos;registeredPath=photoPath;
}
export function assessBuyerMatches({lineup,pool,records,answers={},unresolved=[],trim='',condition='New',budget=0,photoPath,photos}){
 registerGuideEvidence(photos,photoPath);
 const req=selectedRequirements(lineup,answers,unresolved);
 return pool.filter(({v,m})=>(!trim||m.trim.id===trim)&&(condition==='Both'||v.condition===condition)&&(!budget||v.price>0&&v.price<=budget)).map(({v,m})=>{
  const checks=preferenceChecks(v,records[v.vin],req);
  return {v,m,checks,conflicts:checks.filter(c=>c.state==='conflict').length,unknown:checks.filter(c=>c.state==='unknown').length};
 }).sort((a,b)=>a.conflicts-b.conflicts||a.unknown-b.unknown||(a.v.price??Infinity)-(b.v.price??Infinity));
}

export function assessBuyerTrim({lineup,answers={},unresolved=[],trim,photoPath,photos}){
 if(!lineup.trims.some(t=>t.id===trim))return {validTrim:false,status:'unknown',checks:[],conflicts:[],unknown:[],options:[]};
 const factory=trimAssessment(lineup,answers,trim),photo=photoLineup(lineup,photos);
 for(const check of factory.checks){
  if(check.fact)continue;
  const fact=sourcedGuideFact(lineup,check.choice.id,trim);
  if(!fact)continue;
  check.fact=fact;check.state=check.wanted?(fact.status==='unavailable'?'conflict':'available'):(fact.status==='standard'?'unknown':'available');
 }
 const assessment=photoPath?.resolve(photo||lineup,reviewedAnswers(lineup,answers,photos)).assessments.find(a=>a.trim.id===trim);
 const photoChecks=(assessment?.checks||[]).map(c=>({choice:{...c.choice,fullLabel:c.choice.label},wanted:!c.rejected,fact:{status:c.availability,note:c.note,sourceUrl:c.sourceUrl},state:c.status==='supported'?'available':c.status}));
 const assessed=new Set([...factory.checks,...photoChecks].map(c=>c.choice.id));
 const pending=[...selectedRequirements(lineup,answers).filter(r=>!assessed.has(r.choiceId)),...(readPreferences({version:1,requirements:unresolved})?.requirements||[])].map(r=>({choice:{id:r.choiceId,label:r.label,fullLabel:r.label},wanted:r.wanted,fact:null,state:'unknown'}));
 const checks=[...factory.checks,...photoChecks,...pending],conflicts=checks.filter(c=>c.state==='conflict'),unknown=checks.filter(c=>c.state==='unknown');
 return {validTrim:true,status:conflicts.length?'conflict':unknown.length?'unknown':'available',checks,conflicts,unknown,options:checks.filter(c=>c.wanted&&c.fact?.status==='optional')};
}
