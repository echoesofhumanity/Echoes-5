/* =========================================================
   ECHOES OF HUMANITY
   ADMIN DATA LAYER
   Database + Library Read Operations
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

  const library =
    document.getElementById("library");
const librarySearch =
  document.getElementById("librarySearch");

   const libraryStatusFilter =
  document.getElementById("libraryStatusFilter");
   const libraryTypeFilter =
  document.getElementById("libraryTypeFilter");
/* =======================================================
   STATE
   ======================================================= */

let allContentItems = [];
  /* =======================================================
     HELPERS
     ======================================================= */

  function setStat(element, value) {
    if (!element) {
      return;
    }

    element.textContent = String(value);
  }


  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  function formatDate(value) {
    if (!value) {
      return "—";
    }

    const date =
      new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleDateString(
      undefined,
      {
        year: "numeric",
        month: "short",
        day: "numeric"
      }
    );
  }


  function getStatusClass(status) {
    if (status === "published") {
      return "admin-badge-success";
    }

    if (status === "pending") {
      return "admin-badge-warning";
    }

    if (status === "archived") {
      return "admin-badge-danger";
    }

    return "";
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
        "id, type, title, language, category, status, file_path, created_at, updated_at"
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
     CONTENT LIBRARY
     ======================================================= */

  function renderLibrary(items) {
    if (!library) {
      return;
    }

    if (!items.length) {
      library.innerHTML = `
        <div class="admin-empty">
          No content has been added yet.
        </div>
      `;

      return;
    }


    library.innerHTML =
      items.map(item => {

        const statusClass =
          getStatusClass(
            item.status
          );

        const category =
          item.category ||
          "Uncategorized";

        const language =
          item.language ||
          "—";

        const type =
          item.type ||
          "—";

        return `
          <article
            class="admin-library-item"
            data-content-id="${escapeHtml(item.id)}"
          >

            <div class="admin-library-info">

              <h3 class="admin-library-title">
                ${escapeHtml(item.title)}
              </h3>

              <div class="admin-library-meta">

                <span class="admin-badge">
                  ${escapeHtml(type)}
                </span>

                <span class="admin-badge">
                  ${escapeHtml(language)}
                </span>

                <span class="admin-badge">
                  ${escapeHtml(category)}
                </span>

                <span
                  class="admin-badge ${statusClass}"
                >
                  ${escapeHtml(item.status)}
                </span>

                <span>
                  ${formatDate(item.created_at)}
                </span>

              </div>

            </div>
        <div class="admin-library-actions">
  <button
    type="button"
    class="admin-button"
    data-action="edit-content"
    data-content-id="${escapeHtml(item.id)}"
  >
    Edit
  </button>

  <button
    type="button"
    class="admin-button"
    data-action="delete-content"
    data-content-id="${escapeHtml(item.id)}"
  >
    Delete
  </button>
</div>
          </article>
        `;

      }).join("");
  }


  /* =======================================================
     REFRESH ADMIN DATA
     ======================================================= */

  async function refreshDashboard() {
    try {

      const items =
  await loadContentItems();

allContentItems = items;

updateDashboardStats(
  items
);

applyLibraryFilters();


      return items;

    } catch (error) {

      showDataError(
        error
      );

      if (library) {
        library.innerHTML = `
          <div class="admin-empty">
            Unable to load content.
          </div>
        `;
      }

      return [];
    }
  }

/* =======================================================
   LIBRARY FILTERS
   ======================================================= */

function applyLibraryFilters() {
  const query =
    librarySearch
      ? librarySearch.value
          .trim()
          .toLowerCase()
      : "";

  const status =
    libraryStatusFilter
      ? libraryStatusFilter.value
      : "all";

  const filteredItems =
    allContentItems.filter(item => {
      const matchesSearch =
        !query ||
        String(item.title || "")
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        status === "all" ||
        item.status === status;

      return (
        matchesSearch &&
        matchesStatus
      );
    });

  renderLibrary(
    filteredItems
  );
}

if (librarySearch) {
  librarySearch.addEventListener(
    "input",
    applyLibraryFilters
  );
}

if (libraryStatusFilter) {
  libraryStatusFilter.addEventListener(
    "change",
    applyLibraryFilters
  );
}
  /* =======================================================
     PUBLIC API
     ======================================================= */

  window.EchoesAdminData = {
    loadContentItems,
    updateDashboardStats,
    renderLibrary,
    refreshDashboard
  };

})();
