// Reviewed links from the 2026 Wrangler factory equipment chart. These explain
// a factory configuration; they do not change preferences or prove VIN equipment.
// Keep the exact source rows and trim scope: package names are not universal.
import {sourcedRamPackageDependency} from './buyer-ram-package-dependencies.mjs';
import {sourcedPacificaPackageDependency} from './buyer-pacifica-package-dependencies.mjs';
const SOURCE='https://media.stellantisnorthamerica.com/view-spec.do?id=27222';
const TRIMS=['sport','sport-s','sahara','rubicon','moab-392'];
const PACKAGE_TRIMS=['sport-s','sahara','rubicon','moab-392'];
const ROWS={
 f1qpru5j:['f:packages-equipment-groups||jeep-active-safety-group-includes-parksense-rear-park-assist-bl','','Jeep Active Safety Group — includes ParkSense rear park assist, Blind-spot Monitoring, Rear Cross Path detection and LED taillamps'],
 f6em7wb:['f:packages-equipment-groups||convenience-group-includes-heated-front-seats-and-heated-steeri','','Convenience Group — includes heated front seats and heated steering wheel, remote start and universal garage door opener Sport/Willys includes: • Satellite radio • Proximity entry • Dual-zone automatic temperature control • 7-in. thin-film transistor (TFT) cluster'],
 falyadm:['f:packages-equipment-groups||technology-group-includes-nine-speaker-premium-audio-system-wit','','Technology Group — includes nine-speaker premium audio system with all-weather subwoofer Sahara/Rubicon includes: • Uconnect 5 NAV with 12.3-in. display • Inside electrochromatic rearview mirror • Front off-road TrailCam • Universal garage door opener (Sahara)'],
 fn4m1zs:['f:packages-equipment-groups||sport-led-lighting-group-includes-led-headlamps-with-round-sign','','Sport LED Lighting Group — includes LED headlamps with round signature lighting and LED front fog lamps'],
 f19etjcz:['f:safety-security||blind-spot-monitoring','','Blind-spot Monitoring'],
 f1kokjjc:['f:safety-security||rear-park-assist','','Rear Park Assist'],
 frm6xp8:['f:interior|seating|heated-front','Seating','Heated front'],
 fzvznq6:['f:interior|steering-wheel|heated','Steering Wheel','Heated'],
 fr0gab8:['f:interior||universal-garage-door-opener','','Universal garage door opener'],
 f1m582py:['f:interior||remote-start-system','','Remote start system'],
 fiskoxc:['f:uconnect-multimedia|audio-system|nine-alpine-speakers-with-all-weather-subwoofer-and-552-w','Audio System','Nine Alpine speakers with all-weather subwoofer and 552-watt amplifier'],
 f1oo6l8x:['f:uconnect-multimedia||radio-with-uconnect-5-nav-with-12-3-in-display','','Radio with Uconnect 5 NAV with 12.3-in. display'],
 f6i3s8v:['f:exterior|fender-flares|forward-facing-off-road-camera','Fender Flares','Forward-facing off-road camera'],
 f1f2e05m:['f:exterior|lighting|led-reflector-headlamps-packaged-with-led-lighting-group','Lighting','LED reflector headlamps (packaged with LED Lighting Group)'],
 fyd9jk0:['f:exterior|lighting|led-fog-lamps-packaged-with-led-lighting-group','Lighting','LED fog lamps (packaged with LED Lighting Group)'],
 f1fd7xjl:['f:engines-transmissions||pentastar-3-6-liter-v-6-six-speed-manual','','Pentastar 3.6-liter V-6 / Six-speed manual'],
 fbixrjd:['f:engines-transmissions||2-0-liter-inline-four-cylinder-eight-speed-automatic','','2.0-liter inline four-cylinder / Eight-speed automatic'],
 f1j10ide:['f:engines-transmissions||6-4-liter-v-8-eight-speed-automatic','','6.4-liter V-8 / Eight-speed automatic']
};
// Sahara/Rubicon content and Sahara-only garage opener are deliberately scoped
// separately. The chart's "Sport/Willys" Convenience extras are not extrapolated
// to Sport S or to supplemental special-edition trims.
const LINKS=[
 ['f1qpru5j','f19etjcz',PACKAGE_TRIMS],
 ['f1qpru5j','f1kokjjc',PACKAGE_TRIMS],
 ['f6em7wb','frm6xp8',PACKAGE_TRIMS],
 ['f6em7wb','fzvznq6',PACKAGE_TRIMS],
 ['f6em7wb','fr0gab8',PACKAGE_TRIMS],
 ['f6em7wb','f1m582py',PACKAGE_TRIMS],
 ['falyadm','fiskoxc',PACKAGE_TRIMS],
 ['falyadm','f1oo6l8x',['sahara','rubicon']],
 ['falyadm','f6i3s8v',['sahara','rubicon']],
 ['falyadm','fr0gab8',['sahara']],
 ['fn4m1zs','f1f2e05m',['sport-s']],
 ['fn4m1zs','fyd9jk0',['sport-s']]
];
const PACKAGES=new Set(LINKS.map(([id])=>id));
const list=value=>Array.isArray(value)?value:[];
const scope=lineup=>lineup?.id==='wrangler'&&lineup.year===2026;
const offered=f=>f&&['standard','optional'].includes(f.status);
const choices=lineup=>list(lineup?.questions).flatMap(q=>list(q.choices));
const ordinaryNote=f=>['','Part of a package','Optional or part of a package','packaged with LED Lighting Group'].includes(f?.note||'');
function row(lineup,choice,trimId){
 if(!scope(lineup)||!TRIMS.includes(trimId)||choice?.kind!=='factory')return null;
 const expected=ROWS[choice.id],f=choice.facts?.[trimId];
 return expected&&f?.factory===true&&f.sourceUrl===SOURCE&&f.key===expected[0]&&f.parent===expected[1]&&f.text===expected[2]?f:null;
}
const proof=(choiceId,trimId,f)=>({choiceId,trimId,status:f.status,sourceUrl:f.sourceUrl});

