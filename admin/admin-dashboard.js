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
   * - manage content records
   * - manage storage files
   * - manage library filtering
   * - manage settings
   * - control navigation
   */


  /* ============================================================
     DOM REFERENCES
     ============================================================ */

  const refs = {
    totalContent:
      null,

    publishedContent:
      null,

    draftContent:
      null,

    pendingContent:
      null,

    archivedContent:
      null,

    storyContent:
      null,

    videoContent:
      null,

    imageContent:
      null,

    musicContent:
      null,

    documentContent:
      null,

    dashboardStatus:
      null,

    dashboardRefreshButton:
      null
  };


  /* ============================================================
     STATE
     ============================================================ */

  let initialized = false;
  let loading = false;
  let allItems = [];


  /* ============================================================
     DOM CACHE
     ============================================================ */

  function cacheDom() {
    refs.totalContent =
      document.getElementById(
        "dashboardTotalContent"
      );

    refs.publishedContent =
      document.getElementById(
        "dashboardPublishedContent"
      );

    refs.draftContent =
      document.getElementById(
        "dashboardDraftContent"
      );

    refs.pendingContent =
      document.getElementById(
        "dashboardPendingContent"
      );

    refs.archivedContent =
      document.getElementById(
        "dashboardArchivedContent"
      );

    refs.storyContent =
      document.getElementById(
        "dashboardStoryContent"
      );

    refs.videoContent =
      document.getElementById(
        "dashboardVideoContent"
      );

    refs.imageContent =
      document.getElementById(
        "dashboardImageContent"
      );

    refs.musicContent =
      document.getElementById(
        "dashboardMusicContent"
      );

    refs.documentContent =
      document.getElementById(
        "dashboardDocumentContent"
      );

    refs.dashboardStatus =
      document.getElementById(
        "dashboardStatus"
      );

    refs.dashboardRefreshButton =
      document.getElementById(
        "dashboardRefreshButton"
      );
  }


  /* ============================================================
     SUPABASE ACCESS
     ============================================================ */

  function getSupabase() {
    if (
      !window.ECHOES_SUPABASE_API ||
      typeof
        window.ECHOES_SUPABASE_API.getClient !==
          "function"
    ) {
      return null;
    }

    return window.ECHOES_SUPABASE_API.getClient();
  }


  function isSupabaseReady() {
    return Boolean(
      window.ECHOES_SUPABASE_API &&
      typeof
        window.ECHOES_SUPABASE_API.isReady ===
          "function" &&
      window.ECHOES_SUPABASE_API.isReady()
    );
  }


  /* ============================================================
     EVENT HELPER
     ============================================================ */

  function emit(
    name,
    detail = {}
  ) {
    document.dispatchEvent(
      new CustomEvent(
        name,
        {
          detail
        }
      )
    );
  }


  /* ============================================================
     STATUS MESSAGE
     ============================================================ */

  function setStatus(
    message,
    type = ""
  ) {
    if (!refs.dashboardStatus) {
      return;
    }

    refs.dashboardStatus.textContent =
      message || "";

    refs.dashboardStatus.classList.remove(
      "success",
      "warning",
      "error"
    );

    if (type) {
      refs.dashboardStatus.classList.add(
        type
      );
    }
  }


  /* ============================================================
     LOADING STATE
     ============================================================ */

  function setLoading(
    isLoading
  ) {
    loading = isLoading;

    if (
      refs.dashboardRefreshButton
    ) {
      refs.dashboardRefreshButton.disabled =
        isLoading;

      refs.dashboardRefreshButton.classList.toggle(
        "is-loading",
        isLoading
      );
    }
  }


  /* ============================================================
     VALUE HELPERS
     ============================================================ */

  function setValue(
    element,
    value
  ) {
    if (!element) {
      return;
    }

    element.textContent =
      String(value);
  }


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


  /* ============================================================
     STATISTICS
     ============================================================ */

  function calculateStats(
    items
  ) {
    const stats =
      createEmptyStats();

    for (
      const item of items
    ) {
      stats.total += 1;

      if (
        Object.prototype.hasOwnProperty.call(
          stats.status,
          item.status
        )
      ) {
        stats.status[
          item.status
        ] += 1;
      }

      if (
        Object.prototype.hasOwnProperty.call(
          stats.type,
          item.type
        )
      ) {
        stats.type[
          item.type
        ] += 1;
      }
    }

    return stats;
  }


  /* ============================================================
     RENDER
     ============================================================ */

  function renderStats(
    stats
  ) {
    setValue(
      refs.totalContent,
      stats.total
    );

    setValue(
      refs.publishedContent,
      stats.status.published
    );

    setValue(
      refs.draftContent,
      stats.status.draft
    );

    setValue(
      refs.pendingContent,
      stats.status.pending
    );

    setValue(
      refs.archivedContent,
      stats.status.archived
    );

    setValue(
      refs.storyContent,
      stats.type.story
    );

    setValue(
      refs.videoContent,
      stats.type.video
    );

    setValue(
      refs.imageContent,
      stats.type.image
    );

    setValue(
      refs.musicContent,
      stats.type.music
    );

    setValue(
      refs.documentContent,
      stats.type.document
    );
  }


  function renderEmpty() {
    renderStats(
      createEmptyStats()
    );
  }


  /* ============================================================
     LOAD CONTENT DATA
     ============================================================ */

  async function loadContentItems() {
    const supabase =
      getSupabase();

    if (
      !supabase ||
      !isSupabaseReady()
    ) {
      throw new Error(
        "Supabase connection is unavailable."
      );
    }

    const {
      data,
      error
    } =
      await supabase
        .from("content_items")
        .select(
          "id,type,status"
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        );

    if (error) {
      console.error(
        "Echoes Admin: Dashboard query failed.",
        error
      );

      throw new Error(
        "Unable to load dashboard data."
      );
    }

    return Array.isArray(data)
      ? data
      : [];
  }


  /* ============================================================
     REFRESH DASHBOARD
     ============================================================ */

  async function refreshDashboard() {
    if (loading) {
      return null;
    }

    setLoading(true);

    setStatus(
      "Loading dashboard…"
    );

    try {
      const items =
        await loadContentItems();

      allItems =
        items;

      const stats =
        calculateStats(
          allItems
        );

      renderStats(
        stats
      );

      setStatus(
        "Dashboard updated.",
        "success"
      );

      emit(
        "echoes:dashboard-updated",
        {
          items:
            [...allItems],
          stats
        }
      );

      return stats;

    } catch (error) {
      console.error(
        "Echoes Admin: Dashboard refresh failed.",
        error
      );

      setStatus(
        error &&
        error.message
          ? error.message
          : "Unable to load dashboard.",
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


  /* ============================================================
     AUTHENTICATED EVENT
     ============================================================ */

  async function handleAuthenticated() {
    /*
     * Authentication has already been verified by
     * admin-auth.js. The dashboard simply loads its
     * own data.
     */
    await refreshDashboard();
  }


  /* ============================================================
     SIGNED OUT EVENT
     ============================================================ */

  function handleSignedOut() {
    allItems = [];

    renderEmpty();

    setStatus("");

    initialized = false;
  }


  /* ============================================================
     CONTENT SAVED
     ============================================================ */

  async function handleContentSaved() {
    if (!initialized) {
      return;
    }

    await refreshDashboard();
  }


  /* ============================================================
     CONTENT DELETED
     ============================================================ */

  async function handleContentDeleted() {
    if (!initialized) {
      return;
    }

    await refreshDashboard();
  }


  /* ============================================================
     EVENT LISTENERS
     ============================================================ */

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


  /* ============================================================
     BUTTON
     ============================================================ */

  function registerButton() {
    if (
      !refs.dashboardRefreshButton
    ) {
      return;
    }

    refs.dashboardRefreshButton.addEventListener(
      "click",
      () => {
        refreshDashboard();
      }
    );
  }


  /* ============================================================
     INITIALIZATION
     ============================================================ */

  function initializeDashboard() {
    if (initialized) {
      return;
    }

    cacheDom();

    registerEvents();

    registerButton();

    renderEmpty();

    initialized = true;
  }


  /* ============================================================
     PUBLIC API
     ============================================================ */

  window.ECHOES_ADMIN_DASHBOARD = {
    refresh:
      refreshDashboard,

    render:
      renderStats,

    getItems() {
      return [
        ...allItems
      ];
    },

    getStats() {
      return calculateStats(
        allItems
      );
    },

    isLoading() {
      return loading;
    }
  };


  /* ============================================================
     STARTUP
     ============================================================ */

  if (
    document.readyState ===
    "loading"
  ) {
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

})();
