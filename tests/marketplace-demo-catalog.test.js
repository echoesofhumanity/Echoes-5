/* Run with: node tests/marketplace-demo-catalog.test.js
 * Offline synthetic catalogue tests; never calls payments or live services.
 */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "assets/js/marketplace-demo-catalog.js"), "utf8"), context);
const validate = context.window.EchoesMarketplaceDemoCatalog.validate;
const original = JSON.parse(fs.readFileSync(path.join(root, "assets/data/marketplace-demo-catalog.json"), "utf8"));
const clone = () => JSON.parse(JSON.stringify(original));
let count = 0;
function test(name, change, shouldReject = true) {
  const data = clone();
  change(data);
  if (shouldReject) assert.throws(() => validate(data), { name: "Error" }, name);
  else assert.equal(validate(data).length, 4, name);
  console.log("PASS", name);
  count++;
}
test("valid isolated EC catalogue", () => {}, false);
test("reject zero EC price", d => { d.products[0].price_ec = 0; });
test("reject negative EC price", d => { d.products[0].price_ec = -1; });
test("reject fractional EC price", d => { d.products[0].price_ec = 12.5; });
test("reject string EC price", d => { d.products[0].price_ec = "1990"; });
test("reject duplicate product ID", d => { d.products[1].product_id = d.products[0].product_id; });
test("reject duplicate concept ID", d => { d.products[1].concept_id = d.products[0].concept_id; });
test("reject malformed UUID", d => { d.products[0].product_id = "fake-id"; });
test("reject verified creator", d => { d.products[0].creator_verified = true; });
test("reject assigned creator", d => { d.products[0].creator_id = "demo-creator"; });
test("reject synthetic stock", d => { d.products[0].stock_quantity = 10; });
test("reject published product", d => { d.products[0].published = true; });
test("reject product checkout", d => { d.products[0].checkout_enabled = true; });
test("reject global checkout", d => { d.checkout_enabled = true; });
test("reject fiat currency", d => { d.currency = "USD"; });
test("reject live mode", d => { d.mode = "live"; });
test("reject unsupported schema", d => { d.schema_version = 2; });
test("reject empty title", d => { d.products[0].title = " "; });
console.log("All " + count + " synthetic catalogue tests passed.");
