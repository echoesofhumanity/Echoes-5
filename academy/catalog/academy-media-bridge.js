/* Echoes Academy media bridge v1. Inert unless a published lesson is explicitly selected. */
(function(){
'use strict';
const player=document.getElementById('lessonVideo');
if(!player)return;
const intro=player.getAttribute('src');
let catalog=null;
async function init(){
  if(!window.EchoesAcademyCatalog)return;
  try{catalog=await window.EchoesAcademyCatalog.load();}
  catch(e){console.warn('Academy catalog unavailable; introduction video preserved.');}
}
function selectPublishedLesson(programId,lessonId,language){
  if(!catalog||!window.EchoesAcademyCatalog)return false;
  const lesson=window.EchoesAcademyCatalog.resolveLesson(catalog,programId,lessonId,language);
  if(!lesson)return false;
  // Published lesson selection is opt-in. No synthetic demo button invokes this.
  player.pause();
  player.querySelectorAll('track[data-academy-lesson-track]').forEach(t=>t.remove());
  player.setAttribute('src',lesson.videoUrl);
  if(lesson.subtitleUrl){
    try{
      const u=new URL(lesson.subtitleUrl,window.location.href);
      if(u.protocol==='https:'||u.origin===window.location.origin){
        const t=document.createElement('track');t.kind='subtitles';t.srclang=lesson.language;t.label=lesson.language;t.src=u.href;t.dataset.academyLessonTrack='true';player.appendChild(t);
      }
    }catch(e){console.warn('Academy subtitle unavailable');}
  }
  player.load();
  return true;
}
window.EchoesAcademyMedia=Object.freeze({selectPublishedLesson,ready:()=>!!catalog,introductionSource:intro});
init();
})();
