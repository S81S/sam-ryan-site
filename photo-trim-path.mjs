// Factory-backed routing for reviewed feature photos. This is a trim guide,
// not an order configurator: individual chart availability does not prove that
// every package, powertrain and body configuration can be ordered together.
// No inventory data enters this module, and specification sizes stay exact.
const array=value=>Array.isArray(value)?value:[];
const nonempty=value=>typeof value==='string'&&value.trim().length>0;
const statuses=new Set(['standard','optional','unavailable','unknown','example-only']);
const ubwCrosswalkSource='https://static.nhtsa.gov/odi/tsbs/2026/MC-11034895-0001.pdf';

export function createPhotoTrimPath(data,engine){
 const models=array(data?.models);
 const enabled=array(engine?.lineups);
 function context(lineup){
  const l=enabled.find(x=>x.id===lineup?.id&&x.year===lineup?.year);
  const found=models.filter(m=>m?.id===l?.id&&m?.year===l?.year);
  if(!l||found.length!==1)return null;
  const model=found[0],seen=new Set();
  const trims=array(model.trims).filter(t=>{
   if(!nonempty(t?.id)||seen.has(t.id))return false;seen.add(t.id);return true;
  }).map((trim,index)=>({...trim,rank:Number.isFinite(trim.rank)?trim.rank:index})).sort((a,b)=>a.rank-b.rank);
  const base=trims.find(t=>t.id===model.baseTrim);
  if(!base)return null;
  const choices=new Map(),questionFor=new Map();
  for(const q of array(l.questions))for(const p of array(q.choices)){
   if(p?.model===l.id&&p.year===l.year){choices.set(p.id,p);questionFor.set(p.id,q)}
  }
  return {lineup:l,model,trims,base,choices,questionFor};
 }
 function rule(ctx,trim,id){
  const raw=trim?.choices?.[id];
  // The reviewed data must identify a source. An undocumented or malformed
  // cell is unknown, never an unavailable feature.
  const sourceUrl=raw?.sourceUrl||raw?.source?.url||ctx.model.sourceUrl||ctx.model.source?.url;
  if(!raw||!statuses.has(raw.status)||!nonempty(sourceUrl))return {status:'unknown',note:'Factory trim availability has not been verified.',sourceUrl:null};
  const choice=ctx.choices.get(id);
  // Stellantis calls the same UBW radio 14.4 inches in its service bulletin
  // and 14.5 inches in these factory charts. This reviewed model/code link
  // supports trim availability only; it does not change photo/VIN size values.
  const chartUses145=/26DOMMOP_FBG_Ram(?:1500|HD)\.pdf(?:[?#]|$)/.test(sourceUrl);
  if(choice?.feature==='infotainmentScreen'&&choice.value==='14.4 inches'&&(chartUses145||/14\.5[ -]inch/i.test(raw.factoryLabel||''))){
   const linked=ctx.model.year===2026&&['ram-1500','ram-3500'].includes(ctx.model.id)&&
    raw.radioCode==='UBW'&&raw.crosswalkSource===ubwCrosswalkSource&&
    /14\.5[ -]inch/i.test(raw.factoryLabel||'')&&/14\.4[ -]inch/i.test(raw.stickerLabel||'')&&nonempty(raw.crosswalkEvidence);
   if(!linked)return {...raw,status:'unknown',sourceUrl,note:'The different screen labels need a reviewed model-specific radio-code source before this trim availability can be confirmed.'};
  }
  return {...raw,sourceUrl};
 }
 function parse(ctx,answers){
  const picks=[],errors=[];
  if(!answers||typeof answers!=='object'||Array.isArray(answers))return {picks,errors:['Invalid saved preferences.']};
  for(const q of ctx.lineup.questions){
   const answer=answers[q.id];if(answer===undefined||answer==='skip')continue;
   const values=Array.isArray(answer)?answer:[answer];
   if(!values.length){errors.push(q.id);continue}
   for(const value of new Set(values)){
    if(typeof value!=='string'){errors.push(q.id);continue}
    const rejected=value.startsWith('reject:'),id=rejected?value.slice(7):value;
    if((Array.isArray(answer)&&!rejected)||!q.choices.some(c=>c.id===id)){errors.push(q.id);continue}
    picks.push({questionId:q.id,choiceId:id,rejected,choice:ctx.choices.get(id)});
   }
  }
  return {picks,errors};
 }
 function assessment(ctx,trim,picks){
  const positive=picks.filter(p=>!p.rejected),rejected=new Set(picks.filter(p=>p.rejected).map(p=>p.choiceId));
  function positiveCheck(pick){
   const fact=rule(ctx,trim,pick.choiceId);
   const check={...pick,availability:fact.status,sourceUrl:fact.sourceUrl,note:fact.note||'',replaces:fact.replaces||null,status:'unknown'};
    if(fact.status==='unavailable')check.status='conflict';
    else if(fact.status==='standard'||fact.status==='optional')check.status='supported';
    // A required photographed feature is not silently added to the answers.
    // It can reveal a conflict with an explicit previous choice, while the
    // UI can explain the dependency before the shopper decides.
    for(const required of array(fact.requires)){
     const q=ctx.questionFor.get(required),requiredRule=rule(ctx,trim,required);
     if(!q){if(check.status!=='conflict')check.status='unknown';continue}
     const selected=positive.find(p=>p.questionId===q.id);
     if(rejected.has(required)||(selected&&selected.choiceId!==required)||requiredRule.status==='unavailable'){
      check.status='conflict';check.note=fact.note||'This choice requires another feature that your preferences exclude.';
     }else if(!['standard','optional'].includes(requiredRule.status)&&check.status!=='conflict')check.status='unknown';
    }
    for(const other of array(fact.conflictsWith))if(positive.some(p=>p.choiceId===other)){
     check.status='conflict';check.note=fact.note||'These selected features are not offered together.';
    }
   return check;
  }
  const checks=picks.map(pick=>{
   if(!pick.rejected)return positiveCheck(pick);
   const fact=rule(ctx,trim,pick.choiceId);
   const check={...pick,availability:fact.status,sourceUrl:fact.sourceUrl,note:fact.note||'',replaces:fact.replaces||null,status:'unknown'};
   if(fact.status==='unavailable'||fact.status==='optional')check.status='supported';
   else if(fact.status==='standard'){
    const q=ctx.questionFor.get(pick.choiceId);
    const alternatives=array(q?.choices).filter(p=>p.id!==pick.choiceId&&!rejected.has(p.id)).map(p=>positiveCheck({questionId:q.id,choiceId:p.id,rejected:false,choice:p}));
    if(fact.canOmit===true||alternatives.some(r=>r.status==='supported'))check.status='supported';
    else if(alternatives.some(r=>r.status==='unknown'))check.status='unknown';
    else if(fact.canOmit===false)check.status='conflict';
    else check.note=fact.note||'This feature is standard; an applicable replacement or deletion has not been verified.';
   }
   return check;
  });
  return {trim,checks,status:checks.some(c=>c.status==='conflict')?'conflict':checks.some(c=>c.status==='unknown')?'unknown':'supported'};
 }
 function resolve(lineup,answers={}){
  const ctx=context(lineup);
  if(!ctx)return {base:null,current:null,baseFeatures:[],candidates:[],uncertain:[],assessments:[],status:'unknown',conflicts:[],unresolved:[],configurationVerified:false,note:'No reviewed trim path is available for this model and year.'};
  const parsed=parse(ctx,answers);
  if(parsed.errors.length)return {base:ctx.base,current:null,baseFeatures:array(ctx.model.baseFeatures),candidates:[],uncertain:[],assessments:[],status:'conflict',conflicts:parsed.errors.map(questionId=>({questionId,note:'This preference is not a verified choice in this model guide.'})),unresolved:[],configurationVerified:false};
  const assessments=ctx.trims.map(t=>assessment(ctx,t,parsed.picks));
  const supported=assessments.filter(a=>a.status==='supported'),unknown=assessments.filter(a=>a.status==='unknown');
  const currentAssessment=parsed.picks.length?(supported[0]||unknown[0]):assessments.find(a=>a.trim.id===ctx.base.id);
  const status=currentAssessment?.status||'conflict';
  const requirements=parsed.picks.filter(p=>!p.rejected).flatMap(p=>array(rule(ctx,currentAssessment?.trim,p.choiceId).requires).map(requiredChoiceId=>({choiceId:p.choiceId,requiredChoiceId,questionId:ctx.questionFor.get(requiredChoiceId)?.id||null,answered:parsed.picks.some(x=>!x.rejected&&x.choiceId===requiredChoiceId)})));
  return {base:ctx.base,current:currentAssessment?.trim||null,baseFeatures:array(ctx.model.baseFeatures),candidates:supported.map(a=>a.trim),uncertain:unknown.map(a=>a.trim),assessments,status,requirements,
   conflicts:status==='conflict'?assessments.flatMap(a=>a.checks.filter(c=>c.status==='conflict').map(c=>({...c,trim:a.trim}))):[],
   unresolved:currentAssessment?.checks.filter(c=>c.status==='unknown')||[],configurationVerified:false,
   scope:ctx.model.scope||'',shopperScope:ctx.model.shopperScope||'',rankNote:ctx.model.rankNote||'',sourceUrl:ctx.model.sourceUrl||ctx.model.source?.url||null,
   note:ctx.model.note||'Trim availability follows the reviewed factory chart. Confirm the complete package and vehicle configuration.'};
 }
 function offer(lineup,answers,questionId,choiceId){
  const ctx=context(lineup),q=ctx?.lineup.questions.find(q=>q.id===questionId);
  if(!ctx||!q?.choices.some(p=>p.id===choiceId))return {selectable:false,status:'unknown',trim:null,note:'This is not a verified photo choice for this model and year.',replaces:null,sourceUrl:null};
  const before=resolve(lineup,answers||{}),after=resolve(lineup,{...answers,[questionId]:choiceId});
  const current=before.current||ctx.base;
  // Cards must describe the same resulting trim the UI will display after
  // this choice. Editing an earlier choice can move back to a lower trim.
  const target=after.current;
  const fact=rule(ctx,target,choiceId);
  let status='unknown';
  if(after.status==='conflict')status='unavailable';
  else if(after.status==='supported')status=target.rank>current.rank?'step-up':fact.status==='standard'?'included':'optional';
  const earlier=target?after.assessments.filter(a=>a.trim.rank<target.rank):[];
  const lowerAvailabilityUnknown=earlier.some(a=>a.status==='unknown');
  return {selectable:after.status!=='conflict',status,trim:target,note:fact.note||after.note||'',replaces:fact.replaces||null,sourceUrl:fact.sourceUrl,
   availability:fact.status,requires:array(fact.requires),configurationVerified:false,
   radioCode:fact.radioCode||null,factoryLabel:fact.factoryLabel||null,stickerLabel:fact.stickerLabel||null,crosswalkSource:fact.crosswalkSource||null,
   requiresTrim:status==='step-up'&&earlier.length>0&&earlier.every(a=>a.status==='conflict'),lowerAvailabilityUnknown,
   lowerTrimNotes:earlier.filter(a=>a.status==='unknown').map(a=>({trim:a.trim,notes:a.checks.filter(c=>c.status==='unknown').map(c=>c.note)})),
   conflicts:after.conflicts,unresolved:after.unresolved};
 }
 function baseline(lineup,questionId){
  const ctx=context(lineup),q=ctx?.lineup.questions.find(q=>q.id===questionId);
  if(!ctx||!q)return null;
  const included=q.choices.filter(p=>rule(ctx,ctx.base,p.id).status==='standard');
  return included.length===1?included[0]:null;
 }
 return {resolve,offer,baseline};
}
