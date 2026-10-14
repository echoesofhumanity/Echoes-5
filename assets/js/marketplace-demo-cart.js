/* Echoes Marketplace — isolated, calculation-only synthetic cart.
 * No checkout, payment, stock reservation, order creation or persistence.
 */
(function (root) {
  "use strict";

  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const MAX_LINES = 50;
  const MAX_QUANTITY = 99;

  function calculate(products, requestedLines) {
    if (!Array.isArray(products) || !Array.isArray(requestedLines) ||
        requestedLines.length === 0 || requestedLines.length > MAX_LINES) {
      throw new Error("Invalid synthetic cart");
    }
    const catalog = new Map();
    products.forEach(function (product) {
      if (!product || typeof product.product_id !== "string" ||
          !UUID.test(product.product_id) ||
          !Number.isSafeInteger(product.price_ec) || product.price_ec <= 0 ||
          product.status !== "concept" || product.published !== false ||
          product.checkout_enabled !== false) {
        throw new Error("Unsafe synthetic catalogue entry");
      }
      const id = product.product_id.toLowerCase();
      if (catalog.has(id)) throw new Error("Duplicate catalogue identity");
      catalog.set(id, product);
    });

    const used = new Set();
    let total = 0;
    const lines = requestedLines.map(function (line) {
      if (!line || typeof line.product_id !== "string" ||
          !UUID.test(line.product_id) ||
          !Number.isSafeInteger(line.quantity) ||
          line.quantity < 1 || line.quantity > MAX_QUANTITY) {
        throw new Error("Invalid synthetic cart line");
      }
      const id = line.product_id.toLowerCase();
      if (used.has(id)) throw new Error("Duplicate cart line");
      used.add(id);
      const product = catalog.get(id);
      if (!product) throw new Error("Unknown synthetic product");
      const subtotal = product.price_ec * line.quantity;
      if (!Number.isSafeInteger(subtotal) || !Number.isSafeInteger(total + subtotal)) {
        throw new Error("Synthetic EC total overflow");
      }
      total += subtotal;
      return Object.freeze({
        product_id: id,
        quantity: line.quantity,
        unit_price_ec: product.price_ec,
        subtotal_ec: subtotal
      });
    });
    return Object.freeze({
      mode: "synthetic_demo",
      currency: "EC",
      checkout_enabled: false,
      lines: Object.freeze(lines),
      total_ec: total
    });
  }

  root.EchoesMarketplaceDemoCart = Object.freeze({ calculate: calculate });
})(window);
