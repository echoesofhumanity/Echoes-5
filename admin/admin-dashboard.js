(() => {
  "use strict";

  /*
   * ============================================================
   * ECHOES OF HUMANITY — ADMIN DASHBOARD
   * ============================================================
   *
   * Responsibilities:
   * - Load dashboard statistics from content_items.
   * - Render total/status/type statistics.
   * - Refresh after authentication and content changes.
   * - Expose a small public dashboard API.
   *
   * This module does NOT:
   * - authenticate users
   * - create/edit/delete content
   * - manage storage files
   * - manage library filtering
   * - manage settings
   * - control application navigation
   * ============================================================
   */

  const MODULE_NAME = "Echoes Admin: Dashboard";

  /*
   * ============================================================
   * DOM ID CONTRACT
   * ============================================================
   *
   * These IDs MUST match admin/index.html.
   * Keeping them in one place prevents HTML/JS binding drift.
   */
  const DASHBOARD_IDS = {
    total: "totalContent",
    published: "publishedContent",
    draft: "draftContent",
    pending: "pendingContent",
    archived: "archivedContent",

    story: "storyContent",
    video: "videoContent",
    image: "imageContent",
    music: "musicContent",
    document: "documentContent",

    status: "dashboardStatus",
    refresh: "dashboardRefreshButton"
  };

  /*
   * ============================================================
   * SUPPORTED VALUES
   * ============================================================
   */

  const SUPPORTED_STATUSES = [
    "draft",
    "pending",
    "published",
    "archived"
  ];

  const SUPPORTED_TYPES = [
    "story",
    "video",
    "image",
    "music",
    "document"
  ];

  /*
   * ============================================================
   * DOM REFERENCES
   * ============================================================
   */

  const refs = {
    totalContent: null,
    publishedContent: null,
    draftContent: null,
    pendingContent: null,
    archivedContent: null,

    storyContent: null,
    videoContent: null,
    imageContent: null,
    musicContent: null,
    documentContent: null,

    dashboardStatus: null,
    dashboardRefreshButton: null
  };

  /*
   * ============================================================
   * STATE
   * ============================================================
   */

  let initialized = false;
  let loading = false;
  let allItems = [];

  /*
   * ============================================================
   * DOM CACHE
   * ============================================================
   */

  function cacheDom() {
    refs.totalContent = document.getElementById(
      DASHBOARD_IDS.total
    );

    refs.publishedContent = document.getElementById(
      DASHBOARD_IDS.published
    );

    refs.draftContent = document.getElementById(
      DASHBOARD_IDS.draft
    );

    refs.pendingContent = document.getElementById(
      DASHBOARD_IDS.pending
    );

    refs.archivedContent = document.getElementById(
      DASHBOARD_IDS.archived
    );

    refs.storyContent = document.getElementById(
      DASHBOARD_IDS.story
    );

    refs.videoContent = document.getElementById(
      DASHBOARD_IDS.video
    );

    refs.imageContent = document.getElementById(
      DASHBOARD_IDS.image
    );

    refs.musicContent = document.getElementById(
      DASHBOARD_IDS.music
    );

    refs.documentContent = document.getElementById(
      DASHBOARD_IDS.document
    );

    refs.dashboardStatus = document.getElementById(
      DASHBOARD_IDS.status
    );

    refs.dashboardRefreshButton = document.getElementById(
      DASHBOARD_IDS.refresh
    );
  }

  /*
   * ============================================================
   * DOM VALIDATION
   * ============================================================
   */

  function getMissingDomReferences() {
    const required = {
      totalContent: refs.totalContent,
      publishedContent: refs.publishedContent,
      draftContent: refs.draftContent,
      pendingContent: refs.pendingContent,
      archivedContent: refs.archivedContent,

      storyContent: refs.storyContent,
      videoContent: refs.videoContent,
      imageContent: refs.imageContent,
      musicContent: refs.musicContent,
      documentContent: refs.documentContent,

      dashboardStatus: refs.dashboardStatus,
      dashboardRefreshButton: refs.dashboardRefreshButton
    };

    return Object.keys(required).filter(
      (key) => !required[key]
    );
  }

  /*
   * ============================================================
   * SUPABASE ACCESS
   * ============================================================
   */

  function getSupabase() {
    const api = window.ECHOES_SUPABASE_API;

    if (
      api &&
      typeof api.getClient === "function"
    ) {
      return api.getClient();
    }

    if (
      window.ECHOES_SUPABASE &&
      typeof window.ECHOES_SUPABASE.from === "function"
    ) {
      return window.ECHOES_SUPABASE;
    }

    return null;
  }

  function isSupabaseReady() {
    const api = window.ECHOES_SUPABASE_API;

    if (
      api &&
      typeof api.isReady === "function"
    ) {
      return Boolean(api.isReady());
    }

    return Boolean(getSupabase());
  }

  /*
   * ============================================================
   * AUTHENTICATION STATE
   * ============================================================
   */

  function getAuthApi() {
    return window.ECHOES_ADMIN_AUTH || null;
  }

  function isAuthenticated() {
    const auth = getAuthApi();

    if (
      auth &&
      typeof auth.isAuthenticated === "function"
    ) {
      return Boolean(auth.isAuthenticated());
    }

    if (auth && auth.currentUser) {
      return true;
    }

    return false;
  }

  /*
   * ============================================================
   * EVENT HELPER
   * ============================================================
   */

  function emit(name, detail = {}) {
    document.dispatchEvent(
      new CustomEvent(name, {
        detail
      })
    );
  }

  /*
   * ============================================================
   * STATUS MESSAGE
   * ============================================================
   */

  function setStatus(message, type = "") {
    if (!refs.dashboardStatus) {
      return;
    }

    refs.dashboardStatus.textContent = message || "";

    refs.dashboardStatus.classList.remove(
      "success",
      "warning",
      "error"
    );

    if (type) {
      refs.dashboardStatus.classList.add(type);
    }

    refs.dashboardStatus.dataset.status =
      type || "";
  }

  /*
   * ============================================================
   * LOADING STATE
   * ============================================================
   */

  function setLoading(isLoading) {
    loading = Boolean(isLoading);

    if (!refs.dashboardRefreshButton) {
      return;
    }

    refs.dashboardRefreshButton.disabled =
      loading;

    refs.dashboardRefreshButton.classList.toggle(
      "is-loading",
      loading
    );

    refs.dashboardRefreshButton.setAttribute(
      "aria-busy",
      loading ? "true" : "false"
    );
  }

  /*
   * ============================================================
   * VALUE HELPER
   * ============================================================
   */

  function setValue(element, value) {
    if (!element) {
      return;
    }

    element.textContent = String(value);
  }

  /*
   * ============================================================
   * EMPTY STATISTICS
   * ============================================================
   */

  function createEmptyStats() {
    return {
      total: 0,

      status: {
        draft: 0,
        pending: 0,
        published: 0,
        archived: 0
      },

      type: {
        story: 0,
        video: 0,
        image: 0,
        music: 0,
        document: 0
      }
    };
  }

  /*
   * ============================================================
   * STATISTICS
   * ============================================================
   */

  function calculateStats(items) {
    const stats = createEmptyStats();

    if (!Array.isArray(items)) {
      return stats;
    }

    for (const item of items) {
      if (!item || typeof item !== "object") {
        continue;
      }

      stats.total += 1;

      if (
        typeof item.status === "string" &&
        SUPPORTED_STATUSES.includes(item.status)
      ) {
        stats.status[item.status] += 1;
      }

      if (
        typeof item.type === "string" &&
        SUPPORTED_TYPES.includes(item.type)
      ) {
        stats.type[item.type] += 1;
      }
    }

    return stats;
      }
    /*
   * ============================================================
   * RENDER STATISTICS
   * ============================================================
   */

  function renderStats(stats) {
    const safeStats =
      stats || createEmptyStats();

    setValue(
      refs.totalContent,
      safeStats.total
    );

    setValue(
      refs.publishedContent,
      safeStats.status.published
    );

    setValue(
      refs.draftContent,
      safeStats.status.draft
    );

    setValue(
      refs.pendingContent,
      safeStats.status.pending
    );

    setValue(
      refs.archivedContent,
      safeStats.status.archived
    );

    setValue(
      refs.storyContent,
      safeStats.type.story
    );

    setValue(
      refs.videoContent,
      safeStats.type.video
    );

    setValue(
      refs.imageContent,
      safeStats.type.image
    );

    setValue(
      refs.musicContent,
      safeStats.type.music
    );

    setValue(
      refs.documentContent,
      safeStats.type.document
    );
  }

  /*
   * ============================================================
   * RENDER EMPTY STATE
   * ============================================================
   */

  function renderEmpty() {
    renderStats(createEmptyStats());
  }

  /*
   * ============================================================
   * LOAD CONTENT DATA
   * ============================================================
   */

  async function loadContentItems() {
    const supabase = getSupabase();

    if (!supabase) {
      throw new Error(
        "Supabase connection is unavailable."
      );
    }

    if (
      window.ECHOES_SUPABASE_API &&
      typeof window.ECHOES_SUPABASE_API.isReady ===
        "function" &&
      !window.ECHOES_SUPABASE_API.isReady()
    ) {
      throw new Error(
        "Supabase connection is not ready."
      );
    }

    const response = await supabase
      .from("content_items")
      .select("id,type,status")
      .order("created_at", {
        ascending: false
      });

    const data = response
      ? response.data
      : null;

    const error = response
      ? response.error
      : null;

    if (error) {
      console.error(
        `${MODULE_NAME}: dashboard query failed.`,
        error
      );

      throw new Error(
        error.message ||
          "Unable to load dashboard data."
      );
    }

    return Array.isArray(data)
      ? data
      : [];
  }

  /*
   * ============================================================
   * REFRESH DASHBOARD
   * ============================================================
   */

  async function refreshDashboard() {
    if (loading) {
      return null;
    }

    setLoading(true);
    setStatus("Loading dashboard.");

    try {
      /*
       * Do not silently display zeros when the user
       * is not authenticated. The dashboard is an
       * authenticated admin surface.
       */
      if (!isAuthenticated()) {
        allItems = [];
        renderEmpty();

        setStatus(
          "Admin authentication required.",
          "warning"
        );

        return null;
      }

      if (!isSupabaseReady()) {
        throw new Error(
          "Supabase connection is not ready."
        );
      }

      const items =
        await loadContentItems();

      /*
       * Store the actual database result.
       * No hard-coded dashboard values.
       */
      allItems = items;

      const stats =
        calculateStats(allItems);

      renderStats(stats);

      setStatus(
        "Dashboard updated.",
        "success"
      );

      emit(
        "echoes:dashboard-updated",
        {
          items: [...allItems],
          stats
        }
      );

      return stats;
    } catch (error) {
      console.error(
        `${MODULE_NAME}: refresh failed.`,
        error
      );

      /*
       * Keep previous data out of a failed refresh.
       * This prevents stale numbers from being presented
       * as current database values.
       */
      allItems = [];

      renderEmpty();

      const message =
        error &&
        typeof error.message === "string"
          ? error.message
          : "Unable to load dashboard.";

      setStatus(
        message,
        "error"
      );

      emit(
        "echoes:dashboard-error",
        {
          error
        }
      );

      return null;
    } finally {
      setLoading(false);
    }
  }

  /*
   * ============================================================
   * AUTHENTICATED EVENT
   * ============================================================
   */

  async function handleAuthenticated() {
    /*
     * Authentication has already been verified
     * by admin-auth.js.
     */
    await refreshDashboard();
  }

  /*
   * ============================================================
   * SIGNED OUT EVENT
   * ============================================================
   */

  function handleSignedOut() {
    allItems = [];

    renderEmpty();

    setStatus("");

    initialized = false;
  }

  /*
   * ============================================================
   * CONTENT SAVED EVENT
   * ============================================================
   */

  async function handleContentSaved() {
    if (!initialized) {
      return;
    }

    if (!isAuthenticated()) {
      return;
    }

    await refreshDashboard();
  }

  /*
   * ============================================================
   * CONTENT DELETED EVENT
   * ============================================================
   */

  async function handleContentDeleted() {
    if (!initialized) {
      return;
    }

    if (!isAuthenticated()) {
      return;
    }

    await refreshDashboard();
  }

  /*
   * ============================================================
   * EVENT LISTENERS
   * ============================================================
   */

  function registerEvents() {
    document.addEventListener(
      "echoes:authenticated",
      handleAuthenticated
    );

    document.addEventListener(
      "echoes:signed-out",
      handleSignedOut
    );

    document.addEventListener(
      "echoes:content-saved",
      handleContentSaved
    );

    document.addEventListener(
      "echoes:content-deleted",
      handleContentDeleted
    );
  }

  /*
   * ============================================================
   * BUTTON
   * ============================================================
   */

  function registerButton() {
    if (!refs.dashboardRefreshButton) {
      return;
    }

    refs.dashboardRefreshButton.addEventListener(
      "click",
      () => {
        refreshDashboard();
      }
    );
  }

  /*
   * ============================================================
   * DOM CONTRACT CHECK
   * ============================================================
   */

  function validateDom() {
    const missing =
      getMissingDomReferences();

    if (missing.length === 0) {
      return true;
    }

    console.error(
      `${MODULE_NAME}: missing DOM references.`,
      missing
    );

    setStatus(
      "Dashboard interface is incomplete.",
      "error"
    );

    return false;
  }

   /*
   * ============================================================
   * INITIALIZATION
   * ============================================================
   */

  function initializeDashboard() {
    if (initialized) {
      return;
    }

    cacheDom();

    /*
     * If the HTML contract is wrong, stop here.
     * We do not attempt to guess alternative IDs.
     */
    if (!validateDom()) {
      return;
    }

    registerEvents();
    registerButton();

    renderEmpty();

    initialized = true;

    /*
     * If authentication has already completed before
     * this module initialized, load immediately.
     *
     * Otherwise admin-auth.js will emit
     * echoes:authenticated and trigger the same flow.
     */
    if (isAuthenticated()) {
      refreshDashboard();
    }
  }

  /*
   * ============================================================
   * PUBLIC API
   * ============================================================
   */

  window.ECHOES_ADMIN_DASHBOARD = {
    refresh: refreshDashboard,

    render: renderStats,

    getItems() {
      return [...allItems];
    },

    getStats() {
      return calculateStats(allItems);
    },

    isLoading() {
      return loading;
    },

    isInitialized() {
      return initialized;
    }
  };

  /*
   * ============================================================
   * STARTUP
   * ============================================================
   */

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeDashboard,
      {
        once: true
      }
    );
  } else {
    initializeDashboard();
  }

  /*
   * ============================================================
   * END OF ECHOES OF HUMANITY — ADMIN DASHBOARD
   * ============================================================
   */

})();
