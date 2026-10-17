/* Echoes Marketplace synthetic selection regression tests. No network or real orders. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "../assets/js/marketplace-demo-selection.js"), "utf8");
const KEY = "echoes_marketplace_synthetic_cart_v1";
let now = 1_800_000_000_000;
const storage = new Map();
const sessionStorage = {
  getItem: key => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: key => storage.delete(key)
};
class Clock extends Date { static now() { return now; } }
const window = { sessionStorage };
vm.runInNewContext(source, { window, Date: Clock, Object, Set, JSON, Number, Error });
const selection = window.EchoesMarketplaceDemoSelection;
const read = () => JSON.parse(JSON.stringify(selection.read()));
function rejects(fn) { assert.throws(fn); }
function record(lines, savedAt = now) {
  storage.set(KEY, JSON.stringify({ version: 1, saved_at: savedAt, lines }));
}
function test(name, fn) {
  storage.clear();
  now = 1_800_000_000_000;
  fn();
  console.log("PASS", name);
}
test("empty state", () => assert.deepEqual(read(), []));
test("add and merge quantities", () => {
  selection.add("humanity-book", 2);
  selection.add("humanity-book", 3);
  assert.deepEqual(read(), [{ concept_id: "humanity-book", quantity: 5 }]);
  assert.deepEqual(Object.keys(JSON.parse(storage.get(KEY))).sort(), ["lines", "saved_at", "version"]);
});
test("update and remove quantity", () => {
  selection.add("humanity-book", 2);
  selection.setQuantity("humanity-book", 1);
  assert.equal(read()[0].quantity, 1);
  selection.setQuantity("humanity-book", 0);
  assert.deepEqual(read(), []);
});
test("expires after sixty minutes", () => {
  selection.add("humanity-book", 1);
  now += 60 * 60 * 1000 + 1;
  assert.deepEqual(read(), []);
  assert.equal(storage.has(KEY), false);
});
test("rejects future timestamp", () => {
  record([{ concept_id: "humanity-book", quantity: 1 }], now + 1);
  assert.deepEqual(read(), []);
});
test("rejects malformed JSON and clears it", () => {
  storage.set(KEY, "{broken");
  assert.deepEqual(read(), []);
  assert.equal(storage.has(KEY), false);
});
test("rejects duplicated product IDs", () => {
  record([{ concept_id: "humanity-book", quantity: 1 }, { concept_id: "humanity-book", quantity: 2 }]);
  assert.deepEqual(read(), []);
});
test("rejects invalid quantity and identifier", () => {
  rejects(() => selection.add("../unsafe", 1));
  rejects(() => selection.add("humanity-book", 100));
  rejects(() => selection.add("humanity-book", 0));
  record([{ concept_id: "humanity-book", quantity: 1.5 }]);
  assert.deepEqual(read(), []);
});
test("enforces per-product quantity ceiling", () => {
  selection.add("humanity-book", 99);
  rejects(() => selection.add("humanity-book", 1));
  assert.equal(read()[0].quantity, 99);
});
test("enforces fifty distinct lines", () => {
  for (let i = 0; i < 50; i++) selection.add("item-" + i, 1);
  rejects(() => selection.add("item-50", 1));
  assert.equal(read().length, 50);
});
test("clear removes stored state", () => {
  selection.add("humanity-book", 1);
  selection.clear();
  assert.deepEqual(read(), []);
});
console.log("Synthetic selection tests completed.");
