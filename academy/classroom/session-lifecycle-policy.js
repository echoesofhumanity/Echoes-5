/* Echoes Academy — offline session lifecycle policy for the EXISTING Learning Lab.
 * Pure state decisions only: no authentication claims, transport, timers or media.
 * The future server remains authoritative for identity, roles and permissions.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.EchoesAcademySessionLifecycle=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const STATES=Object.freeze(['idle','joining','connected','interrupted','rejoining','ended']);
  const TRANSITIONS=Object.freeze({
    idle:Object.freeze({join:'joining',end:'ended'}),
    joining:Object.freeze({connected:'connected',disconnect:'interrupted',end:'ended'}),
    connected:Object.freeze({disconnect:'interrupted',end:'ended'}),
    interrupted:Object.freeze({retry:'rejoining',end:'ended'}),
    rejoining:Object.freeze({connected:'connected',disconnect:'interrupted',end:'ended'}),
    ended:Object.freeze({})
  });
  function next(state,action){
    if(!Object.prototype.hasOwnProperty.call(TRANSITIONS,state))throw Error('Unknown session state');
    if(typeof action!=='string')return null;
    return Object.prototype.hasOwnProperty.call(TRANSITIONS[state],action)?TRANSITIONS[state][action]:null;
  }
  function snapshot(state){
    if(!STATES.includes(state))throw Error('Unknown session state');
    return Object.freeze({
      state,
      canRequestJoin:state==='idle',
      canRequestRetry:state==='interrupted',
      canRequestEnd:state!=='ended',
      mediaEnabled:false,
      serverAuthorized:false
    });
  }
  return Object.freeze({STATES,next,snapshot});
});
