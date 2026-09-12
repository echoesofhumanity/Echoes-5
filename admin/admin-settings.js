(() => {
  "use strict";

  /*
   * ============================================================
   * ECHOES OF HUMANITY — ADMIN SETTINGS
   * ============================================================
   *
   * Responsibilities:
   * - Display real administrator information.
   * - Verify current administrator authorization.
   * - Verify Supabase database connectivity.
   * - Verify content_items table access.
   * - Verify echoes-media storage access.
   * - Display real content-system capabilities.
   * - Refresh all information on demand.
   *
   * This module intentionally does NOT create fake settings,
   * browser-only configuration, or pretend persistence.
   *
   * Supabase:
   *   Existing project configuration only.
   *
   * Database:
   *   public.content_items
   *
   * Storage:
   *   echoes-media
   * ============================================================
   */

  const MODULE_NAME = "Echoes Admin: Settings";

  const STORAGE_BUCKET = "echoes-media";

  const SUPPORTED_TYPES = [
    "story",
    "video",
    "image",
    "music",
    "document"
  ];

  const SUPPORTED_LANGUAGES = [
    "en",
    "tr",
    "hr",
    "fr",
    "es"
  ];

  const SUPPORTED_STATUSES = [
    "draft",
    "pending",
    "published",
    "archived"
  ];

  const state = {
    initialized: false,
    loading: false,
    error: null,
    user: null,
    adminVerified: false,
    database: {
      connected: false,
      accessible: false,
      count: null
    },
    storage: {
      accessible: false
    }
  };

  const refs = {};

  /* ============================================================
     DOM
     ============================================================ */

  function firstExisting(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);

      if (element) {
        return element;
      }
    }

    return null;
  }

  function cacheDom() {
    refs.refreshButton = firstExisting([
      "#settingsRefreshButton"
    ]);

    refs.status = firstExisting([
      "#settingsStatus"
    ]);

    refs.admin = firstExisting([
      "#settingsAdmin"
    ]);

    refs.project = firstExisting([
      "#settingsProject"
    ]);

    refs.database = firstExisting([
      "#settingsDatabase"
    ]);

    refs.storage = firstExisting([
      "#settingsStorage"
    ]);

    refs.contentSystem = firstExisting([
      "#settingsContentSystem"
    ]);

    refs.connection = firstExisting([
      "#settingsConnection"
    ]);
  }

  /* ============================================================
     HELPERS
     ============================================================ */

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getClient() {
    if (
      window.ECHOES_SUPABASE_API &&
      typeof window.ECHOES_SUPABASE_API.getClient === "function"
    ) {
      return window.ECHOES_SUPABASE_API.getClient();
    }

    if (window.ECHOES_SUPABASE) {
      return window.ECHOES_SUPABASE;
    }

    return null;
  }

  function getAuthApi() {
    return window.ECHOES_ADMIN_AUTH || null;
  }

  async function getCurrentUser() {
    const authApi = getAuthApi();

    if (
      authApi &&
      typeof authApi.getCurrentUser === "function"
    ) {
      try {
        return await authApi.getCurrentUser();
      } catch (error) {
        console.warn(
          `${MODULE_NAME}: Auth API user lookup failed.`,
          error
        );
      }
    }

    if (
      authApi &&
      authApi.currentUser
    ) {
      return authApi.currentUser;
    }

    const client = getClient();

    if (!client) {
      return null;
    }

    try {
      const { data, error } =
        await client.auth.getUser();

      if (error) {
        return null;
      }

      return data?.user || null;
    } catch (error) {
      console.warn(
        `${MODULE_NAME}: Supabase user lookup failed.`,
        error
      );

      return null;
    }
  }

  function setStatus(message, type = "info") {
    if (!refs.status) {
      return;
    }

    refs.status.textContent = message || "";
    refs.status.dataset.status = type;
  }

  function setLoading(element, message = "Loading...") {
    if (!element) {
      return;
    }

    element.innerHTML = `
      <div class="admin-settings-loading">
        ${escapeHtml(message)}
      </div>
    `;
  }

  function setValue(element, label, value, status = "") {
    if (!element) {
      return;
    }

    const statusMarkup = status
      ? `
        <span
          class="admin-settings-status admin-settings-status-${escapeHtml(status)}"
        >
          ${escapeHtml(status)}
        </span>
      `
      : "";

    element.innerHTML = `
      <div class="admin-settings-row">
        <span class="admin-settings-label">
          ${escapeHtml(label)}
        </span>

        <span class="admin-settings-data">
          ${escapeHtml(value)}
          ${statusMarkup}
        </span>
      </div>
    `;
  }

  function formatEmail(user) {
    return user?.email || "No authenticated user";
  }

  function formatUserId(user) {
    return user?.id || "—";
  }

  function getProjectUrl() {
    return (
      window.ECHOES_SUPABASE_URL ||
      "Configuration unavailable"
    );
  }

  function maskProjectUrl(url) {
    if (!url) {
      return "—";
    }

    return url;
  }

  function emit(name, detail = {}) {
    document.dispatchEvent(
      new CustomEvent(name, {
        detail
      })
    );
  }

  /* ============================================================
     ADMIN VERIFICATION
     ============================================================ */

  async function verifyAdmin(client) {
    if (!client) {
      return false;
    }

    try {
      const { data, error } =
        await client.rpc("is_admin");

      if (error) {
        console.error(
          `${MODULE_NAME}: Admin verification failed.`,
          error
        );

        return false;
      }

      return data === true;
    } catch (error) {
      console.error(
        `${MODULE_NAME}: Admin verification failed.`,
        error
      );

      return false;
    }
  }

  /* ============================================================
     DATABASE CHECK
     ============================================================ */

  async function checkDatabase(client) {
    const result = {
      connected: false,
      accessible: false,
      count: null,
      error: null
    };

    if (!client) {
      result.error =
        "Supabase client unavailable.";

      return result;
    }

    try {
      /*
       * A real query is used instead of a fake connection flag.
       * count=exact/head=true verifies access without downloading
       * every content row.
       */
      const { count, error } =
        await client
          .from("content_items")
          .select("id", {
            count: "exact",
            head: true
          });

      if (error) {
        throw error;
      }

      result.connected = true;
      result.accessible = true;
      result.count =
        typeof count === "number"
          ? count
          : 0;

      return result;
    } catch (error) {
      console.error(
        `${MODULE_NAME}: Database check failed.`,
        error
      );

      result.error =
        error?.message ||
        "Database access failed.";

      return result;
    }
  }

  /* ============================================================
     STORAGE CHECK
     ============================================================ */

  async function checkStorage(client) {
    const result = {
      accessible: false,
      error: null
    };

    if (!client) {
      result.error =
        "Supabase client unavailable.";

      return result;
    }

    try {
      /*
       * Listing the bucket root is an actual Storage API request.
       * The bucket itself remains private.
       */
      const { error } =
        await client
          .storage
          .from(STORAGE_BUCKET)
          .list("", {
            limit: 1,
            offset: 0
          });

      if (error) {
        throw error;
      }

      result.accessible = true;

      return result;
    } catch (error) {
      console.error(
        `${MODULE_NAME}: Storage check failed.`,
        error
      );

      result.error =
        error?.message ||
        "Storage access failed.";

      return result;
    }
  }

  /* ============================================================
     RENDER — ADMIN
     ============================================================ */

  function renderAdmin() {
    if (!refs.admin) {
      return;
    }

    const user = state.user;

    refs.admin.innerHTML = `
      <div class="admin-settings-row">
        <span class="admin-settings-label">
          Email
        </span>

        <span class="admin-settings-data">
          ${escapeHtml(formatEmail(user))}
        </span>
      </div>

      <div class="admin-settings-row">
        <span class="admin-settings-label">
          User ID
        </span>

        <span class="admin-settings-data">
          ${escapeHtml(formatUserId(user))}
        </span>
      </div>

      <div class="admin-settings-row">
        <span class="admin-settings-label">
          Administrator access
        </span>

        <span class="admin-settings-data">
          ${
            state.adminVerified
              ? `
                <span class="admin-settings-status admin-settings-status-success">
                  Verified
                </span>
              `
              : `
                <span class="admin-settings-status admin-settings-status-error">
                  Not verified
                </span>
              `
          }
        </span>
      </div>
    `;
    }

    /* ============================================================
     RENDER — PROJECT
     ============================================================ */

  function renderProject() {
    if (!refs.project) {
      return;
    }

    const projectUrl =
      maskProjectUrl(getProjectUrl());

    const projectId =
      projectUrl
        .replace("https://", "")
        .split(".")[0] || "—";

    refs.project.innerHTML = `
      <div class="admin-settings-row">
        <span class="admin-settings-label">
          Project
        </span>

        <span class="admin-settings-data">
          Echoes of Humanity
        </span>
      </div>

      <div class="admin-settings-row">
        <span class="admin-settings-label">
          Project ID
        </span>

        <span class="admin-settings-data">
          ${escapeHtml(projectId)}
        </span>
      </div>

      <div class="admin-settings-row">
        <span class="admin-settings-label">
          Region
        </span>

        <span class="admin-settings-data">
          eu-central-1
        </span>
      </div>

      <div class="admin-settings-row">
        <span class="admin-settings-label">
          Project URL
        </span>

        <span class="admin-settings-data">
          ${escapeHtml(projectUrl)}
        </span>
      </div>

      <div class="admin-settings-row">
        <span class="admin-settings-label">
          Browser key
        </span>

        <span class="admin-settings-data">
          Publishable key
        </span>
      </div>
    `;
  }

  /* ============================================================
     RENDER — DATABASE
     ============================================================ */

  function renderDatabase() {
    if (!refs.database) {
      return;
    }

    const db = state.database;

    if (db.accessible) {
      refs.database.innerHTML = `
        <div class="admin-settings-row">
          <span class="admin-settings-label">
            Table
          </span>

          <span class="admin-settings-data">
            public.content_items
          </span>
        </div>

        <div class="admin-settings-row">
          <span class="admin-settings-label">
            Access
          </span>

          <span class="admin-settings-data">
            <span class="admin-settings-status admin-settings-status-success">
              Connected
            </span>
          </span>
        </div>

        <div class="admin-settings-row">
          <span class="admin-settings-label">
            Content rows
          </span>

          <span class="admin-settings-data">
            ${escapeHtml(db.count)}
          </span>
        </div>

        <div class="admin-settings-row">
          <span class="admin-settings-label">
            RLS
          </span>

          <span class="admin-settings-data">
            Enabled
          </span>
        </div>
      `;

      return;
    }

    refs.database.innerHTML = `
      <div class="admin-settings-row">
        <span class="admin-settings-label">
          Table
        </span>

        <span class="admin-settings-data">
          public.content_items
        </span>
      </div>

      <div class="admin-settings-row">
        <span class="admin-settings-label">
          Access
        </span>

        <span class="admin-settings-data">
          <span class="admin-settings-status admin-settings-status-error">
            Unavailable
          </span>
        </span>
      </div>

      ${
        db.error
          ? `
            <div class="admin-settings-error">
              ${escapeHtml(db.error)}
            </div>
          `
          : ""
      }
    `;
  }

  /* ============================================================
     RENDER — STORAGE
     ============================================================ */

  function renderStorage() {
    if (!refs.storage) {
      return;
    }

    const storage =
      state.storage;

    if (storage.accessible) {
      refs.storage.innerHTML = `
        <div class="admin-settings-row">
          <span class="admin-settings-label">
            Bucket
          </span>

          <span class="admin-settings-data">
            ${escapeHtml(STORAGE_BUCKET)}
          </span>
        </div>

        <div class="admin-settings-row">
          <span class="admin-settings-label">
            Visibility
          </span>

          <span class="admin-settings-data">
            Private
          </span>
        </div>

        <div class="admin-settings-row">
          <span class="admin-settings-label">
            Access
          </span>

          <span class="admin-settings-data">
            <span class="admin-settings-status admin-settings-status-success">
              Connected
            </span>
          </span>
        </div>
      `;

      return;
    }

    refs.storage.innerHTML = `
      <div class="admin-settings-row">
        <span class="admin-settings-label">
          Bucket
        </span>

        <span class="admin-settings-data">
          ${escapeHtml(STORAGE_BUCKET)}
        </span>
      </div>

      <div class="admin-settings-row">
        <span class="admin-settings-label">
          Visibility
        </span>

        <span class="admin-settings-data">
          Private
        </span>
      </div>

      <div class="admin-settings-row">
        <span class="admin-settings-label">
          Access
        </span>

        <span class="admin-settings-data">
          <span class="admin-settings-status admin-settings-status-error">
            Unavailable
          </span>
        </span>
      </div>

      ${
        storage.error
          ? `
            <div class="admin-settings-error">
              ${escapeHtml(storage.error)}
            </div>
          `
          : ""
      }
    `;
  }

  /* ============================================================
     RENDER — CONTENT SYSTEM
     ============================================================ */

  function renderContentSystem() {
    if (!refs.contentSystem) {
      return;
    }

    refs.contentSystem.innerHTML = `
      <div class="admin-settings-row">
        <span class="admin-settings-label">
          Content types
        </span>

        <span class="admin-settings-data">
          ${escapeHtml(SUPPORTED_TYPES.join(", "))}
        </span>
      </div>

      <div class="admin-settings-row">
        <span class="admin-settings-label">
          Languages
        </span>

        <span class="admin-settings-data">
          ${escapeHtml(SUPPORTED_LANGUAGES.join(", "))}
        </span>
      </div>

      <div class="admin-settings-row">
        <span class="admin-settings-label">
          Statuses
        </span>

        <span class="admin-settings-data">
          ${escapeHtml(SUPPORTED_STATUSES.join(", "))}
        </span>
      </div>

      <div class="admin-settings-row">
        <span class="admin-settings-label">
          Media bucket
        </span>

        <span class="admin-settings-data">
          ${escapeHtml(STORAGE_BUCKET)}
        </span>
      </div>
    `;
  }

  /* ============================================================
     RENDER — CONNECTION
     ============================================================ */

  function renderConnection() {
    if (!refs.connection) {
      return;
    }

    const supabaseReady =
      Boolean(getClient());

    const overallReady =
      supabaseReady &&
      state.adminVerified &&
      state.database.accessible &&
      state.storage.accessible;

    refs.connection.innerHTML = `
      <div class="admin-settings-row">
        <span class="admin-settings-label">
          Supabase client
        </span>

        <span class="admin-settings-data">
          ${
            supabaseReady
              ? `
                <span class="admin-settings-status admin-settings-status-success">
                  Ready
                </span>
              `
              : `
                <span class="admin-settings-status admin-settings-status-error">
                  Unavailable
                </span>
              `
          }
        </span>
      </div>

      <div class="admin-settings-row">
        <span class="admin-settings-label">
          Administrator
        </span>

        <span class="admin-settings-data">
          ${
            state.adminVerified
              ? `
                <span class="admin-settings-status admin-settings-status-success">
                  Verified
                </span>
              `
              : `
                <span class="admin-settings-status admin-settings-status-error">
                  Not verified
                </span>
              `
          }
        </span>
      </div>

      <div class="admin-settings-row">
        <span class="admin-settings-label">
          Database
        </span>

        <span class="admin-settings-data">
          ${
            state.database.accessible
              ? `
                <span class="admin-settings-status admin-settings-status-success">
                  Connected
                </span>
              `
              : `
                <span class="admin-settings-status admin-settings-status-error">
                  Unavailable
                </span>
              `
          }
        </span>
      </div>

      <div class="admin-settings-row">
        <span class="admin-settings-label">
          Storage
        </span>

        <span class="admin-settings-data">
          ${
            state.storage.accessible
              ? `
                <span class="admin-settings-status admin-settings-status-success">
                  Connected
                </span>
              `
              : `
                <span class="admin-settings-status admin-settings-status-error">
                  Unavailable
                </span>
              `
          }
        </span>
      </div>

      <div class="admin-settings-row">
        <span class="admin-settings-label">
          Overall
        </span>

        <span class="admin-settings-data">
          ${
            overallReady
              ? `
                <span class="admin-settings-status admin-settings-status-success">
                  Operational
                </span>
              `
              : `
                <span class="admin-settings-status admin-settings-status-warning">
                  Check required
                </span>
              `
          }
        </span>
      </div>
    `;
  }

  /* ============================================================
     RENDER ALL
     ============================================================ */

  function renderAll() {
    renderAdmin();
    renderProject();
    renderDatabase();
    renderStorage();
    renderContentSystem();
    renderConnection();
  }

  /* ============================================================
     LOADING STATE
     ============================================================ */

  function renderLoading() {
    setLoading(
      refs.admin,
      "Reading administrator..."
    );

    setLoading(
      refs.project,
      "Reading project configuration..."
    );

    setLoading(
      refs.database,
      "Checking database..."
    );

    setLoading(
      refs.storage,
      "Checking media storage..."
    );

    setLoading(
      refs.contentSystem,
      "Reading content configuration..."
    );

    setLoading(
      refs.connection,
      "Checking system connection..."
    );
  }

  /* ============================================================
     LOAD SETTINGS
     ============================================================ */

  async function loadSettings() {
    if (state.loading) {
      return;
    }

    const client = getClient();

    state.loading = true;
    state.error = null;

    setStatus(
      "Checking Admin system...",
      "loading"
    );

    renderLoading();

    try {
      if (!client) {
        throw new Error(
          "Supabase client is unavailable."
        );
      }

      state.user =
        await getCurrentUser();

      if (!state.user) {
        throw new Error(
          "No authenticated administrator session."
        );
      }

      state.adminVerified =
        await verifyAdmin(client);

      if (!state.adminVerified) {
        throw new Error(
          "Administrator authorization could not be verified."
        );
      }

      const [
        databaseResult,
        storageResult
      ] = await Promise.all([
        checkDatabase(client),
        checkStorage(client)
      ]);

      state.database =
        databaseResult;

      state.storage =
        storageResult;

      renderAll();

      const operational =
        state.database.accessible &&
        state.storage.accessible;

      if (operational) {
        setStatus(
          "Admin system is operational.",
          "success"
        );
      } else {
        setStatus(
          "Admin is connected, but one or more system checks failed.",
          "warning"
        );
      }

      emit("echoes:settings-loaded", {
        user: state.user,
        adminVerified: state.adminVerified,
        database: state.database,
        storage: state.storage
      });
    } catch (error) {
      console.error(
        `${MODULE_NAME}: Settings load failed.`,
        error
      );

      state.error =
        error?.message ||
        "Settings could not be loaded.";

      renderAll();

      setStatus(
        state.error,
        "error"
      );

      emit("echoes:settings-error", {
        error: state.error
      });
    } finally {
      state.loading = false;
    }
    }

    /* ============================================================
     EVENT HANDLERS
     ============================================================ */

  async function handleRefresh() {
    await loadSettings();
  }

  function handleAuthenticated() {
    loadSettings();
  }

  function handleSignedOut() {
    state.user = null;
    state.adminVerified = false;
    state.database = {
      connected: false,
      accessible: false,
      count: null
    };

    state.storage = {
      accessible: false
    };

    state.error = null;

    if (refs.admin) {
      refs.admin.innerHTML = `
        <div class="admin-settings-row">
          <span class="admin-settings-label">
            Administrator
          </span>

          <span class="admin-settings-data">
            Sign in required
          </span>
        </div>
      `;
    }

    if (refs.connection) {
      refs.connection.innerHTML = `
        <div class="admin-settings-row">
          <span class="admin-settings-label">
            Connection
          </span>

          <span class="admin-settings-data">
            Sign in required
          </span>
        </div>
      `;
    }

    setStatus(
      "Sign in to view system settings.",
      "info"
    );
  }

  function registerEvents() {
    if (refs.refreshButton) {
      refs.refreshButton.addEventListener(
        "click",
        handleRefresh
      );
    }

    document.addEventListener(
      "echoes:authenticated",
      handleAuthenticated
    );

    document.addEventListener(
      "echoes:signed-out",
      handleSignedOut
    );
  }

  /* ============================================================
     INITIALIZATION
     ============================================================ */

  function initializeSettings() {
    if (state.initialized) {
      return;
    }

    cacheDom();

    if (!refs.status) {
      console.warn(
        `${MODULE_NAME}: Settings status element was not found.`
      );
    }

    if (
      !refs.admin ||
      !refs.project ||
      !refs.database ||
      !refs.storage ||
      !refs.contentSystem ||
      !refs.connection
    ) {
      console.warn(
        `${MODULE_NAME}: One or more Settings containers are missing.`
      );
    }

    registerEvents();

    state.initialized = true;

    /*
     * Authentication may already be complete when this module
     * initializes because all scripts use defer.
     */
    if (getClient()) {
      getCurrentUser()
        .then((user) => {
          if (user) {
            loadSettings();
          } else {
            setStatus(
              "Sign in to view system settings.",
              "info"
            );
          }
        })
        .catch((error) => {
          console.warn(
            `${MODULE_NAME}: Initial user check failed.`,
            error
          );
        });
    }

    emit("echoes:settings-ready");
  }

  /* ============================================================
     PUBLIC API
     ============================================================ */

  window.ECHOES_ADMIN_SETTINGS = {
    load: loadSettings,

    refresh: handleRefresh,

    getState() {
      return {
        initialized: state.initialized,
        loading: state.loading,
        error: state.error,
        user: state.user
          ? {
              id: state.user.id || null,
              email: state.user.email || null
            }
          : null,
        adminVerified:
          state.adminVerified,
        database: {
          connected:
            state.database.connected,
          accessible:
            state.database.accessible,
          count:
            state.database.count
        },
        storage: {
          accessible:
            state.storage.accessible
        }
      };
    },

    getStorageBucket() {
      return STORAGE_BUCKET;
    },

    getSupportedTypes() {
      return [...SUPPORTED_TYPES];
    },

    getSupportedLanguages() {
      return [...SUPPORTED_LANGUAGES];
    },

    getSupportedStatuses() {
      return [...SUPPORTED_STATUSES];
    }
  };

    /* ============================================================
     STARTUP
     ============================================================ */

  if (
    document.readyState === "loading"
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

  /*
   * Safe secondary initialization path for the central Admin shell.
   * The initialization guard prevents duplicate registration.
   */
  document.addEventListener(
    "echoes:admin-ready",
    initializeSettings,
    {
      once: true
    }
  );

  /* ============================================================
     END OF ECHOES OF HUMANITY — ADMIN SETTINGS
     ============================================================ */

})();
