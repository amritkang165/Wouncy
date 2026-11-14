import { Game, CONFIG } from './engine.js';
import { screenCracks } from './damage.js';
const $ = (selector) => document.querySelector(selector);
const app = $('#app');
const game = new Game();
const help = $('#help-dialog');
let drawnPhase = '', drawnPause = false, fieldValue = '', frame = 0, returnFocus = null, helpPaused = false;
let best = 0;
try { best = Number(localStorage.getItem('bounce-back-best')) || 0; } catch {}
let soundOn = false, audio = null;
try { soundOn = localStorage.getItem('bounce-back-sound') === 'true'; } catch {}
const soundButton = $('#sound-button');
function updateSound() {
 soundButton.setAttribute('aria-pressed',String(soundOn));
 soundButton.setAttribute('aria-label',soundOn?'Turn sound off':'Turn sound on');
 soundButton.querySelector('span').textContent=soundOn?'sound on':'sound off';
 soundButton.querySelector('path').setAttribute('d',soundOn?'M11 5 6 9H3v6h3l5 4V5Zm5 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14':'M11 5 6 9H3v6h3l5 4V5Zm5 4 5 6m0-6-5 6');
}
function playSound(kind) {
 if(!soundOn)return;
 try {
  if(!audio)audio=new (window.AudioContext||window.webkitAudioContext)();
  if(audio.state==='suspended')audio.resume();
  const notes={start:[262,330,392],lock:[523],pass:[392,523,659,784],fail:[247,196,147],retry:[196,262,330],tick:[440]}[kind]||[330];
  notes.forEach((frequency,index)=>{
   const osc=audio.createOscillator(), gain=audio.createGain(), start=audio.currentTime+index*.075;
   osc.type=kind==='fail'?'triangle':'sine';osc.frequency.setValueAtTime(frequency,start);
   gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.065,start+.012);gain.gain.exponentialRampToValueAtTime(.001,start+.13);
   osc.connect(gain);gain.connect(audio.destination);osc.start(start);osc.stop(start+.15);
  });
 }catch{}
}
soundButton.addEventListener('click',()=>{soundOn=!soundOn;try{localStorage.setItem('bounce-back-sound',String(soundOn));}catch{}updateSound();if(soundOn)playSound('start');});
updateSound();
const iconArrow='<span aria-hidden="true">↗</span>';

