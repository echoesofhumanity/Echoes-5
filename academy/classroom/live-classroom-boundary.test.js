/* Run: node --test academy/classroom/live-classroom-boundary.test.js
 * Offline-only regression tests. No server, media, or browser required.
 */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createBoundary}=require('./live-classroom-boundary.js');

function harness(){
  let emit;
  let closes=0;
  let detaches=0;
  const sent=[];
  const adapter={
    subscribe(fn){emit=fn;return ()=>{detaches++;};},
    send(action,payload){sent.push({action,payload});return Promise.resolve({accepted:true});},
    close(){closes++;}
  };
  return {adapter,emit:e=>emit(e),sent,counts:()=>({closes,detaches})};
}
function event(sequence,session_id='lesson_A'){
  return {schema_version:1,session_id,subject_id:'student_A',event_id:'evt_'+session_id+'_'+sequence,type:'entry.requested',sequence};
}
test('unconfigured room refuses sending actions',async()=>{
  const room=createBoundary();
  assert.equal(room.status().connected,false);
  await assert.rejects(room.send('entry.request',{}),/no server configured/);
});
test('ordered events from one session are accepted',()=>{
  const room=createBoundary(),h=harness(),received=[];
  room.subscribe(e=>received.push(e));
  room.attach(h.adapter);
  h.emit(event(1));h.emit(event(2));
  assert.deepEqual(received.map(e=>e.sequence),[1,2]);
  assert.equal(room.status().lastSequence,2);
  room.close();
});
test('gap or duplicate events request resync without advancing sequence',()=>{
  const room=createBoundary(),h=harness(),received=[];
  room.subscribe(e=>received.push(e.type));
  room.attach(h.adapter);
  h.emit(event(1));h.emit(event(3));h.emit(event(1));h.emit(event(2));
  assert.deepEqual(received,['entry.requested','resync.required','resync.required','entry.requested']);
  assert.equal(room.status().lastSequence,2);
  room.close();
});
test('events from another session request resync',()=>{
  const room=createBoundary(),h=harness(),received=[];
  room.subscribe(e=>received.push(e.type));
  room.attach(h.adapter);
  h.emit(event(1,'lesson_A'));h.emit(event(2,'lesson_B'));h.emit(event(2,'lesson_A'));
  assert.deepEqual(received,['entry.requested','resync.required','entry.requested']);
  assert.equal(room.status().lastSequence,2);
  room.close();
});
test('close clears state; fresh adapter may start a new session',()=>{
  const room=createBoundary(),a=harness(),b=harness(),received=[];
  room.subscribe(e=>received.push(e.type));
  room.attach(a.adapter);a.emit(event(1,'lesson_A'));room.close();
  assert.deepEqual(a.counts(),{closes:1,detaches:1});
  assert.equal(room.status().lastSequence,0);
  assert.equal(room.status().connected,false);
  room.attach(b.adapter);b.emit(event(1,'lesson_B'));
  assert.equal(room.status().lastSequence,1);
  assert.deepEqual(received,['entry.requested','entry.requested']);
  room.close();
});
test('unsupported actions fail closed even with an adapter',async()=>{
  const room=createBoundary(),h=harness();
  room.attach(h.adapter);
  await assert.rejects(room.send('speaker.force',{}),/Unsupported classroom action/);
  assert.equal(h.sent.length,0);
  room.close();
});

const lifecycle=require('./session-lifecycle-policy.js');
const gate=require('./classroom-permission-gate.js');
const readiness=require('./existing-lab-readiness-contract.js');

test('interruption and reconnection follow explicit lifecycle transitions',()=>{
  let state='idle';
  for(const [action,expected] of [['join','joining'],['connected','connected'],['disconnect','interrupted'],['retry','rejoining'],['connected','connected'],['end','ended']]){
    state=lifecycle.next(state,action);
    assert.equal(state,expected);
  }
  assert.equal(lifecycle.next(state,'retry'),null);
  assert.equal(lifecycle.snapshot(state).serverAuthorized,false);
});
test('disconnected instructor cannot approve entry or grant speaking',()=>{
  for(const action of ['entry.decide','speaker.grant','participant.remove','session.end']){
    assert.equal(gate.decision({action,role:'instructor',sessionState:'interrupted',serverVerified:true,serverActionApproved:true}).allowed,false);
  }
});
test('student cannot use instructor controls even when claims say approved',()=>{
  for(const action of ['entry.decide','speaker.grant','speaker.revoke','participant.remove','session.end']){
    const result=gate.decision({action,role:'student',sessionState:'connected',serverVerified:true,serverActionApproved:true});
    assert.equal(result.allowed,false);
    assert.equal(result.reason,'role_forbidden');
  }
});
test('removed student cannot raise hand without a new server decision',()=>{
  const result=gate.decision({action:'hand.set',role:'student',participantState:'removed',sessionState:'connected',serverVerified:true,serverActionApproved:true});
  assert.equal(result.allowed,false);
  assert.equal(result.reason,'removed_requires_new_server_decision');
});
test('missing server verification or approval denies speaking',()=>{
  for(const [verified,approved] of [[false,false],[false,true],[true,false]]){
    assert.equal(gate.decision({action:'speaker.grant',role:'instructor',sessionState:'connected',serverVerified:verified,serverActionApproved:approved}).allowed,false);
  }
});
test('offline readiness never authorizes actions after simulated reconnection',()=>{
  const room=readiness.create();
  for(const action of ['join','connected','disconnect','retry','connected']){
    assert.equal(room.transition(action).accepted,true);
  }
  assert.equal(room.status().session.state,'connected');
  assert.equal(room.status().liveConnected,false);
  assert.equal(room.status().serverConfigured,false);
  assert.equal(room.status().mediaEnabled,false);
  for(const [action,role] of [['entry.decide','instructor'],['speaker.grant','instructor'],['hand.set','student']]){
    assert.equal(room.evaluate(action,role,'admitted').allowed,false);
  }
});
