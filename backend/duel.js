import {DurableObject} from 'cloudflare:workers';
import {Game,RULES_VERSION} from '../dist/engine.js';
import {newSeed} from '../dist/rules.js';
import {body,json} from './runs.js';

const GRACE=10000;
export class WouncyRoom extends DurableObject {
 constructor(ctx,env){
  super(ctx,env);ctx.blockConcurrencyWhile(async()=>{this.room=await ctx.storage.get('room');});
  ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping','pong'));
 }
 peers(){return this.ctx.getWebSockets().filter(ws=>ws.readyState===1);}
 connected(id){return this.peers().some(ws=>ws.deserializeAttachment().id===id);}
 game(p){return p.game?new Game({now:Date.now}).restore(p.game):null;}
 async fetch(request){return this.ctx.blockConcurrencyWhile(async()=>{
  const url=new URL(request.url);
  if(url.pathname==='/create'){
   if(this.room)return json({error:'Room exists'},409);
   this.room={phase:'lobby',players:[],revision:0,expiresAt:Date.now()+30*60000};await this.save();return json({ok:true});
  }
  if(!this.room||Date.now()>=this.room.expiresAt)return json({error:'Room expired or not found.'},404);
  this.advance();
  if(url.pathname==='/join'){
   const {owner}=await body(request);this.room.players??=[];
   let p=this.room.players.find(p=>p.id===owner.id);
   if(!p){
    if(this.room.phase!=='lobby'||this.room.players.length>=2)return json({error:'This room already has two players.'},409);
    p={id:owner.id,name:owner.name,seq:0,ready:false,disconnectedAt:Date.now()};this.room.players.push(p);
   }
   p.ticket=newSeed();p.ticketUntil=Date.now()+60000;await this.save();return json({ticket:p.ticket,playerId:p.id});
  }
  if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return json({error:'WebSocket connection required'},426);
  const p=this.room.players?.find(p=>p.ticket===url.searchParams.get('ticket')&&Date.now()<p.ticketUntil);
  if(!p)return json({error:'Please reconnect from the game.'},401);
  delete p.ticket;delete p.ticketUntil;
  for(const ws of this.peers())if(ws.deserializeAttachment().id===p.id)ws.close(1000,'Replaced by your new connection');
  const [client,server]=Object.values(new WebSocketPair());this.ctx.acceptWebSocket(server);server.serializeAttachment({id:p.id});
  delete p.disconnectedAt;this.advance();await this.save();this.broadcast();return new Response(null,{status:101,webSocket:client});
 });}
 start(){
  const seed=newSeed();this.room.phase='playing';this.room.result=null;
  for(const p of this.room.players){const game=new Game({now:Date.now});game.start({seed,mode:'duel'});p.game=game.snapshot();p.ready=false;}
 }
 end(winner,reason){
  if(this.room.phase!=='playing')return;
  this.room.phase='finished';this.room.result={winner,reason};
  for(const p of this.room.players){const game=this.game(p);game.finish();p.game=game.snapshot();p.ready=false;}
 }
 advance(){
  const now=Date.now();
  if(this.room.phase==='playing'){
   for(const p of this.room.players){
    const game=this.game(p);game.tick();p.game=game.snapshot();
    if(game.gameOver){this.end(this.room.players.find(other=>other.id!==p.id).id,'no bounces left');break;}
    if(p.disconnectedAt&&now>=p.disconnectedAt+GRACE){this.end(this.room.players.find(other=>other.id!==p.id).id,'connection lost');break;}
   }
  }else if(this.room.phase==='lobby')this.room.players=this.room.players.filter(p=>!p.disconnectedAt||now<p.disconnectedAt+60000);
 }
 view(id){
  const p=this.room.players.find(p=>p.id===id),state=p?.game?structuredClone(p.game):null;
  if(state){
   delete state.seed;state.history=state.history.map(({words,...entry})=>entry);
   if(!['memorize','fail'].includes(state.phase)){state.words=state.words.map(()=>null);if(!state.locked.includes(state.specialWord))state.specialWord=null;}
  }
  return {type:'room',phase:this.room.phase,revision:this.room.revision,playerId:id,seq:p?.seq||0,serverTime:Date.now(),state,result:this.room.result,
   players:this.room.players.map(p=>({id:p.id,name:p.name,ready:p.ready,connected:this.connected(p.id),cleared:p.game?.history.length||0,level:p.game?.level||1,bounces:p.game?.totalBounces||0,disconnectedAt:p.disconnectedAt}))};
 }
 broadcast(){for(const ws of this.peers())ws.send(JSON.stringify(this.view(ws.deserializeAttachment().id)));}
 async save(){
  this.room.revision++;await this.ctx.storage.put('room',this.room);
  const deadlines=[this.room.expiresAt];
  for(const p of this.room.players){
   if(this.room.phase==='playing'&&['memorize','type'].includes(p.game?.phase))deadlines.push(p.game.deadline);
   if(p.disconnectedAt&&this.room.phase!=='finished')deadlines.push(p.disconnectedAt+(this.room.phase==='playing'?GRACE:60000));
  }
  await this.ctx.storage.setAlarm(Math.max(Date.now()+100,Math.min(...deadlines)));
 }
 async webSocketMessage(ws,message){return this.ctx.blockConcurrencyWhile(async()=>{
  if(typeof message!=='string'||new TextEncoder().encode(message).byteLength>1024){ws.close(1009,'Message too large');return;}
  const attachment=ws.deserializeAttachment(),now=Date.now();
  if(!attachment.until||now>=attachment.until){attachment.until=now+60000;attachment.count=0;}
  attachment.count++;ws.serializeAttachment(attachment);if(attachment.count>120){ws.close(1008,'Too many messages');return;}
  let data;try{data=JSON.parse(message);}catch{ws.send(JSON.stringify({type:'error',error:'Invalid message'}));return;}
  const p=this.room?.players.find(p=>p.id===attachment.id);
  if(!p)return;
  this.advance();
  if(!data||!Number.isSafeInteger(data.seq)||data.seq<1||!['ready','recall','submit','retry','next','finish','rematch'].includes(data.kind)||data.kind==='submit'&&(typeof data.value!=='string'||data.value.length>160)){
   ws.send(JSON.stringify({type:'error',error:'Invalid action'}));return;
  }
  const action=JSON.stringify([data.kind,data.value??null]);
  if(data.seq===p.seq&&action===p.lastAction){await this.save();this.broadcast();return;}
  if(data.seq!==p.seq+1){ws.send(JSON.stringify({type:'error',error:'Action out of order. Reconnect.'}));return;}
  if(['ready','rematch'].includes(data.kind)&&this.room.phase!=='playing'){
   p.ready=data.value!==false;
   if(this.room.players.length===2&&this.room.players.every(p=>p.ready&&this.connected(p.id)))this.start();
  }else if(this.room.phase==='playing'){
   if(data.kind==='finish')this.end(this.room.players.find(other=>other.id!==p.id).id,'left the match');
   else if(['recall','submit','retry','next'].includes(data.kind)){
    const game=this.game(p);game[data.kind](data.value);p.game=game.snapshot();
    if(game.history.length>=5)this.end(p.id,'five levels cleared');
    else if(game.gameOver)this.end(this.room.players.find(other=>other.id!==p.id).id,'no bounces left');
   }
  }
  p.seq=data.seq;p.lastAction=action;await this.save();this.broadcast();
 });}
 async webSocketClose(ws){return this.ctx.blockConcurrencyWhile(async()=>{
  const id=ws.deserializeAttachment().id,p=this.room?.players.find(p=>p.id===id);
  if(p&&!this.connected(id)){p.disconnectedAt=Date.now();p.ready=false;await this.save();this.broadcast();}
 });}
 webSocketError(ws){ws.close(1011,'Connection interrupted');}
 async alarm(){
  if(!this.room)return;
  if(Date.now()>=this.room.expiresAt){for(const ws of this.peers())ws.close(1000,'Room expired');await this.ctx.storage.deleteAll();this.room=null;return;}
  this.advance();await this.save();this.broadcast();
 }
}
