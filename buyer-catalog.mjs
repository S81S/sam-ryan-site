import {factoryFacts,FLEET} from './factory-facts.mjs';
import {plainFact} from './plain-labels.mjs';

export const stableId=text=>{let h=2166136261;for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(36);};
export function buyerModels(guide,index){
 const out=[];
 for(const model of guide.models){
  const entries=Object.entries(index.models||{}).filter(([,m])=>m.model===model.id);
  const variants=entries.length?entries:[[model.id,null]];
  for(const [id,meta] of variants){
   // Split body/powertrain charts only constrain their own trims. An ordinary chart's
   // uncharted special editions stay visible using their separately sourced facts.
   const trims=meta?.name?model.trims.filter(t=>meta.trims.includes(t.id)):model.trims;
   out.push({id,modelId:model.id,name:meta?.name||(meta?.stock?.not?model.name.split(' / ')[0]+' (2-row)':model.name),year:model.year,brand:model.brand,
    scope:model.scope,coverage:model.coverageNote,versions:meta?.versions,fleet:!!meta?.fleet||FLEET.includes(model.id),meta,trims});
  }
 }
 return out;
}
const allowed=f=>['standard','optional','unavailable'].includes(f.status)&&f.sourceUrl;
export function buyerLineup(model,chart){
 const choices=new Map(),trims=[];
 for(const trim of model.trims){
  const charted=chart?.trims.includes(trim.id);
  const facts=charted?factoryFacts(chart,trim.id,{fleet:model.fleet}):(trim.comparison?.length?trim.comparison:(trim.standard||[]).map(f=>({...f,key:f.key||f.label,status:'standard'})));
  const own=[];
  for(const f of facts.filter(allowed)){
   const p=plainFact(f),label=[p.group,p.name].filter(Boolean).join(': '),detail=[p.detail,p.includes].filter(Boolean).join(' · ');
   if(!label||/^(?:availability|announcement|status|model year)$/i.test(label))continue;
   // Full text, not the chart's truncated key: two Level/Group variants can share
   // that key while containing different equipment on different trims.
   const identity=JSON.stringify([model.id,f.factory?f.parent:'',f.factory?f.text:f.key,f.value||'']);
   const id='f'+stableId(identity);
   let c=choices.get(id);
   if(c&&c.identity!==identity)throw Error('Factory choice ID collision');
   if(!c){c={id,identity,feature:'factoryChoice',value:id,model:model.id,year:model.year,label:label.slice(0,180),fullLabel:label,
    kind:'factory',section:p.section||f.section||'Equipment',detail,includes:p.includes,sourceUrl:f.sourceUrl,
    package:/package|group/i.test(f.section||'')||/\b(?:package|group|edition)\b/i.test(p.name),facts:{}};choices.set(id,c);}
   if(model.id==='chrysler-pacifica'&&/theater family group ii/i.test(label))c.warning='For Select, the factory fleet package description and retail brochure disagree about FamCAM and some package content. Confirm those details on the exact VIN; the package name alone does not settle them.';
   c.facts[trim.id]={...f,note:p.note,display:label,detail};own.push(c.id);
  }
  trims.push({...trim,charted,choices:own});
 }
 // Expand only explicit included group names, on the same model/year/trim.
 // A reference in a requires/optional note is not included equipment.
 const packages=[...choices.values()].filter(c=>c.package),normalize=s=>String(s).toLowerCase().replace(/[®™]/g,'').replace(/\s+/g,' ').trim();
 for(const c of packages){
  const parts=String(c.includes||'').split(/[,;]/).map(normalize);
  c.includedPackages=[];
  for(const other of packages){if(other===c)continue;
   const aliases=[other.fullLabel,...[...other.fullLabel.matchAll(/\(([A-Z0-9]+\s+Group)\)/g)].map(m=>m[1])].map(normalize);
   if(!parts.some(p=>aliases.includes(p)))continue;
   const trimIds=trims.filter(t=>c.facts[t.id]&&c.facts[t.id].status!=='unavailable'&&other.facts[t.id]&&other.facts[t.id].status!=='unavailable').map(t=>t.id);
   if(trimIds.length)c.includedPackages.push({id:other.id,label:other.fullLabel,includes:other.includes,trimIds,sourceUrl:other.sourceUrl});
  }
 }
 // No chart is treated as complete for a trim it doesn't actually document.
 const questions=[...choices.values()].filter(c=>Object.values(c.facts).some(f=>f.status!=='unavailable')).map(c=>({id:c.id,title:c.fullLabel,section:c.section,choices:[c]}));
 const rank=q=>q.choices[0].package?0:/safety|seating|comfort|interior/i.test(q.section)?1:/uconnect|technology/i.test(q.section)?2:3;
 questions.sort((a,b)=>rank(a)-rank(b));
 return {...model,trims,questions,choices};
}
export function trimAssessment(lineup,answers,trimId){
 const checks=[];
 for(const q of lineup.questions){
  const answer=answers[q.id];if(!answer||answer==='skip')continue;
  for(const a of Array.isArray(answer)?answer:[answer]){
   const wanted=!a.startsWith('reject:'),c=q.choices.find(c=>c.id===(wanted?a:a.slice(7)));if(!c||c.kind!=='factory')continue;
   const f=c.facts[trimId];
   // Rejecting optional equipment still permits that trim without the option.
   const state=!f?'unknown':wanted?(f.status==='unavailable'?'conflict':'available'):(f.status==='standard'?'unknown':'available');
   checks.push({choice:c,wanted,fact:f,state});
  }
 }
 return {checks,conflicts:checks.filter(c=>c.state==='conflict'),unknown:checks.filter(c=>c.state==='unknown'),options:checks.filter(c=>c.wanted&&c.fact?.status==='optional')};
}
