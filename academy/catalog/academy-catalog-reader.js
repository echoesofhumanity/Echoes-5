/* Echoes Academy catalog reader v1 — read-only; no learner data or publishing side effects. */
(function(global){
  'use strict';
  const SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const LANGS=['en','tr','es','fr','de','pt','ru','ar','zh'];
  function validate(data){
    if(!data||!Array.isArray(data.pilot_programs)||data.pilot_programs.length!==8)throw Error('Invalid Academy program catalog');
    const ids=new Set();
    for(const p of data.pilot_programs){
      if(!SLUG.test(p.id)||ids.has(p.id)||!Array.isArray(p.learning_outcomes_en)||p.learning_outcomes_en.length!==3||!Array.isArray(p.indicative_modules_en)||p.indicative_modules_en.length!==3)throw Error('Invalid Academy program entry');
      ids.add(p.id);
      const mids=new Set();
      for(const m of p.indicative_modules_en){
        if(!SLUG.test(m.id)||mids.has(m.id)||typeof m.title!=='string'||!m.title.trim())throw Error('Invalid Academy module entry');
        mids.add(m.id);
      }
    }
    return data;
  }
  async function load(url){
    const response=await fetch(url||'academy/catalog/academy-curriculum-inventory.json',{cache:'no-store',credentials:'same-origin'});
    if(!response.ok)throw Error('Academy catalog unavailable');
    return validate(await response.json());
  }
  function program(data,id){return validate(data).pilot_programs.find(p=>p.id===id)||null;}
  function resolveLesson(data,programId,lessonId,language){
    const p=program(data,programId);
    if(!p||!Array.isArray(p.lessons))return null;
    const lesson=p.lessons.find(l=>l.id===lessonId&&l.status==='published');
    if(!lesson||!lesson.media||typeof lesson.media.url!=='string')return null;
    const url=new URL(lesson.media.url,global.location.href);
    if(url.protocol!=='https:'&&url.origin!==global.location.origin)return null;
    const tracks=lesson.media.subtitles||{};
    const lang=LANGS.includes(language)?language:'en';
    const subtitle=typeof tracks[lang]==='string'?tracks[lang]:null;
    return {id:lesson.id,videoUrl:url.href,subtitleUrl:subtitle,language:lang};
  }
  global.EchoesAcademyCatalog=Object.freeze({load,validate,program,resolveLesson,languages:Object.freeze(LANGS)});
})(window);
