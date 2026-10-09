// Builds one permanent page per model + feature that shoppers search for by name ("Ram 1500 with massaging seats"),
// listing the vehicles whose own VIN-matched window sticker shows that feature. Matching is done by the site's own
// search (equipment-search.mjs), so a page can never list a vehicle that Find Your Car would not.
//
// Rules:
//  - A page is created at 3 or more matches and kept while at least 1 remains. With none left it is removed, and the
//    address answers "not found" like a sold vehicle's page.
//  - Two pages for one model that would list nearly the same vehicles are not both published; the feature listed
//    first in FEATURES wins.
//  - A feature that 19 in 20 of a model's readable stickers show is not a way to narrow that model, so it gets no
//    page. Engines and powertrains are the exception (`always`): shoppers search for those by model regardless.
//  - No availability or offer claims: prices are the listing's own, and every page says to confirm before visiting.
// Output: <model>-with-<feature>-austin.html, shop-by-feature.html, sitemap-features.xml, data/feature-pages.json.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const CREATE_AT=3,MAX_CARDS=36,SAME_LIST=0.85,NEARLY_ALL=0.95;

// Models with enough vehicles to be worth a page. `test` runs against the completed, upper-case listing title.
const MODELS=[
 {slug:'ram-1500',name:'Ram 1500',plural:'Ram 1500 trucks',one:'truck',test:/\bRAM 1500\b/,not:/PROMASTER/,strip:/\bRAM 1500\b/,q:'ram 1500',landing:'/ram-1500-austin',questions:'/ram-1500-questions'},
 {slug:'ram-2500',name:'Ram 2500',plural:'Ram 2500 trucks',one:'truck',test:/\bRAM 2500\b/,not:/PROMASTER/,strip:/\bRAM 2500\b/,q:'ram 2500',questions:'/ram-2500-questions'},
 {slug:'ram-3500',name:'Ram 3500',plural:'Ram 3500 trucks',one:'truck',test:/\bRAM 3500\b/,not:/PROMASTER/,strip:/\bRAM 3500\b/,q:'ram 3500',questions:'/ram-3500-questions'},
 {slug:'jeep-wrangler',name:'Jeep Wrangler',plural:'Jeep Wranglers',one:'Wrangler',test:/\bWRANGLER\b/,strip:/\bJEEP WRANGLER(?: UNLIMITED)?\b/,q:'wrangler',landing:'/jeep-wrangler-austin',questions:'/jeep-wrangler-questions'},
 {slug:'jeep-gladiator',name:'Jeep Gladiator',plural:'Jeep Gladiators',one:'Gladiator',test:/\bGLADIATOR\b/,strip:/\bJEEP GLADIATOR\b/,q:'gladiator',questions:'/jeep-gladiator-questions'},
 {slug:'jeep-grand-cherokee',name:'Jeep Grand Cherokee',plural:'Jeep Grand Cherokees',one:'Grand Cherokee',test:/\bGRAND CHEROKEE\b/,strip:/\bJEEP GRAND CHEROKEE(?: L)?\b/,q:'grand cherokee',questions:'/jeep-grand-cherokee-questions'},
 {slug:'jeep-cherokee',name:'Jeep Cherokee',plural:'Jeep Cherokees',one:'Cherokee',test:/\bCHEROKEE\b/,not:/GRAND CHEROKEE/,strip:/\bJEEP CHEROKEE\b/,q:'cherokee',questions:'/jeep-cherokee-questions'},
 {slug:'jeep-compass',name:'Jeep Compass',plural:'Jeep Compass SUVs',one:'Compass',test:/\bJEEP COMPASS\b/,strip:/\bJEEP COMPASS\b/,q:'jeep compass',questions:'/jeep-compass-questions'},
 {slug:'jeep-grand-wagoneer',name:'Jeep Grand Wagoneer',plural:'Jeep Grand Wagoneers',one:'Grand Wagoneer',test:/\bGRAND WAGONEER\b/,strip:/\bJEEP GRAND WAGONEER(?: L)?\b/,q:'grand wagoneer',questions:'/jeep-wagoneer-questions'},
 {slug:'jeep-wagoneer',name:'Jeep Wagoneer',plural:'Jeep Wagoneers',one:'Wagoneer',test:/\bWAGONEER\b/,not:/GRAND WAGONEER/,strip:/\bJEEP WAGONEER(?: L)?\b/,q:'wagoneer',questions:'/jeep-wagoneer-questions'},
 {slug:'chrysler-pacifica',name:'Chrysler Pacifica',plural:'Chrysler Pacifica minivans',one:'Pacifica',test:/\bPACIFICA\b/,strip:/\bCHRYSLER PACIFICA\b/,q:'pacifica',questions:'/chrysler-pacifica-questions'},
 {slug:'dodge-durango',name:'Dodge Durango',plural:'Dodge Durangos',one:'Durango',test:/\bDURANGO\b/,strip:/\bDODGE DURANGO\b/,q:'durango',questions:'/dodge-durango-questions'},
 {slug:'dodge-charger',name:'Dodge Charger',plural:'Dodge Chargers',one:'Charger',test:/\bCHARGER\b/,strip:/\bDODGE CHARGER\b/,q:'charger',questions:'/dodge-charger-questions'}
];

