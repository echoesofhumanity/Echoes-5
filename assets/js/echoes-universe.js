/* =========================================================
   ECHOES OF HUMANITY — SHARED UNIVERSE MOUNT
   One DOM contract for every public page.
   Universe geometry lives in document-space, never viewport-space.
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

  const getDocumentHeight=()=>Math.max(
    document.documentElement.scrollHeight,
    document.documentElement.offsetHeight,
    document.body.scrollHeight,
    document.body.offsetHeight,
    window.innerHeight
  );

  const sizeUniverse=(universe)=>{
    universe.style.height=getDocumentHeight()+"px";
  };

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
    sizeUniverse(universe);

    const resizeObserver=new ResizeObserver(()=>sizeUniverse(universe));
    resizeObserver.observe(document.body);
    resizeObserver.observe(document.documentElement);

    window.addEventListener("load",()=>sizeUniverse(universe),{once:true});
    window.addEventListener("resize",()=>sizeUniverse(universe),{passive:true});
  };

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",mount,{once:true});
  }else{
    mount();
  }
})();
