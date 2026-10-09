// Use the listing provider's existing resize endpoint instead of downloading
// full-size gallery images for small cards and thumbnails.
export function vehicleImage(url,width=640){
 try{const u=new URL(url);if(u.protocol==='https:'&&u.hostname==='cloudflareimages.dealereprocess.com'&&u.pathname.startsWith('/resrc/images/'))return u.href.replace(/([/,])w_(?:auto|\d+)(?=[/,])/,'$1w_'+width);}catch{}
 return url||'';
}
export const vehicleImageSet=(url,widths=[320,640])=>widths.map(w=>`${vehicleImage(url,w)} ${w}w`).join(', ');
