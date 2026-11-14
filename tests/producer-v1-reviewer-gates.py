"""Isolated reviewer acceptance: role checks, self-review, seller and product approvals."""
import os, uuid, psycopg
dsn=os.environ["DATABASE_URL"]
seller_owner, reviewer, outsider=[uuid.uuid4() for _ in range(3)]
seller, product=[uuid.uuid4() for _ in range(2)]
with psycopg.connect(dsn) as c:
 with c.cursor() as x:
  x.execute("INSERT INTO producer_v1_test.sellers(id,owner_id) VALUES(%s,%s)",(seller,seller_owner))
  x.execute("INSERT INTO producer_v1_test.reviewers(user_id) VALUES(%s),(%s)",(reviewer,seller_owner))
  x.execute("INSERT INTO producer_v1_test.products(id,seller_id,owner_id,title,status) VALUES(%s,%s,%s,'submitted product','submitted')",(product,seller,seller_owner))
def run(actor,role,sql,args,allowed):
 with psycopg.connect(dsn) as c:
  with c.transaction():
   with c.cursor() as x:
    x.execute("SET LOCAL ROLE "+role)
    x.execute("SELECT set_config('request.jwt.claim.sub',%s,true)",(str(actor),))
    try:
     with c.transaction(): x.execute(sql,args)
     ok=True
    except psycopg.Error: ok=False
    assert ok==allowed,(role,sql,allowed,ok)
seller_sql="SELECT producer_v1_test.decide_seller(%s,%s,%s)"
product_sql="SELECT producer_v1_test.decide_product(%s,%s,%s)"
run(outsider,"producer_v1_actor",seller_sql,(seller,"approved","unauthorized"),False)
run(seller_owner,"producer_v1_reviewer",seller_sql,(seller,"approved","self"),False)
run(reviewer,"producer_v1_reviewer",seller_sql,(seller,"approved","identity checked"),True)
run(reviewer,"producer_v1_reviewer",product_sql,(product,"approved","reviewed"),True)
run(reviewer,"producer_v1_reviewer",product_sql,(product,"approved","repeat"),False)
run(reviewer,"producer_v1_reviewer",seller_sql,(seller,"suspended","policy violation"),True)
with psycopg.connect(dsn) as c:
 with c.cursor() as x:
  x.execute("SELECT status FROM producer_v1_test.sellers WHERE id=%s",(seller,))
  assert x.fetchone()[0]=="suspended"
  x.execute("SELECT status FROM producer_v1_test.products WHERE id=%s",(product,))
  assert x.fetchone()[0]=="approved"
  x.execute("SELECT count(*) FROM producer_v1_test.seller_decisions WHERE seller_id=%s",(seller,))
  assert x.fetchone()[0]==2
  x.execute("SELECT count(*) FROM producer_v1_test.product_decisions WHERE product_id=%s",(product,))
  assert x.fetchone()[0]==1
print("PASS: reviewer role, self-review prohibition, audited seller/product decisions, repeat denial, suspension")
print("NOT TESTED: cloud Auth/JWT, reviewer UI, revision-bound approvals, actual storage upload, publication eligibility")
