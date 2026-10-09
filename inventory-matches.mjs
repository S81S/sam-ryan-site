import {matchVehicle} from './equipment-search.mjs';

// Yield between short batches so evidence checks never freeze shopping controls.
// A newer request cancels this run before its results can replace the new search.
export async function collectInventoryMatches(vehicles,records,query,{
 isCurrent=()=>true,budgetMs=8,
 yieldControl=()=>new Promise(resolve=>setTimeout(resolve,0)),
}={}){
 const matches=[],unknown=[],equipmentConflicts=[];
 let batchStarted=performance.now();
 for(const vehicle of vehicles){
  if(!isCurrent())return null;
  const result=matchVehicle(vehicle,records[vehicle.vin],query);
  if(result.kind==='match')matches.push({vehicle,result});
  else if(result.kind==='unknown')unknown.push({vehicle,result});
  else if(result.reason==='equipment')equipmentConflicts.push({vehicle,result});
  if(performance.now()-batchStarted>=budgetMs){await yieldControl();batchStarted=performance.now();}
 }
 return isCurrent()?{matches,unknown,equipmentConflicts}:null;
}
