// Optional canonical page for iframe hosts that omit their parent page's path.
export const PUBLIC_GAME_URL='https://muneer320.itch.io/wouncy';
export function shareControls(){
 return `<section class="share-panel" aria-label="Share your run"><h3>A comeback worth sharing.</h3><div class="share-buttons"><button class="secondary-button" data-share="native" hidden>share screenshot ↗</button><a data-share="whatsapp" target="_blank" rel="noopener noreferrer">WhatsApp</a><a data-share="x" target="_blank" rel="noopener noreferrer">X</a><a data-share="linkedin" target="_blank" rel="noopener noreferrer">LinkedIn</a><button data-share="download" disabled>save screenshot ↓</button><button data-share="copy">copy score</button></div><p class="share-status" role="status">Preparing your screenshot…</p><p class="share-note">Social buttons open a draft. Attach the saved screenshot, or use your device’s share menu.</p></section>`;
}
export function gameURL(){
 if(PUBLIC_GAME_URL)return PUBLIC_GAME_URL;
 // itch.io hosts HTML games inside a CDN iframe. Share the enclosing game page.
 if(location.hostname.endsWith('.itch.zone')&&document.referrer){
  try{const parent=new URL(document.referrer);if(parent.hostname.endsWith('.itch.io')&&parent.pathname!=='/')return parent.origin+parent.pathname;}catch{}
 }
 return location.origin+location.pathname;
}
export function mountSharing(summary,{score,level,cleared}){
 const panel=summary.querySelector('.share-panel'),status=panel.querySelector('.share-status');
 const text=`I scored ${score.toLocaleString()} points and reached level ${level} in Wouncy! ${cleared} level${cleared===1?'':'s'} cleared. A memory typing game by Team Pheonix. Can you beat my comeback?`;
 const url=gameURL(),message=text+'\n'+url;
 let file=null,objectURL=null,disposed=false;
 const controller=new AbortController(),options={signal:controller.signal};
 const button=name=>panel.querySelector(`[data-share="${name}"]`);
 const say=value=>{status.textContent=value;};
 button('whatsapp').href='https://wa.me/?'+new URLSearchParams({text:message});
 button('x').href='https://twitter.com/intent/tweet?'+new URLSearchParams({text,url});
 button('linkedin').href='https://www.linkedin.com/sharing/share-offsite/?'+new URLSearchParams({url});
 function download(){
  if(!objectURL)return false;
  const link=document.createElement('a');link.href=objectURL;link.download=file.name;document.body.append(link);link.click();link.remove();return true;
 }
 async function copy(){
  try{await navigator.clipboard.writeText(message);return true;}
  catch{
   let field=panel.querySelector('textarea');
   if(!field){field=document.createElement('textarea');field.className='share-copy';field.readOnly=true;field.setAttribute('aria-label','Score text to copy');panel.append(field);}
   field.value=message;field.focus();field.select();return false;
  }
 }
 button('copy').addEventListener('click',async()=>say(await copy()?'Score text copied.':'Select and copy your score text below.'),options);
 button('download').addEventListener('click',()=>{if(download())say('Screenshot saved. It’s ready to attach to your post.');},options);
 for(const platform of ['whatsapp','x','linkedin'])button(platform).addEventListener('click',()=>{
  const saved=download();
  if(platform==='linkedin')copy().then(copied=>say((copied?'Score text copied. Paste it into your LinkedIn post. ':'Copy the score text below. ')+(saved?'Attach the saved screenshot.':'No screenshot has been saved yet. You can still post your score.')));
  else say(saved?'Screenshot saved. Attach it to the draft that just opened.':'Your score draft is ready. Save the screenshot when it finishes preparing.');
 },options);
 button('native').addEventListener('click',async()=>{
  if(!file)return;
  try{await navigator.share({title:'My Wouncy comeback',text,url,files:[file]});say('Your device’s sharing flow has finished.');}
  catch(error){if(error.name!=='AbortError')say('Image sharing isn’t available here. Save the screenshot and attach it to your post.');}
 },options);
 (async()=>{
  try{
   await document.fonts.ready;
   await import('./vendor/html-to-image.js');
   if(disposed)return;
   const blob=await globalThis.htmlToImage.toBlob(summary.querySelector('.game-board'),{
    pixelRatio:2,backgroundColor:'#f2eddf',
    filter:node=>!node.classList?.contains('summary-actions'),
    style:{animation:'none',transform:'none'},
   });
   if(disposed)return;if(!blob)throw new Error('No screenshot');
   file=new File([blob],`wouncy-${score}-level-${level}.png`,{type:'image/png'});objectURL=URL.createObjectURL(file);
   button('download').disabled=false;
   button('native').hidden=!(navigator.share&&navigator.canShare?.({files:[file]}));
   say('Screenshot ready. Share your score and challenge a friend.');
  }catch{if(!disposed)say('The screenshot couldn’t be prepared. You can still share or copy your score.');}
 })();
 return()=>{disposed=true;controller.abort();if(objectURL)URL.revokeObjectURL(objectURL);};
}
