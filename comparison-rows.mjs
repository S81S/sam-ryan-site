const order=['difference','listed-on-some','wording','check','same','unknown'];
// An absent feature on one vehicle, with no answer for the others, is useful
// when the buyer requested it. Otherwise it creates irrelevant uncertainty
// rows (for example, every other exterior paint color).
export const usefulComparisonRow=row=>row.group!=='check'||row.requested||row.specification||row.facts.some(f=>f?.value===true);
// What the factory trim guide says about a feature the window sticker leaves out. Standard equipment is
// often not printed on a sticker. A known option is available, but its installation
// needs VIN-specific evidence; a readable sticker alone does not prove an omission.
function fromTrimGuide(guide,id){
 const fact=guide?.facts?.get(id);if(!fact)return null;
 const base={trimGuide:fact.status,sourceUrl:fact.sourceUrl,evidence:[`${guide.name} — ${fact.label}: ${fact.value}`,fact.note].filter(Boolean)};
 if(fact.status==='standard')return {...base,value:true,displayValue:'✓ Standard on '+guide.name,method:'trim-guide-standard'};
 if(fact.status==='unavailable')return {...base,value:false,displayValue:'— Not offered on '+guide.name,method:'trim-guide-unavailable'};
 return null;
}
// `guides[i]` is the trim guide column for vehicle i: {name, facts: Map(feature id → guide fact)} or null.
export function comparisonRows(definitions,records,requested=[],guides=[]){
 return definitions.map(([id,label])=>{
  const facts=records.map(s=>s?.status==='verified'?s.features?.[id]||null:null);
  // Where a sticker says nothing, the guide's column for that vehicle's trim answers — also when no sticker
  // prints the feature at all (blind-spot monitoring on a truck whose sticker leaves the safety list off).
  facts.forEach((f,i)=>{if(!f)facts[i]=guides[i]?.resolvedFacts?.get(id)||fromTrimGuide(guides[i],id);});
  const states=facts.map(f=>f?(f.comparisonValue??(f.value?'present':'absent')):'unknown');
  const known=states.filter(s=>s!=='unknown');
  let group=known.length===0?'unknown':known.length<states.length?'check':'same';
  if(new Set(known).size>1)group='difference';
  // Missing documentation is a separate evidence gap, never proof that equipment differs.
  else if(group==='check'&&records.every(s=>s?.status==='verified')&&known.some(s=>s!=='absent'))group='listed-on-some';
  return {id,label,facts,group,specification:facts.some(f=>f?.comparisonValue!==undefined),requested:requested.includes(id)};
 }).sort((a,b)=>Number(b.requested)-Number(a.requested)||(order.indexOf(a.group)-order.indexOf(b.group)));
}

export function visibleComparisonRows(rows, mode='important', search='') {
 const term=search.trim().toLowerCase();
 return rows.filter(row=>{
  if(term&&!(row.label+' '+row.facts.map(f=>f?.displayValue||'').join(' ')).toLowerCase().includes(term))return false;
  if(mode==='requested')return row.requested;
  if(mode==='all')return row.group==='same'&&row.facts.every(Boolean);
  if(mode==='check')return row.group==='check'||row.group==='listed-on-some'||(row.group==='unknown'&&(row.requested||Boolean(term)));
  if(mode==='complete')return row.group==='same'||row.group==='difference'||row.group==='listed-on-some'||row.group==='check'||(row.requested&&row.group==='unknown');
  return row.group==='difference';
 });
}
