/* Marketplace V2 browser boundary — intentionally disabled until staging approval.
 * No Supabase import, production URL, credentials, RPC, fetch, or payments.
 * This module is a capability gate, not an enabled checkout integration.
 */
(function (root) {
  "use strict";
  const state = Object.freeze({
    version: "v2",
    mode: "synthetic_only",
    connection: "disabled",
    checkout_enabled: false,
    staging_approved: false,
    production_enabled: false
  });
  function status() { return state; }
  function disabled() {
    return Promise.reject(new Error("Marketplace V2 remote checkout is disabled pending authorized staging integration"));
  }
  root.EchoesMarketplaceV2Bridge = Object.freeze({
    status: status,
    checkout: disabled,
    cancel: disabled
  });
})(window);
