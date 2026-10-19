// Static, read-only review of UNSPLIT V2 SQL drafts. Never executes SQL.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const root = new URL('../docs/sql/', import.meta.url);
const names = [
  'marketplace-staging-v2-unsplit-clearing.DRAFT.sql',
  'marketplace-staging-v2-atomic-checkout.DRAFT.sql',
  'marketplace-staging-v2-atomic-cancel.DRAFT.sql'
];
const files = Object.fromEntries(names.map(name => [name, readFileSync(new URL(name, root), 'utf8')]));
let checks = 0;
function check(label, fn) { fn(); checks++; console.log('PASS', label); }
for (const [name, sql] of Object.entries(files)) {
  check(name + ': first statement is blocking review guard', () => {
    const stripped = sql.replace(/^(?:\s|--[^\n]*\n|\/\*[\s\S]*?\*\/)* /, '');
    // Ignore comments and whitespace, never treat commented RAISE as sufficient.
    const first = sql.replace(/^(?:(?:\s+)|(?:--[^\n]*(?:\n|$))|(?:\/\*[\s\S]*?\*\/))*/, '');
    assert.match(first, /^DO\s+\$review\$/i);
    assert.match(first.slice(0, first.indexOf('$review$;', 8) + 9), /RAISE\s+EXCEPTION/i);
  });
  check(name + ': no default client execution', () => {
    assert.match(sql, /REVOKE\s+ALL\s+ON\s+FUNCTION|REVOKE\s+ALL\s+ON\s+ec_wallet\.staging_cart_unsplit_clearing_v2/i);
  });
}
const clearing = files[names[0]], checkout = files[names[1]], cancel = files[names[2]];
check('unsplit clearing is restricted to pending/voided', () => {
  assert.match(clearing, /UNSPLIT-TEST-ONLY-v0/);
  assert.match(clearing, /state\s+IN\s*\('pending','voided'\)/);
  assert.match(clearing, /v_count<>1\s+OR\s+v_amount<>v_order\.total_ec/);
});
check('legacy checkout cannot post', () => {
  assert.match(checkout, /RAISE EXCEPTION 'V2 seller allocation policy and balanced accounting not implemented'/);
  assert.match(checkout, /staging_cart_seller_allocations_v2/);
});
check('legacy cancel cannot complete', () => {
  assert.match(cancel, /RAISE EXCEPTION 'V2 cancellation completion not approved'/);
  assert.match(cancel, /staging_cart_seller_allocations_v2/);
});
const journal = readFileSync(new URL('../docs/sql/marketplace-v2-isolated-synthetic-wallet-journal.REVIEW.sql', import.meta.url), 'utf8');
check('isolated journal first statement blocks deployment', () => {
  const first = journal.replace(/^(?:(?:\\s+)|(?:--[^\\n]*(?:\\n|$))|(?:\\/\\*[\\s\\S]*?\\*\\/))*/, '');
  assert.match(first, /^DO\\s+\\$review\\$/i);
  assert.match(first.slice(0, first.indexOf('$review$;', 8) + 9), /RAISE\\s+EXCEPTION/i);
});
check('isolated journal cannot link legacy wallet or ledger', () => {
  assert.doesNotMatch(journal, /REFERENCES\\s+ec_wallet\\.(?:wallets|ledger)\\s*\\(/i);
  assert.match(journal, /REFERENCES ec_wallet\\.staging_v2_test_wallets\\(wallet_id\\)/);
});
check('test wallet opening balance and immutable identity are guarded', () => {
  assert.match(journal, /NEW\\.balance_ec IS DISTINCT FROM NEW\\.opening_ec/);
  assert.match(journal, /NEW\\.fixture_buyer_id IS DISTINCT FROM OLD\\.fixture_buyer_id/);
  assert.match(journal, /BEFORE INSERT OR UPDATE OR DELETE ON ec_wallet\\.staging_v2_test_wallets/);
});
check('journal append-only, test-only and private by default', () => {
  assert.match(journal, /BEFORE UPDATE OR DELETE ON ec_wallet\\.staging_v2_test_journal/);
  assert.match(journal, /FORCE ROW LEVEL SECURITY/g);
  assert.match(journal, /REVOKE ALL ON ec_wallet\\.staging_v2_test_journal FROM PUBLIC, anon, authenticated, service_role/);
});
console.log('Static review checks passed:', checks);
console.log('NO-GO: legacy allocation-based RPC drafts are incompatible with UNSPLIT; no DB execution performed.');
