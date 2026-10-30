/* Echoes Academy — read-only projection of EXISTING Learning Lab participants.
 * Pure, local, provider-neutral. No classroom creation, network or media access.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.EchoesAcademyLabEventProjection=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const STATES=Object.freeze(['outside','waiting','admitted','rejected','removed','queued','speaking','finished']);
  function project(participants,compatibility){
    if(!Array.isArray(participants)||!compatibility||typeof compatibility.toEngine!=='function')
      throw Error('Invalid classroom snapshot');
    const ids=new Set();
    let speaker=null;
    const projected=participants.map(p=>{
      if(!p||!Number.isSafeInteger(p.id)||p.id<0||ids.has(p.id)||!STATES.includes(p.state))
        throw Error('Invalid participant');
      ids.add(p.id);
      const active=['admitted','queued','speaking','finished'].includes(p.state);
      if(p.state==='speaking'){
        if(speaker!==null)throw Error('Multiple speakers');
        speaker=p.id;
      }
      const state=active?'admitted':compatibility.toEngine(p.state);
      return Object.freeze({id:p.id,state,handQueued:p.state==='queued',speaking:p.state==='speaking',turnFinished:p.state==='finished'});
    });
    if(projected.filter(p=>p.state==='admitted').length>12)throw Error('Classroom capacity exceeded');
    return Object.freeze({mode:'synthetic-local-only',speaker,participants:Object.freeze(projected)});
  }
  return Object.freeze({project,STATES});
});
