"""Manual-only V2 acceptance runner. Requires a disposable DB, NEVER staging/production.
This harness does not create schemas or grant permissions. It refuses unverified targets.
"""
import os, sys, uuid, json, threading, urllib.request, urllib.error
import psycopg

def require(name):
    v=os.environ.get(name,'').strip()
    if not v: raise RuntimeError(f'BLOCKED: missing {name}')
    return v

def main():
    if os.getenv('V2_DISPOSABLE_DB_CONFIRMED') != 'YES':
        raise RuntimeError('BLOCKED: set repository variable V2_DISPOSABLE_DB_CONFIRMED=YES only after verifying an independent disposable DB')
    dsn=require('TEST_DATABASE_URL')
    # Never connect to known Echoes staging/production projects.
    for forbidden in ('ymxpbkviadypsvahrqwt','nlawhidxubnmoxtcxbiq'):
        if forbidden in dsn.lower(): raise RuntimeError('BLOCKED: protected Echoes project')
    with psycopg.connect(dsn, connect_timeout=8) as c:
        with c.cursor() as cur:
            cur.execute("SELECT current_database(),to_regclass('echoes_v2_synthetic.wallets') IS NOT NULL")
            db, exists=cur.fetchone()
            if not exists: raise RuntimeError('BLOCKED: disposable DB has no installed V2 schema; do not install draft SQL automatically')
            if 'test' not in db.lower() and 'disposable' not in db.lower():
                raise RuntimeError('BLOCKED: database name must explicitly contain test or disposable')
    print('PREFLIGHT PASS: disposable database and V2 schema verified')
    test_concurrency(dsn)
    test_http()

def test_concurrency(dsn):
    buyer_a,buyer_b=uuid.uuid4(),uuid.uuid4()
    with psycopg.connect(dsn,autocommit=True) as c:
        with c.cursor() as q:
            q.execute("INSERT INTO echoes_v2_synthetic.sellers(label,active,test_only) VALUES ('ISOLATED QA',true,true) RETURNING seller_id")
            seller=q.fetchone()[0]
            q.execute("INSERT INTO echoes_v2_synthetic.products(seller_id,unit_price_ec,available_qty,active,test_only) VALUES (%s,10,1,true,true) RETURNING product_id",(seller,))
            product=q.fetchone()[0]
            for b in (buyer_a,buyer_b):
                q.execute("INSERT INTO echoes_v2_synthetic.wallets(fixture_buyer_id,opening_ec,balance_ec,test_only) VALUES (%s,100,100,true)",(b,))
    barrier=threading.Barrier(2)
    results=[]
    lock=threading.Lock()
    def worker(buyer):
        try:
            with psycopg.connect(dsn,connect_timeout=8) as c:
                with c.cursor() as q:
                    q.execute("SET LOCAL lock_timeout='5s'")
                    barrier.wait(timeout=7)
                    q.execute("SELECT echoes_v2_synthetic.checkout(%s,%s,%s::jsonb)",(buyer,uuid.uuid4(),json.dumps([{'product_id':str(product),'qty':1}])))
                    q.fetchone()
            outcome='ok'
        except psycopg.Error as e:
            # Reject expected business-rule failure only; timeout, deadlock, auth or SQL errors are test failures.
            msg=str(e).lower()
            if e.sqlstate == 'P0001' and ('stock' in msg or 'quantity' in msg or 'inventory' in msg):
                outcome='rejected:insufficient stock'
            else:
                outcome='error:'+str(e).splitlines()[0][:150]
        except Exception as e:
            outcome='error:'+str(e).splitlines()[0][:150]
        with lock: results.append(outcome)
    t1=threading.Thread(target=worker,args=(buyer_a,))
    t2=threading.Thread(target=worker,args=(buyer_b,))
    t1.start();t2.start();t1.join(15);t2.join(15)
    if t1.is_alive() or t2.is_alive(): raise RuntimeError('FAIL: concurrency timeout')
    if len(results)!=2 or sum(x=='ok' for x in results)!=1 or sum(x.startswith('rejected:') for x in results)!=1:
        raise RuntimeError('FAIL: concurrent outcomes '+str(results))
    with psycopg.connect(dsn) as c:
        with c.cursor() as q:
            q.execute("SELECT available_qty FROM echoes_v2_synthetic.products WHERE product_id=%s",(product,))
            stock=q.fetchone()[0]
            q.execute("SELECT sum(balance_ec),count(*) FROM echoes_v2_synthetic.wallets WHERE fixture_buyer_id IN (%s,%s)",(buyer_a,buyer_b))
            balance,count=q.fetchone()
            q.execute("SELECT count(*) FROM echoes_v2_synthetic.orders WHERE wallet_id IN (SELECT wallet_id FROM echoes_v2_synthetic.wallets WHERE fixture_buyer_id IN (%s,%s))",(buyer_a,buyer_b))
            orders=q.fetchone()[0]
            if (stock,balance,count,orders)!=(0,190,2,1):raise RuntimeError(f'FAIL: inconsistent stock/balance/order: {(stock,balance,count,orders)}')
    print('PASS: two independent connections, one stock unit, exactly one checkout, accounting invariant')
    print('NOTE: disposable fixture remains for audit; destroy disposable DB after test')

def test_http():
    base=require('TEST_SUPABASE_URL').rstrip('/')
    if any(x in base for x in ('ymxpbkviadypsvahrqwt','nlawhidxubnmoxtcxbiq')):
        raise RuntimeError('BLOCKED: protected Supabase API target')
    key=require('TEST_ANON_KEY')
    a=require('TEST_USER_A_JWT')
    b=require('TEST_USER_B_JWT')
    # Explicitly test denied direct access. Positive authenticated checkout requires
    # an approved exposed staging-only API endpoint; never grant access automatically.
    endpoint=base+'/rest/v1/rpc/checkout_api_private'
    for label,token in [('anonymous',None),('user_a',a),('user_b',b)]:
        headers={'apikey':key,'Content-Type':'application/json'}
        if token:headers['Authorization']='Bearer '+token
        request=urllib.request.Request(endpoint,data=json.dumps({'request':str(uuid.uuid4()),'cart':[]}).encode(),headers=headers,method='POST')
        try:
            with urllib.request.urlopen(request,timeout=8) as resp:
                raise RuntimeError(f'FAIL: private RPC unexpectedly callable for {label}: {resp.status}')
        except urllib.error.HTTPError as e:
            if e.code not in (401,403,404):raise RuntimeError(f'FAIL: unexpected HTTP {e.code} for {label}')
            print(f'PASS: private RPC denied for {label} (HTTP {e.code})')
    print('INCOMPLETE: JWT tokens were supplied but their validity and positive authenticated checkout/cancel were NOT established; requires separately approved API entry point')

if __name__=='__main__':
    try:main()
    except Exception as e:
        print(str(e),file=sys.stderr)
        sys.exit(1)
