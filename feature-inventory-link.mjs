export function featureInventoryLink(feature, {condition='Both', advisor='Sam', modelTerms=[]}={}) {
  const params=new URLSearchParams({feature,q:modelTerms.join(' '),condition:['New','Used'].includes(condition)?condition:'Both',advisor:String(advisor).toLowerCase()==='ryan'?'Ryan':'Sam'});
  return '/inventory?'+params;
}

export function applyFeatureFilter(query, feature, definitions) {
  if(!feature||!definitions.some(([id])=>id===feature))return query;
  return {...query,requirements:[...query.requirements.filter(r=>r.id!==feature),{id:feature,wanted:true}]};
}
