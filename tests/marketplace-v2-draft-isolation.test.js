/* Marketplace V2 draft boundary audit: offline only, no SQL execution.
 * This test checks documented fail-closed state, NOT PostgreSQL readiness.
 */
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const manifest=read("docs/marketplace-v2-preinstall-verification-package.md");
const docs=[
 "docs/sql/marketplace-staging-v2-independent-catalog.DRAFT.sql",
 "docs/sql/marketplace-staging-multi-item-v2.DRAFT.sql",
 "docs/sql/marketplace-staging-v2-seller-allocations.DRAFT.sql",
 "docs/sql/marketplace-staging-v2-consolidated-integrity-guards.DRAFT.sql",
 "docs/sql/marketplace-staging-v2-allocation-transition-guards.DRAFT.sql",
 "docs/sql/marketplace-staging-v2-allocation-reconciliation.DRAFT.sql",
 "docs/sql/marketplace-staging-v2-cart-normalization.DRAFT.sql",
 "docs/sql/marketplace-staging-v2-ledger-event-reconciliation.DRAFT.sql",
 "docs/sql/marketplace-staging-v2-atomic-checkout.DRAFT.sql",
 "docs/sql/marketplace-staging-v2-atomic-cancel.DRAFT.sql",
 "docs/sql/marketplace-staging-v2-rpc-access-guards.DRAFT.sql"
];
assert.match(manifest,/REVIEW ONLY\s*\/\s*NO-GO/);
for(const file of docs){
 assert.ok(fs.existsSync(path.join(root,file)),"missing declared draft "+file);
 assert.ok(manifest.includes(file),"missing manifest entry "+file);
 const sql=read(file);
 assert.match(sql,/DO\s+\$review\$[\s\S]*?RAISE EXCEPTION[\s\S]*?END\s+\$review\$;/i,"missing pre-DDL hard stop "+file);
}
const checkout=read("docs/sql/marketplace-staging-v2-atomic-checkout.DRAFT.sql");
assert.match(checkout,/v_policy_seller_bps\s+integer\s*:=\s*NULL/i);
assert.match(checkout,/v_policy_humanitarian_bps\s+integer\s*:=\s*NULL/i);
assert.match(checkout,/v_policy_operating_bps\s+integer\s*:=\s*NULL/i);
const bridge=read("assets/js/marketplace-v2-bridge.js");
assert.match(bridge,/connection:\s*"disabled"/);
assert.match(bridge,/checkout_enabled:\s*false/);
assert.match(bridge,/production_enabled:\s*false/);
assert.match(bridge,/staging_approved:\s*false/);
console.log("PASS V2 DRAFT files present, review stops retained, unapproved policy unset, browser checkout disabled; NOT a staging database test");
