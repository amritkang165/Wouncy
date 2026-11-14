import test from 'node:test';
import assert from 'node:assert/strict';
import {fracturePaths,screenCracks} from '../dist/damage.js';
test('fractures persist across redraws and grow cumulatively with bounces',()=>{
 assert.deepEqual(fracturePaths(0),[]);
 const first=fracturePaths(1),second=fracturePaths(2),third=fracturePaths(3);
 assert.ok(first.length>0);assert.deepEqual(fracturePaths(1),first);
 assert.deepEqual(second.slice(0,first.length),first);assert.deepEqual(third.slice(0,second.length),second);
 assert.ok(third.length>second.length);assert.deepEqual(fracturePaths(20),third);
 assert.equal(screenCracks(0),'');assert.match(screenCracks(3),/aria-hidden="true"/);
});
