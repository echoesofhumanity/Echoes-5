/* Academy access cards — animate first, navigate after completion.
 * Only three access cards; no changes to classroom or other Academy links.
 */
(function(){'use strict';
 const selector='.academy-access-grid>a';
 const reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const duration=1500;
 const started=new WeakMap();
 function start(card){
   if(!card||reduce)return;
   if(started.has(card))return;
   card.classList.remove('lab-cinematic-press');
   void card.offsetWidth;
   card.classList.add('lab-cinematic-press');
   started.set(card,performance.now());
 }
 document.addEventListener('pointerdown',function(e){
   if(e.isPrimary===false)return;
   start(e.target.closest&&e.target.closest(selector));
 },{passive:true,capture:true});
 document.addEventListener('click',function(e){
   const card=e.target.closest&&e.target.closest(selector);
   if(!card||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||card.hasAttribute('download')||(card.target&&card.target!=='_self'))return;
   if(card.dataset.labNavigating==='true'){e.preventDefault();return;}
   const href=card.getAttribute('href');
   if(!href)return;
   e.preventDefault();
   card.dataset.labNavigating='true';
   start(card); // keyboard activation starts here; touch does not restart
   const elapsed=reduce?duration:performance.now()-(started.get(card)||performance.now());
   const wait=reduce?0:Math.max(0,duration-elapsed+80);
   setTimeout(function(){window.location.assign(card.href)},wait);
 },true);
})();
