'use strict';
// Offline-only Academy LMS service prototype. No network, storage or production auth.
const languages=Object.freeze(['en','tr','es','fr','de','pt','ru','ar','zh']);
const copy=x=>structuredClone(x);
function makeService(fixture){
  if(fixture?.synthetic!==true||fixture?.publicationState!=='draft')throw Error('SYNTHETIC_DRAFT_ONLY');
  const source=copy(fixture);
  const progress=new Map();
  function actorCheck(actor){if(!actor||typeof actor.id!=='string'||!actor.id.startsWith('synthetic-')||!['learner','instructor','visitor'].includes(actor.role))throw Error('ACCESS_DENIED');}
  function languageCheck(lang){if(!languages.includes(lang))throw Error('UNSUPPORTED_LANGUAGE');}
  function catalog(lang){
    languageCheck(lang);
    return {synthetic:true,programSlug:source.programSlug,status:'preview_only',modules:source.modules.map(m=>({key:m.stableKey,title:m.locales[lang].title,summary:m.locales[lang].summary,lessons:source.lessons.filter(l=>l.moduleId===m.id).map(l=>({key:l.stableKey,title:l.locales[lang].title,summary:l.locales[lang].summary}))}))};
  }
  function getProgress(actor){
    actorCheck(actor);
    if(actor.role!=='learner')throw Error('ACCESS_DENIED');
    return {synthetic:true,learnerId:actor.id,completedLessonKeys:[...(progress.get(actor.id)||new Set())]};
  }
  function completeLesson(actor,lessonKey){
    actorCheck(actor);
    if(actor.role!=='learner')throw Error('ACCESS_DENIED');
    if(!source.lessons.some(l=>l.stableKey===lessonKey))throw Error('UNKNOWN_LESSON');
    const completed=progress.get(actor.id)||new Set();
    completed.add(lessonKey);
    progress.set(actor.id,completed);
    return getProgress(actor);
  }
  function readLearnerProgress(actor,targetId){
    actorCheck(actor);
    if(actor.role!=='learner'||actor.id!==targetId)throw Error('ACCESS_DENIED');
    return getProgress(actor);
  }
  function enroll(){throw Error('ENROLLMENT_DISABLED');}
  function issueCredential(){throw Error('CREDENTIAL_ISSUANCE_DISABLED');}
  return Object.freeze({catalog,getProgress,completeLesson,readLearnerProgress,enroll,issueCredential});
}
module.exports={makeService,languages};
