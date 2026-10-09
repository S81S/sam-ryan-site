// Keep static pages aligned with the same navigation used by generated vehicle pages.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),shell=require('../site-shell.cjs');
const root=new URL('../',import.meta.url);
let count=0;
for(const file of fs.readdirSync(root).filter(n=>n.endsWith('.html')&&!/^vehicle-|^vehicles(?:-|\.)/.test(n))){
 const url=new URL(file,root),text=fs.readFileSync(url,'utf8');
 if(!/<header\b[^>]*data-site-header/.test(text))continue;
 const route=file==='index.html'?'/':'/'+file.replace(/\.html$/,''),advisor=file==='ryan.html'?'Ryan':'Sam';
 const header=shell.header(route,advisor).split('<div class="affiliation-bar">')[0];
 const next=text.replace(/<header\b[^>]*data-site-header[\s\S]*?<\/header>/,header)
  .replaceAll('/site-shell.css?v=20261005-fixes','/site-shell.css?v=20261009-cleanup');
 if(next!==text){fs.writeFileSync(url,next);count++;}
}
console.log(`Updated shared navigation on ${count} static pages.`);
