export function shoppingContext(root=document, search=location.search) {
  const params=new URLSearchParams(search);
  const query=root.getElementById('group-query') ?? root.getElementById('request');
  const condition=root.getElementById('group-condition') ?? root.getElementById('search-condition');
  return {q:(query ? query.value : params.get('q') || '').trim(), condition:condition?.value || params.get('condition') || 'New', advisor:params.get('advisor')==='Ryan'?'Ryan':'Sam'};
}
export function comparisonLink(vins, context) {
  const params=new URLSearchParams({vehicles:[...new Set(vins)].join(','),condition:context.condition,advisor:context.advisor});
  if(context.q)params.set('q',context.q);
  return 'compare.html?'+params;
}
export function comparisonRequest(vehicles,context) {
  return 'Please help me compare these vehicles:\n'+vehicles.map(v=>`${v.title} — Stock ${v.stock || 'not listed'} — VIN ${v.vin}`).join('\n')+'\nCondition: '+context.condition+(context.q?'\nMy search: '+context.q:'');
}
