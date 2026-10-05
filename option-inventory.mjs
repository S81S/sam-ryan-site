import {withComparisonSpecifications} from './comparison-specs.mjs?v=audit2';
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
   if(brand)return {...installed,value:brand===wanted};
   const confirmed=sticker.features?.[wanted];
   return confirmed?{...confirmed,sourceUrl:confirmed.sourceUrl||sticker.sourceUrl}:null;
  }
 }
 const specification=key==='touchscreen-upgrade'?'infotainmentScreen':key==='power-tailgate'?'tailgateOperation':null;
 if(specification){
  const fact=withComparisonSpecifications(vehicle,sticker)?.features?.[specification];
  if(!fact)return null;
  if(specification==='infotainmentScreen'){
   const size=text.match(/\b(\d{1,2}(?:\.\d+)?)[ -]?inch/i);
   return size?{...fact,value:fact.displayValue===Number(size[1])+' inches'}:null;
  }
  // A power release cannot prove a powered opening/closing tailgate.
  return {...fact,value:fact.displayValue==='Power tailgate'};
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
