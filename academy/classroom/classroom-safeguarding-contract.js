/* Echoes Academy safeguarding policy contract v1 — offline only.
 * No collection of children's data, no recording, no network calls.
 * All decisions require enforcement by a future authenticated backend.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.EchoesAcademySafeguardingContract=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const VERSION=1;
 const ID=/^[A-Za-z0-9_-]{1,64}$/;
 const ACTIONS=Object.freeze(['participant.admit','participant.remove','participant.readmit','session.record','session.screen_share','session.moderate']);
 function describe(request){
  if(!request||typeof request!=='object'||Array.isArray(request)||request.schema_version!==VERSION||
     !ACTIONS.includes(request.action)||typeof request.session_id!=='string'||!ID.test(request.session_id)||
     typeof request.subject_id!=='string'||!ID.test(request.subject_id))
    return Object.freeze({valid:false,authorized:false,reason:'invalid_request'});
  return Object.freeze({valid:true,authorized:false,reason:'backend_safeguarding_approval_required',action:request.action});
 }
 function requirements(){
  return Object.freeze({
   authority:'server-only',authenticatedSessionRequired:true,verifiedRoleRequired:true,
   removedParticipantCannotSelfReadmit:true,revokedAccessMustBeEnforced:true,
   sessionMembershipMustBeCheckedPerAction:true,expiredAccessMustBeRejected:true,
   recordingDisabledByDefault:true,recordingRequiresExplicitConsent:true,
   recordingRequiresRetentionAndDeletionPolicy:true,
   minorProtectionRequiresAgeAppropriateSafeguards:true,
   minorRecordingRequiresAdditionalLegalReview:true,
   moderationRequiresAuditTrail:true,reportingRequiresConfidentialEscalation:true,
   directParticipantMessagingDisabledUntilSafeguardsApproved:true,
   noPersonalDataStoredByContract:true
  });
 }
 return Object.freeze({VERSION,ACTIONS,describe,requirements});
});
