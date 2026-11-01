/* Echoes Academy Learning Lab: non-blocking cinematic feedback.
 * Visual only; does not prevent default actions or change classroom state.
 */
(function(){
 'use strict';
 if(!window.matchMedia||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const timers=new WeakMap();
 const selector='button,a.button,.lesson-jump a';
 function activate(node){
   const target=node&&node.closest&&node.closest(selector);
   if(!target||!document.contains(target)||target.matches(':disabled'))return;
   const prior=timers.get(target);
   if(prior)clearTimeout(prior);
   target.classList.remove('lab-cinematic-press');
   void target.offsetWidth;
   target.classList.add('lab-cinematic-press');
   timers.set(target,setTimeout(function(){
     target.classList.remove('lab-cinematic-press');
     timers.delete(target);
   },1100));
 }
 document.addEventListener('pointerdown',function(event){
   if(event.isPrimary===false)return;
   activate(event.target);
 },{passive:true,capture:true});
 document.addEventListener('click',function(event){
   if(event.detail!==0)return; // keyboard activation, not a second touch animation
   activate(event.target);
 },true);
})();
