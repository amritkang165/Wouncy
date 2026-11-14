import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,difficulty,CONFIG} from '../dist/engine.js';
function fixture(){let time=0;const game=new Game({now:()=>time,random:()=>.2});return{game,advance:(ms)=>{time+=ms;game.tick();}};}
test('memorize expires into recall without changing the sequence',()=>{const{game,advance}=fixture();game.start();const words=[...game.words];assert.equal(game.words.length,3);advance(15001);assert.equal(game.phase,'type');assert.deepEqual(game.words,words);assert.equal(game.remaining,21);});
test('clean clear locks words, scores points, increases multiplier and advances',()=>{const{game,advance}=fixture();game.start();game.recall();advance(3000);game.submit(game.words[0].toUpperCase());assert.equal(game.index,1);game.submit(game.words.slice(1).join('  '));assert.equal(game.phase,'pass');assert.equal(game.multiplier,1.5);assert.ok(game.score>0);assert.equal(game.history.length,1);game.next();assert.equal(game.level,2);assert.equal(game.duration,15);assert.equal(game.phase,'memorize');});
test('the first two retries preserve words and add 5s then 3s',()=>{const{game,advance}=fixture();game.start();const words=[...game.words];for(const[retry,duration]of[[1,20],[2,23]]){game.recall();game.submit('nope');assert.equal(game.phase,'fail');assert.equal(game.totalBounces,retry);game.retry();assert.deepEqual(game.words,words);assert.equal(game.duration,duration);assert.equal(game.remaining,duration);}advance(1000);assert.equal(game.remaining,22);});
test('typing timeout bounces; a comeback clear adds the comeback bonus',()=>{const{game,advance}=fixture();game.start();game.recall();advance(22000);assert.equal(game.phase,'fail');game.retry();game.recall();game.submit('wrong');game.retry();game.recall();advance(5000);game.submit(game.words.join(' '));assert.equal(game.bestComeback,2);assert.equal(game.history[0].comeback,200);assert.equal(game.multiplier,1);});
test('pause freezes timers and excludes paused time from typing speed',()=>{const{game,advance}=fixture();game.start();game.recall();advance(2000);const remaining=game.remaining;game.pause();advance(60000);assert.equal(game.remaining,remaining);assert.equal(game.phase,'type');game.resume();assert.equal(game.remaining,remaining);advance(1000);game.submit(game.words.join(' '));const expected=Math.min(180,Math.round(game.words.join('').length/5/(3/60)));assert.equal(game.history[0].wpm,expected);});
test('difficulty caps and multiplier cap keep continuous climb playable',()=>{assert.equal(difficulty(1000).count,8);assert.equal(difficulty(1000).memorize,8);const{game}=fixture();game.start();for(let i=0;i<10;i++){game.recall();game.submit(game.words.join(' '));game.next();}assert.equal(game.multiplier,CONFIG.maxMultiplier);assert.equal(game.level,11);});
test('blank submission does nothing and late correct answer still fails',()=>{const{game,advance}=fixture();game.start();game.recall();game.submit('   ');assert.equal(game.index,0);advance(21001);game.submit(game.words.join(' '));assert.equal(game.phase,'fail');});
test('finish freezes the run at summary; restart resets stats',()=>{const{game}=fixture();game.start();game.recall();game.submit('wrong');game.finish();assert.equal(game.phase,'summary');game.start();assert.equal(game.score,0);assert.equal(game.totalBounces,0);assert.equal(game.level,1);assert.deepEqual(game.history,[]);});
test('extra words cannot bypass completing the remembered set',()=>{const{game}=fixture();game.start();game.recall();game.submit(game.words.join(' ')+' extra');assert.equal(game.phase,'fail');assert.equal(game.score,0);});

test('the third miss ends the run and cannot be retried or counted twice',()=>{
 const{game,advance}=fixture();game.start();
 for(let i=1;i<=3;i++){
  game.recall();game.submit('wrong');assert.equal(game.totalBounces,i);
  if(i<3){assert.equal(game.phase,'fail');game.retry();}else{assert.equal(game.phase,'summary');assert.equal(game.gameOver,true);}
 }
 const score=game.score;game.retry();game.next();game.fail('again');advance(60000);
 assert.equal(game.phase,'summary');assert.equal(game.totalBounces,3);assert.equal(game.score,score);
});
test('a third typing timeout also ends the run',()=>{
 const{game,advance}=fixture();game.start();
 for(let i=0;i<3;i++){game.recall();advance(game.duration*1000+1);if(i<2)game.retry();}
 assert.equal(game.phase,'summary');assert.equal(game.gameOver,true);assert.equal(game.totalBounces,CONFIG.bounceLimit);
});
test('the three-bounce budget and retry bonuses carry across cleared levels',()=>{
 const{game}=fixture();game.start();game.recall();game.submit('wrong');game.retry();game.recall();game.submit(game.words.join(' '));game.next();
 assert.equal(game.totalBounces,1);assert.equal(game.bounces,0);
 game.recall();game.submit('wrong');game.retry();assert.equal(game.bonusTime,3);
 game.recall();game.submit('wrong');assert.equal(game.phase,'summary');assert.equal(game.totalBounces,3);assert.equal(game.history.length,1);assert.ok(game.score>0);
});
test('a fresh run resets game over, score, and the full three-bounce budget',()=>{
 const{game}=fixture();game.start();
 for(let i=0;i<3;i++){game.recall();game.submit('wrong');if(i<2)game.retry();}
 game.start();assert.equal(game.gameOver,false);assert.equal(game.totalBounces,0);assert.equal(game.phase,'memorize');assert.equal(game.score,0);assert.equal(game.bonusTime,0);
});

test('level score uses speed times accuracy times multiplier, plus earned bonuses',()=>{
 const{game,advance}=fixture();game.start();game.recall();advance(3000);game.submit(game.words.join(' '));
 const last=game.history.at(-1);assert.equal(last.accuracy,1);assert.equal(game.earned,Math.round(last.wpm*last.accuracy*game.multiplier)+last.wordBonus);
});
test('a clean clear waits indefinitely for an explicit next action',()=>{
 const{game,advance}=fixture();game.start();game.recall();game.submit(game.words.join(' '));
 advance(60000);assert.equal(game.phase,'pass');assert.equal(game.level,1);game.next();assert.equal(game.phase,'memorize');assert.equal(game.level,2);
});

test('opening help or hiding the tab during a clear cannot start a running level behind it',()=>{
 const{game,advance}=fixture();game.start();game.recall();game.submit(game.words.join(' '));advance(100);
 assert.equal(game.pause(),true);advance(5000);game.next();assert.equal(game.phase,'pass');game.resume();advance(60000);assert.equal(game.phase,'pass');game.next();assert.equal(game.phase,'memorize');
});
