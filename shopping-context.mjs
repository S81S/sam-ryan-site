export function advisorName(value) {
  return String(value||'').trim().toLowerCase()==='ryan'?'Ryan':'Sam';
}
export function shoppingContext(root=document, search=location.search) {
  const params=new URLSearchParams(search);
  const query=root.getElementById('group-query') ?? root.getElementById('request');
  const condition=root.getElementById('group-condition') ?? root.getElementById('search-condition');
  const selectedLabel=params.get('optionLabel'),selectedValue=params.get('optionValue'),feature=params.get('feature');
 const base=(query ? query.value : params.get('q') || '').trim();
 const requestedEquipment=params.get('requestedEquipment')||(selectedLabel?[selectedLabel,selectedValue].filter(Boolean).join(': '):feature||'');
 return {q:base,requestedEquipment, condition:condition?.value || params.get('condition') || 'New', advisor:advisorName(params.get('advisor'))};
}
export function comparisonLink(vins, context) {
  const params=new URLSearchParams({vehicles:[...new Set(vins)].join(','),condition:context.condition,advisor:context.advisor});
  if(context.q)params.set('q',context.q);
  if(context.requestedEquipment)params.set('requestedEquipment',context.requestedEquipment);
  return 'compare.html?'+params;
}
export function comparisonRequest(vehicles,context) {
  return 'Please help me compare these vehicles:\n'+vehicles.map(v=>`${v.title} — Stock ${v.stock || 'not listed'} — VIN ${v.vin}`).join('\n')+'\nCondition: '+context.condition+(context.q?'\nMy search: '+context.q:'')+(context.requestedEquipment?'\nRequested equipment: '+context.requestedEquipment:'');
}
