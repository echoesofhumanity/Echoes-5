/* Offline operations checklist; does not enable live classes. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.EchoesAcademyOperationsReadiness=api;
})(typeof window!=='undefined'?window:null,function(){
 const checks=Object.freeze([
 'identity','roles','membership','disconnect','rejoin',
 'moderation','safeguarding','recording_policy','media_end_to_end',
 'capacity_load_test','mobile_recovery','accessibility','incident_response'
 ]);
 function assess(){
  return Object.freeze({
   productionReady:false,
   verifiedCapacity:null,
   verifiedSimultaneousSpeakers:null,
   mediaProviderConfigured:false,
   pendingChecks:checks
  });
 }
 return Object.freeze({checks,assess});
});
