const root=document.querySelector('[data-model-question-browser]');
if(root){
  const picker=root.querySelector('[data-question-picker]');
  const select=root.querySelector('[data-question-select]');
  const panels=[...root.querySelectorAll('[data-question-model]')];
  const heading=root.querySelector('[data-question-current]');
  if(picker&&select&&heading&&panels.length){
    const valid=new Set(panels.map(panel=>panel.dataset.questionModel));
    valid.add('shopper-questions');
    const requested=new URL(location.href).searchParams.get('questions');
    if(valid.has(requested))select.value=requested;
    function showModel(){
      if(!valid.has(select.value))return;
      const featured=select.value==='shopper-questions';
      root.classList.toggle('questions-featured',featured);
      for(const panel of panels){
        panel.hidden=featured?!panel.querySelector('[data-featured-question]'):panel.dataset.questionModel!==select.value;
        panel.querySelector('.model-question-title').hidden=true;
        for(const question of panel.querySelectorAll('.model-question'))question.hidden=featured&&!question.hasAttribute('data-featured-question');
      }
      const panel=panels.find(panel=>!panel.hidden);
      heading.textContent=featured?'10 questions real shoppers asked':`10 questions about ${panel.dataset.questionName}`;
    }
    showModel();
    picker.hidden=false;
    heading.hidden=false;
    if(location.hash==='#buyer-questions')requestAnimationFrame(()=>root.scrollIntoView({block:'start'}));
    select.addEventListener('change',()=>{
      showModel();
      const url=new URL(location.href);
      url.searchParams.set('questions',select.value);
      history.replaceState(null,'',url.pathname+url.search+url.hash);
    });
  }
}
