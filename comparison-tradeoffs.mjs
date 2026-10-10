const el=(doc,tag,text)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
const identity=v=>v.stock?`Stock ${v.stock}`:`VIN …${v.vin.slice(-6)}`;
const value=f=>f?.displayValue|| (f?.value?'Included':'Not equipped');
const priority=r=>/screen|display|audio|speaker/i.test(r.label)?0:/seat|climate|camera|power|roof|tow|engine/i.test(r.label)?1:2;
// Directional gains require evidence on BOTH vehicles. Different sizes or
// specifications are alternatives, not automatically better/worse equipment.
export function vehicleTradeoffs(rows,reference,target){
 const result={gains:[],losses:[],changes:[],unresolved:0};
 for(const row of rows){
  if(['listedPackages','equipmentGroup'].includes(row.id))continue;
  const a=row.facts[reference],b=row.facts[target];
  if(!a||!b){if(a||b)result.unresolved++;continue;}
  const item={...row,before:a,after:b};
  if(a.value===false&&b.value===true)result.gains.push(item);
  else if(a.value===true&&b.value===false)result.losses.push(item);
  else if(a.comparisonValue!==undefined&&b.comparisonValue!==undefined&&a.comparisonValue!==b.comparisonValue)result.changes.push(item);
 }
 for(const key of ['gains','losses','changes'])result[key].sort((a,b)=>priority(a)-priority(b));
 return result;
}
export function appendVehicleTradeoffs(container,rows,records,doc=globalThis.document){
 if(records.length<2)return;
 const section=el(doc,'section');section.className='vehicle-tradeoffs';section.setAttribute('aria-labelledby','vehicle-tradeoffs-title');
 const title=el(doc,'h3','What you gain or give up');title.id='vehicle-tradeoffs-title';section.append(title);
 section.append(el(doc,'p','Choose your starting vehicle. See the confirmed equipment changes when choosing another one.'));
 const label=el(doc,'label','Compare against:');label.htmlFor='tradeoff-reference';const select=el(doc,'select');select.id=label.htmlFor;
 records.forEach(({v},i)=>{const o=el(doc,'option',`${identity(v)} · ${v.title}`);o.value=String(i);select.append(o);});
 const controls=el(doc,'div');controls.className='tradeoff-controls';controls.append(label,select);section.append(controls);
 const output=el(doc,'div');output.className='tradeoff-results';output.setAttribute('aria-live','polite');section.append(output);
 const addFacts=(parent,heading,items,kind)=>{
  if(!items.length)return;
  const block=el(doc,'div');block.className='tradeoff-block '+kind;block.append(el(doc,'h5',heading));
  const appendItem=(list,item)=>{const li=el(doc,'li');li.append(el(doc,'strong',item.label));
   li.append(el(doc,'p',kind==='changes'?`${value(item.before)} → ${value(item.after)}`:kind==='gains'?`${value(item.after)} · Starting vehicle: ${value(item.before)}`:`${value(item.before)} on the starting vehicle · This choice: ${value(item.after)}`));
   const details=el(doc,'details');details.append(el(doc,'summary','Why we say this'));
   for(const [name,fact] of [['Starting vehicle',item.before],['This choice',item.after]]){details.append(el(doc,'strong',name));for(const text of fact.evidence||[])details.append(el(doc,'p',text));if(fact.sourceUrl){const a=el(doc,'a','View source ↗');a.href=fact.sourceUrl;a.target='_blank';a.rel='noopener';details.append(a);}}
   li.append(details);list.append(li);
  };
  const ul=el(doc,'ul');items.slice(0,6).forEach(item=>appendItem(ul,item));block.append(ul);
  if(items.length>6){const more=el(doc,'details');more.className='tradeoff-more';more.append(el(doc,'summary',`Show all ${items.length} ${kind==='changes'?'specification changes':kind==='gains'?'gains':'tradeoffs'}`));const rest=el(doc,'ul');items.slice(6).forEach(item=>appendItem(rest,item));more.append(rest);block.append(more);}parent.append(block);
 };
 function draw(){
  output.replaceChildren();const reference=Number(select.value)||0;
  records.forEach(({v},i)=>{if(i===reference)return;const result=vehicleTradeoffs(rows,reference,i),card=el(doc,'article');card.className='tradeoff-choice';
   card.append(el(doc,'h4',`Choose ${identity(v)}`),el(doc,'p',v.title),el(doc,'small',`Compared with ${identity(records[reference].v)} · ${records[reference].v.title}`));
   addFacts(card,'+ You gain',result.gains,'gains');addFacts(card,'− You give up',result.losses,'losses');addFacts(card,'↔ Different specifications',result.changes,'changes');
   if(!result.gains.length&&!result.losses.length&&!result.changes.length)card.append(el(doc,'p','No confirmed equipment changes in the available evidence. Package contents and any unresolved details are shown below.'));
   if(result.unresolved){const note=el(doc,'p',`${result.unresolved} details still need confirmation. They are not counted as gains or losses.`);note.className='tradeoff-gap';card.append(note);}
   output.append(card);
  });
 }
 select.addEventListener('change',draw);draw();const more=el(doc,'a','See the full equipment comparison ↓');more.href='#vehicle-equipment';section.append(more);container.append(section);
}
