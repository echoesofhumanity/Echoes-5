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
      await loadScript("assets/js/i18n.js");
      await load("[data-component=\"header\"]","components/header/header.html");
      await load("[data-section=\"hero\"]","sections/"+page+"/hero.html");
      if(page==="marketplace"){await load("[data-section=\"search\"]","sections/marketplace/search.html");await load("[data-section=\"stores\"]","sections/marketplace/stores.html");await load("[data-section=\"storefronts\"]","sections/marketplace/storefronts.html");await load("[data-section=\"featured\"]","sections/marketplace/featured.html");await load("[data-section=\"products\"]","sections/marketplace/products.html");await load("[data-section=\"library\"]","sections/marketplace/library.html");await load("[data-section=\"collections\"]","sections/marketplace/collections.html");await load("[data-section=\"economy\"]","sections/marketplace/economy.html");}
      if(page==="merchandise"){await load("[data-section=\"products\"]","sections/merchandise/products.html");}
      if(page!=="marketplace"){
        await load("[data-section=\"section-01\"]","sections/"+page+"/section-01.html");
        await load("[data-section=\"section-02\"]","sections/"+page+"/section-02.html");
        await load("[data-section=\"section-03\"]","sections/"+page+"/section-03.html");
      }
      await load("[data-section=\"cta\"]","sections/"+page+"/cta.html");
      await load("[data-component=\"footer\"]","components/footer/footer.html");
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
