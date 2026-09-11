/* =========================================================
   ECHOES OF HUMANITY — ADMIN V2
   SETTINGS MODULE
   PART 1 / 4
   ========================================================= */

(() => {
  "use strict";


  /* =======================================================
     DOM REFERENCES
     ======================================================= */

  const settingsRefreshButton =
    document.getElementById(
      "settingsRefreshButton"
    );

  const settingsSupabaseStatus =
    document.getElementById(
      "settingsSupabaseStatus"
    );

  const settingsAuthStatus =
    document.getElementById(
      "settingsAuthStatus"
    );

  const settingsStorageStatus =
    document.getElementById(
      "settingsStorageStatus"
    );

  const settingsDatabaseStatus =
    document.getElementById(
      "settingsDatabaseStatus"
    );

  const settingsAdminEmail =
    document.getElementById(
      "settingsAdminEmail"
    );

  const settingsAdminUserId =
    document.getElementById(
      "settingsAdminUserId"
    );

  const settingsTotalContent =
    document.getElementById(
      "settingsTotalContent"
    );

  const settingsPublishedContent =
    document.getElementById(
      "settingsPublishedContent"
    );

  const settingsSupportedTypes =
    document.getElementById(
      "settingsSupportedTypes"
    );

  const settingsSupportedLanguages =
    document.getElementById(
      "settingsSupportedLanguages"
    );

  const settingsMessage =
    document.getElementById(
      "settingsMessage"
    );


  /* =======================================================
     SUPABASE
     ======================================================= */

  const supabaseApi =
    window.ECHOES_SUPABASE_API;

  const supabaseClient =
    supabaseApi && supabaseApi.isReady()
      ? supabaseApi.getClient()
      : null;


  /* =======================================================
     CONSTANTS
     ======================================================= */

  const STORAGE_BUCKET =
    "echoes-media";

  const SUPPORTED_TYPES = [
    "Story",
    "Video",
    "Image",
    "Music",
    "Document"
  ];

  const SUPPORTED_LANGUAGES = [
    "English",
    "Turkish",
    "Croatian",
    "French",
    "Spanish"
  ];


  /* =======================================================
     STATE
     ======================================================= */

  let loading = false;
  let initialized = false;


  /* =======================================================
     MESSAGE
     ======================================================= */

  function setMessage(
    message,
    type = ""
  ) {
    if (!settingsMessage) {
      return;
    }

    settingsMessage.textContent =
      message;

    settingsMessage.classList.remove(
      "is-success",
      "is-warning",
      "is-error"
    );

    if (type) {
      settingsMessage.classList.add(
        `is-${type}`
      );
    }
  }


  /* =======================================================
     STATUS VALUE
     ======================================================= */

  function setStatusValue(
    element,
    value,
    type = ""
  ) {
    if (!element) {
      return;
    }

    element.textContent =
      value;

    element.classList.remove(
      "is-success",
      "is-warning",
      "is-error"
    );

    if (type) {
      element.classList.add(
        `is-${type}`
      );
    }
  }


  /* =======================================================
     CURRENT ADMIN
     ======================================================= */

  function getCurrentUser() {
    const auth =
      window.ECHOES_ADMIN_AUTH;

    if (!auth) {
      return null;
    }

    return auth.getCurrentUser();
 }

   /* =======================================================
     DATABASE STATUS
     ======================================================= */

  async function checkDatabase() {
    if (!supabaseClient) {
      return {
        ok: false,
        count: null
      };
    }

    const {
      count,
      error
    } = await supabaseClient
      .from("content_items")
      .select("id", {
        count: "exact",
        head: true
      });

    if (error) {
      console.error(
        "Echoes Admin V2: Database status check failed.",
        error
      );

      return {
        ok: false,
        count: null
      };
    }

    return {
      ok: true,
      count:
        Number.isFinite(count)
          ? count
          : 0
    };
  }


  /* =======================================================
     PUBLISHED CONTENT COUNT
     ======================================================= */

  async function getPublishedCount() {
    if (!supabaseClient) {
      return null;
    }

    const {
      count,
      error
    } = await supabaseClient
      .from("content_items")
      .select("id", {
        count: "exact",
        head: true
      })
      .eq(
        "status",
        "published"
      );

    if (error) {
      console.error(
        "Echoes Admin V2: Published count failed.",
        error
      );

      return null;
    }

    return Number.isFinite(count)
      ? count
      : 0;
  }


  /* =======================================================
     STORAGE STATUS
     ======================================================= */

  async function checkStorage() {
    if (!supabaseClient) {
      return false;
    }

    const {
      error
    } = await supabaseClient
      .storage
      .from(STORAGE_BUCKET)
      .list("", {
        limit: 1
      });

    if (error) {
      console.error(
        "Echoes Admin V2: Storage status check failed.",
        error
      );

      return false;
    }

    return true;
  }


  /* =======================================================
     AUTHENTICATION STATUS
     ======================================================= */

  async function checkAuthentication() {
    if (!supabaseClient) {
      return {
        ok: false,
        user: null
      };
    }

    const {
      data,
      error
    } = await supabaseClient.auth.getUser();

    if (error || !data || !data.user) {
      return {
        ok: false,
        user: null
      };
    }

    const user =
      data.user;

    const auth =
      window.ECHOES_ADMIN_AUTH;

    if (!auth) {
      return {
        ok: false,
        user
      };
    }

    const verification =
      await auth.verifyAdmin(
        user
      );

    return {
      ok:
        verification.isAdmin === true,
      user
    };
  }


  /* =======================================================
     ACCOUNT INFORMATION
     ======================================================= */

  function renderAccount(user) {
    if (settingsAdminEmail) {
      settingsAdminEmail.textContent =
        user && user.email
          ? user.email
          : "—";
    }

    if (settingsAdminUserId) {
      settingsAdminUserId.textContent =
        user && user.id
          ? user.id
          : "—";
    }
  }


  /* =======================================================
     STATIC SYSTEM INFORMATION
     ======================================================= */

  function renderSupportedConfiguration() {
    if (settingsSupportedTypes) {
      settingsSupportedTypes.textContent =
        SUPPORTED_TYPES.join(
          " · "
        );
    }

    if (settingsSupportedLanguages) {
      settingsSupportedLanguages.textContent =
        SUPPORTED_LANGUAGES.join(
          " · "
        );
    }
            }

   /* =======================================================
     LOAD SETTINGS
     ======================================================= */

  async function refreshSettings() {
    if (loading) {
      return;
    }

    loading = true;

    if (settingsRefreshButton) {
      settingsRefreshButton.disabled =
        true;

      settingsRefreshButton.textContent =
        "Refreshing…";
    }

    setMessage(
      "Checking system status…",
      "warning"
    );


    /* ---------------------------------------------------
       Supabase client
       --------------------------------------------------- */

    if (supabaseClient) {
      setStatusValue(
        settingsSupabaseStatus,
        "Available",
        "success"
      );
    } else {
      setStatusValue(
        settingsSupabaseStatus,
        "Unavailable",
        "error"
      );
    }


    try {

      /* -------------------------------------------------
         Authentication
         ------------------------------------------------- */

      const authentication =
        await checkAuthentication();

      renderAccount(
        authentication.user
      );

      if (authentication.ok) {
        setStatusValue(
          settingsAuthStatus,
          "Authenticated",
          "success"
        );
      } else {
        setStatusValue(
          settingsAuthStatus,
          "Not authenticated",
          "error"
        );
      }


      /* -------------------------------------------------
         Database
         ------------------------------------------------- */

      const database =
        await checkDatabase();

      if (database.ok) {
        setStatusValue(
          settingsDatabaseStatus,
          "Connected",
          "success"
        );

        if (settingsTotalContent) {
          settingsTotalContent.textContent =
            String(
              database.count
            );
        }
      } else {
        setStatusValue(
          settingsDatabaseStatus,
          "Unavailable",
          "error"
        );

        if (settingsTotalContent) {
          settingsTotalContent.textContent =
            "—";
        }
      }


      /* -------------------------------------------------
         Published count
         ------------------------------------------------- */

      const publishedCount =
        await getPublishedCount();

      if (
        settingsPublishedContent
      ) {
        settingsPublishedContent.textContent =
          publishedCount === null
            ? "—"
            : String(
                publishedCount
              );
      }


      /* -------------------------------------------------
         Storage
         ------------------------------------------------- */

      const storageAvailable =
        await checkStorage();

      if (storageAvailable) {
        setStatusValue(
          settingsStorageStatus,
          "Connected",
          "success"
        );
      } else {
        setStatusValue(
          settingsStorageStatus,
          "Unavailable",
          "error"
        );
      }


      /* -------------------------------------------------
         Static configuration
         ------------------------------------------------- */

      renderSupportedConfiguration();


      /* -------------------------------------------------
         Final state
         ------------------------------------------------- */

      if (
        authentication.ok &&
        database.ok &&
        storageAvailable
      ) {
        setMessage(
          "System status is healthy.",
          "success"
        );
      } else {
        setMessage(
          "One or more system checks require attention.",
          "warning"
        );
      }


      window.dispatchEvent(
        new CustomEvent(
          "echoes:settings-updated",
          {
            detail: {
              authentication:
                authentication.ok,

              database:
                database.ok,

              storage:
                storageAvailable,

              totalContent:
                database.count,

              publishedContent:
                publishedCount
            }
          }
        )
      );

    } catch (error) {

      console.error(
        "Echoes Admin V2: Settings refresh failed.",
        error
      );

      setMessage(
        "Unable to complete system checks.",
        "error"
      );

      window.dispatchEvent(
        new CustomEvent(
          "echoes:settings-error",
          {
            detail: {
              error
            }
          }
        )
      );

    } finally {
      loading = false;

      if (settingsRefreshButton) {
        settingsRefreshButton.disabled =
          false;

        settingsRefreshButton.textContent =
          "Refresh";
      }
    }
  }


  /* =======================================================
     APPLICATION EVENTS
     ======================================================= */

  function registerApplicationEvents() {

    window.addEventListener(
      "echoes:authenticated",
      () => {
        refreshSettings();
      }
    );


    window.addEventListener(
      "echoes:signed-out",
      () => {
        renderAccount(null);

        if (settingsTotalContent) {
          settingsTotalContent.textContent =
            "—";
        }

        if (settingsPublishedContent) {
          settingsPublishedContent.textContent =
            "—";
        }

        setStatusValue(
          settingsAuthStatus,
          "Not authenticated",
          "warning"
        );

        setMessage("");
      }
    );


    window.addEventListener(
      "echoes:content-saved",
      () => {
        refreshSettings();
      }
    );


    window.addEventListener(
      "echoes:content-deleted",
      () => {
        refreshSettings();
      }
    );
          }

   /* =======================================================
     DOM EVENTS
     ======================================================= */

  function registerDomEvents() {
    if (settingsRefreshButton) {
      settingsRefreshButton.addEventListener(
        "click",
        () => {
          refreshSettings();
        }
      );
    }
  }


  /* =======================================================
     INITIALIZATION
     ======================================================= */

  function initializeSettings() {
    if (initialized) {
      return;
    }

    initialized = true;

    renderSupportedConfiguration();

    registerDomEvents();
    registerApplicationEvents();
  }


  /* =======================================================
     PUBLIC API
     ======================================================= */

  window.ECHOES_ADMIN_SETTINGS = {

    async refresh() {
      return refreshSettings();
    },

    isLoading() {
      return loading;
    },

    getSupportedTypes() {
      return [
        ...SUPPORTED_TYPES
      ];
    },

    getSupportedLanguages() {
      return [
        ...SUPPORTED_LANGUAGES
      ];
    }
  };


  /* =======================================================
     STARTUP
     ======================================================= */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initializeSettings,
      {
        once: true
      }
    );
  } else {
    initializeSettings();
  }

})();
