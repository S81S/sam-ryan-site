// Bounded 2026 Ram 1500 Big Horn/Lone Star package links. Both the package and
// the exact child row must retain their reviewed source and inclusion wording.
const SOURCE='https://www.stellantisfleet.com/content/dam/fca-fleet/na/fleet/en_us/shopping-tools/brochures-literature/docs/buyers-guide/2026/26DOMMOP_FBG_Ram1500.pdf';
const TRIM='big-horn-lone-star';
const ROWS={
 f1yu9mmu:{key:'f:equipment-packages|big-horn-lone-star-30-level-1-equipment-h1-group-|includes-rear-in-floo',parent:'Big Horn/Lone Star(30) Level 1 Equipment (H1 Group)',text:'Includes rear in-floor storage bins, *T9 cloth bucket seats with 10-way power-adjust driver’s seat, 400-watt inverter, 115-volt power outlet, power-sliding rear window, sun visors with illuminated vanity, auto-dimming rearview mirror, GUK exterior mirrors, rear window defroster, heated leather-wrapped steering wheel, instrument-panel (I/P) badge, heated front seats, glove box lamp, rear dome lamp with on/off switch, SiriusXM Radio(21) and power-adjust pedals (A62)',note:''},
 f1mojxzg:{key:'f:equipment-packages|big-horn-lone-star-30-level-2-equipment-h2-group-|includes-h1-group-pre',parent:'Big Horn/Lone Star(30) Level 2 Equipment (H2 Group)',text:'Includes H1 Group, premium overhead console, security alarm(34) system, rear window defroster, configurable drive mode, Dual-Zone automatic temperature control, wireless charging pad (if equipped with bucket seats), 115-volt rear power outlet, 7-inch Driver Information Display cluster, LED interior lighting, 10-speaker premium audio system, RS2 Media Hub, Uconnect® 5 NAV with 12-inch touchscreen display, remote tailgate release and 20-inch Chrome-clad aluminum wheels (A63)',note:''},
 fli7zo:{key:'f:interior-features|steering-wheel|heated-included-with-h1-and-h2-groups-nhs',parent:'Steering Wheel',text:'Heated (included with H1 and H2 Groups) (NHS)',note:'included with H1 and H2 Groups'},
 fh01t86:{key:'f:uconnect-multimedia|radio-systems|uconnect-5-nav-with-12-inch-touchscreen-display-included',parent:'Radio Systems',text:'Uconnect 5 NAV with 12-inch touchscreen display (included with H2 Group) (UBQ)',note:'included with H2 Group'},
 f4nwyj3:{key:'f:uconnect-multimedia|sound-system|alpine-10-speaker-audio-system-included-with-h2-group-req',parent:'Sound System',text:'Alpine® 10-speaker audio system (included with H2 Group; requires H1 Group) (RC3)',note:'included with H2 Group; requires H1 Group'}
};
const LINKS={f1yu9mmu:['fli7zo'],f1mojxzg:['fli7zo','fh01t86','f4nwyj3']};
const offered=f=>f&&['standard','optional'].includes(f.status);
function reviewed(choice,trimId){
 const expected=ROWS[choice?.id],f=choice?.facts?.[trimId];
 return choice?.kind==='factory'&&expected&&f?.factory===true&&f.sourceUrl===SOURCE&&Object.entries(expected).every(([key,value])=>(f[key]||'')===value)&&offered(f)?f:null;
}

export function sourcedRamPackageDependency({lineup,parent,child,trimId,excludedChoiceIds=[]}={}){
 if(lineup?.id!=='ram-1500'||lineup.year!==2026||trimId!==TRIM||!LINKS[parent?.id]?.includes(child?.id))return null;
 if(excludedChoiceIds.includes(parent.id)||excludedChoiceIds.includes(child.id)||!reviewed(parent,trimId)||!reviewed(child,trimId))return null;
 if(parent.id==='f1mojxzg'&&excludedChoiceIds.includes('f1yu9mmu'))return null;
 const conditionEvidence=[];
 if(child.id==='f4nwyj3'){
  // H1 is a prerequisite, not evidence that Alpine comes with H1. H2's exact
  // included-package link and H1's own offered row independently satisfy it.
  const h1=(lineup.questions||[]).flatMap(q=>q.choices||[]).find(c=>c.id==='f1yu9mmu');
  const included=(parent.includedPackages||[]).find(p=>p.id==='f1yu9mmu'&&p.trimIds?.includes(trimId)&&p.sourceUrl===SOURCE);
  const h1Fact=reviewed(h1,trimId);
  if(!included||!h1Fact||excludedChoiceIds.includes('f1yu9mmu'))return null;
  conditionEvidence.push({choiceId:h1.id,parentChoiceId:parent.id,trimId,status:'included-by-selection',sourceUrl:SOURCE});
 }
 return {sourceUrl:SOURCE,parentChoiceId:parent.id,choiceId:child.id,trimId,conditionEvidence};
}
