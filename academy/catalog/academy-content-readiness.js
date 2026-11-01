/* Echoes Academy — read-only program/module/lesson readiness audit.
 * Does not publish lessons, create media, issue certificates or open seminars.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.EchoesAcademyContentReadiness=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 function audit(data){
  if(!data||!Array.isArray(data.pilot_programs)||data.pilot_programs.length!==8)throw Error('Invalid Academy catalog');
  const programIds=new Set(),lessonIds=new Set();
  let moduleCount=0,draftLessons=0,publishedLessons=0,publishedWithMedia=0,seminarCount=0;
  const programs=data.pilot_programs.map(p=>{
   if(!p||typeof p.id!=='string'||programIds.has(p.id)||!Array.isArray(p.indicative_modules_en)||!Array.isArray(p.lessons)||!Array.isArray(p.seminars))throw Error('Invalid Academy program');
   programIds.add(p.id);
   const modules=new Set(p.indicative_modules_en.map(m=>m.id));
   if(modules.size!==p.indicative_modules_en.length)throw Error('Duplicate module');
   moduleCount+=modules.size;
   let drafts=0,published=0;
   for(const l of p.lessons){
    if(!l||typeof l.id!=='string'||lessonIds.has(l.id)||!modules.has(l.module_id))throw Error('Unmapped or duplicate lesson');
    lessonIds.add(l.id);
    if(l.status==='draft'){drafts++;draftLessons++;}
    else if(l.status==='published'){
     published++;publishedLessons++;
     if(!l.media||typeof l.media.url!=='string'||!l.media.url.trim())throw Error('Published lesson missing media');
     publishedWithMedia++;
    }else throw Error('Unknown lesson status');
   }
   seminarCount+=p.seminars.length;
   return Object.freeze({id:p.id,moduleCount:modules.size,draftLessons:drafts,publishedLessons:published,missingLessonModules:modules.size-new Set(p.lessons.map(l=>l.module_id)).size});
  });
  if(!Array.isArray(data.lessons)||!Array.isArray(data.seminars))throw Error('Invalid top-level catalog');
  if(data.lessons.length||data.seminars.length)throw Error('Top-level lesson/seminar references require explicit reconciliation');
  return Object.freeze({inventoryOnly:data.status==='inventory_only',programCount:programs.length,moduleCount,draftLessons,publishedLessons,publishedWithMedia,seminarCount,readyForLiveTeaching:false,programs:Object.freeze(programs)});
 }
 return Object.freeze({audit});
});
