'use strict';
// Synthetic, in-memory only. Never connects to production services.
function createService(domain,lessonData){
 if(domain.synthetic!==true||lessonData.synthetic!==true)throw Error('synthetic_only');
 const languages=new Set(domain.localeCodes);
 const progress=new Map();
 const actorCheck=a=>{if(!a||a.role!=='learner'||!domain.actors.some(x=>x.id===a.id&&x.role==='learner'))throw Error('forbidden');};
 const languageCheck=l=>{if(!languages.has(l))throw Error('unsupported_locale');};
 const findProgram=slug=>{const p=domain.programs.find(x=>x.slug===slug);if(!p)throw Error('not_found');return p;};
 const findLesson=id=>{const l=lessonData.lessons.find(x=>x.id===id);if(!l)throw Error('not_found');return l;};
 return Object.freeze({
  listPrograms(language){languageCheck(language);return domain.programs.map(p=>({slug:p.slug,status:p.status,title:p.locales[language].title}));},
  getProgram(slug,language){languageCheck(language);const p=findProgram(slug);return {slug:p.slug,status:p.status,...structuredClone(p.locales[language]),enrollmentEnabled:false};},
  listModules(slug,language){languageCheck(language);findProgram(slug);if(slug!==lessonData.programSlug)return [];return lessonData.modules.map(m=>({id:m.id,key:m.stableKey,status:m.status,title:m.locales[language].title}));},
  listLessons(moduleId,language){languageCheck(language);if(!lessonData.modules.some(m=>m.id===moduleId))throw Error('not_found');return lessonData.lessons.filter(l=>l.moduleId===moduleId).map(l=>({id:l.id,key:l.stableKey,status:l.status,title:l.locales[language].title,previewOnly:true}));},
  simulateProgress(actor,lessonId,state){actorCheck(actor);findLesson(lessonId);if(!['not_started','in_progress','completed'].includes(state))throw Error('invalid_state');const key=actor.id+':'+lessonId;const prior=progress.get(key)||'not_started';if(['not_started','in_progress','completed'].indexOf(state)<['not_started','in_progress','completed'].indexOf(prior))throw Error('invalid_transition');progress.set(key,state);return {synthetic:true,persisted:false,state};},
  readProgress(actor,lessonId){actorCheck(actor);findLesson(lessonId);return {synthetic:true,persisted:false,state:progress.get(actor.id+':'+lessonId)||'not_started'};},
  enroll(){throw Error('enrollment_disabled');},
  issueCredential(){throw Error('credentials_disabled');}
 });
}
module.exports={createService};
