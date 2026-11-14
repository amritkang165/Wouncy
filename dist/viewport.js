// Compact layouts do most of the work; scale only the remaining overflow.
export function createViewportFitter(app,help){
 let content=null,frame=0;
 const viewport=window.visualViewport;
 function fit(){
  const gap=parseFloat(getComputedStyle(app).getPropertyValue('--viewport-gap'))||10;
  if(content){
   const width=Math.max(1,app.clientWidth-gap*2),height=Math.max(1,app.clientHeight-gap*2);
   content.removeAttribute('data-fitted');content.style.width=`${width}px`;
   let scale=1;
   if(content.offsetHeight>height){
    // Keep the full visible width when fitting. A narrower scaled card would
    // wrap words unnecessarily and make its controls smaller than needed.
    content.setAttribute('data-fitted','');
    let low=.01,high=1;
    for(let i=0;i<9;i++){
     const candidate=(low+high)/2;content.style.width=`${width/candidate}px`;
     if(content.offsetHeight*candidate<=height)low=candidate;else high=candidate;
    }
    scale=low;content.style.width=`${width/scale}px`;
   }
   content.style.setProperty('--viewport-fit',String(scale));
  }
  if(help.open){
   const scale=Math.min(1,(document.body.clientHeight-24)/help.offsetHeight,(innerWidth-24)/help.offsetWidth);
   help.style.setProperty('--dialog-fit',String(Math.max(.01,scale)));
  }
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;fit();});}
 function resize(){
  // A keyboard can resize only the visual viewport. Pinch zoom should still
  // enlarge the interface, so never counteract it by shrinking the layout.
  if(viewport&&Math.abs(viewport.scale-1)<.01){
   document.documentElement.style.setProperty('--viewport-height',`${viewport.height}px`);
   document.documentElement.style.setProperty('--viewport-top',`${viewport.offsetTop}px`);
  }
  schedule();
 }
 const observer=new ResizeObserver(schedule);observer.observe(app);observer.observe(help);
 window.addEventListener('resize',resize);
 viewport?.addEventListener('resize',resize);
 viewport?.addEventListener('scroll',resize);
 resize();
 document.fonts.ready.then(schedule);
 return element=>{
  if(content)observer.unobserve(content);
  content=element;observer.observe(content);fit();
 };
}
