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
