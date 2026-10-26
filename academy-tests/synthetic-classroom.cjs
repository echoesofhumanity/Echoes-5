'use strict';
// Offline synthetic classroom model. No network, meetings, tokens or real participants.
function createClassroom({programSlugs,actors}){
 const allowed=new Set(programSlugs);
 const known=new Map(actors.map(a=>[a.id,a.role]));
 const sessions=new Map();
 const fail=code=>{throw Error(code);};
 const check=(actor,role)=>{if(!actor||known.get(actor.id)!==role||actor.role!==role)fail('forbidden');};
 const view=s=>({id:s.id,programSlug:s.programSlug,startUtc:s.startUtc,durationMinutes:s.durationMinutes,status:s.status,participantLimit:s.participantLimit,recordingEnabled:false,joinEnabled:false,attendeeCount:s.attendees.size});
 return Object.freeze({
  schedule(actor,data){
   check(actor,'instructor');
   if(!data||typeof data!=='object'||Object.keys(data).some(k=>!['id','programSlug','startUtc','durationMinutes','participantLimit'].includes(k)))fail('invalid_request');
   if(typeof data.id!=='string'||!/^synthetic-session-[a-z0-9-]+$/.test(data.id)||sessions.has(data.id))fail('invalid_session');
   if(!allowed.has(data.programSlug)||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(data.startUtc)||!Number.isFinite(Date.parse(data.startUtc))||!Number.isInteger(data.durationMinutes)||data.durationMinutes<15||data.durationMinutes>180||!Number.isInteger(data.participantLimit)||data.participantLimit<1||data.participantLimit>20)fail('invalid_request');
   const s={...data,instructorId:actor.id,status:'scheduled',attendees:new Set()};
   sessions.set(s.id,s);return view(s);
  },
  list(){return [...sessions.values()].map(view);},
  reserve(actor,id){
   check(actor,'learner');
   const s=sessions.get(id);if(!s)fail('not_found');
   if(s.status!=='scheduled')fail('session_closed');
   if(!s.attendees.has(actor.id)&&s.attendees.size>=s.participantLimit)fail('class_full');
   s.attendees.add(actor.id);return {synthetic:true,reserved:true,joinEnabled:false,recordingEnabled:false};
  },
  cancel(actor,id){
   check(actor,'instructor');
   const s=sessions.get(id);if(!s)fail('not_found');
   if(s.instructorId!==actor.id)fail('forbidden');
   if(s.status!=='scheduled')fail('session_closed');
   s.status='cancelled';return view(s);
  },
  join(){fail('live_join_disabled');},
  enableRecording(){fail('recording_disabled');},
  issueJoinToken(){fail('tokens_disabled');}
 });
}
module.exports={createClassroom};
