import {matchVehicle} from './equipment-search.mjs?v=wheel1';

// Longest names first: a Grand Cherokee L is not a Cherokee, nor a Ram 2500 a 1500.
const models=['grand wagoneer l','grand wagoneer','grand cherokee l','grand cherokee','wagoneer l','wagoneer','cherokee','wrangler','gladiator','compass','renegade','durango','hornet','charger','challenger','pacifica','voyager','promaster','1500','2500','3500'];
const trims=new Set('tradesman express big horn lone star laramie rebel limited longhorn tungsten rho trx sport s sahara rubicon mojave willys high altitude latitude trailhawk overland summit reserve laredo touring pinnacle select preferred citadel pursuit gt r/t rt scat pack hellcat srt widebody series i ii iii'.split(' '));
const words=s=>String(s).toLowerCase().replace(/[^a-z0-9/]+/g,' ').trim();
export function modelName(value){const text=' '+words(value)+' ';return models.find(model=>text.includes(' '+model+' ')&&(!/^\d+$/.test(model)||text.includes(' ram ')))||null;}
export function sameModelOptions(vehicles,records,query,exactVins=[]){
 const model=modelName(query.terms.join(' '));
 if(!model||query.ambiguity||query.warnings.length&&query.warnings.some(w=>/Conflicting|not both|More than one/.test(w)))return [];
 const modelTerms=new Set(model.split(' '));
 const removed=query.terms.filter(t=>!modelTerms.has(t)&&trims.has(t));
 if(query.terms.includes('x')&&removed.some(t=>t==='rubicon'||t==='mojave'))removed.push('x');
 if(!removed.length)return [];
 const relaxed={...query,terms:query.terms.filter(t=>!removed.includes(t))};
 const excluded=new Set(exactVins);
 return vehicles.filter(v=>!excluded.has(v.vin)&&modelName(v.title)===model&&matchVehicle(v,records[v.vin],query).kind!=='match'&&matchVehicle(v,records[v.vin],relaxed).kind==='match')
  .map(vehicle=>({vehicle,reason:'Different trim; matches your other search requirements'}));
}
