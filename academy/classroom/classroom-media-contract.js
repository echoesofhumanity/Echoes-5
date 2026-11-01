/* Echoes Academy — provider-neutral media readiness contract.
 * OFFLINE ONLY: no camera/microphone access, media capture, network, tokens,
 * recording, room creation or provider binding. Future server must authorize
 * media publishing separately from classroom UI roles.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.EchoesAcademyMediaContract=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const VERSION=1;
 const KINDS=Object.freeze(['audio','video','screen']);
 const OPERATIONS=Object.freeze(['media.publish','media.unpublish','media.subscribe','media.unsubscribe']);
 const ID=/^[A-Za-z0-9_-]{1,64}$/;
 function describe(request){
  if(!request||typeof request!=='object'||Array.isArray(request)||request.schema_version!==VERSION||
     !OPERATIONS.includes(request.operation)||!KINDS.includes(request.kind)||
     typeof request.session_id!=='string'||!ID.test(request.session_id)||
     typeof request.subject_id!=='string'||!ID.test(request.subject_id))
   return Object.freeze({valid:false,authorized:false,reason:'invalid_request'});
  return Object.freeze({valid:true,authorized:false,reason:'server_media_approval_required',
   operation:request.operation,kind:request.kind,sessionId:request.session_id,subjectId:request.subject_id});
 }
 function policy(){
  return Object.freeze({
   provider:'unconfigured',transportConfigured:false,mediaEnabled:false,
   captureEnabled:false,recordingEnabled:false,screenShareEnabled:false,
   serverApprovalRequired:true,activeMembershipRequired:true,
   publishRequiresExplicitUserConsent:true,
   screenShareRequiresExplicitUserConsent:true,
   revokedOrDisconnectedStopsPublishing:true,
   rejoinRequiresFreshMediaAuthorization:true,
   recordingsRequireSeparateConsentAndRetentionPolicy:true
  });
 }
 return Object.freeze({VERSION,KINDS,OPERATIONS,describe,policy});
});
