import {DurableObject} from 'cloudflare:workers';
import {RULES_VERSION} from '../dist/rules.js';

const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const ROOM_TTL=30*60*1000;
export default {
 async fetch(request,env){
  const url=new URL(request.url),origin=request.headers.get('Origin');
  const allowed=env.ALLOWED_ORIGINS.split(',').includes(origin);
  if(origin&&!allowed)return json({error:'Origin not allowed'},403);
  const cors={'Access-Control-Allow-Origin':origin||'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization','Vary':'Origin'};
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  let response;
  try{
   if(url.pathname==='/health')response=json({ok:true,rulesVersion:RULES_VERSION});
   else{
    const ip=request.headers.get('CF-Connecting-IP')||'local';
    const limit=await env.LIMITS.getByName(ip).fetch('https://internal/limit');
    if(!limit.ok)response=json({error:'Too many requests. Try again shortly.'},429);
    else if(url.pathname==='/rooms'&&request.method==='POST'){
     const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',bytes=crypto.getRandomValues(new Uint8Array(6));
     const code=Array.from(bytes,n=>alphabet[n%alphabet.length]).join('');
     response=await env.ROOMS.getByName(code).fetch('https://internal/create',{method:'POST'});
     if(response.ok)response=json({code,rulesVersion:RULES_VERSION});
    }else{
     const match=url.pathname.match(/^\/rooms\/([A-HJ-NP-Z2-9]{6})\/ws$/);
     response=match&&request.method==='GET'?await env.ROOMS.getByName(match[1]).fetch(request):json({error:'Not found'},404);
    }
   }
  }catch{response=json({error:'Online service unavailable. Please try again.'},503);}
  if(response.status===101)return response;
  const headers=new Headers(response.headers);for(const [key,value]of Object.entries(cors))headers.set(key,value);
  return new Response(response.body,{status:response.status,headers});
 }
};

export class RequestLimits extends DurableObject {
 async fetch(){
  const now=Date.now();let bucket=await this.ctx.storage.get('bucket');
  if(!bucket||now>=bucket.until)bucket={count:0,until:now+60000};
  bucket.count++;await this.ctx.storage.put('bucket',bucket);await this.ctx.storage.setAlarm(bucket.until);
  return new Response(null,{status:bucket.count<=60?204:429});
 }
 async alarm(){await this.ctx.storage.deleteAll();}
}

export class WouncyRoom extends DurableObject {
 constructor(ctx,env){
  super(ctx,env);this.ctx.blockConcurrencyWhile(async()=>{this.room=await this.ctx.storage.get('room');});
  this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping','pong'));
 }
 peers(exclude){return this.ctx.getWebSockets().filter(ws=>ws!==exclude&&ws.readyState===1);}
 presence(exclude){return this.peers(exclude).map(ws=>ws.deserializeAttachment()).map(({id,ready})=>({id,ready}));}
 broadcast(exclude){const message=JSON.stringify({type:'presence',players:this.presence(exclude),serverTime:Date.now()});for(const ws of this.peers(exclude))ws.send(message);}
 async fetch(request){
  const url=new URL(request.url);
  if(url.pathname==='/create'&&request.method==='POST'){
   if(this.room)return json({error:'Room exists'},409);
   this.room={expiresAt:Date.now()+ROOM_TTL};await this.ctx.storage.put('room',this.room);await this.ctx.storage.setAlarm(this.room.expiresAt);
   return json({ok:true});
  }
  if(!this.room||Date.now()>=this.room.expiresAt)return json({error:'Room expired or not found'},404);
  if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return json({error:'WebSocket connection required'},426);
  if(this.peers().length>=2)return json({error:'This room already has two players'},409);
  const [client,server]=Object.values(new WebSocketPair());
  this.ctx.acceptWebSocket(server);const player={id:crypto.randomUUID(),ready:false};server.serializeAttachment(player);
  server.send(JSON.stringify({type:'welcome',playerId:player.id,rulesVersion:RULES_VERSION,serverTime:Date.now()}));this.broadcast();
  return new Response(null,{status:101,webSocket:client});
 }
 async webSocketMessage(ws,message){
  if(typeof message!=='string'||new TextEncoder().encode(message).byteLength>1024){ws.close(1009,'Message too large');return;}
  const player=ws.deserializeAttachment(),now=Date.now();
  if(!player.windowUntil||now>=player.windowUntil){player.windowUntil=now+60000;player.messages=0;}
  player.messages++;ws.serializeAttachment(player);
  if(player.messages>120){ws.close(1008,'Too many messages');return;}
  let data;try{data=JSON.parse(message);}catch{ws.send(JSON.stringify({type:'error',error:'Invalid message'}));return;}
  if(data?.type==='ready'&&typeof data.ready==='boolean'){
   player.ready=data.ready;ws.serializeAttachment(player);this.broadcast();
  }else ws.send(JSON.stringify({type:'error',error:'Unknown action'}));
 }
 webSocketClose(ws){this.broadcast(ws);}
 webSocketError(ws){ws.close(1011,'Connection interrupted');}
 async alarm(){for(const ws of this.peers())ws.close(1000,'Room expired');await this.ctx.storage.deleteAll();this.room=null;}
}
