/* Echoes Academy — fail-closed permission gate for the EXISTING Learning Lab.
 * Pure offline policy, not a source of real authority. The future server MUST
 * authenticate identities, enforce roles and confirm each action.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.EchoesAcademyClassroomPermissionGate=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const INSTRUCTOR=Object.freeze(['entry.decide','speaker.grant','speaker.revoke','participant.remove','session.end']);
  const STUDENT=Object.freeze(['entry.request','hand.set']);
  const ACTIONS=Object.freeze([...INSTRUCTOR,...STUDENT]);
  function decision(input){
    if(!input||typeof input!=='object'||Array.isArray(input))return Object.freeze({allowed:false,reason:'invalid_context'});
    const {action,role,sessionState,serverVerified,participantState}=input;
    if(!ACTIONS.includes(action))return Object.freeze({allowed:false,reason:'unknown_action'});
    if(sessionState!=='connected')return Object.freeze({allowed:false,reason:'session_not_connected'});
    if(serverVerified!==true)return Object.freeze({allowed:false,reason:'server_verification_required'});
    if(role!=='instructor'&&role!=='student')return Object.freeze({allowed:false,reason:'unknown_role'});
    if(role==='instructor'&&!INSTRUCTOR.includes(action)||role==='student'&&!STUDENT.includes(action))
      return Object.freeze({allowed:false,reason:'role_forbidden'});
    if(role==='student'&&participantState==='removed')return Object.freeze({allowed:false,reason:'removed_requires_new_server_decision'});
    // This only checks a verified server result supplied by a future adapter.
    // It cannot itself prove that the result really came from a trusted server.
    if(input.serverActionApproved!==true)return Object.freeze({allowed:false,reason:'server_action_approval_required'});
    return Object.freeze({allowed:true,reason:'server_approved'});
  }
  return Object.freeze({decision,ACTIONS,INSTRUCTOR,STUDENT});
});
