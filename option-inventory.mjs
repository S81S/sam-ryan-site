import {withComparisonSpecifications} from './comparison-specs.mjs?v=audit3';
import {featureInventoryLink} from './feature-inventory-link.mjs?v=1';
import {audioInventoryFeature,installedAudioFact} from './audio-evidence.mjs?v=errors1';
const normalize=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[®™]/g,'').replace(/[\u2010-\u2015]/g,'-').replace(/[^a-z0-9.]+/g,' ').replace(/\s+/g,' ').trim();
export function optionInventoryLink(fact,context={}){
 const url=new URL(featureInventoryLink('',context),'https://carswithsam.com');url.searchParams.delete('feature');
 url.searchParams.set('option',fact.key||fact.label);url.searchParams.set('optionLabel',fact.label);url.searchParams.set('optionValue',fact.value||'');
 return url.pathname+'?'+url.searchParams;
}
export function optionFromParams(params){
 if(!params.get('option'))return null;
 return {key:params.get('option').slice(0,100),label:(params.get('optionLabel')||'Selected factory option').slice(0,200),value:(params.get('optionValue')||'').slice(0,500)};
}
const ids={
 'rear-seat-heat':['rearHeated'],'rain-sensing-wipers':['rainWipers'],'fog-lamps':['fogLights'],'head-up-display':['hud'],'third-row':['thirdRow'],'climate-upgrade':['dualClimate'],
 'tow-hooks':['towHooks'],'rear-locker-upgrade':['rearLocker'],'wireless-charging':['wireless'],'seat-massage':['massage'],'trailer-hitch':['tow'],'hitch':['tow'],'hardtop':['hardTop'],'heated-front-seats':['heatedSeats'],'front-seat-heat':['heatedSeats'],'front-heat':['heatedSeats'],'heated-wheel':['heatedWheel'],'heated-steering':['heatedWheel'],'remote-start':['remoteStart'],'entry':['passiveEntry'],'blind-spot':['blindSpot'],'rear-parking':['parkingSensors'],'power-roof':['skyRoof'],'navigation':['navigation'],'bedliner':['bedliner'],'bed-cover':['tonneau'],'trailer-brakes':['brakeController'],'adaptive-cruise':['adaptiveCruise'],'rain-wipers':['rainWipers'],'sunroof':['sunroof'],'surround-camera':['surroundCamera'],'ventilated-front-seats':['ventilated'],'front-ventilation':['ventilated'],'heated-rear-seats':['rearHeated'],'second-heat':['rearHeated'],'seat-memory':['memorySeats'],'memory':['memorySeats'],'awd':['awd'],'cabin-camera':['familyCamera'],'glass-roof':['panoramic'],'seat-comfort-upgrade':['ventilated','memorySeats','massage']
};
export function installedOptionFact(vehicle,sticker,option){
 if(sticker?.status!=='verified'||sticker.vin!==vehicle.vin)return null;
 const key=option.key.replace(/_/g,'-'),text=option.label+' '+option.value;
 if(/audio/.test(key)||/\baudio\b/i.test(option.label)){
  const wanted=audioInventoryFeature({displayValue:text}),installed=installedAudioFact(vehicle,sticker);
  if(wanted){
   const brand=installed&&audioInventoryFeature(installed);
   if(brand){const count=text.match(/\b(\d+)[ -]+(?:amplified[ -]+)?speakers?\b/i),actual=installed.displayValue.match(/\b(\d+)[ -]+(?:amplified[ -]+)?speakers?\b/i);return count&&!actual?null:{...installed,value:brand===wanted&&(!count||count[1]===actual[1])};}
   const confirmed=sticker.features?.[wanted];
   if(/\b\d+[ -]+speakers?\b/i.test(text)&&confirmed&&!installed)return null;
   return confirmed?{...confirmed,sourceUrl:confirmed.sourceUrl||sticker.sourceUrl}:null;
  }
  const count=text.match(/\b(\d+)[ -]+(?:amplified[ -]+)?speakers?\b/i),actual=installed?.displayValue.match(/\b(\d+)[ -]+(?:amplified[ -]+)?speakers?\b/i);
  if(count)return actual?{...installed,value:count[1]===actual[1]}:null;
 }
 const specification=['touchscreen-upgrade','touchscreen'].includes(key)?'infotainmentScreen':['driver-display','instrument-screen'].includes(key)?'instrumentScreen':key==='driver-seat'?'driverAdjustment':key==='passenger-seat'?'passengerAdjustment':key==='power-tailgate'?'tailgateOperation':null;
 if(specification){
  const fact=withComparisonSpecifications(vehicle,sticker)?.features?.[specification];
  if(!fact)return null;
  if(['infotainmentScreen','instrumentScreen'].includes(specification)){
   const size=text.match(/\b(\d{1,2}(?:\.\d+)?)[ -]?inch/i);
   if(!size)return null;
   const generation=text.match(/uconnect\s+(\d)/i),printed=fact.evidence.join(' ');
   const navigation=/\bnav(?:igation)?\b/i.test(text);
   return {...fact,value:fact.displayValue===Number(size[1])+' inches'&&(!generation||new RegExp('uconnect\\s+'+generation[1]+'\\b','i').test(printed))&&(!navigation||/\bnav(?:igation)?\b/i.test(printed))};
  }
  if(['driverAdjustment','passengerAdjustment'].includes(specification)){
   const adjustment=text.match(/\b(\d+)[ -]+way[ -]+(power|manual)\b/i);
   return adjustment?{...fact,value:fact.displayValue===adjustment[1]+'-way '+adjustment[2].toLowerCase()}:null;
  }
  // A power release cannot prove a powered opening/closing tailgate.
  return {...fact,value:fact.displayValue==='Power tailgate'};
 }
 const printedRules={
  'aux-switches':/\b(?:programmable |mounted )?auxiliary switches\b/i,
  'night-vision':/\bnight vision\b.*\bpedestrian\b.*\banimal\b/i,
  'lane-driving-upgrade':/\bhands[ -]?free active driving assist\b/i,
  'winch':/\b(?:warn (?:electric front )?winch|(?:front )?electric[ -]winch)\b/i
 };
 if(printedRules[key]){
  const lines=(sticker.lines||[]).filter(l=>!(/\bdelete[ds]?|deletion|without|not equipped|not included|if equipped|available separately|winch.capable\b/i.test(l)));
  const evidence=lines.filter(l=>printedRules[key].test(l));
  const capacity=text.match(/\b(\d[\d,]*)[ -]?(?:pound|lb)/i);
  // An installed winch alone cannot prove an advertised capacity.
  if(capacity&&!evidence.some(l=>l.replace(/,/g,'').includes(capacity[1].replace(/,/g,''))))return null;
  return evidence.length?{value:true,evidence,sourceUrl:sticker.sourceUrl}:null;
 }
 let features=ids[key];
 const name=normalize(option.label);
 if(/front seat heat|heated front seat/.test(name))features=['heatedSeats'];
 if(/front seat ventil|ventilated front seat/.test(name))features=['ventilated'];
 if(/front seat massage/.test(name))features=['massage'];
 if(/heated rear seat|heated second row seat|rear seat heat/.test(name))features=['rearHeated'];
 if(key==='rear-seat-upgrade'&&/rear heating/i.test(text))features=['rearHeated'];
 if(/panoramic sunroof/.test(name))features=['panoramic'];
 if(key==='rear-differential'&&/antispin|anti.spin|limited.slip/i.test(text))features=['limitedSlip'];
 // A 35-inch package must not match a different tire size or unrelated wheel option.
 if(/tire|larger-tires/.test(key)){const size=text.match(/\b(3[3-7])[ -]?inch/i);if(size)features=['tireDiameter'+size[1]];}
 if(features){
  const facts=features.map(id=>sticker.features?.[id]);
  if(facts.some(f=>f?.value===false))return {value:false,evidence:facts.flatMap(f=>f?.evidence||[]),sourceUrl:sticker.sourceUrl};
  if(facts.every(f=>f?.value===true))return {value:true,evidence:facts.flatMap(f=>f.evidence||[]),sourceUrl:sticker.sourceUrl};
  return null;
 }
 // For options without a dedicated feature rule, require the printed option or
 // package name itself. A trim name or listing description cannot prove it.
 const generic=/^(?:factory (?:option|cover options)|optional|available|factory option package)$/i;
 const phrase=generic.test(option.value.trim())?option.label:option.value.split(/[;—]/)[0].replace(/\brequires\b.*$/i,'').replace(/\b(?:factory|optional)\s+(?:option|package)\b/ig,'').trim();
 const target=normalize(phrase);if(target.length<5||/^(audio upgrade|premium audio|factory option|wheel upgrade|optional powertrain|other factory powertrain configurations)$/.test(target))return null;
 const lines=(sticker.lines||[]).filter(l=>!(/\bdelete[ds]?|deletion|without|not equipped|not included|if equipped|available separately\b/i.test(l)));
 const evidence=lines.filter(l=>(' '+normalize(l)+' ').includes(' '+target+' '));
 return evidence.length?{value:true,evidence,sourceUrl:sticker.sourceUrl}:null;
}
