const fs=require('node:fs'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=__dirname,origin='https://carswithsam.com';
const sha=()=>{const h=crypto.createHash('sha256');for(const f of ['data/used-inventory.json','data/equipment-index.json','build-vehicle-pages.cjs','site-shell.cjs'])h.update(fs.readFileSync(root+'/'+f));return h.digest('hex')};
const read=f=>fs.readFileSync(root+'/'+f,'utf8');
async function main(){
 if(process.argv.includes('--prepare')){fs.writeFileSync(root+'/vehicle-pages-version.json',JSON.stringify({version:sha()}));return;}
 const key=read('indexnow-key.txt').trim();if(!/^[a-zA-Z0-9-]{8,128}$/.test(key))throw Error('Invalid verification key');
 let urls;
 if(process.argv.includes('--initial')) urls=[...read('sitemap-vehicles.xml').matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
 else urls=execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r','HEAD'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(f=>/^vehicle-[A-HJ-NPR-Z0-9]{17}\.html$|^vehicles(?:-\d+)?\.html$|^[a-z0-9-]+-with-[a-z0-9-]+-austin\.html$|^shop-by-feature\.html$/.test(f)).map(f=>origin+'/'+f.slice(0,-5));
 urls=[...new Set(urls)];if(!urls.length){console.log('No changed vehicle or feature URLs; no notification sent.');return;}
 if(urls.length>10000||urls.some(u=>new URL(u).origin!==origin))throw Error('Invalid notification scope');
 const version=sha();let deployed=false;
 for(let attempt=0;attempt<24;attempt++){
  try{const r=await fetch(origin+'/vehicle-pages-version.json',{cache:'no-store',signal:AbortSignal.timeout(15000)});if(r.ok&&(await r.json()).version===version){deployed=true;break;}}catch{}
  if(attempt<23)await new Promise(r=>setTimeout(r,10000));
 }
 if(!deployed)throw Error('Live deployment not verified; no search notification sent.');
 const verification=await fetch(origin+'/indexnow-key.txt',{signal:AbortSignal.timeout(15000)});if(!verification.ok||(await verification.text()).trim()!==key)throw Error('Live verification file unavailable');
 const response=await fetch('https://api.indexnow.org/indexnow',{method:'POST',headers:{'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify({host:'carswithsam.com',key,keyLocation:origin+'/indexnow-key.txt',urlList:urls}),signal:AbortSignal.timeout(30000)});
 if(![200,202].includes(response.status))throw Error('IndexNow submission failed: HTTP '+response.status);
 console.log(JSON.stringify({submitted:urls.length,httpStatus:response.status,message:response.status===202?'Received; key validation pending.':'URLs received. Indexing is not guaranteed.'}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
