"""Disposable PostgreSQL seller approval and product-upload boundary acceptance."""
import os
import uuid
import psycopg

dsn=os.environ["DATABASE_URL"]
a,b=[uuid.uuid4() for _ in range(2)]
seller_a,seller_b=[uuid.uuid4() for _ in range(2)]
product=uuid.uuid4()
def as_actor(cur,identity):
    cur.execute("SET LOCAL ROLE producer_v1_actor")
    cur.execute("SELECT set_config('request.jwt.claim.sub',%s,true)",(str(identity),))
def attempt(identity,statement,params,allowed):
    with psycopg.connect(dsn) as conn:
        with conn.transaction():
            with conn.cursor() as cur:
                as_actor(cur,identity)
                try:
                    with conn.transaction():
                        cur.execute(statement,params)
                    result=True
                except psycopg.Error:
                    result=False
                assert result==allowed,(identity,statement,allowed,result)
with psycopg.connect(dsn) as conn:
    with conn.cursor() as c:
        c.execute("INSERT INTO producer_v1_test.sellers(id,owner_id,status) VALUES(%s,%s,'pending'),(%s,%s,'approved')",(seller_a,a,seller_b,b))
attempt(a,"INSERT INTO producer_v1_test.products(id,seller_id,owner_id,title) VALUES(%s,%s,%s,'blocked')",(uuid.uuid4(),seller_a,a),False)
attempt(a,"INSERT INTO producer_v1_test.products(id,seller_id,owner_id,title) VALUES(%s,%s,%s,'forged')",(uuid.uuid4(),seller_b,a),False)
attempt(b,"INSERT INTO producer_v1_test.products(id,seller_id,owner_id,title,status) VALUES(%s,%s,%s,'self approved','approved')",(uuid.uuid4(),seller_b,b),False)
attempt(b,"INSERT INTO producer_v1_test.products(id,seller_id,owner_id,title) VALUES(%s,%s,%s,'allowed')",(product,seller_b,b),True)
attempt(a,"INSERT INTO producer_v1_test.product_assets(id,product_id,owner_id,object_key) VALUES(%s,%s,%s,'foreign')",(uuid.uuid4(),product,a),False)
attempt(b,"INSERT INTO producer_v1_test.product_assets(id,product_id,owner_id,object_key) VALUES(%s,%s,%s,'own')",(uuid.uuid4(),product,b),True)
with psycopg.connect(dsn) as conn:
    with conn.cursor() as c:
        c.execute("UPDATE producer_v1_test.sellers SET status='suspended' WHERE id=%s",(seller_b,))
attempt(b,"INSERT INTO producer_v1_test.products(id,seller_id,owner_id,title) VALUES(%s,%s,%s,'blocked after suspension')",(uuid.uuid4(),seller_b,b),False)
attempt(b,"INSERT INTO producer_v1_test.product_assets(id,product_id,owner_id,object_key) VALUES(%s,%s,%s,'blocked after suspension')",(uuid.uuid4(),product,b),False)
print("PASS: pending seller denied, forged seller denied, self-approval denied, approved seller allowed, foreign asset denied, suspension blocks product and asset uploads")
print("NOT TESTED: signed JWT gateway, object-storage upload API, reviewer approval workflow, publication and staging policy parity")
