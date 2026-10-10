import {preferenceChecks} from './preference-evidence.mjs';
import {encodePreferences} from './shopping-preferences.mjs';
export function appendPreferenceComparison(out,recs,preferences){
 if(!preferences.requirements.length)return;
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const section=el('section');section.className='search-summary';section.setAttribute('aria-label','How these vehicles fit your choices');
 section.append(el('h3','How these fit your choices'),el('p','Your exact choices stay with you. A different size or an excluded feature does not count as a match.'));
 const wrap=el('div');wrap.className='comparison-table-wrap';wrap.tabIndex=0;
 const table=el('table');table.className='equipment-matrix';const head=el('thead'),row=el('tr');row.append(el('th','Your choice'));
 for(const {v} of recs){const th=el('th',v.stock?'Stock '+v.stock:v.title);th.scope='col';row.append(th);}head.append(row);table.append(head);
 const checks=recs.map(r=>preferenceChecks(r.v,r.s,preferences.requirements)),body=el('tbody');
 preferences.requirements.forEach((r,n)=>{const tr=el('tr'),th=el('th',(r.wanted?'Want: ':'Exclude: ')+r.label);th.scope='row';tr.append(th);
  for(const values of checks){const c=values[n],td=el('td'),answer=el('strong',c.state==='match'?'✓ Matches your choice':c.state==='conflict'?'✕ Does not match':'? Needs confirmation');answer.className='equipment-answer '+(c.state==='match'?'yes':c.state==='conflict'?'no':'unknown');td.append(answer);
   if(c.evidence.length){const details=el('details');details.append(el('summary','Why'),el('p',c.evidence.join(' / ')));td.append(details);}tr.append(td);
  }body.append(tr);
 });table.append(body);wrap.append(table);section.append(wrap);
 const edit=el('a','Edit my photo choices');const params=new URLSearchParams(location.search);params.delete('vehicles');params.set('preferences',encodePreferences(preferences));
 edit.href='/perfect-match?'+params+'#photo-finder';section.append(edit);out.append(section);
}
