// Presentation groups only. Matching and saved preferences continue to use the
// original question/choice IDs and unmodified evidence from the two catalogues.
const normalized=value=>String(value||'').toLowerCase().replace(/[®™]/g,'').replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();
const descriptors={
 body:['Which body configuration do you want?','Body & powertrain',0],
 engine:['Which engine do you want?','Body & powertrain',1],
 transmission:['Which transmission do you want?','Body & powertrain',2],
 drive:['Which drive system do you want?','Body & powertrain',3],
 transfer:['Which four-wheel-drive system do you want?','Body & powertrain',4],
 roof:['Which roof system do you want?','Roof',20],
 upholstery:['Which seating configuration do you want?','Seating',21],
 screen:['Which center touchscreen do you want?','Technology',22],
 'driver-seat':['How do you want to adjust the driver seat?','Seating',23],
 'passenger-seat':['How do you want to adjust the passenger seat?','Seating',24],
 audio:['Which audio system do you want?','Technology',25],
 climate:['Which climate-control system do you want?','Comfort',26],
 cluster:['Which driver instrument display do you want?','Technology',27],
 paint:['Which exterior paint do you want?','Appearance',30],
 'interior-color':['Which interior color do you want?','Appearance',31],
 wheels:['Which wheels do you want?','Wheels & tires',32],
 tires:['Which tires do you want?','Wheels & tires',33],
 'spare-tire':['Which spare tire do you want?','Wheels & tires',34],
 'spare-wheel':['Which spare wheel do you want?','Wheels & tires',34],
 'axle-ratio':['Which axle ratio do you want?','Capability',35],
 'fuel-tank':['Which fuel tank do you want?','Capability',36],
 'roof-finish':['Which roof finish do you want?','Appearance',37],
 headlamps:['Which headlamp system do you want?','Visibility',38],
 'floor-covering':['Which floor covering do you want?','Interior',39],
 'floor-mats':['Which floor mats do you want?','Interior',40],
 'steering-column':['Which steering-column adjustment do you want?','Interior',41],
 'tailgate-operation':['Which tailgate operation do you want?','Capability',42],
 'liftgate-operation':['Which liftgate operation do you want?','Convenience',43]
};
Object.assign(descriptors,{
 'rear-differential':['Which rear differential do you want?','Traction & off-road',61],
 'front-differential':['Which front differential do you want?','Traction & off-road',62],
 'front-seat-adjustment':['How do you want to adjust the front seats?','Seating',24],
 'exterior-mirrors':['Which exterior mirrors do you want?','Comfort & convenience',54],
 'rock-rails':['Which body protection do you want?','Traction & off-road',65],
 bumpers:['Which bumpers do you want?','Traction & off-road',66],
 'tow-hooks':['Tow-hook details','Equipment details',95],
 'tire-package':['Which tire upgrade do you want?','Traction & off-road',67]
});
const featureGroups={
 rearLocker:'rear-differential',
 engineSpecification:'engine',transmissionSpecification:'transmission',fourWheel:'drive',twoWheel:'drive',awd:'drive',rwd:'drive',
 screen:'screen',screenSize:'screen',seatMaterial:'upholstery',seatingMaterial:'upholstery',seatConfiguration:'upholstery',upholstery:'upholstery',cloth:'upholstery',leather:'upholstery',leatherette:'upholstery',
 powerDriver:'driver-seat',powerPassenger:'passenger-seat',
 hardTop:'roof',skyRoof:'roof',softTop:'roof',panoramic:'roof',sunroof:'roof',
 exteriorPaint:'paint',interiorColor:'interior-color',audioSystem:'audio',premiumAudio:'audio',alpine:'audio',harman:'audio',mcintosh:'audio',
 wheelSize:'wheels',wheelBlack:'wheels',wheelChrome:'wheels',wheelPolished:'wheels',
 dualClimate:'climate',triClimate:'climate',quadClimate:'climate',airConditioning:'climate',tailgateOperation:'tailgate-operation',powerLiftgate:'liftgate-operation'
};
const booleanFeatures={
 familyCamera:['Rear-seat camera',/^(?:famcam(?:tm)?(?:\(\d+\))?: )?interior rear-facing camera$/],
 heatedSeats:['Heated front seats',/^(?:(?:seating|seats(?: \(front\))?): )?(?:heated front(?: seats)?|front(?: row)?(?: seats)?[,: -]+heated)$/],
 ventilated:['Ventilated front seats',/^(?:(?:seating|seats(?: \(front\))?): )?(?:ventilated front(?: seats)?|front(?: row)?(?: seats)?[,: -]+ventilated)$/],
 heatedWheel:['Heated steering wheel',/^(?:heated steering wheel|steering wheels?: heated)$/],
 remoteStart:['Remote start',/^(?:(?:start|key): )?remote start(?: system)?$/],
 blindSpot:['Blind-spot monitoring',/^blind-spot monitoring(?: system)?$/],
 adaptiveCruise:['Adaptive cruise control',/^adaptive cruise control(?: with stop(?: and go)?)?$/],
 wireless:['Wireless phone charging',/^wireless (?:phone |charging pad|charging)(?:charging)?$/],
 hud:['Head-up display',/^(?:clusters: )?head-up display$/],
 garageOpener:['Garage-door opener',/^universal garage door opener$/],
 passiveEntry:['Passive entry',/^passive entry$/],
 pushStart:['Push-button start',/^push-button start$/],
 rainWipers:['Rain-sensing windshield wipers',/^windshield wipers: rain[- ]sens(?:ing|itive)$/],
 parkingSensors:['Parking sensors',/^(?:rear park assist|rear parking sensors)$/],
 forwardWarning:['Forward collision warning',/^forward collision warning(?: with (?:active braking|full stop))?$/],
 rearCross:['Rear cross-path alerts',/^rear cross[- ](?:path|traffic)(?: detection| alert)?$/],
 autoHighBeam:['Automatic high beams',/^automatic high[- ]beam(?: headlamp control)?$/],
 navigation:['Built-in navigation',/^(?:built-in navigation|navigation system)$/],
 frontCamera:['Front off-road camera',/^(?:fender flares: )?forward-facing off-road camera$/],
 surroundCamera:['Surround-view camera',/^surround[- ]view camera(?: system)?$/],
 runningBoards:['Side steps',/^side steps - tubular, diamond plate surface pattern$/],
 winch:['Winch',/^warn winch \(8,000-lb\. capacity\)$/],
 swayDisconnect:['Front sway-bar disconnect',/^differentials: sway bar disconnect - electronically controlled, front$/],
 auxSwitches:['Auxiliary switches',/^auxiliary switches$/],
 tow:['Trailer towing equipment',/^towing - trailer-tow group$/],
 powerOutlet:['Cabin AC power outlet',/^(?:auxiliary power, 115-volt outlet in center console|cabin ac power outlet)$/],
 offroadMode:['Off-road driving mode',/^off-road plus mode$/],
 skidPlates:['Underbody protection',/^skid plates - fuel tank and transfer case$/],
 backupCamera:['Rear-view camera',/^parkview rear backup camera with dynamic gridlines$/]

};
for(const [feature,[label]] of Object.entries(booleanFeatures)){
 featureGroups[feature]='feature-'+feature;
 descriptors['feature-'+feature]=['Do you want '+label.toLowerCase()+'?','Equipment',45];
}
// Only the reviewed 2026 four-door Wrangler's supplemental trim vocabulary is
// folded here. A shared topic does not make two source predicates equivalent.
const wranglerTopics={
 'transfer-case':'transfer',wheels:'wheels',tires:'tires',screen:'screen',
 'instrument-display':'cluster',audio:'audio','audio-upgrade':'audio',
 headlamps:'headlamps','axle-ratio':'axle-ratio',climate:'climate',
 'automatic-powertrain-options':'engine',
 'rear-parking':'feature-parkingSensors','collision-warning':'feature-forwardWarning','blind-spot':'feature-blindSpot',
 navigation:'feature-navigation','rear-camera':'feature-backupCamera',mirrors:'exterior-mirrors',
 'front-seat-adjustment':'front-seat-adjustment','skid-plates':'feature-skidPlates',
 'rear-differential':'rear-differential','front-differential':'front-differential','front-sway-bar':'feature-swayDisconnect',
 'rock-rails':'rock-rails','trailer-hitch':'feature-tow','aux-switches':'feature-auxSwitches','terrain-mode':'feature-offroadMode',
 winch:'feature-winch','tow-hooks':'tow-hooks',bumpers:'bumpers','front-camera':'feature-frontCamera',
 'console-power':'feature-powerOutlet','tire-upgrade':'tire-package'
};
const isReviewedWrangler=lineup=>lineup.id==='wrangler'&&lineup.year===2026;
function factoryCategory(c,lineup){
 const facts=Object.values(c.facts||{}),f=facts.find(f=>f.factory)||facts[0]||{};
 const parent=normalized(f.parent),text=normalized(f.text||c.fullLabel||c.label),label=normalized(c.fullLabel||c.label),key=normalized(f.key),section=normalized(c.section);
 if(isReviewedWrangler(lineup)){
  if(!f.factory&&wranglerTopics[key])return wranglerTopics[key];
  if(section==='engines / transmissions'&&/^(?:pentastar )?\d[.\d]*-liter\b/.test(text))return 'engine';
 }

 // Whole roof systems are alternatives. The opening panel sold for an existing
 // hardtop, its headliner and roof racks are compatible accessories, not roofs.
 if(lineup.id==='wrangler'&&!/sunrider for hardtop|headliner|roof rack|roof rail/.test(text)){
  if(parent==='tops'||/^(?:black|body-color) three-piece hardtop group$/.test(label)||['roof','power-roof','hardtop'].includes(key))return 'roof';
 }
 if(parent==='differentials'&&/^tru-lok (?:rear|front and rear), electronic remote locking$/.test(text))return 'rear-differential';
 if(parent==='mirrors'&&/^(?:mold-in color manual folding|standard - no power|power-heated)$/.test(text))return 'exterior-mirrors';
 if(/^rock rails - black, painted steel, heavy-duty, protective$/.test(text))return 'rock-rails';
 if(parent==='sunroof'||/^sunroof(?:\s|$)/.test(text))return 'roof';
 if(parent==='roof'&&/body-color|black-painted/.test(text))return 'roof-finish';
 if(parent==='body model')return 'body';
 if((/^(?:(?:3500|4500\/5500) )?engines?(?:\s*(?:\/|&|and)\s*transmissions?)?$/.test(section)&&/^(?:engine: |supercharged |pentastar )?\d[.\d]*(?:l\b|-liter\b)/.test(text))||['engine','base-engine'].includes(key))return 'engine';
 if(/^powertrains?$/.test(section)&&/^(?:400v|\d+-kw dual electric)/.test(text))return 'engine';
 if(['transmission','gearbox'].includes(key)||parent==='transmission')return 'transmission';
 if(['drive','drive system'].includes(parent)||/^(?:front|rear|all|four)-wheel drive(?: \([^)]*\))? system$/.test(label))return 'drive';
 if(parent.startsWith('transfer case')||parent.startsWith('four-wheel drive'))return 'transfer';
 // Radio parents also contain passenger displays. Only a complete center radio
 // configuration is in this deck; connectivity and passenger screens stay separate.
 if((/^(?:radio with )?uconnect \d/.test(text)&&/display|touchscreen/.test(text))||(/^uconnect \d.*display/.test(parent)&&/^includes /.test(text)))return 'screen';
 if(/^(?:seat fabrics|seating|seats)$/.test(parent)&&/cloth|vinyl|leather|mckinley|capri|nappa|palermo|axis ii|suede/.test(text)&&!/^(?:heated|ventilated|power|driver|front-passenger|rear|second|third)/.test(text))return 'upholstery';
 if(['seat-material','seat-trim','upholstery'].includes(key))return 'upholstery';
 if(/(?:driver(?:'s)? seat|^driver[, -])/.test(text)&&/\b(?:manual|power|way)\b/.test(text)&&!/memory|heated|ventilat|massage/.test(text))return 'driver-seat';
 if(/(?:passenger(?:'s)? seat|^passenger[, -])/.test(text)&&/\b(?:manual|power|way)\b/.test(text)&&!/memory|heated|ventilat|massage/.test(text))return 'passenger-seat';
 if(/^(?:audio system|sound systems?|speaker systems, audio|speakers)$/.test(parent)&&!/noise cancellation|noise control|active sound|enhancement/.test(text))return 'audio';
 if(parent==='air conditioning'&&!/rear|filter|duct|humidity|sensor|preconditioning/.test(text))return 'climate';
 if(/^(?:clusters|instrument cluster, display)$/.test(parent)&&!/head-up/.test(text))return 'cluster';
 if(parent==='wheels'&&!/spare|dual rear|wheel cover/.test(text))return 'wheels';
 if(parent==='tires')return /spare/.test(text)?'spare-tire':'tires';
 if(parent==='spare tire'&&!/carrier/.test(text))return 'spare-tire';
 if(parent==='wheels, spare')return 'spare-wheel';
 if(/axle ratios?$/.test(parent)||parent==='rear axle'&&/\b\d\.\d{2}(?::1)?\b/.test(text)&&!/locking|differential|anti-spin/.test(text))return 'axle-ratio';
 if(parent==='fuel tank'&&/gallon|litre|liter/.test(text))return 'fuel-tank';
 if(/^(?:headlamps|headlamps\/taillamps|lighting)$/.test(parent)&&/(?:reflector|projector|halogen).*headlamp|(?:led|halogen).*projector/.test(text)&&!/fog|automatic|auto high|taillamp/.test(text))return 'headlamps';
 if(parent==='flooring')return 'floor-covering';
 if(/^(?:floor mats|floor mats, front and rear)$/.test(parent))return 'floor-mats';
 if((parent==='steering column'||parent==='steering')&&/tilt|telescop/.test(text))return 'steering-column';
 if(parent==='tailgate'&&/^(?:conventional|power|multi|split|manual|dampened)/.test(text)&&!/warning|lamp|lock|release/.test(text))return 'tailgate-operation';
 if(parent==='liftgate'&&/^(?:power|hands-free|manual)/.test(text))return 'liftgate-operation';
 for(const [feature,[,pattern]] of Object.entries(booleanFeatures))if(pattern.test(label))return 'feature-'+feature;
 return null;
}
function category(c,q,lineup){
 if(c.kind==='factory')return factoryCategory(c,lineup);
 if(featureGroups[c.feature])return featureGroups[c.feature];
 if(/^tireDiameter/.test(c.feature||'')||q.id==='equipment-tireSize')return 'tires';
 // Photo questions are authored alternatives, even when their predicate names
 // are specific to one model. Do not infer equivalence between their meanings.
 if(q.id==='screen')return 'screen';
 if(['seats','seat-configuration'].includes(q.id))return 'upholstery';
 if(q.id==='roof')return 'roof';
 if(q.id==='driver-seat')return 'driver-seat';
 return null;
}
// These pairs describe the identical full roof assembly in the 2026 Wrangler
// equipment/package tables (and the repeated Rubicon X standard-roof facts).
// Never generalize these equivalences to a photo's broader predicate/scope.
const wranglerMirrors=[['f1dj1wzb','fsi1znb'],['f1dhm9e4','f7xyby6'],['f1gedz3x','f18pljf7']];
const factSignature=c=>JSON.stringify(Object.entries(c.facts||{}).sort(([a],[b])=>a.localeCompare(b)).map(([trim,f])=>[trim,f.status,f.note||'',f.sourceUrl]));
function deduplicateRoof(groups,lineup){
 if(lineup.id!=='wrangler'||lineup.year!==2026)return;
 const group=groups.get('options-roof');if(!group)return;
 for(const [canonicalId,mirrorId] of wranglerMirrors){
  const canonical=group.choices.find(c=>c.id===canonicalId),mirror=group.choices.find(c=>c.id===mirrorId);
  if(!canonical||!mirror||canonical.kind!=='factory'||mirror.kind!=='factory'||!Object.keys(canonical.facts||{}).length||factSignature(canonical)!==factSignature(mirror))continue;
  canonical.mirrors=[...(canonical.mirrors||[]),mirror];
  group.choices=group.choices.filter(c=>c!==mirror);
 }
}
// Five physical roof families for a preview/display deck. These are NOT choice
// aliases: a photo preference, a factory configuration, and a special-trim row
// keep their original predicates and scopes. Selecting a family requires an
// explicit canonical member; the production choices list remains unchanged.
const wranglerRoofFamilies=[
 {id:'soft-top',label:'Sunrider soft top',primaryChoiceId:'f6l6ob7',ids:['f6l6ob7','fbkgl77','fqwurcr','equipment-wrangler-softTop-0']},
 {id:'black-three-piece-hardtop',label:'Black three-piece hardtop',primaryChoiceId:'f1dj1wzb',ids:['f1dj1wzb','f1ws9hvk'],supportingIds:['j22109-hardtop','f1h679vq'],photoId:'j22109-hardtop'},
 {id:'body-color-three-piece-hardtop',label:'Body-color three-piece hardtop',primaryChoiceId:'f1dhm9e4',ids:['f1dhm9e4','f1gedz3x'],supportingIds:['j22109-hardtop','f1h679vq']},
 {id:'power-roof',label:'Sky One-Touch power top',primaryChoiceId:'feeakr0',ids:['feeakr0','fiivsh9','j22412-skyroof'],photoId:'j22412-skyroof'},
 {id:'dual-top',label:'Dual Top Group',primaryChoiceId:'f10uw5fn',ids:['f10uw5fn']}
];
const roofSupportingNotes={
 'j22109-hardtop':'This saved preference means a removable hardtop without choosing its color. The photograph shows black.',
 f1h679vq:'This 85th Anniversary record offers black or body-color hardtops; it does not select a color.'
};
const roofPredicates={
 f6l6ob7:f=>f.factory&&normalized(f.text)==='sunrider soft-top',
 f1dj1wzb:f=>f.factory&&normalized(f.text).startsWith('freedom top three-piece modular hardtop with '),
 f1dhm9e4:f=>f.factory&&normalized(f.text).startsWith('body-color three-piece hardtop with '),
 feeakr0:f=>f.factory&&normalized(f.text)==='sky one-touch powertop',
 f10uw5fn:f=>f.factory&&normalized(f.text)==='dual top group (available sunrider)',
 fbkgl77:f=>f.key==='roof'&&f.value==='Black Sunrider soft top',
 fqwurcr:f=>f.key==='roof'&&f.value==='Tan Sunrider soft top',
 fiivsh9:f=>f.key==='power-roof'&&f.value==='Sky One-Touch option',
 f1ws9hvk:f=>f.key==='hardtop'&&f.value==='Factory hardtop option'&&f.note==='Black three-piece hardtop.',
 f1h679vq:f=>f.key==='hardtop'&&f.value==='Black or body-color factory option',
 f1gedz3x:f=>f.key==='hardtop'&&f.value==='Body-color hardtop included'
};
function auditedRoofMember(c){
 if(c.kind==='factory'){const valid=roofPredicates[c.id],facts=Object.values(c.facts||{});return !!valid&&facts.length>0&&facts.every(f=>valid(f)&&f.sourceUrl);}
 const feature={'j22109-hardtop':'hardTop','j22412-skyroof':'skyRoof','equipment-wrangler-softTop-0':'softTop'}[c.id];
 return !!feature&&c.feature===feature&&c.value===true&&c.reviewedScope==='2026-wrangler-four-door-gas';
}
const canonicalChoice=(lineup,id)=>lineup?.choices?.get?.(id)||lineup?.questions?.flatMap(q=>q.choices||[]).find(c=>c.id===id);
// A primary physical-roof requirement may use an exact member documented on a
// different trim. Historic narrow IDs retain their original scope. An existing
// source cell (including unavailable) always wins over supplemental evidence.
export function sourcedGuideFact(lineup,choiceId,trimId){
 const original=canonicalChoice(lineup,choiceId),own=original?.facts?.[trimId];
 if(own)return {...own,sourceChoiceId:choiceId};
 if(!isReviewedWrangler(lineup)||!original||!auditedRoofMember(original))return null;
 const family=wranglerRoofFamilies.find(f=>f.primaryChoiceId===choiceId);if(!family)return null;
 const found=family.ids.filter(id=>id!==choiceId).map(id=>canonicalChoice(lineup,id)).filter(c=>c?.kind==='factory'&&auditedRoofMember(c)&&c.facts?.[trimId]);
 if(!found.length)return null;
 const cells=found.map(c=>c.facts[trimId]);
 if(cells.some(f=>f.status!==cells[0].status||(f.note||'')!==(cells[0].note||'')))return null;
 return {...cells[0],sourceChoiceId:found[0].id};
}
const roofMember=c=>({questionId:c.originQuestionId,choiceId:c.id,choice:c,
 role:c.kind==='factory'?'configuration':'preference',
 scope:c.kind==='factory'?{type:'factory-trims',trimIds:Object.keys(c.facts||{}),sourceUrls:[...new Set(Object.values(c.facts||{}).map(f=>f.sourceUrl).filter(Boolean))]}:
 {type:'reviewed-preference',reviewedScope:c.reviewedScope||null,trimAvailability:'requires-original-assessment'}});
function addWranglerRoofFamilies(groups,lineup){
 if(!isReviewedWrangler(lineup))return;
 const group=groups.get('options-roof');if(!group)return;
 const byId=new Map(group.choices.filter(auditedRoofMember).map(c=>[c.id,c]));
 group.displayFamilies=wranglerRoofFamilies.map(spec=>{
  const members=spec.ids.map(id=>byId.get(id)).filter(Boolean).map(roofMember);
  if(!members.length)return null;
  const supportingMembers=(spec.supportingIds||[]).map(id=>byId.get(id)).filter(Boolean).map(c=>({...roofMember(c),role:'broader-preference',scopeNote:roofSupportingNotes[c.id]}));
  const photo=byId.get(spec.photoId);
  return {id:'wrangler-roof-'+spec.id,label:spec.label,displayOnly:true,selection:'canonical-member-required',
   primaryChoiceId:members.some(m=>m.choiceId===spec.primaryChoiceId)?spec.primaryChoiceId:null,
   members,supportingMembers,
   ...(photo?.image?{photo:{choiceId:photo.id,questionId:photo.originQuestionId,image:photo.image,alt:photo.alt||photo.label,stock:photo.stock,
    reviewedScope:photo.reviewedScope,represents:spec.id,caption:spec.id==='black-three-piece-hardtop'?'Black three-piece hardtop shown; this photograph does not depict a body-color hardtop.':photo.label}}:{})};
 }).filter(Boolean);
 // Unknown/new source records keep their ordinary cards rather than being
 // silently folded into a familiar-looking physical roof family.
 const covered=new Set(group.displayFamilies.flatMap(f=>[...f.members,...f.supportingMembers].map(m=>m.choiceId)));
 group.ungroupedDisplayChoiceIds=group.choices.filter(c=>!covered.has(c.id)).map(c=>c.id);
 group.guideChoices=group.displayFamilies.flatMap(family=>{
  const primary=byId.get(family.primaryChoiceId);if(!primary)return [];
  const facts=Object.fromEntries((lineup.trims||[]).map(t=>[t.id,sourcedGuideFact(lineup,primary.id,t.id)]).filter(([,fact])=>fact));
  const photographed=family.photo&&byId.get(family.photo.choiceId),photoFields={};
  if(photographed)for(const key of ['image','title','stock','stickerSource','alt'])if(photographed[key])photoFields[key]=photographed[key];
  return [{...primary,...photoFields,label:family.label,fullLabel:family.label,facts,
   ...(photographed?{photoNote:family.photo.caption}:{}),guideFamilyId:family.id,
   canonicalMembers:family.members.filter(m=>m.choice.kind==='factory').map(m=>m.choice),
   sourceChoiceIds:Object.fromEntries(Object.entries(facts).map(([trimId,fact])=>[trimId,[fact.sourceChoiceId]])),
   supportingMembers:family.supportingMembers,sourceCoverage:'source-trims-only'}];
 });
}

// Audited against the same 2026 Wrangler factory chart as these stable choice
// IDs. These are fixed safety/technical specifications, not selectable factory
// configurations. Informational is a presentation hint, NOT evidence that an
// undocumented trim includes them. Retain original choices for saved answers.
const wranglerFixedSpecifications=new Map([
 ['fd749q2','Advanced multistage front airbags'],
 ['f2xraap','Supplemental front seat side airbags'],
 ['fm1wilp','Side curtain airbags'],
 ['f1i1ey9k','Front passenger seat occupant detection system'],
 ['fhw48jn','Driver and front-passenger seat belt alert (all markets)'],
 ['fmqqxsc','Rear Child Seat Anchors — LATCH'],
 ['frn2l4z','Tire-pressure monitoring'],
 ['fd4ubwn','Sentry Key antitheft engine immobilizer'],
 ['f1ctomg8','Antilock brake system with hydraulic assist braking'],
 ['f1f6ctun','Electronic roll mitigation'],
 ['frgl04l','Electronic stability control — includes hydraulic assist brake booster and traction control'],
 ['f1why7zg','Hill-start Assist'],
 ['ffrcvpe','Trailer-sway control'],
 ['f3mrzn0','Floor heat ducts — rear'],
 ['f7ovwpm','Console — full-floor with front and rear cup holders, locking storage and armrest'],
 ['fi9yoiu','LED overhead courtesy lamp'],
 ['f1lo8plu','LED second-row, overhead / cargo courtesy lamp'],
 ['f1ft3455','LED foot well courtesy — functional'],
 ['fsova0v','Power outlet, 12-volt, instrument panel'],
 ['f844rgb','Media hub (one full-function USB and auxiliary port)'],
 ['f1dsp2gd','USB — fully functional in center console'],
 ['f2xc54m','Full metal with power windows'],
 ['fabz3nn','Power (speed-sensitive locking) — door-mounted switches'],
 ['f1953nil','Power (front and rear), driver and passenger one-touch down'],
 ['f1u64x30','Tow hooks — two front, one rear']
]);
const wranglerFactorySource='https://media.stellantisnorthamerica.com/view-spec.do?id=27222';
function markWranglerSpecifications(groups,lineup){
 if(!isReviewedWrangler(lineup))return;
 for(const group of groups.values()){
  if(group.choices.length!==1)continue;
  const choice=group.choices[0],expected=wranglerFixedSpecifications.get(choice.id),facts=Object.entries(choice.facts||{});
  if(!expected||choice.kind!=='factory'||!facts.length)continue;
  if(!facts.every(([,f])=>f.factory&&f.status==='standard'&&!f.note&&f.sourceUrl===wranglerFactorySource&&normalized(f.text)===normalized(expected)))continue;
  const covered=new Set(facts.map(([trimId])=>trimId));
  group.informational=true;
  group.information={reason:'documented-fixed-specification',coverage:'source-trims-only',
   evidence:facts.map(([trimId,f])=>({choiceId:choice.id,trimId,status:f.status,sourceUrl:f.sourceUrl})),
   uncoveredTrimIds:(lineup.trims||[]).filter(t=>!covered.has(t.id)).map(t=>t.id)};
 }
}
const guideTopics={
 powertrain:{id:'powertrain',label:'Body & powertrain',order:0},
 packages:{id:'packages',label:'Packages',order:10},
 roof:{id:'roof',label:'Roof',order:20},
 seating:{id:'seating',label:'Seating',order:30},
 technology:{id:'technology',label:'Screens & audio',order:40},
 comfort:{id:'comfort',label:'Comfort & convenience',order:50},
 safety:{id:'safety',label:'Safety & parking',order:60},
 capability:{id:'capability',label:'Towing & off-road',order:70},
 appearance:{id:'appearance',label:'Appearance',order:80},
 details:{id:'details',label:'Equipment details',order:100}
};
const primaryCategories=new Set(['body','engine','transmission','drive','transfer','roof','upholstery','driver-seat','passenger-seat','front-seat-adjustment','screen','audio','climate','cluster','paint','interior-color','wheels','tires','axle-ratio','headlamps','roof-finish','floor-covering','tailgate-operation','liftgate-operation','rear-differential','front-differential','rock-rails','bumpers','tire-package','exterior-mirrors']);
const importantFeatures=new Set(['familyCamera','heatedSeats','ventilated','heatedWheel','remoteStart','blindSpot','adaptiveCruise','wireless','hud','garageOpener','passiveEntry','rainWipers','parkingSensors','forwardWarning','rearCross','autoHighBeam','navigation','frontCamera','surroundCamera','runningBoards','winch','swayDisconnect','auxSwitches','tow','powerOutlet','offroadMode','skidPlates','rearLocker','flatTow','laneKeep','laneWarning','collisionBraking','rearEntertainment','thirdRow','seatingCapacity','massagingSeats','powerLiftgate','handsFreeLiftgate']);
function groupTopic(group){
 const category=group.id.replace(/^options-/,''),features=group.choices.map(c=>c.feature),text=normalized(group.title+' '+group.section);
 if(['body','engine','transmission','drive','transfer'].includes(category))return guideTopics.powertrain;
 if(category==='roof')return guideTopics.roof;
 if(['upholstery','driver-seat','passenger-seat','front-seat-adjustment'].includes(category)||features.some(f=>['thirdRow','seatingCapacity','massagingSeats'].includes(f)))return guideTopics.seating;
 if(['screen','audio','cluster','feature-familyCamera'].includes(category)||features.some(f=>['navigation','rearEntertainment','familyCamera'].includes(f))||/feature-navigation/.test(category))return guideTopics.technology;
 if(['paint','interior-color','wheels','roof-finish'].includes(category))return guideTopics.appearance;
 if(['tires','axle-ratio','rear-differential','front-differential','rock-rails','bumpers','tire-package','tailgate-operation'].includes(category)||features.some(f=>['tow','flatTow','rearLocker','skidPlates','winch','swayDisconnect','auxSwitches','offroadMode','runningBoards'].includes(f))||/feature-(?:tow|winch|swayDisconnect|auxSwitches|offroadMode|skidPlates|runningBoards)/.test(category))return guideTopics.capability;
 if(features.some(f=>['blindSpot','adaptiveCruise','parkingSensors','forwardWarning','rearCross','frontCamera','surroundCamera','laneKeep','laneWarning','collisionBraking'].includes(f))||/feature-(?:blindSpot|adaptiveCruise|parkingSensors|forwardWarning|rearCross|frontCamera|surroundCamera)/.test(category))return guideTopics.safety;
 if(group.choices.some(c=>c.package)&&!/edition details/.test(text))return guideTopics.packages;
 if(['climate','exterior-mirrors','headlamps','floor-covering','liftgate-operation'].includes(category)||category.startsWith('feature-')||features.some(f=>importantFeatures.has(f)))return guideTopics.comfort;
 if(/safety|security|parking/.test(text))return guideTopics.safety;
 if(/interior|seating|comfort/.test(text))return guideTopics.comfort;
 if(/uconnect|multimedia|technology/.test(text))return guideTopics.technology;
 if(/exterior|appearance/.test(text))return guideTopics.appearance;
 if(/mechanical|capability|towing|traction/.test(text))return guideTopics.capability;
 return guideTopics.details;
}
function markGuidePriorities(groups){
 for(const group of groups.values()){
  const category=group.id.replace(/^options-/,''),feature=category.startsWith('feature-')?category.slice(8):null;
  const packageDecision=group.choices.some(c=>c.package)&&!group.choices.every(c=>Object.values(c.facts||{}).every(f=>f.key==='edition-details'));
  const important=primaryCategories.has(category)||importantFeatures.has(feature)||group.choices.some(c=>importantFeatures.has(c.feature)||c.image)||packageDecision;
  group.topic={...groupTopic(group)};
  group.importance=!group.informational&&important?'primary':'details';
  group.guideChoices??=group.choices;
  group.guideOrder=group.topic.order*100+group.order;
 }
}
export function buildBuyerOptionGroups(lineup,photoLineup){
 if(!lineup)return [];
 const groups=new Map(),seen=new Set();
 const reviewed=photoLineup?.id===lineup.id&&photoLineup?.year===lineup.year?photoLineup:null;
 const questions=[...(reviewed?.questions||[]),...(lineup.questions||[])];
 for(const q of questions)for(const c of q.choices||[]){
  const identity=JSON.stringify([q.id,c.id]);if(seen.has(identity))continue;seen.add(identity);
  const categoryId=category(c,q,lineup),id=categoryId?'options-'+categoryId:q.id;
  let group=groups.get(id);
  if(!group){const d=descriptors[categoryId];group={id,title:d?.[0]||q.title,section:d?.[1]||q.section||c.section||'Equipment',exclusive:!!categoryId||q.choices.length>1,questionIds:[],choices:[],order:d?.[2]??(c.package?10:c.image?28:50),...(q.explanation?{explanation:q.explanation}:{}),...(q.availability?{availability:q.availability}:{})};groups.set(id,group);}
  if(!group.questionIds.includes(q.id))group.questionIds.push(q.id);
  group.choices.push({...c,originQuestionId:q.id});
 }
 deduplicateRoof(groups,lineup);
 addWranglerRoofFamilies(groups,lineup);
 if(isReviewedWrangler(lineup))for(const category of ['engine','transmission','drive']){
  const group=groups.get('options-'+category),canonical=group?.choices.filter(c=>c.guidePowertrain);
  if(canonical?.length)group.guideChoices=canonical;
 }
 // A wheel diameter or generic black-wheel preference is not another wheel
 // design. Keep exact factory wheel designs together, retaining historic IDs.
 const wheels=groups.get('options-wheels'),designs=wheels?.choices.filter(c=>c.kind==='factory');
 if(designs?.length)wheels.guideChoices=designs;
 markWranglerSpecifications(groups,lineup);
 markGuidePriorities(groups);
 return [...groups.values()].sort((a,b)=>a.guideOrder-b.guideOrder);
}
// Original IDs are deliberately required. Group IDs are presentation-only and
// must never replace the keys stored in saved preferences or matching answers.
export function findBuyerOptionGroup(groups,questionId,choiceId){
 return groups.find(g=>g.choices.some(c=>[c,...(c.mirrors||[])].some(original=>original.originQuestionId===questionId&&(!choiceId||original.id===choiceId))))||null;
}
export function findBuyerOptionChoice(groups,questionId,choiceId){
 return findBuyerOptionGroup(groups,questionId,choiceId)?.choices.flatMap(c=>[c,...(c.mirrors||[])]).find(c=>c.originQuestionId===questionId&&c.id===choiceId)||null;
}

// A broad saved hardtop preference can belong to both color families. Returning
// an array makes that ambiguity explicit; this helper never rewrites an answer.
export function findBuyerOptionFamilies(groups,questionId,choiceId){
 return groups.flatMap(g=>g.displayFamilies||[]).filter(f=>[...f.members,...f.supportingMembers].some(m=>[m.choice,...(m.choice.mirrors||[])].some(c=>c.originQuestionId===questionId&&c.id===choiceId)));
}
// Source inspection only: unavailable facts remain visible, absent factory
// facts are omitted, and photos do not manufacture trim availability. Callers
// must use the original matcher before selecting any canonical member.
export function buyerOptionFamilyEvidence(family,trimId){
 return [...(family?.members||[]),...(family?.supportingMembers||[])].flatMap(member=>{
  if(member.choice.kind!=='factory')return [{...member,fact:null,trimAvailability:'requires-original-assessment'}];
  const facts=member.choice.facts||{};
  if(trimId)return facts[trimId]?[{...member,trimId,fact:facts[trimId]}]:[];
  return Object.entries(facts).map(([id,fact])=>({...member,trimId:id,fact}));
 });
}
