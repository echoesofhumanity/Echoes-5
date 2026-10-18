// Synthetic-only in-memory Marketplace V2 checkout/cancel reference model.
// NOT a database RPC, migration, real wallet, settlement, or production service.
// Run: node --test tests/marketplace-v2-unsplit-reference.test.mjs
export class SyntheticMarketplace {
  constructor({ stock, balances, ttlMs }) {
    if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0) throw Error('Approved synthetic TTL required');
    this.ttlMs = ttlMs;
    this.stock = new Map(Object.entries(stock).map(([id, item]) => [id, { ...item }]));
    this.balances = new Map(Object.entries(balances));
    this.orders = new Map();
    this.keys = new Map();
  }
  checkout({ buyer, key, lines, now }) {
    if (!buyer || !key || !Number.isSafeInteger(now)) throw Error('Invalid request');
    if (!Array.isArray(lines) || lines.length < 1 || lines.length > 50) throw Error('Invalid cart');
    const normalized = lines.map(({ product, quantity }) => {
      if (typeof product !== 'string' || !product || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw Error('Invalid line');
      return { product, quantity };
    }).sort((a,b)=>a.product.localeCompare(b.product));
    if (new Set(normalized.map(x=>x.product)).size !== normalized.length) throw Error('Duplicate product');
    const digest = JSON.stringify(normalized);
    const identity = JSON.stringify([buyer,key]);
    const prior = this.keys.get(identity);
    if (prior) {
      if (prior.digest !== digest) throw Error('Idempotency conflict');
      const saved = this.orders.get(prior.orderId);
      return { ...saved, lines: saved.lines.map(line => ({ ...line })), replayed: true };
    }
    let total = 0;
    for (const line of normalized) {
      const p = this.stock.get(line.product);
      if (!p || p.testOnly !== true || p.active !== true || !Number.isSafeInteger(p.price) || p.price <= 0 || !Number.isSafeInteger(p.quantity) || p.quantity < 0 || p.quantity < line.quantity) throw Error('Product unavailable');
      const subtotal = p.price * line.quantity;
      if (!Number.isSafeInteger(subtotal) || !Number.isSafeInteger(total + subtotal)) throw Error('Amount overflow');
      total += subtotal;
    }
    const buyerBalance = this.balances.get(buyer);
    if (!Number.isSafeInteger(buyerBalance) || buyerBalance < 0) throw Error('Invalid EC balance');
    if (buyerBalance < total) throw Error('Insufficient EC');
    if (!Number.isSafeInteger(now + this.ttlMs)) throw Error('Expiry overflow');
    // In-memory reference only: validate before mutations; database must supply ACID and locks.
    const orderId = identity;
    for (const line of normalized) this.stock.get(line.product).quantity -= line.quantity;
    this.balances.set(buyer, this.balances.get(buyer) - total);
    const order = { orderId, buyer, lines: normalized, total, status: 'created', expiresAt: now + this.ttlMs, reservation: 'reserved', clearing: 'pending', debit: -total, reversal: 0, replayed: false };
    this.orders.set(orderId, order);
    this.keys.set(identity, { digest, orderId });
    return { ...order, lines: order.lines.map(line => ({ ...line })) };
  }
  cancel({ buyer, orderId, now }) {
    const order = this.orders.get(orderId);
    if (!order || order.buyer !== buyer) throw Error('Order not found');
    if (order.status === 'cancelled') return { ...order, lines: order.lines.map(line => ({ ...line })), replayed: true };
    if (!Number.isSafeInteger(now) || now >= order.expiresAt) throw Error('Expired reservation: manual resolution required');
    if (order.reservation !== 'reserved' || order.clearing !== 'pending') throw Error('Order not cancellable');
    for (const line of order.lines) {
      const p = this.stock.get(line.product);
      if (!p || !Number.isSafeInteger(p.quantity + line.quantity)) throw Error('Restock failed');
    }
    const balance = this.balances.get(buyer);
    if (!Number.isSafeInteger(balance) || !Number.isSafeInteger(balance + order.total)) throw Error('Refund overflow');
    for (const line of order.lines) this.stock.get(line.product).quantity += line.quantity;
    this.balances.set(buyer, this.balances.get(buyer) + order.total);
    Object.assign(order, { status: 'cancelled', reservation: 'released', clearing: 'voided', reversal: order.total });
    return { ...order, lines: order.lines.map(line => ({ ...line })) };
  }
}
