"""Disposable revision and seller suspension publication boundary."""
import os,uuid,psycopg
dsn=os.environ["DATABASE_URL"]
owner,reviewer,curator=uuid.uuid4(),uuid.uuid4(),uuid.uuid4()
seller,product=uuid.uuid4(),uuid.uuid4()
with psycopg.connect(dsn) as c:
 with c.cursor() as x:
  x.execute("INSERT INTO producer_v1_test.sellers(id,owner_id,status) VALUES(%s,%s,'approved')",(seller,owner))
  x.execute("INSERT INTO producer_v1_test.reviewers(user_id) VALUES(%s)",(reviewer,))
  x.execute("INSERT INTO producer_v1_test.curators(user_id) VALUES(%s)",(curator,))
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
def curator_review():
 with psycopg.connect(dsn) as c:
  with c.cursor() as x:
   x.execute("SET LOCAL ROLE producer_v1_curator")
   x.execute("SELECT set_config('request.jwt.claim.sub',%s,true)",(str(curator),))
   x.execute("SELECT producer_v1_test.curator_approve_merchandise(%s)",(product,))
def denied_reviewer_merchandise():
 try:
  review("SELECT producer_v1_test.approve_publication(%s,'merchandise',true)",(product,))
 except psycopg.Error:
  return
 raise AssertionError("reviewer must not approve Merchandise by boolean flag")
review("SELECT producer_v1_test.decide_product(%s,'approved','verified')",(product,))
assert not eligible("marketplace")
review("SELECT producer_v1_test.approve_publication(%s,'marketplace',false)",(product,))
assert eligible("marketplace")
assert not eligible("merchandise")
denied_reviewer_merchandise()
assert eligible("marketplace"),"denied curator bypass must preserve Marketplace publication"
curator_review()
assert eligible("merchandise"),"authorized curator must be able to approve Merchandise"
assert not eligible("marketplace"),"single-target fixture limitation: separate multi-target fix pending"
with psycopg.connect(dsn) as c:
 with c.cursor() as x: x.execute("UPDATE producer_v1_test.products SET revision=2 WHERE id=%s",(product,))
assert not eligible("merchandise"),"new revision must not inherit old approval"
with psycopg.connect(dsn) as c:
 with c.cursor() as x: x.execute("UPDATE producer_v1_test.products SET revision=1 WHERE id=%s",(product,))
assert eligible("merchandise")
with psycopg.connect(dsn) as c:
 with c.cursor() as x: x.execute("UPDATE producer_v1_test.sellers SET status='suspended' WHERE id=%s",(seller,))
assert not eligible("merchandise"),"suspension must block previously approved publication"
print("PASS: reviewer cannot bypass separate curator; curator-only Merchandise approval, revision and seller suspension enforced")
print("NOT TESTED: production catalogue projection, real object storage, multi-target publication, revision immutability and JWT gateway")
