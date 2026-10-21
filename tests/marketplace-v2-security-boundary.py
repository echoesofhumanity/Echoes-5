"""Fail-closed API exposure and role permission checks in disposable PostgreSQL.
Tests deny-by-default boundaries; does not assert real JWT validation or staging RLS parity.
"""
import os
import psycopg
dsn=os.environ['TEST_DATABASE_URL']
with psycopg.connect(dsn) as c:
    with c.cursor() as q:
        q.execute("SELECT current_database()")
        assert q.fetchone()[0]=='echoes_v2_disposable_test'
        q.execute("CREATE ROLE v2_anon NOLOGIN")
        q.execute("CREATE ROLE v2_authenticated NOLOGIN")
        q.execute("CREATE ROLE v2_executor NOLOGIN NOBYPASSRLS")
        q.execute("REVOKE ALL ON SCHEMA echoes_v2_synthetic FROM PUBLIC")
        q.execute("REVOKE ALL ON ALL TABLES IN SCHEMA echoes_v2_synthetic FROM PUBLIC")
        q.execute("REVOKE ALL ON ALL FUNCTIONS IN SCHEMA echoes_v2_synthetic FROM PUBLIC")
        q.execute("GRANT USAGE ON SCHEMA echoes_v2_synthetic TO v2_executor")
        # No API grants to browser roles. FORCE RLS is checked independently.
        for table in ('sellers','products','wallets','orders','order_lines','reservations','journal','clearing'):
            q.execute(f'ALTER TABLE echoes_v2_synthetic.{table} ENABLE ROW LEVEL SECURITY')
            q.execute(f'ALTER TABLE echoes_v2_synthetic.{table} FORCE ROW LEVEL SECURITY')
        for role in ('v2_anon','v2_authenticated'):
            q.execute("SELECT has_schema_privilege(%s,'echoes_v2_synthetic','USAGE')",(role,))
            assert q.fetchone()[0] is False,(role,'schema')
            q.execute("SELECT has_table_privilege(%s,'echoes_v2_synthetic.wallets','SELECT')",(role,))
            assert q.fetchone()[0] is False,(role,'wallet')
            for fn in ('checkout(uuid,uuid,jsonb)','cancel(uuid,uuid,uuid)'):
                q.execute("SELECT has_function_privilege(%s,%s,'EXECUTE')",(role,'echoes_v2_synthetic.'+fn))
                assert q.fetchone()[0] is False,(role,fn)
        q.execute("SELECT rolcanlogin,rolbypassrls FROM pg_roles WHERE rolname='v2_executor'")
        assert q.fetchone()==(False,False)
        q.execute("""SELECT count(*) FROM pg_class t JOIN pg_namespace n ON n.oid=t.relnamespace
                     WHERE n.nspname='echoes_v2_synthetic' AND t.relkind='r'
                     AND t.relrowsecurity AND t.relforcerowsecurity""")
        assert q.fetchone()[0]==8
print('PASS: ephemeral browser roles denied schema, wallet and raw RPC; all 8 tables FORCE RLS')
print('NOT TESTED: installed staging policy definitions, authenticated RPC wrappers, Supabase gateway signed JWT')
