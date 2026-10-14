/* Run: node tests/marketplace-demo-cart.test.js
 * Isolated tests; no payment, order or live storefront access.
 */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const context = { window: {} };
for (const filename of ["marketplace-demo-catalog.js", "marketplace-demo-cart.js"]) {
  vm.runInNewContext(fs.readFileSync(path.join(root, "assets/js", filename), "utf8"), context);
}
const data = JSON.parse(fs.readFileSync(path.join(root, "assets/data/marketplace-demo-catalog.json"), "utf8"));
const products = context.window.EchoesMarketplaceDemoCatalog.validate(data);
const calculate = context.window.EchoesMarketplaceDemoCart.calculate;
const first = products[0].product_id;
const second = products[3].product_id;
const valid = [{ product_id: first, quantity: 2 }, { product_id: second, quantity: 1 }];
let count = 0;
function test(name, action, reject = true) {
  if (reject) assert.throws(action, { name: "Error" }, name);
  else action();
  count++;
  console.log("PASS", name);
}
test("calculate two product lines in EC", () => {
  const cart = calculate(products, valid);
  assert.equal(cart.total_ec, 4970);
  assert.equal(cart.lines.length, 2);
  assert.equal(cart.lines[0].subtotal_ec, 3980);
  assert.equal(cart.lines[1].subtotal_ec, 990);
  assert.equal(cart.checkout_enabled, false);
}, false);
test("reject empty cart", () => calculate(products, []));
test("reject unknown product", () => calculate(products, [{ product_id: "11111111-1111-4111-8111-111111111111", quantity: 1 }]));
test("reject duplicate cart line", () => calculate(products, [valid[0], valid[0]]));
test("reject zero quantity", () => calculate(products, [{ product_id: first, quantity: 0 }]));
test("reject negative quantity", () => calculate(products, [{ product_id: first, quantity: -1 }]));
test("reject fractional quantity", () => calculate(products, [{ product_id: first, quantity: 1.5 }]));
test("reject string quantity", () => calculate(products, [{ product_id: first, quantity: "2" }]));
test("reject quantity above limit", () => calculate(products, [{ product_id: first, quantity: 100 }]));
test("reject invalid product identifier", () => calculate(products, [{ product_id: "bad", quantity: 1 }]));
test("reject duplicate catalogue identity", () => calculate([products[0], products[0]], valid));
test("reject catalogue checkout permission", () => calculate([{ ...products[0], checkout_enabled: true }], [{ product_id: first, quantity: 1 }]));
test("reject catalogue publication", () => calculate([{ ...products[0], published: true }], [{ product_id: first, quantity: 1 }]));
test("reject unsafe catalogue price", () => calculate([{ ...products[0], price_ec: 0 }], [{ product_id: first, quantity: 1 }]));
test("reject unsafe total overflow", () => calculate([{ ...products[0], price_ec: Number.MAX_SAFE_INTEGER }], [{ product_id: first, quantity: 2 }]));
console.log("All " + count + " synthetic cart tests passed.");
