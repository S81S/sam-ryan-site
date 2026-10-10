// Portable shopper intent. Labels are display text; never reparse them as evidence.
export const preferenceParam='preferences';
const cleanText=(v,n)=>typeof v==='string'&&v.length<=n&&!/[\u0000-\u001f]/.test(v);
export function readPreferences(value){
 if(value instanceof URLSearchParams)value=value.get(preferenceParam);
 if(!value)return null;
 if(typeof value==='string'&&value.length>18000)return null;
 try{
  const p=typeof value==='string'?JSON.parse(value):value;
  if(p?.version!==1||!Array.isArray(p.requirements)||p.requirements.length>40)return null;
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
export const encodePreferences=p=>{const valid=readPreferences(p);return valid?JSON.stringify(valid):'';};
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
