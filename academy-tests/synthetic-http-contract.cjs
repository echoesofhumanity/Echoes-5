'use strict';
// Offline HTTP semantics simulator: accepts Request-like objects; opens NO socket.
// Not authentication. Synthetic actor is supplied by the test harness ONLY.
const {createService}=require('./synthetic-lms-service.cjs');
function createHttpContract(domain,lessons){
 const service=createService(domain,lessons);
 const supported=new Set(domain.localeCodes);
 function response(status,data,requestId='synthetic-request'){
  return {status,headers:{'cache-control':'no-store','content-type':'application/json'},body:status<400?{data,meta:{requestId}}:{error:{code:data,requestId}}};
 }
 function handle({method='GET',path='/',language='en',actor=null,body=null}={}){
  if(!supported.has(language))return response(400,'unsupported_locale');
  if(typeof path!=='string'||!path.startsWith('/academy-api/v1/'))return response(404,'not_found');
  if(!['GET','PUT','POST'].includes(method))return response(405,'method_not_allowed');
  const prefix='/academy-api/v1';
  try{
   if(method==='GET'&&path===prefix+'/catalog/programs')return response(200,service.listPrograms(language));
   const program=path.match(/^\/academy-api\/v1\/catalog\/programs\/([a-z0-9-]+)$/);
   if(method==='GET'&&program)return response(200,service.getProgram(program[1],language));
   const modules=path.match(/^\/academy-api\/v1\/catalog\/programs\/([a-z0-9-]+)\/modules$/);
   if(method==='GET'&&modules)return response(200,service.listModules(modules[1],language));
   const progress=path.match(/^\/academy-api\/v1\/me\/progress\/([a-z0-9-]+)$/);
   if(progress){
    if(!actor||actor.role!=='learner'||!domain.actors.some(a=>a.id===actor.id&&a.role==='learner'))return response(403,'forbidden');
    if(method==='GET')return response(200,service.readProgress(actor,progress[1]));
    if(method==='PUT'){
     if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length!==1||!['not_started','in_progress','completed'].includes(body.state))return response(422,'invalid_progress_state');
     return response(200,service.simulateProgress(actor,progress[1],body.state));
    }
   }
   if(method==='POST'&&(/^\/academy-api\/v1\/courses\/[^/]+\/enrollments$/.test(path)))return response(403,'enrollment_disabled');
   if(method==='POST'&&(/^\/academy-api\/v1\/credentials\/[^/]+\/issue$/.test(path)))return response(403,'credentials_disabled');
   return response(404,'not_found');
  }catch(e){
   if(e.message==='not_found')return response(404,'not_found');
   if(e.message==='forbidden')return response(403,'forbidden');
   if(e.message==='unsupported_locale')return response(400,'unsupported_locale');
   if(e.message==='invalid_transition')return response(409,'invalid_transition');
   return response(500,'internal_error');
  }
 }
 return Object.freeze({handle});
}
module.exports={createHttpContract};
