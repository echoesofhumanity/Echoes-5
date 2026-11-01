/* Echoes Academy — live session protocol v1 (offline contract only).
 * No room creation, server, token, microphone or camera integration.
 * Server is the sole authority for transitions and participant membership.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.EchoesAcademySessionContract=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const VERSION=1;
 const COMMANDS=Object.freeze(['session.create','session.join','session.leave','session.resume','session.end']);
 const EVENTS=Object.freeze(['session.created','session.joined','session.left','session.interrupted','session.resumed','session.ended']);
 const ID=/^[A-Za-z0-9_-]{1,64}$/;
 function validCommand(message){
  return !!message&&typeof message==='object'&&!Array.isArray(message)&&message.schema_version===VERSION&&COMMANDS.includes(message.type)&&typeof message.request_id==='string'&&ID.test(message.request_id)&&typeof message.session_id==='string'&&ID.test(message.session_id);
 }
 function describeCommand(message){
  return Object.freeze({valid:validCommand(message),authorized:false,sendableWithoutServer:false});
 }
 function policy(){
  return Object.freeze({authority:'server-only',createRequiresInstructorApproval:true,joinRequiresMembershipVerification:true,resumeRequiresFreshServerApproval:true,endRequiresInstructorAuthorization:true,leaveRevokesLocalMedia:true,disconnectedCanGrantPermissions:false,serverTransportConfigured:false});
 }
 return Object.freeze({VERSION,COMMANDS,EVENTS,describeCommand,policy});
});
