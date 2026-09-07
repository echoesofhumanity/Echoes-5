/* =========================================================
   ECHOES OF HUMANITY
   ADMIN SUPABASE CLIENT
   ========================================================= */

(() => {
  "use strict";

  if (
    !window.supabase ||
    !window.ECHOES_SUPABASE_URL ||
    !window.ECHOES_SUPABASE_PUBLISHABLE_KEY
  ) {
    console.error(
      "Supabase configuration is unavailable."
    );

    return;
  }

  const client =
    window.supabase.createClient(
      window.ECHOES_SUPABASE_URL,
      window.ECHOES_SUPABASE_PUBLISHABLE_KEY
    );

  window.ECHOES_SUPABASE = client;

})();
