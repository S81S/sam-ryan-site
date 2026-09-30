export function comparisonRows(definitions,records,requested=[]){
 const normalize=lines=>(lines||[]).map(s=>s.toLowerCase().replace(/\s+/g,' ').trim()).sort().join('|');
 return definitions.map(([id,label])=>{
  const facts=records.map(s=>s?.status==='verified'?s.features?.[id]||null:null);
  const states=facts.map(f=>f?f.value?'present':'absent':'unknown');
  const known=states.filter(s=>s!=='unknown');
  let group=known.length===0?'unknown':known.length<states.length?'check':'same';
  if(new Set(known).size>1)group='difference';
  return {id,label,facts,group,requested:requested.includes(id)};
 }).sort((a,b)=>Number(b.requested)-Number(a.requested)||(['difference','wording','check','same','unknown'].indexOf(a.group)-['difference','wording','check','same','unknown'].indexOf(b.group)));
}

export function visibleComparisonRows(rows, mode='important', search='') {
 const term=search.trim().toLowerCase();
 return rows.filter(row=>{
  if(term)return (row.label+' '+row.facts.flatMap(f=>f?.evidence||[]).join(' ')).toLowerCase().includes(term);
  if(mode==='requested')return row.requested;
  if(mode==='all')return row.group==='same'&&row.facts.every(Boolean)&&row.facts.some(f=>f.value);
  if(mode==='check')return row.group==='check';
  return row.id!=='airConditioning'&&row.group==='difference'&&row.facts.every(Boolean);
 });
}
