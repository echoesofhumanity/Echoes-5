/* Echoes Academy — state vocabulary adapter for the EXISTING Learning Lab.
 * Pure mapping only. Does not mutate the Lab, open a room, connect to a server,
 * grant instructor permissions, or access camera/microphone.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.EchoesAcademyRoomStateCompatibility=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const LAB_TO_ENGINE=Object.freeze({
    outside:'outside',waiting:'waiting',admitted:'admitted',
    rejected:'denied',removed:'removed'
  });
  const ENGINE_TO_LAB=Object.freeze({
    outside:'outside',waiting:'waiting',admitted:'admitted',
    denied:'rejected',removed:'removed'
  });
  function translate(table,state){
    if(typeof state!=='string'||!Object.prototype.hasOwnProperty.call(table,state))
      throw Error('Unknown classroom state');
    return table[state];
  }
  function toEngine(state){return translate(LAB_TO_ENGINE,state);}
  function toLab(state){return translate(ENGINE_TO_LAB,state);}
  function normalizeEvent(event){
    if(!event||typeof event!=='object'||Array.isArray(event))throw Error('Invalid classroom event');
    if(typeof event.type!=='string')throw Error('Invalid classroom event type');
    // Event names are already shared; translate state vocabulary only when present.
    if(!Object.prototype.hasOwnProperty.call(event,'state'))return Object.freeze({...event});
    return Object.freeze({...event,state:toLab(event.state)});
  }
  return Object.freeze({toEngine,toLab,normalizeEvent});
});
