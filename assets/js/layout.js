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
      atmosphere.innerHTML='<div class="echoes-depth-far" style="position:absolute;inset:-18%;pointer-events:none;opacity:.72;filter:blur(34px);background:radial-gradient(ellipse 58% 42% at 12% 22%,rgba(31,70,91,.13) 0%,rgba(18,43,61,.055) 42%,transparent 76%),radial-gradient(ellipse 52% 38% at 88% 68%,rgba(92,79,61,.075) 0%,rgba(53,57,52,.032) 44%,transparent 78%),radial-gradient(ellipse 46% 34% at 54% 92%,rgba(40,83,86,.06) 0%,transparent 74%)"></div><div class="echoes-depth-middle" style="position:absolute;inset:-14%;pointer-events:none;opacity:.54;filter:blur(22px);background:radial-gradient(ellipse 48% 34% at 78% 18%,rgba(39,91,101,.105) 0%,rgba(25,59,70,.04) 46%,transparent 76%),radial-gradient(ellipse 44% 32% at 18% 58%,rgba(50,89,91,.085) 0%,rgba(27,55,62,.035) 48%,transparent 78%),radial-gradient(ellipse 40% 28% at 72% 88%,rgba(105,87,62,.05) 0%,transparent 74%);animation:echoesMiddleDepthDrift 44s ease-in-out infinite alternate;transform-origin:50% 50%"></div><div class="echoes-depth-near" style="position:absolute;inset:-22%;pointer-events:none;opacity:.22;filter:blur(54px);background:radial-gradient(ellipse 34% 22% at 92% 30%,rgba(78,130,132,.11) 0%,rgba(42,79,85,.038) 48%,transparent 78%),radial-gradient(ellipse 30% 20% at 5% 74%,rgba(109,94,72,.065) 0%,rgba(60,69,65,.025) 48%,transparent 80%);animation:echoesNearDepthDrift 30s ease-in-out infinite alternate;transform-origin:50% 50%"></div><style>@keyframes echoesMiddleDepthDrift{0%{transform:translate3d(-1.5%,-1%,0) scale(1)}50%{transform:translate3d(1.8%,1.2%,0) scale(1.025)}100%{transform:translate3d(-.5%,2%,0) scale(1.012)}}@keyframes echoesNearDepthDrift{0%{transform:translate3d(2.5%,-1.5%,0) scale(1.02)}50%{transform:translate3d(-2%,1%,0) scale(1.045)}100%{transform:translate3d(1%,2.5%,0) scale(1.025)}}@media (prefers-reduced-motion:reduce){.echoes-depth-middle,.echoes-depth-near{animation:none!important}}</style><div class="echoes-depth"></div><div class="echoes-cloud echoes-cloud-01"></div><div class="echoes-cloud echoes-cloud-02"></div>';

      const journey=document.createElement("div");
      journey.className="echoes-journey";
      journey.setAttribute("aria-hidden","true");
      journey.innerHTML='<style>.echoes-human-light-field{position:absolute;inset:0;pointer-events:none;overflow:hidden;background:radial-gradient(ellipse 46vw 34vh at 18% 28%,rgba(70,135,139,.042) 0%,rgba(48,98,106,.018) 42%,transparent 74%),radial-gradient(ellipse 42vw 30vh at 84% 58%,rgba(113,132,111,.032) 0%,rgba(70,91,83,.014) 44%,transparent 76%),radial-gradient(ellipse 34vw 26vh at 32% 82%,rgba(185,160,111,.026) 0%,rgba(118,94,62,.010) 40%,transparent 72%);filter:blur(24px);opacity:.78;animation:echoesColorPocketDrift 46s ease-in-out infinite alternate;transform-origin:50% 50%}@keyframes echoesColorPocketDrift{0%{transform:translate3d(-1.5%,-1%,0) scale(1)}50%{transform:translate3d(1.5%,1.2%,0) scale(1.025)}100%{transform:translate3d(-.5%,2%,0) scale(1.01)}}.echoes-human-light{position:absolute;pointer-events:none;border-radius:50%;mix-blend-mode:screen;will-change:transform,opacity,filter;background:radial-gradient(circle at 48% 46%,rgba(255,239,205,.82) 0%,rgba(232,199,139,.42) 20%,rgba(177,145,94,.14) 46%,transparent 76%);box-shadow:0 0 16px rgba(231,199,140,.18),0 0 38px rgba(190,154,96,.09);filter:blur(.4px);animation:echoesHumanPresence 26s ease-in-out infinite alternate}.echoes-human-light-01{width:15px;height:15px;left:14%;top:14%;animation-duration:23s;animation-delay:-3s}.echoes-human-light-02{width:11px;height:11px;right:18%;top:25%;animation-duration:31s;animation-delay:-11s}.echoes-human-light-03{width:17px;height:17px;left:29%;top:38%;animation-duration:28s;animation-delay:-7s}.echoes-human-light-04{width:10px;height:10px;right:31%;top:47%;animation-duration:35s;animation-delay:-16s}.echoes-human-light-05{width:14px;height:14px;left:11%;top:59%;animation-duration:33s;animation-delay:-9s}.echoes-human-light-06{width:16px;height:16px;right:12%;top:67%;animation-duration:25s;animation-delay:-14s}.echoes-human-light-07{width:11px;height:11px;left:38%;top:76%;animation-duration:37s;animation-delay:-5s}.echoes-human-light-08{width:15px;height:15px;right:36%;top:86%;animation-duration:29s;animation-delay:-18s}.echoes-human-light-09{width:10px;height:10px;left:19%;top:93%;animation-duration:39s;animation-delay:-13s}@keyframes echoesHumanPresence{0%{transform:translate3d(-3px,-2px,0) scale(.88);opacity:.28;filter:blur(.8px)}38%{opacity:.48}67%{transform:translate3d(4px,3px,0) scale(1.08);opacity:.68;filter:blur(.3px)}100%{transform:translate3d(1px,6px,0) scale(.95);opacity:.34;filter:blur(.65px)}}@media(max-width:699px){.echoes-human-light-field{background:radial-gradient(ellipse 86vw 28vh at 8% 24%,rgba(70,135,139,.045) 0%,rgba(48,98,106,.018) 42%,transparent 74%),radial-gradient(ellipse 82vw 27vh at 94% 57%,rgba(113,132,111,.034) 0%,rgba(70,91,83,.014) 44%,transparent 76%),radial-gradient(ellipse 74vw 24vh at 24% 84%,rgba(185,160,111,.028) 0%,rgba(118,94,62,.011) 40%,transparent 72%);filter:blur(22px);opacity:.82}.echoes-human-light{box-shadow:0 0 14px rgba(231,199,140,.16),0 0 32px rgba(190,154,96,.08)}.echoes-human-light-01{left:10%}.echoes-human-light-02{right:11%}.echoes-human-light-03{left:24%}.echoes-human-light-04{right:24%}.echoes-human-light-05{left:8%}.echoes-human-light-06{right:8%}.echoes-human-light-07{left:32%}.echoes-human-light-08{right:29%}.echoes-human-light-09{left:15%}}@media(prefers-reduced-motion:reduce){.echoes-human-light-field,.echoes-human-light{animation:none!important}.echoes-human-light{opacity:.42}}</style><div class="echoes-journey-field echoes-journey-field-01"><div class="echoes-field-path echoes-field-path-far echoes-field-path-01"></div><div class="echoes-field-path echoes-field-path-mid echoes-field-path-02"></div></div><div class="echoes-journey-field echoes-journey-field-02"><div class="echoes-field-path echoes-field-path-far echoes-field-path-03"></div><div class="echoes-field-path echoes-field-path-mid echoes-field-path-04"></div></div><div class="echoes-journey-field echoes-journey-field-03"><div class="echoes-field-path echoes-field-path-far echoes-field-path-05"></div><div class="echoes-field-path echoes-field-path-mid echoes-field-path-06"></div></div><div class="echoes-human-light-field"><div class="echoes-human-light echoes-human-light-01"></div><div class="echoes-human-light echoes-human-light-02"></div><div class="echoes-human-light echoes-human-light-03"></div><div class="echoes-human-light echoes-human-light-04"></div><div class="echoes-human-light echoes-human-light-05"></div><div class="echoes-human-light echoes-human-light-06"></div><div class="echoes-human-light echoes-human-light-07"></div><div class="echoes-human-light echoes-human-light-08"></div><div class="echoes-human-light echoes-human-light-09"></div></div>';
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
        let height=Math.max(target.offsetHeight,window.innerHeight);
        if(index===0){
          const firstSection=document.querySelector("[data-section=\"section-01\"]");
          if(firstSection){
            height=Math.max(height,(firstSection.offsetTop+firstSection.offsetHeight)-top);
            const oneHumanityOrbit=field.querySelector(".echoes-field-path-02");
            if(oneHumanityOrbit){
              if(page==="home"){
                const heroOrbit=oneHumanityOrbit.cloneNode(true);
                heroOrbit.classList.add("echoes-hero-orbit");
                heroOrbit.style.top="31vh";
                field.appendChild(heroOrbit);
              }
              oneHumanityOrbit.style.top=((firstSection.offsetTop-top)+(firstSection.offsetHeight*.18))+"px";
            }
          }
        }
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
