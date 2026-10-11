// Separate the physical engine from its transmission. Original factory rows
// remain available for saved links; these exact predicates use the same sources.
const source='https://www.jeep.com/wrangler/capability.html';
export function addWranglerPowertrain(model,choices,trims){
 if(model.id!=='wrangler'||model.year!==2026)return;
 const engines=[
  ['36','3.6L Pentastar V6',285,260,['f1fd7xjl','f1aoc2mo','fvzymog']],
  ['20','2.0L turbo I4',270,295,['fbixrjd','fvzymog']],
  ['64','6.4L HEMI V8',470,470,['f1j10ide','f199h3de']]
 ];
 for(const [code,label,hp,torque,parents] of engines){
  const facts={};
  for(const parentId of parents){const parent=choices.get(parentId);if(!parent)continue;
   for(const [trimId,f] of Object.entries(parent.facts)){
    if(facts[trimId]||!f.sourceUrl)continue;
    facts[trimId]={...f,parent:'',key:'engine',text:label,value:label,section:'Engine',note:'',benefit:'',detail:'',display:label,sourceChoiceId:parentId};
   }
  }
  add({id:'fwranglerengine'+code,label,detail:hp+' hp · '+torque+' lb-ft of torque',facts,section:'Engine',engineOutput:{horsepower:hp,torqueLbFt:torque,sourceUrl:source}});
 }
 for(const [code,label] of [['6','6-speed manual'],['8','8-speed automatic']]){
  const facts={};
  for(const trim of trims){
   const primary=['sport','sport-s','willys','rubicon','rubicon-x'].includes(trim.id);
   const automaticOnly=['sahara','moab-392','willys-392'].includes(trim.id);
   if(!primary&&!automaticOnly)continue;
   if(code==='6'&&trim.id==='sahara')continue;
   facts[trim.id]={key:'transmission',parent:'',text:label,value:label,label,section:'Transmission',sourceUrl:source,
    status:code==='6'?(primary?'standard':'unavailable'):(['moab-392','willys-392'].includes(trim.id)?'standard':'optional'),
    note:code==='6'?'With the 3.6L V6. The 2.0L and 6.4L use an automatic.':'Included with the 2.0L and 6.4L; available with the 3.6L V6.'};
  }
  add({id:'fwranglertransmission'+code,label,detail:code==='6'?'Clutch pedal and six forward gears.':'Eight forward gears; shifts automatically.',facts,section:'Transmission'});
 }
 add({id:'fwranglerdrive4',label:'Four-wheel drive',detail:'The transfer-case system is a separate choice.',section:'Drive system',facts:Object.fromEntries(trims.map(t=>[t.id,{parent:'Drive system',text:'4x4',section:'Drive system',status:'standard',sourceUrl:source,note:''}]))});
 function add(row){
  const c={...row,fullLabel:row.label,feature:'factoryChoice',value:row.id,kind:'factory',model:model.id,year:model.year,sourceUrl:source,package:false,includes:'',guidePowertrain:true};
  choices.set(c.id,c);for(const trim of trims)if(c.facts[trim.id])trim.choices.push(c.id);
 }
}
