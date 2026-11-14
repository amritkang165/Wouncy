import { Game, CONFIG } from './engine.js';
import { screenCracks } from './damage.js';
import { ArcadeAudio } from './audio.js';
import { mountCompanion } from './companion.js';
import { shareControls, mountSharing } from './sharing.js';
import { createViewportFitter } from './viewport.js';
import { mountMovingWords } from './movement.js';
const $ = (selector) => document.querySelector(selector);
const app = $('#app');
const game = new Game();
const help = $('#help-dialog');
const fitScreen=createViewportFitter(app,help);
let drawnPhase = '', drawnPause = false, fieldValue = '', frame = 0, returnFocus = null, helpPaused = false;
let disposeCompanion=()=>{},disposeSharing=()=>{},disposeMovement=()=>{};
let movingWords=true,movementPositions=[];
try{movingWords=localStorage.getItem('wouncy-moving-words')!=='false';}catch{}
let best = 0;
try { best = Number(localStorage.getItem('bounce-back-best-v2')) || 0; } catch {}
let soundOn = true;
const audioDirector=new ArcadeAudio();
const soundButton = $('#sound-button');
function updateSound() {
 soundButton.setAttribute('aria-pressed',String(soundOn));
 soundButton.setAttribute('aria-label',soundOn?'Turn sound off':'Turn sound on');
 soundButton.querySelector('span').textContent=soundOn?'sound on':'sound off';
 soundButton.querySelector('path').setAttribute('d',soundOn?'M11 5 6 9H3v6h3l5 4V5Zm5 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14':'M11 5 6 9H3v6h3l5 4V5Zm5 4 5 6m0-6-5 6');
}
function syncAudio(){audioDirector.setScene({phase:game.phase,bounces:game.totalBounces||0,paused:game.paused,hidden:document.hidden,help:help.open});}
function playSound(kind) { audioDirector.cue(kind,game.totalBounces||0); }
soundButton.addEventListener('click',()=>{soundOn=!soundOn;updateSound();audioDirector.enable(soundOn).then(()=>{if(soundOn)playSound('start');});});
updateSound();
const iconArrow='<span aria-hidden="true">↗</span>';

