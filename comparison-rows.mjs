const order=['difference','listed-on-some','wording','check','same','unknown'];
// What the factory trim guide says about a feature the window sticker leaves out. Standard equipment is
// often not printed on a sticker; an option is. So: standard → the vehicle has it; optional and not on a
// readable sticker → it does not; not offered on the trim → it does not.
function fromTrimGuide(guide,id,verified){
 const fact=guide?.facts?.get(id);if(!fact)return null;
 const base={trimGuide:fact.status,sourceUrl:fact.sourceUrl,evidence:[`${guide.name} — ${fact.label}: ${fact.value}`,fact.note].filter(Boolean)};
 if(fact.status==='standard')return {...base,value:true,displayValue:'✓ Standard on '+guide.name,method:'trim-guide-standard'};
 if(fact.status==='unavailable')return {...base,value:false,displayValue:'— Not offered on '+guide.name,method:'trim-guide-unavailable'};
 return verified?{...base,value:false,displayValue:'— Optional, not on this sticker',method:'trim-guide-optional'}:null;
}
// `guides[i]` is the trim guide column for vehicle i: {name, facts: Map(feature id → guide fact)} or null.
export function comparisonRows(definitions,records,requested=[],guides=[]){
 return definitions.map(([id,label])=>{
  const facts=records.map(s=>s?.status==='verified'?s.features?.[id]||null:null);
  // The guide only completes a row that at least one window sticker speaks to.
  if(facts.some(Boolean))facts.forEach((f,i)=>{if(!f)facts[i]=fromTrimGuide(guides[i],id,records[i]?.status==='verified');});
  const states=facts.map(f=>f?(f.comparisonValue??(f.value?'present':'absent')):'unknown');
  const known=states.filter(s=>s!=='unknown');
  let group=known.length===0?'unknown':known.length<states.length?'check':'same';
  if(new Set(known).size>1)group='difference';
  // One window sticker lists it and another readable sticker does not. A shopper comparing two trucks needs to see
  // that (ventilated seats, a sunroof, skid plates), so it is shown with the differences, worded as what it is:
  // listed on one sticker, not stated on the other. With no sticker at all for a vehicle it stays an item to check.
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
  if(mode==='check')return row.group==='check'||(row.group==='unknown'&&(row.requested||Boolean(term)));
  if(mode==='complete')return row.group==='same'||row.group==='difference'||row.group==='listed-on-some';
  return row.group==='difference'||row.group==='listed-on-some';
 });
}
