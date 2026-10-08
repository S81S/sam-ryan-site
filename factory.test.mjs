// Checks for the factory charts (data/factory) and how Perfect Match reads them.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readMark,factoryFacts,lineups,withChart,FLEET} from './factory-facts.mjs';
import {stepUp,satisfies} from './trim-ladder.mjs';
import {colorKey,colorName} from './color-names.mjs';

const read=f=>JSON.parse(readFileSync(new URL(f,import.meta.url),'utf8'));
const guide=read('./trim-standard-data.json'),index=read('./data/factory/index.json');
const chart=id=>read('./data/factory/'+index.models[id].file);
const fact=(id,trim,re)=>factoryFacts(chart(id),trim).find(f=>re.test(f.label));

test('marks read the way the charts define them',()=>{
 assert.deepEqual(readMark('S'),{status:'standard',note:''});
 assert.equal(readMark('O').status,'optional');
 assert.deepEqual(readMark('P'),{status:'optional',note:'Part of a package'});
 assert.equal(readMark('NA').status,'unavailable');
 assert.equal(readMark(''),null);
 assert.equal(readMark('S/P').status,'optional','standard on some versions only is not standard');
 assert.deepEqual(readMark('F'),{status:'unavailable',note:'Fleet orders only'});
 assert.equal(readMark('F',{fleet:true}).status,'optional','fleet-only options are options in Fleet Match');
 assert.equal(readMark('F/O/P').status,'optional');
 assert.equal(readMark('S~NA',{versions:'two-door or four-door'}).status,'optional');
 assert.match(readMark('S~NA',{versions:'two-door or four-door'}).note,/two-door or four-door/);
});

test('every charted lineup maps to real trim-guide trims',()=>{
 for(const [id,m] of Object.entries(index.models)){
  const model=guide.models.find(x=>x.id===m.model);
  assert.ok(model,id+' has a trim-guide model');
  for(const t of m.trims)assert.ok(model.trims.some(x=>x.id===t),`${id}/${t} is a guide trim`);
  const c=chart(id);assert.ok(c.rows.length>=30,id+' has a chart');
  for(const r of c.rows)assert.equal(r[4].length,c.trims.length,id+' row has one mark per trim');
 }
});

test('fleet lineups are only in Fleet Match',()=>{
 const retail=lineups(guide,index).map(l=>l.stockId),fleet=lineups(guide,index,{fleet:true}).map(l=>l.stockId);
 for(const id of retail)assert.ok(!FLEET.includes(id),id+' is not a fleet lineup');
 for(const id of fleet)assert.ok(FLEET.includes(id),id+' is a fleet lineup');
 assert.ok(retail.includes('ram-2500')&&retail.includes('ram-3500'),'2500 and 3500 pickups are retail');
 assert.ok(fleet.includes('ram-chassis-cab'));
});

test('chart facts match the factory charts',()=>{
 // 2026 Wrangler 4-door chart: blind-spot is not offered on the Sport, part of a package on the Sport S.
 assert.equal(fact('wrangler','sport',/^Blind-spot Monitoring$/).status,'unavailable');
 assert.equal(fact('wrangler','sport-s',/^Blind-spot Monitoring$/).status,'optional');
 assert.equal(fact('wrangler','sport',/^Air Conditioning: Manual/).status,'standard');
 // 2026 Gladiator chart: Dana 44 front and rear standard on Sport, Sport S and Willys.
 assert.equal(fact('jeep-gladiator','sport',/Dana 44 heavy-duty solid front$/).status,'standard');
 assert.equal(fact('jeep-gladiator','mojave',/Dana 44 heavy-duty solid front$/).status,'unavailable');
 // 2026 Ram 1500 fleet guide: Pentastar on Tradesman, Hurricane SO on Laramie, Hurricane HO on Limited.
 assert.equal(fact('ram-1500','tradesman',/Pentastar/).status,'standard');
 assert.equal(fact('ram-1500','laramie',/Standard-Output/).status,'standard');
 assert.equal(fact('ram-1500','limited',/High-Output/).status,'standard');
 assert.equal(fact('ram-1500','tradesman',/High-Output/).status,'unavailable');
});

test('the step up lists everything the next trim adds, and options stay',()=>{
 const l=lineups(guide,index).find(x=>x.id==='wrangler'),m=withChart(l,chart('wrangler'));
 const [sport,sportS]=m.model.trims;
 const up=stepUp(sport,sportS,{below:[]});
 const adds=up.adds.map(a=>a.label);
 assert.ok(adds.includes('Mirrors: Power-heated'));
 assert.ok(!adds.some(a=>/Manual, single zone/.test(a)),'nothing the Sport already has');
 // Deep-tint glass is an option on the Sport and standard on the Sport S: it is listed as new, not dropped.
 assert.ok(adds.includes('Glass: Deep-tinted sunscreen rear and quarter windows'));
 const bsm=up.options.find(o=>o.label==='Blind-spot Monitoring');
 assert.ok(bsm,'an option the Sport cannot have is offered on the Sport S');
 assert.equal(satisfies(sport,bsm),false);
 assert.equal(satisfies(sportS,bsm),'option');
});

