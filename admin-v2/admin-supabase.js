/* =========================================================
   ECHOES OF HUMANITY — ADMIN V2
   SUPABASE CONNECTION
   PART 1 / 4
   ========================================================= */

(() => {
  "use strict";

  const SUPABASE_URL = window.ECHOES_SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY =
    window.ECHOES_SUPABASE_PUBLISHABLE_KEY;

   /* =======================================================
     CONFIGURATION VALIDATION
     ======================================================= */

  if (
    !window.supabase ||
    !SUPABASE_URL ||
    !SUPABASE_PUBLISHABLE_KEY
  ) {
    console.error(
      "Echoes Admin V2: Supabase configuration is unavailable."
    );

    window.ECHOES_SUPABASE = null;
    window.ECHOES_SUPABASE_READY = false;

    return;
  }


  /* =======================================================
     SUPABASE CLIENT
     ======================================================= */

  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );

   /* =======================================================
     PUBLIC CLIENT STATE
     ======================================================= */

  window.ECHOES_SUPABASE = client;
  window.ECHOES_SUPABASE_READY = true;


  /* =======================================================
     CONNECTION HELPERS
     ======================================================= */

  function getClient() {
    return window.ECHOES_SUPABASE;
  }

  function isReady() {
    return (
      window.ECHOES_SUPABASE_READY === true &&
      !!window.ECHOES_SUPABASE
    );
  }

   /* =======================================================
     PUBLIC API
     ======================================================= */

  window.ECHOES_SUPABASE_API = {
    getClient,
    isReady
  };


  /* =======================================================
     INITIAL STATE
     ======================================================= */

  console.info(
    "Echoes Admin V2: Supabase client initialized."
  );

})();
