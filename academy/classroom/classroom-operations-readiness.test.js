'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const operations=require('./classroom-operations-readiness.js');
test('offline readiness cannot certify production',()=>{
 const state=operations.assess();
 assert.equal(state.productionReady,false);
 assert.equal(state.mediaProviderConfigured,false);
});
test('capacity and speaker limits stay unverified until load testing',()=>{
 const state=operations.assess();
 assert.equal(state.verifiedCapacity,null);
 assert.equal(state.verifiedSimultaneousSpeakers,null);
 assert.equal(state.pendingChecks.includes('capacity_load_test'),true);
});
test('disconnect, rejoin and safeguarding remain required',()=>{
 const required=['disconnect','rejoin','safeguarding','recording_policy','mobile_recovery','incident_response'];
 for(const check of required)assert.equal(operations.checks.includes(check),true,check);
 assert.equal(Object.isFrozen(operations.checks),true);
});
