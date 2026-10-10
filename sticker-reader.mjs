import {getDocument,GlobalWorkerOptions} from './pdf.mjs';
import {analyzeSticker} from './equipment-search.mjs';
import {analyzeOtherOriginal} from './multibrand-sticker.mjs';
import {readPositionedPackages} from './package-equipment.mjs';
GlobalWorkerOptions.workerSrc=new URL('./pdf.worker.mjs',import.meta.url).href;
export async function readSticker(bytes,vin){
 if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw Error('The source did not return a PDF. Equipment has not been changed.');
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 const task=getDocument({data:bytes,isEvalSupported:false,disableFontFace:true});
 try{const pdf=await task.promise;if(pdf.numPages>8)throw Error('Please choose the original window sticker, up to 8 pages.');
 const lines=[],positioned=[];for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i),content=await page.getTextContent();let line='',x=null;const flush=()=>{if(line.trim()){lines.push(line.trim());positioned.push({text:line.trim(),x,page:i});}line='';x=null;};for(const item of content.items){if(item.str&&x===null)x=item.transform[4];line+=(item.str||'')+' ';if(item.hasEOL)flush();}flush();}
 const text=lines.join('\n');if(!text.toUpperCase().replace(/[^A-Z0-9]/g,'').includes(vin))throw Error('The PDF does not contain this VIN in readable text. Please check the document.');
 // Current parser is validated for the Stellantis layout. Other layouts remain readable
 // without projecting a factory-equipment result from a generic VIN decode.
 let analysis=null;try{if(/SPECIFIC UNITED STATES REQUIREMENTS/.test(text)&&/^(?:1C|2C|3C|ZAC|ZAR)/.test(vin)){analysis=analyzeSticker(text,vin);analysis.packageGroups=readPositionedPackages(positioned);}else analysis=analyzeOtherOriginal(text,vin)}catch{}
 if(analysis){analysis={...analysis,vin,sha256:Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')};}
 return {text,lines,analysis};
 }finally{await task.destroy()}
}
