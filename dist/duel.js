import {Game,RULES_VERSION} from './engine.js';
import {api,API} from './online.js';

export class DuelGame extends Game {
 constructor(code,callbacks){
  super();this.start({mode:'duel',seed:'lobby'});this.phase='lobby';this.duel=true;this.code=code;this.callbacks=callbacks;this.players=[];this.seq=0;this.revision=-1;this.offset=0;this.now=()=>Date.now()+this.offset;
 }
 async connect(){
  if(this.closed||this.connecting)return;this.connecting=true;
  try{
   const {ticket,playerId}=await api('/rooms/'+this.code+'/join',{});if(this.closed)return;this.playerId=playerId;
   const ws=new WebSocket(API.replace(/^http/,'ws')+'/rooms/'+this.code+'/ws?ticket='+ticket);this.socket=ws;
   ws.onopen=()=>{this.connectionError='';this.lastMessage=Date.now();this.callbacks.change();};
   ws.onmessage=event=>{
    this.lastMessage=Date.now();if(event.data==='pong')return;
    const data=JSON.parse(event.data);if(data.type==='error'){this.connectionError=data.error;this.callbacks.change();return;}
    if(data.type!=='room'||data.revision<this.revision)return;
    this.revision=data.revision;this.offset=data.serverTime-Date.now();this.players=data.players;this.result=data.result;this.seq=data.seq;
    if(data.state){if(data.state.rulesVersion!==RULES_VERSION){this.connectionError='Reload Wouncy for the latest rules.';this.callbacks.change();return;}this.restore(data.state);}
    else this.phase='lobby';
    if(this.pending&&data.seq>=this.pending.seq)this.pending=null;
    if(!this.pending&&this.finishQueued){this.finishQueued=false;if(data.phase==='playing')this.send('finish');}
    this.connectionError='';this.callbacks.change();
   };
   ws.onclose=()=>{if(this.socket!==ws||this.closed)return;this.connectionError='Reconnecting · 10 seconds before forfeit';this.retryAt=Date.now()+500;this.callbacks.change();};
   ws.onerror=()=>ws.close();
  }catch(error){this.connectionError=error.message;this.retryAt=Date.now()+1500;this.callbacks.change();}
  finally{this.connecting=false;}
 }
 send(kind,value){
  if(this.pending||this.socket?.readyState!==1)return false;
  this.pending={seq:this.seq+1,kind,value};this.socket.send(JSON.stringify(this.pending));this.sentAt=Date.now();return true;
 }
 ready(){return this.send('ready',true);}rematch(){return this.send('rematch',true);}
 recall(){return this.send('recall');}submit(value){return this.send('submit',value);}retry(){return this.send('retry');}next(){return this.send('next');}
 pause(){return false;}resume(){}finish(){if(this.pending){this.finishQueued=true;return false;}return this.send('finish');}
 tick(){
  if(this.closed)return;
  if(!this.socket||this.socket.readyState===3){if(Date.now()>=(this.retryAt||0))this.connect();return;}
  if(this.socket.readyState!==1)return;
  if(Date.now()-(this.lastMessage||0)>30000){this.socket.close();return;}
  if(this.pending&&Date.now()-this.sentAt>2500){this.socket.send(JSON.stringify(this.pending));this.sentAt=Date.now();}
  if(Date.now()-(this.pingAt||0)>10000){this.socket.send('ping');this.pingAt=Date.now();}
 }
 close(){this.closed=true;this.socket?.close();}
}