// Features shoppers ask for by name, most-searched first. `id` is the search's own feature id; `name` is the
// feature as a heading or link; `with` completes
// "<vehicles> with …"; `what` is a plain description of the feature itself and makes no claim about any trim.
const FEATURES=[
 {id:'massage',name:'Massaging seats',slug:'massaging-seats',with:'massaging seats',what:'Massaging seats have a massage function built into the seat. They are a separate feature from heated or ventilated seats, and a trim name alone does not confirm them.',more:['/ventilated-vs-massaging-seats','Ventilated, heated and massaging seats explained']},
 {id:'ventilated',name:'Ventilated seats',slug:'ventilated-seats',with:'ventilated seats',what:'Ventilated seats move air through the seat surface to keep you cooler. Shoppers often call them cooled or air-conditioned seats. They are frequently part of an equipment group, so a trim name alone does not confirm them.',more:['/ventilated-vs-massaging-seats','Ventilated, heated and massaging seats explained']},
 {id:'surroundCamera',name:'Surround-view camera',slug:'surround-view-camera',with:'a surround-view camera',what:'A surround-view camera combines several exterior cameras into a view around the vehicle for parking and tight spaces. It is more than the standard rear back-up camera.'},
 {id:'panoramic',name:'Panoramic sunroof',slug:'panoramic-sunroof',with:'a panoramic sunroof',what:'A panoramic sunroof is a large glass roof that reaches over more than the front seats. It is a different item from a standard single-panel sunroof.'},
 {id:'hemi',always:true,name:'HEMI V8',slug:'hemi-v8',with:'the HEMI V8',what:'HEMI is the name of the V8 engines used in Ram, Dodge and Jeep vehicles. The engine line on each window sticker names the exact engine in that vehicle.'},
 {id:'hurricane',always:true,name:'Hurricane engine',slug:'hurricane-engine',with:'the Hurricane engine',what:'Hurricane is the name of a family of turbocharged engines. More than one version exists, so read the engine line on the window sticker for the engine in a specific vehicle.'},
 {id:'dieselCummins',always:true,name:'Cummins diesel',slug:'cummins-diesel',with:'the Cummins diesel',what:'The Cummins is the turbo-diesel engine offered in Ram heavy-duty trucks. The engine line on the window sticker confirms it.'},
 {id:'skyRoof',name:'Sky One-Touch roof',slug:'sky-one-touch-roof',with:'the Sky One-Touch roof',what:'The Sky One-Touch Power Top is a power-retractable roof: one button slides the top back. It is a factory roof choice, separate from the soft top and the hard top.',more:['/jeep-wrangler-austin','Jeep Wrangler roofs and shopping']},
 {id:'tireDiameter35',name:'35-inch tires',slug:'35-inch-tires',with:'factory 35-inch tires',what:'These vehicles show a 35-inch tire size or tire package on their original window sticker.',caution:'Tire sizes are the factory specification on the window sticker. On a used vehicle, check the tires fitted today.'},
 {id:'tireDiameter33',name:'33-inch tires',slug:'33-inch-tires',with:'factory 33-inch tires',what:'These vehicles show a 33-inch tire size on their original window sticker.',caution:'Tire sizes are the factory specification on the window sticker. On a used vehicle, check the tires fitted today.'},
 {id:'hardTop',name:'Hard top',slug:'hard-top',with:'a factory hard top',what:'A factory hard top is a removable hard roof. A vehicle can leave the factory with a hard top, a soft top or both; the window sticker shows which.',more:['/jeep-wrangler-austin','Jeep Wrangler roofs and shopping']},
 {id:'softTop',name:'Soft top',slug:'soft-top',with:'a factory soft top',what:'A factory soft top is a folding fabric roof. A vehicle can leave the factory with a soft top, a hard top or both; the window sticker shows which.',more:['/jeep-wrangler-austin','Jeep Wrangler roofs and shopping']},
 {id:'thirdRow',name:'Third-row seats',slug:'third-row-seats',with:'third-row seats',what:'Third-row seats add a row of seating behind the second row. The window sticker lists the third-row seat when it is fitted.'},
 {id:'captains',name:'Second-row captain’s chairs',slug:'second-row-captains-chairs',with:'second-row captain’s chairs',what:'Captain’s chairs are two individual second-row seats in place of a bench.'},
 {id:'flatTow',name:'Flat towing',slug:'flat-tow-capability',with:'flat-tow capability',h1:m=>`${m.plural} you can flat tow, in Austin`,what:'Flat towing means towing the vehicle behind a motorhome with all four wheels on the ground. For the vehicles below, the factory owner’s manual supports recreational flat towing for that drivetrain.',caution:'Follow the complete procedure in the owner’s manual for the specific vehicle, and confirm the towing equipment and the vehicle’s condition before towing.',manual:true},
 {id:'rearLocker',name:'Locking rear differential',slug:'locking-rear-differential',with:'a locking rear differential',what:'A locking rear differential can lock both rear wheels together for traction on loose or uneven ground. It is not the same as a limited-slip differential.'},
 {id:'airSuspension',name:'Air suspension',slug:'air-suspension',with:'air suspension',what:'Air suspension uses air springs, which lets the ride height be raised or lowered.'},
 {id:'hud',name:'Head-up display',slug:'head-up-display',with:'a head-up display',what:'A head-up display shows speed and other driving information on the windshield in your line of sight.'},
 {id:'mcintosh',name:'McIntosh audio',slug:'mcintosh-audio',with:'McIntosh audio',what:'McIntosh is a branded premium audio system. The window sticker names the audio system fitted to each vehicle.'},
 {id:'harman',name:'Harman Kardon audio',slug:'harman-kardon-audio',with:'Harman Kardon audio',what:'Harman Kardon is a branded premium audio system. The window sticker names the audio system fitted to each vehicle.'},
 {id:'familyCamera',name:'Rear-seat camera',slug:'rear-seat-camera',with:'a rear-seat camera',what:'A rear-seat passenger camera (FamCAM) shows the rear seats on the front screen.'},
 {id:'rearVented',name:'Ventilated rear seats',slug:'ventilated-rear-seats',with:'ventilated rear seats',what:'Ventilated rear seats cool the second-row outboard seats. They are listed separately from ventilated front seats.'},
 {id:'rearHeated',name:'Heated rear seats',slug:'heated-rear-seats',with:'heated rear seats',what:'Heated rear seats warm the second-row seats. They are listed separately from heated front seats.'},
 {id:'rambox',name:'RamBox storage',slug:'rambox',with:'RamBox storage',what:'RamBox is the lockable storage built into the sides of the truck bed.'},
 {id:'powerBoards',name:'Power running boards',slug:'power-running-boards',with:'power running boards',what:'Power running boards extend when a door opens and retract when it closes.'},
 {id:'brakeController',name:'Trailer brake controller',slug:'trailer-brake-controller',with:'a trailer brake controller',what:'An integrated trailer brake controller operates a trailer’s electric brakes from the driver’s seat.',caution:'A brake controller does not set what a truck can tow. Ask us to confirm the specific truck’s ratings for your trailer.'},
 {id:'bedliner',name:'Spray-in bedliner',slug:'spray-in-bedliner',with:'a spray-in bedliner',what:'A spray-in bedliner is a protective coating applied to the truck bed at the factory.'},
 {id:'tonneau',name:'Tonneau cover',slug:'tonneau-cover',with:'a tonneau cover',what:'A tonneau cover closes over the truck bed. The ones listed here are named on the original window sticker.'},
 {id:'dualRearWheels',name:'Dual rear wheels',slug:'dual-rear-wheels',with:'dual rear wheels',h1:m=>`${m.name} dually trucks in Austin`,what:'Dual rear wheels (a “dually”) put two wheels on each side of the rear axle.',caution:'Ask us to confirm the specific truck’s payload and towing ratings for what you plan to haul.'},
 {id:'hybrid',always:true,name:'Hybrid powertrain',slug:'hybrid',with:'a hybrid powertrain',what:'The engine line on each window sticker names the hybrid powertrain fitted to that vehicle.'}
];

