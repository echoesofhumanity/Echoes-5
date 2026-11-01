/* Academy access cards: visual feedback before same-tab navigation.
 * Scoped to the three cards. Modified clicks retain browser behavior.
 */
(function(){'use strict';
 if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const timers=new WeakMap();
 function animate(card){if(!card)return;const old=timers.get(card);if(old)clearTimeout(old);
 card.classList.remove('lab-cinematic-press');void card.offsetWidth;card.classList.add('lab-cinematic-press');
 timers.set(card,setTimeout(()=>{card.classList.remove('lab-cinematic-press');timers.delete(card)},1100));
 }
 document.addEventListener('pointerdown',e=>{if(e.isPrimary!==false)animate(e.target.closest&&e.target.closest('.academy-access-grid>a'))},{passive:true,capture:true});
 document.addEventListener('click',function(e){
 const card=e.target.closest&&e.target.closest('.academy-access-grid>a');
 if(!card)return;
 if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||card.hasAttribute('download')||card.target&&card.target!=='_self')return;
 const href=card.getAttribute('href');if(!href||card.dataset.labNavigating==='true')return;
 e.preventDefault();card.dataset.labNavigating='true';animate(card);
 setTimeout(()=>{window.location.assign(card.href)},850);
 },true);
})();
