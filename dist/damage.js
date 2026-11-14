// Stable, cumulative fractures: retries and pause redraws never reroll the glass.
export function fracturePaths(bounces) {
 const severity=Math.max(0,Math.floor(Number.isFinite(bounces)?bounces:0));
 if(!severity)return [];
 let seed=7391;
 const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const paths=[];
 const impacts=[[22,330,0],[978,730,Math.PI],[570,18,Math.PI/2]];
 for(let impact=0;impact<severity;impact++){
  // Spread later impacts around all four edges instead of stopping at bounce three.
  const position=100+(((impact-3)*.61803398875+.18)%1)*800;
  const extraImpacts=[[position,982,-Math.PI/2],[18,position,0],[982,position,Math.PI],[position,18,Math.PI/2]];
  const[cx,cy,direction]=impacts[impact]||extraImpacts[(impact-3)%4];
  for(let ray=0;ray<6;ray++){
   const angle=direction+(ray-2.5)*.45;
   let x=cx,y=cy;
   let path=`M${x} ${y}`;
   for(let step=0;step<5;step++){
    const distance=17+random()*28;
    x+=Math.cos(angle+(random()-.5)*.6)*distance;
    y+=Math.sin(angle+(random()-.5)*.6)*distance;
    path+=` L${x.toFixed(1)} ${y.toFixed(1)}`;
    if(step===1||step===3){
     const branchAngle=angle+(ray%2?1:-1)*(.7+random()*.5);
     const length=17+random()*24;
     paths.push(`M${x.toFixed(1)} ${y.toFixed(1)} l${(Math.cos(branchAngle)*length).toFixed(1)} ${(Math.sin(branchAngle)*length).toFixed(1)}`);
    }
   }
   paths.push(path);
  }
 }
 return paths;
}
export function screenCracks(bounces){
 const paths=fracturePaths(bounces).map(d=>`<path d="${d}" vector-effect="non-scaling-stroke"/>`).join('');
 return paths?`<svg class="screen-cracks severity-${Math.min(3,bounces)}" data-bounces="${bounces}" style="opacity:${Math.min(.94,.5+bounces*.07)};--crack-width:${Math.min(2,1.1+bounces*.05)}" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true"><g class="fracture-shadow">${paths}</g><g class="fracture-light" transform="translate(1 -1)">${paths}</g></svg>`:'';
}
