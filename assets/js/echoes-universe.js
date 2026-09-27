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

  const lightField=[
    {x:12,y:7,size:14,tone:"turquoise",delay:-2,duration:17},
    {x:82,y:13,size:9,tone:"warm",delay:-8,duration:21},
    {x:28,y:20,size:20,tone:"cyan",delay:-5,duration:24},
    {x:91,y:29,size:15,tone:"sage",delay:-12,duration:19},
    {x:8,y:37,size:10,tone:"warm",delay:-4,duration:23},
    {x:63,y:44,size:18,tone:"turquoise",delay:-15,duration:26},
    {x:19,y:53,size:12,tone:"cyan",delay:-9,duration:20},
    {x:86,y:61,size:22,tone:"sage",delay:-6,duration:28},
    {x:42,y:69,size:9,tone:"warm",delay:-13,duration:18},
    {x:7,y:78,size:17,tone:"turquoise",delay:-10,duration:25},
    {x:72,y:86,size:13,tone:"cyan",delay:-3,duration:22},
    {x:94,y:94,size:19,tone:"sage",delay:-17,duration:27}
  ];

  const getDocumentHeight=()=>Math.max(
    document.documentElement.scrollHeight,
    document.documentElement.offsetHeight,
    document.body.scrollHeight,
    document.body.offsetHeight,
    window.innerHeight,
    window.visualViewport ? window.visualViewport.height + window.scrollY : 0
  );

  const sizeUniverse=(universe)=>{
    universe.style.height=getDocumentHeight()+"px";
  };

  const mountLightField=(universe)=>{
    const layer=universe.querySelector('[data-universe-layer="lights"]');
    if(!layer)return;

    lightField.forEach((light,index)=>{
      const node=document.createElement("span");
      node.className="universe-light universe-light--"+light.tone;
      node.dataset.light=index+1;
      node.style.setProperty("--light-x",light.x+"%");
      node.style.setProperty("--light-y",light.y+"%");
      node.style.setProperty("--light-size",light.size+"px");
      node.style.setProperty("--light-delay",light.delay+"s");
      node.style.setProperty("--light-duration",light.duration+"s");
      layer.appendChild(node);
    });
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
    mountLightField(universe);
    sizeUniverse(universe);

    const resizeObserver=new ResizeObserver(()=>sizeUniverse(universe));
    resizeObserver.observe(document.body);
    resizeObserver.observe(document.documentElement);

    window.addEventListener("load",()=>sizeUniverse(universe),{once:true});
    window.addEventListener("resize",()=>sizeUniverse(universe),{passive:true});

    if(window.visualViewport){
      window.visualViewport.addEventListener("resize",()=>sizeUniverse(universe),{passive:true});
    }
  };

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",mount,{once:true});
  }else{
    mount();
  }
})();
