'use strict';
const assert=require('node:assert/strict');
const contract=require('../academy/classroom/existing-lab-readiness-contract.js');
const room=contract.create();
assert.equal(room.status().integration,'existing-learning-lab');
assert.equal(room.status().serverConfigured,false);
assert.equal(room.status().liveConnected,false);
assert.equal(room.status().languages.length,9);
assert.equal(room.status().supportedActions.length,7);
assert.equal(room.status().session.state,'idle');
assert.equal(room.transition('connected').accepted,false);
for(const [action,state] of [['join','joining'],['connected','connected'],['disconnect','interrupted'],['retry','rejoining'],['connected','connected'],['end','ended']]){
  const result=room.transition(action);
  assert.equal(result.accepted,true);
  assert.equal(result.session.state,state);
  assert.equal(result.authorized,false);
  assert.equal(result.mediaEnabled,false);
  assert.equal(result.liveConnected,false);
  assert.equal(result.serverConfigured,false);
  for(const [role,command] of [['instructor','speaker.grant'],['student','hand.set']])
    assert.equal(room.evaluate(command,role,'admitted').allowed,false);
}
assert.equal(room.transition('retry').accepted,false);
assert.equal(room.evaluate('entry.request','student','removed').allowed,false);
assert.equal(typeof room.attach,'undefined');
assert.equal(typeof room.send,'undefined');
console.log('Existing Learning Lab readiness contract: PASS');
