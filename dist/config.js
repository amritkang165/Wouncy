// Gameplay tuning. The user-requested three-bounce run limit overrides unlimited PRD retries.
export const CONFIG=Object.freeze({
 startTime:15,timeStep:1,timeStepLevels:4,minTime:8,wordStepLevels:4,
 bounceBonuses:Object.freeze([5,3]),bounceLimit:3,
 maxWords:8,maxMultiplier:3,streakStep:.5,
 typingBase:12,typingPerWord:3,comebackPerBounce:100,firstWordBonus:50,
 maxScoringWpm:180,
 movementStartLevel:4,movementSpeed:18,movementStep:2,movementStepLevels:4,maxMovementSpeed:30
});
export function difficulty(level){
 const count=Math.min(CONFIG.maxWords,3+Math.floor((level-1)/CONFIG.wordStepLevels));
 const movementSpeed=level<CONFIG.movementStartLevel?0:Math.min(CONFIG.maxMovementSpeed,CONFIG.movementSpeed+Math.floor((level-CONFIG.movementStartLevel)/CONFIG.movementStepLevels)*CONFIG.movementStep);
 // Count, time, vocabulary, and motion change on separate steps.
 const hard=level<19?0:Math.min(.7,.1+Math.floor((level-19)/4)*.1);
 const medium=level<7?0:Math.min(1-hard,.15+Math.floor((level-7)/4)*.15);
 return{count,poolWeights:{easy:1-medium-hard,medium,hard},maxHardWords:level<23?1:CONFIG.maxWords,maxWordLength:level<23?12:24,
  memorize:Math.max(CONFIG.minTime,CONFIG.startTime-Math.max(0,Math.floor((level-2)/CONFIG.timeStepLevels))*CONFIG.timeStep),typeTime:CONFIG.typingBase+count*CONFIG.typingPerWord,movementSpeed};
}
