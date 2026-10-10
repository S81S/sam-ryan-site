import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseQuery,matchVehicle} from './equipment-search.mjs';
import {factoryFacts} from './factory-facts.mjs';
import {factoryRowIds} from './factory-stickers.mjs';
import {inventoryFit,vehicleFit} from './trim-ladder.mjs';

const read=file=>JSON.parse(readFileSync(new URL(file,import.meta.url),'utf8'));
const vehicles=read('./data/used-inventory.json').vehicles,records=read('./data/equipment-index.json').records;
const vins=query=>vehicles.filter(v=>matchVehicle(v,records[v.vin],parseQuery(query)).kind==='match').map(v=>v.vin).sort();
const vehicle={vin:'1C4RDHDG8TC232320',title:'New 2026 Dodge Durango GT RWD',year:2026,condition:'New',locationId:'18393',price:45000,miles:0};
const sticker=(lines,extra={})=>({vin:vehicle.vin,status:'verified',lines,features:{},...extra});

test('GT exhaust punctuation and case express one equipment requirement; bare GT stays a trim term',()=>{
 for(const phrase of ['GT exhaust','G-T exhaust','G/T exhaust','g/t exhaust','G–T exhaust','G / T exhaust']){
  const q=parseQuery(phrase);
  assert.deepEqual(q.requirements,[{id:'gtExhaust',wanted:true}],phrase);
  assert.deepEqual(q.terms,[],phrase);
  assert.deepEqual(vins(phrase),vins('GT exhaust'),phrase);
 }
 assert.ok(vins('GT exhaust').length>0);
 assert.deepEqual(parseQuery('GT').requirements,[]);
 assert.deepEqual(parseQuery('Durango GT').terms,['durango','gt']);
 assert.deepEqual(parseQuery('Durango GT with performance exhaust').terms,['durango','gt']);
 assert.deepEqual(parseQuery('Durango GT with performance exhaust').requirements,[{id:'performanceExhaust',wanted:true}]);
 assert.ok(vins('Durango GT').includes(vehicle.vin));
 for(const vin of ['1C4RDHDG8TC232320','1C4RDHDGXTC232318'])assert.ok(!vins('GT exhaust').includes(vin));
});

test('exhaust descriptions must occur together on VIN evidence, not scattered across equipment',()=>{
 const unrelated=sticker(['Sport Appearance Package','Performance Suspension','Upgraded Wheels','Dual Exhaust Tips','Diesel Exhaust Brake']);
 for(const phrase of ['GT exhaust','performance exhaust','sport exhaust','upgraded exhaust']){
  assert.notEqual(matchVehicle(vehicle,unrelated,parseQuery(phrase)).kind,'match',phrase);
  assert.equal(matchVehicle(vehicle,sticker([]),parseQuery(phrase)).kind,'unknown');
 }
 for(const [phrase,line] of [['GT exhaust','G/T Exhaust'],['performance exhaust','High Performance Exhaust'],['sport exhaust','Sport Exhaust'],['upgraded exhaust','Upgraded Exhaust']]){
  assert.equal(matchVehicle(vehicle,sticker([line]),parseQuery(phrase)).kind,'match');
  assert.equal(matchVehicle(vehicle,sticker([line,'Delete '+line]),parseQuery(phrase)).kind,'excluded');
  assert.equal(matchVehicle(vehicle,sticker(['Available separately: '+line]),parseQuery(phrase)).kind,'unknown');
  assert.equal(matchVehicle(vehicle,sticker([line+' Tips']),parseQuery(phrase)).kind,'unknown');
  assert.equal(matchVehicle(vehicle,sticker([line],{vin:'1C4RDHDGXTC232318'}),parseQuery(phrase)).kind,'unknown');
 }
 assert.equal(matchVehicle(vehicle,sticker(['G/T Package $3,095']),parseQuery('GT exhaust')).kind,'unknown');
 assert.equal(matchVehicle(vehicle,sticker(['G/T Exhaust']),parseQuery('sport exhaust')).kind,'unknown');
 assert.match(parseQuery('upgraded exhaust').warnings.join(' '),/aftermarket/);
 assert.ok(!vins('upgraded exhaust').includes('3C63RRJL1JG281245'));
 assert.equal(matchVehicle(vehicle,sticker(['G/T Exhaust']),parseQuery('without G/T exhaust')).kind,'excluded');
});

