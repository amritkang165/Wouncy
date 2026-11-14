import test from 'node:test';
import assert from 'node:assert/strict';
import {fracturePaths,screenCracks} from '../dist/damage.js';
test('fractures persist across redraws and grow cumulatively with bounces',()=>{
 assert.deepEqual(fracturePaths(0),[]);
 const first=fracturePaths(1),second=fracturePaths(2),third=fracturePaths(3);
 assert.ok(first.length>0);assert.deepEqual(fracturePaths(1),first);
 assert.deepEqual(second.slice(0,first.length),first);assert.deepEqual(third.slice(0,second.length),second);
 assert.ok(third.length>second.length);
 let previous=third;
 for(let bounce=4;bounce<=20;bounce++){
  const next=fracturePaths(bounce);
  assert.ok(next.length>previous.length,`bounce ${bounce} must add cracks`);
  assert.deepEqual(next.slice(0,previous.length),previous,'existing cracks must stay in place');
  assert.deepEqual(fracturePaths(bounce),next,'redraws must preserve the same pattern');
  previous=next;
 }
 assert.equal(screenCracks(0),'');assert.match(screenCracks(3),/aria-hidden="true"/);
});
