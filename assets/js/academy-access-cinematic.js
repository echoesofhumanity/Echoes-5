/* Visual-only feedback for the three Academy navigation cards.
 * Native navigation remains unchanged; no preventDefault or redirect delay.
 */
(function(){'use strict';
 if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const timers=new WeakMap();
 function animate(node){const card=node&&node.closest&&node.closest('.academy-access-grid>a');if(!card)return;
 const old=timers.get(card);if(old)clearTimeout(old);
 card.classList.remove('lab-cinematic-press');void card.offsetWidth;card.classList.add('lab-cinematic-press');
 timers.set(card,setTimeout(()=>{card.classList.remove('lab-cinematic-press');timers.delete(card)},1100));
 }
 document.addEventListener('pointerdown',e=>{if(e.isPrimary!==false)animate(e.target)},{passive:true,capture:true});
 document.addEventListener('click',e=>{if(e.detail===0)animate(e.target)},true);
})();
