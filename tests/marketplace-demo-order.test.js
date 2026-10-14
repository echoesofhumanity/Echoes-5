/* Run: node tests/marketplace-demo-order.test.js
 * Synthetic-only order lifecycle; no network, checkout or persistence.
 */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const context = { window: {} };
for (const file of ["marketplace-demo-catalog.js", "marketplace-demo-cart.js", "marketplace-demo-order.js"]) {
  vm.runInNewContext(fs.readFileSync(path.join(root, "assets/js", file), "utf8"), context);
}
const catalog = JSON.parse(fs.readFileSync(path.join(root, "assets/data/marketplace-demo-catalog.json"), "utf8"));
const products = context.window.EchoesMarketplaceDemoCatalog.validate(catalog);
const cart = context.window.EchoesMarketplaceDemoCart.calculate(products, [
  { product_id: products[0].product_id, quantity: 2 },
  { product_id: products[3].product_id, quantity: 1 }
]);
const api = context.window.EchoesMarketplaceDemoOrder;
const id = "DEMO-ABC123";
const created = api.create(cart, id);
let count = 0;
function pass(name, action) { action(); count++; console.log("PASS", name); }
function reject(name, action) { assert.throws(action, { name: "Error" }, name); count++; console.log("PASS", name); }
pass("create synthetic order with EC total", () => {
  assert.equal(created.order_id, id);
  assert.equal(created.total_ec, 4970);
  assert.equal(created.status, "created");
  assert.equal(created.payment_status, "not_applicable");
  assert.equal(created.checkout_enabled, false);
  assert.equal(created.history.length, 1);
});
pass("confirm and fulfill", () => {
  const confirmed = api.transition(created, "confirmed");
  const fulfilled = api.transition(confirmed, "fulfilled");
  assert.equal(fulfilled.status, "fulfilled");
  assert.equal(fulfilled.history.length, 3);
  assert.equal(created.status, "created");
  assert.equal(confirmed.status, "confirmed");
});
pass("cancel from created", () => assert.equal(api.transition(created, "cancelled").status, "cancelled"));
pass("cancel from confirmed", () => assert.equal(api.transition(api.transition(created, "confirmed"), "cancelled").status, "cancelled"));
pass("snapshot is immutable", () => {
  assert.equal(Object.isFrozen(created), true);
  assert.equal(Object.isFrozen(created.lines[0]), true);
  assert.equal(Object.isFrozen(created.history[0]), true);
});
reject("reject malformed order ID", () => api.create(cart, "ORDER-ABC123"));
reject("reject empty order ID", () => api.create(cart, ""));
reject("reject invalid cart total", () => api.create({ ...cart, total_ec: 1 }, id));
reject("reject cart with payment permission", () => api.create({ ...cart, checkout_enabled: true }, id));
reject("reject empty cart", () => api.create({ ...cart, lines: [] }, id));
reject("reject duplicate cart line", () => api.create({ ...cart, lines: [cart.lines[0], cart.lines[0]], total_ec: 7960 }, id));
reject("reject invalid line subtotal", () => api.create({ ...cart, lines: [{ ...cart.lines[0], subtotal_ec: 1 }, cart.lines[1]] }, id));
reject("reject direct fulfillment", () => api.transition(created, "fulfilled"));
reject("reject repeat created status", () => api.transition(created, "created"));
reject("reject unknown status", () => api.transition(created, "paid"));
reject("reject fulfillment after cancellation", () => api.transition(api.transition(created, "cancelled"), "fulfilled"));
reject("reject cancellation after fulfillment", () => api.transition(api.transition(api.transition(created, "confirmed"), "fulfilled"), "cancelled"));
reject("reject forged payment state", () => api.transition({ ...created, payment_status: "paid" }, "confirmed"));
reject("reject forged checkout state", () => api.transition({ ...created, checkout_enabled: true }, "confirmed"));
reject("reject history/status mismatch", () => api.transition({ ...created, status: "confirmed" }, "fulfilled"));
console.log("All " + count + " synthetic order tests passed.");
