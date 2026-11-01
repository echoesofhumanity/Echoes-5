'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const contract=require('./existing-lab-event-contract.js');
const boundary=require('./live-classroom-boundary.js');
test('Lab controls use supported protocol vocabulary',()=>{
 for(const [control,mapping] of Object.entries(contract.MAP)){
  const d=contract.describe(control);
  assert.equal(d.known,true);
  assert.equal(d.authorized,false);
  assert.equal(d.dispatched,false);
  assert.equal(boundary.ACTIONS.includes(mapping.action),true);
  assert.equal(boundary.EVENTS.includes(mapping.event),true);
 }
});
test('instructor events remain unapproved descriptions',()=>{
 for(const mapping of Object.values(contract.SERVER_ONLY)){
  assert.equal(mapping.authority,'instructor');
  assert.equal(boundary.ACTIONS.includes(mapping.action),true);
  assert.equal(boundary.EVENTS.includes(mapping.event),true);
 }
 assert.equal(contract.describe('invalid').known,false);
 assert.equal(contract.describe('invalid').authorized,false);
});
