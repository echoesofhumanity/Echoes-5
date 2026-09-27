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
    {x:12,y:7,size:58,tone:"turquoise",delay:-2,duration:17},
    {x:82,y:13,size:42,tone:"warm",delay:-8,duration:21},
    {x:28,y:20,size:76,tone:"cyan",delay:-5,duration:24},
    {x:91,y:29,size:62,tone:"sage",delay:-12,duration:19},
    {x:8,y:37,size:46,tone:"warm",delay:-4,duration:23},
    {x:63,y:44,size:72,tone:"turquoise",delay:-15,duration:26},
    {x:19,y:53,size:52,tone:"cyan",delay:-9,duration:20},
    {x:86,y:61,size:84,tone:"sage",delay:-6,duration:28},
    {x:42,y:69,size:40,tone:"warm",delay:-13,duration:18},
    {x:7,y:78,size:68,tone:"turquoise",delay:-10,duration:25},
    {x:72,y:86,size:54,tone:"cyan",delay:-3,duration:22},
    {x:94,y:94,size:78,tone:"sage",delay:-17,duration:27}
  ];

  const haloField=[
    {x:52,y:10,w:320,h:118,tone:"turquoise",delay:-6,duration:31},
    {x:18,y:31,w:230,h:92,tone:"cyan",delay:-17,duration:37},
    {x:79,y:52,w:360,h:136,tone:"sage",delay:-11,duration:43},
    {x:31,y:73,w:270,h:104,tone:"warm",delay:-23,duration:39},
    {x:72,y:91,w:300,h:112,tone:"turquoise",delay:-14,duration:35}
  ];

  const getDocumentHeight=(universe)=>{
    const previousHeight=universe.style.height;
    universe.style.height="0px";

    const height=Math.max(
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight,
      document.body.scrollHeight,
      document.body.offsetHeight,
      window.innerHeight
    );

    universe.style.height=previousHeight;
    return height;
  };

  const sizeUniverse=(universe)=>{
    const height=getDocumentHeight(universe);
    universe.style.height=height+"px";
    return height;
  };

  const mountLightField=(universe,documentHeight)=>{
    const layer=universe.querySelector('[data-universe-layer="lights"]');
    if(!layer||layer.childElementCount)return;

    lightField.forEach((light,index)=>{
      const node=document.createElement("span");
      node.className="universe-light universe-light--"+light.tone;
      node.dataset.light=index+1;
      node.style.setProperty("--light-x",light.x+"%");
      node.style.setProperty("--light-y",Math.round(documentHeight*(light.y/100))+"px");
      node.style.setProperty("--light-size",light.size+"px");
      node.style.setProperty("--light-delay",light.delay+"s");
      node.style.setProperty("--light-duration",light.duration+"s");
      layer.appendChild(node);
    });
  };

  const mountHaloField=(universe,documentHeight)=>{
    const layer=universe.querySelector('[data-universe-layer="halos"]');
    if(!layer||layer.childElementCount)return;

    haloField.forEach((halo,index)=>{
      const node=document.createElement("span");
      node.className="universe-halo universe-halo--"+halo.tone;
      node.dataset.halo=index+1;
      node.style.setProperty("--halo-x",halo.x+"%");
      node.style.setProperty("--halo-y",Math.round(documentHeight*(halo.y/100))+"px");
      node.style.setProperty("--halo-w",halo.w+"px");
      node.style.setProperty("--halo-h",halo.h+"px");
      node.style.setProperty("--halo-delay",halo.delay+"s");
      node.style.setProperty("--halo-duration",halo.duration+"s");
      layer.appendChild(node);
    });
  };

  const finalizeUniverse=(universe)=>{
    const documentHeight=sizeUniverse(universe);
    mountLightField(universe,documentHeight);
    mountHaloField(universe,documentHeight);
  };

  const finalizeAfterLayout=(universe)=>{
    const footerHost=document.querySelector('[data-component="footer"]');

    if(!footerHost){
      requestAnimationFrame(()=>finalizeUniverse(universe));
      return;
    }

    if(footerHost.childElementCount){
      requestAnimationFrame(()=>requestAnimationFrame(()=>finalizeUniverse(universe)));
      return;
    }

    const layoutObserver=new MutationObserver(()=>{
      if(!footerHost.childElementCount)return;
      layoutObserver.disconnect();
      requestAnimationFrame(()=>requestAnimationFrame(()=>finalizeUniverse(universe)));
    });

    layoutObserver.observe(footerHost,{childList:true});
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

    /* layout.js loads the footer last. Its arrival is the deterministic signal
       that the page sections already exist and document-space can be locked. */
    finalizeAfterLayout(universe);

    const resizeObserver=new ResizeObserver(()=>sizeUniverse(universe));
    resizeObserver.observe(document.body);
    resizeObserver.observe(document.documentElement);

    window.addEventListener("resize",()=>sizeUniverse(universe),{passive:true});
  };

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",mount,{once:true});
  }else{
    mount();
  }
})();
