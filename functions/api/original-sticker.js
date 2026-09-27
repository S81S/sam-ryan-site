// Pages Function: /api/original-sticker?vin=... . No arbitrary upstream URLs.
export async function onRequest(context){
 const request=context.request,url=new URL(request.url);
 const fail=(message,status)=>Response.json({error:message},{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 if(request.method!=='GET')return fail('Use GET.',405);
 const vin=url.searchParams.get('vin')||'';
 if(!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin))return fail('Enter a complete 17-character VIN.',400);
 if(request.headers.get('Sec-Fetch-Site')==='cross-site')return fail('Open the comparison on Cars With Sam.',403);
 const cache=globalThis.caches?.default;
 const key=new Request(url.origin+'/api/original-sticker?vin='+vin);
 // A platform/cache error must not bypass our readable fallback response.
 try{const saved=cache&&await cache.match(key);if(saved?.ok&&/application\/pdf/i.test(saved.headers.get('Content-Type')||''))return saved;}catch{}
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
 try{
  const upstream=await fetch('https://windowsticker.org/api/sticker/'+vin,{signal:controller.signal,redirect:'error',headers:{Accept:'application/pdf','X-Contact':'carswithsam.com'}});
  if(!upstream.ok){await upstream.body?.cancel();return fail(upstream.status===429?'Sticker service is busy. Please try again shortly.':'No readable original sticker is available from this service. You can upload your original PDF.',upstream.status===429?429:404);}
  const limit=5*1024*1024;
  if(!/application\/pdf/i.test(upstream.headers.get('Content-Type')||'')||Number(upstream.headers.get('Content-Length'))>limit){await upstream.body?.cancel();return fail('The service did not return a supported original PDF.',422);}
  const reader=upstream.body.getReader(),chunks=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();return fail('The original PDF is too large. Open it from the provider instead.',413);}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')return fail('The service did not return a PDF.',422);
  const result=new Response(bytes,{headers:{'Content-Type':'application/pdf','Content-Disposition':`inline; filename="${vin}-original.pdf"`,'Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex'}});
  if(cache)context.waitUntil(cache.put(key,result.clone()));
  return result;
 }catch{return fail('The sticker service could not be reached. Please try your original PDF.',502);}
 finally{clearTimeout(timer);}
}
