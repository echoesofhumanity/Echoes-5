/* Echoes Academy Learning Lab: visual-only tap feedback.
 * Does not cancel, delay or modify any existing button action.
 */
(function(){
 'use strict';
 if(!window.matchMedia||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const timers=new WeakMap();
 document.addEventListener('click',function(event){
   const target=event.target.closest&&event.target.closest('button:not(:disabled),a.button,.lesson-jump a');
   if(!target||!document.contains(target))return;
   const previous=timers.get(target);
   if(previous)clearTimeout(previous);
   target.classList.remove('lab-cinematic-press');
   void target.offsetWidth;
   target.classList.add('lab-cinematic-press');
   timers.set(target,setTimeout(function(){target.classList.remove('lab-cinematic-press');timers.delete(target);},1000));
 },false);
})();
