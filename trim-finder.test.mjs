import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as ladder from './trim-ladder.mjs';
import * as factory from './factory-facts.mjs';
import {plainFact} from './plain-labels.mjs';

async function guideSession(){
 const listeners={},windowListeners={},location={href:'https://carswithsam.com/perfect-match',search:''};
 const root={dataset:{},innerHTML:'',addEventListener:(name,fn)=>listeners[name]=fn,querySelector:()=>null,querySelectorAll:()=>[],contains:()=>true,prepend(node){this.freshness=node.textContent;},scrollIntoView(){}};
 const history={replaceState(state,unused,url){location.href=String(url);location.search=new URL(url).search;},pushState(state,unused,url){this.replaceState(state,unused,url);}};
 const context={...ladder,...factory,plainFact,URL,URLSearchParams,console,location,history,matchMedia:()=>({matches:true}),document:{getElementById:()=>root,querySelector:()=>null,createElement:()=>({})},window:{addEventListener:(name,fn)=>windowListeners[name]=fn},fetch:async path=>({ok:true,json:async()=>JSON.parse(readFileSync(new URL('.'+path,import.meta.url),'utf8'))})};
 const source=readFileSync(new URL('./trim-finder.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
 await vm.runInNewContext('(async()=>{'+source+'})()',context);
 const click=async dataset=>{const button={dataset,disabled:false};await listeners.click({target:{closest:()=>button}});};
 return {root,location,listeners,windowListeners,click};
}

test('typed budget survives immediate model selection, vehicle links and advisor handoff',async()=>{
 const s=await guideSession();
 s.listeners.input({target:{id:'tf-budget',value:'40000'}});
 assert.equal(new URL(s.location.href).searchParams.get('maxPrice'),'40000');
 await s.click({brand:'Ram'});
 const model=s.root.innerHTML.match(/data-model="([^"]+)"[^>]*>[\s\S]*?<strong>Ram 1500<\/strong>/)?.[1];
 assert.ok(model,'Ram lineup can be selected');
 await s.click({model});
 assert.match(s.root.freshness,/\$40,000/);
 await s.click({act:'done'});
 assert.match(decodeURIComponent(s.root.innerHTML),/My maximum listed price is \$40,000/);
 const href=s.root.innerHTML.match(/class="tf-car[^\"]*" href="([^"]+)"/)?.[1];
 assert.ok(href,'matching vehicle is offered');
 const vehicleUrl=new URL(href.replaceAll('&amp;','&'),'https://carswithsam.com');
 assert.match(vehicleUrl.searchParams.get('q'),/under 40000/);
 assert.equal(vehicleUrl.searchParams.get('condition'),'New');
 assert.match(decodeURIComponent(s.root.innerHTML),/\/inventory\?q=[^"]*under 40000/);
});

test('browser history restores the budget encoded in the destination URL',async()=>{
 const s=await guideSession();
 s.listeners.input({target:{id:'tf-budget',value:'60000'}});
 s.location.search='?maxPrice=30000';
 s.location.href='https://carswithsam.com/perfect-match?maxPrice=30000';
 await s.windowListeners.popstate({state:null});
 assert.match(s.root.innerHTML,/value="30000"/);
 assert.match(s.root.freshness,/\$30,000/);
});
