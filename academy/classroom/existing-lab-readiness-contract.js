/* Echoes Academy — provider-neutral readiness contract for EXISTING Learning Lab.
 * Offline composition only. No transport attachment, authority, media or server.
 * Browser-provided claims never count as server proof.
 */
(function(root,factory){
  'use strict';
  const api=factory(
    typeof module==='object'&&module.exports?require('./session-lifecycle-policy.js'):root&&root.EchoesAcademySessionLifecycle,
    typeof module==='object'&&module.exports?require('./classroom-permission-gate.js'):root&&root.EchoesAcademyClassroomPermissionGate,
    typeof module==='object'&&module.exports?require('./live-classroom-boundary.js'):root&&root.EchoesAcademyLiveBoundary
  );
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.EchoesAcademyReadinessContract=api;
})(typeof window!=='undefined'?window:null,function(lifecycle,gate,boundary){
  'use strict';
  if(!lifecycle||!gate||!boundary)throw Error('Readiness contract dependencies missing');
  function create(){
    let state='idle';
    function status(){
      const session=lifecycle.snapshot(state);
      return Object.freeze({
        integration:'existing-learning-lab',
        mode:'offline-preparation',
        session,
        liveConnected:false,
        serverConfigured:false,
        authorized:false,
        mediaEnabled:false,
        supportedActions:boundary.ACTIONS,
        languages:boundary.LANGUAGES
      });
    }
    function transition(action){
      const target=lifecycle.next(state,action);
      if(!target)return Object.freeze({accepted:false,...status()});
      state=target;
      return Object.freeze({accepted:true,...status()});
    }
    function evaluate(action,role,participantState){
      // A future authenticated server adapter must own verified authorization.
      // This offline contract deliberately cannot accept fabricated proof flags.
      return gate.decision({action,role,participantState,sessionState:state,serverVerified:false,serverActionApproved:false});
    }
    return Object.freeze({status,transition,evaluate});
  }
  return Object.freeze({create});
});
