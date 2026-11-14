// Finite UI motion. Every screen owns its animations and cancels them on teardown.
export function mountScreenMotion(root,{phase,paused,gameOver=false,score=0,previousScore=0}){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const controller=new AbortController(),options={signal:controller.signal};
 const animations=new Set(),frames=new Set(),restore=[];
 let disposed=false;
 const spring='cubic-bezier(.22,1,.36,1)';
 function animate(element,keyframes,timing={}){
  if(!element||disposed||paused||reduced.matches||document.hidden)return;
  const animation=element.animate(keyframes,{duration:420,easing:spring,...timing});
  animation.id='wouncy-'+(timing.id||'entrance');animations.add(animation);
  animation.finished.then(()=>animations.delete(animation),()=>animations.delete(animation));
  return animation;
 }
 function enter(element,delay=0,distance=10){
  animate(element,[{opacity:0,translate:`0 ${distance}px`},{opacity:1,translate:'0 0'}],{delay,fill:'backwards'});
 }
 function frame(callback){const id=requestAnimationFrame(time=>{frames.delete(id);if(!disposed)callback(time);});frames.add(id);}
 function count(element,from,to,prefix='',suffix=''){
  if(!element||from===to||paused||reduced.matches||document.hidden)return;
  const text=element.firstChild;if(text?.nodeType!==Node.TEXT_NODE)return;
  const final=text.textContent;restore.push(()=>{text.textContent=final;});
  element.setAttribute('aria-label',final.trim());let started;
  function tick(time){
   started??=time;const progress=Math.min(1,(time-started)/550),ease=1-(1-progress)**3;
   text.textContent=prefix+Math.round(from+(to-from)*ease).toLocaleString()+suffix;
   if(progress<1)frame(tick);else text.textContent=final;
  }
  frame(tick);
 }
 function stop(){
  animations.forEach(animation=>animation.cancel());animations.clear();
  frames.forEach(cancelAnimationFrame);frames.clear();restore.forEach(reset=>reset());restore.length=0;
 }
 reduced.addEventListener('change',()=>{if(reduced.matches)stop();},options);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();},options);
 if(!paused&&!reduced.matches&&!document.hidden){
  if(phase==='menu'){
   enter(root.querySelector('.menu-banner'),30,7);
   root.querySelectorAll('.wordmark-letter').forEach((letter,index)=>{
    animate(letter,[{opacity:0,translate:'0 19px',scale:'.9 1.12'},{opacity:1,translate:'0 -4px',scale:'1.03 .98',offset:.72},{opacity:1,translate:'0 0',scale:'1'}],{delay:70+index*45,duration:560,fill:'backwards',id:'letter'});
   });
   enter(root.querySelector('.tagline'),190);enter(root.querySelector('.start-area'),260);
   enter(root.querySelector('.character-scene'),170,14);
   root.querySelectorAll('.mini-step').forEach((step,index)=>enter(step,300+index*65,8));
  }else{
   root.querySelectorAll('.stat').forEach((stat,index)=>enter(stat,index*35,6));
   enter(root.querySelector('.game-board'),30,9);enter(root.querySelector('.daven-aside'),100,8);
   enter(root.querySelector('.share-panel'),150,8);
   count(root.querySelectorAll('.stat-value')[1],Math.min(previousScore,score),score);
   if(phase==='pass'){
    const points=root.querySelector('.result-points');
    count(points,0,Number(points?.textContent.match(/[\d,]+/)?.[0].replaceAll(',','')||0),'+',' points ');
    animate(root.querySelector('.result-icon'),[{scale:'.6',rotate:'-30deg'},{scale:'1.12',rotate:'7deg',offset:.7},{scale:'1',rotate:'0deg'}],{duration:540,id:'celebrate'});
   }
   if(phase==='summary'&&!gameOver)count(root.querySelector('.summary-score'),0,score);
  }
 }
 return{
  ready:Promise.allSettled([...animations].map(animation=>animation.finished)),
  lockWord(element){
   animate(element,[{translate:'0 0',scale:'1'},{translate:'0 -5px',scale:'1.07',offset:.4},{translate:'0 0',scale:'1'}],{duration:360,id:'word-lock'});
  },
  dispose(){disposed=true;stop();controller.abort();}
 };
}
