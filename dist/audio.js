export const AUDIO_CONFIG=Object.freeze({chantRates:[.98,.9,.84],maxSting:.49,bpm:116,musicVolume:.045});
export function distortionCurve(bounces){
 const amount=[0,9,28,48][Math.min(3,Math.max(0,bounces))];
 const curve=new Float32Array(1024);
 for(let i=0;i<curve.length;i++){const x=i*2/(curve.length-1)-1;curve[i]=amount===0?x:Math.tanh(x*(1+amount/10));}
 return curve;
}
export class ArcadeAudio {
 constructor(){
  this.enabled=false;this.scene={phase:'menu',bounces:0,paused:false};this.sources=new Set();this.step=0;this.timer=null;
  // Fetch the bundled chant early; decoding waits for the first user gesture.
  this.voiceBytes=fetch(new URL('./assets/audio/bounce-back.wav',import.meta.url)).then(r=>{if(!r.ok)throw new Error('Chant unavailable');return r.arrayBuffer();}).catch(()=>null);
 }
 async ready(){
  if(!this.context){
   const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return false;
   this.context=new Context();
   this.master=this.context.createGain();this.master.gain.value=this.enabled?.65:0;this.master.connect(this.context.destination);
   this.music=this.context.createGain();this.music.gain.value=0;
   this.warp=this.context.createWaveShaper();this.warp.oversample='2x';
   this.filter=this.context.createBiquadFilter();this.filter.type='lowpass';
   this.music.connect(this.warp);this.warp.connect(this.filter);this.filter.connect(this.master);
   this.decode=this.voiceBytes.then(bytes=>bytes?this.context.decodeAudioData(bytes.slice(0)):null).then(buffer=>{this.voice=buffer;}).catch(()=>{});
  }
  if(this.context.state==='suspended')await this.context.resume();
  await this.decode;return true;
 }
 async enable(enabled){
  this.enabled=enabled;
  if(!enabled){this.stopMusic();this.stopSources();if(this.master)this.master.gain.setValueAtTime(0,this.context.currentTime);return;}
  try{if(await this.ready()&&this.enabled){this.master.gain.setValueAtTime(.65,this.context.currentTime);this.setScene(this.scene);}}catch{}
 }
 setScene(scene){
  const changed=this.scene.phase!==scene.phase||this.scene.paused!==scene.paused;
  this.scene={...scene};if(!this.context)return;
  const level=Math.min(3,scene.bounces||0),now=this.context.currentTime;
  this.warp.curve=distortionCurve(level);
  this.filter.frequency.setTargetAtTime([4800,3300,1900,1100][level],now,.045);
  const playing=this.enabled&&!scene.paused&&['memorize','type'].includes(scene.phase);
  this.music.gain.setTargetAtTime(playing?AUDIO_CONFIG.musicVolume:0,now,.035);
  if(playing&&!this.timer)this.startMusic();else if(!playing)this.stopMusic();
  if(scene.paused||scene.phase==='menu'||scene.phase==='summary')this.stopSources();
  if(changed&&scene.phase==='pass')this.stopSources(); // Clean clears get a short, respectful sting.
 }
 track(source){this.sources.add(source);source.addEventListener('ended',()=>{this.sources.delete(source);source.disconnect();},{once:true});return source;}
 stopSources(){for(const source of this.sources){try{source.stop();}catch{}}this.sources.clear();}
 tone(frequency,start,duration,volume=.1,type='square',target=this.master,detune=0){
  const osc=this.track(this.context.createOscillator()),gain=this.context.createGain();
  osc.type=type;osc.frequency.setValueAtTime(frequency,start);osc.detune.setValueAtTime(detune,start);
  gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(volume,start+.007);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  osc.connect(gain);gain.connect(target);osc.addEventListener('ended',()=>gain.disconnect(),{once:true});osc.start(start);osc.stop(start+duration+.005);
 }
 startMusic(){
  const melody=[72,76,79,76,74,71,67,71,69,72,76,72,67,71,74,71];
  const bass=[48,48,43,43,45,45,43,43];
  this.nextBeat=this.context.currentTime+.035;
  const schedule=()=>{
   if(!this.enabled||this.scene.paused)return;
   const interval=60/AUDIO_CONFIG.bpm/2;
   while(this.nextBeat<this.context.currentTime+.12){
    const level=Math.min(3,this.scene.bounces||0),midi=melody[this.step%melody.length];
    const detune=level===0?0:Math.sin(this.step*2.3)*level*17;
    this.tone(440*2**((midi-69)/12),this.nextBeat,.095,.7,'square',this.music,detune);
    if(this.step%2===0)this.tone(440*2**((bass[(this.step/2)%bass.length]-69)/12),this.nextBeat,.17,.85,'triangle',this.music,-detune);
    this.step++;this.nextBeat+=interval;
   }
  };
  schedule();this.timer=setInterval(schedule,45);
 }
 stopMusic(){if(this.timer)clearInterval(this.timer);this.timer=null;}
 async cue(kind,bounces=0){
  if(!this.enabled)return;
  try{
   const phase=this.scene.phase;
   if(!await this.ready()||!this.enabled||this.scene.paused||this.scene.phase!==phase)return;
   const now=this.context.currentTime,level=Math.min(3,bounces);
   if(kind==='fail'){
    this.stopSources();
    // A pitch fall and glass-like transient support the spoken chant, all under 0.5s.
    const osc=this.track(this.context.createOscillator()),gain=this.context.createGain();
    osc.type='sawtooth';osc.frequency.setValueAtTime(175,now);osc.frequency.exponentialRampToValueAtTime(42,now+.19);
    gain.gain.setValueAtTime(.075,now);gain.gain.exponentialRampToValueAtTime(.0001,now+.21);
    osc.connect(gain);gain.connect(this.master);osc.addEventListener('ended',()=>gain.disconnect(),{once:true});osc.start(now);osc.stop(now+.22);
    this.tone(1840,now,.07,.035,'triangle');
    if(this.voice){
     const voice=this.track(this.context.createBufferSource()),warp=this.context.createWaveShaper(),voiceGain=this.context.createGain();
     voice.buffer=this.voice;voice.playbackRate.value=AUDIO_CONFIG.chantRates[Math.max(0,level-1)];
     warp.curve=distortionCurve(level);voiceGain.gain.value=.75;
     voice.connect(warp);warp.connect(voiceGain);voiceGain.connect(this.master);
     voice.addEventListener('ended',()=>{warp.disconnect();voiceGain.disconnect();},{once:true});
     voice.start(now);voice.stop(now+Math.min(AUDIO_CONFIG.maxSting,this.voice.duration/voice.playbackRate.value));
    }
   }else{
    const notes={start:[262,330,392],lock:[659],pass:[523,659],retry:[196,262,330]}[kind]||[330];
    notes.forEach((frequency,i)=>this.tone(frequency,now+i*.065,kind==='pass'?.12:.085,kind==='lock'?.045:.07,'triangle',this.master,level?-level*11:0));
   }
  }catch{}
 }
}