function aside(message) { return `<div class="daven-aside"><img src="assets/daven.webp" alt="Daven, your hedgehog cheerleader"><p><small>Daven says</small>${message}</p></div>`; }
function menu() {
 return `<section class="menu" aria-label="Welcome to Bounce Back"><div class="little-label">a memory typing arcade</div><div class="hero"><div class="hero-copy"><h1 class="title"><span>BOUNCE</span><span class="second-line">BACK</span><i class="title-spark" aria-hidden="true">✳</i></h1><p class="tagline">A little memory. A little typing.<br>A whole lot of <strong>second chances.</strong></p></div><div class="character-scene"><span class="character-spark" aria-hidden="true">✧</span><span class="speech">you’ve got this.<br>probably.<span></span></span><img class="daven-main" src="assets/daven.webp" alt="Daven, a friendly orange hedgehog"><div class="character-shadow"></div><span class="character-spark two" aria-hidden="true">✦</span></div></div><div class="start-area"><button class="primary-button" id="start-button">let’s bounce ${iconArrow}</button><p class="keyboard-note">or press <kbd>enter ↵</kbd> to jump in</p></div><div class="steps-strip" aria-label="How it works"><div class="mini-step"><span class="step-number">1</span><div><strong>memorize.</strong><small>give those words a good look.</small></div></div><span class="step-arrow" aria-hidden="true">→</span><div class="mini-step"><span class="step-number">2</span><div><strong>type it back.</strong><small>same words. same order.</small></div></div><span class="step-arrow" aria-hidden="true">↶</span><div class="mini-step"><span class="step-number">3</span><div><strong>miss? bounce back.</strong><small>try again with a little more time.</small></div></div></div><p class="best-note">${best?'your personal best: '+best.toLocaleString()+' ✦':'no game overs. just comebacks.'}</p></section>`;
}
function scoreboard() {
 return `<div class="scoreboard" aria-label="Run statistics"><div class="stat"><span class="stat-label">level</span><span class="stat-value">${String(game.level).padStart(2,'0')}</span></div><div class="stat"><span class="stat-label">score</span><span class="stat-value">${game.score.toLocaleString()}</span></div><div class="stat"><span class="stat-label">multiplier</span><span class="stat-value">${game.multiplier}<small>×</small></span></div><div class="stat"><span class="stat-label">bounces</span><span class="stat-value">${game.totalBounces}<small> ↶</small></span></div></div>${game.bounces?`<div class="bounce-status" role="status"><span class="bounce-tier ${game.bounces===1?'current':''}">01 · +5s · cracked</span><span class="bounce-tier ${game.bounces===2?'current':''}">02 · +3s · distorted</span><span class="bounce-tier ${game.scuffed?'current':''}">03+ · +0s · SCUFFED</span></div>`:''}`;
}
function timer() { return `<div class="timer-row" role="timer" aria-label="${game.scuffed?'Shared time for memorizing and typing':'Time remaining'}"><div class="timer-track"><div class="timer-fill" id="timer-fill"></div></div><span class="timer-number" id="timer-number"></span></div>`; }
function gameScreen() {
 const phase=game.phase;
 let content='',message='';
 if(phase==='memorize') {
  content=`<div class="phase-label"><span class="step-dot"></span>01 / take a little look</div><h1 class="game-title">Make a little room in your brain.</h1><p class="game-description">Remember these ${game.words.length} words. Keep them in order.</p>${timer()}<div class="word-field ${game.level>=4?'drifting':''}">${game.words.map((w,i)=>`<div class="word-card" style="--i:${i}"><span class="word-order">${i+1}</span>${w}</div>`).join('')}</div><button class="secondary-button" id="ready-button">okay, I’ve got them <span aria-hidden="true">↵</span></button><div class="board-hint">${game.bounces>=3?'Scuffed bounce · looking uses your typing time. Hide the words when you’re ready.':game.bounces?'Same words. A little more breathing room.':'Take your time. Well, some of it.'}</div>`;
  message=game.bounces===0?'Just a few words. What could possibly go wrong?':game.bounces===1?'A fresh start. Same words. You know the drill.':game.bounces===2?'Okay, this is officially a comeback story.':'Still here? I like your spirit. Watch that clock!';
 } else if(phase==='type') {
  content=`<div class="phase-label"><span class="step-dot"></span>02 / over to you</div><h1 class="game-title">Out of sight. Still in mind?</h1><p class="game-description">Type the words in the same order. Space or Enter locks each one.</p>${timer()}<div class="recall-slots" id="recall-slots">${slots()}</div><form class="input-wrap" id="word-form"><label class="sr-only" for="word-input">Type the next word</label><input id="word-input" class="word-input" type="text" placeholder="first word goes here…" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" aria-describedby="type-hint" maxlength="160"><button class="submit-button" type="submit" aria-label="Submit word">↵</button></form><div class="board-hint" id="type-hint">${game.scuffed?'SCUFFED · no timer refill · ':''}word <span id="word-progress">${game.index+1}</span> of ${game.words.length} · you’ve got this.</div>`;
  message='I’m not saying anything. This is your big moment.';
 } else if(phase==='pass') {
  const last=game.history.at(-1);
  content=`<div class="result-icon" aria-hidden="true">✳</div><div class="phase-label">level ${String(game.level).padStart(2,'0')} cleared</div><h1 class="game-title">${game.bounces>=2?'What a comeback!':game.bounces?'There you go!':'Look at you go!'}</h1><p class="result-subtitle">${game.bounces>=2?'You got knocked back. You came back stronger.':game.bounces?'A little persistence goes a long way.':'Clean clear. A tiny round of applause.'}</p><div class="result-points">+${game.earned.toLocaleString()} points <span aria-hidden="true">✦</span></div><div class="result-subtitle">${last.wpm} wpm · ${game.multiplier}× multiplier${last.comeback?' · +'+last.comeback+' comeback bonus':''}</div><button class="secondary-button" id="next-button" style="margin-top:23px">next little challenge <span aria-hidden="true">→</span></button><div class="board-hint">press Enter to keep climbing</div>`;
  message=game.bounces>=2?'I never doubted you. Okay, maybe a tiny bit.':'Nicely done. Let’s pretend I’m not impressed.';
 } else {
  const bonus=CONFIG.bounceBonuses[Math.min(game.bounces-1,2)];
  content=`<div class="result-icon" aria-hidden="true">↶</div><div class="phase-label">a detour, not a dead end</div><h1 class="game-title">BOUNCE BACK.</h1><p class="result-subtitle">${game.reason}<br>Let’s give those words another go.</p><div class="result-words" aria-label="The correct sequence">${game.words.map((w,i)=>`<span class="result-word ${i===game.index?'missed-word':''}">${i+1}. ${w}</span>`).join('')}</div><button class="primary-button" id="retry-button">one more bounce <span aria-hidden="true">↶</span></button><div class="bounce-note">${bonus?'+'+bonus+' seconds to memorize':'SCUFFED BOUNCE · +0 seconds · one clock to look and type'} · same words · level ${game.level}</div><div class="board-hint">press Enter to try again</div>`;
  message=game.bounces===1?'That was just a warm-up. Obviously.':game.bounces===2?'Third time’s the charm. That’s a real thing, right?':'At this point, I’m emotionally invested.';
 }
 return `<section class="game-shell bounce-${Math.min(game.bounces,3)}"><div class="game-topline"><span class="run-label"><span class="live-dot"></span>continuous climb</span><div class="pause-controls">${['memorize','type'].includes(phase)?'<button id="pause-button" aria-label="Pause game">Ⅱ pause</button>':''}<button id="finish-button">finish run ↗</button></div></div>${scoreboard()}<div class="game-board ${phase==='fail'?'result-board fail-board':phase==='pass'?'result-board':''}">${content}${game.paused?pauseMarkup():''}</div>${aside(message)}</section>`;
}
function slots(){return game.words.map((_,i)=>`<span class="recall-slot ${i<game.index?'locked':i===game.index?'active':''}">${i<game.index?game.locked[i]+' <span class="tick" aria-hidden="true">✓</span>':i===game.index?'?':String(i+1).padStart(2,'0')}</span>`).join('');}
function pauseMarkup(){return '<div class="pause-panel" role="region" aria-label="Game paused"><img src="assets/daven.webp" alt=""><h2>A little breather.</h2><p>Your words and your time will be right here.</p><button class="primary-button" id="resume-button">keep bouncing <span>↗</span></button><button class="text-button" id="paused-finish">finish this run</button></div>';}
function summary(){
 const record=game.score>0&&game.score>=best;
 return `<section class="summary"><div class="game-board"><div class="phase-label">a good place to land</div><h2>${game.history.length?'That’s a good little run.':'Every start is something.'}</h2><p class="game-description">${game.bestComeback>=2?'You turned a few setbacks into a pretty great comeback.':'A little wiser. Ready for another bounce?'}</p><div class="summary-score">${game.score.toLocaleString()}</div><div class="summary-best">${record?'✦ a new personal best! ✦':best?'personal best: '+best.toLocaleString():'your first adventure is in the books.'}</div><div class="summary-stats"><div><strong>${game.history.length}</strong><span>LEVELS CLEARED</span></div><div><strong>${game.totalBounces}</strong><span>TOTAL BOUNCES</span></div><div><strong>${game.bestComeback}</strong><span>BEST COMEBACK</span></div></div>${game.history.length?'<div class="summary-history" aria-label="Level results">'+game.history.map(h=>`<div class="history-row"><span>level ${String(h.level).padStart(2,'0')}</span><span>${h.bounces===0?'✦ clean clear':h.bounces+' bounce'+(h.bounces===1?'':'s')}</span><span>+${h.points.toLocaleString()}</span></div>`).join('')+'</div>':''}<div class="summary-actions"><button class="primary-button" id="restart-button">another round? <span aria-hidden="true">↶</span></button><button class="text-button" id="home-button">back home</button></div></div>${aside(game.totalBounces?'The important thing? You kept coming back.':'Same time, same tiny brain? I’ll be here.')}</section>`;
}
function render(force=false){
 if(!force&&drawnPhase===game.phase&&drawnPause===game.paused)return;
 const last=drawnPhase; drawnPhase=game.phase;drawnPause=game.paused;
 const damage=['menu','summary'].includes(game.phase)?0:Math.min(3,game.bounces);
 document.body.dataset.damage=damage;
 $('#screen-damage').innerHTML=screenCracks(damage);
 document.body.classList.toggle('impact',game.phase==='fail');
 app.innerHTML=game.phase==='menu'?menu():game.phase==='summary'?summary():gameScreen();
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
  if(game.phase==='pass'){playSound('pass');confetti();}
  if(game.phase==='fail')playSound('fail');
  if(!['type','menu'].includes(game.phase)&&!game.paused)app.focus({preventScroll:true});
 }
 updateTimer();
}
function start(){fieldValue='';game.start();playSound('start');render();}
function recall(){game.recall();fieldValue='';render();}
function retry(){fieldValue='';game.retry();playSound('retry');render();}
function next(){fieldValue='';game.next();playSound('start');render();}
function submit(){
 if(game.phase!=='type'||game.paused)return;
 const input=$('#word-input');const value=input.value;if(!value.trim())return;
 const before=game.index;game.submit(value);fieldValue='';input.value='';
 if(game.phase!=='type'){render();return;}
 if(game.index>before){playSound('lock');$('#recall-slots').innerHTML=slots();$('#word-progress').textContent=game.index+1;input.placeholder='next word…';}
}
function finish(){game.finish();if(game.score>best){best=game.score;try{localStorage.setItem('bounce-back-best',String(best));}catch{}}render();}
function pause(){const input=$('#word-input');if(input)fieldValue=input.value;game.pause();render();}
function resume(){game.resume();render();}
function updateTimer(){
 const number=$('#timer-number'), fill=$('#timer-fill');if(!number||!fill)return;
 number.textContent=game.remaining.toFixed(1)+'s';fill.style.transform=`scaleX(${game.fraction})`;
 number.parentElement.classList.toggle('urgent',game.remaining<3);
}
function openHelp(){
 returnFocus=document.activeElement;helpPaused=game.pause();render();help.showModal();
}
function closeHelp(){help.close();}
$('#help-button').addEventListener('click',openHelp);
$('#close-help').addEventListener('click',closeHelp);
$('#got-it').addEventListener('click',closeHelp);
help.addEventListener('close',()=>{if(helpPaused){game.resume();render();}helpPaused=false;if(returnFocus?.isConnected)returnFocus.focus();else if(game.phase==='type')$('#word-input')?.focus();});
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
document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();}});
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
