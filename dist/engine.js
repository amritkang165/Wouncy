import {CONFIG,difficulty} from './config.js';
import {RULES_VERSION,newSeed,seededRandom} from './rules.js';
export {CONFIG,difficulty} from './config.js';
export {RULES_VERSION} from './rules.js';
const RUN_FIELDS='rulesVersion seed mode level score streak multiplier totalBounces livesRemaining bestComeback history paused gameOver settings bounces bonusTime words specialWord phase index locked wordBonus duration started deadline typingStarted pausedAt earned resultAt reason'.split(' ');
export const WORDS = {
 easy:'sun moss leaf pond frog fern moon star seed rain bird nest twig fish cloud peach apple clover honey acorn berry creek bloom petal snail river maple grass stone sprout dream cozy warm glow soft happy tiny home jump bounce green orange yellow garden daisy tulip robin wren plum pear cherry hazel pine mint sage root bark wood tree rose lily hill lake brook camp tent kite wind wave sand shell beach coral whale otter fox bear deer hare mouse mole duck swan dove owl goat sheep lamb calf horse pony sheepdog cat dog bee moth wing ant bug worm beetle log path trail boot sock hat coat scarf mitt cake bread toast jam pie milk tea cup mug pot pan bowl spoon fork book page pen ink note song tune bell drum hum smile laugh wish hope hug nap rest dawn dusk day night light dark blue pink gold red brown snow frost ice dew drop pool splash hop skip roll run walk step climb sit sleep wake play game friend heart luck charm spark blush brush crunch crisp fluff puff fluffball nut bun fig melon grape lemon lime mango apricot oat wheat corn rice bean pea'.split(' '),
 medium:'meadow mushroom sunshine autumn firefly picnic flutter adventure whisper forest blanket pumpkin blossom squirrel rainbow sparkle daydream campfire waterfall lantern wildflower cinnamon chestnut hillside raindrop feather butterfly hummingbird evergreen marigold woodland starlight moonbeam sunrise sunset pebble skipping jumping bouncing wander wonder gentle giggle wobble tumble twinkle ribbon pocket doodle puddle breezy sleepy curious playful cheerful hopeful fearless little golden silver cloudy sunny morning evening midnight afternoon breakfast backpack notebook teacup cookie cupcake pancake waffles cocoa honeycomb blueberry strawberry raspberry gooseberry cranberry orchard harvest hedgehog sparrow swallow dragonfly ladybird grasshopper caterpillar turtle rabbit badger beaver raccoon chipmunk porcupine cricket cicada tadpole ladybug maplewood driftwood snowdrop bluebell foxglove dandelion lavender rosemary sunflower magnolia jasmine gardenia petunia begonia anemone buttercup snowflake snowball snowman rainbow acorncap treasure journey compass footsteps treehouse hammock laughter kindness patience courage memory remember forget return again'.split(' '),
 hard:'resilience kaleidoscope chrysanthemum serendipity perseverance extraordinary constellation phosphorescent bittersweet effervescent unforgettable misadventure imagination metamorphosis magnificent rambunctious tranquil curiosity possibility indestructible adventurous spectacular whimsical wonderstruck fluorescent luminescence bioluminescent incandescent iridescent quintessential extraordinary spontaneous exuberance rejuvenation rejuvenate opportunity determination accomplishment anticipation celebration appreciation consideration concentration contemplation coordination collaboration companionship compassion conscientious consciousness creativity confidence continuity conversation curiosity delightful dependable destination development difference discovery encouragement enthusiastic environmental equilibrium exceptional experience exploration fascination flourishing forgiveness friendship generosity gratitude harmonious happiness heartwarming hibernation imagination independent inspiration intentional intermission introspection invincible juxtaposition knowledgeable lighthearted mischievous moonlighting mysterious naturalistic neighborhood nevertheless omnipotent optimistic overjoyed overwhelming particularly peppermint perspective picturesque playground pomegranate precipitation progressively punctuation radiantly reconciliation recollection reflection rejuvenating remarkable remembrance resourceful restorative resurrection reverberation revolutionary ridiculous scintillating shimmering silhouetted simultaneous spellbinding storytelling strengthened subconscious sunshine surprising sustainable symmetrical tangerine tenderness thunderstorm togetherness transformation translucent unbelievable unpredictable untamable wholehearted wilderness wonderful'.split(' ')
};
export class Game {
 constructor({random,now=()=>performance.now()}={}) { this.randomOverride=random; this.now=now; this.phase='menu'; this.paused=false; }
 start({seed=newSeed(),mode='solo'}={}) {
  if(!['solo','daily','duel'].includes(mode))throw new Error('Unknown game mode');
  for(const key of RUN_FIELDS)delete this[key];
  Object.assign(this,{rulesVersion:RULES_VERSION,seed:String(seed),mode,level:1,score:0,streak:0,multiplier:1,totalBounces:0,livesRemaining:CONFIG.bounceLimit,bestComeback:0,history:[],paused:false,gameOver:false});this.newLevel();
 }
 get bounceBudget(){return this.totalBounces+this.livesRemaining;}
 get damage(){return Math.max(0,CONFIG.bounceLimit-this.livesRemaining);}
 snapshot(){return structuredClone(Object.fromEntries(RUN_FIELDS.filter(k=>this[k]!==undefined).map(k=>[k,this[k]])));}
 // Only restore trusted state with the same clock; persisted servers inject Date.now.
 restore(snapshot){
  if(snapshot?.rulesVersion!==RULES_VERSION)throw new Error('Unsupported run version');
  for(const key of RUN_FIELDS)delete this[key];
  for(const key of RUN_FIELDS)if(Object.hasOwn(snapshot,key))this[key]=structuredClone(snapshot[key]);
  return this;
 }
 newLevel() {
  const d=difficulty(this.level); this.settings=d; this.bounces=0; this.bonusTime=0;
  const random=this.randomOverride||seededRandom(`${this.rulesVersion}:${this.seed}:${this.level}`);
  this.words=[];let hardWords=0;
  for(let i=0;i<d.count;i++){
   const roll=random();let pool=roll<d.poolWeights.hard?'hard':roll<d.poolWeights.hard+d.poolWeights.medium?'medium':'easy';
   if(pool==='hard'&&hardWords>=d.maxHardWords)pool='medium';
   const available=[...new Set(WORDS[pool])].filter(w=>!this.words.includes(w)&&w.length<=d.maxWordLength);
   this.words.push(available[Math.floor(random()*available.length)]);if(pool==='hard')hardWords++;
  }
  this.specialWord=this.words[Math.floor(random()*this.words.length)];
  this.beginMemorize();
 }
 beginMemorize() {
  this.phase='memorize'; this.index=0; this.locked=[];this.wordBonus=0;
  this.duration=this.settings.memorize+this.bonusTime;
  this.started=this.now(); this.deadline=this.started+this.duration*1000;
 }

