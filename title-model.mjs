// Some dealer listings leave the model out of the title ("New 2027 JEEP SAHARA", "New 2027 TRADESMAN").
// The window sticker's own model line names it, so the title is completed from there — nothing else is changed.
const hasModel=/\b(?:WRANGLER|GLADIATOR|CHEROKEE|COMPASS|WAGONEER|RECON|RENEGADE|PROMASTER|DURANGO|CHARGER|HORNET|CHALLENGER|PACIFICA|VOYAGER|[1-5]500)\b/i;
const models=[
 [/\bWRANGLER (4-DOOR|2-DOOR)\b/,'JEEP',m=>'WRANGLER '+m[1]],[/\bWRANGLER UNLIMITED\b/,'JEEP',()=>'WRANGLER UNLIMITED'],[/\bWRANGLER\b/,'JEEP',()=>'WRANGLER'],
 [/\bGLADIATOR\b/,'JEEP',()=>'GLADIATOR'],[/\bGRAND CHEROKEE L\b/,'JEEP',()=>'GRAND CHEROKEE L'],[/\bGRAND CHEROKEE\b/,'JEEP',()=>'GRAND CHEROKEE'],[/\bCHEROKEE\b/,'JEEP',()=>'CHEROKEE'],
 [/\bCOMPASS\b/,'JEEP',()=>'COMPASS'],[/\bGRAND WAGONEER L\b/,'JEEP',()=>'GRAND WAGONEER L'],[/\bGRAND WAGONEER\b/,'JEEP',()=>'GRAND WAGONEER'],[/\bWAGONEER\b/,'JEEP',()=>'WAGONEER'],[/\bRECON\b/,'JEEP',()=>'RECON'],
 [/\bRAM ([1-3]500) PROMASTER\b/,'RAM',m=>'PROMASTER '+m[1]],[/\bRAM ([1-5]500)\b/,'RAM',m=>m[1]],
 [/\bDURANGO\b/,'DODGE',()=>'DURANGO'],[/\bCHARGER\b/,'DODGE',()=>'CHARGER'],[/\bHORNET\b/,'DODGE',()=>'HORNET'],[/\bPACIFICA\b/,'CHRYSLER',()=>'PACIFICA'],[/\bVOYAGER\b/,'CHRYSLER',()=>'VOYAGER']
];
export function completeTitle(title,sticker,vin){
 const t=String(title||''),parts=t.match(/^(New|Used)\s+(20\d\d)\s+(.+)$/i);
 if(!parts||hasModel.test(parts[3]))return t;
 if(sticker?.status!=='verified'||(vin&&sticker.vin&&sticker.vin!==vin))return t;
 const line=(sticker.identityLines||[]).map(l=>String(l).toUpperCase()).find(l=>models.some(([p])=>p.test(l)));
 if(!line)return t;
 const [pattern,make,name]=models.find(([p])=>p.test(line)),model=name(line.match(pattern));
 // Keep the dealer's own words; drop its make and anything the model already says (a second "4-DOOR").
 const rest=parts[3].split(/\s+/).filter((w,i)=>!(i===0&&/^(?:JEEP|RAM|DODGE|CHRYSLER)$/i.test(w))&&!model.split(' ').includes(w.toUpperCase()));
 return [parts[1],parts[2],make,model,...rest].join(' ');
}
