/* Echoes Marketplace — isolated synthetic order state machine.
 * No persistence, payment, delivery, stock movement or real order authority.
 */
(function (root) {
  "use strict";

  const ID = /^DEMO-[A-Z0-9]{6,32}$/;
  const TRANSITIONS = Object.freeze({
    created: Object.freeze(["confirmed", "cancelled"]),
    confirmed: Object.freeze(["fulfilled", "cancelled"]),
    fulfilled: Object.freeze([]),
    cancelled: Object.freeze([])
  });

  function validCart(cart) {
    if (!cart || cart.mode !== "synthetic_demo" ||
        cart.currency !== "EC" || cart.checkout_enabled !== false ||
        !Number.isSafeInteger(cart.total_ec) || cart.total_ec <= 0 ||
        !Array.isArray(cart.lines) || cart.lines.length === 0 ||
        cart.lines.length > 50) return false;
    let total = 0;
    const ids = new Set();
    for (const line of cart.lines) {
      if (!line || typeof line.product_id !== "string" ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(line.product_id) ||
          ids.has(line.product_id.toLowerCase()) ||
          !Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > 99 ||
          !Number.isSafeInteger(line.unit_price_ec) || line.unit_price_ec <= 0 ||
          !Number.isSafeInteger(line.subtotal_ec) ||
          line.unit_price_ec * line.quantity !== line.subtotal_ec ||
          !Number.isSafeInteger(total + line.subtotal_ec)) return false;
      ids.add(line.product_id.toLowerCase());
      total += line.subtotal_ec;
    }
    return total === cart.total_ec;
  }

  function create(cart, demoId) {
    if (!validCart(cart) || typeof demoId !== "string" || !ID.test(demoId)) {
      throw new Error("Invalid synthetic order input");
    }
    const lines = Object.freeze(cart.lines.map(function (line) {
      return Object.freeze({
        product_id: line.product_id.toLowerCase(),
        quantity: line.quantity,
        unit_price_ec: line.unit_price_ec,
        subtotal_ec: line.subtotal_ec
      });
    }));
    return Object.freeze({
      order_id: demoId,
      mode: "synthetic_demo",
      currency: "EC",
      total_ec: cart.total_ec,
      lines: lines,
      status: "created",
      checkout_enabled: false,
      payment_status: "not_applicable",
      history: Object.freeze([Object.freeze({ from: null, to: "created" })])
    });
  }

  function transition(order, nextStatus) {
    if (!order || order.mode !== "synthetic_demo" ||
        order.checkout_enabled !== false || order.payment_status !== "not_applicable" ||
        !ID.test(order.order_id || "") ||
        !Object.prototype.hasOwnProperty.call(TRANSITIONS, order.status) ||
        !TRANSITIONS[order.status].includes(nextStatus) ||
        !Array.isArray(order.history) || order.history.length < 1 ||
        !order.history[order.history.length - 1] ||
        order.history[order.history.length - 1].to !== order.status ||
        !validCart({
          mode: order.mode, currency: order.currency,
          checkout_enabled: order.checkout_enabled,
          total_ec: order.total_ec, lines: order.lines
        })) {
      throw new Error("Forbidden synthetic order transition");
    }
    return Object.freeze({
      order_id: order.order_id,
      mode: "synthetic_demo",
      currency: "EC",
      total_ec: order.total_ec,
      lines: Object.freeze(order.lines.map(function (line) {
        return Object.freeze({
          product_id: line.product_id, quantity: line.quantity,
          unit_price_ec: line.unit_price_ec, subtotal_ec: line.subtotal_ec
        });
      })),
      status: nextStatus,
      checkout_enabled: false,
      payment_status: "not_applicable",
      history: Object.freeze(order.history.concat([
        Object.freeze({ from: order.status, to: nextStatus })
      ]))
    });
  }

  root.EchoesMarketplaceDemoOrder = Object.freeze({
    create: create,
    transition: transition
  });
})(window);
