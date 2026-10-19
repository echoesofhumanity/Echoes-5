'use strict';
// Offline, in-memory Echoes Academy LMS prototype. NOT a web server or production authorization layer.
const fs=require('node:fs');
const path=require('node:path');
const source=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/lms-synthetic-v1.json'),'utf8'));
const content=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/instructional-content-synthetic-v1.json'),'utf8'));
const languages=new Set(['en','tr','es','fr','de','pt','ru','ar','zh']);
function failure(code){return {ok:false,error:code};}
function createPrototype(){
 const progress=new Map();
 function locale(code){return languages.has(code)?code:null;}
 function catalog(code){
   if(!locale(code))return failure('unsupported_locale');
   return {ok:true,programs:source.programs.map(p=>({slug:p.slug,status:p.status,title:p.locales[code].title,description:p.locales[code].description}))};
 }
 function course(programSlug,code){
   if(!locale(code))return failure('unsupported_locale');
   const program=source.programs.find(p=>p.slug===programSlug);
   if(!program)return failure('program_not_found');
   if(programSlug!==content.programSlug)return {ok:true,program:{slug:program.slug,status:'planned'},modules:[],lessons:[],previewOnly:true};
   return {ok:true,program:{slug:program.slug,status:'planned'},modules:content.modules.map(m=>({key:m.stableKey,title:m.locales[code].title})),lessons:content.lessons.map(l=>({key:l.stableKey,moduleKey:content.modules.find(m=>m.id===l.moduleId)?.stableKey,title:l.locales[code].title})),previewOnly:true};
 }
 function simulateProgress(actor,programSlug,lessonKey){
   if(actor?.role!=='learner'||!source.actors.some(a=>a.id===actor.id&&a.role==='learner'))return failure('forbidden');
   if(programSlug!==content.programSlug||!content.lessons.some(l=>l.stableKey===lessonKey))return failure('lesson_not_found');
   const key=actor.id+'|'+programSlug+'|'+lessonKey;
   progress.set(key,'simulated_complete');
   return {ok:true,simulated:true,state:'simulated_complete'};
 }
 function getProgress(actor,learnerId){
   if(actor?.role!=='learner'||actor.id!==learnerId||!source.actors.some(a=>a.id===actor.id&&a.role==='learner'))return failure('forbidden');
   const prefix=learnerId+'|';
   return {ok:true,simulated:true,items:[...progress].filter(([key])=>key.startsWith(prefix)).map(([key,state])=>({programSlug:key.split('|')[1],lessonKey:key.split('|')[2],state}))};
 }
 function enroll(){return failure('enrollment_disabled');}
 function issueCredential(){return failure('credentials_disabled');}
 return Object.freeze({catalog,course,simulateProgress,getProgress,enroll,issueCredential});
}
module.exports={createPrototype};
