import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {describeBuyerFeatureVisual as describe,renderBuyerFeatureVisual as render} from './buyer-feature-visuals.mjs';
import {buyerModels,buyerLineup} from './buyer-catalog.mjs';
import {buildBuyerOptionGroups} from './buyer-option-groups.mjs';
const choice=label=>({fullLabel:label});

test('Engine and gearbox diagrams retain source cylinder layout, turbo and each transmission type',()=>{
 const v6=describe(choice('3.6L Pentastar V6 with eTorque/8-speed Automatic'),{category:'options-engine'});
 assert.equal(v6.kind,'engine');assert.equal(v6.engines[0].cylinders,6);assert.equal(v6.engines[0].layout,'V');assert.equal(v6.engines[0].hybrid,false);assert.ok(v6.chips.includes('8-speed automatic'));
 const inline=describe(choice('2.0-liter inline four-cylinder turbo / Eight-speed automatic'),{category:'options-engine'});
 assert.equal(inline.engines[0].cylinders,4);assert.equal(inline.engines[0].layout,'I');assert.equal(inline.engines[0].turbo,true);
 const gearbox=describe(choice('6-speed manual or 8-speed automatic'),{category:'options-transmission'});
 assert.deepEqual(gearbox.chips,['6-speed manual','8-speed automatic']);
 assert.notEqual(render(choice('3.6L V6'),{category:'options-engine'}),render(choice('2.0L turbo I4'),{category:'options-engine'}));
 assert.equal(describe(choice('Battery-electric powertrain'),{category:'options-engine'}).engines[0].electric,true);
});

test('Roof, seats and audio depict sourced differences without assuming equipment',()=>{
 for(const [label,roof] of [['Premium soft top','soft'],['Black three-piece hardtop','hard'],['Dual Top Group','dual'],['Sky One-Touch Power Top','sliding'],['Dual-pane panoramic sunroof','panoramic']])assert.equal(describe(choice(label),{category:'options-roof'}).roof,roof);
 assert.equal(describe(choice('Black hardtop'),{category:'options-roof'}).roofPanels,null);
 assert.equal(describe(choice('Black three-piece hardtop'),{category:'options-roof'}).roofPanels,3);
 const cloth=describe(choice('Cloth 40/20/40 bench seat'),{category:'options-upholstery'});assert.equal(cloth.bench,true);assert.equal(cloth.material,'cloth');assert.equal(cloth.heated,false);
 const seat=describe(choice('Ventilated leather seats with 8-way power driver adjustment'),{category:'options-driver-seat'});assert.equal(seat.ventilated,true);assert.equal(seat.heated,false);assert.deepEqual(seat.ways,[8]);
 assert.equal(describe(choice('Seats without heating; not ventilated'),{category:'options-upholstery'}).ventilated,false);
 assert.equal(describe(choice('Audio System: Eight speakers'),{category:'options-audio'}).speakers,8);
 assert.equal(describe(choice('Speakers: Six premium'),{category:'options-audio'}).speakers,6);
 assert.equal(describe(choice('19-speaker Harman Kardon premium sound'),{category:'options-audio'}).speakers,19);
 assert.equal(describe(choice('23-speaker Klipsch Reference Premiere'),{category:'options-audio'}).audioBrand,'Klipsch');
 assert.match(render(choice('19-speaker Harman Kardon premium sound'),{category:'options-audio'}),/HARMAN KARDON/);
 assert.equal(describe(choice('Tungsten premium audio'),{category:'options-audio'}).audioBrand,'','trim name cannot prove an audio brand');
 assert.equal(describe(choice('Premium audio'),{category:'options-audio'}).speakers,null);
});

test('Screen size is sourced exactly and no vehicle screen interface is fabricated',()=>{
 const display=describe(choice('Radio with Uconnect 5 with 12.3-in. display'),{category:'options-screen'});
 assert.deepEqual(display.sizes,['12.3']);assert.ok(display.chips.includes('12.3 inches'));
 const svg=render(choice('Radio with Uconnect 5 with 12.3-in. display'),{category:'options-screen'});
 assert.match(svg,/12\.3″/);assert.match(svg,/Screen schematic/);assert.doesNotMatch(svg,/CarPlay|navigation map|Bluetooth|AM 102/);
 const unknown=describe({fullLabel:'Center display',facts:{base:{value:'8.4 inches'},upper:{value:'12 inches'}}},{category:'options-screen'});
 assert.deepEqual(unknown.sizes,[],'differing trim facts cannot silently become one displayed specification');
 const selected=describe({fullLabel:'Center display',facts:{base:{value:'8.4 inches'},upper:{value:'12 inches'}}},{category:'options-screen',fact:{value:'12 inches'}});
 assert.deepEqual(selected.sizes,['12']);
});

test('Wheel dimensions, approximate paint colors and sourced package icons stay honest',()=>{
 assert.deepEqual(describe(choice('Wheels: 20x9-inch Black-painted aluminum'),{category:'options-wheels'}).chips,['20 × 9 inches']);
 const color=describe(choice('Hydro Blue Pearl-Coat'),{category:'options-paint'});assert.equal(color.colorName,'blue');assert.match(color.note,/Illustrative color/);
 assert.equal(describe(choice('Body-color roof'),{category:'options-roof-finish'}).colorName,'');
 const pack=describe({fullLabel:'Technology Group',package:true,includes:'12-inch touchscreen; Heated front seats; 19 speakers; wireless charging if equipped with bucket seats'});
 assert.deepEqual(pack.components,['screen','seat','audio']);
 assert.deepEqual(describe({fullLabel:'Technology Group',package:true}).components,[]);
 assert.match(render({fullLabel:'Technology Group',package:true}),/Package contents: see the source list/);
});

test('SVG output is deterministic, accessible, escaped and self-contained',()=>{
 const c=choice('Seat <script>alert("x")</script> & leather');const svg=render(c,{category:'options-upholstery'});
 assert.equal(svg,render(c,{category:'options-upholstery'}));assert.match(svg,/role="img"/);assert.match(svg,/aria-labelledby=/);assert.match(svg,/feature illustration/i);
 assert.match(svg,/&lt;script&gt;/);assert.doesNotMatch(svg,/<script|<image|<foreignObject|onload=|href=|NaN|undefined/);
 assert.match(svg,/pointer-events:none/);
});

test('Every current non-photo primary choice receives a meaningful feature illustration',()=>{
 const read=file=>JSON.parse(fs.readFileSync(new URL(file,import.meta.url)));
 const models=buyerModels(read('./trim-standard-data.json'),read('./data/factory/index.json'));let count=0;
 for(const model of models){const lineup=buyerLineup(model,model.meta?read('./data/factory/'+model.meta.file):null);
  for(const q of buildBuyerOptionGroups(lineup,null).filter(q=>q.importance==='primary'))for(const c of q.choices.filter(c=>!c.image)){
   const d=describe(c,{category:q.id});assert.notEqual(d.kind,'equipment',model.id+': '+q.id+' / '+c.fullLabel);
   const svg=render(c,{category:q.id});assert.match(svg,/data-visual-kind=/);assert.doesNotMatch(svg,/NaN|undefined/);count++;
  }
 }
 assert.ok(count>1000);
});
