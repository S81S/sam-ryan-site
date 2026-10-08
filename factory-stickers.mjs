// Which window-sticker feature answers a factory chart row, so a shopper's pick in Perfect Match can be checked against
// each vehicle's own sticker. A row is mapped only when one sticker feature covers the row itself: parenthetical notes
// ("included with …", "requires …", "packaged with …") are ignored, package and group rows are skipped (they bundle many
// things), and a few features must be named in the row's own words (a "one-touch" window is not the Sky One-Touch top).
import {guideRowFeature} from './trim-link.mjs';

const bundle=/\b(?:delete|not available|package|group|includes|prep|preparation|wiring|ready|provisions?|kit)\b/i;
// Rows about something next to the feature, not the feature: mats, hooks, shades, trim pieces, washers, badges.
const beside=/\b(?:floor mats?|mats?|hooks?|shades?|washers?|badg\w*|accents?|appliqu\w*|bezels?|trim|surround|lamps? only)\b/i;
const named={
 adaptiveCruise:/adaptive/i,
 skyRoof:/\bsky\b/i,
 sunroof:/sunroof|moonroof/i,
 panoramic:/panoramic/i,
 thirdRow:/third[- ]row/i,
 v8:/\bV-?8\b/i,
 turbo:/turbo/i,
 backupCamera:/back-?up camera|rear camera|parkview/i,
 surroundCamera:/360|surround[- ]view/i,
 ledLights:/LED[^,;]*headlamp|headlamps?[^,;]*LED/i,
 forwardWarning:/collision warning/i,
 emergencyBrake:/emergency brak/i,
 powerLiftgate:/power liftgate|hands-?free[^,;]*liftgate/i,
 heatedWheel:/heated[^,;]*steering|steering wheel[^,;]*heated/i,
 heatedSeats:/heated[^,;]*seat/i,
 ventilated:/ventilated/i,
 captains:/captain/i,
 memorySeats:/memory/i,
 navigation:/\bNAV\b|navigation/i,
 tow:/hitch|trailer tow|tow package|towing/i,
 remoteStart:/remote start/i
};
// A part that carries the feature's controls or comes with it (a steering wheel with cruise buttons, a seat that comes
// with a heated wheel, an overhead console) is not the feature; nor are a headlamp's own sub-features.
const seatIds=new Set(['heatedSeats','ventilated','captains','thirdRow','memorySeats','lumbar','powerDriver','powerPassenger','rearHeated','rearVented','benchSeat','massage']);
function aside(id,parent,text){
 if(/steering wheel|consoles?|visors?|overhead/i.test(parent)&&id!=='heatedWheel')return true;
 if(/seat/i.test(parent)&&!seatIds.has(id))return true;
 if(/auto(?:matic)?\s*high[- ]beam|daytime running|^automatic$/i.test(text)&&id!=='autoHighBeam')return true;
 return false;
}
const plain=t=>String(t||'').replace(/\([^()]*\)/g,' ').replace(/\([^()]*\)/g,' ').replace(/\s+/g,' ').trim();

// → [feature id] or [] for one chart fact (from factoryFacts: parent, text).
export function factoryRowIds(fact){
 const text=plain(fact.text),parent=plain(fact.parent);
 if(!text||bundle.test(text)||bundle.test(parent)||beside.test(text)||beside.test(parent))return [];
 let id=guideRowFeature(text);
 if(!id&&parent)id=guideRowFeature(parent+' '+text);
 if(!id)return [];
 if(aside(id,parent,text))return [];
 const need=named[id];
 if(need&&!need.test(parent+' '+text))return [];
 // Third-row rows are about the seats themselves.
 if(id==='thirdRow'&&!/seat/i.test(parent+' '+text))return [];
 return [id];
}
