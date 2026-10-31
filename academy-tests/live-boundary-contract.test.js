/* Echoes Academy — offline boundary contract regression tests.
 * Run: node academy-tests/live-boundary-contract.test.js
 * No network, media, credentials, or classroom creation.
 */
'use strict';
const assert=require('node:assert/strict');
const {createBoundary,validateEvent}=require('../academy/classroom/live-classroom-boundary.js');
const event=(sequence,overrides={})=>({schema_version:1,event_id:'evt_'+sequence,session_id:'demo_room',subject_id:'student_1',type:'entry.requested',sequence,...overrides});
async function main(){
  const boundary=createBoundary();
  assert.deepEqual(boundary.status(),{mode:'unconfigured',connected:false,lastSequence:0});
  await assert.rejects(boundary.send('entry.request',{}),/no server configured/);
  await assert.rejects(boundary.send('unknown.action',{}),/Unsupported classroom action/);
  assert.equal(validateEvent(event(1)),true);
  assert.equal(validateEvent(event(2),1),true);
  assert.equal(validateEvent(event(3),1),false);
  assert.equal(validateEvent(event(1),1),false);
  assert.equal(validateEvent(event(1,{type:'untrusted.event'})),false);
  assert.equal(validateEvent(event(1,{subject_id:'../invalid'})),false);
  assert.throws(()=>boundary.attach({send(){},close(){},subscribe(){return null;}}),/unsubscribe/);
  assert.equal(boundary.status().connected,false);
  let push,closed=0,detached=0,sent=[];
  const observed=[];
  const unsubscribe=boundary.subscribe(e=>observed.push(e));
  boundary.attach({send(action,payload){sent.push({action,payload});return {accepted:true};},close(){closed++;},subscribe(cb){push=cb;return ()=>{detached++;};}});
  assert.equal(boundary.status().connected,true);
  assert.equal(boundary.status().mode,'live');
  assert.deepEqual(await boundary.send('hand.set',{raised:true}),{accepted:true});
  assert.deepEqual(sent,[{action:'hand.set',payload:{raised:true}}]);
  push(event(1));
  assert.equal(boundary.status().lastSequence,1);
  push(event(3));
  assert.equal(boundary.status().lastSequence,1);
  assert.equal(observed.at(-1).type,'resync.required');
  push(event(2));
  assert.equal(boundary.status().lastSequence,2);
  push(event(2));
  assert.equal(observed.at(-1).type,'resync.required');
  boundary.close();
  assert.equal(closed,1);
  assert.equal(detached,1);
  assert.deepEqual(boundary.status(),{mode:'unconfigured',connected:false,lastSequence:0});
  await assert.rejects(boundary.send('entry.request',{}),/no server configured/);
  unsubscribe();
  process.stdout.write('Academy offline boundary contract: PASS\n');
}
main().catch(err=>{console.error(err);process.exitCode=1;});