const meta=read('./data/factory/index.json').models['jeep-grand-cherokee#l'];
const chart=read('./data/factory/'+meta.file);
const camera=factoryFacts(chart,'limited').find(f=>/famcam/i.test(f.label));
const stock=read('./data/trim-stock.json').models['jeep-grand-cherokee'];
const trims=chart.trims.map(id=>({id,comparison:factoryFacts(chart,id)}));
const pick={...camera,need:'option',name:camera.label};

test('FamCAM chart row maps to the same passenger camera evidence as Inventory',()=>{
 assert.deepEqual(factoryRowIds(camera),['familyCamera']);
 assert.deepEqual(stock.rows[camera.key].map(n=>stock.ids[n]),['familyCamera']);
 const entry={...stock,vehicles:stock.vehicles.filter(v=>/GRAND CHEROKEE L\b/i.test(v.title))};
 const matches=inventoryFit(entry,trims,[pick]).exact;
 for(const vin of ['1C4RJKBR5T8556273','1C4RJKBR3T8556272','1C4RJKBR4T8565613','1C4RJKBR0T8602219']){
  assert.ok(vins('FamCam').includes(vin));
  const hit=matches.find(r=>r.v.vin===vin);assert.ok(hit,vin+' must survive the Perfect Match camera handoff');
  assert.equal(hit.fit[0].by,'sticker');
  assert.equal(hit.v.trim,vin==='1C4RJKBR0T8602219'?'limited-reserve':'limited');
 }
});

test('mapped camera evidence wins over literal option-name mismatch and missing evidence stays unknown',()=>{
 const entry={ids:['familyCamera'],rows:{[camera.key]:[0]},opts:[camera.key],optSeen:[0]};
 const trim=trims.find(t=>t.id==='limited');
 assert.equal(vehicleFit({sticker:true,y:[0],n:[],o:[]},trim,[pick],entry)[0].on,'yes');
 assert.equal(vehicleFit({sticker:true,y:[],n:[0],o:[0]},trim,[pick],entry)[0].on,'no');
 assert.equal(vehicleFit({sticker:true,y:[],n:[],o:[]},trim,[pick],entry)[0].on,'check');
 assert.equal(vehicleFit({sticker:false,y:[],n:[],o:[]},trim,[pick],entry)[0].on,'check');
});

test('missing mapped evidence preserves factory-standard equipment and explicit VIN deletions',()=>{
 const info=read('./data/factory/index.json').models.wrangler;
 const comparison=factoryFacts(read('./data/factory/'+info.file),'rubicon',{fleet:info.fleet});
 const fact=comparison.find(f=>f.key==='f:interior||passive-entry');
 const entry=read('./data/trim-stock.json').models.wrangler;
 const v=entry.vehicles.find(v=>v.vin==='1C4PJXFN2TW289696');
 const pick={...fact,need:'standard'},trim={id:'rubicon',comparison};
 assert.equal(fact.status,'standard');
 assert.ok(entry.rows[fact.key].every(n=>!v.y.includes(n)&&!v.n.includes(n)));
 const fit=vehicleFit(v,trim,[pick],entry)[0];
 assert.equal(fit.on,'yes');assert.equal(fit.by,'trim');
 assert.equal(vehicleFit({...v,n:[...v.n,...entry.rows[fact.key]]},trim,[pick],entry)[0].on,'no');
});

