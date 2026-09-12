(() => {
  "use strict";

  /*
   * ============================================================
   * ECHOES OF HUMANITY — ADMIN SUPABASE CONNECTION
   * ============================================================
   *
   * Responsibilities:
   * - Read the existing public Supabase configuration.
   * - Verify that the Supabase client library is available.
   * - Create exactly one browser Supabase client.
   * - Expose a small, stable API for Admin modules.
   *
   * This file does NOT:
   * - authenticate users
   * - check admin privileges
   * - query content
   * - upload files
   * - modify the database
   */

  const SUPABASE_URL = window.ECHOES_SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY =
    window.ECHOES_SUPABASE_PUBLISHABLE_KEY;

  let client = null;
  let ready = false;
  let initializationError = null;


  /* ============================================================
     CONFIGURATION VALIDATION
     ============================================================ */

  function validateConfiguration() {
    if (
      typeof SUPABASE_URL !== "string" ||
      SUPABASE_URL.trim() === ""
    ) {
      return "Supabase URL is unavailable.";
    }

    if (
      typeof SUPABASE_PUBLISHABLE_KEY !== "string" ||
      SUPABASE_PUBLISHABLE_KEY.trim() === ""
    ) {
      return "Supabase publishable key is unavailable.";
    }

    return null;
  }


  /* ============================================================
     CLIENT INITIALIZATION
     ============================================================ */

  function initialize() {
    const configurationError = validateConfiguration();

    if (configurationError) {
      initializationError = new Error(configurationError);

      console.error(
        "Echoes Admin: Supabase configuration error.",
        initializationError
      );

      return;
    }

    if (
      !window.supabase ||
      typeof window.supabase.createClient !== "function"
    ) {
      initializationError = new Error(
        "Supabase JavaScript client is unavailable."
      );

      console.error(
        "Echoes Admin: Supabase JavaScript client is unavailable."
      );

      return;
    }

    try {
      client = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
      );

      ready = true;
      initializationError = null;

      console.info(
        "Echoes Admin: Supabase client initialized."
      );
    } catch (error) {
      client = null;
      ready = false;
      initializationError = error;

      console.error(
        "Echoes Admin: Failed to initialize Supabase client.",
        error
      );
    }
  }


  /* ============================================================
     PUBLIC API
     ============================================================ */

  function getClient() {
    return client;
  }

  function isReady() {
    return ready === true && client !== null;
  }

  function getInitializationError() {
    return initializationError;
  }


  /* ============================================================
     INITIALIZE
     ============================================================ */

  initialize();


  /* ============================================================
     GLOBAL ADMIN SUPABASE API
     ============================================================ */

  window.ECHOES_SUPABASE = client;

  window.ECHOES_SUPABASE_READY = ready;

  window.ECHOES_SUPABASE_API = {
    getClient,
    isReady,
    getInitializationError
  };

})();