(async()=>{
const {parseQuery,matchVehicle}=await import('./equipment-search.mjs');
const {completeTitle}=await import('./title-model.mjs');
const {guideTrim}=await import('./trim-link.mjs');
const {vehicleImage,vehicleImageSet}=await import('./vehicle-images.mjs');
const {featureInventoryLink}=await import('./feature-inventory-link.mjs');
const siteShell=require('./site-shell.cjs');
const root=path.resolve(process.argv[2]||__dirname),origin='https://carswithsam.com';
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const inventory=read('data/used-inventory.json'),records=read('data/equipment-index.json').records,trimData=read('trim-standard-data.json');
const all=inventory.vehicles;
// Same refusal as the vehicle pages: never publish from an incomplete or wrong-store capture.
if(!inventory.complete||!Array.isArray(all)||all.length!==inventory.advertisedTotal||!all.length||new Set(all.map(v=>v.vin)).size!==all.length||all.some(v=>v.locationId!=='18393'||!v.locationVerified||!/^[A-HJ-NPR-Z0-9]{17}$/.test(v.vin)))throw Error('Refusing incomplete or wrong-store inventory');
const vehicles=all.filter(v=>v.status!=='not-observed').map(v=>({...v,title:completeTitle(v.title,records[v.vin],v.vin)}));

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=u=>{try{return new URL(u).protocol==='https:'?u:''}catch{return ''}};
const json=o=>JSON.stringify(o).replace(/</g,'\\u003c');
const money=n=>Number.isFinite(n)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n):'Ask for price';
const day=s=>new Date(s).toLocaleDateString('en-US',{timeZone:'America/Chicago',dateStyle:'long'});
const isoDay=s=>new Date(s).toLocaleDateString('en-CA',{timeZone:'America/Chicago'});
const cap=s=>s?s[0].toUpperCase()+s.slice(1):s;
const plural=(n,one,many)=>n+' '+(n===1?one:many);
// Same display cleanup of ALL-CAPS dealer titles as build-vehicle-pages.cjs, so a vehicle reads the same on both.
const KEEP_UPPER=new Set(['SRT','TRX','RHO','AWD','RWD','FWD','GT','R/T','HEMI','WB','CA','II','III','L','S','X','SXT','SLT','HD','EV']);
const SPECIAL_CASE={PROMASTER:'ProMaster','4X4':'4x4','4X2':'4x2','4XE':'4xe','85TH':'85th'};
const word=w=>SPECIAL_CASE[w]??(KEEP_UPPER.has(w)?w:/^[A-Z]+$/.test(w)?w[0]+w.slice(1).toLowerCase():/^\d+-[A-Z]+$/.test(w)?w.replace(/[A-Z]+$/,x=>x[0]+x.slice(1).toLowerCase()):w);
function displayTitle(title){
 const t=String(title||''),m=t.match(/^(New|Used) (\d{4}) (.+)$/);
 if(!m||m[3]!==m[3].toUpperCase())return t;
 return m[1]+' '+m[2]+' '+m[3].split(' ').map(word).join(' ');
}
// The trim a shopper would call it: the factory trim guide's name when the sticker identifies one, otherwise the
// words the listing title puts between the model and the cab, drive or body description.
const CONFIG=/^(?:CREW|QUAD|MEGA|REGULAR|REG|CAB|CHASSIS|CARGO|VAN|4X4|4X2|4XE|4WD|2WD|AWD|FWD|RWD|4-DOOR|2-DOOR|UNLIMITED|\d+['’].*)$/;
function trimName(v,model){
 const guide=guideTrim(v,records[v.vin],trimData);
 if(guide)return guide.trim.name.split(' / ')[0];
 const tokens=String(v.title||'').toUpperCase().replace(/^(?:NEW|USED)\s+\d{4}\s+/,'').replace(model.strip,' ').trim().split(/\s+/).filter(Boolean);
 while(tokens.length&&CONFIG.test(tokens[0]))tokens.shift();
 const cut=tokens.findIndex(t=>CONFIG.test(t)),words=cut<0?tokens:tokens.slice(0,cut);
 return words.map(w=>w.split('/').map(word).join('/')).join(' ');
}
const cleanEvidence=line=>String(line||'').replace(/\s*\(VS [^)]*\)/gi,'').replace(/\s+\$[\d,]+(?:\.\d\d)?\s*$/,'').replace(/\s+/g,' ').trim();

// ── Which vehicles each page lists ───────────────────────────────────────────────────────────────────────────
const baseQuery=parseQuery('');
let previous={pages:[]};try{previous=read('data/feature-pages.json')}catch{}
const kept=new Map((previous.pages||[]).map(p=>[p.file,p]));
const built=[];
for(const model of MODELS){
 const stock=vehicles.filter(v=>{const t=v.title.toUpperCase();return model.test.test(t)&&!(model.not&&model.not.test(t));});
 if(!stock.length)continue;
 const accepted=[],readable=stock.filter(v=>records[v.vin]?.status==='verified').length;
 for(const feature of FEATURES){
  const query={...baseQuery,requirements:[{id:feature.id,wanted:true}]},matches=[];
  for(const v of stock){const r=matchVehicle(v,records[v.vin],query);if(r.kind!=='match')continue;const check=(r.checks||[]).find(c=>c.id===feature.id)||{},printed=new Set([...(records[v.vin]?.lines||[]),...(records[v.vin]?.identityLines||[])]),evidence=check.evidence||[];
   // Only wording printed on the sticker is shown as the sticker's; the search's own explanations are kept apart.
   matches.push({v,check,quoted:evidence.filter(l=>printed.has(l)).map(cleanEvidence).filter(Boolean),notes:evidence.filter(l=>!printed.has(l))});}
  const file=`${model.slug}-with-${feature.slug}-austin.html`;
  if(matches.length<(kept.has(file)?1:CREATE_AT))continue;
  if(!feature.always&&readable&&matches.length/readable>=NEARLY_ALL)continue;
  const vins=new Set(matches.map(m=>m.v.vin));
  const twin=accepted.find(a=>{const both=[...vins].filter(x=>a.vins.has(x)).length;return both/(vins.size+a.vins.size-both)>=SAME_LIST;});
  if(twin)continue;
  accepted.push({model,feature,file,url:'/'+file.slice(0,-5),matches,vins,stock});
 }
 built.push(...accepted);
}

// ── Page shell ───────────────────────────────────────────────────────────────────────────────────────────────
const nav=siteShell.header();
const identity=[{'@type':'Person','@id':origin+'/#sam',name:'Samuel Sweitzer',alternateName:'Sam Sweitzer',url:origin+'/sam',jobTitle:'Sales Consultant',sameAs:[siteShell.maps,'https://www.facebook.com/carswithsamatx']},{'@type':'Organization','@id':origin+'/#publisher',name:'Cars With Sam',url:origin+'/',founder:{'@id':origin+'/#sam'}}];
function shell(title,desc,url,body,graph,image){return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(title)} | Cars With Sam</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${origin+esc(url)}"><meta name="robots" content="index, follow"><meta property="og:site_name" content="Cars With Sam"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${origin+esc(url)}"><meta property="og:type" content="website"><meta property="og:image" content="${esc(image||origin+'/lineup-bee-share.jpg')}"><meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#080b0f"><link rel="stylesheet" href="/styles.css?v=20261005-fixes"><link rel="stylesheet" href="/authority.css?v=20261004"><link rel="stylesheet" href="/feature-pages.css?v=1"><script type="application/ld+json">${json({'@context':'https://schema.org','@graph':graph})}</script>${siteShell.headLinks}</head><body class="site-layout"><a class="skip-link" href="#main-content">Skip to content</a>${nav}${siteShell.mobileBar(url)}<main id="main-content" class="feature-page">${body}</main><footer class="footer"><div class="wrap"><p>Cars With Sam · Samuel Sweitzer and Ryan Sugrue, sales consultants at Covert Chrysler Dodge Jeep Ram Austin · 8107 Research Blvd, Austin, TX 78758.</p><p>Independent shopping site. Confirm pricing, availability and equipment before visiting. This is not the official dealership website.</p><a href="/inventory">Find Your Car</a> · <a href="/shop-by-feature">Shop by feature</a> · <a href="/vehicles">Browse all vehicle details</a> · <a href="/sam">About Sam</a> · <a href="/sources">Sources and verification</a> · <a href="/privacy">Privacy</a></div></footer></body></html>`}
const h1For=p=>p.feature.h1?p.feature.h1(p.model):`${p.model.plural} with ${p.feature.with} in Austin`;
const linkText=p=>`${p.model.name} with ${p.feature.with}`;
const checked=inventory.capturedAt;

function card({v,quoted},feature){
 const title=displayTitle(v.title),photo=safe(v.photoUrl);
 // An owner's-manual answer is explained once on the page; the card names the drivetrain the sticker identifies.
 const lines=quoted.slice(0,feature.manual?1:2).filter(l=>l.length<=140);
 return `<article><a href="/vehicle-${v.vin}">${photo?`<img src="${esc(vehicleImage(photo,440))}" srcset="${esc(vehicleImageSet(photo,[220,440]))}" sizes="(max-width:700px) 92vw, 340px" alt="${esc(title)}" loading="lazy" width="400" height="300">`:''}<h3>${esc(title)}</h3></a><p><strong>${money(v.price)}</strong> · ${v.stock?'Stock '+esc(v.stock):'VIN '+esc(v.vin)}</p><p class="fp-muted">${esc(v.condition)} · ${Number.isFinite(v.miles)?v.miles.toLocaleString('en-US')+' miles':'Ask for mileage'}</p>${lines.length?`<p class="fp-evidence"><span>Window sticker:</span> ${lines.map(esc).join(' · ')}</p>`:''}</article>`;
}

function render(p,others){
 const {model,feature,matches,stock,url}=p,h1=h1For(p),n=matches.length;
 const sorted=[...matches].sort((a,b)=>(a.v.condition==='New'?0:1)-(b.v.condition==='New'?0:1)||(a.v.price??Infinity)-(b.v.price??Infinity));
 const fresh=matches.filter(m=>m.v.condition==='New').length,used=n-fresh;
 const prices=matches.map(m=>m.v.price).filter(Number.isFinite),low=Math.min(...prices),high=Math.max(...prices);
 const unread=stock.filter(v=>records[v.vin]?.status!=='verified').length;
 const mix=[fresh?fresh+' new':'',used?used+' used':''].filter(Boolean).join(' and ');
 const range=!prices.length?'':low===high?`, listed at ${money(low)}`:`, listed from ${money(low)} to ${money(high)}`;
 const lead=`${cap(plural(n,model.name,model.plural))} at Covert CDJR Austin ${n===1?'has':'have'} ${feature.with} ${feature.manual?'supported by the factory owner’s manual':'on '+(n===1?'its':'their')+' original window sticker'}: ${mix}${range}. Each one was matched by VIN, not assumed from its trim name.`;
 const desc=`${cap(model.plural)} with ${feature.with} at Covert CDJR Austin, matched by VIN to the original window sticker. See prices and photos, then text Sam.`;
 // Trims: how many of each trim on the lot have it. This is the part a trim badge cannot tell a shopper.
 const trimOf=new Map(stock.map(v=>[v.vin,trimName(v,model)||'Trim not stated']));
 const rows=new Map();
 for(const v of stock){const t=trimOf.get(v.vin);if(!rows.has(t))rows.set(t,{t,total:0,have:0,from:Infinity});rows.get(t).total++;}
 for(const {v} of matches){const r=rows.get(trimOf.get(v.vin));r.have++;if(Number.isFinite(v.price))r.from=Math.min(r.from,v.price);}
 const withIt=[...rows.values()].filter(r=>r.have).sort((a,b)=>b.have-a.have||a.from-b.from);
 const partial=withIt.filter(r=>r.have<r.total).length;
 const trimTable=`<table class="fp-table"><caption>${esc(model.name)} trims listed with ${esc(feature.with)}</caption><thead><tr><th scope="col">Trim</th><th scope="col">With it</th><th scope="col">Listed in that trim</th><th scope="col">From</th></tr></thead><tbody>${withIt.map(r=>`<tr><th scope="row">${esc(r.t)}</th><td>${r.have}</td><td>${r.total}</td><td>${Number.isFinite(r.from)?money(r.from):'Ask'}</td></tr>`).join('')}</tbody></table>`;
 const trimNote=partial?`<p>In ${partial===1?'one of these trims':partial+' of these trims'}, not every ${esc(model.name)} listed is confirmed with it. That is why the list below is built from each window sticker and not from the trim name.</p>`:'';
 // The sticker's own wording, most common first.
 const wording=new Map();
 if(!feature.manual)for(const {quoted} of matches)for(const l of new Set(quoted.filter(l=>l.length<=120)))wording.set(l,(wording.get(l)||0)+1);
 const phrases=[...wording].sort((a,b)=>b[1]-a[1]).slice(0,5);
 const manualSeen=new Map();if(feature.manual)for(const {notes,check} of matches)for(const t of notes)if(!manualSeen.has(t))manualSeen.set(t,safe(check.sourceUrl));
 const manualNotes=[...manualSeen].slice(0,6);
 const live=featureInventoryLink(feature.id,{modelTerms:[model.q]});
 const sms=`sms:+17372091320?body=${encodeURIComponent(`Hi Sam, I’m looking for a ${model.name} with ${feature.with}. What do you have?`)}`;
 const sameModel=others.filter(o=>o.model===model&&o!==p),sameFeature=others.filter(o=>o.feature===feature&&o!==p);
 const body=`<div class="wrap"><p class="fp-crumbs"><a href="/">Home</a> / <a href="/shop-by-feature">Shop by feature</a></p><div class="eyebrow">Cars With Sam · Austin, Texas</div><h1>${esc(h1)}</h1><p class="authority-byline">Published by Cars With Sam, the shopping site created and owned by <a href="/sam">Samuel “Sam” Sweitzer</a>. Inventory checked <time datetime="${isoDay(checked)}">${esc(day(checked))}</time>.</p><p class="fp-lead">${esc(lead)}</p><div class="hero-actions"><a class="btn" href="${esc(sms)}">TEXT SAM ABOUT THESE</a><a class="btn ghost" href="${esc(live)}">SEARCH WITH MORE FILTERS</a></div>
<h2>${esc(feature.name)}: what to know</h2><p>${esc(feature.what)}${feature.more?` <a href="${feature.more[0]}">${esc(feature.more[1])}</a>.`:''}</p>${feature.caution?`<p class="fp-note">${esc(feature.caution)}</p>`:''}
<h2>Which ${esc(model.name)} trims have it right now</h2>${trimTable}${trimNote}
${phrases.length?`<h2>How it reads on the window sticker</h2><p>These are the sticker’s own words on the vehicles below.</p><ul class="fp-phrases">${phrases.map(([l,c])=>`<li>“${esc(l)}” <span class="fp-muted">on ${c} of ${n}</span></li>`).join('')}</ul>`:''}
<h2 id="vehicles">${esc(cap(plural(n,model.name,model.plural)))} with ${esc(feature.with)}</h2><p class="fp-muted">${n>MAX_CARDS?`Showing ${MAX_CARDS} of ${n}, new vehicles first and lowest listed price first. <a href="${esc(live)}">See all ${n} in Find Your Car</a>.`:'New vehicles first, lowest listed price first.'} Listed prices and incentives can have conditions. Confirm your price, taxes, fees and availability before visiting.</p><div class="fp-grid">${sorted.slice(0,MAX_CARDS).map(m=>card(m,feature)).join('')}</div>
${unread?`<p class="fp-note">${cap(plural(unread,'more '+model.name+' is','more '+model.plural+' are'))} listed without a readable window sticker on file, so ${unread===1?'it is':'they are'} not shown here. That does not mean ${unread===1?'it lacks':'they lack'} ${esc(feature.with)}. <a href="/contact?advisor=Sam">Ask us to check.</a></p>`:''}
<h2>Don’t see the one you want?</h2><p>Listings change every day, and vehicles on order may not be listed yet. Text Sam at <a href="${esc(sms)}">737-209-1320</a> with the features you need and your budget, or <a href="/contact?advisor=Sam">ask Sam</a> or <a href="/contact?advisor=Ryan">ask Ryan</a> to look for one.</p>
${manualNotes.length?`<h2>What the owner’s manual says</h2><ul class="fp-phrases">${manualNotes.map(([text,src])=>`<li>${esc(text)}${src?` <a href="${esc(src)}" target="_blank" rel="noopener noreferrer">Owner’s manual ↗</a>`:''}</li>`).join('')}</ul>`:''}
<h2>How these were matched</h2><p>${feature.manual?'Each vehicle’s drivetrain is read from its original window sticker and checked against the factory owner’s manual for that model year.':'Each vehicle is matched by VIN to its original window sticker, and the feature must appear in the sticker’s own wording.'} A window sticker describes the vehicle as it left the factory; on a used vehicle, check its current condition and any later changes. <a href="/sources">How we verify listings and factory equipment</a>.</p>
${sameModel.length?`<h2>More ${esc(model.name)} features</h2><p class="fp-links">${sameModel.map(o=>`<a href="${o.url}">${esc(o.feature.name)}</a>`).join('')}</p>`:''}
${sameFeature.length?`<h2>Other models with ${esc(feature.with)}</h2><p class="fp-links">${sameFeature.map(o=>`<a href="${o.url}">${esc(o.model.name)}</a>`).join('')}</p>`:''}
<p class="fp-links">${model.landing?`<a href="${model.landing}">${esc(model.name)} shopping guide</a>`:''}${model.questions?`<a href="${model.questions}">${esc(model.name)} questions</a>`:''}<a href="/compare">Compare two vehicles by stock number</a><a href="/shop-by-feature">All features</a></p></div>`;
 const pageUrl=origin+url;
 const graph=[...identity,
  {'@type':'CollectionPage','@id':pageUrl+'#page',url:pageUrl,name:h1,description:desc,inLanguage:'en-US',isPartOf:{'@id':origin+'/#website'},author:{'@id':origin+'/#sam'},publisher:{'@id':origin+'/#publisher'},mainEntity:{'@id':pageUrl+'#list'}},
  {'@type':'ItemList','@id':pageUrl+'#list',name:h1,numberOfItems:n,itemListElement:sorted.slice(0,MAX_CARDS).map((m,i)=>({'@type':'ListItem',position:i+1,url:origin+'/vehicle-'+m.v.vin,name:displayTitle(m.v.title)}))},
  {'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:origin+'/'},{'@type':'ListItem',position:2,name:'Shop by feature',item:origin+'/shop-by-feature'},{'@type':'ListItem',position:3,name:h1,item:pageUrl}]}];
 return {html:shell(h1,desc,url,body,graph,safe(sorted[0]?.v.photoUrl)&&vehicleImage(sorted[0].v.photoUrl,960)),h1};
}

// ── Write pages, keeping each page's "last changed" date only when its content actually changed ────────────────
const today=isoDay(checked),manifest=[];
for(const p of built){
 const {html,h1}=render(p,built);
 // The checked date changes with every capture; leave it out of the fingerprint.
 const hash=crypto.createHash('sha256').update(html.replace(/Inventory checked <time[^>]*>[^<]*<\/time>/,'')).digest('hex').slice(0,16);
 const before=kept.get(p.file),modified=before&&before.hash===hash?before.modified:today;
 fs.writeFileSync(path.join(root,p.file),html);
 manifest.push({file:p.file,url:p.url,model:p.model.slug,feature:p.feature.id,title:h1,label:linkText(p),count:p.matches.length,hash,modified,vins:[...p.vins]});
}
// Pages from the last run that no longer have a vehicle to show. Only files this script wrote are ever removed.
const current=new Set(manifest.map(m=>m.file));
for(const file of kept.keys())if(!current.has(file)&&/^[a-z0-9-]+-with-[a-z0-9-]+-austin\.html$/.test(file)){try{fs.unlinkSync(path.join(root,file))}catch{}}

// ── Directory page ───────────────────────────────────────────────────────────────────────────────────────────
{const url='/shop-by-feature',title='Shop by feature in Austin',desc='Find a Ram, Jeep, Dodge or Chrysler at Covert CDJR Austin by the feature you want, matched by VIN to each original window sticker.';
 const groups=MODELS.map(model=>({model,pages:built.filter(p=>p.model===model)})).filter(g=>g.pages.length);
 const body=`<div class="wrap"><div class="eyebrow">Cars With Sam · Austin, Texas</div><h1>${esc(title)}</h1><p class="authority-byline">Published by Cars With Sam, the shopping site created and owned by <a href="/sam">Samuel “Sam” Sweitzer</a>. Inventory checked <time datetime="${isoDay(checked)}">${esc(day(checked))}</time>.</p><p class="fp-lead">A trim badge does not tell you every option a vehicle has. Pick a model and the feature you want to see the vehicles at Covert CDJR Austin, 8107 Research Blvd, that show it on their original window sticker.</p><p>Want something that is not listed here? <a href="/inventory">Describe it in Find Your Car</a>, or text Sam at <a href="sms:+17372091320">737-209-1320</a>.</p>${groups.map(g=>`<h2 id="${g.model.slug}">${esc(g.model.name)}</h2><ul class="fp-directory">${g.pages.map(p=>`<li><a href="${p.url}">${esc(p.feature.name)}</a> <span class="fp-muted">${p.matches.length}</span></li>`).join('')}</ul>`).join('')}<h2>How these lists are built</h2><p>Every vehicle is matched by VIN to its original window sticker. A feature is listed only when the sticker’s own wording shows it, and a vehicle without a readable sticker is left out, not guessed. <a href="/sources">How we verify listings and factory equipment</a>.</p></div>`;
 const pageUrl=origin+url,graph=[...identity,{'@type':'CollectionPage','@id':pageUrl+'#page',url:pageUrl,name:title,description:desc,inLanguage:'en-US',isPartOf:{'@id':origin+'/#website'},author:{'@id':origin+'/#sam'},publisher:{'@id':origin+'/#publisher'}},{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:origin+'/'},{'@type':'ListItem',position:2,name:'Shop by feature',item:pageUrl}]}];
 fs.writeFileSync(path.join(root,'shop-by-feature.html'),shell(title,desc,url,body,graph));}

const newest=manifest.map(m=>m.modified).sort().pop()||today;
fs.writeFileSync(path.join(root,'sitemap-features.xml'),'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+[{url:'/shop-by-feature',modified:newest},...manifest].map(m=>`<url><loc>${origin+m.url}</loc><lastmod>${m.modified}</lastmod></url>`).join('')+'</urlset>');
const out=JSON.stringify({generatedAt:checked,pages:manifest});
let old='';try{old=fs.readFileSync(path.join(root,'data/feature-pages.json'),'utf8')}catch{}
if(old!==out)fs.writeFileSync(path.join(root,'data/feature-pages.json'),out);
console.log(`Generated ${manifest.length} feature pages across ${new Set(manifest.map(m=>m.model)).size} models, plus the directory and feature sitemap.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
