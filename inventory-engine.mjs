const HOST='www.covertchryslerdodgejeepram.com';
export const staleHours=24;
function carfaxLink(value,path){if(!value)return null;const u=new URL(value);if(u.protocol!=='https:'||u.hostname!=='www.carfax.com'||!u.pathname.startsWith(path))throw new Error('Invalid CARFAX source link');return u.href}
function stickerLink(value,vin){if(!value)return null;const u=new URL(value);if(u.protocol!=='https:')throw new Error('Invalid sticker URL');if(u.hostname==='www.carfax.com'&&u.pathname.startsWith('/phoenix/sticker/'))return u.href;if(u.hostname==='www.chrysler.com'&&u.pathname==='/hostd/windowsticker/getWindowStickerPdf.do'&&u.searchParams.get('vin')===vin)return u.href;throw new Error('Unrecognized or VIN-mismatched sticker URL')}
export function normalize(row,capturedAt){
 const evidence=new URL(row.locationEvidence||'https://invalid.example');
 if(row.locationId!=='18393'||evidence.hostname!==HOST||evidence.searchParams.get('lc')!=='18393')throw new Error('Vehicle is not verified in the 8107 Research Blvd store filter');
 if(!/^[A-HJ-NPR-Z0-9]{17}$/.test(row.vin||''))throw new Error('Invalid VIN');
 const url=new URL(row.sourceUrl);if(url.protocol!=='https:'||url.hostname!==HOST||!url.pathname.startsWith('/auto/'))throw new Error('Unrecognized listing source');
 const title=String(row.title||'').trim();if(!/^(Used|New) \d{4} .+/i.test(title))throw new Error('Missing vehicle title');
 let photoUrl=null;if(row.photoUrl){const photo=new URL(row.photoUrl);if(photo.protocol!=='https:'||photo.hostname!=='cloudflareimages.dealereprocess.com'||!photo.pathname.startsWith('/resrc/images/'))throw new Error('Invalid vehicle photo source');photoUrl=photo.href;}
 const carfaxUrl=carfaxLink(row.carfaxUrl,'/vehiclehistory/'),stickerUrl=stickerLink(row.stickerUrl,row.vin);
 const price=row.salePrice===null||row.salePrice===undefined?null:Number(String(row.salePrice).replace(/,/g,''));
 if(price!==null&&(!Number.isFinite(price)||price<=0))throw new Error('Invalid price');
 const miles=row.miles===null||row.miles===undefined?null:Number(String(row.miles).replace(/,/g,''));
 if(miles!==null&&(!Number.isInteger(miles)||miles<0))throw new Error('Invalid mileage');
 return {vin:row.vin,stock:String(row.stock||''),title,year:Number(title.match(/\d{4}/)[0]),condition:/^New /i.test(title)?'New':'Used',price,priceLabel:price===null?'Call for Price':'Covert Sale Price',docFee:row.docFee===null||row.docFee===undefined?null:Number(row.docFee),miles,sourceUrl:url.href,carfaxUrl,stickerUrl,stickerCheckedAt:row.stickerCheckedAt||null,status:row.status==='listed'?'listed':'unknown',observedAt:capturedAt,firstSeenAt:capturedAt,features:[],featuresVerified:false,photosApproved:Boolean(photoUrl),photoUrl,photoSourceUrl:url.href,locationVerified:true,locationId:'18393',locationName:'Covert Chrysler Dodge Jeep Ram of Austin',locationAddress:'8107 Research Blvd, Austin, TX 78758',locationEvidence:evidence.href};
}
export function ingest(previous,capture,now=new Date()){
 const scope=new URL(capture.sourceUrl);if(scope.hostname!==HOST||scope.searchParams.get('lc')!=='18393')throw new Error('Import must be scoped to the Austin CDJR store');
 if(previous?.vehicles?.some(v=>v.locationId!=='18393'))throw new Error('Previous dataset contains vehicles outside the selected store');
 const t=Date.parse(capture.capturedAt);if(!Number.isFinite(t)||t>now.getTime()+300000)throw new Error('Invalid capture timestamp');
 if(!Array.isArray(capture.records)||!capture.records.length)throw new Error('Empty capture; preserve existing inventory');
 const seen=new Map();for(const raw of capture.records){const v=normalize(raw,capture.capturedAt);if(seen.has(v.vin))throw new Error('Duplicate VIN in import');seen.set(v.vin,v)}
 const old=new Map((previous?.vehicles||[]).map(v=>[v.vin,v]));
 const changes=[];for(const [vin,v] of seen){const p=old.get(vin);if(p&&Date.parse(p.observedAt)>t)throw new Error('Out-of-order capture');if(p){v.firstSeenAt=p.firstSeenAt;for(const key of ['price','miles','status'])if(p[key]!==v[key])changes.push({vin,field:key,before:p[key],after:v[key],at:capture.capturedAt})}else changes.push({vin,field:'first-observed',before:null,after:v.title,at:capture.capturedAt});old.set(vin,v)}
 // Missing is never sold. Only a proven full, same-scope capture can mark not observed.
 const complete=capture.complete===true&&Number.isInteger(capture.advertisedTotal)&&capture.advertisedTotal===seen.size;
 if(complete&&previous?.scope===capture.sourceUrl)for(const [vin,v] of old)if(!seen.has(vin)){old.set(vin,{...v,status:'not-observed'});changes.push({vin,field:'status',before:v.status,after:'not-observed',at:capture.capturedAt})}
 return {version:1,scope:capture.sourceUrl,capturedAt:capture.capturedAt,advertisedTotal:capture.advertisedTotal??null,capturedCount:seen.size,complete,staleHours,vehicles:[...old.values()],changes};
}
export function issues(v,now=new Date()){
 const list=[];if(!Number.isFinite(Date.parse(v.observedAt))||now-Date.parse(v.observedAt)>staleHours*3600000)list.push('Refresh listing: more than 24 hours old');
 if(v.status!=='listed')list.push('Confirm availability');if(v.price===null)list.push('Confirm current price');
 if(!v.locationVerified)list.push('Confirm vehicle location and availability');if(!v.featuresVerified)list.push('Verify equipment');if(!v.photosApproved)list.push('Add approved photos');return list;
}
export function draft(v,now=new Date()){
 return `DRAFT — REVIEW BEFORE POSTING\n${v.title}\n${v.price===null?'Price: contact us to confirm':`Observed Covert Sale Price: $${v.price.toLocaleString('en-US')}`}\n${v.miles===null?'Mileage: verify':`Observed mileage: ${v.miles.toLocaleString('en-US')}`}\nStock: ${v.stock}\nVIN: ${v.vin}\n\nAsk Samuel Sweitzer or Ryan Sugrue at Covert CDJR Austin to confirm current availability, vehicle location, equipment and final pricing.\n${v.sourceUrl}\n\nSource checked: ${v.observedAt}\nThis is not an out-the-door quote. Confirm taxes and applicable fees with the dealership.\n\nReview checklist:\n${issues(v,now).map(x=>'- '+x).join('\n')||'- Reconfirm details before posting'}`;
}
