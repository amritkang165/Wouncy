export const RULES_VERSION=3;
export function newSeed(){
 const bytes=new Uint32Array(4);globalThis.crypto.getRandomValues(bytes);
 return Array.from(bytes,n=>n.toString(16).padStart(8,'0')).join('');
}
export function seededRandom(seed){
 let state=2166136261;
 for(let i=0;i<seed.length;i++)state=Math.imul(state^seed.charCodeAt(i),16777619)>>>0;
 return()=>{state=(state+0x6D2B79F5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
