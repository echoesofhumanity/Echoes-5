/* =========================================================
   ECHOES OF HUMANITY — ADMIN V2
   DASHBOARD MODULE
   PART 1 / 4
   ========================================================= */

(() => {
  "use strict";


  /* =======================================================
     DOM REFERENCES
     ======================================================= */

  const totalContentCount =
    document.getElementById("totalContentCount");

  const publishedContentCount =
    document.getElementById("publishedContentCount");

  const draftContentCount =
    document.getElementById("draftContentCount");

  const pendingContentCount =
    document.getElementById("pendingContentCount");

  const dashboardStatus =
    document.getElementById("dashboardStatus");

  const dashboardRefreshButton =
    document.getElementById(
      "dashboardRefreshButton"
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
     DASHBOARD STATE
     ======================================================= */

  const stats = {
    total: 0,
    published: 0,
    draft: 0,
    pending: 0
  };

  let initialized = false;
  let loading = false;


  /* =======================================================
     MESSAGE HELPER
     ======================================================= */

  function setDashboardStatus(
    message,
    type = ""
  ) {
    if (!dashboardStatus) {
      return;
    }

    dashboardStatus.textContent = message;

    dashboardStatus.classList.remove(
      "is-success",
      "is-warning",
      "is-error"
    );

    if (type) {
      dashboardStatus.classList.add(
        `is-${type}`
      );
    }
  }


  /* =======================================================
     STAT RENDERING
     ======================================================= */

  function renderStats() {
    if (totalContentCount) {
      totalContentCount.textContent =
        String(stats.total);
    }

    if (publishedContentCount) {
      publishedContentCount.textContent =
        String(stats.published);
    }

    if (draftContentCount) {
      draftContentCount.textContent =
        String(stats.draft);
    }

    if (pendingContentCount) {
      pendingContentCount.textContent =
        String(stats.pending);
    }
  }


  /* =======================================================
     EVENT HELPER
     ======================================================= */

  function emit(name, detail = {}) {
    window.dispatchEvent(
      new CustomEvent(name, {
        detail
      })
    );
  }

    /* =======================================================
     DATABASE COUNT
     ======================================================= */

  async function countByStatus(status) {
    const {
      count,
      error
    } = await supabaseClient
      .from("content_items")
      .select("id", {
        count: "exact",
        head: true
      })
      .eq("status", status);

    if (error) {
      throw error;
    }

    return Number.isFinite(count)
      ? count
      : 0;
  }


  async function countTotal() {
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
      throw error;
    }

    return Number.isFinite(count)
      ? count
      : 0;
  }


  /* =======================================================
     LOAD DASHBOARD DATA
     ======================================================= */

  async function loadDashboardData() {
    if (!supabaseClient) {
      throw new Error(
        "Supabase client is unavailable."
      );
    }

    const [
      total,
      published,
      draft,
      pending
    ] = await Promise.all([
      countTotal(),
      countByStatus("published"),
      countByStatus("draft"),
      countByStatus("pending")
    ]);

    stats.total = total;
    stats.published = published;
    stats.draft = draft;
    stats.pending = pending;

    renderStats();

    emit(
      "echoes:dashboard-updated",
      {
        stats: {
          ...stats
        }
      }
    );

    return {
      ...stats
    };
  }


  /* =======================================================
     REFRESH
     ======================================================= */

  async function refreshDashboard() {
    if (loading) {
      return {
        ...stats
      };
    }

    loading = true;

    if (dashboardRefreshButton) {
      dashboardRefreshButton.disabled = true;
      dashboardRefreshButton.textContent =
        "Refreshing…";
    }

    setDashboardStatus(
      "Loading dashboard data…",
      "warning"
    );

    try {
      const result =
        await loadDashboardData();

      setDashboardStatus(
        "Dashboard updated.",
        "success"
      );

      return result;

    } catch (error) {
      console.error(
        "Echoes Admin V2: Dashboard load failed.",
        error
      );

      setDashboardStatus(
        "Unable to load dashboard data.",
        "error"
      );

      emit(
        "echoes:dashboard-error",
        {
          error
        }
      );

      throw error;

    } finally {
      loading = false;

      if (dashboardRefreshButton) {
        dashboardRefreshButton.disabled = false;
        dashboardRefreshButton.textContent =
          "Refresh";
      }
    }
  }

    /* =======================================================
     AUTHENTICATION INTEGRATION
     ======================================================= */

  async function handleAuthenticated() {
  try {

    
      await refreshDashboard();
    } catch (error) {
      console.error(
        "Echoes Admin V2: Initial dashboard refresh failed.",
        error
      );
    }
  }


  function handleSignedOut() {
    stats.total = 0;
    stats.published = 0;
    stats.draft = 0;
    stats.pending = 0;

    renderStats();

    setDashboardStatus("");

    initialized = false;
  }


  /* =======================================================
     DOM EVENTS
     ======================================================= */

  function registerDomEvents() {
    if (dashboardRefreshButton) {
      dashboardRefreshButton.addEventListener(
        "click",
        () => {
          refreshDashboard().catch(
            () => {}
          );
        }
      );
    }
  }


  /* =======================================================
     APPLICATION EVENTS
     ======================================================= */

  function registerApplicationEvents() {
    window.addEventListener(
      "echoes:authenticated",
      handleAuthenticated
    );

    window.addEventListener(
      "echoes:signed-out",
      handleSignedOut
    );
  }


  /* =======================================================
     INITIALIZATION
     ======================================================= */

  function initializeDashboard() {
    if (initialized) {
      return;
    }

    initialized = true;

    renderStats();

    registerDomEvents();
    registerApplicationEvents();
  }


  /* =======================================================
     PUBLIC API — PARTIAL
     ======================================================= */

  window.ECHOES_ADMIN_DASHBOARD = {
    getStats() {
      return {
        ...stats
      };
    },

    async refresh() {
      return refreshDashboard();
    },

    isLoading() {
      return loading;
    }
  };

    /* =======================================================
     STARTUP
     ======================================================= */

  if (
    document.readyState === "loading"
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
