// Which window-sticker feature answers a factory chart row, so a shopper's pick in Perfect Match can be checked against
// each vehicle's own sticker. A row is mapped only when one sticker feature covers the row itself: parenthetical notes
// ("included with …", "requires …", "packaged with …") are ignored, package and group rows are skipped (they bundle many
// things), and a few features must be named in the row's own words (a "one-touch" window is not the Sky One-Touch top).
import {guideRowFeature} from './trim-link.mjs';
import {engineProfile} from './engine-search.mjs';

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
 // The chart uses the FamCAM trademark; VIN labels use Interior Rear-Facing Camera.
 let id=/\b(?:fam[ -]?cam(?:tm)?|interior rear[ -]facing camera)\b/i.test(text)?'familyCamera':guideRowFeature(text);
 if(!id&&parent)id=guideRowFeature(parent+' '+text);
 if(!id)return [];
 if(aside(id,parent,text))return [];
 const need=named[id];
 if(need&&!need.test(parent+' '+text))return [];
 // Third-row rows are about the seats themselves.
 if(id==='thirdRow'&&!/seat/i.test(parent+' '+text))return [];
 return [id];
}

// ---- Options read straight off a window sticker by name ----
// A sticker's optional-equipment block names packages and options much as the chart does ("Convenience Group",
// "Black 3-Piece Hard Top", "Power-Heated Mirrors"). A chart option counts as on a vehicle when every significant word of
// its name (with what it belongs to, e.g. "Mirrors: Power-heated") appears on one sticker line.
const stop=new Set(['with','and','the','for','by','of','in','on','to','a','an','mopar','jeep','ram','dodge','chrysler','group','package','pkg','system','systems','equipment','includes','including','standard','front-row']);
const swap=[[/\bthree\b/g,'3'],[/\btwo\b/g,'2'],[/\bfour\b/g,'4'],[/\bhard[ -]top\b/g,'hardtop'],[/\bsoft[ -]top\b/g,'softtop'],[/\bsun[ -]?roof\b/g,'sunroof'],[/\b(\d+)[ -]piece\b/g,'$1piece']];
export function nameWords(s){
 let t=String(s||'').normalize('NFKC').toLowerCase().replace(/[®™]/g,'').replace(/\([^()]*\)/g,' ');
 for(const [a,b] of swap)t=t.replace(a,b);
 return [...new Set(t.replace(/[^a-z0-9.]+/g,' ').split(' ').map(w=>stem(w.replace(/\.+$/,''))).filter(w=>w&&!stop.has(w)&&!/^\d{1,2}$/.test(w)))];
}
// "Seating"/"seats" → "seat", "tinted" → "tint", "mirrors" → "mirror": the same word however the chart or sticker bends it.
function stem(w){
 if(/^\d/.test(w)||w.length<5)return w;
 return w.replace(/ing$/,'').replace(/(?<=[^e])ed$/,'').replace(/ies$/,'y').replace(/(?<=[^s])s$/,'');
}
// The words that must appear for a chart option: its own name, plus its parent when the name alone is a fragment
// ("Power-heated" under "Mirrors"). Too short a name (one short word) can't be told apart on a sticker: null.
export function optionWords(fact){
 const t=String(fact.text??fact.label??'').replace(/\s+[—–-]\s+(?:includes|including)\b.*$/i,'').replace(/\b(?:includes|including)\b.*$/i,'');
 let w=nameWords(t);
 if(fact.parent&&w.length<3)w=[...new Set([...nameWords(fact.parent),...w])];
 if(!w.length||w.join('').length<8)return null;
 return w;
}
// Every word for a short name (four words or fewer); for a long one, nearly all of them — and every number ("4.10",
// "12.3") — since a sticker shortens long chart lines.
export function stickerHas(lineWords,words){
 const need=words.length<=4?words.length:Math.ceil(words.length*.85),numbers=words.filter(w=>/\d/.test(w));
 return lineWords.some(l=>numbers.every(w=>l.has(w))&&words.filter(w=>l.has(w)).length>=need);
}

// ---- Engines: a chart engine row against the sticker's "Engine:" and "Transmission:" lines ----
const output=t=>/\bHO\b|high[- ]output/i.test(t)?'HO':/\bSO\b|standard[- ]output/i.test(t)?'SO':null;
const gearbox=t=>/manual/i.test(t)?'manual':/automatic|\bauto\b|\d-speed .*(?:auto|torqueflite)|torqueflite/i.test(t)?'automatic':null;
// → {size, output, gearbox} for an engine row of the chart (engine section, names a displacement), else null.
export function engineRow(fact){
 if(!/ENGINE|POWERTRAIN/i.test(fact.section||'')||fact.parent&&!/engine/i.test(fact.parent))return null;
 const text=String(fact.text||'');const size=engineProfile(text).size;
 if(!size||!/\b\d\.\d\s*-?\s*(?:L|liter)\b/i.test(text))return null;
 const [engine,trans]=text.split(/\s+\/\s+|\/(?=\d|eight|six|nine|ten)/i);
 return {size,output:output(engine),gearbox:gearbox(trans||'')};
}
export function engineMatches(row,lines){
 const eng=lines.find(l=>/^Engine:/i.test(l)),trans=lines.find(l=>/^Transmission:/i.test(l));
 if(!eng)return false;
 if(engineProfile(eng).size!==row.size)return false;
 const o=output(eng);if(row.output&&o&&row.output!==o)return false;
 const g=trans?gearbox(trans):null;if(row.gearbox&&g&&row.gearbox!==g)return false;
 return true;
}