 get remaining() { return Math.max(0,(this.deadline-(this.paused?this.pausedAt:this.now()))/1000); }
 get fraction() { return Math.min(1,this.remaining/this.duration); }
 recall() {
  if(this.phase!=='memorize'||this.paused)return;
  this.phase='type';
  this.duration=this.settings.typeTime;this.started=this.now();this.deadline=this.started+this.duration*1000;
  this.typingStarted=this.now();
 }
 submit(value) {
  if(this.phase!=='type'||this.paused)return false;
  if(this.remaining<=0){this.fail('The clock got there first.');return false;}
  const parts=value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if(!parts.length)return false;
  if(parts.length>this.words.length-this.index){this.fail('A few extra words snuck in.');return false;}
  for(const word of parts){
   if(!this.words.includes(word)) { this.fail('That word wasn’t on the list.'); return false; }
   if(this.locked.includes(word)) { this.fail('That word is already locked in. Each word counts once.'); return false; }
   if(this.index===0&&word===this.specialWord)this.wordBonus=CONFIG.firstWordBonus;
   this.locked.push(word); this.index++;
   if(this.index===this.words.length){ this.pass(); return true; }
  }
  return true;
 }
 pass() {
  const seconds=Math.max(1,(this.now()-this.typingStarted)/1000);
  const wpm=Math.min(CONFIG.maxScoringWpm,Math.round(this.words.join('').length/5/(seconds/60)));
  if(this.bounces===0){this.streak++;this.multiplier=Math.min(CONFIG.maxMultiplier,1+this.streak*CONFIG.streakStep);}else{this.streak=0;this.multiplier=1;}
  const comeback=this.bounces>=2?this.bounces*CONFIG.comebackPerBounce:0;
  const accuracy=this.locked.length/this.words.length;
  this.earned=Math.round(wpm*accuracy*this.multiplier)+comeback+this.wordBonus;
  this.score+=this.earned; this.bestComeback=Math.max(this.bestComeback,this.bounces);
  this.history.push({level:this.level,words:[...this.words],bounces:this.bounces,points:this.earned,wpm,accuracy,comeback,wordBonus:this.wordBonus});
  this.phase='pass'; this.resultAt=this.now();
 }
 fail(reason) {
  if(!['memorize','type'].includes(this.phase)||this.paused)return;
  this.reason=reason;this.bounces++;this.totalBounces++;this.livesRemaining--;this.streak=0;this.multiplier=1;this.resultAt=this.now();
  this.gameOver=this.livesRemaining<=0;
  this.phase=this.gameOver?'summary':'fail';
 }
 retry() {
  if(this.phase!=='fail')return;
  this.bonusTime+=CONFIG.bounceBonuses[this.totalBounces-1];
  this.beginMemorize();

 }
 next() { if(this.phase!=='pass'||this.paused)return;this.level++;this.newLevel(); }
 tick(){
  if(this.paused)return;
  if(this.phase==='memorize'&&this.remaining<=0){const ended=this.deadline;this.recall();this.started=this.typingStarted=ended;this.deadline=ended+this.duration*1000;}
  if(this.phase==='type'&&this.remaining<=0)this.fail('The clock got there first.');
 }
 pause(){if(!['memorize','type','pass'].includes(this.phase)||this.paused)return false;this.paused=true;this.pausedAt=this.now();return true;}
 resume(){if(!this.paused)return;const delta=this.now()-this.pausedAt;this.deadline+=delta;this.started+=delta;if(this.phase==='type')this.typingStarted+=delta;if(this.phase==='pass')this.resultAt+=delta;this.paused=false;}
 finish(){if(this.paused)this.resume();this.phase='summary';}
}
