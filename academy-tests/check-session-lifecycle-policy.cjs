'use strict';
const assert=require('node:assert/strict');
const lifecycle=require('../academy/classroom/session-lifecycle-policy.js');
const {next,snapshot}=lifecycle;
let state='idle';
for(const [action,expected] of [['join','joining'],['connected','connected'],['disconnect','interrupted'],['retry','rejoining'],['disconnect','interrupted'],['retry','rejoining'],['connected','connected'],['end','ended']]){
  state=next(state,action);
  assert.equal(state,expected);
  assert.equal(snapshot(state).mediaEnabled,false);
  assert.equal(snapshot(state).serverAuthorized,false);
}
assert.equal(next('ended','retry'),null);
assert.equal(next('connected','join'),null);
assert.equal(next('interrupted','connected'),null);
assert.equal(snapshot('interrupted').canRequestRetry,true);
assert.equal(snapshot('ended').canRequestEnd,false);
assert.throws(()=>next('invalid','join'),/Unknown session state/);
assert.throws(()=>snapshot('invalid'),/Unknown session state/);
console.log('Academy existing Lab session lifecycle: PASS');
