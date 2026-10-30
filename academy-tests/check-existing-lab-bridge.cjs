'use strict';
const assert=require('node:assert/strict');
const createBridge=require('../academy/classroom/existing-lab-bridge.js');
const boundary=require('../academy/classroom/live-classroom-boundary.js');
const lifecycle=require('../academy/classroom/session-lifecycle-policy.js');
const ids=['roomStudentView','roomInstructorView','roomRequest','roomAdmit','roomReject','roomRemove','seminarHand','roomDemoStatus','roomInstructorPanel','roomStudentPanel','liveTitle'];
const elements=new Map(ids.map(id=>[id,{textContent:id==='roomDemoStatus'?'Outside the room':'',getAttribute(name){return name==='aria-pressed'&&id==='roomStudentView'?'true':'false';}}]));
const doc={getElementById:id=>elements.get(id)||null};
const bridge=createBridge(doc,boundary,lifecycle);
assert.equal(bridge.inspect().ready,true);
assert.equal(bridge.snapshot().liveConnected,false);
assert.equal(bridge.snapshot().session.state,'idle');
assert.equal(bridge.snapshot().session.serverAuthorized,false);
assert.equal(bridge.snapshot().session.mediaEnabled,false);
assert.equal(bridge.snapshot().mode,'synthetic-local-only');
assert.equal(bridge.snapshot().view,'student-preview');
assert.equal(bridge.snapshot().roomStatus,'Outside the room');
elements.delete('roomRequest');
assert.equal(bridge.inspect().ready,false);
assert.deepEqual(bridge.inspect().missing,['roomRequest']);
assert.equal(typeof bridge.send,'undefined');
assert.equal(typeof bridge.attach,'undefined');
assert.equal(typeof bridge.observe,'function');
const listeners=new Map();
const clickable={
  textContent:'Request entry',
  addEventListener(type,fn){listeners.set(type,fn);},
  removeEventListener(type,fn){if(listeners.get(type)===fn)listeners.delete(type);}
};
elements.set('roomRequest',clickable);
const changes=[];
const unwatch=bridge.observe(event=>changes.push(event));
assert.equal(listeners.has('click'),true);
listeners.get('click')();
Promise.resolve().then(()=>{
  assert.equal(changes.length,1);
  assert.equal(changes[0].source,'synthetic-ui');
  assert.equal(changes[0].control,'roomRequest');
  assert.equal(changes[0].state.liveConnected,false);
  unwatch();
  assert.equal(listeners.has('click'),false);
  console.log('Existing Lab read-only bridge: PASS');
}).catch(err=>{console.error(err);process.exitCode=1;});
