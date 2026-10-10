// Classify sourced feature groups without creating shopper requirements or
// claiming that a factory option is installed on a VIN. The UI owns when a
// currently selected group advances; a right swipe can stay on a resolved group.
import {packageFeatureCondition,sourcedPackageDependency,standardDependencyParents} from './buyer-package-dependencies.mjs';
import {selectedTransmissionBundle} from './buyer-powertrain-dependencies.mjs';
const list=value=>Array.isArray(value)?value:[];
const sourced=f=>f&&typeof f.sourceUrl==='string'&&f.sourceUrl.trim()&&['standard','optional','unavailable'].includes(f.status);
const offered=f=>sourced(f)&&['standard','optional'].includes(f.status);
const conditional=f=>/\b(?:requires?|except|unless|only|when|where|subject to|depending|varies|some versions|some configurations|not the same|if equipped|delet(?:e|ion)|replac(?:e|es|ed|ement))\b/i.test(f?.note||'');
const questionId=(group,choice)=>choice.originQuestionId||list(group.questionIds).find(id=>id===choice.id)||(group.questionIds?.length===1?group.questionIds[0]:group.id);
const values=(answers,id)=>Array.isArray(answers[id])?answers[id]:[answers[id]];
const originals=choice=>[choice,...list(choice.mirrors),...list(choice.canonicalMembers).flatMap(c=>[c,...list(c.mirrors)])];

/**
 * groups: buildBuyerOptionGroups() output; original lineup.questions stay intact.
 * candidateTrimIds: every trim still possible after earlier choices, including
 * uncertain trims. Omit for all lineup trims. An empty list never implies that
 * equipment is included. Missing/conditional facts keep a decision visible.
 *
 * Result choiceIds identify the selected/included choices, or the group's
 * choices for decision/unavailable. evidence records each source used.
 * autoIncluded is a factory-route summary, never a VIN installation assertion.
 */
