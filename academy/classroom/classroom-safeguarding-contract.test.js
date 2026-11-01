'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const safeguards=require('./classroom-safeguarding-contract.js');
test('safeguarding actions are never locally authorized',()=>{
 for(const action of safeguards.ACTIONS){
  const result=safeguards.describe({schema_version:1,action,session_id:'room_A',subject_id:'student_A'});
  assert.equal(result.valid,true);
  assert.equal(result.authorized,false);
  assert.equal(result.reason,'backend_safeguarding_approval_required');
 }
});
test('invalid safeguarding requests are rejected',()=>{
 const base={schema_version:1,action:'participant.admit',session_id:'room_A',subject_id:'student_A'};
 for(const request of [null,{},[],{...base,action:'participant.force'},{...base,session_id:'invalid room'},{...base,subject_id:''},{...base,schema_version:2}]){
  assert.equal(safeguards.describe(request).valid,false);
  assert.equal(safeguards.describe(request).authorized,false);
 }
});
test('minor protection, recording, removal and moderation default to safeguards',()=>{
 const rules=safeguards.requirements();
 for(const field of ['removedParticipantCannotSelfReadmit','revokedAccessMustBeEnforced','expiredAccessMustBeRejected','recordingRequiresExplicitConsent','recordingRequiresRetentionAndDeletionPolicy','minorProtectionRequiresAgeAppropriateSafeguards','minorRecordingRequiresAdditionalLegalReview','moderationRequiresAuditTrail','reportingRequiresConfidentialEscalation','directParticipantMessagingDisabledUntilSafeguardsApproved','noPersonalDataStoredByContract']){
  assert.equal(rules[field],true,field);
 }
 assert.equal(rules.recordingDisabledByDefault,true);
});
