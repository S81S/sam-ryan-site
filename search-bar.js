// Types example searches into any search box that lists them in data-examples,
// so shoppers see the kinds of things they can ask for. Stops while the box is
// in use, and stays still for people who ask their device for less motion.
(function(){
  var still=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  [].forEach.call(document.querySelectorAll('input[data-examples]'),function(box){
    var examples;try{examples=JSON.parse(box.getAttribute('data-examples'))}catch(e){return}
    if(!examples||!examples.length)return;
    var hint=box.getAttribute('data-hint')||'',n=0,c=0,timer=0,on=false;
    function later(f,ms){timer=setTimeout(f,ms)}
    function type(){c++;box.placeholder=examples[n].slice(0,c);if(c<examples[n].length)return later(type,55);later(clear,1600)}
    function clear(){c-=2;if(c>0){box.placeholder=examples[n].slice(0,c);return later(clear,16)}c=0;box.placeholder='';n=(n+1)%examples.length;later(type,380)}
    function start(){if(on||still)return;on=true;c=0;box.placeholder='';later(type,500)}
    function stop(){on=false;clearTimeout(timer)}
    box.addEventListener('focus',function(){stop();box.placeholder=hint});
    box.addEventListener('blur',function(){if(box.value)return;if(still)box.placeholder=examples[0];else start()});
    if(document.activeElement===box)box.placeholder=hint;else start();
  });
})();
