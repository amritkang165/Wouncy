import {DurableObject} from 'cloudflare:workers';
import {RULES_VERSION} from '../dist/rules.js';
import {body,player,session,leaderboard} from './runs.js';
export {WouncyRun} from './runs.js';
export {WouncyRoom} from './duel.js';

const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});

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
    const creating=request.method==='POST'&&['/session','/runs','/rooms'].includes(url.pathname);
    const limit=await env.LIMITS.getByName(ip+(creating?':create':':play')).fetch('https://internal/limit?max='+(creating?20:300));
    if(!limit.ok)response=json({error:'Too many requests. Try again shortly.'},429);
    else if(url.pathname==='/session'&&['GET','POST'].includes(request.method))response=await session(request,env);
    else if(url.pathname==='/leaderboard'&&request.method==='GET')response=await leaderboard(url,env);
    else if(url.pathname==='/runs'&&request.method==='POST'){
     const owner=await player(request,env);
     if(!owner)response=json({error:'Choose a guest name to play online.'},401);
     else{const data=await body(request),id=crypto.randomUUID();response=await env.RUNS.getByName(id).fetch('https://internal/create',{method:'POST',body:JSON.stringify({id,owner,mode:data.mode})});}
    }else if(/^\/runs\/[a-f0-9-]{36}(\/action)?$/.test(url.pathname)&&['GET','POST'].includes(request.method)){
     const owner=await player(request,env),parts=url.pathname.split('/');
     if(!owner)response=json({error:'Your guest session expired.'},401);
     else{const data=request.method==='POST'?await body(request):{};response=await env.RUNS.getByName(parts[2]).fetch('https://internal/'+(parts[3]==='action'?'action':'state'),{method:'POST',body:JSON.stringify({...data,owner})});}
    }else if(url.pathname==='/rooms'&&request.method==='POST'){
     const owner=await player(request,env);
     if(!owner)response=json({error:'Choose a guest name first.'},401);
     else{
     const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',bytes=crypto.getRandomValues(new Uint8Array(6));
     const code=Array.from(bytes,n=>alphabet[n%alphabet.length]).join('');
     response=await env.ROOMS.getByName(code).fetch('https://internal/create',{method:'POST'});
     if(response.ok)response=json({code,rulesVersion:RULES_VERSION});
     }
    }else{
     const join=url.pathname.match(/^\/rooms\/([A-HJ-NP-Z2-9]{6})\/join$/);
     if(join&&request.method==='POST'){
      const owner=await player(request,env);
      response=owner?await env.ROOMS.getByName(join[1]).fetch('https://internal/join',{method:'POST',body:JSON.stringify({owner})}):json({error:'Choose a guest name first.'},401);
     }else{
     const match=url.pathname.match(/^\/rooms\/([A-HJ-NP-Z2-9]{6})\/ws$/);
     response=match&&request.method==='GET'?await env.ROOMS.getByName(match[1]).fetch(request):json({error:'Not found'},404);
     }
    }
   }
  }catch(error){response=json({error:error.status?error.message:'Online service unavailable. Please try again.'},error.status||503);}
  if(response.status===101)return response;
  const headers=new Headers(response.headers);for(const [key,value]of Object.entries(cors))headers.set(key,value);
  return new Response(response.body,{status:response.status,headers});
 }
};

export class RequestLimits extends DurableObject {
 async fetch(request){
  const now=Date.now();let bucket=await this.ctx.storage.get('bucket');
  if(!bucket||now>=bucket.until)bucket={count:0,until:now+60000};
  bucket.count++;await this.ctx.storage.put('bucket',bucket);await this.ctx.storage.setAlarm(bucket.until);
  return new Response(null,{status:bucket.count<=Number(new URL(request.url).searchParams.get('max')||60)?204:429});
 }
 async alarm(){await this.ctx.storage.deleteAll();}
}