const DAVEN={welcome:['daven-excited.webp','Daven welcoming you','✦'],think:['daven.webp','Daven pondering the words','···'],focus:['haven-hedgehog.webp','Daven typing along','⌨'],bounce:['daven.webp','Daven bouncing back','↶'],celebrate:['daven-excited.webp','Daven celebrating your clear','✦'],rest:['daven.webp','Daven taking a breather','z z'],guide:['haven-hedgehog.webp','Daven showing you the ropes','!'],proud:['daven-excited.webp','Daven cheering for your run','★']};
function mascot(action,extra='') { const [file,label,prop]=DAVEN[action];return `<div class="daven-stage daven-${action} ${extra}" role="img" aria-label="${label}"><span class="daven-prop" aria-hidden="true">${prop}</span><img src="assets/${file}" alt="" draggable="false"><span class="daven-ground" aria-hidden="true"></span></div>`; }
function aside(message,action) { return `<div class="daven-aside">${mascot(action)}<p><small>Daven · ${action==='think'?'thinking cap on':action==='focus'?'quietly rooting for you':action==='bounce'?'comeback coach':action==='celebrate'?'your biggest fan':'in your corner'}</small>${message}</p></div>`; }
function personalBest(extra='',record=false){return `<div class="personal-best ${extra} ${record?'is-record':''}" aria-label="Personal best: ${best.toLocaleString()} points"><span class="best-badge-star" aria-hidden="true">★</span><span><small>${record?'new personal best':'personal best'}</small><strong>${best.toLocaleString()}<span> pts</span></strong></span></div>`;}
function menu() {
 return `<section class="menu" aria-label="Welcome to Wouncy">
  <div class="menu-banner"><span class="little-label"><span class="label-flower" aria-hidden="true">✳</span> a memory typing arcade</span><label class="motion-option"><input id="moving-words" type="checkbox" ${movingWords?'checked':''}><span>moving words<small>from level 4 · respects reduced motion</small></span></label></div>
  <div class="hero"><div class="hero-copy">
   <h1 class="title wouncy-title" aria-label="Wouncy"><span>w<span class="wouncy-o">o</span>uncy</span><span class="wordmark-flower" aria-hidden="true">✳</span></h1>
   <p class="tagline">Give your brain <strong>a little bounce.</strong></p>
   <div class="start-area"><button class="primary-button" id="start-button">let’s bounce ${iconArrow}</button>${best?personalBest("best-note"):'<p class="keyboard-note">press <kbd>enter ↵</kbd> to jump in</p>'}</div>
  </div><div class="character-scene">
   <span class="speech">you’ve got this.<br><em>probably.</em></span>
   <span class="character-spark" aria-hidden="true">✧</span>
   <span class="floating-word word-one" aria-hidden="true"><small>01</small> remember</span>
   <span class="floating-word word-two" aria-hidden="true"><small>02</small> wouncy</span>
   ${mascot("welcome","daven-hero")}
   <span class="character-spark two" aria-hidden="true">✦</span>
   <span class="character-name"><span aria-hidden="true">↖</span> daven, your comeback coach</span>
  </div></div>
  <div class="steps-strip" aria-label="How it works">
   <div class="mini-step"><span class="step-number">01</span><div><strong>memorize.</strong><small>give those words a good look.</small></div><span class="step-doodle" aria-hidden="true">✧</span></div>
   <span class="step-arrow" aria-hidden="true">→</span>
   <div class="mini-step"><span class="step-number">02</span><div><strong>type it back.</strong><small>same words. any order.</small></div><span class="step-doodle" aria-hidden="true">⌨</span></div>
   <span class="step-arrow" aria-hidden="true">↶</span>
   <div class="mini-step"><span class="step-number">03</span><div><strong>miss? bounce back.</strong><small>three bounces. then game over.</small></div><span class="step-doodle" aria-hidden="true">↶</span></div>
  </div>
  ${best?'':'<p class="best-note"><span aria-hidden="true">✦</span> three bounces. make them count. <span aria-hidden="true">✦</span></p>'}
 </section>`;
}
function scoreboard() {
 return `<div class="scoreboard" aria-label="Run statistics"><div class="stat"><span class="stat-label">level</span><span class="stat-value">${String(game.level).padStart(2,'0')}</span></div><div class="stat"><span class="stat-label">score</span><span class="stat-value">${game.score.toLocaleString()}</span></div><div class="stat"><span class="stat-label">multiplier</span><span class="stat-value">${game.multiplier}<small>×</small></span></div><div class="stat"><span class="stat-label">bounces</span><span class="stat-value">${game.totalBounces}<small> / ${CONFIG.bounceLimit}</small></span></div></div>${game.totalBounces?`<div class="bounce-status" role="status"><span class="bounce-tier ${game.totalBounces===1?'current':''}">01 · +5s · cracked</span><span class="bounce-tier ${game.totalBounces===2?'current':''}">02 · +3s · distorted</span><span class="bounce-tier ${game.gameOver?'current':''}">03 · GAME OVER</span></div>`:''}`;
}
function timer() { return `<div class="timer-caption"><span>${game.phase==='memorize'?'A MOMENT TO REMEMBER':'TIME TO TYPE IT BACK'}</span><span>${CONFIG.bounceLimit-game.totalBounces} bounce${CONFIG.bounceLimit-game.totalBounces===1?'':'s'} left</span></div><div class="timer-row" role="timer" aria-label="Time remaining"><div class="timer-track"><div class="timer-fill" id="timer-fill"></div></div><span class="timer-number" id="timer-number"></span></div>`; }
function gameScreen() {
 const phase=game.phase;
 let content='',message='';
 if(phase==='memorize') {
  content=`<div class="phase-label"><span class="step-dot"></span>01 / ${movingWords&&game.settings.movementSpeed?'words on the move':'take a little look'}</div><h1 class="game-title">A little room in your brain.</h1><p class="game-description">Remember these ${game.words.length} words. Any order works.</p>${timer()}<div class="word-field ${movingWords&&game.settings.movementSpeed?'moving-words':''}">${game.words.map((w,i)=>`<div class="word-cell"><div class="word-card ${w===game.specialWord?'special-word':''}" data-word="${w}" style="--i:${i}"><span class="word-order" aria-hidden="true">${w===game.specialWord?'★':'•'}</span>${w}${w===game.specialWord?'<span class="word-bonus">★ +50 if first</span>':''}</div></div>`).join('')}</div><button class="secondary-button" id="ready-button">okay, I’ve got them <span aria-hidden="true">↵</span></button><div class="board-hint">★ Type the highlighted word first for +${CONFIG.firstWordBonus} points.${game.bounces?' Same words, another chance.':''}</div>`;
  message=game.bounces===0?'Just a few words. What could possibly go wrong?':game.bounces===1?'A fresh start. Same words. You know the drill.':game.bounces===2?'Okay, this is officially a comeback story.':'Still here? I like your spirit. Watch that clock!';
 } else if(phase==='type') {
  content=`<div class="phase-label"><span class="step-dot"></span>02 / over to you</div><h1 class="game-title">Out of sight. Still in mind?</h1><p class="game-description">Type any remembered word. Space or Enter locks each one.</p>${timer()}<div class="recall-slots" id="recall-slots">${slots()}</div><form class="input-wrap" id="word-form"><label class="sr-only" for="word-input">Type a remembered word</label><input id="word-input" class="word-input" type="text" placeholder="any word goes here…" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" aria-describedby="type-hint" maxlength="160"><button class="submit-button" type="submit" aria-label="Submit word">↵</button></form><div class="board-hint" id="type-hint"><span id="word-progress">${game.index}</span> of ${game.words.length} words locked · any order<span id="bonus-progress">${game.wordBonus?' · ★ +'+game.wordBonus+' on clear':''}</span></div>`;
  message='I’m not saying anything. This is your big moment.';
 } else if(phase==='pass') {
  const last=game.history.at(-1);
  content=`<div class="result-icon" aria-hidden="true">✳</div><div class="phase-label">level ${String(game.level).padStart(2,'0')} cleared</div><h1 class="game-title">${game.bounces>=2?'What a comeback!':game.bounces?'There you go!':'Look at you go!'}</h1><p class="result-subtitle">${game.bounces>=2?'You got knocked back. You came back stronger.':game.bounces?'A little persistence goes a long way.':'Clean clear. A tiny round of applause.'}</p><div class="result-points">+${game.earned.toLocaleString()} points <span aria-hidden="true">✦</span></div><div class="result-subtitle">${last.wpm} wpm · ${Math.round(last.accuracy*100)}% accuracy · ${game.multiplier}× multiplier${last.comeback?' · +'+last.comeback+' comeback bonus':''}${last.wordBonus?' · ★ +'+last.wordBonus+' first-word bonus':''}</div><button class="secondary-button" id="next-button" style="margin-top:23px">next little challenge <span aria-hidden="true">→</span></button><div class="board-hint">take a breather · press Enter or the button when you’re ready</div>`;
  message=game.bounces>=2?'I never doubted you. Okay, maybe a tiny bit.':'Nicely done. Let’s pretend I’m not impressed.';
 } else {
  const bonus=CONFIG.bounceBonuses[game.totalBounces-1];
  content=`<div class="result-icon" aria-hidden="true">↶</div><div class="phase-label">a detour, not a dead end</div><h1 class="game-title">BOUNCE BACK.</h1><p class="result-subtitle">${game.reason}<br>Let’s give those words another go.</p><div class="result-words" aria-label="The words to remember">${game.words.map((w,i)=>`<span class="result-word ${!game.locked.includes(w)?'missed-word':''}">${w}</span>`).join('')}</div><button class="primary-button" id="retry-button">one more bounce <span aria-hidden="true">↶</span></button><div class="bounce-note">+${bonus} seconds to memorize · ${CONFIG.bounceLimit-game.totalBounces} bounce${CONFIG.bounceLimit-game.totalBounces===1?'':'s'} left</div><div class="board-hint">press Enter to try again</div>`;
  message=game.bounces===1?'That was just a warm-up. Obviously.':game.bounces===2?'Third time’s the charm. That’s a real thing, right?':'At this point, I’m emotionally invested.';
 }
 return `<section class="game-shell bounce-${Math.min(game.bounces,3)}"><div class="game-topline"><span class="run-label"><span class="live-dot"></span>continuous climb</span><div class="pause-controls">${['memorize','type'].includes(phase)?'<button id="pause-button" aria-label="Pause game">Ⅱ pause</button>':''}<button id="finish-button">finish run ↗</button></div></div>${scoreboard()}<div class="game-board ${phase==='fail'?'result-board fail-board':phase==='pass'?'result-board':''}">${content}${game.paused?pauseMarkup():''}</div>${aside(message,game.paused?"rest":({memorize:"think",type:"focus",fail:"bounce",pass:"celebrate"}[phase]))}</section>`;
}
function slots(){return game.words.map((_,i)=>`<span class="recall-slot ${i<game.index?'locked':i===game.index?'active':''} ${i<game.index&&game.locked[i]===game.specialWord?'bonus-locked':''}">${i<game.index?game.locked[i]+' <span class="tick" aria-hidden="true">✓</span>':i===game.index?'?':'·'}</span>`).join('');}
function pauseMarkup(){return `<div class="pause-panel" role="region" aria-label="Game paused">${mascot("rest")}<h2>A little breather.</h2><p>Your words and your time will be right here.</p><button class="primary-button" id="resume-button">keep bouncing <span>↗</span></button><button class="text-button" id="paused-finish">finish this run</button></div>`;}
function summary(){
 const record=game.score>0&&game.score>=best;
 return `<section class="summary ${game.gameOver?'game-over':''}"><div class="game-board"><div class="summary-heading">${game.gameOver?'<div class="summary-brand">wouncy <span>by Team Pheonix</span></div>':''}${mascot(game.gameOver?"rest":"proud","daven-summary")}<div class="phase-label">${game.gameOver?'no bounces left':'a good place to land'}</div><h2>${game.gameOver?'GAME OVER.':game.history.length?'That’s a good little run.':'Every start is something.'}</h2><p class="game-description">${game.gameOver?'Three bounces used. Take a breath, then try a fresh run.':game.bestComeback>=2?'You turned a few setbacks into a pretty great comeback.':'A little wiser. Ready for another bounce?'}</p></div><div class="summary-result"><div class="summary-score">${game.score.toLocaleString()}</div>${best?personalBest("summary-best",record):'<div class="summary-best">your first adventure is in the books.</div>'}<div class="summary-stats"><div><strong>${game.history.length}</strong><span>LEVELS CLEARED</span></div><div><strong>${game.totalBounces}</strong><span>TOTAL BOUNCES</span></div><div><strong>${game.bestComeback}</strong><span>BEST COMEBACK</span></div>${game.gameOver?'<div><strong>'+game.level+'</strong><span>LAST LEVEL</span></div>':''}</div></div>${game.history.length?'<div class="summary-history" aria-label="Level results">'+game.history.map(h=>`<div class="history-row"><span>level ${String(h.level).padStart(2,'0')}</span><span>${h.bounces===0?'✦ clean clear':h.bounces+' bounce'+(h.bounces===1?'':'s')}</span><span>+${h.points.toLocaleString()}</span></div>`).join('')+'</div>':''}<div class="summary-actions"><button class="primary-button" id="restart-button">another round? <span aria-hidden="true">↶</span></button><button class="text-button" id="home-button">back home</button></div></div>${game.gameOver?shareControls():''}</section>`;
}
function render(force=false){
 if(!force&&drawnPhase===game.phase&&drawnPause===game.paused)return;
 const last=drawnPhase; drawnPhase=game.phase;drawnPause=game.paused;
 if(game.phase==='summary')saveBest();
 const damage=game.phase==='menu'||(game.phase==='summary'&&!game.gameOver)?0:game.totalBounces;
 syncAudio();
 document.body.dataset.damage=Math.min(3,damage);
 document.body.dataset.phase=game.phase;
 $('#screen-damage').innerHTML=screenCracks(damage);
 document.body.classList.toggle('impact',game.phase==='fail'||(game.phase==='summary'&&game.gameOver));
 disposeCompanion();disposeCompanion=()=>{};disposeSharing();disposeSharing=()=>{};disposeMovement();disposeMovement=()=>{};
 app.innerHTML='<div class="viewport-content">'+(game.phase==='menu'?menu():game.phase==='summary'?summary():gameScreen())+'</div>';
 fitScreen(app.firstElementChild);
 if(game.phase==='summary'&&game.gameOver)disposeSharing=mountSharing($('.summary'),{score:game.score,level:game.level,cleared:game.history.length});
 if(game.phase==='menu')disposeCompanion=mountCompanion($('.menu'));
 if(game.phase==='memorize'&&movingWords&&game.settings.movementSpeed)disposeMovement=mountMovingWords($('.word-field'),{speed:game.settings.movementSpeed,paused:game.paused,positions:movementPositions});
 $('#moving-words')?.addEventListener('change',event=>{movingWords=event.target.checked;try{localStorage.setItem('wouncy-moving-words',String(movingWords));}catch{}});
 if(game.phase==='type'&&!game.paused){const input=$('#word-input');input.value=fieldValue;input.focus({preventScroll:true});}
 if(game.paused&&!help.open)$('#resume-button')?.focus({preventScroll:true});
 $('#start-button')?.addEventListener('click',start);
 $('#restart-button')?.addEventListener('click',start);
 $('#ready-button')?.addEventListener('click',recall);
 $('#retry-button')?.addEventListener('click',retry);
 $('#next-button')?.addEventListener('click',next);
 $('#home-button')?.addEventListener('click',()=>{game.phase='menu';render();});
 $('#finish-button')?.addEventListener('click',finish);
 $('#paused-finish')?.addEventListener('click',finish);
 $('#pause-button')?.addEventListener('click',pause);
 $('#resume-button')?.addEventListener('click',resume);
 $('#word-form')?.addEventListener('submit',event=>{event.preventDefault();submit();});
 $('#word-input')?.addEventListener('input',event=>{fieldValue=event.target.value;});
 $('#word-input')?.addEventListener('keydown',event=>{if(event.key===' '&&!event.isComposing){event.preventDefault();submit();}});
 if(last!==game.phase){
  if(game.phase==='type')playSound('recall');
  if(game.phase==='pass'){playSound('pass');confetti();}
  if(game.phase==='fail'||(game.phase==='summary'&&game.gameOver))playSound('fail');
  if(!['type','menu'].includes(game.phase)&&!game.paused)app.focus({preventScroll:true});
 }
 updateTimer();
}
function start(){audioDirector.enable(soundOn);movementPositions=[];fieldValue='';game.start();render();playSound('start');}
function recall(){game.recall();fieldValue='';render();}
function retry(){movementPositions=[];fieldValue='';game.retry();render();playSound('retry');}
function next(){movementPositions=[];fieldValue='';game.next();render();playSound('start');}
function submit(){
 if(game.phase!=='type'||game.paused)return;
 const input=$('#word-input');const value=input.value;if(!value.trim())return;
 const before=game.index;game.submit(value);fieldValue='';input.value='';
 if(game.phase!=='type'){render();return;}
 if(game.index>before){playSound('lock');$('#recall-slots').innerHTML=slots();$('#word-progress').textContent=game.index;$('#bonus-progress').textContent=game.wordBonus?' · ★ +'+game.wordBonus+' on clear':'';input.placeholder='another word…';}
}
function saveBest(){if(game.score>best){best=game.score;try{localStorage.setItem('bounce-back-best-v2',String(best));}catch{}}}
function finish(){game.finish();render();playSound('finish');}
function pause(){const input=$('#word-input');if(input)fieldValue=input.value;game.pause();render();}
function resume(){game.resume();render();}
function updateTimer(){
 const number=$('#timer-number'), fill=$('#timer-fill');if(!number||!fill)return;
 number.textContent=game.remaining.toFixed(1)+'s';fill.style.transform=`scaleX(${game.fraction})`;
 number.parentElement.classList.toggle('urgent',game.remaining<3);
}
function openHelp(){
 returnFocus=document.activeElement;helpPaused=game.pause();render();help.showModal();syncAudio();
}
function closeHelp(){help.close();}
$('#help-button').addEventListener('click',openHelp);
$('#close-help').addEventListener('click',closeHelp);
$('#got-it').addEventListener('click',closeHelp);
help.addEventListener('close',()=>{if(helpPaused){game.resume();render();}helpPaused=false;syncAudio();if(returnFocus?.isConnected)returnFocus.focus();else if(game.phase==='type')$('#word-input')?.focus();});
help.addEventListener('click',event=>{if(event.target===help){const rect=help.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)help.close();}});
$('.brand').addEventListener('click',event=>{event.preventDefault();if(!['menu','summary'].includes(game.phase))finish();else{game.phase='menu';render();}});
document.addEventListener('keydown',event=>{
 if(event.isComposing||help.open||event.repeat)return;
 if(event.key==='Escape'&&['memorize','type'].includes(game.phase)){event.preventDefault();game.paused?resume():pause();return;}
 if(event.key!=='Enter'||event.target.closest('button,a,input'))return;
 event.preventDefault();
 if(game.paused){resume();return;}
 if(game.phase==='menu'||game.phase==='summary')start();
 else if(game.phase==='memorize')recall();else if(game.phase==='fail')retry();else if(game.phase==='pass')next();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();syncAudio();});
// Unlock only after a real gesture; the current sound toggle always wins.
document.addEventListener('pointerdown',()=>audioDirector.enable(soundOn),{once:true});
document.addEventListener('keydown',()=>audioDirector.enable(soundOn),{once:true});
function confetti(){
 if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const container=$('#particles');
 for(let i=0;i<30;i++){
  const particle=document.createElement('i');particle.className='particles';
  const angle=Math.PI*2*i/30;const length=120+Math.random()*210;
  particle.style.cssText=`background:${['#df541d','#c4c83e','#ebc359','#829b52'][i%4]};--x:${Math.cos(angle)*length}px;--y:${Math.sin(angle)*length+100}px;--r:${Math.random()*600}deg;animation-delay:${Math.random()*.1}s`;
  container.append(particle);setTimeout(()=>particle.remove(),1600);
 }
}
function loop(){game.tick();render();if(++frame%2===0)updateTimer();requestAnimationFrame(loop);}
render();requestAnimationFrame(loop);
