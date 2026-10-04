// Compare the same equipment on both trims; missing evidence never means absent.
export function equipmentRows(trims) {
  const detailed = trims.every(t => t.comparison?.length);
  const facts = trims.map(t => detailed ? t.comparison :
    t.standard.map(f => ({...f, key:f.category, status:'standard'})));
  const keys = [...new Set(facts.flatMap(list => list.map(f => f.key)))];
  const normal = s => String(s).trim().toLowerCase().replace(/\s+/g,' ');
  return keys.map(key => {
    const cells = facts.map(list => list.find(f => f.key === key));
    const complete = cells.every(Boolean);
    const same = complete && cells.every(f => f.status === cells[0].status && normal(f.value) === normal(cells[0].value));
    const kind = !complete ? 'verify' : same ? 'shared' :
      cells.some(f => f.status === 'standard') ? 'different' : 'options';
    return {key, label:cells.find(Boolean).label, cells, kind};
  });
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
