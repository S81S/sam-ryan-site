// Immutable VIN evidence for one loaded inventory snapshot. A factory option's
// availability is never used as proof that an inventory vehicle has it.
export function createInventoryGuide({groups,assess}){
 const evidence=new Map();
 function support(choice){
  if(!evidence.has(choice.id)){
   const rows=assess({[choice.originQuestionId]:choice.id});
   evidence.set(choice.id,new Map(rows.map(r=>[r.v.vin,r.conflicts?'conflict':r.unknown?'unknown':'match'])));
  }
  return evidence.get(choice.id);
 }
 return {
  classify(routes,remaining,withoutGroup){
   const confirmed=remaining.filter(r=>!r.conflicts&&!r.unknown);
   const vins=(confirmed.length?confirmed:remaining.filter(r=>!r.conflicts)).map(r=>r.v.vin);
   return routes.map(route=>{
    if(!['decision','resolved'].includes(route.status)||route.group.importance==='details')return route;
    const answered=route.status==='resolved'||['allExcluded','exclusionsNeedReview'].includes(route.reason);
    if(!vins.length&&!answered)return route;
    const relevant=answered&&withoutGroup?withoutGroup(route.group).filter(r=>!r.conflicts).map(r=>r.v.vin):vins;
    const choices=route.group.guideChoices||route.group.choices;
    const offered=choices.filter(c=>relevant.some(vin=>support(c).get(vin)==='match'));
    if(answered)return {...route,inventoryChoiceIds:offered.map(c=>c.id)};
    if(!offered.length)return {...route,status:'unavailable',reason:'noVerifiedInventoryOption',inventoryChoiceIds:[]};
    const result={...route,inventoryChoiceIds:offered.map(c=>c.id)};
    // Skip a redundant question only when every remaining VIN proves the
    // same choice and no other photographed/configured alternative fits.
    if(offered.length&&offered.every(c=>vins.every(vin=>support(c).get(vin)==='match'))){
     const representative=offered.find(c=>c.kind==='factory')||offered[0];
     return {...result,status:'autoIncluded',reason:'installedOnRemainingInventory',choiceIds:offered.map(c=>c.id),label:representative.fullLabel||representative.label,evidence:[],includedBy:[]};
    }
    return result;
   });
  },
  support
 };
}
