import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
await mkdir('artifacts',{recursive:true});
const baseURL=process.env.BASE_URL || 'http://localhost:4173';
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:960},reducedMotion:'reduce'});
await context.addInitScript(()=>{
 window.chants=[];window.noteStarts=0;window.activeLoops=new Set();
 const createOscillator=AudioContext.prototype.createOscillator;
 AudioContext.prototype.createOscillator=function(...args){const source=createOscillator.apply(this,args),start=source.start.bind(source);source.start=(...args)=>{window.noteStarts++;return start(...args);};return source;};
 const create=AudioContext.prototype.createBufferSource;
 AudioContext.prototype.createBufferSource=function(...args){
  const source=create.apply(this,args),start=source.start.bind(source),stop=source.stop.bind(source);
  let record;source.start=(at,...rest)=>{window.noteStarts++;if(source.loop)window.activeLoops.add(source);source.addEventListener('ended',()=>window.activeLoops.delete(source),{once:true});if(!source.loop&&source.playbackRate.value!==1){record={duration:source.buffer?.duration,rate:source.playbackRate.value,start:at};window.chants.push(record);}return start(at,...rest);};
  source.stop=(at)=>{window.activeLoops.delete(source);if(record)record.stop=at;return stop(at);};return source;
 };
});
const page=await context.newPage();
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
await page.goto(baseURL);await page.evaluate(()=>document.fonts.ready);
await page.waitForTimeout(100);await page.screenshot({path:'artifacts/menu-desktop.png'});
assert.equal(await page.getByRole('heading',{level:1,name:'Wouncy'}).count(),1);
assert.match(await page.title(),/^Wouncy/);
assert.equal(await page.getByRole('link',{name:'Wouncy home'}).count(),1);
// Sound starts on for every visit; the same button toggles it for this visit.
await page.getByRole('button',{name:'Turn sound off'}).click();
await page.getByRole('button',{name:'how to play'}).click();
assert.equal(await page.locator('#help-dialog').evaluate(e=>e.open),true);
await page.getByRole('button',{name:'got it. let’s bounce'}).click();
await page.locator('#start-button').click();
await page.locator('.word-card').first().waitFor();
let words=await page.locator('.word-card').evaluateAll(es=>es.map(e=>e.childNodes[1].textContent));
assert.equal(words.length,3);
await page.waitForTimeout(100);await page.screenshot({path:'artifacts/memorize-desktop.png'});
await page.keyboard.press('Enter');
assert.equal(await page.locator('.word-card').count(),0);
await page.getByLabel('Type a remembered word',{exact:true}).fill(words[0].toUpperCase());
await page.keyboard.press('Space');
assert.equal(await page.locator('.recall-slot.locked').count(),1);
await page.getByLabel('Type a remembered word',{exact:true}).fill(words[1]);
await page.keyboard.press('Space');
await page.getByLabel('Type a remembered word',{exact:true}).fill(words[2]);
await page.keyboard.press('Enter');
await page.locator('#next-button').waitFor();
assert.ok((await page.locator('.result-points').innerText()).includes('points'));
await page.waitForTimeout(100);await page.screenshot({path:'artifacts/pass-desktop.png'});
if(await page.locator('#next-button').isVisible())await page.locator('#next-button').click();
await page.locator('#ready-button').waitFor();
words=await page.locator('.word-card').evaluateAll(es=>es.map(e=>e.childNodes[1].textContent));
await page.getByRole('button',{name:'okay, I’ve got them'}).click();
await page.getByLabel('Type a remembered word',{exact:true}).fill('definitelywrong');
await page.keyboard.press('Enter');await page.locator('#retry-button').waitFor();
assert.match(await page.locator('.bounce-note').innerText(),/\+5 seconds/);
assert.ok(await page.locator('.screen-cracks path').count()>0);
assert.equal(await page.locator('body').getAttribute('data-damage'),'1');
await page.waitForTimeout(100);await page.screenshot({path:'artifacts/fail-desktop.png'});
await page.keyboard.press('Enter');
assert.deepEqual(await page.locator('.word-card').evaluateAll(es=>es.map(e=>e.childNodes[1].textContent)),words);
await page.getByRole('button',{name:'okay, I’ve got them'}).click();
await page.getByLabel('Type a remembered word',{exact:true}).fill('wrongagain');await page.keyboard.press('Enter');
await page.locator('#retry-button').waitFor();assert.match(await page.locator('.bounce-note').innerText(),/\+3 seconds/);
await page.keyboard.press('Enter');await page.getByRole('button',{name:'okay, I’ve got them'}).click();
await page.getByLabel('Type a remembered word',{exact:true}).fill(words[0].slice(0,2));
await page.keyboard.press('Escape');
await page.getByRole('heading',{name:'A little breather.'}).waitFor();
const pausedTime=await page.locator('#timer-number').innerText();await page.waitForTimeout(300);
assert.equal(await page.locator('#timer-number').innerText(),pausedTime);
await page.getByRole('button',{name:'keep bouncing'}).click();
assert.equal(await page.getByLabel('Type a remembered word',{exact:true}).inputValue(),words[0].slice(0,2));
await page.getByRole('button',{name:'how to play'}).click();
assert.equal(await page.locator('#help-dialog').evaluate(e=>e.open),true);
await page.keyboard.press('Escape');
await page.waitForFunction(()=>!document.querySelector('#help-dialog').open&&!document.querySelector('.pause-panel'));
await page.getByLabel('Type a remembered word',{exact:true}).fill(words.join(' '));await page.keyboard.press('Enter');
await page.locator('#next-button').waitFor();assert.match(await page.locator('.result-subtitle').last().innerText(),/comeback bonus/);
await page.getByRole('button',{name:'finish run'}).click();
await page.getByRole('button',{name:'another round?'}).waitFor();
assert.equal(await page.locator('.summary-stats strong').first().innerText(),'2');
assert.ok(await page.evaluate(()=>Number(localStorage.getItem('wouncy-best-v3'))>0));
await page.waitForTimeout(100);await page.screenshot({path:'artifacts/summary-desktop.png'});
await page.getByRole('button',{name:'back home'}).click();await page.reload();
assert.match(await page.locator('.best-note').innerText(),/personal best/i);
assert.equal(await page.getByRole('button',{name:'Turn sound off'}).getAttribute('aria-pressed'),'true');
await page.getByRole('button',{name:'Turn sound off'}).click();await page.getByRole('button',{name:'Turn sound on'}).click();
// Responsive layout: no horizontal overflow; primary actions stay in the viewport.
for(const size of [{width:390,height:844},{width:360,height:740},{width:768,height:1024}]){
 await page.setViewportSize(size);await page.reload();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(100);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 const start=await page.locator('#start-button').boundingBox();assert.ok(start.x>=0&&start.x+start.width<=size.width);
 await page.waitForTimeout(100);await page.screenshot({path:`artifacts/menu-${size.width}.png`});
 await page.locator('#start-button').click();await page.locator('#ready-button').waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.locator('#ready-button').click();await page.locator('#word-input').waitFor();
 await page.waitForTimeout(100);await page.screenshot({path:`artifacts/recall-${size.width}.png`});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
}
// A total of three bounces ends the run, saves the score, and offers only a fresh start.
await page.setViewportSize({width:1280,height:800});
await page.evaluate(()=>localStorage.removeItem('wouncy-best-v3'));await page.goto(baseURL);
await page.locator('#start-button').click();
const firstWords=await page.locator('.word-card').evaluateAll(es=>es.map(e=>e.childNodes[1].textContent));
await page.locator('#ready-button').click();await page.locator('#word-input').fill(firstWords.join(' '));await page.keyboard.press('Enter');
await page.locator('#next-button').click();
let previousCracks=0;
for(let bounce=1;bounce<=3;bounce++){
 await page.locator('#ready-button').click();await page.locator('#word-input').fill('wrong');await page.keyboard.press('Enter');
 await page.waitForFunction(n=>window.chants.length>=n,bounce);
 const count=await page.locator('.screen-cracks path').count();assert.ok(count>previousCracks);previousCracks=count;
 assert.equal(await page.locator('.screen-cracks').getAttribute('data-bounces'),String(bounce));
 if(bounce<3){
  await page.locator('#retry-button').waitFor();
  assert.match(await page.locator('.bounce-note').innerText(),new RegExp(`${3-bounce} bounce`));
  await page.locator('#retry-button').click();
  if(bounce===2){
   const fractures=await page.locator('#screen-damage').innerHTML();
   await page.waitForFunction(()=>window.activeLoops.size===1);
   await page.locator('#pause-button').click();assert.equal(await page.locator('#screen-damage').innerHTML(),fractures);
   assert.equal(await page.evaluate(()=>window.activeLoops.size),1,'pause must keep the background music playing');
   const notesAtPause=await page.evaluate(()=>window.noteStarts);await page.waitForTimeout(250);
   assert.equal(await page.evaluate(()=>window.noteStarts),notesAtPause,'the calm pause loop must not repeatedly restart');
   await page.locator('#resume-button').click();
  }
 }
}
await page.getByRole('heading',{name:'GAME OVER.'}).waitFor();
assert.equal(await page.locator('#retry-button').count(),0);assert.equal(await page.locator('#word-input').count(),0);
assert.equal(await page.locator('.summary-stats strong').nth(1).innerText(),'3');
assert.equal(await page.locator('.summary-stats strong').first().innerText(),'1');
const score=Number((await page.locator('.summary-score').innerText()).replaceAll(',',''));
assert.ok(score>0);assert.equal(await page.evaluate(()=>Number(localStorage.getItem('wouncy-best-v3'))),score);
const chants=await page.evaluate(()=>window.chants);
assert.ok(chants[0].rate>chants[1].rate&&chants[1].rate>chants[2].rate);assert.ok(chants.every(c=>c.duration/c.rate<.5));
const notesAtGameOver=await page.evaluate(()=>window.noteStarts);await page.waitForTimeout(600);
assert.equal(await page.evaluate(()=>window.noteStarts),notesAtGameOver,'game-over audio must not repeatedly restart');
await page.screenshot({path:'artifacts/game-over-desktop.png'});
await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);await page.screenshot({path:'artifacts/game-over-mobile.png'});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await page.getByRole('button',{name:'another round?'}).click();
assert.equal(await page.locator('.stat-value').last().innerText(),'0 / 3');assert.equal(await page.locator('.screen-cracks').count(),0);
assert.equal(await page.locator('.stat-value').nth(1).innerText(),'0');await page.locator('#ready-button').waitFor();
await page.getByRole('button',{name:'Turn sound off'}).click();
assert.equal(await page.evaluate(()=>window.activeLoops.size),0,'mute must stop continuous music');
const mutedNotes=await page.evaluate(()=>window.noteStarts);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.noteStarts),mutedNotes);
assert.deepEqual(errors,[]);
console.log('Browser checks passed: full game loop, three-bounce game over, score persistence, restart, cracks, audio, pause, and responsive layouts.');
// Exercise the animated path separately from the reduced-motion game checks.
const motionContext=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'no-preference'});
const animated=await motionContext.newPage();animated.on('pageerror',e=>errors.push(e.message));
await animated.goto(baseURL);
await animated.waitForFunction(()=>document.getAnimations().some(a=>a.id.startsWith('wouncy-')));
assert.equal(await animated.locator('.wordmark-letter').count(),6);
await animated.waitForTimeout(750);
for(const selector of ['.menu .wordmark-flower','.menu .character-spark','.menu .daven-prop']){
 assert.equal(await animated.locator(selector).evaluateAll(es=>es.some(e=>getComputedStyle(e).display!=='none')),false,'removed home-page stars must stay hidden');
}
await animated.locator('.character-scene').click();
await animated.waitForFunction(()=>document.getAnimations().some(a=>a.id==='wouncy-daven-squish'));
await animated.evaluate(()=>{window.oldReactions=document.getAnimations().filter(a=>a.id==='wouncy-daven-squish');});
await animated.locator('#start-button').click();
assert.equal(await animated.evaluate(()=>window.oldReactions.every(a=>['idle','finished'].includes(a.playState))),true,'changing screens must cancel the old reaction');
const animatedWords=await animated.locator('.word-card').evaluateAll(es=>es.map(e=>e.dataset.word));
await animated.locator('#ready-button').click();await animated.locator('#word-input').fill(animatedWords[0]);await animated.keyboard.press('Space');
await animated.waitForFunction(()=>document.getAnimations().some(a=>a.id==='wouncy-word-lock'));
await animated.emulateMedia({reducedMotion:'reduce'});await animated.waitForTimeout(60);
assert.equal(await animated.evaluate(()=>document.getAnimations().some(a=>a.id.startsWith('wouncy-')&&a.playState==='running')),false,'reduced motion must cancel active UI animation');
await animated.emulateMedia({reducedMotion:'no-preference'});
await animated.locator('#word-input').fill(animatedWords.slice(1).join(' '));await animated.keyboard.press('Enter');
await animated.locator('#next-button').waitFor();await animated.waitForTimeout(700);
const earned=Number((await animated.locator('.result-points').innerText()).match(/[\d,]+/)[0].replaceAll(',',''));
assert.equal(Number((await animated.locator('.stat-value').nth(1).innerText()).replaceAll(',','')),earned,'the score animation must finish at the actual earned score');
await animated.screenshot({path:'artifacts/animated-clear.png'});
await animated.locator('#next-button').click();
for(let i=0;i<3;i++){
 await animated.locator('#ready-button').click();await animated.locator('#word-input').fill('wrong');await animated.keyboard.press('Enter');
 if(i<2)await animated.locator('#retry-button').click();
}
await animated.getByRole('heading',{name:'GAME OVER.'}).waitFor();
await animated.locator('[data-share="download"]:enabled').waitFor();
assert.equal(Number((await animated.locator('.summary-score').innerText()).replaceAll(',','')),earned,'shared results must retain the full score');
assert.equal(await animated.evaluate(()=>document.getAnimations().some(a=>a.id.startsWith('wouncy-')&&a.playState==='running')),false,'score screenshots must wait for entrance animations');
await animated.locator('#restart-button').click();await animated.emulateMedia({reducedMotion:'reduce'});
await animated.waitForTimeout(80);assert.equal(await animated.evaluate(()=>document.getAnimations().some(a=>a.id.startsWith('wouncy-')&&a.playState==='running')),false);
assert.deepEqual(errors,[]);await motionContext.close();
console.log('Animation checks passed: entrances, Daven interaction, word feedback, exact scores, screenshot readiness, teardown, and reduced-motion changes.');
await browser.close();
