"""Disposable two-buyer RLS isolation test. SQL role claims are synthetic, NOT signed JWT."""
import os,uuid
import psycopg

dsn=os.environ["TEST_DATABASE_URL"]
with psycopg.connect(dsn) as c:
 with c.cursor() as q:
  q.execute("SELECT current_database()")
  assert q.fetchone()[0]=="echoes_v2_disposable_test"
  q.execute("CREATE SCHEMA IF NOT EXISTS auth")
  q.execute("""CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $$""")
  q.execute("GRANT USAGE ON SCHEMA auth TO v2_executor")
  q.execute("GRANT EXECUTE ON FUNCTION auth.uid() TO v2_executor")
  q.execute("GRANT SELECT ON ALL TABLES IN SCHEMA echoes_v2_synthetic TO v2_executor")
  q.execute("GRANT USAGE ON SCHEMA echoes_v2_synthetic TO v2_executor")
  q.execute("""CREATE POLICY wallets_owner_select ON echoes_v2_synthetic.wallets
    FOR SELECT TO v2_executor USING (fixture_buyer_id=(SELECT auth.uid()))""")
  q.execute("""CREATE POLICY orders_owner_select ON echoes_v2_synthetic.orders
    FOR SELECT TO v2_executor USING (wallet_id IN
      (SELECT wallet_id FROM echoes_v2_synthetic.wallets WHERE fixture_buyer_id=(SELECT auth.uid())))""")
  for table in ("journal","order_lines","reservations","clearing"):
   q.execute(f"""CREATE POLICY {table}_owner_select ON echoes_v2_synthetic.{table}
    FOR SELECT TO v2_executor USING (order_id IN (SELECT order_id FROM echoes_v2_synthetic.orders))""")
  q.execute("CREATE POLICY products_test_select ON echoes_v2_synthetic.products FOR SELECT TO v2_executor USING (test_only)")
  q.execute("CREATE POLICY sellers_test_select ON echoes_v2_synthetic.sellers FOR SELECT TO v2_executor USING (test_only)")
  a,b=uuid.uuid4(),uuid.uuid4()
  q.execute("INSERT INTO echoes_v2_synthetic.sellers(label) VALUES('RLS QA') RETURNING seller_id")
  seller=q.fetchone()[0]
  q.execute("INSERT INTO echoes_v2_synthetic.products(seller_id,unit_price_ec,available_qty) VALUES(%s,5,5) RETURNING product_id",(seller,))
  product=q.fetchone()[0]
  for buyer in (a,b):
   q.execute("INSERT INTO echoes_v2_synthetic.wallets(fixture_buyer_id,opening_ec,balance_ec) VALUES(%s,100,100) RETURNING wallet_id",(buyer,))
   wallet=q.fetchone()[0]
   q.execute("INSERT INTO echoes_v2_synthetic.orders(wallet_id,request_key,cart,total_ec) VALUES(%s,%s,'[]',5) RETURNING order_id",(wallet,uuid.uuid4()))
   order=q.fetchone()[0]
   q.execute("INSERT INTO echoes_v2_synthetic.order_lines VALUES(%s,%s,%s,1,5,5)",(order,product,seller))
   q.execute("INSERT INTO echoes_v2_synthetic.reservations VALUES(%s,%s,1,'reserved')",(order,product))
   q.execute("INSERT INTO echoes_v2_synthetic.journal(order_id,wallet_id,operation,delta_ec,request_key) VALUES(%s,%s,'debit',-5,%s)",(order,wallet,uuid.uuid4()))
   q.execute("INSERT INTO echoes_v2_synthetic.clearing VALUES(%s,5,'pending')",(order,))
  for buyer in (a,b):
   q.execute("SET LOCAL ROLE v2_executor")
   q.execute("SELECT set_config('request.jwt.claim.sub',%s,true)",(str(buyer),))
   for table in ("wallets","orders","journal","order_lines","reservations","clearing"):
    q.execute(f"SELECT count(*) FROM echoes_v2_synthetic.{table}")
    n=q.fetchone()[0]
    assert n==1,(str(buyer),table,n)
   q.execute("RESET ROLE")
  q.execute("SET LOCAL ROLE v2_executor")
  q.execute("SELECT set_config('request.jwt.claim.sub','',true)")
  for table in ("wallets","orders","journal","order_lines","reservations","clearing"):
   q.execute(f"SELECT count(*) FROM echoes_v2_synthetic.{table}")
   assert q.fetchone()[0]==0,table
  q.execute("RESET ROLE")
print("PASS: two synthetic identities each see only their own wallet/order/lines/reservation/journal/clearing")
print("PASS: missing synthetic identity sees no buyer records")
print("NOT TESTED: cryptographically verified JWT, actual Supabase API gateway, complete staging grants/policies")
