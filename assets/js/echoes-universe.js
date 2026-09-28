/* =========================================================
   ECHOES OF HUMANITY — SHARED UNIVERSE MOUNT
   One DOM contract for every public page.
   Universe geometry lives in document-space, never viewport-space.
   ========================================================= */
(function(){
  "use strict";
  const UNIVERSE_ID="echoes-universe";
  const layers=[["far","echoes-universe-far"],["color","echoes-universe-color"],["haze","echoes-universe-haze"],["lights","echoes-universe-lights"],["halos","echoes-universe-halos"],["orbits-far","echoes-universe-orbits-far"],["orbits-near","echoes-universe-orbits-near"],["humans","echoes-universe-humans"]];
  const lightField=[
    {x:12,y:7,size:58,tone:"turquoise",delay:-2,duration:17},{x:82,y:13,size:42,tone:"warm",delay:-8,duration:21},{x:28,y:20,size:76,tone:"cyan",delay:-5,duration:24},{x:91,y:29,size:62,tone:"sage",delay:-12,duration:19},{x:8,y:37,size:46,tone:"warm",delay:-4,duration:23},{x:63,y:44,size:72,tone:"turquoise",delay:-15,duration:26},{x:19,y:53,size:52,tone:"cyan",delay:-9,duration:20},{x:86,y:61,size:84,tone:"sage",delay:-6,duration:28},{x:42,y:69,size:40,tone:"warm",delay:-13,duration:18},{x:7,y:78,size:68,tone:"turquoise",delay:-10,duration:25},{x:72,y:86,size:54,tone:"cyan",delay:-3,duration:22},{x:94,y:94,size:78,tone:"sage",delay:-17,duration:27}
  ];
  const haloField=[
    {x:78,y:12,w:270,h:150,tone:"turquoise",delay:-6,duration:31,rotate:-18},{x:9,y:32,w:210,h:124,tone:"cyan",delay:-17,duration:37,rotate:14},{x:88,y:53,w:300,h:168,tone:"sage",delay:-11,duration:43,rotate:-26},{x:14,y:73,w:235,h:142,tone:"warm",delay:-23,duration:39,rotate:22},{x:73,y:90,w:285,h:158,tone:"turquoise",delay:-14,duration:35,rotate:-12}
  ];
  const orbitField=[
    {layer:"far",x:16,y:4,w:520,h:150,tone:"cyan",rotate:-14,alpha:.10,opacity:.62,delay:-8,duration:34},
    {layer:"near",x:78,y:9,w:430,h:126,tone:"turquoise",rotate:18,alpha:.14,opacity:.72,delay:-19,duration:29},
    {layer:"far",x:82,y:18,w:560,h:164,tone:"sage",rotate:-22,alpha:.09,opacity:.56,delay:-4,duration:38},
    {layer:"near",x:18,y:27,w:470,h:138,tone:"cyan",rotate:12,alpha:.13,opacity:.68,delay:-15,duration:31},
    {layer:"far",x:70,y:36,w:610,h:174,tone:"warm",rotate:20,alpha:.075,opacity:.50,delay:-24,duration:42},
    {layer:"near",x:88,y:45,w:450,h:132,tone:"turquoise",rotate:-16,alpha:.14,opacity:.70,delay:-11,duration:30},
    {layer:"far",x:20,y:54,w:590,h:168,tone:"sage",rotate:-20,alpha:.085,opacity:.54,delay:-29,duration:40},
    {layer:"near",x:30,y:63,w:440,h:128,tone:"cyan",rotate:15,alpha:.13,opacity:.66,delay:-7,duration:33},
    {layer:"far",x:84,y:72,w:620,h:178,tone:"turquoise",rotate:23,alpha:.085,opacity:.52,delay:-18,duration:44},
    {layer:"near",x:12,y:81,w:460,h:136,tone:"warm",rotate:-17,alpha:.11,opacity:.62,delay:-26,duration:35},
    {layer:"far",x:66,y:89,w:550,h:156,tone:"cyan",rotate:-12,alpha:.09,opacity:.55,delay:-13,duration:39},
    {layer:"near",x:90,y:96,w:420,h:122,tone:"sage",rotate:19,alpha:.12,opacity:.64,delay:-21,duration:32}
  ];
  const getDocumentHeight=(universe)=>{const previousHeight=universe.style.height;universe.style.height="0px";const height=Math.max(document.documentElement.scrollHeight,document.documentElement.offsetHeight,document.body.scrollHeight,document.body.offsetHeight,window.innerHeight);universe.style.height=previousHeight;return height};
  const sizeUniverse=(universe)=>{const height=getDocumentHeight(universe);universe.style.height=height+"px";return height};
  const mountLightField=(universe,documentHeight)=>{const layer=universe.querySelector('[data-universe-layer="lights"]');if(!layer||layer.childElementCount)return;lightField.forEach((light,index)=>{const node=document.createElement("span");node.className="universe-light universe-light--"+light.tone;node.dataset.light=index+1;node.style.setProperty("--light-x",light.x+"%");node.style.setProperty("--light-y",Math.round(documentHeight*(light.y/100))+"px");node.style.setProperty("--light-size",light.size+"px");node.style.setProperty("--light-delay",light.delay+"s");node.style.setProperty("--light-duration",light.duration+"s");layer.appendChild(node)})};
  const mountHaloField=(universe,documentHeight)=>{const layer=universe.querySelector('[data-universe-layer="halos"]');if(!layer||layer.childElementCount)return;haloField.forEach((halo,index)=>{const node=document.createElement("span");node.className="universe-halo universe-halo--"+halo.tone;node.dataset.halo=index+1;node.style.setProperty("--halo-x",halo.x+"%");node.style.setProperty("--halo-y",Math.round(documentHeight*(halo.y/100))+"px");node.style.setProperty("--halo-w",halo.w+"px");node.style.setProperty("--halo-h",halo.h+"px");node.style.setProperty("--halo-rotate",halo.rotate+"deg");node.style.setProperty("--halo-delay",halo.delay+"s");node.style.setProperty("--halo-duration",halo.duration+"s");layer.appendChild(node)})};
  const mountOrbitField=(universe,documentHeight)=>{orbitField.forEach((orbit,index)=>{const layer=universe.querySelector('[data-universe-layer="orbits-'+orbit.layer+'"]');if(!layer)return;const node=document.createElement("span");node.className="universe-orbit universe-orbit--"+orbit.tone;node.dataset.orbit=index+1;node.style.setProperty("--orbit-x",orbit.x+"%");node.style.setProperty("--orbit-y",Math.round(documentHeight*(orbit.y/100))+"px");node.style.setProperty("--orbit-w",orbit.w+"px");node.style.setProperty("--orbit-h",orbit.h+"px");node.style.setProperty("--orbit-rotate",orbit.rotate+"deg");node.style.setProperty("--orbit-alpha",orbit.alpha);node.style.setProperty("--orbit-opacity",orbit.opacity);node.style.setProperty("--orbit-delay",orbit.delay+"s");node.style.setProperty("--orbit-duration",orbit.duration+"s");layer.appendChild(node)})};
  const finalizeUniverse=(universe)=>{const documentHeight=sizeUniverse(universe);mountLightField(universe,documentHeight);mountHaloField(universe,documentHeight);mountOrbitField(universe,documentHeight)};
  const finalizeAfterLayout=(universe)=>{const footerHost=document.querySelector('[data-component="footer"]');if(!footerHost){requestAnimationFrame(()=>finalizeUniverse(universe));return}if(footerHost.childElementCount){requestAnimationFrame(()=>requestAnimationFrame(()=>finalizeUniverse(universe)));return}const layoutObserver=new MutationObserver(()=>{if(!footerHost.childElementCount)return;layoutObserver.disconnect();requestAnimationFrame(()=>requestAnimationFrame(()=>finalizeUniverse(universe)))});layoutObserver.observe(footerHost,{childList:true})};
  const mount=()=>{if(document.getElementById(UNIVERSE_ID))return;const universe=document.createElement("div");universe.id=UNIVERSE_ID;universe.className="echoes-universe";universe.setAttribute("aria-hidden","true");const fragment=document.createDocumentFragment();layers.forEach(([name,className])=>{const layer=document.createElement("div");layer.className="echoes-universe-layer "+className;layer.dataset.universeLayer=name;fragment.appendChild(layer)});universe.appendChild(fragment);document.body.prepend(universe);finalizeAfterLayout(universe);const resizeObserver=new ResizeObserver(()=>sizeUniverse(universe));resizeObserver.observe(document.body);resizeObserver.observe(document.documentElement);window.addEventListener("resize",()=>sizeUniverse(universe),{passive:true})};
  if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",mount,{once:true})}else{mount()}
})();
