/* Echoes of Humanity — read-only concept catalog adapter.
 * Not wired to the live page. Never grants checkout or creator verification.
 */
(function (root) {
  "use strict";

  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  function validateCatalog(payload) {
    if (!payload || payload.schema_version !== 1 || !Array.isArray(payload.products)) {
      throw new Error("Unsupported merchandise catalog");
    }
    const seen = new Set();
    return payload.products.map(function (item) {
      if (!item || !SLUG.test(item.concept_id || "") ||
          !UUID.test(item.database_product_id || "") ||
          seen.has(item.concept_id) ||
          item.status !== "concept" || item.checkout_enabled !== false ||
          item.creator_id !== null) {
        throw new Error("Invalid or unsafe merchandise concept entry");
      }
      seen.add(item.concept_id);
      return Object.freeze({
        concept_id: item.concept_id,
        database_product_id: item.database_product_id,
        status: "concept",
        checkout_enabled: false,
        creator_id: null
      });
    });
  }

  async function loadCatalog(url) {
    const response = await fetch(url || "assets/data/merchandise-catalog.json", {
      cache: "no-store",
      credentials: "same-origin"
    });
    if (!response.ok) throw new Error("Merchandise catalog unavailable");
    const entries = validateCatalog(await response.json());
    return Object.freeze(entries);
  }

  root.EchoesMerchandiseCatalog = Object.freeze({
    load: loadCatalog,
    validate: validateCatalog
  });
})(window);
