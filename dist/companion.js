// A small, bounded pointer reaction layered over Daven's original idle animation.
export function mountCompanion(menu){
 const scene=menu.querySelector('.character-scene');
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 const mouse=matchMedia('(hover: hover) and (pointer: fine)');
 const controller=new AbortController(),options={signal:controller.signal};
 let reaction=null;
 let frame=0,previous=0,current=[0,0,0,0],target=[0,0,0,0];
 const clamp=value=>Math.max(-1,Math.min(1,value));
 function paint(){
  scene.style.setProperty('--look-x',`${current[0].toFixed(3)}px`);
  scene.style.setProperty('--look-y',`${current[1].toFixed(3)}px`);
  scene.style.setProperty('--look-tilt',`${current[2].toFixed(3)}deg`);
  scene.style.setProperty('--curiosity',current[3].toFixed(4));
 }
 function step(time){
  frame=0;
  const ease=1-Math.exp(-Math.min(64,time-(previous||time-16))/75);previous=time;
  let moving=false;
  current=current.map((value,i)=>{const delta=target[i]-value;if(Math.abs(delta)<.001)return target[i];moving=true;return value+delta*ease;});
  paint();if(moving)frame=requestAnimationFrame(step);else previous=0;
 }
 function aim(values){target=values;if(!frame)frame=requestAnimationFrame(step);}
 function reset(){aim([0,0,0,0]);scene.classList.remove('daven-delighted');}
 function stop(){reaction?.cancel();reaction=null;cancelAnimationFrame(frame);frame=0;previous=0;current=target=[0,0,0,0];paint();scene.classList.remove('daven-delighted');}
 function move(event){
  if(event.pointerType!=='mouse'||motion.matches||!mouse.matches||document.hidden||document.querySelector('dialog[open]'))return;
  const rect=scene.getBoundingClientRect(),dx=event.clientX-(rect.left+rect.width/2),dy=event.clientY-(rect.top+rect.height/2);
  const x=clamp(dx/320),y=clamp(dy/260),near=Math.max(0,1-Math.hypot(dx/(rect.width*.75),dy/(rect.height*.8)));
  aim([x*14,y*8,x*4,near]);
 }
 menu.addEventListener('pointermove',move,options);
 menu.addEventListener('pointerleave',reset,options);
 scene.addEventListener('pointerdown',event=>{
  if(event.pointerType!=='mouse'||motion.matches||!mouse.matches)return;
  scene.classList.remove('daven-delighted');
  reaction?.cancel();
  reaction=scene.querySelector('.daven-hero img').animate([
   {scale:'1'},{scale:'1.1 .88',offset:.24},{scale:'.95 1.08',offset:.55},{scale:'1.03 .98',offset:.8},{scale:'1'}
  ],{duration:620,easing:'cubic-bezier(.22,1,.36,1)'});
  reaction.id='wouncy-daven-squish';
  reaction.finished.catch(()=>{});
  scene.classList.add('daven-delighted');
 },options);
 scene.addEventListener('animationend',event=>{if(event.animationName==='daven-sparkle')scene.classList.remove('daven-delighted');},options);
 window.addEventListener('blur',stop,options);
 window.addEventListener('scroll',reset,{...options,passive:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();},options);
 document.querySelector('#help-button').addEventListener('click',stop,options);
 motion.addEventListener('change',stop,options);mouse.addEventListener('change',stop,options);
 return()=>{controller.abort();stop();};
}
