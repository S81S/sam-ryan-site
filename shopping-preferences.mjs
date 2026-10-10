// Portable shopper intent. Labels are display text; never reparse them as evidence.
export const preferenceParam='preferences';
const cleanText=(v,n)=>typeof v==='string'&&v.length<=n&&!/[\u0000-\u001f]/.test(v);
const factoryLabels=new Map();
export const registerPreferenceLabels=lineup=>{for(const c of lineup.choices.values())factoryLabels.set(lineup.id+'/'+c.id,c.label);};
export function readPreferences(value){
 if(value instanceof URLSearchParams)value=value.get(preferenceParam);
 if(!value)return null;
 if(typeof value==='string'&&value.length>18000)return null;
 try{
  let p=typeof value==='string'?JSON.parse(value):value;
  if(p?.version===2){
   if(!Array.isArray(p.f)||p.f.length>10||!Array.isArray(p.requirements))return null;
   const requirements=[...p.requirements];
   for(const group of p.f){
    if(!Array.isArray(group)||group.length!==4)return null;
    const [model,year,yes,no]=group;
    if(!cleanText(model,100)||!Number.isInteger(year)||![yes,no].every(v=>typeof v==='string'&&v.length<8000&&/^[a-z0-9.]*$/.test(v)))return null;
    for(const [raw,wanted] of [[yes,true],[no,false]])for(const id of raw.split('.').filter(Boolean))requirements.push({feature:'factoryChoice',value:id,wanted,label:factoryLabels.get(model+'/'+id)||'Selected factory equipment',choiceId:id,questionId:id,model,year});
   }
   p={version:1,model:p.model,requirements};
  }
  if(p?.version!==1||!Array.isArray(p.requirements)||p.requirements.length>512)return null;
  const requirements=[];
  for(const r of p.requirements){
   if(!r||!cleanText(r.feature,80)||!/^\w+$/.test(r.feature)||typeof r.wanted!=='boolean'||
    !(typeof r.value==='boolean'||cleanText(r.value,180)&&r.value.trim())||!cleanText(r.label,180))return null;
   const item={feature:r.feature,value:r.value,wanted:r.wanted,label:r.label};
   for(const key of ['choiceId','questionId','model','reviewedScope'])if(r[key]!==undefined){if(!cleanText(r[key],100))return null;item[key]=r[key];}
   if(r.year!==undefined){if(!Number.isInteger(r.year)||r.year<1980||r.year>2100)return null;item.year=r.year;}
   if(r.allowedTrimIds!==undefined){if(!Array.isArray(r.allowedTrimIds)||r.allowedTrimIds.length>20||!r.allowedTrimIds.every(s=>cleanText(s,60)))return null;item.allowedTrimIds=[...r.allowedTrimIds];}
   requirements.push(item);
  }
  return {version:1,requirements,...(cleanText(p.model,100)?{model:p.model}:{})};
 }catch{return null;}
}
export const encodePreferences=p=>{
 const valid=readPreferences(p);if(!valid)return '';
 const factory=valid.requirements.filter(r=>r.feature==='factoryChoice');let output=valid;
 if(factory.length){const groups=new Map();for(const r of factory){const k=r.model+':'+r.year;if(!groups.has(k))groups.set(k,[r.model,r.year,[],[]]);groups.get(k)[r.wanted?2:3].push(r.value);}
  output={version:2,model:valid.model,f:[...groups.values()].map(([m,y,a,b])=>[m,y,a.join('.'),b.join('.')]),requirements:valid.requirements.filter(r=>r.feature!=='factoryChoice')};}
 const text=JSON.stringify(output);return text.length<=18000?text:'';
};
export const preferenceSummary=p=>(readPreferences(p)?.requirements||[]).map(r=>(r.wanted?'Want: ':'Exclude: ')+r.label).join('; ');
export function photoPreferences(lineup,answers){
 const requirements=[];
 for(const q of lineup.questions){
  for(const answer of Array.isArray(answers[q.id])?answers[q.id]:[answers[q.id]]){
   if(!answer||answer==='skip')continue;
   const wanted=!answer.startsWith('reject:'),id=wanted?answer:answer.slice(7),c=q.choices.find(c=>c.id===id);
   if(!c)continue;
   requirements.push({feature:c.feature,value:c.value,wanted,label:c.label,choiceId:c.id,questionId:q.id,model:c.model,year:c.year,
    ...(c.reviewedScope?{reviewedScope:c.reviewedScope}:{}),...(c.allowedTrimIds?{allowedTrimIds:c.allowedTrimIds}:{})});
  }
 }
 return readPreferences({version:1,model:lineup.id,requirements});
}
export function withShoppingPreferences(query,params){
 const preferences=readPreferences(params),budget=Number(params.get('maxPrice'));
 return {...query,preferences:preferences?.requirements||[],preferenceError:params.has(preferenceParam)&&!preferences,
  budget:Number.isFinite(budget)&&budget>0?Math.min(query.budget??Infinity,budget,1000000):query.budget};
}
