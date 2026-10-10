import {encodePreferences} from './shopping-preferences.mjs';
export function featureInventoryLink(feature, {condition='Both', advisor='Sam', modelTerms=[],preferences='',maxPrice=0}={}) {
  const params=new URLSearchParams({feature,q:modelTerms.join(' '),condition:['New','Used'].includes(condition)?condition:'Both',advisor:String(advisor).toLowerCase()==='ryan'?'Ryan':'Sam'});
  const saved=encodePreferences(preferences);if(saved)params.set('preferences',saved);
  if(maxPrice)params.set('maxPrice',maxPrice);
  return '/inventory?'+params;
}

export function applyFeatureFilter(query, feature, definitions) {
  if(!feature||!definitions.some(([id])=>id===feature))return query;
  return {...query,requirements:[...query.requirements.filter(r=>r.id!==feature),{id:feature,wanted:true}]};
}
