import {encodePreferences} from './shopping-preferences.mjs';
import {matchesFeatureModelScope} from './feature-model-scope.mjs';
export function featureInventoryLink(feature, {condition='Both', advisor='Sam', modelTerms=[],modelScope='',preferences='',maxPrice=0}={}) {
  const params=new URLSearchParams({feature,q:modelTerms.join(' '),condition:['New','Used'].includes(condition)?condition:'Both',advisor:String(advisor).toLowerCase()==='ryan'?'Ryan':'Sam'});
  const saved=encodePreferences(preferences);if(saved)params.set('preferences',saved);
  if(maxPrice)params.set('maxPrice',maxPrice);
  if(modelScope)params.set('modelScope',modelScope);
  return '/inventory?'+params;
}

export function applyFeatureFilter(query, feature, definitions, modelScope='') {
  // The visible model controls the search: editing it must not leave a hidden,
  // incompatible source-model constraint attached to the new request.
  if(modelScope&&matchesFeatureModelScope({title:query.terms.join(' ')},null,modelScope))query={...query,modelScope};
  if(!feature||!definitions.some(([id])=>id===feature))return query;
  return {...query,requirements:[...query.requirements.filter(r=>r.id!==feature),{id:feature,wanted:true}]};
}
