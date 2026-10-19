/* Echoes Marketplace — isolated synthetic catalogue validator.
 * Read-only. No checkout, publishing, stock reservation or payment authority.
 */
(function (root) {
  "use strict";

  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  function validate(payload) {
    if (!payload || payload.schema_version !== 1 ||
        payload.mode !== "synthetic_demo" || payload.currency !== "EC" ||
        payload.checkout_enabled !== false || !Array.isArray(payload.products)) {
      throw new Error("Invalid synthetic catalogue envelope");
    }

    const ids = new Set();
    const slugs = new Set();
    const products = payload.products.map(function (item) {
      if (!item || typeof item !== "object" ||
          typeof item.product_id !== "string" || !UUID.test(item.product_id) ||
          typeof item.concept_id !== "string" || !SLUG.test(item.concept_id) ||
          typeof item.title !== "string" || !item.title.trim() ||
          !Number.isSafeInteger(item.price_ec) || item.price_ec <= 0 ||
          item.creator_id !== null || item.creator_verified !== false ||
          item.stock_quantity !== null || item.status !== "concept" ||
          item.published !== false || item.checkout_enabled !== false) {
        throw new Error("Invalid or unsafe synthetic product");
      }
      const id = item.product_id.toLowerCase();
      if (ids.has(id) || slugs.has(item.concept_id)) {
        throw new Error("Duplicate synthetic product identity");
      }
      ids.add(id);
      slugs.add(item.concept_id);
      return Object.freeze({
        product_id: id,
        concept_id: item.concept_id,
        title: item.title.trim(),
        price_ec: item.price_ec,
        status: "concept",
        published: false,
        checkout_enabled: false
      });
    });
    return Object.freeze(products);
  }

  async function load(url) {
    const response = await fetch(url || "assets/data/marketplace-catalog.json", {
      cache: "no-store",
      credentials: "same-origin"
    });
    if (!response.ok) throw new Error("Synthetic catalogue unavailable");
    return validate(await response.json());
  }

  root.EchoesMarketplaceCatalog = Object.freeze({
    validate: validate,
    load: load
  });
})(window);
