/* Echoes Academy — provider-neutral identity and role contract, v1.
 * Schema only. Never authenticates a user, validates a token, or grants authority.
 * Future backend MUST verify credentials, session membership and role server-side.
 * No credentials, personal data, network requests or live integration here.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.EchoesAcademyIdentityContract=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const VERSION=1;
 const ROLES=Object.freeze(['instructor','student','moderator']);
 const ID=/^[A-Za-z0-9_-]{1,64}$/;
 function validId(value){return typeof value==='string'&&ID.test(value);}
 function describe(claim){
  if(!claim||typeof claim!=='object'||Array.isArray(claim))return Object.freeze({valid:false,reason:'invalid_claim',authorized:false});
  if(claim.schema_version!==VERSION)return Object.freeze({valid:false,reason:'unsupported_schema',authorized:false});
  if(!validId(claim.session_id)||!validId(claim.subject_id))return Object.freeze({valid:false,reason:'invalid_identifier',authorized:false});
  if(!ROLES.includes(claim.role))return Object.freeze({valid:false,reason:'invalid_role',authorized:false});
  if(!Number.isSafeInteger(claim.issued_at)||!Number.isSafeInteger(claim.expires_at)||claim.issued_at<0||claim.expires_at<=claim.issued_at)return Object.freeze({valid:false,reason:'invalid_expiry',authorized:false});
  return Object.freeze({valid:true,reason:'unverified_claim',authorized:false,sessionId:claim.session_id,subjectId:claim.subject_id,role:claim.role,expiresAt:claim.expires_at});
 }
 function requirements(){
  return Object.freeze({
   authority:'server-only',
   verification:Object.freeze(['authenticated_identity','active_session_membership','server_assigned_role','not_expired','not_revoked','action_authorized']),
   clientClaimsGrantAccess:false,
   sessionRejoinRequiresServerApproval:true,
   removedParticipantRequiresServerReadmission:true,
   mediaRequiresServerApproval:true
  });
 }
 return Object.freeze({VERSION,ROLES,describe,requirements});
});
