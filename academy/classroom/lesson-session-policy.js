/* Existing Echoes Academy Learning Lab: offline lesson progression only.
 * No server, identity, permissions, timers, media, or classroom creation.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.EchoesAcademyLessonSessionPolicy=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const STATES=Object.freeze(['ready','running','paused','completed']);
 const TRANSITIONS=Object.freeze({
  ready:Object.freeze({start:'running'}),
  running:Object.freeze({pause:'paused',finish:'completed'}),
  paused:Object.freeze({resume:'running',finish:'completed'}),
  completed:Object.freeze({})
 });
 function next(state,action){
  if(!Object.prototype.hasOwnProperty.call(TRANSITIONS,state))throw Error('Unknown lesson state');
  if(typeof action!=='string')return null;
  return Object.prototype.hasOwnProperty.call(TRANSITIONS[state],action)?TRANSITIONS[state][action]:null;
 }
 function snapshot(state){
  if(!STATES.includes(state))throw Error('Unknown lesson state');
  return Object.freeze({state,canStart:state==='ready',canPause:state==='running',canResume:state==='paused',canFinish:state==='running'||state==='paused',synthetic:true,liveConnected:false,mediaEnabled:false,serverAuthorized:false});
 }
 return Object.freeze({STATES,next,snapshot});
});