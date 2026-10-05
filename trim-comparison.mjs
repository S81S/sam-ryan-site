// Explicit upgrade links keep options beside the corresponding base equipment.
// No missing value is inferred from another trim, model year or configuration.
export function equipmentFacts(trim) {
  const original=trim.comparison?.length?trim.comparison:
    (trim.standard||[]).map(f=>({...f,key:f.key||f.label,status:'standard'}));
  const facts=original.filter(f=>!f.upgradeOf).map(f=>({...f}));
  for(const option of original.filter(f=>f.upgradeOf)){
    let base=facts.find(f=>f.key===option.upgradeOf);
    if(!base){base={key:option.upgradeOf,label:option.baseLabel||option.label,status:'verify',value:'Standard specification not confirmed'};facts.push(base)}
    base.options=[...(base.options||[]),option];
  }
  return facts;
}

// Compare the same equipment on both trims; missing evidence never means absent.
export function equipmentRows(trims) {
  // A sparse or announced trim must not discard the other trims' detailed facts.
  const facts = trims.map(equipmentFacts);
  const keys = [...new Set(facts.flatMap(list => list.map(f => f.key)))];
  const normal = s => String(s).trim().toLowerCase().replace(/\s+/g,' ');
  return keys.map(key => {
    const cells = facts.map(list => list.find(f => f.key === key));
    const complete = cells.every(Boolean);
    const known=cells.filter(f=>f&&f.status!=='verify');
    const optionSets=cells.map(f=>(f?.options||[]).map(o=>o.status+'|'+normal(o.value)).sort().join(';'));
    const optionDifference=optionSets.length>1&&new Set(optionSets).size>1;
    const knownDifference=new Set(known.map(f=>f.status+'|'+normal(f.value))).size>1||optionDifference;
    const same = !optionDifference && complete && known.length===cells.length && cells.every(f => f.status === cells[0].status && normal(f.value) === normal(cells[0].value));
    const kind = !complete||known.length!==cells.length ? 'verify' : same ? 'shared' :
      cells.some(f => f.status === 'standard') ? 'different' : 'options';
    const optionalOnly=!complete&&known.length>0&&cells.filter(Boolean).every(f=>f.status==='optional');
    return {key, label:cells.find(Boolean).label, cells, kind,knownDifference,optionalOnly};
  });
}

export function selectedTrimIds(model,raw){
  if(raw===null||raw===undefined)return model.trims.map(t=>t.id);
  if(raw==='')return [];
  const ids=new Set(String(raw).split(','));
  const selected=model.trims.filter(t=>ids.has(t.id)).map(t=>t.id);
  return selected.length?selected:model.trims.map(t=>t.id);
}

export function featureMatches(row,query){
  const normal=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[-_]/g,' ').replace(/\s+/g,' ');
  const text=normal([row.key,row.label,...row.cells.flatMap(c=>c?[c.value,c.note,c.benefit,...(c.options||[]).flatMap(o=>[o.key,o.label,o.value,o.note,o.benefit])]:[])].join(' '));
  return normal(query).trim().split(' ').filter(Boolean).every(term=>text.includes(term));
}

// Explain the buying choice without adding equipment or performance claims.
export function equipmentExplanation(row) {
  const label=row.label.toLowerCase();
  if(/second.row seats|seat folding/.test(label))return 'Check how easily you can change from carrying passengers to carrying cargo.';
  if(/ventilat/.test(label))return 'Seat ventilation circulates air through the seat to help with warm-weather comfort.';
  if(/heated|heating/.test(label))return 'Adds warmth to the listed seats or steering wheel.';
  if(/surround|360.degree/.test(label))return 'Helps you see around the vehicle when parking in a tight space.';
  if(/cabin camera|famcam/.test(label))return 'Shows the rear seating area on the front display.';
  if(/entertainment screens/.test(label))return 'Gives rear passengers their own entertainment screens.';
  if(/touchscreen|center display/.test(label))return 'Compare the screen size and whether built-in navigation is included.';
  if(/audio/.test(label))return 'Compare the speaker system, then listen to both to decide which you prefer.';
  if(/upholstery|seat material|seat trim/.test(label))return 'Changes the seating surfaces and cabin finish.';
  if(/seat adjustment/.test(label))return 'Changes how you adjust the seat to find a comfortable driving position.';
  if(/climate control/.test(label))return 'Separate climate zones let occupants choose different temperature settings.';
  if(/vacuum/.test(label))return 'Makes it easier to clean up crumbs and small messes inside the vehicle.';
  if(/hands.free/.test(label))return 'Lets you open the listed door or liftgate when your hands are full.';
  if(/wheel/.test(label)&&!/steering/.test(label))return 'Changes wheel size or appearance; compare the fitted tires as well.';
  if(/bed.*power|onboard power/.test(label))return 'Check the outlet location and power rating for the equipment you plan to plug in.';
  if(/trailer brake/.test(label))return 'Controls compatible trailer brakes from inside the truck.';
  if(/sunroof|panoramic/.test(label))return 'Brings more light into the cabin.';
  return '';
}
