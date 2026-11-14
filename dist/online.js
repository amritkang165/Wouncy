import {Game,RULES_VERSION} from './engine.js';

export const API='https://wouncy-api.wouncy.workers.dev';
let guest=null;
try{guest=JSON.parse(localStorage.getItem('wouncy-guest'));}catch{}
export const guestName=()=>guest?.player?.name||'';
export async function api(path,data){
 const response=await fetch(API+path,{method:data===undefined?'GET':'POST',headers:{...(data===undefined?{}:{'Content-Type':'application/json'}),...(guest?.token?{Authorization:'Bearer '+guest.token}:{})},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(12000)});
 const result=await response.json();if(!response.ok)throw new Error(result.error||'Online service unavailable.');return result;
}
export async function signIn(name,active=()=>true){
 const result=await api('/session',{name});if(!active())return null;
 guest=result;try{localStorage.setItem('wouncy-guest',JSON.stringify(guest));}catch{}return guest;
}
// The server owns the clock, answers and score. This object only paints its state.
export class OnlineGame extends Game {
 constructor(result,{change,error}={}){super();this.change=change;this.error=error;this.offset=0;this.apply(result);this.now=()=>Date.now()+this.offset;}
 apply(result){
  if(result.revision<this.revision)return;
  if(result.state.rulesVersion!==RULES_VERSION)throw new Error('Please reload Wouncy for the latest game rules.');
  this.offset=result.serverTime-Date.now();this.restore(result.state);this.runId=result.runId;this.seq=result.seq;this.revision=result.revision;this.ranked=true;
 }
 async send(kind,value){
  if(this.pending){if(['pause','resume','finish'].includes(kind)){this.afterPending??=[];this.afterPending.push({kind,value});}return false;}
  this.pending={seq:this.seq+1,kind,value};return this.flush();
 }
 async flush(){
  if(this.sending||!this.pending)return false;this.sending=true;
  try{
   const result=await api('/runs/'+this.runId+'/action',this.pending);
   this.apply(result);this.pending=null;this.connectionError='';this.change?.();return true;
  }catch(error){this.connectionError=error.message;this.error?.(error);return false;}
  finally{this.sending=false;this.retryAt=Date.now()+2000;if(!this.pending&&this.afterPending?.length){const next=this.afterPending.shift();this.send(next.kind,next.value);}}
 }
 recall(){return this.send('recall');}submit(value){return this.send('submit',value);}retry(){return this.send('retry');}
 next(){return this.send('next');}pause(){if(!['memorize','type','pass'].includes(this.phase)||this.paused)return false;this.send('pause');return true;}
 resume(){return this.send('resume');}finish(){return this.send('finish');}
 tick(){
  if(this.pending){if(!this.sending&&Date.now()>=this.retryAt)this.flush();return;}
  if(this.syncing||this.paused||!['memorize','type'].includes(this.phase)||this.remaining>0||Date.now()<(this.retryAt||0))return;
  this.syncing=true;
  api('/runs/'+this.runId).then(result=>{this.apply(result);this.connectionError='';this.change?.();}).catch(error=>{this.connectionError=error.message;this.error?.(error);}).finally(()=>{this.syncing=false;this.retryAt=Date.now()+2000;});
 }
}
