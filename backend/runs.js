import {DurableObject} from 'cloudflare:workers';
import {Game,RULES_VERSION} from '../dist/engine.js';
import {newSeed} from '../dist/rules.js';

export const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export const day=()=>new Date().toISOString().slice(0,10);
export async function body(request){
 const reader=request.body?.getReader();let raw='',size=0;const decoder=new TextDecoder();
 if(!reader)throw Object.assign(new Error('Invalid request'),{status:400});
 while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>2048){await reader.cancel();throw Object.assign(new Error('Request too large'),{status:413});}raw+=decoder.decode(value,{stream:true});}
 let data;try{data=JSON.parse(raw+decoder.decode());}catch{throw Object.assign(new Error('Invalid JSON'),{status:400});}
 if(!data||typeof data!=='object'||Array.isArray(data))throw Object.assign(new Error('Invalid request'),{status:400});return data;
}
async function hash(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),n=>n.toString(16).padStart(2,'0')).join('');}
export async function player(request,env){
 const token=request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
 return token?env.DB.prepare('SELECT id,name FROM players WHERE token_hash=? AND expires_at>?').bind(await hash(token),Date.now()).first():null;
}
export async function session(request,env){
 if(request.method==='GET'){const p=await player(request,env);return p?json({player:p}):json({error:'Please choose a guest name again.'},401);}
 const {name}=await body(request);
 if(typeof name!=='string'||! /^[\p{L}\p{N} _-]{2,20}$/u.test(name.trim()))return json({error:'Use 2–20 letters, numbers, spaces, _ or -.'},400);
 const token=newSeed()+newSeed(),p={id:crypto.randomUUID(),name:name.trim()};
 await env.DB.prepare('INSERT INTO players(id,name,token_hash,expires_at) VALUES(?,?,?,?)').bind(p.id,p.name,await hash(token),Date.now()+30*86400000).run();
 return json({token,player:p});
}
export async function leaderboard(url,env){
 const mode=url.searchParams.get('mode')==='daily'?'daily':'solo',boardDay=mode==='daily'?day():'';
 const {results}=await env.DB.prepare(`SELECT name,score,level,cleared,bounces FROM (
 SELECT *,ROW_NUMBER() OVER(PARTITION BY player_id ORDER BY score DESC,created_at ASC) AS placement
 FROM scores WHERE rules_version=? AND mode=? AND board_day=?) WHERE placement=1 ORDER BY score DESC,created_at ASC LIMIT 20`).bind(RULES_VERSION,mode,boardDay).all();
 return json({mode,day:boardDay,rulesVersion:RULES_VERSION,entries:results});
}
export class WouncyRun extends DurableObject {
 constructor(ctx,env){super(ctx,env);ctx.blockConcurrencyWhile(async()=>{this.record=await ctx.storage.get('run');});}
 game(){return new Game({now:Date.now}).restore(this.record.state);}
 view(game){
  const state=game.snapshot();delete state.seed;
  state.history=state.history.map(({words,...entry})=>entry);
  if(!['memorize','fail'].includes(state.phase)){
   state.words=state.words.map(()=>null);
   if(!state.locked.includes(state.specialWord))state.specialWord=null;
  }
  return {runId:this.record.id,seq:this.record.seq,revision:this.record.revision,state,serverTime:Date.now(),ranked:true};
 }
 async save(game){
  this.record.revision=(this.record.revision||0)+1;
  this.record.state=game.snapshot();await this.ctx.storage.put('run',this.record);
  // The unique run ID makes alarm retries and lost HTTP responses harmless.
  if(game.phase==='summary'&&!this.record.published){
   await this.env.DB.prepare('INSERT OR IGNORE INTO scores(run_id,player_id,name,mode,rules_version,board_day,score,level,cleared,bounces,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
    .bind(this.record.id,this.record.owner.id,this.record.owner.name,game.mode,RULES_VERSION,this.record.day,game.score,game.level,game.history.length,game.totalBounces,Date.now()).run();
   this.record.published=true;await this.ctx.storage.put('run',this.record);
  }
  const timed=!game.paused&&['memorize','type'].includes(game.phase);
  await this.ctx.storage.setAlarm(Math.min(this.record.expiresAt,timed?game.deadline:this.record.expiresAt));
 }
 async fetch(request){return this.ctx.blockConcurrencyWhile(async()=>{
  const data=await body(request),url=new URL(request.url);
  if(url.pathname==='/create'){
   if(this.record)return json({error:'Run already exists'},409);
   if(!['solo','daily'].includes(data.mode))return json({error:'Unknown mode'},400);
   const boardDay=data.mode==='daily'?day():'',game=new Game({now:Date.now});
   game.start({mode:data.mode,seed:data.mode==='daily'?`daily:${RULES_VERSION}:${boardDay}`:newSeed()});
   this.record={id:data.id,owner:data.owner,day:boardDay,seq:0,expiresAt:Date.now()+2*3600000};await this.save(game);return json(this.view(game));
  }
  if(!this.record||Date.now()>=this.record.expiresAt)return json({error:'This run has expired.'},410);
  if(data.owner.id!==this.record.owner.id)return json({error:'This run belongs to another guest.'},403);
  const game=this.game();game.tick();
  if(url.pathname==='/action'){
   if(!Number.isSafeInteger(data.seq)||data.seq<1)return json({error:'Invalid action sequence'},400);
   const action=JSON.stringify([data.kind,data.value??null]);
   if(data.seq===this.record.seq&&action===this.record.lastAction){await this.save(game);return json(this.view(game));}
   if(data.seq!==this.record.seq+1)return json({error:'Action out of order. Reconnect this run.'},409);
   if(!['recall','submit','retry','next','pause','resume','finish'].includes(data.kind)||data.kind==='submit'&&(typeof data.value!=='string'||data.value.length>160))return json({error:'Invalid action'},400);
   game[data.kind](data.value);this.record.seq=data.seq;this.record.lastAction=action;
  }
  await this.save(game);return json(this.view(game));
 });}
 async alarm(){
  if(!this.record)return;
  if(Date.now()>=this.record.expiresAt){await this.ctx.storage.deleteAll();this.record=null;return;}
  const game=this.game();game.tick();await this.save(game);
 }
}
