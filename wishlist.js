(() => {
 const form=document.getElementById('watchForm');if(!form)return;
 const list=document.getElementById('saved-wishlists'),status=document.getElementById('watchMessage');
 const key='samRyanCarWatch';let saved=[],available=true;
 const el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 try{const raw=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(raw)||raw.some(x=>!x||typeof x.name!=='string'||typeof x.criteria!=='string'))throw Error();saved=raw;}catch{available=false;status.textContent='Your saved lists could not be read on this browser. Your existing data has not been changed. You can still copy your preferences and contact us.';}
 function persist(next){try{localStorage.setItem(key,JSON.stringify(next));saved=next;return true;}catch{status.textContent='This browser could not save your wishlist. Copy your preferences before leaving this page.';return false;}}
 function render(){list.replaceChildren();if(!saved.length){list.append(el('p','Your saved wishlists will appear here.'));return;}
 saved.forEach((wish,i)=>{const card=el('article');card.className='tool-card saved-wishlist';card.append(el('h3',wish.name),el('p',wish.criteria));const actions=el('div');actions.className='stock-actions';
 const search=el('a','Search these preferences');search.className='mini-btn';search.href='find-my-car.html?q='+encodeURIComponent(wish.criteria);actions.append(search);
 const ask=el('a','Ask Cars With Sam');ask.className='mini-btn';ask.href='contact.html';ask.addEventListener('click',()=>{try{sessionStorage.setItem('samRyanWishlistInquiry',wish.criteria);}catch{status.textContent='Copy your preferences into the contact form.';}});actions.append(ask);
 const remove=el('button','Remove');remove.type='button';remove.className='mini-btn';remove.setAttribute('aria-label','Remove wishlist '+wish.name);remove.addEventListener('click',()=>{if(persist(saved.filter((_,j)=>i!==j))){render();status.textContent='Wishlist removed from this browser.';}});actions.append(remove);card.append(actions);list.append(card);});}
 form.addEventListener('submit',e=>{e.preventDefault();if(!available)return;const d=Object.fromEntries(new FormData(form)),name=d.name.trim(),criteria=d.criteria.trim();if(!name||!criteria){status.textContent='Add a name and your shopping preferences.';return;}if(saved.length>=50){status.textContent='You have 50 saved lists. Remove one before adding another.';return;}if(persist([...saved,{name,criteria,createdAt:new Date().toISOString()}])){render();status.textContent='Saved on this device. You can search these preferences or share them with us below.';form.reset();}});
 render();
})();
