// Plain-language descriptions explain the control, without claiming a trim has
// it or adding performance, capacity, subscription or package-content facts.
const clean=value=>String(value||'').replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();
const ordinaryNotes=new Set(['Part of a package','Optional or part of a package','Fleet orders only']);
function packageDetails(choice){
 const details=[clean(choice.includes||choice.detail)],notes=new Map();
 const facts=Object.entries(choice.facts||{}).filter(([,f])=>f.sourceUrl&&['standard','optional'].includes(f.status));
 for(const [trim,f] of facts){const note=clean(f.note);if(!note||ordinaryNotes.has(note))continue;notes.set(note,[...(notes.get(note)||[]),trim]);}
 for(const [note,trims] of notes){
  if(details.some(detail=>detail.includes(note)))continue;
  const scope=trims.length===facts.length?'':` (${trims.map(id=>id.replace(/-/g,' ')).join(', ')})`;
  details.push(`Factory note${scope}: ${note}`);
 }
 if(choice.warning)details.push(clean(choice.warning));
 return details.filter(Boolean).join(' · ');
}
export function buyerFeatureExplanation(choice,group={}){
 const label=clean(choice.fullLabel||choice.label),text=clean([label,choice.feature,choice.value,choice.detail].join(' ')),category=group.category||String(group.id||'').replace(/^options-/,'');
 const details=choice.package?packageDetails(choice):clean(choice.detail);
 if(/\bdelet(?:e|ed|ion)\b/i.test(label))return {summary:'This configuration removes the listed equipment. Review what is deleted and the conditions before choosing it.',details};
 if(choice.value===false||/(?:^|:\s*)(?:no|without)\s+/i.test(label))return {summary:'This is the configuration without the named feature. The specification describes the remaining equipment.',details};
 if(choice.package&&category!=='roof')return {summary:'Choose the listed equipment changes together. Package content and requirements can differ by trim; the factory notes below preserve those conditions.',details};
 const rules=[
  [/sky.*touch|power.*top/i,'Open or close the fabric roof with a power control for open-air driving.'],
  [/dual.?top/i,'Includes both a hardtop and a soft top so you can change between the two roof systems.'],
  [/body.?colou?r.*(?:hard.?top|three.?piece)/i,'A removable hardtop finished in the vehicle’s exterior color. Remove the roof panels for an open-air feel.'],
  [/hard.?top|three.?piece.*top/i,'A rigid, removable roof. Three-piece versions let you remove the front panels separately from the rear section.'],
  [/soft.?top/i,'A folding fabric roof for open-air driving. The listed material and top version identify this particular option.'],
  [/panoramic/i,'A large glass roof that brings more light into the cabin. Compare the specific opening sections and shades shown for this option.'],
  [/sunroof|moonroof/i,'A glass roof opening above the cabin. The specification identifies its controls and any shade.'],
  [/ventilat(?:ed|ion).*seat|seat(?:ing|s)?.*ventilat/i,'Moves air through the seat surfaces to help you stay comfortable in warm weather.'],
  [/massag(?:e|ing).*seat|seat(?:ing|s)?.*massag/i,'Seat functions apply changing pressure for a massage effect.'],
  [/heated.*steering|steering.*heated/i,'Warms the steering-wheel rim for more comfortable cold-weather driving.'],
  [/^(?=.*(?:rear|second.?row))(?=.*heated)(?=.*seat)/i,'Warms the indicated rear seating positions for passengers in colder weather.'],
  [/heated.*seat|seat(?:ing|s)?.*heated/i,'Warms the indicated seating positions for cold-weather comfort.'],
  [/memory.*seat|seat.*memory/i,'Saves supported seat settings so you can return to a preferred driving position.'],
  [/(?:third.?row|3rd.?row).*fold|fold.*(?:third.?row|3rd.?row)/i,'The specified sections of the third-row seat fold to change the passenger and cargo layout.'],
  [/power.*seat|seat(?:ing|s)?.*power/i,'Electric controls adjust the seat position. The listed number of ways describes the available movements.'],
  [/manual.*seat|seat(?:ing|s)?.*manual/i,'Move the seat using its hand-operated levers and controls.'],
  [/captain.?s.*chair/i,'Separate seats in the listed row give passengers individual seating positions.'],
  [/40.?20.?40|split.?bench/i,'A divided bench layout offers a center seating section instead of two separate bucket seats.'],
  [/stow\s*[’'‘]?\s*n\s*[’'‘]?\s*go/i,'The designated seats fold into the floor to create cargo space without removing them from the vehicle.'],
  [/third.?row|3rd.?row/i,'The third row provides passenger seating behind the second row. The specification identifies its seating configuration.'],
  [/cloth/i,'Fabric seat upholstery. Compare the listed material, color and seating layout.'],
  [/leatherette|vinyl/i,'A synthetic seat covering. Compare the actual surface and seating layout shown here.'],
  [/leather|nappa|palermo|suede/i,'The named upholstery identifies the seating surface or trim. The photo shows the material and seat design where verified.'],
  [/head.?up.*display/i,'Projects supported driving information in your forward view so it is easier to glance at while driving.'],
  [/touchscreen|infotainment.?screen|uconnect/i,'The center display controls supported media, phone and vehicle functions. Compare the listed screen size and system version.'],
  [/instrument.*(?:cluster|display)|driver.*display|tft.*cluster/i,'The display ahead of the driver shows gauges and supported vehicle information.'],
  [/rear.?seat.*(?:entertainment|screen)|theater/i,'Rear passengers get their own entertainment display or displays, as specified for this system.'],
  [/klipsch|alpine|harman|mcintosh|audio|speaker|subwoofer/i,'The listed speaker system defines the audio setup. Compare the brand, speaker count and any specified amplifier or other components.'],
  [/navigation/i,'Built-in navigation provides maps and route guidance through the vehicle’s supported display.'],
  [/fam.?cam|rear.?seat.*camera/i,'Lets the driver view the rear seating area on the center display.'],
  [/surround.*(?:camera|view)|360.*camera/i,'Combines exterior camera views to help you see around the vehicle during low-speed maneuvering.'],
  [/trailcam|front.*camera/i,'Shows a view ahead of the vehicle to help place the wheels and see nearby obstacles.'],
  [/rear.*camera|backup.*camera/i,'Shows the area behind the vehicle while reversing.'],
  [/blind.?spot|cross.?path/i,'Monitors the specified nearby areas and alerts you when the system detects a vehicle or crossing traffic.'],
  [/adaptive.*cruise/i,'Adjusts cruising speed to help maintain a selected gap from a detected vehicle ahead.'],
  [/lane.*(?:keep|management|departure)/i,'Uses lane markings to provide the listed alerts or steering assistance.'],
  [/forward.*collision|automatic.*(?:emergency|braking)/i,'Monitors for potential forward collisions and provides the warnings or braking assistance specified for this system.'],
  [/park.?sense|parking.*sensor|park.*assist/i,'Helps with parking by detecting nearby obstacles or providing the assistance named in this option.'],
  [/remote.*start/i,'Starts the engine remotely before you get in. Availability depends on the listed vehicle and transmission configuration.'],
  [/proximity|passive.*entry/i,'Unlock the vehicle with the key nearby using the supported door-handle controls.'],
  [/garage.*(?:door|opener)|homelink/i,'Built-in buttons can operate compatible garage doors or gates after pairing.'],
  [/climate|temperature.*control|air.*condition/i,'Controls cabin temperature and airflow. Multiple zones let occupants set different temperatures where specified.'],
  [/wireless.*charg/i,'Charges a compatible phone on the built-in charging pad.'],
  [/trailer.*brak/i,'Lets you adjust compatible trailer braking from controls in the vehicle.'],
  [/tow.*hook/i,'Provides the listed attachment points for an appropriate vehicle-recovery setup.'],
  [/hitch|tow|trailering/i,'The listed towing equipment prepares the vehicle for compatible trailer connections. Use the exact vehicle’s ratings to determine towing limits.'],
  [/disconnect.*(?:sway|stabilizer)|(?:sway|stabilizer).*disconnect/i,'Releases the stabilizer bar when appropriate to allow more independent wheel movement over uneven ground.'],
  [/lock(?:ing|er).*differential/i,'Can lock the specified axle’s differential to help both wheels turn together when extra traction is needed.'],
  [/limited.?slip|anti.?spin/i,'Helps transfer drive torque when one wheel on the axle loses traction.'],
  [/skid.*plate/i,'Protective plates help shield the specified underbody components from contact with obstacles.'],
  [/rock.*rail/i,'Protective rails along the lower sides help shield the body during off-road travel.'],
  [/air.*suspension/i,'Air springs support the vehicle and provide the ride-height functions specified for this system.'],
  [/spray.*bedliner|bed.*liner/i,'A protective lining covers the pickup bed to reduce wear on its surfaces.'],
  [/rambox/i,'Lockable storage compartments are built into the sides of the pickup bed.'],
  [/power.*(?:liftgate|tailgate)|hands.?free.*(?:liftgate|tailgate)/i,'Power operation makes it easier to open or close the rear cargo access using the supported controls.'],
  [/running.*board|side.*step/i,'Provides a lower step to help you get into and out of the vehicle.'],
  [/led.*(?:head|fog)|headlamp|headlight/i,'The listed lighting system illuminates the road. Compare the lamp type and any named automatic functions.']
 ];
 let summary=rules.find(([pattern])=>pattern.test(text))?.[1];
 if(['engine','transmission'].includes(category)&&/manual/i.test(text)&&/automatic/i.test(text))summary='This configuration lists manual and automatic alternatives. Compare the engine/transmission combinations identified in the specification.';
 else if(category==='engine')summary=/manual/i.test(text)?'Choose this engine and manual-transmission combination. You use a clutch pedal and shift gears yourself.':/automatic/i.test(text)?'Choose this engine and automatic-transmission combination. The transmission shifts gears for you.':'Choose this power source. Its displacement, fuel type and configuration are identified in the specification.';
 else if(category==='transmission')summary=/manual/i.test(text)?'You choose gears using a shift lever and clutch pedal.':/automatic/i.test(text)?'The transmission shifts gears automatically; the specification identifies this unit and its gear count.':'The specification identifies how this transmission operates and its available gearing.';
 else if(category==='body')summary='Choose the cab, passenger space and cargo-bed configuration shown in the specification.';
 else if(category==='drive'||category==='transfer')summary='Choose how engine power reaches the wheels. The named drive system and transfer case define its supported driving modes.';
 else if(category==='wheels')summary='Choose the listed wheel size, design and finish. Use the exact vehicle photo to check its appearance when available.';
 else if(category==='tires')summary='The listed size and tire type define this option. All-terrain, highway and off-road versions are built for different driving surfaces.';
 else if(category==='paint'||category==='interior-color')summary='Choose the named factory color or finish. Illustrations are approximate; a verified vehicle photo is the reference for its appearance.';
 else if(category==='axle-ratio')summary='The axle ratio affects how engine speed is translated into wheel speed. Compare this configuration with your driving and towing needs.';
 else if(category==='exterior-mirrors')summary=/\bno power\b/i.test(text)?'These are the non-powered exterior mirrors listed in the specification.':/power.?adjust/i.test(text)?'Electric controls adjust the exterior mirror angle. The specification lists any additional folding, heating or lighting functions.':'Exterior mirrors provide a view beside and behind the vehicle. The specification identifies their adjustment, folding and heating functions.';
 return {summary:summary||'This choice selects the equipment described below. Its factory specification identifies the configuration to match to your vehicle.',details:details||clean(!summary&&choice.feature!=='factoryChoice'&&typeof choice.value==='string'?choice.value:'')};
}