/** Remote start cannot be auto-included just because the package is offered.
 * The existing reviewed Wrangler buyer's guide also documents its automatic-
 * transmission condition (trim-standard-data.json, Rubicon X remote-start row).
 * Require an exact selected automatic powertrain, or the chart's single fixed
 * Moab 392 automatic configuration. A manual/conflicting selection proves neither.
 */
export function packageFeatureCondition({lineup,choice,trimId,selected=[],excludedChoiceIds=[]}={}){
 if(!scope(lineup)||choice?.id!=='f1m582py')return {satisfied:true,evidence:[]};
 if(!offered(row(lineup,choice,trimId)))return {satisfied:false,evidence:[]};
 const powertrains=list(selected).map(p=>p.choice).filter(c=>Object.values(c?.facts||{}).some(f=>f.section==='ENGINES / TRANSMISSIONS'||['gearbox','automatic-powertrain-options'].includes(f.key)));
 if(powertrains.length){
  const verified=powertrains.map(c=>({choice:c,f:row(lineup,c,trimId)}));
  const satisfied=verified.every(({choice:c,f})=>['fbixrjd','f1j10ide'].includes(c.id)&&!excludedChoiceIds.includes(c.id)&&offered(f));
  return {satisfied,evidence:satisfied?verified.map(({choice:c,f})=>proof(c.id,trimId,f)):[]};
 }
 if(trimId==='moab-392'&&!excludedChoiceIds.includes('f1j10ide')){
  const catalog=new Map(choices(lineup).map(c=>[c.id,c]));
  const fixed=['f1fd7xjl','fbixrjd','f1j10ide'].map(id=>({id,f:row(lineup,catalog.get(id),trimId)}));
  if(fixed.every(({id,f})=>f?.status===(id==='f1j10ide'?'standard':'unavailable')&&ordinaryNote(f)))
   return {satisfied:true,evidence:fixed.map(({id,f})=>proof(id,trimId,f))};
 }
 return {satisfied:false,evidence:[]};
}

/** Returns proof only for a reviewed parent/child pair, both offered on this
 * exact trim, with any feature condition independently satisfied. */
export function sourcedPackageDependency({lineup,parent,child,trimId,selected=[],excludedChoiceIds=[]}={}){
 if(lineup?.id==='chrysler-pacifica')return sourcedPacificaPackageDependency({lineup,parent,child,trimId,excludedChoiceIds});
 if(lineup?.id==='ram-1500')return sourcedRamPackageDependency({lineup,parent,child,trimId,excludedChoiceIds});
 if(!LINKS.some(([p,c,trims])=>p===parent?.id&&c===child?.id&&trims.includes(trimId)))return null;
 const parentFact=row(lineup,parent,trimId),childFact=row(lineup,child,trimId);
 if(!offered(parentFact)||!offered(childFact)||!ordinaryNote(parentFact)||!ordinaryNote(childFact))return null;
 const condition=packageFeatureCondition({lineup,choice:child,trimId,selected,excludedChoiceIds});
 if(!condition.satisfied)return null;
 return {sourceUrl:SOURCE,parentChoiceId:parent.id,choiceId:child.id,trimId,conditionEvidence:condition.evidence};
}

/** Standard packages may explain their children without inventing a shopper
 * selection. Only unconditional standard parents on every candidate qualify. */
export function standardDependencyParents({lineup,trimIds,excludedChoiceIds=[]}={}){
 if(!scope(lineup)||!list(trimIds).length)return [];
 const excluded=new Set(excludedChoiceIds);
 return choices(lineup).filter(c=>PACKAGES.has(c.id)&&!excluded.has(c.id)&&trimIds.every(id=>{
  const f=row(lineup,c,id);return f?.status==='standard'&&ordinaryNote(f);
 }));
}
