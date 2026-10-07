// Completes dealer titles that leave the model out, from the window sticker on file. Runs after every data update.
import {readFileSync,writeFileSync} from 'node:fs';
import {completeTitle} from '../title-model.mjs';
const check=process.argv.includes('--check');
const file=new URL('../data/used-inventory.json',import.meta.url),inventory=JSON.parse(readFileSync(file,'utf8'));
const records=JSON.parse(readFileSync(new URL('../data/equipment-index.json',import.meta.url),'utf8')).records;
let changed=0;
for(const v of inventory.vehicles){const title=completeTitle(v.title,records[v.vin],v.vin);if(title!==v.title){console.log(`${v.stock||v.vin}: ${v.title}  →  ${title}`);if(!check)v.title=title;changed++;}}
if(changed&&!check)writeFileSync(file,JSON.stringify(inventory));
console.log(changed?`${changed} title${changed===1?'':'s'} ${check?'would be':''} completed.`:'Every title already names its model.');