test('paint names match between stickers and guides',()=>{
 assert.equal(colorKey('Exterior Color: Diamond Black Crystal Pearl-Coat Exterior Paint'),colorKey('Diamond Black Crystal Pearl'));
 assert.equal(colorKey('Silver-Zynith Exterior Paint'),colorKey('Silver Zynith'));
 assert.equal(colorKey('Bright White Clear-Coat Paint'),colorKey('Bright White'));
 assert.notEqual(colorKey('Bright White'),colorKey('Ivory White Tri-Coat Pearl'));
 assert.equal(colorName('Exterior Color: Bright White Clear-Coat Exterior Paint'),'Bright White');
 assert.equal(colorName('Exterior Color: SUMMIT WHITE'),'Summit White');
});

test('a shared chart keeps each model to its own rows',()=>{
 // The Grand Cherokee guide holds the two-row and L charts: the two-row lineup has no third-row climate.
 assert.ok(!chart('jeep-grand-cherokee').rows.some(r=>/Tri-Zone/i.test(r[3])),'no Grand Cherokee L rows in the two-row chart');
 assert.ok(chart('jeep-grand-cherokee#l').rows.length>=100);
 // The 2500/3500 chart: Power Wagon and 2500-only rows stay off the 3500; dual-rear-wheel rows stay off the 2500.
 assert.ok(!chart('ram-3500').rows.some(r=>/Power Wagon|\(2500 only\)/.test(r[2]+' '+r[3])));
 assert.ok(!chart('ram-2500').rows.some(r=>/^Dual Rear Wheel/.test(r[2])));
 // "Rear antispin (2500: optional; …; 3500: standard)": standard on every 3500.
 assert.equal(fact('ram-3500','tradesman',/Rear antispin/).status,'standard');
 assert.equal(fact('ram-2500','tradesman',/Rear antispin/).status,'optional');
});

test('two engines marked standard read as a choice, and a repeated line shows once',()=>{
 // 2026 Wrangler chart marks both the V-6 and the 2.0L "S" on the four-door Sahara.
 const sahara=factoryFacts(chart('wrangler'),'sahara');
 const engines=sahara.filter(f=>/Pentastar|2\.0-liter/.test(f.label));
 assert.equal(engines.length,2);
 for(const e of engines){assert.equal(e.status,'optional');assert.match(e.note,/One of the 2 engines/);}
 assert.equal(fact('wrangler','sport',/Pentastar/).status,'standard','a single standard engine stays standard');
 const rubiconWheels=factoryFacts(chart('wrangler'),'rubicon').filter(f=>/Rubicon machined with black pockets/.test(f.label));
 assert.equal(rubiconWheels.length,1);assert.equal(rubiconWheels[0].status,'standard');
});

test('chart rows map only to the sticker feature they are about',async()=>{
 const {factoryRowIds}=await import('./factory-stickers.mjs');
 assert.deepEqual(factoryRowIds({parent:'Mirrors',text:'Blind-spot detection indicator'}),['blindSpot']);
 assert.deepEqual(factoryRowIds({parent:'Windows',text:'Power (front and rear), driver and passenger one-touch down'}),[]);
 assert.deepEqual(factoryRowIds({parent:'Tops',text:'Sky one-touch powertop'}),['skyRoof']);
 assert.deepEqual(factoryRowIds({parent:'Bedliner',text:'Spray-In Delete (XM9)'}),[]);
 assert.deepEqual(factoryRowIds({parent:'Floor Mats',text:'Third-row, bench seat mat'}),[]);
 assert.deepEqual(factoryRowIds({parent:'Steering Wheel',text:'Leather-wrapped and heated with audio, speed, adaptive cruise control'}),[]);
 assert.deepEqual(factoryRowIds({parent:'',text:'Convenience Group — includes remote start and heated seats'}),[]);
});

test('a trim the chart says is never built with a pick is not a match, whatever a sticker reading says',async()=>{
 const {vehicleFit}=await import('./trim-ladder.mjs');
 const l=lineups(guide,index).find(x=>x.id==='wrangler'),m=withChart(l,chart('wrangler'));
 const sport=m.model.trims[0],bsm=factoryFacts(chart('wrangler'),'sport-s').find(f=>f.label==='Blind-spot Monitoring');
 const entry={ids:['blindSpot'],rows:{[bsm.key]:[0]}};
 const [fit]=vehicleFit({sticker:true,y:[0],n:[]},sport,[{...bsm,need:'option'}],entry);
 assert.equal(fit.on,'no');
});
