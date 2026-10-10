import {buyerFeaturePhoto} from './buyer-feature-photo-map.mjs';
// Consolidate only the display of reviewed physical screens. A size preference
// and the complete factory radio remain separate, unchanged saved predicates.
const pairs={
 'ram-1500':[['r12546-dashboard','f1e0k45y'],['r12527-dashboard','fh01t86'],['r12315-dashboard','f13a33dn']],
 'ram-3500':[['r12500-dashboard','f123o6b'],['r12249a-dashboard','f10mbyu8']]
};
export function screenDisplayChoices({lineup,group,choices,answers={},photos}={}){
 if(group?.id!=='options-screen'||lineup?.year!==2026||!pairs[lineup.id])return choices;
 const hidden=new Set();
 const answered=c=>{const a=answers[c.originQuestionId||group.id];return (Array.isArray(a)?a:[a]).some(v=>v===c.id||v==='reject:'+c.id);};
 for(const [photoId,factoryId] of pairs[lineup.id]){
  const photo=choices.find(c=>c.id===photoId),factory=choices.find(c=>c.id===factoryId);
  if(!photo||!factory||photo.feature!=='infotainmentScreen'||factory.kind!=='factory')continue;
  const mapped=buyerFeaturePhoto(lineup,factory,photos);
  if(mapped?.id!==photo.id||mapped.image!==photo.image)continue;
  // Existing links can contain both predicates. Show both for explicit review
  // instead of losing a requirement or hiding a contradictory exclusion.
  if(answered(photo)&&answered(factory))continue;
  hidden.add(answered(factory)?photo.id:factory.id);
 }
 return choices.filter(c=>!hidden.has(c.id));
}
