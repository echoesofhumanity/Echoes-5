"""Disposable revision and seller suspension publication boundary."""
import os,uuid,psycopg
dsn=os.environ["DATABASE_URL"]
owner,reviewer=uuid.uuid4(),uuid.uuid4()
seller,product=uuid.uuid4(),uuid.uuid4()
with psycopg.connect(dsn) as c:
 with c.cursor() as x:
  x.execute("INSERT INTO producer_v1_test.sellers(id,owner_id,status) VALUES(%s,%s,'approved')",(seller,owner))
  x.execute("INSERT INTO producer_v1_test.reviewers(user_id) VALUES(%s)",(reviewer,))
  x.execute("INSERT INTO producer_v1_test.products(id,seller_id,owner_id,title,status) VALUES(%s,%s,%s,'reviewed','submitted')",(product,seller,owner))
def review(sql,params):
 with psycopg.connect(dsn) as c:
  with c.cursor() as x:
   x.execute("SET LOCAL ROLE producer_v1_reviewer")
   x.execute("SELECT set_config('request.jwt.claim.sub',%s,true)",(str(reviewer),))
   x.execute(sql,params)
def eligible(target):
 with psycopg.connect(dsn) as c:
  with c.cursor() as x:
   x.execute("SELECT producer_v1_test.publish_eligible(%s,%s)",(product,target))
   return x.fetchone()[0]
review("SELECT producer_v1_test.decide_product(%s,'approved','verified')",(product,))
assert not eligible("marketplace")
review("SELECT producer_v1_test.approve_publication(%s,'marketplace',false)",(product,))
assert eligible("marketplace")
assert not eligible("merchandise")
with psycopg.connect(dsn) as c:
 with c.cursor() as x: x.execute("UPDATE producer_v1_test.products SET revision=2 WHERE id=%s",(product,))
assert not eligible("marketplace"),"new revision must not inherit old approval"
with psycopg.connect(dsn) as c:
 with c.cursor() as x: x.execute("UPDATE producer_v1_test.products SET revision=1 WHERE id=%s",(product,))
assert eligible("marketplace")
with psycopg.connect(dsn) as c:
 with c.cursor() as x: x.execute("UPDATE producer_v1_test.sellers SET status='suspended' WHERE id=%s",(seller,))
assert not eligible("marketplace"),"suspension must block previously approved publication"
print("PASS: no publication without decision, exact revision, distinct Merchandise target, suspended seller blocks publication")
print("NOT TESTED: production catalogue projection, real object storage, curator role isolation, revision immutability and JWT gateway")
