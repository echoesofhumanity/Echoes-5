/* Echoes Academy: provider-neutral classroom transport boundary.
 * NO server connection, credentials, media capture or network requests.
 * Designed for the existing Learning Lab, not a second classroom.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.EchoesAcademyLiveBoundary=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const ACTIONS=Object.freeze(['entry.request','entry.decide','hand.set','speaker.grant','speaker.revoke','participant.remove','session.end']);
  const EVENTS=Object.freeze(['entry.requested','participant.admitted','entry.denied','participant.removed','hand.changed','speaker.granted','speaker.revoked','session.ended']);
  const LANGUAGES=Object.freeze(['en','tr','es','fr','de','pt','ru','ar','zh']);
  const MODES=Object.freeze({UNCONFIGURED:'unconfigured',DEMO:'synthetic',LIVE:'live'});
  function validId(id){return typeof id==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(id);}
  function validateEvent(e,previousSequence){
    if(!e||e.schema_version!==1||!validId(e.session_id)||!validId(e.subject_id)||!validId(e.event_id)||!EVENTS.includes(e.type)||!Number.isSafeInteger(e.sequence)||e.sequence<1)return false;
    if(previousSequence!==undefined&&e.sequence!==previousSequence+1)return false;
    return true;
  }
  function createBoundary(){
    let mode=MODES.UNCONFIGURED,adapter=null,lastSequence=0,subscribers=new Set();
    function status(){return Object.freeze({mode,connected:mode===MODES.LIVE&&!!adapter,lastSequence});}
    function subscribe(fn){if(typeof fn!=='function')throw Error('Listener required');subscribers.add(fn);return ()=>subscribers.delete(fn);}
    function notify(event){for(const fn of subscribers)fn(event);}
    function attach(adapterCandidate){
      if(mode!==MODES.UNCONFIGURED)throw Error('Already configured');
      if(!adapterCandidate||typeof adapterCandidate.send!=='function'||typeof adapterCandidate.close!=='function'||typeof adapterCandidate.subscribe!=='function')throw Error('Invalid transport adapter');
      // Adapter binding is not a trust boundary: the server must enforce every permission.
      const detach=adapterCandidate.subscribe(event=>{
        if(!validateEvent(event,lastSequence)){notify(Object.freeze({type:'resync.required'}));return;}
        lastSequence=event.sequence;notify(Object.freeze({...event}));
      });
      if(typeof detach!=='function')throw Error('Adapter must return unsubscribe');
      adapter=Object.freeze({send:adapterCandidate.send.bind(adapterCandidate),close:adapterCandidate.close.bind(adapterCandidate),detach});
      mode=MODES.LIVE;
    }
    async function send(action,payload){
      if(!ACTIONS.includes(action))throw Error('Unsupported classroom action');
      if(mode!==MODES.LIVE||!adapter)throw Error('Live classroom unavailable: no server configured');
      // Do not infer authorization from browser-side state.
      return adapter.send(action,payload||{});
    }
    function close(){if(adapter){adapter.detach();adapter.close();}adapter=null;mode=MODES.UNCONFIGURED;lastSequence=0;}
    return Object.freeze({status,subscribe,attach,send,close});
  }
  return Object.freeze({createBoundary,validateEvent,ACTIONS,EVENTS,LANGUAGES,MODES});
});
