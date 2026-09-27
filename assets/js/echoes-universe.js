/* =========================================================
   ECHOES OF HUMANITY — SHARED UNIVERSE MOUNT
   One DOM contract for every public page.
   Visual objects are added only after their legacy counterparts retire.
   ========================================================= */

(function(){
  "use strict";

  const UNIVERSE_ID="echoes-universe";

  const layers=[
    ["far","echoes-universe-far"],
    ["color","echoes-universe-color"],
    ["haze","echoes-universe-haze"],
    ["lights","echoes-universe-lights"],
    ["halos","echoes-universe-halos"],
    ["orbits-far","echoes-universe-orbits-far"],
    ["orbits-near","echoes-universe-orbits-near"],
    ["humans","echoes-universe-humans"]
  ];

  const mount=()=>{
    if(document.getElementById(UNIVERSE_ID))return;

    const universe=document.createElement("div");
    universe.id=UNIVERSE_ID;
    universe.className="echoes-universe";
    universe.setAttribute("aria-hidden","true");

    const fragment=document.createDocumentFragment();

    layers.forEach(([name,className])=>{
      const layer=document.createElement("div");
      layer.className="echoes-universe-layer "+className;
      layer.dataset.universeLayer=name;
      fragment.appendChild(layer);
    });

    universe.appendChild(fragment);
    document.body.prepend(universe);
  };

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",mount,{once:true});
  }else{
    mount();
  }
})();
