import {readPreferences,encodePreferences,preferenceSummary} from './shopping-preferences.mjs';
export function advisorName(value) {
  return String(value||'').trim().toLowerCase()==='ryan'?'Ryan':'Sam';
}
export function shoppingContext(root=document, search=location.search) {
  const params=new URLSearchParams(search);
  const query=root.getElementById('group-query') ?? root.getElementById('request');
  const condition=root.getElementById('group-condition') ?? root.getElementById('search-condition');
  const selectedLabel=params.get('optionLabel'),selectedValue=params.get('optionValue'),feature=params.get('feature');
 const base=(query ? query.value : params.get('q') || '').trim();
 const preferences=readPreferences(params);
 const requestedEquipment=preferenceSummary(preferences)||params.get('requestedEquipment')||(selectedLabel?[selectedLabel,selectedValue].filter(Boolean).join(': '):feature||'');
 return {q:base,requestedEquipment,modelScope:params.get('modelScope')||'',preferences:encodePreferences(preferences),guideTrim:params.get('guideTrim')||'',maxPrice:Math.max(0,Math.min(1000000,Number(params.get('maxPrice'))||0)),from:params.get('from')||'', condition:condition?.value || params.get('condition') || 'New', advisor:advisorName(params.get('advisor'))};
}
export function comparisonLink(vins, context) {
  const params=new URLSearchParams({vehicles:[...new Set(vins)].join(','),condition:context.condition,advisor:context.advisor});
  if(context.q)params.set('q',context.q);
  if(context.modelScope)params.set('modelScope',context.modelScope);
  if(context.requestedEquipment)params.set('requestedEquipment',context.requestedEquipment);
  if(context.preferences)params.set('preferences',context.preferences);
  if(context.maxPrice)params.set('maxPrice',context.maxPrice);
  if(context.from)params.set('from',context.from);
  if(context.guideTrim)params.set('guideTrim',context.guideTrim);
  return 'compare.html?'+params;
}
export function comparisonRequest(vehicles,context) {
  return 'Please help me compare these vehicles:\n'+vehicles.map(v=>`${v.title} — Stock ${v.stock || 'not listed'} — VIN ${v.vin}`).join('\n')+'\nCondition: '+context.condition+(context.q?'\nMy search: '+context.q:'')+(context.requestedEquipment?'\nRequested equipment: '+context.requestedEquipment:'');
}

export function vehicleLink(vin,context){
 const params=new URL(comparisonLink([vin],context),'https://carswithsam.com').searchParams;
 params.delete('vehicles');return '/vehicle-'+encodeURIComponent(vin)+'?'+params;
}
