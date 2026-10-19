/* Echoes Marketplace — synthetic product-to-cart handoff.
 * Demo only: stores selected concept IDs and quantities, never payment/customer data.
 * Does not authorize purchase or alter the live merchandise catalogue.
 */
(function (root) {
  "use strict";
  const KEY = "echoes_marketplace_synthetic_cart_v1";
  const MAX_AGE_MS = 60 * 60 * 1000;
  const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const MAX_LINES = 50;
  function validate(lines) {
    if (!Array.isArray(lines) || lines.length > MAX_LINES) throw new Error("Invalid demo selection");
    const seen = new Set();
    return lines.map(function (line) {
      if (!line || typeof line.concept_id !== "string" || !SLUG.test(line.concept_id) ||
          !Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > 99 ||
          seen.has(line.concept_id)) throw new Error("Invalid demo selection line");
      seen.add(line.concept_id);
      return Object.freeze({ concept_id: line.concept_id, quantity: line.quantity });
    });
  }
  function read() {
    try {
      const raw = root.sessionStorage.getItem(KEY);
      if (!raw) return Object.freeze([]);
      const data = JSON.parse(raw);
      if (!data || data.version !== 1 || !Number.isSafeInteger(data.saved_at) ||
          data.saved_at > Date.now() || Date.now() - data.saved_at > MAX_AGE_MS) {
        root.sessionStorage.removeItem(KEY);
        return Object.freeze([]);
      }
      return Object.freeze(validate(data.lines));
    } catch (error) {
      try { root.sessionStorage.removeItem(KEY); } catch (_) {}
      return Object.freeze([]);
    }
  }
  function write(lines) {
    const clean = validate(lines);
    root.sessionStorage.setItem(KEY, JSON.stringify({
      version: 1, saved_at: Date.now(), lines: clean
    }));
    return Object.freeze(clean);
  }
  function add(conceptId, quantity) {
    if (typeof conceptId !== "string" || !SLUG.test(conceptId) ||
        !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new Error("Invalid demo product selection");
    }
    const next = read().map(function (line) {
      return { concept_id: line.concept_id, quantity: line.quantity };
    });
    const found = next.find(function (line) { return line.concept_id === conceptId; });
    if (found) {
      if (found.quantity + quantity > 99) throw new Error("Demo quantity limit exceeded");
      found.quantity += quantity;
    } else {
      next.push({ concept_id: conceptId, quantity: quantity });
    }
    return write(next);
  }
  function setQuantity(conceptId, quantity) {
    if (typeof conceptId !== "string" || !SLUG.test(conceptId) ||
        !Number.isSafeInteger(quantity) || quantity < 0 || quantity > 99) {
      throw new Error("Invalid demo quantity update");
    }
    const next = read().map(function (line) {
      return { concept_id: line.concept_id, quantity: line.quantity };
    }).filter(function (line) { return line.concept_id !== conceptId; });
    if (quantity > 0) next.push({ concept_id: conceptId, quantity: quantity });
    return write(next);
  }
  function clear() {
    root.sessionStorage.removeItem(KEY);
  }
  root.EchoesMarketplaceSelection = Object.freeze({
    read: read, add: add, setQuantity: setQuantity, clear: clear
  });
})(window);
