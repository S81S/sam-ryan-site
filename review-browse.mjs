document.querySelectorAll('[data-review-browse]').forEach(root=>{
  const cards=[...root.querySelectorAll('.review-card')];
  const filters=[...root.querySelectorAll('[data-browse-filter]')];
  const pageSize=Number(root.dataset.reviewPageSize)||8;
  if(!cards.length)return;
  let filter='all',page=0;
  const controls=document.createElement('nav');
  controls.className='review-pagination';
  controls.setAttribute('aria-label','Review pages');
  const previous=document.createElement('button');
  previous.type='button';previous.textContent='← Previous';
  previous.setAttribute('aria-label','Previous reviews');
  const status=document.createElement('span');
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const next=document.createElement('button');
  next.type='button';next.textContent='Next →';
  next.setAttribute('aria-label','Next reviews');
  controls.append(previous,status,next);
  const grid=root.querySelector('.review-grid');
  grid.after(controls);
  const separateGroups=root.dataset.reviewGroups==='separate';
  const matchesFilter=(card,choice)=>choice==='all'||card.dataset.person===choice||(!separateGroups&&card.dataset.person==='both'&&(choice==='sam'||choice==='ryan'));
  // Derive filter counts from their actual cards so labels and pagination agree.
  filters.forEach(button=>{if(button.dataset.reviewLabel)button.textContent=`${button.dataset.reviewLabel} (${cards.filter(card=>matchesFilter(card,button.dataset.browseFilter)).length})`;});
  const matching=()=>cards.filter(card=>matchesFilter(card,filter));
  function render(focus=false){
    const list=matching();
    page=Math.max(0,Math.min(page,Math.ceil(list.length/pageSize)-1));
    const start=page*pageSize,visible=new Set(list.slice(start,start+pageSize));
    cards.forEach(card=>{card.hidden=!visible.has(card);card.classList.remove('hidden');});
    filters.forEach(button=>{const selected=button.dataset.browseFilter===filter;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));});
    status.textContent=`${list.length?start+1:0}–${Math.min(start+pageSize,list.length)} of ${list.length} reviews`;
    previous.disabled=page===0;next.disabled=start+pageSize>=list.length;
    controls.hidden=list.length<=pageSize;
    if(focus&&list[start]){list[start].tabIndex=-1;list[start].focus({preventScroll:true});grid.scrollIntoView({block:'start',behavior:'instant'});}
  }
  filters.forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.browseFilter;page=0;render();}));
  previous.addEventListener('click',()=>{page--;render(true);});
  next.addEventListener('click',()=>{page++;render(true);});
  function revealLinkedReview(){
    const target=cards.find(card=>'#'+card.id===location.hash);
    if(!target)return;
    filter='all';page=Math.floor(cards.indexOf(target)/pageSize);render();
    target.scrollIntoView({block:'start',behavior:'instant'});
  }
  render();revealLinkedReview();window.addEventListener('hashchange',revealLinkedReview);
});
