/* Echoes Academy — existing Learning Lab to future server event vocabulary.
 * Offline, declarative and read-only: never dispatches actions, mutates DOM,
 * grants permissions or connects to a service. Server validates every command.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.EchoesAcademyLabEventContract=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const MAP=Object.freeze({
  roomRequest:Object.freeze({action:'entry.request',event:'entry.requested',authority:'student'}),
  roomAdmit:Object.freeze({action:'entry.decide',event:'participant.admitted',authority:'instructor'}),
  roomReject:Object.freeze({action:'entry.decide',event:'entry.denied',authority:'instructor'}),
  roomRemove:Object.freeze({action:'participant.remove',event:'participant.removed',authority:'instructor'}),
  seminarHand:Object.freeze({action:'hand.set',event:'hand.changed',authority:'student'})
 });
 const SERVER_ONLY=Object.freeze({
  grantSpeaking:Object.freeze({action:'speaker.grant',event:'speaker.granted',authority:'instructor'}),
  revokeSpeaking:Object.freeze({action:'speaker.revoke',event:'speaker.revoked',authority:'instructor'}),
  endSession:Object.freeze({action:'session.end',event:'session.ended',authority:'instructor'})
 });
 function describe(control){
  const mapping=Object.prototype.hasOwnProperty.call(MAP,control)?MAP[control]:Object.prototype.hasOwnProperty.call(SERVER_ONLY,control)?SERVER_ONLY[control]:null;
  return mapping?Object.freeze({known:true,control,...mapping,authorized:false,dispatched:false}):Object.freeze({known:false,authorized:false,dispatched:false});
 }
 return Object.freeze({MAP,SERVER_ONLY,describe});
});