export function classifyGuideGroups({lineup,groups,answers={},candidateTrimIds,photoPath,photos}={}){
 const trims=list(lineup?.trims),knownTrims=new Set(trims.map(t=>t.id));
 const trimIds=[...new Set(candidateTrimIds===undefined?trims.map(t=>t.id):list(candidateTrimIds))];
 const reviewed=list(photos?.lineups).find(l=>l.id===lineup?.id&&l.year===lineup?.year);
 const path=photoPath?.resolve(reviewed||lineup,{});
 const photoTrims=new Map(list(path?.assessments).map(a=>[a.trim.id,a.trim]));
 const fact=(choice,trimId)=>choice.kind==='factory'?choice.facts?.[trimId]:choice.image?photoTrims.get(trimId)?.choices?.[choice.id]:null;
 const selected=[],excludedChoiceIds=[];
 for(const q of list(lineup?.questions))for(const c of list(q.choices)){
  if(values(answers,q.id).includes(c.id))selected.push({choice:c,questionId:q.id,basis:'selection'});
  if(values(answers,q.id).includes('reject:'+c.id))excludedChoiceIds.push(c.id);
 }
 const parents=[...selected.filter(p=>!excludedChoiceIds.includes(p.choice.id)),...standardDependencyParents({lineup,trimIds,excludedChoiceIds}).filter(c=>!selected.some(p=>p.choice.id===c.id)).map(choice=>({choice,basis:'standard-package'}))];
 const condition=(choice,trimId)=>packageFeatureCondition({lineup,choice,trimId,selected,excludedChoiceIds});
 const proof=(choice,trimId,f,extra={})=>({choiceId:choice.id,trimId,status:f.status,sourceUrl:f.sourceUrl,...(f.sourceChoiceId?{sourceChoiceId:f.sourceChoiceId}:{}),...extra});

 return list(groups).map(group=>{
  const choices=list(Array.isArray(group.guideChoices)?group.guideChoices:group.choices),ids=choices.map(c=>c.id);
  const result=(status,reason,choiceIds=ids,evidence=[],includedBy=[])=>({group,status,reason,choiceIds,evidence,includedBy});
  const wanted=choices.filter(c=>originals(c).some(original=>values(answers,questionId(group,original)).includes(original.id)));
  if(wanted.length)return result('resolved','answered',wanted.map(c=>c.id));
  // Saved supporting records remain their own answers. A broad hardtop photo,
  // for example, does not become either of the exact hardtop color choices.
  const represented=new Set(choices.flatMap(originals).map(c=>c.id));
  const legacy=list(group.choices).flatMap(originals).filter(c=>!represented.has(c.id));
  const legacyWanted=legacy.filter(c=>values(answers,questionId(group,c)).includes(c.id));
  if(legacyWanted.length)return result('resolved','answeredLegacy',[...new Set(legacyWanted.map(c=>c.id))]);
  const questionIds=list(group.questionIds).length?group.questionIds:[...new Set(choices.map(c=>questionId(group,c)))];
  if(questionIds.length&&questionIds.every(id=>answers[id]==='skip'))return result('resolved','noPreference',[]);
  const rejected=choices.filter(c=>originals(c).some(original=>values(answers,questionId(group,original)).includes('reject:'+original.id)));
  if(legacy.some(c=>values(answers,questionId(group,c)).includes('reject:'+c.id)))return result('decision','exclusionsNeedReview');
  // A completely passed stack needs an explicit Continue/No preference/Undo
  // decision, not an automatic jump to a different feature or inventory.
  if(rejected.length){if(choices.length===1&&group.exclusive===false)return result('resolved','excludedOptionalFeature',ids);return result('decision',rejected.length===choices.length?'allExcluded':'exclusionsNeedReview');}
  if(group.informational&&group.information?.evidence?.length)return result('informational','documentedFixedSpecification',ids,group.information.evidence);
  if(!trimIds.length)return result('decision','noCandidateTrims');
  if(trimIds.some(id=>!knownTrims.has(id)))return result('decision','unverifiedCandidateTrim');
  if(!choices.length)return result('decision','availabilityUnknown');

  if(group.id==='options-transmission'){
   const bundle=selectedTransmissionBundle({lineup,selected,trimIds,excludedChoiceIds});
   if(bundle?.unresolved)return result('decision','powertrainAvailabilityUnknown');
   if(bundle)return {...result('autoIncluded','includedBySelection',bundle.choiceIds,bundle.evidence,bundle.includedBy),label:bundle.label};
  }

  // Only explicit choice-ID links and the audited package table establish
  // dependencies. "Available with" prose never proves included equipment.
  const linked=[];
  for(const choice of choices){
   const evidence=[],includedParents=new Map();
   for(const trimId of trimIds){
    const own=fact(choice,trimId),requirement=condition(choice,trimId);if(!offered(own)||!requirement.satisfied)break;
    let dependency;
    for(const parent of parents){
     if(parent.choice.id===choice.id)continue;
     const parentFact=fact(parent.choice,trimId);if(!offered(parentFact))continue;
     const included=list(parent.choice.includedPackages).find(p=>p.id===choice.id&&list(p.trimIds).includes(trimId)&&p.sourceUrl);
     const audited=sourcedPackageDependency({lineup,parent:parent.choice,child:choice,trimId,selected,excludedChoiceIds});
     const explicit=parent.basis==='selection'&&(list(parentFact.requires).includes(choice.id)||included);
     if(audited||explicit){dependency={parent,sourceUrl:audited?.sourceUrl||included?.sourceUrl||parentFact.sourceUrl,conditionEvidence:requirement.evidence};break;}
    }
    if(!dependency)break;
    const parentId=dependency.parent.choice.id;
    evidence.push(proof(choice,trimId,own,{status:dependency.parent.basis==='standard-package'?'included-by-standard-package':'included-by-selection',parentChoiceId:parentId,sourceUrl:dependency.sourceUrl,...(dependency.conditionEvidence.length?{conditionEvidence:dependency.conditionEvidence}:{})}));
    const by=includedParents.get(parentId)||{choiceId:parentId,label:dependency.parent.choice.fullLabel||dependency.parent.choice.label,basis:dependency.parent.basis,trimIds:[],sourceUrls:[]};
    by.trimIds.push(trimId);if(!by.sourceUrls.includes(dependency.sourceUrl))by.sourceUrls.push(dependency.sourceUrl);includedParents.set(parentId,by);
   }
   if(evidence.length===trimIds.length)linked.push({choice,evidence,includedBy:[...includedParents.values()]});
  }
  if(linked.length===1)return result('autoIncluded',linked[0].includedBy.every(p=>p.basis==='standard-package')?'includedByStandardPackage':'includedBySelection',[linked[0].choice.id],linked[0].evidence,linked[0].includedBy);
  if(linked.length>1)return result('decision','multipleLinkedAlternatives');

  const cells=choices.flatMap(choice=>trimIds.map(trimId=>({choice,trimId,f:fact(choice,trimId)})));
  if(cells.some(({f})=>!sourced(f)))return result('decision','availabilityUnknown');
  const evidence=cells.map(({choice,trimId,f})=>proof(choice,trimId,f));
  if(cells.every(({f})=>f.status==='unavailable'))return result('unavailable','notOffered',ids,evidence);
  const included=choices.filter(c=>trimIds.every(trimId=>fact(c,trimId).status==='standard'&&!conditional(fact(c,trimId))&&condition(c,trimId).satisfied));
  // Even a standard base item remains a decision when an upgrade, alternate
  // configuration, or undocumented alternative is still available on any trim.
  if(included.length===1&&cells.every(({choice,f})=>choice.id===included[0].id||f.status==='unavailable'))
   return result('autoIncluded','standardOnRemainingTrims',[included[0].id],evidence);
  return result('decision',cells.some(({choice,trimId,f})=>conditional(f)||!condition(choice,trimId).satisfied)?'conditionNeedsDecision':'alternativesRemain',ids,evidence);
 });
}
