export function comparisonRows(definitions,records,requested=[]){
 return definitions.map(([id,label])=>{
  const facts=records.map(s=>s?.status==='verified'?s.features?.[id]||null:null);
  const states=facts.map(f=>f?(f.comparisonValue??(f.value?'present':'absent')):'unknown');
  const known=states.filter(s=>s!=='unknown');
  let group=known.length===0?'unknown':known.length<states.length?'check':'same';
  if(new Set(known).size>1)group='difference';
  return {id,label,facts,group,specification:facts.some(f=>f?.comparisonValue!==undefined),requested:requested.includes(id)};
 }).sort((a,b)=>Number(b.requested)-Number(a.requested)||(['difference','wording','check','same','unknown'].indexOf(a.group)-['difference','wording','check','same','unknown'].indexOf(b.group)));
}

export function visibleComparisonRows(rows, mode='important', search='') {
 const term=search.trim().toLowerCase();
 return rows.filter(row=>{
  if(term&&!(row.label+' '+row.facts.map(f=>f?.displayValue||'').join(' ')).toLowerCase().includes(term))return false;
  if(mode==='requested')return row.requested;
  if(mode==='all')return row.group==='same'&&row.facts.every(Boolean);
  if(mode==='check')return row.group==='check'||(row.group==='unknown'&&(row.requested||Boolean(term)));
  if(mode==='complete')return row.group==='same'||row.group==='difference';
  return row.group==='difference';
 });
}
