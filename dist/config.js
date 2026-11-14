// Gameplay tuning. The user-requested three-bounce run limit overrides unlimited PRD retries.
export const CONFIG=Object.freeze({
 startTime:15,timeStep:2,minTime:4,
 bounceBonuses:Object.freeze([5,3]),bounceLimit:3,
 maxWords:8,maxMultiplier:3,streakStep:.5,
 typingBase:12,typingPerWord:3,comebackPerBounce:100,firstWordBonus:50,
 maxScoringWpm:180,
 movementStartLevel:4,movementSpeed:18,movementStep:3,maxMovementSpeed:36
});
export function difficulty(level){
 const count=Math.min(CONFIG.maxWords,3+Math.floor((level-1)/2));
 const movementSpeed=level<CONFIG.movementStartLevel?0:Math.min(CONFIG.maxMovementSpeed,CONFIG.movementSpeed+Math.floor((level-CONFIG.movementStartLevel)/2)*CONFIG.movementStep);
 return{count,pool:level<4?'easy':level<8?'medium':'hard',memorize:Math.max(CONFIG.minTime,CONFIG.startTime-(level-1)*CONFIG.timeStep),typeTime:CONFIG.typingBase+count*CONFIG.typingPerWord,movementSpeed};
}
