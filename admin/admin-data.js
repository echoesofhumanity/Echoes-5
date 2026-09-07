/* =========================================================
   ECHOES OF HUMANITY
   ADMIN DATA LAYER
   Database Read Operations
   ========================================================= */

(() => {
  "use strict";

  /* =======================================================
     SUPABASE
     ======================================================= */

  const supabaseClient =
    window.ECHOES_SUPABASE;


  /* =======================================================
     DOM
     ======================================================= */

  const statTotal =
    document.getElementById("statTotal");

  const statPublished =
    document.getElementById("statPublished");

  const statDrafts =
    document.getElementById("statDrafts");

  const statPending =
    document.getElementById("statPending");


  /* =======================================================
     HELPERS
     ======================================================= */

  function setStat(element, value) {
    if (!element) {
      return;
    }

    element.textContent = String(value);
  }


  function showDataError(error) {
    console.error(
      "Content data error:",
      error
    );
  }


  /* =======================================================
     LOAD CONTENT
     ======================================================= */

  async function loadContentItems() {
    if (!supabaseClient) {
      throw new Error(
        "Supabase client is not available."
      );
    }

    const {
      data,
      error
    } = await supabaseClient
      .from("content_items")
      .select(
        "id, type, title, language, category, status, created_at, updated_at"
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );

    if (error) {
      throw error;
    }

    return data || [];
  }


  /* =======================================================
     DASHBOARD STATISTICS
     ======================================================= */

  function updateDashboardStats(items) {
    const total =
      items.length;

    const published =
      items.filter(
        item =>
          item.status === "published"
      ).length;

    const drafts =
      items.filter(
        item =>
          item.status === "draft"
      ).length;

    const pending =
      items.filter(
        item =>
          item.status === "pending"
      ).length;

    setStat(
      statTotal,
      total
    );

    setStat(
      statPublished,
      published
    );

    setStat(
      statDrafts,
      drafts
    );

    setStat(
      statPending,
      pending
    );
  }


  /* =======================================================
     PUBLIC API
     ======================================================= */

  async function refreshDashboard() {
    try {
      const items =
        await loadContentItems();

      updateDashboardStats(
        items
      );

      return items;

    } catch (error) {
      showDataError(error);

      return [];
    }
  }


  window.EchoesAdminData = {
    loadContentItems,
    updateDashboardStats,
    refreshDashboard
  };


  /* =======================================================
     INITIAL LOAD
     ======================================================= */



})();
