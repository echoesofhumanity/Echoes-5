/* Existing Learning Lab — non-invasive, server-free integration bridge.
 * Reads the current classroom DOM. It does not replace any existing controls,
 * grant permissions, call a server, or enable microphone/camera.
 */
(function(root,factory){
  'use strict';
  if(typeof module==='object'&&module.exports)module.exports=factory;
  if(root)root.EchoesAcademyLabBridge=factory;
})(typeof window!=='undefined'?window:null,function(documentRef,boundaryApi){
  'use strict';
  if(!documentRef||!boundaryApi||typeof boundaryApi.createBoundary!=='function')throw Error('Lab bridge prerequisites missing');
  const ids=Object.freeze(['roomStudentView','roomInstructorView','roomRequest','roomAdmit','roomReject','roomRemove','seminarHand','roomDemoStatus','roomInstructorPanel','roomStudentPanel','liveTitle']);
  function inspect(){
    const missing=ids.filter(id=>!documentRef.getElementById(id));
    return Object.freeze({ready:missing.length===0,missing:Object.freeze(missing)});
  }
  const boundary=boundaryApi.createBoundary();
  function snapshot(){
    const check=inspect();
    const value=id=>{const el=documentRef.getElementById(id);return el?String(el.textContent||'').trim():null;};
    const pressed=id=>{const el=documentRef.getElementById(id);return el?el.getAttribute('aria-pressed')==='true':false;};
    return Object.freeze({
      integration:'existing-learning-lab',
      mode:'synthetic-local-only',
      liveConnected:boundary.status().connected,
      ready:check.ready,
      missing:check.missing,
      view:pressed('roomInstructorView')?'instructor-preview':'student-preview',
      roomStatus:value('roomDemoStatus'),
      handRaised:pressed('seminarHand')
    });
  }
  // Deliberately no live attach or send methods exposed from the page.
  return Object.freeze({inspect,snapshot});
});
