// Gameplay tuning. The user-requested three-bounce run limit overrides unlimited PRD retries.
export const CONFIG=Object.freeze({
 startTime:15,timeStep:2,minTime:4,
 bounceBonuses:Object.freeze([5,3]),bounceLimit:3,
 maxWords:8,maxMultiplier:3,streakStep:.5,
 typingBase:12,typingPerWord:3,comebackPerBounce:100,
 passFlashMs:850,maxScoringWpm:180
});
export function difficulty(level){
 const count=Math.min(CONFIG.maxWords,3+Math.floor((level-1)/2));
 return{count,pool:level<4?'easy':level<8?'medium':'hard',memorize:Math.max(CONFIG.minTime,CONFIG.startTime-(level-1)*CONFIG.timeStep),typeTime:CONFIG.typingBase+count*CONFIG.typingPerWord};
}
