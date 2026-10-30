/* Echoes Academy — pure transition policy for the EXISTING synthetic room.
 * No UI, network, authorization, camera, microphone, or new classroom.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.EchoesAcademyRoomTransitions=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const transitions=Object.freeze({
    roomRequest:Object.freeze({outside:'waiting',rejected:'waiting',removed:'waiting'}),
    roomAdmit:Object.freeze({waiting:'admitted'}),
    roomReject:Object.freeze({waiting:'rejected'}),
    roomRemove:Object.freeze({admitted:'removed'})
  });
  function next(control,state,seats,capacity){
    if(!Object.prototype.hasOwnProperty.call(transitions,control))return null;
    const target=transitions[control][state]||null;
    if(!target)return null;
    if(target==='admitted'&&(!Number.isInteger(seats)||!Number.isInteger(capacity)||seats>=capacity))return null;
    return target;
  }
  return Object.freeze({next,controls:Object.freeze(Object.keys(transitions))});
});
