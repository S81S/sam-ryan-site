// These reviewed engine rows describe complete engine/transmission bundles.
// Their transmission proof stays attached to the engine ID; it never widens a
// separately sourced transmission choice or creates a second shopper answer.
const profiles={
 wrangler:{sourceUrl:'https://media.stellantisnorthamerica.com/view-spec.do?id=27222',trims:['sport','sport-s','sahara','rubicon','moab-392'],rows:{
  f1fd7xjl:['f:engines-transmissions||pentastar-3-6-liter-v-6-six-speed-manual','Pentastar 3.6-liter V-6 / Six-speed manual','Six-speed manual'],
  fbixrjd:['f:engines-transmissions||2-0-liter-inline-four-cylinder-eight-speed-automatic','2.0-liter inline four-cylinder / Eight-speed automatic','Eight-speed automatic'],
  f1j10ide:['f:engines-transmissions||6-4-liter-v-8-eight-speed-automatic','6.4-liter V-8 / Eight-speed automatic','Eight-speed automatic']
 }},
 'ram-1500':{sourceUrl:'https://www.stellantisfleet.com/content/dam/fca-fleet/na/fleet/en_us/shopping-tools/brochures-literature/docs/buyers-guide/2026/26DOMMOP_FBG_Ram1500.pdf',trims:['tradesman','express','warlock','big-horn-lone-star','laramie','rebel','limited','limited-longhorn','tungsten'],rows:{
  f1867aas:['f:engines-transmissions||3-6l-pentastar-v6-with-etorque-8-speed-automatic-erg-dft','3.6L Pentastar® V6 with eTorque/8-speed Automatic (ERG/DFT)','Eight-speed automatic'],
  fpw7o6e:['f:engines-transmissions||3-0l-i-6-hurricane-standard-output-so-twin-turbo-8-speed-automatic-','3.0L I-6 Hurricane Standard-Output (SO) Twin-Turbo/8-speed Automatic (EFH/DFR)','Eight-speed automatic'],
  f43vdqj:['f:engines-transmissions||3-0l-i-6-hurricane-high-output-ho-twin-turbo-8-speed-automatic-efc-','3.0L I-6 Hurricane High-Output (HO) Twin-Turbo/8-speed Automatic (EFC/DFR)','Eight-speed automatic'],
  f1r91s05:['f:engines-transmissions||5-7l-hemi-v8-with-etorque-8-speed-automatic-ezl-dfr','5.7L HEMI® V8 with eTorque/8-speed Automatic (EZL/DFR)','Eight-speed automatic']
 }}
};
const supplemental={sourceUrl:'https://www.jlwranglerforums.com/forum/attachments/2026-4-door-wrangler-pdf.1009497/',trims:['willys','rubicon-x'],row:['automatic-powertrain-options','2.0L turbo I4 or 3.6L V6 / 8-speed automatic','Eight-speed automatic']};
const engine=choice=>choice?.kind==='factory'&&Object.values(choice.facts||{}).some(f=>['engine','base-engine','automatic-powertrain-options'].includes(f.key)||(f.factory&&f.section==='ENGINES / TRANSMISSIONS'&&f.parent===''));

export function selectedTransmissionBundle({lineup,selected=[],trimIds=[],excludedChoiceIds=[]}={}){
 const profile=profiles[lineup?.id];if(lineup?.year!==2026||!profile||!trimIds.length)return null;
 const engines=selected.filter(p=>profile.rows[p.choice?.id]||(lineup.id==='wrangler'&&p.choice?.id==='fvzymog')||engine(p.choice));
 if(!engines.length)return null;
 if(engines.length!==1)return {unresolved:true};
 const parent=engines[0].choice,supplement=lineup.id==='wrangler'&&parent.id==='fvzymog';
 const row=supplement?supplemental.row:profile.rows[parent.id];
 if(!row)return null; // Engine-only rows do not settle a transmission choice.
 const {sourceUrl,trims}=supplement?supplemental:profile;
 if(excludedChoiceIds.includes(parent.id))return {unresolved:true};
 const facts=trimIds.map(id=>({id,f:parent.facts?.[id]}));
 if(facts.some(({id,f})=>!trims.includes(id)||!f||!['standard','optional'].includes(f.status)||f.sourceUrl!==sourceUrl||f.key!==row[0]||
  (supplement?f.value!==row[1]||f.factory===true:f.text!==row[1]||f.factory!==true||f.parent!==''||f.section!=='ENGINES / TRANSMISSIONS')||
  !['',...(lineup.id==='wrangler'&&id==='sahara'?['One of the 2 engines this trim can come with (standard on some versions)']:[])].includes(f.note||'')))return {unresolved:true};
 return {label:row[2]+' transmission',choiceIds:[parent.id],
  evidence:facts.map(({id})=>({choiceId:parent.id,parentChoiceId:parent.id,trimId:id,status:'included-by-selection',sourceUrl,specification:row[2]})),
  includedBy:[{choiceId:parent.id,label:parent.fullLabel||parent.label,basis:'selection',trimIds:[...trimIds],sourceUrls:[sourceUrl]}]};
}
