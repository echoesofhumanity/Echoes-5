"""Isolated acceptance of the inspected staging V2 checkout/cancel core, PostgreSQL only.
No Supabase Auth, RLS, or production API claim is made by this test.
"""
import os,uuid,json,threading
import psycopg

dsn=os.environ['TEST_DATABASE_URL']
with psycopg.connect(dsn) as c:
    with c.cursor() as q:
        q.execute("SELECT current_database()")
        assert q.fetchone()[0]=='echoes_v2_disposable_test'
        q.execute("INSERT INTO echoes_v2_synthetic.sellers(label) VALUES('V2 CORE QA') RETURNING seller_id")
        seller=q.fetchone()[0]
        q.execute("INSERT INTO echoes_v2_synthetic.products(seller_id,unit_price_ec,available_qty) VALUES(%s,10,1) RETURNING product_id",(seller,))
        product=q.fetchone()[0]
        buyers=[uuid.uuid4(),uuid.uuid4()]
        for buyer in buyers:
            q.execute("INSERT INTO echoes_v2_synthetic.wallets(fixture_buyer_id,opening_ec,balance_ec) VALUES(%s,100,100)",(buyer,))
barrier=threading.Barrier(2)
results=[]
mutex=threading.Lock()
def checkout(buyer):
    try:
        with psycopg.connect(dsn) as c:
            with c.cursor() as q:
                q.execute("SET LOCAL lock_timeout='5s'")
                barrier.wait(timeout=8)
                q.execute("SELECT echoes_v2_synthetic.checkout(%s,%s,%s::jsonb)",(buyer,uuid.uuid4(),json.dumps([{'product_id':str(product),'qty':1}])))
                order=q.fetchone()[0]
        outcome=('success',buyer,order)
    except psycopg.Error as e:
        if e.sqlstate=='P0001' and 'insufficient stock' in str(e).lower():
            outcome=('sold_out',buyer,None)
        else:outcome=('error',buyer,str(e).splitlines()[0])
    except Exception as e:outcome=('error',buyer,repr(e))
    with mutex:results.append(outcome)
threads=[threading.Thread(target=checkout,args=(b,)) for b in buyers]
for t in threads:t.start()
for t in threads:t.join(15)
assert all(not t.is_alive() for t in threads),'threads timed out'
assert sorted(x[0] for x in results)==['sold_out','success'],results
winner=next(x for x in results if x[0]=='success')
with psycopg.connect(dsn) as c:
    with c.cursor() as q:
        q.execute("SELECT available_qty FROM echoes_v2_synthetic.products WHERE product_id=%s",(product,))
        assert q.fetchone()[0]==0
        q.execute("SELECT sum(balance_ec) FROM echoes_v2_synthetic.wallets WHERE fixture_buyer_id=ANY(%s)",(buyers,))
        assert q.fetchone()[0]==190
        q.execute("SELECT count(*),sum(delta_ec) FROM echoes_v2_synthetic.journal")
        assert q.fetchone()==(1,-10)
        q.execute("SELECT count(*) FROM echoes_v2_synthetic.reservations WHERE state='reserved'")
        assert q.fetchone()[0]==1
print('PASS: actual V2 checkout two buyers/two connections/one item; exactly one wins; journal and stock reconcile')
with psycopg.connect(dsn) as c:
    with c.cursor() as q:
        q.execute("SELECT echoes_v2_synthetic.cancel(%s,%s,%s)",(winner[1],winner[2],uuid.uuid4()))
        q.execute("SELECT echoes_v2_synthetic.cancel(%s,%s,%s)",(winner[1],winner[2],uuid.uuid4()))
        q.execute("SELECT available_qty FROM echoes_v2_synthetic.products WHERE product_id=%s",(product,))
        assert q.fetchone()[0]==1
        q.execute("SELECT balance_ec FROM echoes_v2_synthetic.wallets WHERE fixture_buyer_id=%s",(winner[1],))
        assert q.fetchone()[0]==100
        q.execute("SELECT operation,delta_ec FROM echoes_v2_synthetic.journal ORDER BY operation")
        assert q.fetchall()==[('debit',-10),('reversal',10)]
        q.execute("SELECT state FROM echoes_v2_synthetic.clearing WHERE order_id=%s",(winner[2],))
        assert q.fetchone()[0]=='voided'
print('PASS: actual V2 cancellation, repeat cancellation, refund, stock release, debit/reversal and clearing')
# Authorization boundary at the function's buyer ownership lookup:
# a second synthetic buyer must not cancel or refund the first buyer's order.
# This is PostgreSQL core coverage, NOT a signed-JWT/API assertion.
with psycopg.connect(dsn) as c:
    with c.cursor() as q:
        q.execute("INSERT INTO echoes_v2_synthetic.products(seller_id,unit_price_ec,available_qty) VALUES(%s,17,2) RETURNING product_id",(seller,))
        protected_product=q.fetchone()[0]
        protected_request=uuid.uuid4()
        q.execute("SELECT echoes_v2_synthetic.checkout(%s,%s,%s::jsonb)",
                  (winner[1],protected_request,json.dumps([{'product_id':str(protected_product),'qty':1}])))
        protected_order=q.fetchone()[0]
        other_buyer=next(b for b in buyers if b!=winner[1])
        try:
            with c.transaction():
                q.execute("SELECT echoes_v2_synthetic.cancel(%s,%s,%s)",
                          (other_buyer,protected_order,uuid.uuid4()))
            raise AssertionError("foreign buyer cancellation unexpectedly succeeded")
        except psycopg.Error as e:
            assert "order not found" in str(e).lower(),str(e)
        q.execute("SELECT status,total_ec FROM echoes_v2_synthetic.orders WHERE order_id=%s",(protected_order,))
        assert q.fetchone()==('created',17)
        q.execute("SELECT available_qty FROM echoes_v2_synthetic.products WHERE product_id=%s",(protected_product,))
        assert q.fetchone()[0]==1
        q.execute("SELECT balance_ec FROM echoes_v2_synthetic.wallets WHERE fixture_buyer_id=%s",(winner[1],))
        assert q.fetchone()[0]==83
        q.execute("SELECT operation,delta_ec FROM echoes_v2_synthetic.journal WHERE order_id=%s",(protected_order,))
        assert q.fetchall()==[('debit',-17)]
        q.execute("SELECT state FROM echoes_v2_synthetic.clearing WHERE order_id=%s",(protected_order,))
        assert q.fetchone()[0]=='pending'
        q.execute("SELECT echoes_v2_synthetic.cancel(%s,%s,%s)",(winner[1],protected_order,uuid.uuid4()))
        q.execute("SELECT balance_ec FROM echoes_v2_synthetic.wallets WHERE fixture_buyer_id=%s",(winner[1],))
        assert q.fetchone()[0]==100
        q.execute("SELECT available_qty FROM echoes_v2_synthetic.products WHERE product_id=%s",(protected_product,))
        assert q.fetchone()[0]==2
print('PASS: foreign buyer cannot cancel another buyer order; no unauthorized refund, stock release or journal reversal')
print('PASS: rightful buyer cancellation restores balance and stock')
print('NOT TESTED: foreign-buyer cancellation over signed JWT/PostgREST API')

print('NOT TESTED: real Supabase JWT, API gateway, RLS, full nine-function security boundary')
