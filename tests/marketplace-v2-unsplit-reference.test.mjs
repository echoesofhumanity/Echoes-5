import test from 'node:test';
import assert from 'node:assert/strict';
import { SyntheticMarketplace } from './marketplace-v2-unsplit-reference.mjs';
const make = () => new SyntheticMarketplace({ ttlMs: 1800000, stock: { a: { quantity: 3, price: 10, active: true, testOnly: true }, b: { quantity: 2, price: 7, active: true, testOnly: true } }, balances: { buyer: 100 } });
const request = { buyer: 'buyer', key: 'request-1', lines: [{ product: 'b', quantity: 1 }, { product: 'a', quantity: 2 }], now: 1000 };
test('multi-item checkout reserves stock and holds full amount as unsplit clearing', () => {
  const m = make(); const o = m.checkout(request);
  assert.equal(o.total, 27); assert.equal(o.clearing, 'pending');
  assert.equal(m.stock.get('a').quantity, 1); assert.equal(m.balances.get('buyer'), 73);
  assert.equal(o.debit, -27);
});
test('checkout replay does not debit or decrement twice', () => {
  const m = make(); m.checkout(request); assert.equal(m.checkout(request).replayed, true);
  assert.equal(m.balances.get('buyer'), 73); assert.equal(m.stock.get('a').quantity, 1);
});
test('same request key with different cart is rejected', () => {
  const m = make(); m.checkout(request);
  assert.throws(() => m.checkout({ ...request, lines: [{ product: 'a', quantity: 1 }] }), /Idempotency conflict/);
});
test('failed checkout has no partial effects', () => {
  const m = make();
  assert.throws(() => m.checkout({ ...request, lines: [{ product: 'a', quantity: 2 }, { product: 'b', quantity: 3 }] }), /Product unavailable/);
  assert.equal(m.balances.get('buyer'), 100); assert.equal(m.stock.get('a').quantity, 3);
});
test('cancel restores full stock and EC, voids clearing once', () => {
  const m = make(); const o = m.checkout(request);
  const cancelled = m.cancel({ buyer: 'buyer', orderId: o.orderId, now: 2000 });
  assert.equal(cancelled.reversal, 27); assert.equal(cancelled.clearing, 'voided');
  assert.equal(m.balances.get('buyer'), 100); assert.equal(m.stock.get('a').quantity, 3);
  assert.equal(m.cancel({ buyer: 'buyer', orderId: o.orderId, now: 2000 }).replayed, true);
  assert.equal(m.balances.get('buyer'), 100);
});
test('expiry does not auto-release, refund or void', () => {
  const m = make(); const o = m.checkout(request);
  assert.throws(() => m.cancel({ buyer: 'buyer', orderId: o.orderId, now: o.expiresAt }), /Expired reservation/);
  assert.equal(m.balances.get('buyer'), 73); assert.equal(m.stock.get('a').quantity, 1);
  assert.equal(m.orders.get(o.orderId).clearing, 'pending');
});
test('cross-buyer cancellation rejected', () => {
  const m = make(); const o = m.checkout(request);
  assert.throws(() => m.cancel({ buyer: 'other', orderId: o.orderId, now: 2000 }), /Order not found/);
});
test('TTL is required, not silently defaulted', () => {
  assert.throws(() => new SyntheticMarketplace({ stock: {}, balances: {} }), /TTL required/);
});

test('expiry integer overflow does not mutate stock or wallet', () => {
  const m = make();
  assert.throws(() => m.checkout({ ...request, now: Number.MAX_SAFE_INTEGER }), /Expiry overflow/);
  assert.equal(m.balances.get('buyer'), 100);
  assert.equal(m.stock.get('a').quantity, 3);
  assert.equal(m.orders.size, 0);
});
test('refund integer overflow does not partially restore stock', () => {
  const m = make();
  const o = m.checkout(request);
  m.balances.set('buyer', Number.MAX_SAFE_INTEGER);
  assert.throws(() => m.cancel({ buyer: 'buyer', orderId: o.orderId, now: 2000 }), /Refund overflow/);
  assert.equal(m.stock.get('a').quantity, 1);
  assert.equal(m.orders.get(o.orderId).status, 'created');
  assert.equal(m.orders.get(o.orderId).clearing, 'pending');
});
