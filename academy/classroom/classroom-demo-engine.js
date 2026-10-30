/* Echoes Academy — local-only synthetic classroom state engine.
 * Not authentication, real-time transport, media permission or production access control.
 * The existing Learning Lab UI remains unchanged until a separately tested integration.
 */
(function(root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.EchoesAcademyClassroomDemo = api;
})(typeof window !== 'undefined' ? window : null, function() {
  'use strict';
  const CAPACITY = 12;
  const STATES = Object.freeze({ OUTSIDE:'outside', WAITING:'waiting', ADMITTED:'admitted', DENIED:'denied', REMOVED:'removed' });
  const EVENTS = Object.freeze({
    REQUEST:'entry.requested', ADMIT:'participant.admitted', DENY:'entry.denied',
    REMOVE:'participant.removed', HAND:'hand.changed', GRANT:'speaker.granted',
    REVOKE:'speaker.revoked', END:'session.ended'
  });
  function create(options) {
    const cfg = options || {};
    const capacity = Number.isInteger(cfg.capacity) && cfg.capacity > 0 && cfg.capacity <= CAPACITY ? cfg.capacity : CAPACITY;
    const participants = new Map();
    const events = [];
    let sequence = 0, ended = false, speaker = null;
    function requireId(id) { if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(id)) throw Error('Invalid synthetic participant id'); }
    function emit(type,id,detail) {
      const event = Object.freeze({schema_version:1,event_id:'demo-'+(++sequence),session_id:'synthetic-classroom',sequence,type,subject_id:id,detail:detail||null});
      events.push(event); return event;
    }
    function assertOpen() { if (ended) throw Error('Session ended'); }
    function assertInstructor(role) { if (role !== 'instructor') throw Error('Demo instructor action required'); }
    function entry(id) { return participants.get(id) || {state:STATES.OUTSIDE,hand:false}; }
    function seats() { return [...participants.values()].filter(p=>p.state===STATES.ADMITTED).length; }
    function request(id) {
      assertOpen(); requireId(id);
      const p=entry(id);
      if (p.state===STATES.WAITING || p.state===STATES.ADMITTED) throw Error('Already waiting or admitted');
      participants.set(id,{state:STATES.WAITING,hand:false}); return emit(EVENTS.REQUEST,id);
    }
    function decide(id,accept,role) {
      assertOpen(); assertInstructor(role); requireId(id);
      if(entry(id).state!==STATES.WAITING) throw Error('No pending request');
      if(accept && seats()>=capacity) throw Error('Classroom full');
      participants.set(id,{state:accept?STATES.ADMITTED:STATES.DENIED,hand:false});
      return emit(accept?EVENTS.ADMIT:EVENTS.DENY,id);
    }
    function remove(id,role) {
      assertOpen(); assertInstructor(role); requireId(id);
      if(entry(id).state!==STATES.ADMITTED) throw Error('Not admitted');
      if(speaker===id) { speaker=null; emit(EVENTS.REVOKE,id); }
      participants.set(id,{state:STATES.REMOVED,hand:false}); return emit(EVENTS.REMOVE,id);
    }
    function hand(id,raised) {
      assertOpen(); requireId(id);
      if(entry(id).state!==STATES.ADMITTED) throw Error('Not admitted');
      const p=entry(id); participants.set(id,{state:p.state,hand:!!raised});
      return emit(EVENTS.HAND,id,{raised:!!raised});
    }
    function grant(id,role) {
      assertOpen(); assertInstructor(role); requireId(id);
      const p=entry(id);
      if(p.state!==STATES.ADMITTED || !p.hand) throw Error('Participant is not queued');
      if(speaker!==null) throw Error('Speaker already active');
      speaker=id; participants.set(id,{state:p.state,hand:false}); return emit(EVENTS.GRANT,id);
    }
    function revoke(role) {
      assertOpen(); assertInstructor(role);
      if(speaker===null) throw Error('No speaker');
      const id=speaker; speaker=null; return emit(EVENTS.REVOKE,id);
    }
    function end(role) {
      assertOpen(); assertInstructor(role);
      speaker=null; ended=true; return emit(EVENTS.END,'classroom');
    }
    function snapshot() {
      return Object.freeze({mode:'synthetic-local-only',capacity,ended,speaker,sequence,
        seats:seats(),participants:[...participants].map(([id,p])=>Object.freeze({id,state:p.state,hand:p.hand})),
        events:events.slice()});
    }
    return Object.freeze({request,decide,remove,hand,grant,revoke,end,snapshot});
  }
  return Object.freeze({create,STATES,EVENTS,CAPACITY});
});