test('named installed bed steps survive a missing general running-board feature',()=>{
 const info=read('./data/factory/index.json').models['ram-1500'];
 const chart=read('./data/factory/'+info.file),entry=read('./data/trim-stock.json').models['ram-1500'];
 for(const vin of ['1C6SRFLT7TN429917','1C6SRFHP3TN294222']){
  const v=entry.vehicles.find(v=>v.vin===vin);
  const comparison=factoryFacts(chart,v.trim,{fleet:info.fleet});
  const fact=comparison.find(f=>/bed step, deployable/i.test(f.text));
  assert.ok(v.o.includes(entry.opts.indexOf(fact.key)));
  assert.ok(entry.rows[fact.key].every(n=>!v.y.includes(n)&&!v.n.includes(n)));
  const fit=vehicleFit(v,{id:v.trim,comparison},[{...fact,need:'option'}],entry)[0];
  assert.equal(fit.on,'yes');assert.equal(fit.by,'sticker');
 }
});

test('the actual installed engine overrides a different factory base engine',()=>{
 const info=read('./data/factory/index.json').models.wrangler;
 const comparison=factoryFacts(read('./data/factory/'+info.file),'sport',{fleet:info.fleet});
 const fact=comparison.find(f=>f.key==='f:engines-transmissions||pentastar-3-6-liter-v-6-six-speed-manual');
 const entry=read('./data/trim-stock.json').models.wrangler;
 const v=entry.vehicles.find(v=>v.vin==='1C4PJXDN2TW232272');
 const oi=entry.opts.indexOf(fact.key);
 assert.equal(fact.status,'standard');
 assert.ok(entry.eng.includes(oi));assert.ok(!v.o.includes(oi));
 const fit=vehicleFit(v,{id:'sport',comparison},[{...fact,need:'standard'}],entry)[0];
 assert.equal(fit.on,'no');assert.equal(fit.by,'sticker');
});

test('exact installed engine output overrides a generic turbo feature',()=>{
 const info=read('./data/factory/index.json').models['dodge-charger'];
 const chart=read('./data/factory/'+info.file),entry=read('./data/trim-stock.json').models['dodge-charger'];
 for(const stock of ['D06079','D06071']){
  const v=entry.vehicles.find(v=>v.stock===stock),comparison=factoryFacts(chart,v.trim,{fleet:info.fleet});
  const wrong=entry.eng.find(i=>!v.o.includes(i)&&entry.rows[entry.opts[i]]?.some(n=>v.y.includes(n)));
  assert.notEqual(wrong,undefined,'the broad turbo fact matches both output versions');
  // Permit the alternate engine in this controlled chart fixture so the VIN's
  // exact engine evidence, rather than an unavailable chart cell, must decide.
  const fact={...comparison.find(f=>f.key===entry.opts[wrong]),status:'optional'};
  const available=comparison.map(f=>f.key===fact.key?fact:f);
  const fit=vehicleFit(v,{id:v.trim,comparison:available},[{...fact,need:'option'}],entry)[0];
  assert.equal(fit.on,'no',stock);assert.equal(fit.by,'sticker',stock);
  const installed=entry.eng.find(i=>v.o.includes(i)),actual=comparison.find(f=>f.key===entry.opts[installed]);
  const positive=vehicleFit(v,{id:v.trim,comparison},[{...actual,need:actual.status==='standard'?'standard':'option'}],entry)[0];
  assert.equal(positive.on,'yes',stock);assert.equal(positive.by,'sticker',stock);
 }
});

test('missing engine-name evidence does not establish an engine conflict',()=>{
 const info=read('./data/factory/index.json').models.wrangler;
 const comparison=factoryFacts(read('./data/factory/'+info.file),'sport',{fleet:info.fleet});
 const fact=comparison.find(f=>f.key==='f:engines-transmissions||pentastar-3-6-liter-v-6-six-speed-manual');
 const entry=read('./data/trim-stock.json').models.wrangler;
 const original=entry.vehicles.find(v=>v.vin==='1C4PJXDN2TW232272');
 const v={...original,o:original.o.filter(i=>!entry.eng.includes(i))};
 const fit=vehicleFit(v,{id:'sport',comparison},[{...fact,need:'standard'}],entry)[0];
 assert.equal(fit.on,'yes');assert.equal(fit.by,'trim');
});
