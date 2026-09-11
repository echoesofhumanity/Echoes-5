/* =========================================================
   ECHOES OF HUMANITY — ADMIN V2
   CONTENT LIBRARY MODULE
   PART 1 / 4
   ========================================================= */

(() => {
  "use strict";


  /* =======================================================
     DOM REFERENCES
     ======================================================= */

  const librarySearch =
    document.getElementById("librarySearch");

  const libraryStatusFilter =
    document.getElementById(
      "libraryStatusFilter"
    );

  const libraryTypeFilter =
    document.getElementById(
      "libraryTypeFilter"
    );

  const libraryLanguageFilter =
    document.getElementById(
      "libraryLanguageFilter"
    );

  const libraryList =
    document.getElementById("libraryList");

  const libraryEmpty =
    document.getElementById("libraryEmpty");

  const libraryStatus =
    document.getElementById("libraryStatus");

  const libraryRefreshButton =
    document.getElementById(
      "libraryRefreshButton"
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
     STATE
     ======================================================= */

  let allItems = [];
  let filteredItems = [];
  let loading = false;
  let initialized = false;


  /* =======================================================
     MESSAGE
     ======================================================= */

  function setLibraryStatus(
    message,
    type = ""
  ) {
    if (!libraryStatus) {
      return;
    }

    libraryStatus.textContent =
      message;

    libraryStatus.classList.remove(
      "is-success",
      "is-warning",
      "is-error"
    );

    if (type) {
      libraryStatus.classList.add(
        `is-${type}`
      );
    }
  }


  /* =======================================================
     ESCAPE HTML
     ======================================================= */

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );
  }


  /* =======================================================
     DATE FORMAT
     ======================================================= */

  function formatDate(value) {
    if (!value) {
      return "—";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "—";
    }

    return new Intl.DateTimeFormat(
      undefined,
      {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }
    ).format(date);
  }


  /* =======================================================
     LABEL HELPERS
     ======================================================= */

  function formatType(type) {
    const labels = {
      story: "Story",
      video: "Video",
      image: "Image",
      music: "Music",
      document: "Document"
    };

    return labels[type] || type || "—";
  }


  function formatLanguage(language) {
    const labels = {
      en: "English",
      tr: "Turkish",
      hr: "Croatian",
      fr: "French",
      es: "Spanish"
    };

    return labels[language] ||
      language ||
      "—";
  }


  function formatStatus(status) {
    const labels = {
      draft: "Draft",
      pending: "Pending",
      published: "Published",
      archived: "Archived"
    };

    return labels[status] ||
      status ||
      "—";
  }


  function getStatusClass(status) {
    const allowed = [
      "draft",
      "pending",
      "published",
      "archived"
    ];

    return allowed.includes(status)
      ? status
      : "draft";
  }


  /* =======================================================
     DATABASE QUERY
     ======================================================= */

  async function loadItems() {
    if (!supabaseClient) {
      throw new Error(
        "Supabase client is unavailable."
      );
    }

    const {
      data,
      error
    } = await supabaseClient
      .from("content_items")
      .select(
        "id, title, type, language, category, status, file_path, created_at, updated_at"
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

    return Array.isArray(data)
      ? data
      : [];
      }

    /* =======================================================
     FILTERING
     ======================================================= */

  function applyFilters() {
    const search =
      librarySearch
        ? librarySearch.value
            .trim()
            .toLowerCase()
        : "";

    const status =
      libraryStatusFilter
        ? libraryStatusFilter.value
        : "all";

    const type =
      libraryTypeFilter
        ? libraryTypeFilter.value
        : "all";

    const language =
      libraryLanguageFilter
        ? libraryLanguageFilter.value
        : "all";


    filteredItems =
      allItems.filter((item) => {

        const title =
          String(
            item.title || ""
          ).toLowerCase();

        const matchesSearch =
          !search ||
          title.includes(search);

        const matchesStatus =
          status === "all" ||
          item.status === status;

        const matchesType =
          type === "all" ||
          item.type === type;

        const matchesLanguage =
          language === "all" ||
          item.language === language;

        return (
          matchesSearch &&
          matchesStatus &&
          matchesType &&
          matchesLanguage
        );
      });


    renderLibrary();
  }


  /* =======================================================
     LIBRARY RENDERING
     ======================================================= */

  function renderLibrary() {
    if (!libraryList) {
      return;
    }

    libraryList.innerHTML = "";

    if (libraryEmpty) {
      libraryEmpty.hidden =
        filteredItems.length !== 0;
    }

    if (!filteredItems.length) {
      return;
    }


    const fragment =
      document.createDocumentFragment();


    filteredItems.forEach((item) => {

      const article =
        document.createElement("article");

      article.className =
        "library-item";

      article.dataset.contentId =
        item.id;


      const main =
        document.createElement("div");

      main.className =
        "library-item-main";


      const title =
        document.createElement("h3");

      title.className =
        "library-item-title";

      title.textContent =
        item.title || "Untitled";


      const meta =
        document.createElement("div");

      meta.className =
        "library-item-meta";


      const typeBadge =
        document.createElement("span");

      typeBadge.className =
        "admin-badge";

      typeBadge.textContent =
        formatType(item.type);


      const languageBadge =
        document.createElement("span");

      languageBadge.className =
        "admin-badge";

      languageBadge.textContent =
        formatLanguage(
          item.language
        );


      const statusBadge =
        document.createElement("span");

      statusBadge.className =
        `admin-badge admin-badge-${getStatusClass(
          item.status
        )}`;

      statusBadge.textContent =
        formatStatus(
          item.status
        );


      const categoryBadge =
        document.createElement("span");

      categoryBadge.className =
        "admin-badge";

      categoryBadge.textContent =
        item.category ||
        "Uncategorized";


      const dateBadge =
        document.createElement("span");

      dateBadge.className =
        "admin-badge";

      dateBadge.textContent =
        formatDate(
          item.updated_at ||
          item.created_at
        );


      meta.append(
        typeBadge,
        languageBadge,
        statusBadge,
        categoryBadge,
        dateBadge
      );


      main.append(
        title,
        meta
      );


      const actions =
        document.createElement("div");

      actions.className =
        "library-item-actions";


      const editButton =
        document.createElement("button");

      editButton.type = "button";

      editButton.className =
        "admin-button admin-button-secondary";

      editButton.dataset.action =
        "edit";

      editButton.dataset.contentId =
        item.id;

      editButton.textContent =
        "Edit";


      const deleteButton =
        document.createElement("button");

      deleteButton.type = "button";

      deleteButton.className =
        "admin-button admin-button-secondary";

      deleteButton.dataset.action =
        "delete";

      deleteButton.dataset.contentId =
        item.id;

      deleteButton.textContent =
        "Delete";


      actions.append(
        editButton,
        deleteButton
      );


      article.append(
        main,
        actions
      );

      fragment.appendChild(
        article
      );
    });


    libraryList.appendChild(
      fragment
    );
  }


  /* =======================================================
     LOAD & REFRESH
     ======================================================= */

  async function refreshLibrary() {
    if (loading) {
      return filteredItems;
    }

    if (!supabaseClient) {
      setLibraryStatus(
        "Supabase is unavailable.",
        "error"
      );

      return [];
    }

    loading = true;

    if (libraryRefreshButton) {
      libraryRefreshButton.disabled =
        true;

      libraryRefreshButton.textContent =
        "Refreshing…";
    }

    setLibraryStatus(
      "Loading content library…",
      "warning"
    );

    try {
      allItems =
        await loadItems();

      applyFilters();

      setLibraryStatus(
        `${allItems.length} content item${
          allItems.length === 1
            ? ""
            : "s"
        } loaded.`,
        "success"
      );

      window.dispatchEvent(
        new CustomEvent(
          "echoes:library-updated",
          {
            detail: {
              items: [
                ...allItems
              ]
            }
          }
        )
      );

      return [
        ...filteredItems
      ];

    } catch (error) {

      console.error(
        "Echoes Admin V2: Library load failed.",
        error
      );

      allItems = [];
      filteredItems = [];

      renderLibrary();

      setLibraryStatus(
        "Unable to load the content library.",
        "error"
      );

      window.dispatchEvent(
        new CustomEvent(
          "echoes:library-error",
          {
            detail: {
              error
            }
          }
        )
      );

      return [];

    } finally {
      loading = false;

      if (libraryRefreshButton) {
        libraryRefreshButton.disabled =
          false;

        libraryRefreshButton.textContent =
          "Refresh";
      }
    }
    }

    /* =======================================================
     ACTION REQUESTS
     ======================================================= */

  function requestEdit(id) {
    if (!id) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent(
        "echoes:content-edit-request",
        {
          detail: {
            id
          }
        }
      )
    );
  }


  function requestDelete(id) {
    if (!id) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent(
        "echoes:content-delete-request",
        {
          detail: {
            id
          }
        }
      )
    );
  }


  /* =======================================================
     LIBRARY ACTION HANDLER
     ======================================================= */

  function handleLibraryAction(event) {
    const button =
      event.target.closest(
        "button[data-action]"
      );

    if (!button) {
      return;
    }

    const action =
      button.dataset.action;

    const contentId =
      button.dataset.contentId;

    if (!contentId) {
      return;
    }

    if (action === "edit") {
      requestEdit(contentId);
      return;
    }

    if (action === "delete") {
      requestDelete(contentId);
    }
  }


  /* =======================================================
     FILTER EVENTS
     ======================================================= */

  function registerFilterEvents() {

    if (librarySearch) {
      librarySearch.addEventListener(
        "input",
        applyFilters
      );
    }

    if (libraryStatusFilter) {
      libraryStatusFilter.addEventListener(
        "change",
        applyFilters
      );
    }

    if (libraryTypeFilter) {
      libraryTypeFilter.addEventListener(
        "change",
        applyFilters
      );
    }

    if (libraryLanguageFilter) {
      libraryLanguageFilter.addEventListener(
        "change",
        applyFilters
      );
    }
  }


  /* =======================================================
     DOM EVENTS
     ======================================================= */

  function registerDomEvents() {

    if (libraryRefreshButton) {
      libraryRefreshButton.addEventListener(
        "click",
        () => {
          refreshLibrary();
        }
      );
    }

    if (libraryList) {
      libraryList.addEventListener(
        "click",
        handleLibraryAction
      );
    }

    registerFilterEvents();
  }


  /* =======================================================
     APPLICATION EVENTS
     ======================================================= */

  function registerApplicationEvents() {

    window.addEventListener(
      "echoes:authenticated",
      () => {
        refreshLibrary();
      }
    );


    window.addEventListener(
      "echoes:signed-out",
      () => {
        allItems = [];
        filteredItems = [];

        renderLibrary();

        setLibraryStatus("");
      }
    );


    window.addEventListener(
      "echoes:content-saved",
      () => {
        refreshLibrary();
      }
    );


    window.addEventListener(
      "echoes:content-deleted",
      () => {
        refreshLibrary();
      }
    );
  }


  /* =======================================================
     INITIALIZATION
     ======================================================= */

  function initializeLibrary() {
    if (initialized) {
      return;
    }

    initialized = true;

    registerDomEvents();
    registerApplicationEvents();

    renderLibrary();
  }


  /* =======================================================
     PUBLIC API
     ======================================================= */

  window.ECHOES_ADMIN_LIBRARY = {

    async refresh() {
      return refreshLibrary();
    },

    applyFilters,

    render() {
      renderLibrary();
    },

    getAllItems() {
      return [
        ...allItems
      ];
    },

    getFilteredItems() {
      return [
        ...filteredItems
      ];
    },

    getItemById(id) {
      return (
        allItems.find(
          (item) =>
            item.id === id
        ) || null
      );
    },

    isLoading() {
      return loading;
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
      initializeLibrary,
      {
        once: true
      }
    );
  } else {
    initializeLibrary();
  }

})();
