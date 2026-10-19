#!/usr/bin/env bash
set -euo pipefail
export PGOPTIONS='-c statement_timeout=15000'
psql -X -v ON_ERROR_STOP=1 <<'SQL'
CREATE SCHEMA IF NOT EXISTS v2_race;
DROP TABLE IF EXISTS v2_race.orders;
DROP TABLE IF EXISTS v2_race.product;
CREATE TABLE v2_race.product (id integer PRIMARY KEY, stock integer NOT NULL CHECK(stock>=0));
CREATE TABLE v2_race.orders (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, request_key text UNIQUE NOT NULL);
INSERT INTO v2_race.product VALUES(1,1);
CREATE OR REPLACE FUNCTION v2_race.buy(k text) RETURNS boolean LANGUAGE plpgsql SET search_path='' AS $$
DECLARE s int;
BEGIN
  PERFORM 1 FROM v2_race.product WHERE id=1 FOR UPDATE;
  IF EXISTS (SELECT 1 FROM v2_race.orders WHERE request_key=k) THEN RETURN true; END IF;
  SELECT stock INTO s FROM v2_race.product WHERE id=1;
  IF s<1 THEN RETURN false; END IF;
  UPDATE v2_race.product SET stock=stock-1 WHERE id=1;
  INSERT INTO v2_race.orders(request_key) VALUES(k);
  RETURN true;
END $$;
SQL
psql -X -v ON_ERROR_STOP=1 -Atc "SELECT v2_race.buy('buyer-a')" > /tmp/v2-race-a.txt &
p1=$!
psql -X -v ON_ERROR_STOP=1 -Atc "SELECT v2_race.buy('buyer-b')" > /tmp/v2-race-b.txt &
p2=$!
wait "$p1"
wait "$p2"
printf 'buyer-a=%s buyer-b=%s\n' "$(cat /tmp/v2-race-a.txt)" "$(cat /tmp/v2-race-b.txt)"
psql -X -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF (SELECT stock FROM v2_race.product WHERE id=1)<>0 THEN RAISE EXCEPTION 'incorrect final stock'; END IF;
  IF (SELECT count(*) FROM v2_race.orders)<>1 THEN RAISE EXCEPTION 'oversell race'; END IF;
  RAISE NOTICE 'Concurrent last-unit race passed: exactly one buyer succeeded';
END $$;
SQL
