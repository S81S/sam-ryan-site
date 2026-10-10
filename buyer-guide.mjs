import {loadBuyerCatalog,loadBuyerLineup} from './buyer-sources.mjs';
import {buyerVehicleTrim} from './buyer-evidence.mjs';
import {assessBuyerMatches,assessBuyerTrim} from './buyer-matches.mjs';
import {photoPreferences,encodePreferences,readPreferences} from './shopping-preferences.mjs';
import {createPhotoGuide} from './photo-guide-engine.mjs';
import {createPhotoTrimPath} from './photo-trim-path.mjs';
import {buildBuyerOptionGroups,findBuyerOptionGroup} from './buyer-option-groups.mjs';
import {classifyGuideGroups} from './buyer-guide-routing.mjs';
import {attachBuyerCardGestures} from './buyer-card-gestures.mjs';
import {buyerFeatureExplanation} from './buyer-feature-copy.mjs';
import {buyerFeaturePhoto} from './buyer-feature-photo-map.mjs';
import {buyerAudioPhoto} from './buyer-audio-photos.mjs';
import {buyerRoofPhoto} from './buyer-roof-photos.mjs';
import {buyerTechnologyPhoto} from './buyer-technology-photos.mjs';
import {screenDisplayChoices} from './buyer-screen-deck.mjs';
import {renderBuyerFeatureVisual} from './buyer-feature-visuals.mjs';
const root=document.getElementById('photo-finder'),key='carswithsam-complete-guide-v1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number.isFinite(n)&&n>0?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n):'Ask for price';
const clampBudget=n=>Math.max(0,Math.min(1000000,Number(n)||0));
let catalog,inventory,index,photos,photoPath,lineup,groups=[],routeCache=null,choiceInfoCache={key:'',rows:new Map()},pool=[],stage='models',loading=false,error='',notice='',undo=[],budgetDraft=0,settingsOpen=false;
let state={model:'',trim:'',answers:{},unresolved:[],step:0,option:0,groupId:'',reviewedGroups:{},year:'2026',brand:'All',budget:0,condition:'New',section:'All',mode:'photos',compareVins:[],showAll:false};
const failedPhotos=new Set();
let cardGestureCleanups=[];
const save=()=>{try{sessionStorage.setItem(key,JSON.stringify({...state,savedRequirements:lineup?.id===state.model?requirements():state.savedRequirements||[],stage,undo:undo.slice(-100)}));}catch{}};
const requirements=(answers=state.answers)=>[...(photoPreferences(lineup,answers)?.requirements||[]),...(readPreferences({version:1,requirements:state.unresolved||[]})?.requirements||[])];
const photoQuestions=()=>lineup.questions.filter(q=>q.choices.some(c=>c.image));
const applicable=c=>c.kind!=='factory'||!state.trim||c.facts[state.trim]?.status!=='unavailable';
const equipmentSections=()=>['All',...new Set(lineup.questions.filter(q=>q.choices.every(c=>!c.image)).map(q=>q.section||'Equipment'))];
const groupSignature=q=>JSON.stringify(q.questionIds.map(id=>[id,state.answers[id]??null]));
function routing(){
 const key=JSON.stringify([lineup.id,state.trim,state.answers,state.unresolved,state.reviewedGroups]);
 if(routeCache?.key===key)return routeCache.rows;
 const candidateTrimIds=lineup.trims.filter(t=>(!state.trim||t.id===state.trim)&&!assess(state.answers,t.id).conflicts.length).map(t=>t.id);
 const rows=classifyGuideGroups({lineup,groups,answers:state.answers,candidateTrimIds,photoPath,photos}).map(r=>r.status==='decision'&&r.reason==='exclusionsNeedReview'&&state.reviewedGroups?.[r.group.id]===groupSignature(r.group)?{...r,status:'resolved',reason:'exclusionsReviewed'}:r);
 routeCache={key,rows};return rows;
}
const guideRoutes=()=>routing().filter(r=>r.group.importance!=='details');
const activeQuestions=()=>routing().filter(r=>(r.group.importance!=='details'&&(r.status==='decision'||r.status==='resolved'))||r.group.id===state.groupId).map(r=>r.group);
function displayChoices(q){
 if(!q)return [];
 const choices=q.guideChoices||q.choices,ids=new Set(choices.map(c=>c.id));
 // A saved broad preference keeps its own card until the shopper changes it.
 const legacy=q.guideChoices?q.choices.filter(c=>!ids.has(c.id)&&originals(c).some(x=>{const a=state.answers[x.originQuestionId||q.id];return (Array.isArray(a)?a:[a]).some(v=>v===x.id||v==='reject:'+x.id);})):[];
 return screenDisplayChoices({lineup,group:q,choices:[...choices,...legacy].filter(applicable),answers:state.answers,photos});
}
function position(){const qs=activeQuestions();const current=qs.findIndex(q=>q.id===state.groupId);state.step=current>=0?current:Math.max(0,Math.min(Math.floor(Number(state.step)||0),Math.max(0,qs.length-1)));const q=qs[state.step],choices=displayChoices(q);state.groupId=q?.id||'';state.option=Math.max(0,Math.min(Math.floor(Number(state.option)||0),Math.max(0,choices.length-1)));return {qs,q,choices,c:choices[state.option]};}
const originals=c=>[c,...(c.mirrors||[])];
const answer=(q,c)=>c?state.answers[c.originQuestionId||q.id]:q.choices.find(c=>originals(c).some(x=>state.answers[x.originQuestionId||q.id]===x.id))?.id;
const rejected=(q,c)=>originals(c).some(x=>(Array.isArray(answer(q,x))?answer(q,x):[answer(q,x)]).includes('reject:'+x.id));
function groupAnswers(q,value){
 const next={...state.answers};
 if(value==='skip'){for(const id of q.questionIds)next[id]='skip';return next;}
 const no=value.startsWith('reject:'),c=q.choices.find(c=>c.id===(no?value.slice(7):value));if(!c)return next;
 const id=c.originQuestionId||q.id;
 if(no){if(typeof next[id]==='string'&&next[id]!=='skip'&&!next[id].startsWith('reject:')&&next[id]!==c.id)return next;for(const x of originals(c))if(next[x.originQuestionId]===x.id)delete next[x.originQuestionId];const prior=Array.isArray(next[id])?next[id]:[];next[id]=[...new Set([...prior,value])];}
 else{for(const id of q.questionIds)delete next[id];next[id]=c.id;}
 return next;
}
function advanceGroup(){
 const all=guideRoutes(),from=all.findIndex(r=>r.group.id===state.groupId),ordered=[...all.slice(from+1),...all.slice(0,from+1)],next=ordered.find(r=>r.status==='decision');
 state.option=0;if(next){state.groupId=next.group.id;stage='equipment';position();firstAvailableOption();}else stage='results';
}
function categoryProgress(){
 const topics=new Map();
 for(const r of guideRoutes()){
  if(['unavailable','informational'].includes(r.status))continue;
  const topic=r.group.topic||{id:r.group.section,label:r.group.section},id=topic.id||topic.label;
  if(!topics.has(id))topics.set(id,{...topic,id,rows:[]});topics.get(id).rows.push(r);
 }
 if(!topics.size)return '';
 const current=[...topics.values()].find(t=>t.rows.some(r=>r.group.id===state.groupId));
 return `<details class="pg-category-map"><summary>${current?esc(current.label)+' · ':''}Your guide — ${topics.size} categories</summary><nav aria-label="Guide categories">${[...topics.values()].map(t=>{const completed=t.rows.filter(r=>r.status==='resolved'||r.status==='autoIncluded').length,target=t.rows.find(r=>r.status==='decision')||t.rows.find(r=>r.status==='resolved');return `<button type="button" data-category="${esc(t.id)}"${current?.id===t.id?' aria-current="step"':''}${target?'':' disabled'}><strong>${esc(t.label)}</strong><span>${completed===t.rows.length?'✓ Resolved':completed+' of '+t.rows.length+' resolved'}</span></button>`;}).join('')}</nav></details>`;
}
function additionalEquipment(){
 const additional=groups.filter(g=>g.importance==='details');
 return additional.length?`<details class="pg-additional-equipment"><summary>More equipment &amp; specifications</summary><p>Explore additional preferences or open the full trim equipment list.</p><div>${additional.filter(g=>!g.informational).map(g=>`<button type="button" data-open-group="${esc(g.id)}">${esc(g.title)}</button>`).join('')}</div><button type="button" data-action="trims">View every trim specification</button></details>`:'';
}
function includedSummary(){const included=routing().filter(r=>r.status==='autoIncluded');return included.length?`<details class="pg-included"><summary>Already included — ${included.length} resolved ${included.length===1?'feature':'features'}</summary><p>These follow from your remaining trims or chosen package. No need to choose them again.</p><ul>${included.map(r=>`<li><strong>${esc(r.label||r.group.choices.find(c=>r.choiceIds.includes(c.id))?.label||r.group.title)}</strong><span>${['includedBySelection','includedByStandardPackage'].includes(r.reason)?'Included with '+esc(r.includedBy.map(p=>p.label).join(', ')):'Standard across your remaining trims'}</span>${r.evidence[0]?.sourceUrl?`<a href="${esc(r.evidence[0].sourceUrl)}" target="_blank" rel="noopener noreferrer">Factory source ↗</a>`:''}</li>`).join('')}</ul></details>`:'';}
const matches=(answers=state.answers)=>assessBuyerMatches({lineup,pool,records:index.records,answers,unresolved:state.unresolved,trim:state.trim,condition:state.condition,budget:state.budget,photoPath,photos});
const summary=rows=>({confirmed:rows.filter(r=>!r.conflicts&&!r.unknown),possible:rows.filter(r=>!r.conflicts&&r.unknown),excluded:rows.filter(r=>r.conflicts)});
const assess=(answers,trim)=>assessBuyerTrim({lineup,answers,unresolved:state.unresolved,trim,photoPath,photos});
const trimName=id=>lineup.trims.find(t=>t.id===id)?.name||id;
const source=c=>{const sourceUrl=state.trim&&c.facts?.[state.trim]?.sourceUrl||c.sourceUrl;return sourceUrl?`<a href="${esc(sourceUrl)}" target="_blank" rel="noopener noreferrer">Factory source ↗</a>`:'';};
function remember(){undo.push({answers:structuredClone(state.answers),unresolved:structuredClone(state.unresolved),savedRequirements:requirements(),step:state.step,option:state.option,groupId:state.groupId,reviewedGroups:structuredClone(state.reviewedGroups||{}),section:state.section,mode:state.mode,trim:state.trim,stage});if(undo.length>100)undo.shift();}
function url(path,extra={}){
 const req=requirements(),preferences=encodePreferences({version:1,model:lineup.id,requirements:req});
 if(req.length&&!preferences)throw Error('Too many choices for a shared link. Remove some choices before continuing.');
 const text=req.slice(0,8).map(r=>(r.wanted?'Want: ':'Exclude: ')+r.label).join('; ')+(req.length>8?'; '+(req.length-8)+' more saved choices':'');
 const q=[lineup.year,lineup.name,state.trim?trimName(state.trim):''].filter(Boolean).join(' ');
 const params=new URLSearchParams({q,preferences,guideTrim:state.trim,condition:state.condition,maxPrice:String(state.budget||''),requestedEquipment:text,from:'buyers-guide',...extra});
 if(path==='/contact')params.set('request',q+'. '+text+'\nMy guide: https://carswithsam.com/perfect-match?'+new URLSearchParams({preferences,guideTrim:state.trim,condition:state.condition,maxPrice:String(state.budget||'')}));
 return path+'?'+params;
}
function settings(){return `<details class="pg-settings"${settingsOpen?' open':''}><summary>Shopping preferences <span class="pg-settings-edit">${esc(state.condition)} · ${state.budget?money(state.budget):'Any price'}</span></summary><div class="pg-setup"><label>Condition<select data-setting="condition">${['New','Used','Both'].map(s=>`<option value="${s}"${state.condition===s?' selected':''}>${s==='Both'?'New and used':s}</option>`).join('')}</select></label><label>Maximum listed price<input data-budget type="number" min="0" max="1000000" step="1000" inputmode="numeric" value="${budgetDraft||''}" placeholder="Any price"><button type="button" data-action="apply-budget">Apply budget</button></label><label>Trim<select data-setting="trim"><option value="">Help me choose — all trims</option>${lineup.trims.map(t=>`<option value="${esc(t.id)}"${state.trim===t.id?' selected':''}>${esc(t.name)}</option>`).join('')}</select></label></div><p class="pg-muted">Prices may include conditional incentives. Confirm your price and availability.</p></details>`;}
function liveMatches(){const {confirmed,possible}=summary(matches());return `<aside class="bg-live-matches"><p data-live-count role="status" aria-live="polite"><strong>${confirmed.length} confirmed ${confirmed.length===1?'match':'matches'}</strong>${possible.length?`<small>${possible.length} others still need equipment verification</small>`:''}</p><button type="button" data-action="results">See matches →</button>${!confirmed.length?`<p class="bg-no-confirmed">${possible.length?'No confirmed match yet. Some vehicles need more evidence.':'No vehicles fit all these choices.'} <button type="button" data-action="review">Review or remove a choice</button></p>`:''}</aside>`;}
function modelCards(){
 const years=[...new Set(catalog.models.map(m=>m.year))].sort((a,b)=>b-a),models=catalog.models.filter(m=>(state.brand==='All'||m.brand===state.brand)&&String(m.year)===state.year);
 return `<div class="pg-question"><h2 tabindex="-1" data-heading>Let’s find your car</h2><p>Choose a model. Explore a stack of alternatives for each feature. Your choices narrow the trims and vehicles as you go.</p></div><div class="bg-filters"><label>Model year<select data-setting="year">${years.map(y=>`<option${String(y)===state.year?' selected':''}>${y}</option>`).join('')}</select></label><label>Make<select data-setting="brand">${['All','Jeep','Ram','Dodge','Chrysler'].map(b=>`<option${b===state.brand?' selected':''}>${b}</option>`).join('')}</select></label></div><div class="pg-model-grid">${models.map(m=>{const photo=m.trims.find(t=>t.imageUrl)?.imageUrl;return `<button type="button" class="pg-model-card" data-model="${esc(m.id)}">${photo?`<img src="${esc(photo)}" alt="" width="480" height="320" loading="lazy">`:''}<span><strong>${esc(m.name)}</strong><small>${m.year} · ${m.trims.length} trims</small><small>Start here →</small></span></button>`;}).join('')}</div>${!models.length?'<p>No models in this selection. Try a different year or make.</p>':''}${state.model?'<div class="pg-controls"><button type="button" data-action="resume">Resume my saved choices</button></div>':''}`;
}
function baseFacts(){const path=photoPath.resolve(lineup,{}),base=lineup.trims.find(t=>t.id===path.base?.id)||lineup.trims[0];const facts=path.baseFeatures?.length?path.baseFeatures.map(f=>({label:f.label||f.text,value:f.value,sourceUrl:f.sourceUrl})):base.choices.map(id=>lineup.choices.get(id)).filter(c=>c.facts[base.id]?.status==='standard').slice(0,5).map(c=>({label:c.fullLabel,value:c.detail,sourceUrl:c.sourceUrl}));return {base,facts,path};}
function startView(){const {base,facts,path}=baseFacts(),photoCount=photoQuestions().length;return `<div class="pg-stage"><div class="pg-question"><p class="pg-badge">Your starting point</p><h2 data-heading tabindex="-1">Start with the ${esc(base.name)}</h2><p>See what comes included, then keep it or explore upgrades. We’ll find the trims and vehicles that fit your choices.</p></div><details class="pg-source"><summary>What comes with the base trim?</summary><ul class="pg-base-features">${facts.map(f=>`<li><span>${esc(f.label)}</span>${f.value?`<strong>${esc(f.value)}</strong>`:''}${f.sourceUrl?`<a href="${esc(f.sourceUrl)}" target="_blank" rel="noopener noreferrer">Factory source ↗</a>`:''}</li>`).join('')}</ul>${path.shopperScope?`<p>${esc(path.shopperScope)}</p>`:''}</details>${settings()}${categoryProgress()}${liveMatches()}${photoCount?`<p class="pg-muted">Work through the applicable equipment and packages. Included features resolve automatically; photos identify the actual inventory vehicle or the manufacturer’s feature example.</p>`:'<p class="bg-coverage">Explore the factory equipment with feature illustrations and explanations. Verified vehicle photos appear where available.</p>'}<div class="pg-controls"><button type="button" class="pg-positive" data-action="start">Explore my choices →</button><button type="button" data-action="trims">Explore all trims</button></div></div>`;}
function trimCards(){return `<h2 data-heading tabindex="-1">Trims &amp; included equipment</h2><p>${esc(lineup.scope||'')}</p><p class="pg-muted">${esc(lineup.coverage||'')}</p><div class="pg-controls"><button type="button" data-trim="">Help me choose across all trims</button></div><div class="bg-trims">${lineup.trims.map(t=>{const facts=t.choices.map(id=>lineup.choices.get(id)),standard=facts.filter(c=>c.facts[t.id]?.status==='standard'),optional=facts.filter(c=>c.facts[t.id]?.status==='optional');return `<article class="bg-trim"><h3>${esc(t.name)}</h3><p>${esc(t.difference||'')}</p><details><summary>Included equipment (${standard.length})</summary><ul>${standard.map(c=>`<li><strong>${esc(c.fullLabel)}</strong>${c.detail?' — '+esc(c.detail):''} ${source(c)}</li>`).join('')}</ul></details><details><summary>Options &amp; packages (${optional.length})</summary><ul>${optional.map(c=>`<li><strong>${esc(c.fullLabel)}</strong>${c.detail?' — '+esc(c.detail):''}${c.facts[t.id]?.note?'<p>'+esc(c.facts[t.id].note)+'</p>':''} ${source(c)}</li>`).join('')}</ul></details><button type="button" data-trim="${esc(t.id)}">Choose ${esc(t.name)}</button></article>`;}).join('')}</div>`;}
function choiceInfo(q,c){
 const cacheKey=JSON.stringify([lineup.id,state.trim,state.answers,state.unresolved,state.condition,state.budget]);
 if(choiceInfoCache.key!==cacheKey)choiceInfoCache={key:cacheKey,rows:new Map()};
 const entry=q.id+'/'+c.id;if(choiceInfoCache.rows.has(entry))return choiceInfoCache.rows.get(entry);
 const answers=groupAnswers(q,c.id),rows=summary(matches(answers)),trims=lineup.trims.filter(t=>!state.trim||t.id===state.trim),assessments=trims.map(t=>assess(answers,t.id));
 const blocked=!rows.confirmed.length&&assessments.length>0&&assessments.every(a=>a.conflicts.length>0);
 let route=c.image&&c.kind!=='factory'?photoPath.offer(lineup,state.answers,c.originQuestionId||q.id,c.id):null;
 if(c.image&&c.kind!=='factory'&&state.trim){const selected=photoPath.resolve(lineup,answers).assessments.find(a=>a.trim.id===state.trim),check=selected?.checks.find(x=>x.choiceId===c.id&&!x.rejected),rule=selected?.trim.choices?.[c.id];route={trim:lineup.trims.find(t=>t.id===state.trim),availability:check?.availability||'unknown',note:check?.note||'This trim route needs more factory evidence.',replaces:check?.replaces||null,requires:rule?.requires||[],sourceUrl:check?.sourceUrl||null};}
 const fact=c.kind==='factory'&&state.trim?c.facts[state.trim]:null;
 let routeLabel=state.trim&&fact?(fact.status==='standard'?'Included on ':fact.status==='optional'?'Optional on ':fact.status==='verify'?'Factory sources disagree for ':'Unavailable on ')+trimName(state.trim):route?.trim&&['standard','optional'].includes(route.availability)?(route.availability==='standard'?'Included on ':'Optional on ')+route.trim.name:state.trim&&c.image?'Trim availability needs review':c.kind==='factory'?'Factory equipment':'Verified equipment';
 if(c.kind==='factory'&&!state.trim){
  const offered=trims.find((t,i)=>!assessments[i].conflicts.length&&['standard','optional'].includes(c.facts[t.id]?.status));
  if(offered){const f=c.facts[offered.id];routeLabel=(f.status==='standard'?'Included on ':'Optional on ')+offered.name+(f.note==='Part of a package'?' · package required':'');}
 }
 if(blocked)routeLabel='Doesn’t fit your current choices';
 const result={rows,blocked,route,routeLabel};choiceInfoCache.rows.set(entry,result);return result;
}
function availability(c){
 if(c.kind!=='factory')return '';
 return ['standard','optional','unavailable','verify'].map(status=>{
  const trims=lineup.trims.filter(t=>(!state.trim||t.id===state.trim)&&c.facts[t.id]?.status===status);
  if(!trims.length)return '';
  const sources=new Map();for(const t of trims)for(const u of [c.facts[t.id].sourceUrl,c.facts[t.id].conflictingSourceUrl]){if(u){if(!sources.has(u))sources.set(u,[]);sources.get(u).push(t.name);}}
  return `<p><strong>${status==='standard'?'Included':status==='optional'?'Optional / package':status==='verify'?'Factory sources disagree':'Unavailable'}:</strong> ${esc(trims.map(t=>t.name).join(', '))}</p><div class="pg-detail">${[...sources].map(([url,names])=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(names.join(', '))} source ↗</a>`).join('')}</div>`;
 }).join('');
}
const featurePhoto=c=>buyerFeaturePhoto(lineup,c,photos,{trimId:state.trim})||buyerAudioPhoto(lineup,c,{trimId:state.trim})||buyerRoofPhoto(lineup,c,{trimId:state.trim})||buyerTechnologyPhoto(lineup,c,{trimId:state.trim});
function featureMedia(c,q,{thumbnail=false,photo=featurePhoto(c)}={}){
 const visible=photo&&!failedPhotos.has(c.id),crop=visible&&photo.crop;
 const imageStyle=crop?` style="left:${-crop.x/crop.width*100}%;top:${-crop.y/crop.height*100}%;width:${crop.sourceWidth/crop.width*100}%;height:${crop.sourceHeight/crop.height*100}%"`:'';
 const frameStyle=crop?` style="aspect-ratio:${crop.width}/${crop.height}"`:'';
 return `<span class="pg-feature-media${thumbnail?' pg-feature-thumb':''}${crop?' pg-cropped-photo':''}"${frameStyle}${thumbnail?' aria-hidden="true"':''}>${visible?`<img src="${esc(photo.image)}" alt="${thumbnail?'':esc((photo.caption||photo.label)+' · '+photo.title)}" width="${photo.crop?.sourceWidth||photo.width||1024}" height="${photo.crop?.sourceHeight||photo.height||682}" draggable="false" decoding="async"${thumbnail?' loading="lazy"':''}${imageStyle}>`:renderBuyerFeatureVisual(c,{category:q.category||q.id,fact:state.trim?c.facts?.[state.trim]:null})}</span>`;
}
function featureCard(c,q){
 const info=choiceInfo(q,c),passed=rejected(q,c),photo=featurePhoto(c),shownPhoto=photo&&!failedPhotos.has(c.id),explanation=buyerFeatureExplanation(c,q);
 const fullLabel=c.fullLabel||c.label,photoIdentity=shownPhoto?(photo.photoKind==='oem'?photo.caption:`Photo: ${photo.title} · Stock ${photo.stock}`):'Feature illustration · See the specification for this option';
 const notes=c.kind==='factory'?[...new Set(Object.entries(c.facts).filter(([id])=>!state.trim||id===state.trim).map(([,f])=>f.note).filter(Boolean))]:[info.route?.note||c.availability||q.availability].filter(Boolean);
 return `<article class="pg-option${passed?' pg-passed':''}"><div class="pg-card pg-single-card" data-card="${esc(c.id)}" tabindex="0" role="group" aria-label="${esc(fullLabel)}. Swipe right to choose and move on, or left for another alternative." data-choice-blocked="${info.blocked}">${featureMedia(c,q,{photo})}<span class="pg-swipe-feedback" aria-hidden="true"></span><span class="pg-card-caption"><strong>${esc(fullLabel)}</strong><span class="pg-route">${esc(info.routeLabel)}</span>${info.route?.replaces?`<span class="pg-replaces">Replaces: ${esc(info.route.replaces)}</span>`:''}${info.route?.requires?.length?`<span class="pg-linked">Includes ${esc(info.route.requires.map(id=>photos.choices.get(id)?.label||id).join(', '))}</span>`:''}<span class="pg-feature-explanation">${esc(explanation.summary)}</span>${explanation.details&&explanation.details!==fullLabel?`<span class="pg-feature-description">${esc(explanation.details)}</span>`:''}<small class="pg-photo-identity">${esc(photoIdentity)}</small><span class="pg-choice-count">${info.rows.confirmed.length} confirmed ${info.rows.confirmed.length===1?'match':'matches'} with this choice${info.rows.possible.length?' · '+info.rows.possible.length+' need verification':''}</span><span class="pg-swipe-label">${info.blocked?'You can exclude this option, view another, or review earlier choices':passed?'Excluded from your matches':'← Don’t want · Want & next →'}</span></span></div><div class="pg-card-actions"><button type="button" class="pg-negative" data-answer="reject:${esc(c.id)}">× Don’t want</button><button type="button" class="pg-positive" data-answer="${esc(c.id)}"${info.blocked?' disabled':''}>Want &amp; next ✓</button></div><details class="pg-option-details"><summary>${shownPhoto?(photo.photoKind==='oem'?'Details & manufacturer image':'Details & real photo'):'What’s included, optional or replaced?'}</summary>${availability(c)}${notes.map(n=>'<p>'+esc(n)+'</p>').join('')}${c.warning?'<p class="bg-coverage">'+esc(c.warning)+'</p>':''}${photo?.caption?'<p>'+esc(photo.caption)+'</p>':''}${c.photoNote?'<p>'+esc(c.photoNote)+'</p>':''}${(c.includedPackages||[]).filter(p=>!state.trim||p.trimIds.includes(state.trim)).map(p=>'<p><strong>Also includes '+esc(p.label)+':</strong> '+esc(p.includes)+'</p>').join('')}<div class="pg-detail">${photo?'<a href="'+esc(photo.image)+'" target="_blank" rel="noopener noreferrer">View full photo ↗</a>':''}${source(c)}${photo?.photoKind==='oem'?'<a href="'+esc(photo.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Manufacturer image source ↗</a>':''}${photo?.crosswalkSource?'<a href="'+esc(photo.crosswalkSource)+'" target="_blank" rel="noopener noreferrer">Radio specification source ↗</a>':''}${info.route?.sourceUrl?'<a href="'+esc(info.route.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Trim &amp; option source ↗</a>':''}${(photo?.stickerSource||c.stickerSource)?'<a href="'+esc(photo?.stickerSource||c.stickerSource)+'" target="_blank" rel="noopener noreferrer">Window sticker ↗</a>':''}</div></details>${passed?`<button type="button" class="pg-restore" data-restore="${esc(c.id)}">Undo this exclusion</button>`:''}</article>`;
}
function optionStack(q,choices,c){
 const others=choices.filter(x=>x.id!==c.id),peeks=others.slice(0,4);
 return `<div class="pg-option-stack" aria-label="${esc(q.title)} option stack"><div class="pg-stack-peeks">${peeks.map((choice,i)=>`<button type="button" class="pg-stack-peek" data-show-choice="${esc(choice.id)}" style="--peek:${i}" aria-label="View ${esc(choice.label)}">${featureMedia(choice,q,{thumbnail:true})}<span>${esc(choice.label)}${rejected(q,choice)?' · Excluded':answer(q)===choice.id?' · Selected':''}</span><b aria-hidden="true">↗</b></button>`).join('')}</div><div class="pg-stack-front">${featureCard(c,q)}</div></div>${others.length>4?`<details class="pg-stack-all"><summary>View all ${choices.length} alternatives</summary>${choices.map(choice=>`<button type="button" data-show-choice="${esc(choice.id)}">${esc(choice.label)}${rejected(q,choice)?' · Excluded':''}</button>`).join('')}</details>`:''}`;
}
function equipment(){
 const {qs,q,choices,c}=position(),routes=guideRoutes(),remaining=routes.filter(r=>r.status==='decision').length,done=routes.filter(r=>r.status==='resolved'||r.status==='autoIncluded').length,total=routes.filter(r=>!['unavailable','informational'].includes(r.status)).length;
 if(!q||!c)return `<h2 data-heading tabindex="-1">Your applicable choices are complete</h2>${includedSummary()}${liveMatches()}<div class="pg-controls"><button data-action="review">Review your choices</button><button data-action="results">View matching vehicles</button></div>`;
 const selected=choices.find(x=>x.id===answer(q))||q.choices.find(x=>x.id===answer(q)),excluded=choices.filter(x=>rejected(q,x)),allExcluded=choices.length>1&&excluded.length===choices.length,canContinue=!!selected||excluded.length>0&&!allExcluded;
 return `<div class="pg-stage"><div class="pg-bar"><span>${remaining} ${remaining===1?'decision':'decisions'} left · ${done} resolved</span><button type="button" data-action="review">Your choices (${requirements().length})</button></div><div class="pg-progress" role="progressbar" aria-label="Guide progress" aria-valuenow="${done}" aria-valuemin="0" aria-valuemax="${total}"><span style="width:${total?done/total*100:100}%"></span></div>${categoryProgress()}<div class="pg-question"><p class="pg-badge">${esc(lineup.name)} · ${esc(q.section||'Your choices')}</p><h2 data-heading tabindex="-1">${esc(q.title)}</h2><p>${choices.length>1?'Choose from these alternatives. Tap a card behind to bring it forward.':'Keep this feature, exclude it, or leave it open.'}</p></div>${choices.length>1?`<div class="pg-option-nav"><button type="button" data-action="previous-option" aria-label="Previous option">‹</button><span>Alternative ${state.option+1} of ${choices.length}</span><button type="button" data-action="next-option" aria-label="Next option">›</button></div>`:''}${optionStack(q,choices,c)}${selected?`<p class="pg-selection-summary" role="status">✓ Selected: <strong>${esc(selected.label)}</strong><br><small>Your choice is saved. Use Back to change it.</small></p>`:''}${allExcluded?`<div class="pg-excluded-recovery" role="status"><strong>You excluded every alternative here.</strong><p>Restore a card, go back, or choose No preference to reopen this feature.</p><button type="button" data-action="restore-group">Restore these alternatives</button></div>`:''}<div class="pg-controls pg-main-controls"><button type="button" data-action="back"${undo.length?'':' disabled'} aria-label="Undo the last choice">‹ Back</button><button type="button" data-answer="skip" class="pg-no-preference">No preference</button><button type="button" class="pg-positive" data-action="continue"${canContinue?'':' disabled'}>Continue →</button></div><p class="pg-gesture-hint">Swipe left for the next alternative. Swipe right to choose this feature and move on.</p>${includedSummary()}${liveMatches()}${settings()}${additionalEquipment()}<details class="pg-settings"><summary>Go to another feature</summary><label class="pg-jump-label">Feature<select data-jump><option value="">Choose a feature…</option>${qs.map((item,i)=>`<option value="${i}">${i+1}. ${esc(item.title.slice(0,100))}${routing().find(r=>r.group.id===item.id)?.status==='resolved'?' ✓':''}</option>`).join('')}</select></label></details><p class="pg-guide-note">Photos show the labeled feature on an identified vehicle or manufacturer example. Other cards use labeled feature illustrations and explain the factory equipment.</p></div>`;
}
function choiceList(){return `<ul class="pg-review-choices">${lineup.questions.filter(q=>state.answers[q.id]&&state.answers[q.id]!=='skip').map(q=>{const a=state.answers[q.id],values=Array.isArray(a)?a:[a];return `<li><span>${values.map(v=>{const no=v.startsWith('reject:'),c=q.choices.find(c=>c.id===(no?v.slice(7):v));return esc((no?'Don’t want: ':'Want: ')+(c?.label||v));}).join('<br>')}</span><button type="button" data-edit-question="${esc(q.id)}">Change</button><button type="button" data-remove-question="${esc(q.id)}" aria-label="Remove ${esc(q.title)} preference">Remove</button></li>`;}).join('')}${state.unresolved.map((r,i)=>`<li><span>${esc(r.label)} — saved requirement needs review</span><button type="button" data-remove-unresolved="${i}">Remove</button></li>`).join('')}</ul>`;}
function review(){return `<h2 data-heading tabindex="-1">Your choices</h2><p>Change or remove any preference. Your other choices stay saved.</p>${liveMatches()}${choiceList()}${!requirements().length?'<p>No equipment preferences yet.</p>':''}<div class="pg-controls"><button type="button" data-action="photos">Back to feature cards</button><button type="button" data-action="all-equipment">Continue the guide</button><button type="button" data-action="reset-choices">Clear equipment choices</button></div><h3>How the trims fit</h3><p class="pg-muted">This checks your photo choices and factory equipment together. Installed options still need VIN evidence.</p>${state.trim?'<button type="button" data-action="all-trims">Compare all trims</button>':''}<div class="bg-trims">${lineup.trims.filter(t=>!state.trim||t.id===state.trim).map(t=>{const a=assess(state.answers,t.id);return `<article class="bg-trim"><h3>${esc(t.name)}</h3><p>${a.conflicts.length?'Does not fit '+a.conflicts.length+' of your choices':a.unknown.length?a.unknown.length+' choices need a verified trim route':'Offers your selected features'}</p>${a.conflicts.length?'<ul>'+a.conflicts.map(x=>'<li>'+esc(x.choice?.fullLabel||x.choice?.label||x.label||'Selected feature')+(x.fact?.note?' — '+esc(x.fact.note):'')+'</li>').join('')+'</ul>':''}${a.options.length?'<p>Options / packages needed:</p><ul>'+a.options.map(x=>'<li>'+esc(x.choice?.fullLabel||x.choice?.label||'Selected option')+'</li>').join('')+'</ul>':''}<a href="/trim-guide?${esc(new URLSearchParams({model:lineup.modelId,trims:t.id}).toString())}#equipment">Full trim equipment →</a></article>`;}).join('')}</div>`;}
function results(){
 const remainingDecisions=guideRoutes().filter(r=>r.status==='decision').length,completedGuide=remainingDecisions===0;
 const {confirmed,possible,excluded}=summary(matches()),eligible=new Set([...confirmed,...possible].map(r=>r.v.vin));state.compareVins=state.compareVins.filter(vin=>eligible.has(vin));
 const renderRow=(r,exact)=>`<article class="pg-result">${r.v.photoUrl||r.v.photoUrls?.[0]?'<img class="bg-result-photo" src="'+esc(r.v.photoUrl||r.v.photoUrls[0])+'" alt="'+esc(r.v.title)+'" width="480" height="320" loading="lazy">':''}<h3>${esc(r.v.title)}</h3><p class="pg-result-price">${money(r.v.price)}</p><p>${esc(r.v.condition)} · Stock ${esc(r.v.stock)}</p><p>${exact?(requirements().length?'All selected equipment is confirmed':'Fits your model, trim, condition and budget'):r.unknown+' equipment choices still need verification'}</p>${r.checks.length?'<details><summary>How this vehicle fits</summary><ul>'+r.checks.map(c=>'<li>'+esc(c.label)+': <strong>'+(c.state==='match'?'Matches':c.state==='conflict'?'Does not match':'Needs verification')+'</strong>'+(c.evidence?.length?' — '+esc(c.evidence.join('; ')):'')+'</li>').join('')+'</ul></details>':''}<label><input type="checkbox" data-compare="${esc(r.v.vin)}"${state.compareVins.includes(r.v.vin)?' checked':''}> Add to comparison</label><a href="${esc(url('/vehicle-'+r.v.vin))}">View this vehicle →</a></article>`;
 return `<div class="pg-trim-summary"><h2 data-heading tabindex="-1">${completedGuide?'Your choices are complete':'Your matches so far'}</h2><p>${completedGuide?'Your applicable choices are resolved and saved.':remainingDecisions+' decisions remain in your guide. You can keep exploring before deciding.'}</p><div class="pg-controls"><button type="button" data-action="photos">${completedGuide?'Revisit your choices':'Continue your guide'} →</button></div></div>${includedSummary()}<h2 data-heading tabindex="-1">${confirmed.length?confirmed.length+' confirmed '+(confirmed.length===1?'match':'matches'):'Let’s refine your choices'}</h2><p>${excluded.length} vehicles excluded by your equipment choices.${possible.length?' '+possible.length+' others need verification and are listed separately.':''}</p>${settings()}<details class="pg-settings"><summary>Review or change your choices (${requirements().length})</summary>${choiceList()}</details>${!confirmed.length?'<div class="pg-empty"><p>'+(!possible.length?'No vehicles match all your choices, trim, condition and budget.':'No fully confirmed vehicle matches yet.')+' Your preferences are saved. Remove a preference, change your trim or adjust your budget.</p><button type="button" data-action="review">Adjust my choices</button><button type="button" data-action="back"'+(undo.length?'':' disabled')+'>Undo last choice</button></div>':''}<div class="pg-compare-controls"><button type="button" data-action="compare"${state.compareVins.length>=2&&state.compareVins.length<=5?'':' disabled'}>Compare selected vehicles</button><p data-compare-help>${state.compareVins.length} selected. Choose 2–5 vehicles.</p></div><div class="pg-results">${confirmed.slice(0,state.showAll?confirmed.length:6).map(r=>renderRow(r,true)).join('')}</div>${confirmed.length>6&&!state.showAll?'<button type="button" data-action="more">Show all '+confirmed.length+' matches</button>':''}${possible.length?`<details class="bg-possible"><summary>${possible.length} vehicles requiring equipment verification</summary><p>These are not confirmed matches. Open the equipment evidence to see what remains unresolved.</p><div class="pg-results">${possible.map(r=>renderRow(r,false)).join('')}</div></details>`:''}<div class="pg-controls"><button type="button" data-action="photos">Back to your choices</button><button type="button" data-action="all-equipment">Continue the guide</button><a href="${esc(url('/contact'))}">Ask Sam about my choices →</a></div><p class="pg-muted">Inventory checked ${esc(new Date(inventory.capturedAt).toLocaleString('en-US',{timeZone:'America/Chicago'}))} CT. Confirm current availability and pricing.</p>`;
}
function cleanAnswers(answers){
 const clean={};
 for(const [id,a] of Object.entries(answers&&typeof answers==='object'&&!Array.isArray(answers)?answers:{})){
  const q=lineup.questions.find(q=>q.id===id);if(!q)continue;
  if(a==='skip'){clean[id]=a;continue;}
  if(Array.isArray(a)){const kept=[...new Set(a.filter(v=>typeof v==='string'&&v.startsWith('reject:')&&q.choices.some(c=>c.id===v.slice(7))))];if(kept.length)clean[id]=kept;}
  else if(typeof a==='string'&&q.choices.some(c=>a===c.id||a==='reject:'+c.id))clean[id]=a;
 }
 return clean;
}
function restoreSavedAnswers(answers,unresolved=[],snapshot=[]){
 const clean=cleanAnswers(answers),pending=readPreferences({version:1,requirements:unresolved})?.requirements||[],portable=readPreferences({version:1,requirements:snapshot})?.requirements||[];
 for(const [questionId,a] of Object.entries(answers&&typeof answers==='object'&&!Array.isArray(answers)?answers:{}))for(const value of Array.isArray(a)?a:[a]){
  if(typeof value!=='string'||value==='skip')continue;
  const wanted=!value.startsWith('reject:'),choiceId=wanted?value:value.slice(7),prior=portable.find(r=>r.questionId===questionId&&r.choiceId===choiceId&&r.wanted===wanted);
  const q=lineup.questions.find(q=>q.id===questionId),choice=q?.choices.find(c=>c.id===choiceId);
  const retained=(Array.isArray(clean[questionId])?clean[questionId]:[clean[questionId]]).includes(value);
  if(retained&&(!prior||choice?.feature===prior.feature&&choice?.value===prior.value))continue;
  if(retained){if(Array.isArray(clean[questionId])){clean[questionId]=clean[questionId].filter(v=>v!==value);if(!clean[questionId].length)delete clean[questionId];}else delete clean[questionId];}
  const old=prior||{feature:'savedChoice',value:choiceId,wanted,label:q?String(q.title).slice(0,150)+' — saved option':'Previously saved feature',choiceId,questionId,model:lineup.id,year:lineup.year};
  if(!pending.some(r=>r.questionId===questionId&&r.choiceId===choiceId&&r.wanted===wanted)&&readPreferences({version:1,requirements:[old]}))pending.push(old);
 }
 return {answers:clean,unresolved:pending};
}
async function openModel(id,resume=false){
 loading=true;error='';draw();
 try{lineup=await loadBuyerLineup(id);if(!lineup.addedPhotos){const photo=photos.lineups.find(l=>l.id===id&&l.year===lineup.year);if(photo)lineup.questions=[...photo.questions.map(q=>({...q,section:q.section||'Real equipment photos'})),...lineup.questions];lineup.addedPhotos=true;}
 groups=buildBuyerOptionGroups(lineup,photos.lineups.find(l=>l.id===id&&l.year===lineup.year));routeCache=null;
 if(!resume){state.groupId='';state.reviewedGroups={};state.model=id;state.answers={};state.unresolved=[];state.savedRequirements=[];state.trim='';state.step=0;state.option=0;state.section='All';state.mode='photos';state.compareVins=[];state.showAll=false;undo=[];}
 Object.assign(state,restoreSavedAnswers(state.answers,state.unresolved,state.savedRequirements));
 if(!lineup.trims.some(t=>t.id===state.trim))state.trim='';state.mode='guided';state.section='All';state.reviewedGroups=state.reviewedGroups&&typeof state.reviewedGroups==='object'?state.reviewedGroups:{};position();
 undo=undo.filter(x=>x&&typeof x==='object').map(x=>({...x,...restoreSavedAnswers(x.answers,x.unresolved,x.savedRequirements||state.savedRequirements),trim:lineup.trims.some(t=>t.id===x.trim)?x.trim:''}));
 pool=inventory.vehicles.filter(v=>!v.external&&v.status!=='not-observed').map(v=>({v,m:buyerVehicleTrim(lineup,v,index.records[v.vin])})).filter(r=>r.m);
 stage=resume?'equipment':'start';budgetDraft=state.budget;notice=state.unresolved.length?'Some saved choices need review. They remain in your requirements.':'';save();
 }catch(e){error='This model could not load. Please try again.';console.error(e);stage='models';}finally{loading=false;draw(true);}
}
function select(value){const {q,choices}=position();if(!q)return;const no=value.startsWith('reject:'),id=no?value.slice(7):value,choice=choices.find(c=>c.id===id);if(value!=='skip'&&(!choice||(!no&&choiceInfo(q,choice).blocked)))return;
 remember();state.answers=groupAnswers(q,value);delete state.reviewedGroups[q.id];state.showAll=false;
 const selectedOther=no&&answer(q)&&answer(q)!==id;
 notice=value==='skip'?'No preference — moving to the next feature.':selectedOther?'Kept your selected option. Moving to the next feature.':(no?'Excluded: ':'Selected: ')+choice.label+'.';
 if(value==='skip'||!no||selectedOther)advanceGroup();else{
  const remaining=choices.filter(c=>!rejected(q,c));
  if(remaining.length){const next=remaining.find(c=>choices.indexOf(c)>state.option)||remaining[0];state.option=choices.indexOf(next);notice+=' Showing the next alternative.';}
  else if(choices.length===1&&q.exclusive===false)advanceGroup();
  else notice+=' You excluded every alternative. Restore one or choose No preference.';
 }
 const totals=summary(matches());notice+=' '+totals.confirmed.length+' confirmed '+(totals.confirmed.length===1?'match':'matches')+(totals.possible.length?' · '+totals.possible.length+' possible':'')+'.';
 save();draw(true);
}
function firstAvailableOption(){const {q,choices}=position();const i=q?choices.findIndex(c=>!rejected(q,c)&&!choiceInfo(q,c).blocked):-1;state.option=Math.max(0,i);}
function editQuestion(id){const q=findBuyerOptionGroup(groups,id);if(!q)return;state.mode='guided';state.section='All';state.groupId=q.id;position();state.option=Math.max(0,displayChoices(q).findIndex(c=>c.id===answer(q)));stage='equipment';save();draw(true);}
function applyTrim(id){remember();state.trim=lineup.trims.some(t=>t.id===id)?id:'';state.groupId='';state.step=0;state.option=0;state.section='All';state.showAll=false;notice='Trim updated. Your feature choices are preserved.';position();firstAvailableOption();save();}
function setMode(){state.mode='guided';state.section='All';stage='equipment';const pending=guideRoutes().find(r=>r.status==='decision');state.groupId=pending?.group.id||activeQuestions()[0]?.id||'';state.option=0;firstAvailableOption();}
function draw(focus=false){
 if(!root)return;const oldSettings=root.querySelector('.pg-settings');if(oldSettings)settingsOpen=oldSettings.open===true;
 for(const cleanup of cardGestureCleanups)cleanup();cardGestureCleanups=[];
 const shortcut=document.querySelector('[data-photo-selection]');if(shortcut){shortcut.textContent=stage==='models'?'Choose a model':'See my matches';shortcut.hidden=false;}
 if(loading){root.innerHTML='<p role="status">Loading verified equipment…</p>';return;}
 const top=stage==='models'?'':`<div class="pg-modelbar"><strong>${lineup.year} ${esc(lineup.name)}${state.trim?' · '+esc(trimName(state.trim)):''}</strong><button type="button" data-action="models">Change model</button><button type="button" data-action="trims">Trims &amp; equipment</button></div>`;
 try{root.innerHTML=top+(error?'<p role="alert">'+esc(error)+'</p>':'')+`<p class="pg-status pg-feedback" role="status" aria-live="polite">${esc(notice)}</p>`+({models:modelCards,start:startView,trims:trimCards,equipment,review,results}[stage]||modelCards)();}catch(e){console.error(e);root.innerHTML=top+'<p role="alert">This view could not load. Your saved choices are safe.</p><button type="button" data-action="photos">Return to the cards</button>';}
 root.querySelectorAll('[data-model]').forEach(b=>b.onclick=()=>openModel(b.dataset.model));
 root.querySelectorAll('[data-trim]').forEach(b=>b.onclick=()=>{applyTrim(b.dataset.trim);stage='equipment';save();draw(true);});
 root.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{if(!b.disabled)select(b.dataset.answer);});
 root.querySelector('[data-budget]')?.addEventListener('input',e=>{budgetDraft=e.target.value;});
 root.querySelectorAll('[data-setting]').forEach(e=>e.onchange=()=>{const k=e.dataset.setting;if(k==='trim')applyTrim(e.value);else{state[k]=e.value;if(k==='section'){state.step=0;state.option=0;firstAvailableOption();}}save();draw();root.querySelector('[data-setting="'+k+'"]')?.focus({preventScroll:true});});
 root.querySelector('[data-option]')?.addEventListener('change',e=>{state.option=Number(e.target.value)||0;position();save();draw();root.querySelector('[data-option]')?.focus({preventScroll:true});});
 root.querySelector('[data-jump]')?.addEventListener('change',e=>{if(e.target.value==='')return;state.step=Number(e.target.value)||0;state.groupId=activeQuestions()[state.step]?.id||'';state.option=0;position();firstAvailableOption();save();draw(true);});
 root.querySelectorAll('[data-edit-question]').forEach(b=>b.onclick=()=>editQuestion(b.dataset.editQuestion));
 root.querySelectorAll('[data-remove-question]').forEach(b=>b.onclick=()=>{remember();delete state.answers[b.dataset.removeQuestion];notice='Preference removed. Matches updated.';save();draw();});
 root.querySelectorAll('[data-remove-unresolved]').forEach(b=>b.onclick=()=>{remember();state.unresolved.splice(Number(b.dataset.removeUnresolved),1);save();draw();});
 root.querySelectorAll('[data-show-choice]').forEach(b=>b.onclick=()=>{const {choices}=position();state.option=Math.max(0,choices.findIndex(c=>c.id===b.dataset.showChoice));save();draw();root.querySelector('[data-card]')?.focus({preventScroll:true});});
 root.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{const rows=guideRoutes().filter(r=>(r.group.topic?.id||r.group.section)===b.dataset.category),next=rows.find(r=>r.status==='decision')||rows.find(r=>r.status==='resolved');if(!next)return;state.groupId=next.group.id;state.option=0;stage='equipment';firstAvailableOption();save();draw(true);});
 root.querySelectorAll('[data-open-group]').forEach(b=>b.onclick=()=>{state.groupId=b.dataset.openGroup;state.option=0;stage='equipment';firstAvailableOption();save();draw(true);});
 root.querySelectorAll('[data-restore]').forEach(b=>b.onclick=()=>{remember();const {q}=position(),c=q.choices.find(c=>c.id===b.dataset.restore),id=c.originQuestionId||q.id,remaining=(Array.isArray(state.answers[id])?state.answers[id]:[state.answers[id]]).filter(v=>v&&v!=='reject:'+c.id);if(remaining.length)state.answers[id]=remaining;else delete state.answers[id];delete state.reviewedGroups[q.id];save();draw();});
 root.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{
 if(b.disabled)return;const a=b.dataset.action;if(a==='resume'){openModel(state.model,true);return;}
 if(a==='start'){state.budget=clampBudget(budgetDraft);setMode(photoQuestions().length?'photos':'all');}
 else if(a==='back'){if(undo.length){const restored=undo.pop();Object.assign(state,restored);stage=['equipment','review','results','start','trims'].includes(restored.stage)?restored.stage:'equipment';position();notice='Last change undone.';}}
 else if(a==='previous-option'||a==='next-option'){const {choices}=position();state.option=(state.option+(a==='next-option'?1:-1)+choices.length)%choices.length;save();draw();root.querySelector('[data-card]')?.focus({preventScroll:true});return;}
 else if(a==='continue'){const {q}=position();remember();state.reviewedGroups[q.id]=groupSignature(q);advanceGroup();}
 else if(a==='restore-group'){const {q}=position();remember();for(const id of q.questionIds)delete state.answers[id];delete state.reviewedGroups[q.id];state.option=0;notice='Alternatives restored.';}
 else if(a==='apply-budget'){state.budget=clampBudget(root.querySelector('[data-budget]')?.value??budgetDraft);budgetDraft=state.budget;notice='Budget applied. Matches updated.';}
 else if(a==='photos'||a==='all-equipment')setMode(a==='photos'?'photos':'all');
 else if(a==='all-trims'){applyTrim('');stage='review';}
 else if(a==='reset-choices'){remember();state.answers={};state.unresolved=[];state.reviewedGroups={};state.groupId='';state.step=0;state.option=0;notice='Equipment choices cleared.';}
 else if(a==='more'){state.showAll=true;save();draw();root.querySelectorAll('.pg-result')[6]?.querySelector('a')?.focus({preventScroll:true});return;}
 else if(a==='compare'){if(state.compareVins.length>=2&&state.compareVins.length<=5)location.href=url('/compare',{vehicles:state.compareVins.join(',')});return;}
 else if(['models','start','trims','equipment','review','results'].includes(a))stage=a;
 save();draw(true);
 });
 root.querySelectorAll('[data-compare]').forEach(e=>e.onchange=()=>{const selected=new Set(state.compareVins);if(e.checked){if(selected.size>=5){e.checked=false;root.querySelector('[data-compare-help]').textContent='You can compare up to 5 vehicles. Remove one to add another.';return;}selected.add(e.dataset.compare);}else selected.delete(e.dataset.compare);state.compareVins=[...selected];save();root.querySelector('[data-action="compare"]').disabled=selected.size<2;root.querySelector('[data-compare-help]').textContent=selected.size+' selected. Choose 2–5 vehicles.';});
 root.querySelectorAll('[data-card]').forEach(b=>{
 cardGestureCleanups.push(attachBuyerCardGestures(b,{
  canChoose:()=>b.dataset.choiceBlocked!=='true',canReject:()=>true,
  onDecision:direction=>select((direction==='reject'?'reject:':'')+b.dataset.card),
  onFeedback:({phase,direction,blocked})=>{
   const cue=b.querySelector('.pg-swipe-feedback');if(cue)cue.textContent=blocked?'Doesn’t fit your choices':direction==='choose'?'Want — next feature':'Don’t want — next option';
   if(phase==='blocked'){const status=root.querySelector('.pg-feedback');if(status)status.textContent='This option does not fit your current choices. Swipe left to view another, or use Back to change an earlier choice.';}
  }
 }));
 b.querySelector('img')?.addEventListener('error',()=>{failedPhotos.add(b.dataset.card);notice='This photo could not load. The feature explanation is still available and your choices still work.';draw();});
 });
 if(focus){const h=root.querySelector('[data-heading]');h?.focus({preventScroll:true});(notice?root.querySelector('.pg-feedback'):h)?.scrollIntoView({block:'start',behavior:'instant'});}
}
async function boot(){
 loading=true;if(root)root.innerHTML='<p role="status">Loading models and verified equipment…</p>';
 try{const read=async path=>{const r=await fetch(path,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(path);return r.json();};let photoCatalog,pathData;
 [catalog,inventory,index,photoCatalog,pathData]=await Promise.all([loadBuyerCatalog(),read('/data/used-inventory.json'),read('/data/equipment-index.json'),read('/data/feature-photo-guide.json'),read('/data/photo-trim-path.json')]);
 photos=createPhotoGuide(photoCatalog,inventory.vehicles,index.records);photoPath=createPhotoTrimPath(pathData,photos);
 let stored;try{stored=JSON.parse(sessionStorage.getItem(key)||'null');}catch{}
 if(stored&&catalog.models.some(m=>m.id===stored.model)){state={...state,...stored,year:String(stored.year),budget:clampBudget(stored.budget),condition:['New','Used','Both'].includes(stored.condition)?stored.condition:'New',answers:stored.answers&&typeof stored.answers==='object'&&!Array.isArray(stored.answers)?stored.answers:{},compareVins:Array.isArray(stored.compareVins)?stored.compareVins.filter(v=>typeof v==='string').slice(0,5):[]};undo=Array.isArray(stored.undo)?stored.undo.slice(-100):[];}
 if(!catalog.models.some(m=>String(m.year)===state.year))state.year=String(Math.min(...catalog.models.map(m=>m.year)));if(!['All','Jeep','Ram','Dodge','Chrysler'].includes(state.brand))state.brand='All';
 budgetDraft=state.budget;stage='models';loading=false;
 const params=new URLSearchParams(location.search),shared=readPreferences(params),aliases={ram1500:'ram-1500',ram3500:'ram-3500',pacifica:'chrysler-pacifica',grandcherokee:'jeep-grand-cherokee'};
 if(shared&&catalog.models.some(m=>m.id===(aliases[shared.model]||shared.model))){await openModel(aliases[shared.model]||shared.model);state.answers={};state.unresolved=[];for(const r of shared.requirements){const q=lineup.questions.find(q=>q.id===r.questionId),c=q?.choices.find(c=>c.id===r.choiceId&&c.feature===r.feature&&c.value===r.value);if(c){if(r.wanted)state.answers[q.id]=c.id;else if(!state.answers[q.id]||Array.isArray(state.answers[q.id]))state.answers[q.id]=[...(state.answers[q.id]||[]),'reject:'+c.id];}else state.unresolved.push(r);}state.trim=lineup.trims.some(t=>t.id===params.get('guideTrim'))?params.get('guideTrim'):'';state.condition=['New','Used','Both'].includes(params.get('condition'))?params.get('condition'):'New';state.budget=clampBudget(params.get('maxPrice'));budgetDraft=state.budget;stage='review';save();}
 document.querySelector('[data-photo-selection]')?.addEventListener('click',()=>{if(lineup&&stage!=='models'){stage='results';save();draw(true);}else root.scrollIntoView();});draw();
 }catch(e){loading=false;console.error(e);root.innerHTML='<h2>The guide could not load</h2><p>Your saved choices are safe. Try loading again.</p><button type="button" data-retry>Try again</button><p><a href="/inventory">Browse inventory</a> · <a href="/trim-guide">Compare trims</a></p>';root.querySelector('[data-retry]')?.addEventListener('click',boot);}
}
if(root)await boot();
