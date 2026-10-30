'use strict';
const assert=require('node:assert/strict');
const gate=require('../academy/classroom/classroom-permission-gate.js');
const base={sessionState:'connected',serverVerified:true,serverActionApproved:true,participantState:'admitted'};
for(const action of gate.INSTRUCTOR){
  assert.deepEqual(gate.decision({...base,role:'instructor',action}),{allowed:true,reason:'server_approved'});
  assert.equal(gate.decision({...base,role:'student',action}).allowed,false);
}
for(const action of gate.STUDENT){
  assert.equal(gate.decision({...base,role:'student',action}).allowed,true);
  assert.equal(gate.decision({...base,role:'instructor',action}).allowed,false);
}
for(const sessionState of ['idle','joining','interrupted','rejoining','ended']){
  assert.deepEqual(gate.decision({...base,role:'instructor',action:'speaker.grant',sessionState}),{allowed:false,reason:'session_not_connected'});
}
assert.equal(gate.decision({...base,role:'instructor',action:'speaker.grant',serverVerified:false}).allowed,false);
assert.equal(gate.decision({...base,role:'instructor',action:'speaker.grant',serverActionApproved:false}).allowed,false);
assert.equal(gate.decision({...base,role:'student',action:'entry.request',participantState:'removed'}).reason,'removed_requires_new_server_decision');
assert.equal(gate.decision({...base,role:'student',action:'hand.set',participantState:'removed'}).allowed,false);
assert.equal(gate.decision({...base,role:'observer',action:'hand.set'}).allowed,false);
assert.equal(gate.decision({...base,role:'instructor',action:'unrecognized'}).allowed,false);
assert.equal(gate.decision(null).allowed,false);
console.log('Academy classroom permission gate: PASS');
