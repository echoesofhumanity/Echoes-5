#!/usr/bin/env node
// Marketplace V2 static safety gate. Never connects to a database.
// Run: node scripts/check-marketplace-v2-draft-safety.mjs
import { readFileSync } from 'node:fs';
import { exit } from 'node:process';
const root = new URL('../', import.meta.url);
const files = {
  checkout: 'docs/sql/marketplace-staging-v2-atomic-checkout.DRAFT.sql',
  cancel: 'docs/sql/marketplace-staging-v2-atomic-cancel.DRAFT.sql',
  reservations: 'docs/sql/marketplace-staging-multi-item-v2.DRAFT.sql',
  clearing: 'docs/sql/marketplace-staging-v2-unsplit-clearing.DRAFT.sql',
  reconciliation: 'docs/sql/marketplace-staging-v2-ledger-event-reconciliation.DRAFT.sql'
};
let failed = 0;
let warnings = 0;
function warn(label, condition) {
  if (condition) { warnings++; process.stdout.write(`WARN ${label}\n`); }
}
function check(label, ok) {
  process.stdout.write(`${ok ? 'PASS' : 'FAIL'} ${label}\n`);
  if (!ok) failed++;
}
for (const [key, path] of Object.entries(files)) {
  let sql;
  try { sql = readFileSync(new URL(path, root), 'utf8'); }
  catch (e) { check(`${key}: file readable`, false); continue; }
  const head = sql.slice(0, 800);
  check(`${key}: top-level review exception`,
    /DO\s+\$review\$[\s\S]*?RAISE EXCEPTION[\s\S]*?END\s*\$review\$;/i.test(head));
  check(`${key}: transaction present`, /\bBEGIN;/.test(sql) && /\bCOMMIT;/.test(sql));
  check(`${key}: client privileges revoked`,
    /REVOKE\s+ALL\s+ON/i.test(sql));
}
const checkout = readFileSync(new URL(files.checkout, root), 'utf8');
const cancel = readFileSync(new URL(files.cancel, root), 'utf8');
const reservation = readFileSync(new URL(files.reservations, root), 'utf8');
check('checkout: internal posting hard stop', /RAISE EXCEPTION 'V2 checkout posting intentionally disabled/.test(checkout));
check('cancel: internal posting hard stop', /RAISE EXCEPTION 'V2 cancellation posting intentionally disabled/.test(cancel));
warn('legacy V2 checkout contains an unapproved hard-coded 30-minute reservation lifetime; DO NOT ACTIVATE', /interval '30 minutes'/.test(checkout));
check('reservation: expiry cannot automatically release', /transaction_timestamp\(\) >= OLD\.expires_at/.test(reservation));
check('reservation: consumption blocked', /Reservation consumption requires separately approved operation/.test(reservation));
check('unsplit: no seller allocation in clearing DDL', !/INSERT INTO ec_wallet\.staging_cart_seller_allocations_v2/i.test(
  readFileSync(new URL(files.clearing, root), 'utf8')));
process.stdout.write(`Static checks: ${failed ? 'FAILED' : 'PASSED'}; warnings: ${warnings}; PostgreSQL/runtime NOT tested.\n`);
exit(failed ? 1 : 0);
