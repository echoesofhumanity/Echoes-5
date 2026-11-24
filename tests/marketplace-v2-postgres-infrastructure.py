"""Independent PostgreSQL infrastructure smoke test, NOT a V2 business logic acceptance test."""
import os,threading,uuid
import psycopg

dsn=os.environ["TEST_DATABASE_URL"]
with psycopg.connect(dsn) as conn:
    with conn.cursor() as cur:
        cur.execute("SELECT current_database(),current_setting('server_version_num')::int")
        db,version=cur.fetchone()
        assert db=="echoes_v2_disposable_test" and 170000<=version<180000,(db,version)
        cur.execute("CREATE TEMP TABLE temp_check (n integer)")
        cur.execute("INSERT INTO temp_check VALUES (1)")
        cur.execute("SELECT count(*) FROM temp_check")
        assert cur.fetchone()[0]==1
print("PASS: independent disposable PostgreSQL 17 database")
# Two independent database sessions contend for one row. This validates the
# test runner can exercise real PostgreSQL row locking, not V2 checkout logic.
with psycopg.connect(dsn) as conn:
    with conn.cursor() as cur:
        cur.execute("CREATE TABLE race_smoke (id int PRIMARY KEY, stock int NOT NULL CHECK (stock>=0))")
        cur.execute("INSERT INTO race_smoke VALUES (1,1)")
barrier=threading.Barrier(2)
results=[]
mutex=threading.Lock()
def worker():
    try:
        with psycopg.connect(dsn) as conn:
            with conn.cursor() as cur:
                cur.execute("SET LOCAL lock_timeout='5s'")
                barrier.wait(timeout=7)
                cur.execute("UPDATE race_smoke SET stock=stock-1 WHERE id=1 AND stock>0 RETURNING stock")
                won=cur.fetchone() is not None
        outcome="won" if won else "sold_out"
    except Exception as exc:
        outcome="ERROR:"+repr(exc)
    with mutex:results.append(outcome)
a=threading.Thread(target=worker);b=threading.Thread(target=worker)
a.start();b.start();a.join(12);b.join(12)
assert not a.is_alive() and not b.is_alive(),"worker timeout"
assert sorted(results)==["sold_out","won"],results
with psycopg.connect(dsn) as conn:
    with conn.cursor() as cur:
        cur.execute("SELECT stock FROM race_smoke WHERE id=1")
        assert cur.fetchone()[0]==0
print("PASS: independent sessions and last-unit row-lock race")
print("NOT TESTED: installed Echoes V2 schema, checkout/cancel, real Supabase JWT")
