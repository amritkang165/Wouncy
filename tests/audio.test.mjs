import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {AUDIO_CONFIG,distortionCurve} from '../dist/audio.js';
test('the bundled spoken chant stays below 0.5 seconds at every bounce pitch',async()=>{
 const bytes=await readFile(new URL('../dist/assets/audio/bounce-back.wav',import.meta.url));
 assert.equal(bytes.toString('ascii',0,4),'RIFF');
 const byteRate=bytes.readUInt32LE(28);
 let offset=12,dataLength=0;
 while(offset+8<=bytes.length){const length=bytes.readUInt32LE(offset+4);if(bytes.toString('ascii',offset,offset+4)==='data'){dataLength=length;break;}offset+=8+length+(length%2);}
 assert.ok(dataLength>0);
 for(const rate of AUDIO_CONFIG.chantRates)assert.ok(dataLength/byteRate/rate<.5);
});
test('music and voice distortion escalates and remains finite',()=>{
 const levels=[0,1,2,3].map(distortionCurve);
 assert.ok(levels.every(curve=>[...curve].every(Number.isFinite)));
 const index=650;assert.ok(levels[0][index]<levels[1][index]);assert.ok(levels[1][index]<levels[2][index]);assert.ok(levels[2][index]<levels[3][index]);
});
