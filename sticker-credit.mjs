export function isWindowStickerOrg(source){try{const u=new URL(source);return u.protocol==='https:'&&(u.hostname==='windowsticker.org'||u.hostname.endsWith('.windowsticker.org'));}catch{return false;}}
export function usesWindowStickerOrg(source,origin=globalThis.location?.origin||'https://carswithsam.com'){
 if(typeof source!=='string')return false;
 if(isWindowStickerOrg(source))return true;
 try{const u=new URL(source,origin);return u.origin===origin&&u.pathname==='/api/original-sticker';}catch{return false;}
}
export function appendStickerCredit(container,...sources){if(!sources.some(s=>usesWindowStickerOrg(s)))return;const small=container.ownerDocument.createElement('small');small.className='sticker-source-credit';small.style.cssText='display:block;font-size:13px;line-height:1.5;margin:6px 0;color:inherit';small.append('Window sticker provided by ');const link=container.ownerDocument.createElement('a');link.href='https://windowsticker.org/';link.textContent='WindowSticker.org';link.target='_blank';link.rel='noopener noreferrer';small.append(link);container.append(small);}

export function installStickerCredits(root=document){
 const credited=new WeakMap();
 function scan(){for(const anchor of root.querySelectorAll('a[href]')){
  if(anchor.closest('.sticker-source-credit')||anchor.id?.startsWith('sticker-'))continue;
  let u;try{u=new URL(anchor.href)}catch{continue;}
  const relevant=(isWindowStickerOrg(u.href)&&u.pathname!=='/')||(u.origin===location.origin&&u.pathname==='/api/original-sticker');
  const old=credited.get(anchor);if(!relevant){old?.remove();credited.delete(anchor);continue;}
  if(old?.isConnected)continue;
  if(anchor.nextElementSibling?.classList.contains('sticker-source-credit'))continue;
  const holder=document.createElement('span');appendStickerCredit(holder,'https://windowsticker.org/');const credit=holder.firstChild;
  credit.style.cssText='display:block;font-size:12px;line-height:1.5;margin:5px 0;color:inherit';anchor.after(credit);credited.set(anchor,credit);
 }}
 scan();let queued=false;const observer=new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;scan()})});
 observer.observe(root.body||root,{childList:true,subtree:true,attributes:true,attributeFilter:['href']});
 return ()=>observer.disconnect();
}
