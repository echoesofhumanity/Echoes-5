'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const media=require('./classroom-media-contract.js');
test('media requests are described but never authorized locally',()=>{
 for(const operation of media.OPERATIONS){
  for(const kind of media.KINDS){
   const result=media.describe({schema_version:1,operation,kind,session_id:'room_A',subject_id:'student_A'});
   assert.equal(result.valid,true);
   assert.equal(result.authorized,false);
   assert.equal(result.reason,'server_media_approval_required');
  }
 }
});
test('invalid media requests fail closed',()=>{
 const valid={schema_version:1,operation:'media.publish',kind:'audio',session_id:'room_A',subject_id:'student_A'};
 for(const request of [null,{},[],{...valid,schema_version:2},{...valid,operation:'media.record'},{...valid,kind:'unknown'},{...valid,session_id:'bad room'},{...valid,subject_id:''}]){
  const result=media.describe(request);
  assert.equal(result.valid,false);
  assert.equal(result.authorized,false);
 }
});
test('offline media policy requires approval, consent and reauthorization',()=>{
 const policy=media.policy();
 assert.equal(policy.transportConfigured,false);
 assert.equal(policy.mediaEnabled,false);
 assert.equal(policy.captureEnabled,false);
 assert.equal(policy.recordingEnabled,false);
 assert.equal(policy.screenShareEnabled,false);
 assert.equal(policy.serverApprovalRequired,true);
 assert.equal(policy.activeMembershipRequired,true);
 assert.equal(policy.publishRequiresExplicitUserConsent,true);
 assert.equal(policy.revokedOrDisconnectedStopsPublishing,true);
 assert.equal(policy.rejoinRequiresFreshMediaAuthorization,true);
 assert.equal(policy.recordingsRequireSeparateConsentAndRetentionPolicy,true);
});
