import {withComparisonSpecifications} from './comparison-specs.mjs';
import {applyFactoryEquipment} from './factory-equipment.mjs';
import {preferenceChecks} from './preference-evidence.mjs';
import {definitions} from './equipment-search.mjs';

// Equipment cards require a current, model-scoped VIN with source evidence.
// They are not presented as reviewed photographs or factory orderability rules.
const groups=[
 ['Comfort',['heatedSeats','Heated front seats'],['ventilated','Ventilated front seats'],['heatedWheel','Heated steering wheel'],['rearHeated','Heated rear seats'],['memorySeats','Driver seat memory'],['massage','Massaging seats']],
 ['Visibility & driving assistance',['surroundCamera','Surround-view camera'],['blindSpot','Blind-spot monitoring'],['adaptiveCruise','Adaptive cruise control'],['parkingSensors','Parking sensors'],['laneAssist','Lane assistance']],
 ['Technology & convenience',['remoteStart','Remote start'],['wireless','Wireless phone charging'],['hud','Head-up display'],['powerLiftgate','Power liftgate'],['familyCamera','Rear-seat passenger camera']],
 ['Towing & utility',['tow','Trailer hitch / tow equipment'],['brakeController','Trailer brake controller'],['towMirrors','Trailer tow mirrors'],['airSuspension','Air suspension'],['bedliner','Spray-in bedliner'],['rambox','RamBox storage'],['powerBoards','Power running boards']],
 ['Traction & outdoors',['fourWheel','Four-wheel drive'],['awd','All-wheel drive'],['hardTop','Hard top'],['skyRoof','Sky One-Touch roof'],['rearLocker','Locking rear differential'],['skidPlates','Skid plates']]
];
const specs=[
 ['engineSpecification','Engine','Powertrain'],['transmissionSpecification','Transmission','Powertrain'],
 ['exteriorPaint','Exterior paint','Appearance'],['interiorColor','Interior color','Appearance'],['audioSystem','Audio system','Technology & convenience'],
 ['bedPower','Truck-bed power outlet','Towing & utility'],['tailgateOperation','Tailgate operation','Towing & utility'],
 ['wheelSize','Wheel diameter','Appearance']
];
// Include the remaining supported equipment, rather than ending after a hand-picked sample.
// Exact powertrain and paint questions replace their overlapping search aliases.
const named=new Set(groups.flatMap(([, ...items])=>items.map(([id])=>id)));
const alias=/^(?:engine|exterior|interior|tireDiameter)|^(?:hurricane|pentastar|dieselCummins|supercharged|turbo|v6|v8|hemi|diesel|electric|hybrid|manualTransmission|automaticTransmission)$/;
groups.push(['More equipment',...definitions.filter(([id])=>!named.has(id)&&!alias.test(id))]);
export function additionalQuestions(lineup,pool,records){
 const covered=new Set(lineup.questions.flatMap(q=>q.choices.map(c=>c.feature)));
 const verified=pool.flatMap(vehicle=>{
  const record=records[vehicle.vin];
  if(record?.status!=='verified'||record.vin!==vehicle.vin||!Array.isArray(record.lines)||!record.lines.every(l=>typeof l==='string'))return [];
  const resolved=withComparisonSpecifications(vehicle,applyFactoryEquipment(vehicle,record));
  return [{vehicle,record,features:resolved?.features||{}}];
 });
 const choice=(feature,label,value,example,index=0)=>{const evidence=preferenceChecks(example.vehicle,example.record,[{feature,value,wanted:true,model:lineup.id,year:lineup.year,...(lineup.reviewedScope?{reviewedScope:lineup.reviewedScope}:{})}])[0];return {id:'equipment-'+lineup.id+'-'+feature+'-'+index,kind:'equipment',model:lineup.id,year:lineup.year,
  ...(lineup.reviewedScope?{reviewedScope:lineup.reviewedScope}:{}),feature,label,value,vin:example.vehicle.vin,stock:example.vehicle.stock,title:example.vehicle.title,
  listingSource:example.vehicle.sourceUrl,stickerSource:example.record.sourceUrl,sourceUrl:evidence.sourceUrl,
  evidence:evidence.evidence,method:evidence.method||'verified-equipment'};};
 const questions=[];
 for(const [section,...items] of groups)for(const [feature,label] of items){
  if(covered.has(feature))continue;
  const example=verified.find(v=>v.features[feature]?.value===true&&v.features[feature]?.evidence?.length&&(v.features[feature].sourceUrl||v.record.sourceUrl)&&preferenceChecks(v.vehicle,v.record,[{feature,value:true,wanted:true,model:lineup.id,year:lineup.year,...(lineup.reviewedScope?{reviewedScope:lineup.reviewedScope}:{})}])[0]?.state==='match');
  if(!example)continue;
  questions.push({id:'equipment-'+feature,title:'Do you want '+label.toLowerCase()+'?',section,kind:'equipment',choices:[choice(feature,label,true,example)]});
 }
 const tireChoices=definitions.filter(([id])=>/^tireDiameter/.test(id)).flatMap(([feature,label],i)=>{
  const example=verified.find(v=>v.features[feature]?.value===true&&v.features[feature]?.evidence?.length);
  return example?[choice(feature,label,true,example,i)]:[];
 });
 if(tireChoices.length)questions.push({id:'equipment-tireSize',title:'Which factory tire size do you prefer?',section:'Traction & outdoors',kind:'equipment',choices:tireChoices});
 for(const [feature,label,section] of specs){
  if(covered.has(feature))continue;
  const values=new Map();
  for(const v of verified){const f=v.features[feature];if(typeof f?.comparisonValue==='string'&&f.comparisonValue.trim()&&f.evidence?.length&&(f.sourceUrl||v.record.sourceUrl)&&!values.has(f.comparisonValue))values.set(f.comparisonValue,v);}
  // A single known configuration isn't a meaningful multi-option question.
  if(values.size<2)continue;
  const choices=[...values.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([value,v],i)=>choice(feature,v.features[feature].displayValue||value,value,v,i));
  questions.push({id:'equipment-'+feature,title:'Which '+label.toLowerCase()+' do you prefer?',section,kind:'equipment',choices});
 }
 return questions;
}
