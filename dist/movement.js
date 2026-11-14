// Each word has a roomy cell: bouncing inside it keeps every word readable,
// including its bonus badge, without collisions or cards covering each other.
export function mountMovingWords(field,{speed,paused,positions}){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const cells=[...field.children];
 let particles=[],frame=0,previous=0,disposed=false;
 function measure(){
  particles=cells.map((cell,i)=>{
   const card=cell.firstElementChild;
   const badge=card.querySelector('.word-bonus');
   const extra=badge?Math.max(0,badge.offsetTop+badge.offsetHeight-card.offsetHeight):0;
   const extraX=badge?Math.max(0,(badge.offsetWidth-card.offsetWidth)/2):0;
   const maxX=Math.max(0,Math.min(card.offsetLeft,cell.clientWidth-card.offsetLeft-card.offsetWidth)-extraX-2);
   const maxY=Math.max(0,Math.min(card.offsetTop,cell.clientHeight-card.offsetTop-card.offsetHeight-extra)-2);
   const saved=positions[i];
   const angle=.6+i*2.4;
   return{card,maxX,maxY,x:(saved?.x||0)*maxX,y:(saved?.y||0)*maxY,
    vx:saved?.vx??Math.cos(angle),vy:saved?.vy??Math.sin(angle)};
  });
  paint();
 }
 function paint(){
  particles.forEach((p,i)=>{
   p.card.style.translate=reduced.matches?'0px 0px':`${p.x}px ${p.y}px`;
   positions[i]={x:p.maxX?p.x/p.maxX:0,y:p.maxY?p.y/p.maxY:0,vx:p.vx,vy:p.vy};
  });
 }
 function tick(now){
  const dt=previous?Math.min((now-previous)/1000,.04):0;previous=now;
  for(const p of particles){
   p.x+=p.vx*speed*dt;p.y+=p.vy*speed*dt;
   for(const [axis,bound,velocity]of[['x','maxX','vx'],['y','maxY','vy']]){
    if(p[axis]>p[bound]){p[axis]=p[bound];p[velocity]=-Math.abs(p[velocity]);}
    if(p[axis]<-p[bound]){p[axis]=-p[bound];p[velocity]=Math.abs(p[velocity]);}
   }
  }
  paint();frame=requestAnimationFrame(tick);
 }
 function sync(){
  cancelAnimationFrame(frame);previous=0;
  const running=!paused&&!document.hidden&&!reduced.matches;
  field.dataset.motionState=running?'moving':reduced.matches?'reduced':'paused';
  paint();if(running)frame=requestAnimationFrame(tick);
 }
 const observer=new ResizeObserver(measure);
 cells.forEach(cell=>observer.observe(cell));
 reduced.addEventListener('change',sync);
 document.addEventListener('visibilitychange',sync);
 measure();sync();
 document.fonts.ready.then(()=>{if(!disposed)measure();});
 return()=>{
  disposed=true;cancelAnimationFrame(frame);observer.disconnect();
  reduced.removeEventListener('change',sync);
  document.removeEventListener('visibilitychange',sync);
 };
}
