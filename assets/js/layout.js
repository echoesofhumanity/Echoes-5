(function(){
  const page=document.body.dataset.page;
  if(!page)return;

  const loadScript=(url)=>new Promise((resolve,reject)=>{
    if(window.EchoesI18n){resolve();return;}
    const script=document.createElement("script");
    script.src=url;
    script.onload=resolve;
    script.onerror=()=>reject(new Error("Failed to load "+url));
    document.head.appendChild(script);
  });

  const load=async(selector,url)=>{
    const host=document.querySelector(selector);
    if(!host)return;
    const response=await fetch(url,{cache:"no-store"});
    if(!response.ok)throw new Error("Failed to load "+url);
    host.innerHTML=await response.text();
  };

  const start=async()=>{
    try{
      const atmosphere=document.createElement("div");
      atmosphere.className="echoes-atmosphere";
      atmosphere.setAttribute("aria-hidden","true");
      atmosphere.innerHTML='<div class="echoes-depth"></div><div class="echoes-cloud echoes-cloud-01"></div><div class="echoes-cloud echoes-cloud-02"></div>';

      const journey=document.createElement("div");
      journey.className="echoes-journey";
      journey.setAttribute("aria-hidden","true");
      journey.innerHTML='<div class="echoes-journey-field echoes-journey-field-01"><div class="echoes-field-path echoes-field-path-far echoes-field-path-01"></div><div class="echoes-field-path echoes-field-path-mid echoes-field-path-02"></div><div class="echoes-path echoes-path-01"></div></div><div class="echoes-journey-field echoes-journey-field-02"><div class="echoes-field-path echoes-field-path-far echoes-field-path-03"></div><div class="echoes-field-path echoes-field-path-mid echoes-field-path-04"></div><div class="echoes-path echoes-path-02"></div></div><div class="echoes-journey-field echoes-journey-field-03"><div class="echoes-field-path echoes-field-path-far echoes-field-path-05"></div><div class="echoes-field-path echoes-field-path-mid echoes-field-path-06"></div><div class="echoes-path echoes-path-03"></div></div><div class="echoes-human-light-field"></div>';
      document.body.prepend(journey);
      document.body.prepend(atmosphere);

      await loadScript("assets/js/i18n.js");
      await load("[data-component=\"header\"]","components/header/header.html");
      await load("[data-section=\"hero\"]","sections/"+page+"/hero.html");
      if(page==="marketplace"){await load("[data-section=\"search\"]","sections/marketplace/search.html");await load("[data-section=\"stores\"]","sections/marketplace/stores.html");await load("[data-section=\"storefronts\"]","sections/marketplace/storefronts.html");await load("[data-section=\"featured\"]","sections/marketplace/featured.html");await load("[data-section=\"products\"]","sections/marketplace/products.html");await load("[data-section=\"library\"]","sections/marketplace/library.html");await load("[data-section=\"collections\"]","sections/marketplace/collections.html");await load("[data-section=\"economy\"]","sections/marketplace/economy.html");}
      if(page==="merchandise"){await load("[data-section=\"products\"]","sections/merchandise/products.html");}
      if(page!=="marketplace"){
        await load("[data-section=\"section-01\"]","sections/"+page+"/section-01.html");
        await load("[data-section=\"section-02\"]","sections/"+page+"/section-02.html");
        await load("[data-section=\"section-03\"]","sections/"+page+"/section-03.html");
        if(page==="partners"){await load("[data-section=\"partnership-action\"]","sections/partners/partnership-action.html");}
      }
      await load("[data-section=\"cta\"]","sections/"+page+"/cta.html");
      await load("[data-component=\"footer\"]","components/footer/footer.html");

      const journeyTargets=[
        document.querySelector("[data-section=\"hero\"]"),
        document.querySelector("[data-section=\"section-02\"]")||document.querySelector("[data-section=\"featured\"]")||document.querySelector("[data-section=\"products\"]"),
        document.querySelector("[data-section=\"cta\"]")
      ];
      journey.querySelectorAll(".echoes-journey-field").forEach((field,index)=>{
        const target=journeyTargets[index];
        if(!target)return;
        const top=target.offsetTop;
        const height=Math.max(target.offsetHeight,window.innerHeight);
        field.style.top=top+"px";
        field.style.height=height+"px";
      });
      journey.style.height=Math.max(document.documentElement.scrollHeight,document.body.scrollHeight)+"px";

      document.dispatchEvent(new CustomEvent("echoes:layout-ready"));
    }catch(error){
      console.error("Echoes layout error:",error);
    }
  };

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",start,{once:true});
  }else{
    start();
  }
})();
