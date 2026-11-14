export const AUDIO_CONFIG=Object.freeze({chantRates:[.98,.9,.84],maxSting:.49,musicVolume:.18});
const FILES={menu:'singularity-calm.mp3',game:'singularity-focus.mp3',start:'start.wav',lock:'lock.wav',recall:'recall.wav',pass:'clear.wav',retry:'retry.wav',finish:'finish.wav',voice:'bounce-back.wav'};
export function distortionCurve(bounces){
 const amount=[0,9,28,48][Math.min(3,Math.max(0,bounces))];
 const curve=new Float32Array(1024);
 for(let i=0;i<curve.length;i++){const x=i*2/(curve.length-1)-1;curve[i]=amount===0?x:Math.tanh(x*(1+amount/10));}
 return curve;
}
export class ArcadeAudio {
 constructor(){
  this.enabled=false;this.scene={phase:'menu',bounces:0,paused:false};this.sources=new Set();this.buffers={};this.revision=0;this.offset=0;
  this.bytes=Object.fromEntries(Object.entries(FILES).map(([key,file])=>[key,fetch(new URL('./assets/audio/'+file,import.meta.url)).then(r=>r.ok?r.arrayBuffer():null).catch(()=>null)]));
 }
 async ready(){
  if(!this.context){
   const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return false;
   this.context=new Context();
   this.master=this.context.createGain();this.master.gain.value=this.enabled?.65:0;this.master.connect(this.context.destination);
   this.music=this.context.createGain();this.music.gain.value=AUDIO_CONFIG.musicVolume;
   this.warp=this.context.createWaveShaper();this.warp.oversample='2x';
   this.filter=this.context.createBiquadFilter();this.filter.type='lowpass';
   this.music.connect(this.warp);this.warp.connect(this.filter);this.filter.connect(this.master);
   // Each file can fail independently without preventing play.
   this.loading=Object.fromEntries(Object.entries(this.bytes).map(([key,promise])=>[key,(async()=>{
    try{
     const bytes=await promise;if(bytes)this.buffers[key]=await this.context.decodeAudioData(bytes);
     if(key==='menu'||key==='game')this.setScene(this.scene);
    }catch{}
   })()]));
  }
  if(this.context.state==='suspended')await this.context.resume();
  return true;
 }
 async enable(enabled){
  this.enabled=enabled;
  if(!enabled){this.revision++;this.stopMusic();this.stopSources();if(this.master)this.master.gain.setValueAtTime(0,this.context.currentTime);return;}
  try{if(await this.ready()&&this.enabled){this.master.gain.setValueAtTime(.65,this.context.currentTime);this.setScene(this.scene);}}catch{}
 }
 setScene(scene){
  const changed=this.scene.phase!==scene.phase||this.scene.paused!==scene.paused||this.scene.hidden!==scene.hidden||this.scene.help!==scene.help;
  if(changed){this.revision++;this.stopSources();}
  this.scene={...scene};if(!this.context)return;
  const level=['menu','summary'].includes(scene.phase)?0:Math.min(3,scene.bounces||0),now=this.context.currentTime;
  this.warp.curve=distortionCurve(level);
  this.filter.frequency.setTargetAtTime([7500,4500,2800,1800][level],now,.045);
  const key=['menu','summary'].includes(scene.phase)?'menu':'game';
  if(this.musicKey!==key){this.stopMusic();this.offset=0;this.musicKey=key;}
  const playing=this.enabled&&!scene.hidden;
  this.music.gain.setTargetAtTime(playing?AUDIO_CONFIG.musicVolume:0,now,.02);
  if(playing&&!this.musicSource)this.startMusic();else if(!playing)this.stopMusic();
 }
 startMusic(){
  const buffer=this.buffers[this.musicKey];if(!buffer)return;
  const source=this.context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(this.music);
  this.musicSource=source;this.musicStarted=this.context.currentTime;
  source.addEventListener('ended',()=>source.disconnect(),{once:true});source.start(0,this.offset%buffer.duration);
 }
 stopMusic(){
  if(!this.musicSource)return;
  this.offset=(this.offset+this.context.currentTime-this.musicStarted)%this.musicSource.buffer.duration;
  this.musicSource.stop();this.musicSource=null;
 }
 track(source){this.sources.add(source);source.addEventListener('ended',()=>{this.sources.delete(source);source.disconnect();},{once:true});return source;}
 stopSources(){for(const source of this.sources){try{source.stop();}catch{}}this.sources.clear();}
 sample(key,volume=.3){
  const buffer=this.buffers[key];if(!buffer)return;
  const source=this.track(this.context.createBufferSource()),gain=this.context.createGain();source.buffer=buffer;
  gain.gain.value=volume;source.connect(gain);gain.connect(this.master);
  source.addEventListener('ended',()=>gain.disconnect(),{once:true});source.start();
 }
 async cue(kind,bounces=0){
  if(!this.enabled)return;
  const revision=this.revision;
  try{
   if(!await this.ready())return;
   await this.loading[kind==='fail'?'voice':kind];
   if(!this.enabled||this.scene.paused||this.scene.hidden||this.scene.help||revision!==this.revision)return;
   if(kind!=='fail'){this.sample(kind,kind==='lock'?.22:.32);return;}
   this.stopSources();
   const buffer=this.buffers.voice;if(!buffer)return;
   const now=this.context.currentTime,level=Math.min(3,bounces);
   const voice=this.track(this.context.createBufferSource()),warp=this.context.createWaveShaper(),gain=this.context.createGain();
   voice.buffer=buffer;voice.playbackRate.value=AUDIO_CONFIG.chantRates[Math.max(0,level-1)];
   warp.curve=distortionCurve(level);gain.gain.value=.75;
   voice.connect(warp);warp.connect(gain);gain.connect(this.master);
   voice.addEventListener('ended',()=>{warp.disconnect();gain.disconnect();},{once:true});
   voice.start(now);voice.stop(now+Math.min(AUDIO_CONFIG.maxSting,buffer.duration/voice.playbackRate.value));
  }catch{}
 }
}
