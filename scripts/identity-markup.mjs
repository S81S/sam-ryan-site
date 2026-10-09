// Keeps the "who is Sam / where does he work" markup the same on every static page, so search engines and AI
// assistants can connect this site to Sam's own Google Business listing and to the dealership's street address.
// Both facts are already shown on every page (the header's "Visit us at" link); this states them in the page markup.
// Safe to re-run: a page whose markup already matches is left untouched.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{maps}=require('../site-shell.cjs');
const root=new URL('../',import.meta.url),origin='https://carswithsam.com';
const address={'@type':'PostalAddress',streetAddress:'8107 Research Blvd',addressLocality:'Austin',addressRegion:'TX',postalCode:'78758',addressCountry:'US'};
// Pages were written by different tools: some space their JSON as ", " and ": ", and some of those also escape
// non-ASCII. Each block is rewritten in the form it already uses, so only the added facts show up as a change.
const spaced=ascii=>function write(value){
 if(Array.isArray(value))return '['+value.map(write).join(', ')+']';
 if(value&&typeof value==='object')return '{'+Object.entries(value).map(([k,v])=>write(k)+': '+write(v)).join(', ')+'}';
 const text=JSON.stringify(value);
 return ascii&&typeof value==='string'?text.replace(/[\u0080-\uffff]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0')):text;
};
const forms=[JSON.stringify,spaced(true),spaced(false)];
const check=process.argv.includes('--check');
let changed=0,skipped=[];
for(const file of fs.readdirSync(root).filter(n=>n.endsWith('.html')&&!/^vehicle-|^vehicles(?:-|\.)|-with-[a-z0-9-]+-austin\.html$|^shop-by-feature\.html$/.test(n))){
 const url=new URL(file,root),text=fs.readFileSync(url,'utf8');
 const next=text.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g,(all,open,body,close)=>{
  let data;try{data=JSON.parse(body)}catch{return all}
  const graph=data['@graph'];if(!Array.isArray(graph))return all;
  // Only rewrite markup this script can reproduce exactly, so nothing else in the block changes.
  const write=forms.find(form=>form(data)===body);
  if(!write){if(graph.some(n=>n['@id']===origin+'/#sam'))skipped.push(file);return all;}
  let touched=false;
  for(const node of graph){
   if(node['@id']===origin+'/#sam'&&node['@type']==='Person'&&JSON.stringify(node.sameAs)!==JSON.stringify([maps])){node.sameAs=[maps];touched=true;}
   if(node['@id']===origin+'/#dealership'&&(node['@type']!=='AutoDealer'||JSON.stringify(node.address)!==JSON.stringify(address))){node['@type']='AutoDealer';node.address=address;touched=true;}
  }
  return touched?open+write(data)+close:all;
 });
 if(next!==text){changed++;if(!check)fs.writeFileSync(url,next);}
}
console.log(`${changed} page${changed===1?'':'s'} ${check?'would be ':''}updated.`+(skipped.length?` Left alone (markup not in the standard form): ${[...new Set(skipped)].join(', ')}`:''));
