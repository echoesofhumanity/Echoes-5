#!/usr/bin/env python3
"""Local-only Echoes Governance caption prototype.

Prerequisites: Python 3.11, argostranslate==1.9.6, eight models installed
with: python governance-argos-local-bridge.py --install-models
Run: python governance-argos-local-caption-demo.py
Open on the SAME computer: http://127.0.0.1:8766
No JaaS integration, audio capture, external server, public exposure or paid API.
"""
import importlib.util
from http.server import ThreadingHTTPServer

spec = importlib.util.spec_from_file_location(
    "governance_argos_bridge", "governance-argos-local-bridge.py"
)
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)

HTML = r"""<!doctype html>
<html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Echoes Governance — Yerel Altyazı Prototipi</title>
<style>
:root{font-family:system-ui,sans-serif;color:#ecf8fa;background:#071b2b}
body{max-width:760px;margin:2rem auto;padding:0 1rem}
main{background:#102c3c;border:1px solid #397a85;border-radius:18px;padding:22px}
h1{font-size:1.45rem}p{line-height:1.5;color:#b5d9db}
label{display:block;margin:16px 0 7px;font-weight:600}
select,textarea,button{box-sizing:border-box;width:100%;border-radius:10px;border:1px solid #62b9b7;background:#164456;color:#fff;padding:13px;font:inherit}
textarea{min-height:110px}button{cursor:pointer;font-weight:700;margin-top:14px}
button:disabled{opacity:.5;cursor:wait}
article{margin-top:14px;padding:14px;border:1px solid #3e828b;border-radius:12px;background:#0b2333}
small{color:#a9d8d6}output{display:block;white-space:pre-wrap;overflow-wrap:anywhere;margin-top:8px;font-size:1.1rem}
#status{min-height:1.5em;color:#8fe5d5}
</style>
<main>
<h1>Echoes Governance · Gerçek çeviriyle altyazı</h1>
<p>Yerel geliştirme prototipi. Örnek metin gerçek Argos modellerine gönderilir. Bu sayfa toplantı sesini dinlemez; altyazılar diğer cihazlara iletilmez.</p>
<label for="source">Konuşmacının dili</label>
<select id="source"><option value="tr">Türkçe</option><option value="en">English</option><option value="ru">Русский</option><option value="es">Español</option><option value="de">Deutsch</option></select>
<label for="spoken">Konuşma metni (en fazla 1200 karakter)</label>
<textarea id="spoken" maxlength="1200">İnsan onurunu korumak ortak sorumluluğumuzdur.</textarea>
<button id="translate">Diğer dört dile gerçek çeviri yap</button>
<p id="status" role="status" aria-live="polite"></p>
<section id="captions" aria-label="Çevrilmiş altyazılar"></section>
<p><small>İsteğe bağlı cihaz seslendirmesi için her sonuç altında dinleme düğmesi gösterilir. Ses kalitesi cihazın TTS motoruna bağlıdır. Konuşmalar kaydedilmez.</small></p>
</main>
<script>
const langs={tr:"Türkçe",en:"English",ru:"Русский",es:"Español",de:"Deutsch"};
const locales={tr:"tr-TR",en:"en-US",ru:"ru-RU",es:"es-ES",de:"de-DE"};
const button=document.getElementById("translate"),status=document.getElementById("status"),area=document.getElementById("captions");
button.addEventListener("click",async()=>{
  const source=document.getElementById("source").value,text=document.getElementById("spoken").value.trim();
  if(!text){status.textContent="Lütfen metin girin.";return}
  button.disabled=true;area.replaceChildren();status.textContent="Argos çevirileri hazırlanıyor…";
  const targets=Object.keys(langs).filter(x=>x!==source);
  const start=performance.now();
  const results=await Promise.all(targets.map(async target=>{
    try{
      const response=await fetch("/translate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({source,target,text})});
      const data=await response.json();
      if(!response.ok)throw Error(data.error||"Çeviri başarısız");
      return {target,text:data.translatedText};
    }catch(e){return {target,error:e.message}}
  }));
  for(const result of results){
    const card=document.createElement("article"),head=document.createElement("strong"),out=document.createElement("output");
    head.textContent=langs[result.target];out.textContent=result.error?"Hata: "+result.error:result.text;
    card.append(head,out);
    if(!result.error&&"speechSynthesis" in window){
      const speak=document.createElement("button");speak.textContent="Bu altyazıyı seslendir";
      speak.addEventListener("click",()=>{
        speechSynthesis.cancel();
        const utterance=new SpeechSynthesisUtterance(result.text);
        utterance.lang=locales[result.target];utterance.rate=1;utterance.pitch=1;
        speechSynthesis.speak(utterance);
      });
      card.append(speak);
    }
    area.append(card);
  }
  status.textContent=results.every(x=>!x.error)?"Dört dilde gerçek çeviri tamamlandı.":"Bazı çeviriler başarısız oldu.";
  status.textContent+=" İşlem ve yerel HTTP yanıtları: "+Math.round(performance.now()-start)+" ms (STT/TTS dahil değil).";
  button.disabled=false;
});
</script>
</html>"""


class DemoHandler(bridge.Handler):
    def do_GET(self):
        if self.path in ("/", "/index.html"):
            payload = HTML.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Content-Security-Policy",
                             "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
        else:
            super().do_GET()


if __name__ == "__main__":
    bridge.ensure_models()
    server = ThreadingHTTPServer(("127.0.0.1", 8766), DemoHandler)
    print("LOCAL CAPTION DEMO: http://127.0.0.1:8766 (same machine only)", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
