\set ON_ERROR_STOP on
-- Disposable PostgreSQL only. This is not a staging migration.
BEGIN;
CREATE SCHEMA v2_real;
CREATE TABLE v2_real.sellers (
 seller_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 label text NOT NULL, active boolean NOT NULL DEFAULT true,
 test_only boolean NOT NULL DEFAULT true CHECK(test_only)
);
CREATE TABLE v2_real.products (
 product_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 seller_id uuid NOT NULL REFERENCES v2_real.sellers ON DELETE RESTRICT,
 unit_price_ec bigint NOT NULL CHECK(unit_price_ec BETWEEN 1 AND 9007199254740991),
 available_qty integer NOT NULL CHECK(available_qty>=0),
 active boolean NOT NULL DEFAULT true,
 test_only boolean NOT NULL DEFAULT true CHECK(test_only)
);
CREATE TABLE v2_real.wallets (
 wallet_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 fixture_buyer_id uuid NOT NULL UNIQUE,
 opening_ec bigint NOT NULL CHECK(opening_ec BETWEEN 0 AND 9007199254740991),
 balance_ec bigint NOT NULL CHECK(balance_ec BETWEEN 0 AND 9007199254740991),
 test_only boolean NOT NULL DEFAULT true CHECK(test_only),
 CHECK(opening_ec=balance_ec) NOT VALID
);
-- Opening equality cannot be a persistent CHECK after spending: use an INSERT guard.
ALTER TABLE v2_real.wallets DROP CONSTRAINT wallets_check;
CREATE FUNCTION v2_real.guard_wallet_open() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.opening_ec<>NEW.balance_ec THEN RAISE EXCEPTION 'invalid opening balance'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER wallet_open BEFORE INSERT ON v2_real.wallets FOR EACH ROW EXECUTE FUNCTION v2_real.guard_wallet_open();
CREATE TABLE v2_real.orders (
 order_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 wallet_id uuid NOT NULL REFERENCES v2_real.wallets ON DELETE RESTRICT,
 request_key uuid NOT NULL,
 cart jsonb NOT NULL CHECK(jsonb_typeof(cart)='array'),
 total_ec bigint NOT NULL CHECK(total_ec BETWEEN 1 AND 9007199254740991),
 status text NOT NULL DEFAULT 'created' CHECK(status IN ('created','cancelled')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(wallet_id,request_key)
);
CREATE TABLE v2_real.order_lines (
 order_id uuid NOT NULL REFERENCES v2_real.orders ON DELETE RESTRICT,
 product_id uuid NOT NULL REFERENCES v2_real.products ON DELETE RESTRICT,
 seller_id uuid NOT NULL REFERENCES v2_real.sellers ON DELETE RESTRICT,
 qty integer NOT NULL CHECK(qty BETWEEN 1 AND 99),
 unit_price_ec bigint NOT NULL CHECK(unit_price_ec>0),
 line_total_ec bigint NOT NULL CHECK(line_total_ec>0),
 PRIMARY KEY(order_id,product_id)
);
CREATE TABLE v2_real.reservations (
 order_id uuid NOT NULL REFERENCES v2_real.orders ON DELETE RESTRICT,
 product_id uuid NOT NULL REFERENCES v2_real.products ON DELETE RESTRICT,
 qty integer NOT NULL CHECK(qty BETWEEN 1 AND 99),
 state text NOT NULL DEFAULT 'reserved' CHECK(state IN ('reserved','released')),
 PRIMARY KEY(order_id,product_id)
);
CREATE TABLE v2_real.journal (
 entry_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL REFERENCES v2_real.orders ON DELETE RESTRICT,
 wallet_id uuid NOT NULL REFERENCES v2_real.wallets ON DELETE RESTRICT,
 operation text NOT NULL CHECK(operation IN ('debit','reversal')),
 delta_ec bigint NOT NULL CHECK((operation='debit' AND delta_ec<0) OR (operation='reversal' AND delta_ec>0)),
 request_key uuid NOT NULL,
 UNIQUE(wallet_id,request_key), UNIQUE(order_id,operation)
);
CREATE TABLE v2_real.clearing (
 order_id uuid PRIMARY KEY REFERENCES v2_real.orders ON DELETE RESTRICT,
 amount_ec bigint NOT NULL CHECK(amount_ec>0),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','voided'))
);
CREATE FUNCTION v2_real.reject_journal_change() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN RAISE EXCEPTION 'immutable journal'; END $$;
CREATE TRIGGER journal_immutable BEFORE UPDATE OR DELETE ON v2_real.journal FOR EACH ROW EXECUTE FUNCTION v2_real.reject_journal_change();
ALTER TABLE v2_real.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_real.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_real.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_real.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_real.order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_real.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_real.journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_real.clearing ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_real.sellers FORCE ROW LEVEL SECURITY;
ALTER TABLE v2_real.products FORCE ROW LEVEL SECURITY;
ALTER TABLE v2_real.wallets FORCE ROW LEVEL SECURITY;
ALTER TABLE v2_real.orders FORCE ROW LEVEL SECURITY;
ALTER TABLE v2_real.order_lines FORCE ROW LEVEL SECURITY;
ALTER TABLE v2_real.reservations FORCE ROW LEVEL SECURITY;
ALTER TABLE v2_real.journal FORCE ROW LEVEL SECURITY;
ALTER TABLE v2_real.clearing FORCE ROW LEVEL SECURITY;
COMMIT;
