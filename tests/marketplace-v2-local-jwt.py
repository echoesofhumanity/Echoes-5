"""Signed JWT acceptance against disposable local Supabase Auth behind API gateway.
No cloud project connection, no secrets logged, no production V2 access.
"""
import json, os, secrets, urllib.request, urllib.error, uuid

def load_env(path):
    out={}
    for line in open(path,encoding="utf-8"):
        line=line.strip()
        if not line or line.startswith("#") or "=" not in line: continue
        k,v=line.split("=",1)
        out[k]=v.strip().strip('"').strip("'")
    return out

env=load_env(os.environ.get("LOCAL_SUPABASE_ENV","/tmp/echoes-v2-local-supabase.env"))
url=env.get("API_URL","http://127.0.0.1:54321").rstrip("/")
assert url in ("http://127.0.0.1:54321","http://localhost:54321"),"BLOCKED: nonlocal API URL"
anon=env["ANON_KEY"]
service=env["SERVICE_ROLE_KEY"]

def call(path, method="GET", token=None, apikey=None, data=None):
    headers={"apikey":apikey or anon}
    if token: headers["Authorization"]="Bearer "+token
    if data is not None:headers["Content-Type"]="application/json"
    req=urllib.request.Request(url+path,method=method,headers=headers,
        data=json.dumps(data).encode() if data is not None else None)
    try:
        with urllib.request.urlopen(req,timeout=15) as r:
            body=r.read()
            return r.status,json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        return e.code,{}

users=[]
for i in range(2):
    email="v2-local-"+uuid.uuid4().hex+"@example.test"
    password=secrets.token_urlsafe(24)+"Aa1!"
    code,created=call("/auth/v1/admin/users","POST",service,service,
                      {"email":email,"password":password,"email_confirm":True})
    assert code in (200,201),(i,"admin creation",code)
    user_id=created["id"]
    code,login=call("/auth/v1/token?grant_type=password","POST",None,anon,
                    {"email":email,"password":password})
    assert code==200 and login.get("access_token"),(i,"password login",code)
    token=login["access_token"]
    assert token.count(".")==2,"expected signed JWT format"
    code,identity=call("/auth/v1/user",token=token)
    assert code==200 and identity.get("id")==user_id,(i,"JWT identity",code)
    users.append((user_id,token))
assert users[0][0]!=users[1][0]
for i,(user_id,token) in enumerate(users):
    code,identity=call("/auth/v1/user",token=token)
    assert code==200 and identity.get("id")==user_id,(i,"identity crossover",code)
print("PASS: two distinct local users, password login, signed JWT and gateway identity isolation")
for label,token in (("missing",None),("forged","not-a-valid-jwt"),
                    ("modified",users[0][1].split(".")[0]+"."+("A" if users[0][1].split(".")[1][0]!="A" else "B")+users[0][1].split(".")[1][1:]+"."+users[0][1].split(".")[2])):
    code,_=call("/auth/v1/user",token=token)
    assert code in (401,403),(label,"must be denied",code)
print("PASS: missing, forged and modified tokens denied by local Auth gateway")
print("NOT TESTED: V2 checkout/cancel through PostgREST, production JWT configuration, staging policy parity")

# Isolated local PostgREST test using two signed JWTs.
code,order=call("/rest/v1/rpc/v2_api_test_checkout","POST",users[0][1],anon,{"amount":17})
assert code==200 and isinstance(order,str),(code,order)
code,_=call("/rest/v1/rpc/v2_api_test_cancel","POST",users[1][1],anon,{"order_id":order})
assert code>=400,("cross-user cancellation",code)
code,_=call("/rest/v1/rpc/v2_api_test_cancel","POST",users[0][1],anon,{"order_id":order})
assert code in (200,204),("owner cancellation",code)
code,_=call("/rest/v1/rpc/v2_api_test_cancel","POST",users[0][1],anon,{"order_id":order})
assert code>=400,("duplicate cancellation",code)
code,second=call("/rest/v1/rpc/v2_api_test_checkout","POST",users[0][1],anon,{"amount":100})
assert code==200 and isinstance(second,str),("refund failed",code)
code,_=call("/rest/v1/rpc/v2_api_test_checkout","POST",users[0][1],anon,{"amount":1})
assert code>=400,("overspend",code)
print("PASS: local signed JWT PostgREST checkout, foreign cancellation denied, owner refund and overspend denied")
print("NOT TESTED: V2 stock, journal and staging parity through PostgREST")

# Exercise the installed V2 core via the signed-JWT PostgREST boundary.
import subprocess
def fixture_sql(statement):
    cmd=["docker","exec",db_container,"psql","-XAt","-v","ON_ERROR_STOP=1","-U","postgres","-d","postgres","-c",statement]
    return subprocess.check_output(cmd,text=True).strip().splitlines()[0]
db_container=subprocess.check_output(["docker","ps","--filter","name=supabase_db_","--format","{{.ID}}"],text=True).strip().splitlines()[0]
seller=fixture_sql("INSERT INTO echoes_v2_synthetic.sellers(label) VALUES('Test seller') RETURNING seller_id")
product=fixture_sql("INSERT INTO echoes_v2_synthetic.products(seller_id,unit_price_ec,available_qty) VALUES('%s',17,2) RETURNING product_id"%seller)
for uid,_ in users:
    fixture_sql("INSERT INTO echoes_v2_synthetic.wallets(fixture_buyer_id,opening_ec,balance_ec) VALUES('%s',100,100) RETURNING wallet_id"%uid)
request=str(uuid.uuid4())
payload={"request":request,"cart":[{"product_id":product,"qty":1}]}
code,order=call("/rest/v1/rpc/v2_real_test_checkout","POST",users[0][1],anon,payload)
assert code==200 and isinstance(order,str),("core checkout",code)
code,replay=call("/rest/v1/rpc/v2_real_test_checkout","POST",users[0][1],anon,payload)
assert code==200 and replay==order,("replay",code)
code,_=call("/rest/v1/rpc/v2_real_test_cancel","POST",users[1][1],anon,{"order_id":order,"request":str(uuid.uuid4())})
assert code>=400,("foreign cancel",code)
assert fixture_sql("SELECT balance_ec FROM echoes_v2_synthetic.wallets WHERE fixture_buyer_id='%s'"%users[0][0])=="83"
assert fixture_sql("SELECT available_qty FROM echoes_v2_synthetic.products WHERE product_id='%s'"%product)=="1"
code,_=call("/rest/v1/rpc/v2_real_test_cancel","POST",users[0][1],anon,{"order_id":order,"request":str(uuid.uuid4())})
assert code in (200,204),("owner cancel",code)
assert fixture_sql("SELECT balance_ec FROM echoes_v2_synthetic.wallets WHERE fixture_buyer_id='%s'"%users[0][0])=="100"
assert fixture_sql("SELECT available_qty FROM echoes_v2_synthetic.products WHERE product_id='%s'"%product)=="2"
assert fixture_sql("SELECT count(*) FROM echoes_v2_synthetic.journal WHERE order_id='%s'"%order)=="2"
assert fixture_sql("SELECT state FROM echoes_v2_synthetic.clearing WHERE order_id='%s'"%order)=="voided"
assert fixture_sql("SELECT state FROM echoes_v2_synthetic.reservations WHERE order_id='%s'"%order)=="released"
print("PASS: signed JWT PostgREST installed V2 core checkout/replay/cross-buyer denial/refund/stock/journal/clearing/reservation")
