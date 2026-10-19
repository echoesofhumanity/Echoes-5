#!/usr/bin/env bash
set -euo pipefail
export PGOPTIONS='-c statement_timeout=15000'
psql -X -v ON_ERROR_STOP=1 <<'SQL'
CREATE SCHEMA IF NOT EXISTS v2_cancel_race;
CREATE TABLE v2_cancel_race.wallet (id integer PRIMARY KEY, opening bigint NOT NULL, balance bigint NOT NULL CHECK(balance>=0));
CREATE TABLE v2_cancel_race.product (id integer PRIMARY KEY, stock integer NOT NULL CHECK(stock>=0));
CREATE TABLE v2_cancel_race.orders (id integer PRIMARY KEY, wallet_id integer NOT NULL REFERENCES v2_cancel_race.wallet, product_id integer NOT NULL REFERENCES v2_cancel_race.product, qty integer NOT NULL, total bigint NOT NULL, state text NOT NULL CHECK(state IN ('created','cancelled')));
CREATE TABLE v2_cancel_race.journal (order_id integer NOT NULL REFERENCES v2_cancel_race.orders, operation text NOT NULL CHECK(operation IN ('debit','reversal')), delta bigint NOT NULL, PRIMARY KEY(order_id,operation));
CREATE TABLE v2_cancel_race.clearing (order_id integer PRIMARY KEY REFERENCES v2_cancel_race.orders, amount bigint NOT NULL, state text NOT NULL CHECK(state IN ('pending','voided')));
INSERT INTO v2_cancel_race.wallet VALUES(1,1000,700);
INSERT INTO v2_cancel_race.product VALUES(1,3);
INSERT INTO v2_cancel_race.orders VALUES(1,1,1,2,300,'created');
INSERT INTO v2_cancel_race.journal VALUES(1,'debit',-300);
INSERT INTO v2_cancel_race.clearing VALUES(1,300,'pending');
CREATE FUNCTION v2_cancel_race.cancel_order(oid integer) RETURNS text LANGUAGE plpgsql SET search_path='' AS $$
DECLARE o v2_cancel_race.orders%ROWTYPE;
BEGIN
 PERFORM 1 FROM v2_cancel_race.wallet WHERE id=1 FOR UPDATE;
 SELECT * INTO o FROM v2_cancel_race.orders WHERE id=oid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'missing order'; END IF;
 IF o.state='cancelled' THEN RETURN 'replay'; END IF;
 IF NOT EXISTS(SELECT 1 FROM v2_cancel_race.journal WHERE order_id=oid AND operation='debit' AND delta=-o.total) THEN RAISE EXCEPTION 'missing debit'; END IF;
 UPDATE v2_cancel_race.product SET stock=stock+o.qty WHERE id=o.product_id;
 UPDATE v2_cancel_race.wallet SET balance=balance+o.total WHERE id=o.wallet_id;
 INSERT INTO v2_cancel_race.journal VALUES(oid,'reversal',o.total);
 UPDATE v2_cancel_race.clearing SET state='voided' WHERE order_id=oid AND state='pending';
 IF NOT FOUND THEN RAISE EXCEPTION 'missing clearing'; END IF;
 UPDATE v2_cancel_race.orders SET state='cancelled' WHERE id=oid;
 RETURN 'cancelled';
END $$;
SQL
psql -X -v ON_ERROR_STOP=1 -Atc "SELECT v2_cancel_race.cancel_order(1)" > /tmp/v2-cancel-race-a.txt &
p1=$!
psql -X -v ON_ERROR_STOP=1 -Atc "SELECT v2_cancel_race.cancel_order(1)" > /tmp/v2-cancel-race-b.txt &
p2=$!
wait "$p1"
wait "$p2"
a="$(cat /tmp/v2-cancel-race-a.txt)"
b="$(cat /tmp/v2-cancel-race-b.txt)"
printf 'cancel-a=%s cancel-b=%s\n' "$a" "$b"
if [[ "$a $b" != "cancelled replay" && "$a $b" != "replay cancelled" ]]; then
  echo "Expected one cancellation and one replay" >&2
  exit 1
fi
psql -X -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
 IF (SELECT balance FROM v2_cancel_race.wallet WHERE id=1)<>1000 THEN RAISE EXCEPTION 'double credit'; END IF;
 IF (SELECT stock FROM v2_cancel_race.product WHERE id=1)<>5 THEN RAISE EXCEPTION 'double restock'; END IF;
 IF (SELECT count(*) FROM v2_cancel_race.journal WHERE operation='reversal')<>1 THEN RAISE EXCEPTION 'double reversal'; END IF;
 IF (SELECT state FROM v2_cancel_race.clearing WHERE order_id=1)<>'voided' THEN RAISE EXCEPTION 'clearing not voided'; END IF;
 IF (SELECT opening+COALESCE((SELECT sum(delta) FROM v2_cancel_race.journal),0) FROM v2_cancel_race.wallet WHERE id=1)<>(SELECT balance FROM v2_cancel_race.wallet WHERE id=1) THEN RAISE EXCEPTION 'reconciliation mismatch'; END IF;
 RAISE NOTICE 'Concurrent cancellation test passed: one reversal, one credit, one restock, one clearing void';
END $$;
SQL
