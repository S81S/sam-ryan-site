import {matchVehicle, labels} from './equipment-search.mjs?v=coverage4';

// Offer one explicit change at a time. Never silently relax a shopper's query.
export function recoveryOptions(vehicles, records, query) {
  if (query.ambiguity || query.warnings.some(w => /Conflicting|not both|More than one/.test(w))) return [];
  const candidates = [];
  if (query.budget !== null) candidates.push({key:'budget', label:'See prices above my budget', query:{...query,budget:null}});
  if (query.mileage !== null) candidates.push({key:'mileage',label:'Include higher mileage',query:{...query,mileage:null}});
  for (const requirement of query.requirements) candidates.push({key:requirement.id,
    label:`Search without my ${requirement.wanted?'':'no '}${labels[requirement.id]} requirement`,
    query:{...query,requirements:query.requirements.filter(r=>r!==requirement)}});
  return candidates.map(option => {const matches=vehicles.filter(v=>matchVehicle(v,records[v.vin],option.query).kind==='match');return {...option,count:matches.length,vehicles:matches.sort((a,b)=>(a.price??Infinity)-(b.price??Infinity)).slice(0,2)};})
    .filter(option=>option.count>0).sort((a,b)=>b.count-a.count).slice(0,3);
}
