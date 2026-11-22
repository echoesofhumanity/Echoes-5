"""Static contract checks for the independent synthetic producer portal page."""
from html.parser import HTMLParser
from pathlib import Path
import re,subprocess,tempfile
html=Path("producer-product-portal-v1.html").read_text(encoding="utf-8")
class Parser(HTMLParser):
 def __init__(self): super().__init__();self.ids=set();self.buttons=set();self.scripts=[];self.inscript=False
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if "id" in a:self.ids.add(a["id"])
  if tag=="button" and "id" in a:self.buttons.add(a["id"])
  if tag=="script":self.inscript=True
 def handle_endtag(self,tag):
  if tag=="script":self.inscript=False
 def handle_data(self,data):
  if self.inscript:self.scripts.append(data)
p=Parser();p.feed(html)
required={"seller","product","review","submitSeller","submitProduct","approveSeller","rejectSeller","suspendSeller","approveProduct","rejectProduct","approveMerch","history","publishState","reason"}
assert required<=p.ids,required-p.ids
assert {"submitSeller","submitProduct","approveSeller","approveProduct","approveMerch"}<=p.buttons
assert 'SENTETİK ÖNİZLEME' in html
assert 'noindex,nofollow' in html
assert not re.search(r'<script[^>]+src=',html,re.I)
assert not re.search(r'fetch\s*\(|XMLHttpRequest|supabase\.co|localStorage|sessionStorage',html,re.I)
assert p.scripts
with tempfile.NamedTemporaryFile(mode="w",suffix=".js",encoding="utf-8") as tmp:
 tmp.write("\n".join(p.scripts));tmp.flush()
 subprocess.run(["node","--check",tmp.name],check=True)
print("PASS: independent root HTML module, synthetic-only boundary, expected controls, JavaScript syntax")
print("NOT TESTED: browser/mobile interaction, deployment, cloud Auth, server-side approval, storage")
