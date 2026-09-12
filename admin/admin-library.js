(() => {
  "use strict";

  /*
   * ============================================================
   * ECHOES OF HUMANITY — ADMIN CONTENT LIBRARY
   * ============================================================
   *
   * Responsibilities:
   * - Load content_items from Supabase.
   * - Render the content library.
   * - Search and filter content.
   * - Refresh the library.
   * - Open content in the Admin content editor.
   * - Delegate deletion to the central content module.
   * - React to content-created / updated events.
   * - Keep library state independent from Dashboard state.
   *
   * Database source:
   *   public.content_items
   *
   * Supported content types:
   *   story
   *   video
   *   image
   *   music
   *   document
   *
   * Supported languages:
   *   en, tr, hr, fr, es
   *
   * Supported statuses:
   *   draft, pending, published, archived
   * ============================================================
   */

  const MODULE_NAME = "Echoes Admin: Content Library";

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

  const TYPE_LABELS = {
    story: "Story",
    video: "Video",
    image: "Image",
    music: "Music",
    document: "Document"
  };

  const LANGUAGE_LABELS = {
    en: "English",
    tr: "Türkçe",
    hr: "Hrvatski",
    fr: "Français",
    es: "Español"
  };

  const STATUS_LABELS = {
    draft: "Draft",
    pending: "Pending",
    published: "Published",
    archived: "Archived"
  };

  const state = {
    initialized: false,
    loading: false,
    items: [],
    filteredItems: [],
    search: "",
    type: "",
    language: "",
    status: "",
    error: null
  };

  const refs = {};

  /* ============================================================
     DOM HELPERS
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
    refs.librarySection = firstExisting([
      "#librarySection",
      "#contentLibrarySection",
      '[data-section="library"]'
    ]);

    refs.libraryGrid = firstExisting([
      "#libraryGrid",
      "#contentLibrary",
      "#libraryList",
      '[data-library-list]'
    ]);

    refs.searchInput = firstExisting([
      "#librarySearch",
      "#contentSearch",
      "#librarySearchInput",
      '[data-library-search]'
    ]);

    refs.typeFilter = firstExisting([
      "#libraryTypeFilter",
      "#contentTypeFilter",
      "#typeFilter",
      '[data-library-type]'
    ]);

    refs.languageFilter = firstExisting([
      "#libraryLanguageFilter",
      "#contentLanguageFilter",
      "#languageFilter",
      '[data-library-language]'
    ]);

    refs.statusFilter = firstExisting([
      "#libraryStatusFilter",
      "#contentStatusFilter",
      "#statusFilter",
      '[data-library-status]'
    ]);

    refs.clearFiltersButton = firstExisting([
      "#clearLibraryFilters",
      "#clearFiltersButton",
      "#libraryClearFilters",
      '[data-clear-library-filters]'
    ]);

    refs.refreshButton = firstExisting([
      "#libraryRefreshButton",
      "#refreshLibraryButton",
      "#refreshContentButton",
      '[data-refresh-library]'
    ]);

    refs.statusMessage = firstExisting([
      "#libraryStatus",
      "#libraryMessage",
      "#libraryStatusMessage",
      '[data-library-status-message]'
    ]);

    refs.emptyState = firstExisting([
      "#libraryEmpty",
      "#libraryEmptyState",
      '[data-library-empty]'
    ]);

    refs.count = firstExisting([
      "#libraryCount",
      "#contentLibraryCount",
      '[data-library-count]'
    ]);
  }

  /* ============================================================
     GENERAL HELPERS
     ============================================================ */

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalize(value) {
    return String(value ?? "")
      .trim()
      .toLocaleLowerCase();
  }

  function formatDate(value) {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function formatLanguage(value) {
    return LANGUAGE_LABELS[value] || value || "—";
  }

  function formatType(value) {
    return TYPE_LABELS[value] || value || "—";
  }

  function formatStatus(value) {
    return STATUS_LABELS[value] || value || "—";
  }

  function getStatusClass(status) {
    switch (status) {
      case "published":
        return "published";

      case "pending":
        return "pending";

      case "archived":
        return "archived";

      case "draft":
      default:
        return "draft";
    }
  }

  function getTypeClass(type) {
    return SUPPORTED_TYPES.includes(type)
      ? type
      : "document";
  }

  function getSupabaseClient() {
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

  function getContentApi() {
    return window.ECHOES_ADMIN_CONTENT || null;
  }

  function emit(name, detail = {}) {
    document.dispatchEvent(
      new CustomEvent(name, {
        detail
      })
    );
  }

  function setStatus(message, type = "info") {
    if (!refs.statusMessage) {
      return;
    }

    refs.statusMessage.textContent = message || "";
    refs.statusMessage.dataset.status = type;
  }

  function setCount() {
    if (!refs.count) {
      return;
    }

    refs.count.textContent = String(state.filteredItems.length);
  }

  /* ============================================================
     AUTHORIZATION
     ============================================================ */

  function isAuthenticated() {
    const auth = window.ECHOES_ADMIN_AUTH;

    if (!auth) {
      return false;
    }

    if (typeof auth.isAuthenticated === "function") {
      return auth.isAuthenticated();
    }

    return Boolean(auth.currentUser);
  }

  /* ============================================================
     DATABASE
     ============================================================ */

  async function loadContent(options = {}) {
    const force = options.force === true;

    if (state.loading && !force) {
      return state.items;
    }

    const client = getSupabaseClient();

    if (!client) {
      state.error = "Supabase client is unavailable.";
      setStatus("Database connection is unavailable.", "error");
      render();

      return [];
    }

    if (!isAuthenticated()) {
      state.error = null;
      state.items = [];
      state.filteredItems = [];

      render();
      setStatus("Sign in to view the content library.", "info");

      return [];
    }

    state.loading = true;
    state.error = null;

    setStatus("Loading content library…", "loading");
    renderLoading();

    try {
      const { data, error } = await client
        .from("content_items")
        .select(
          [
            "id",
            "type",
            "title",
            "description",
            "language",
            "category",
            "tags",
            "file_path",
            "cover_path",
            "status",
            "author_id",
            "created_at",
            "updated_at",
            "published_at"
          ].join(",")
        )
        .order("created_at", {
          ascending: false
        });

      if (error) {
        throw error;
      }

      state.items = Array.isArray(data) ? data : [];
      state.error = null;

      applyFilters();

      setStatus(
        `${state.items.length} content item${state.items.length === 1 ? "" : "s"} loaded.`,
        "success"
      );

      emit("echoes:library-loaded", {
        items: state.items
      });

      return state.items;
    } catch (error) {
      console.error(`${MODULE_NAME}: Failed to load content.`, error);

      state.error =
        error?.message ||
        "The content library could not be loaded.";

      state.items = [];
      state.filteredItems = [];

      setStatus(
        state.error,
        "error"
      );

      render();

      return [];
    } finally {
      state.loading = false;
    }
  }

  /* ============================================================
     FILTERING
     ============================================================ */

  function applyFilters() {
    const search = normalize(state.search);
    const type = normalize(state.type);
    const language = normalize(state.language);
    const status = normalize(state.status);

    state.filteredItems = state.items.filter((item) => {
      if (type && normalize(item.type) !== type) {
        return false;
      }

      if (language && normalize(item.language) !== language) {
        return false;
      }

      if (status && normalize(item.status) !== status) {
        return false;
      }

      if (!search) {
        return true;
      }

      const searchableText = [
        item.title,
        item.description,
        item.category,
        item.type,
        item.language,
        item.status,
        ...(Array.isArray(item.tags) ? item.tags : [])
      ]
        .join(" ")
        .toLocaleLowerCase();

      return searchableText.includes(search);
    });

    render();
  }

  function clearFilters() {
    state.search = "";
    state.type = "";
    state.language = "";
    state.status = "";

    if (refs.searchInput) {
      refs.searchInput.value = "";
    }

    if (refs.typeFilter) {
      refs.typeFilter.value = "";
    }

    if (refs.languageFilter) {
      refs.languageFilter.value = "";
    }

    if (refs.statusFilter) {
      refs.statusFilter.value = "";
    }

    applyFilters();

    setStatus(
      `${state.items.length} content item${state.items.length === 1 ? "" : "s"} loaded.`,
      "success"
    );
  }

  /* ============================================================
     LOADING / EMPTY STATES
     ============================================================ */

  function renderLoading() {
    if (!refs.libraryGrid) {
      return;
    }

    refs.libraryGrid.innerHTML = `
      <div class="library-loading" data-library-loading>
        <div class="library-loading-spinner" aria-hidden="true"></div>
        <p>Loading content library…</p>
      </div>
    `;

    if (refs.emptyState) {
      refs.emptyState.hidden = true;
    }
  }

  function renderEmpty(message = "No content found.") {
    if (!refs.libraryGrid) {
      return;
    }

    refs.libraryGrid.innerHTML = `
      <div class="library-empty-state">
        <div class="library-empty-icon" aria-hidden="true">◌</div>
        <h3>${escapeHtml(message)}</h3>
        <p>
          Try changing the filters or create a new content item.
        </p>
      </div>
    `;

    if (refs.emptyState) {
      refs.emptyState.hidden = false;
    }
    }

    /* ============================================================
     CONTENT CARD
     ============================================================ */

  function renderCard(item) {
    const id = escapeHtml(item.id);
    const type = escapeHtml(item.type);
    const typeClass = getTypeClass(item.type);
    const statusClass = getStatusClass(item.status);

    const title = escapeHtml(
      item.title || "Untitled content"
    );

    const description = escapeHtml(
      item.description || ""
    );

    const language = escapeHtml(
      formatLanguage(item.language)
    );

    const category = escapeHtml(
      item.category || ""
    );

    const status = escapeHtml(
      formatStatus(item.status)
    );

    const createdAt = escapeHtml(
      formatDate(item.created_at)
    );

    const tags = Array.isArray(item.tags)
      ? item.tags
          .filter(Boolean)
          .slice(0, 5)
          .map(
            (tag) =>
              `<span class="library-tag">${escapeHtml(tag)}</span>`
          )
          .join("")
      : "";

    const mediaIndicator = item.file_path
      ? `
        <span class="library-media-indicator" title="Media attached">
          Media
        </span>
      `
      : "";

    return `
      <article
        class="library-card"
        data-content-id="${id}"
        data-content-type="${type}"
      >
        <div class="library-card-header">
          <span class="library-type-badge library-type-${typeClass}">
            ${escapeHtml(formatType(item.type))}
          </span>

          <span class="library-status-badge library-status-${statusClass}">
            ${status}
          </span>
        </div>

        <div class="library-card-body">
          <h3 class="library-card-title">
            ${title}
          </h3>

          ${
            description
              ? `
                <p class="library-card-description">
                  ${description}
                </p>
              `
              : ""
          }

          <div class="library-card-meta">
            <span>${language}</span>

            ${
              category
                ? `<span>${category}</span>`
                : ""
            }

            ${mediaIndicator}
          </div>

          ${
            tags
              ? `
                <div class="library-card-tags">
                  ${tags}
                </div>
              `
              : ""
          }

          <div class="library-card-date">
            Updated ${escapeHtml(formatDate(item.updated_at || item.created_at))}
          </div>
        </div>

        <div class="library-card-footer">
          <button
            type="button"
            class="admin-btn admin-btn-secondary library-edit-button"
            data-action="edit"
            data-content-id="${id}"
          >
            Edit
          </button>

          <button
            type="button"
            class="admin-btn admin-btn-danger library-delete-button"
            data-action="delete"
            data-content-id="${id}"
          >
            Delete
          </button>
        </div>
      </article>
    `;
  }

  function render() {
    if (!refs.libraryGrid) {
      return;
    }

    if (state.loading) {
      renderLoading();
      return;
    }

    if (state.error && state.items.length === 0) {
      refs.libraryGrid.innerHTML = `
        <div class="library-error-state">
          <div class="library-error-icon" aria-hidden="true">!</div>
          <h3>Content library unavailable</h3>
          <p>${escapeHtml(state.error)}</p>

          <button
            type="button"
            class="admin-btn admin-btn-secondary"
            data-action="refresh"
          >
            Try again
          </button>
        </div>
      `;

      if (refs.emptyState) {
        refs.emptyState.hidden = true;
      }

      setCount();
      return;
    }

    if (state.filteredItems.length === 0) {
      renderEmpty(
        state.items.length === 0
          ? "No content has been created yet."
          : "No content matches the current filters."
      );

      setCount();
      return;
    }

    if (refs.emptyState) {
      refs.emptyState.hidden = true;
    }

    refs.libraryGrid.innerHTML =
      state.filteredItems
        .map(renderCard)
        .join("");

    setCount();
  }

  /* ============================================================
     EDIT
     ============================================================ */

  function editContent(id) {
    const item = state.items.find(
      (content) => content.id === id
    );

    if (!item) {
      setStatus(
        "The selected content item could not be found.",
        "error"
      );

      return;
    }

    const contentApi = getContentApi();

    if (
      contentApi &&
      typeof contentApi.edit === "function"
    ) {
      contentApi.edit(item);
    }

    emit("echoes:edit-content", {
      content: item
    });

    /*
     * Navigation is intentionally event-driven.
     * admin.js owns section visibility.
     */
    emit("echoes:navigate", {
      section: "content"
    });
  }

  /* ============================================================
     DELETE
     ============================================================ */

  async function deleteContent(id) {
    const item = state.items.find(
      (content) => content.id === id
    );

    if (!item) {
      setStatus(
        "The selected content item could not be found.",
        "error"
      );

      return false;
    }

    const contentApi = getContentApi();

    if (
      !contentApi ||
      typeof contentApi.remove !== "function"
    ) {
      setStatus(
        "The content management module is unavailable.",
        "error"
      );

      return false;
    }

    const title =
      item.title || "this content item";

    const confirmed = window.confirm(
      `Delete "${title}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return false;
    }

    setStatus(
      `Deleting "${title}"…`,
      "loading"
    );

    try {
      const result = await contentApi.remove(id);

      /*
       * The central content module owns:
       * - database deletion
       * - storage cleanup
       * - cleanup warnings
       */

      if (!result || result.success !== true) {
        throw new Error(
          result?.message ||
          "The content item could not be deleted."
        );
      }

      state.items = state.items.filter(
        (content) => content.id !== id
      );

      applyFilters();

      setStatus(
        result.warning
          ? result.warning
          : `"${title}" was deleted.`,
        result.warning ? "warning" : "success"
      );

      emit("echoes:content-deleted", {
        id,
        content: item,
        result
      });

      return true;
    } catch (error) {
      console.error(
        `${MODULE_NAME}: Delete failed.`,
        error
      );

      setStatus(
        error?.message ||
          "The content item could not be deleted.",
        "error"
      );

      return false;
    }
  }

  /* ============================================================
     EVENT HANDLERS
     ============================================================ */

  function handleSearch(event) {
    state.search = event.target.value || "";
    applyFilters();
  }

  function handleTypeFilter(event) {
    state.type = event.target.value || "";
    applyFilters();
  }

  function handleLanguageFilter(event) {
    state.language = event.target.value || "";
    applyFilters();
  }

  function handleStatusFilter(event) {
    state.status = event.target.value || "";
    applyFilters();
  }

  async function handleRefresh() {
    await loadContent({
      force: true
    });
  }

  async function handleLibraryClick(event) {
    const actionElement =
      event.target.closest(
        "[data-action]"
      );

    if (!actionElement) {
      return;
    }

    const action =
      actionElement.dataset.action;

    const id =
      actionElement.dataset.contentId;

    if (action === "edit" && id) {
      editContent(id);
      return;
    }

    if (action === "delete" && id) {
      await deleteContent(id);
      return;
    }

    if (action === "refresh") {
      await handleRefresh();
    }
  }

  /* ============================================================
     GLOBAL EVENTS
     ============================================================ */

  function handleAuthenticated() {
    /*
     * Always reload after a successful authentication.
     * This prevents stale data after logout/login cycles.
     */
    loadContent({
      force: true
    });
  }

  function handleSignedOut() {
    state.items = [];
    state.filteredItems = [];
    state.error = null;

    render();

    setStatus(
      "Sign in to view the content library.",
      "info"
    );
  }

  function handleContentSaved() {
    /*
     * Do not trust a local copy after create/update.
     * Reload from the database so Library always reflects
     * the actual persisted state.
     */
    loadContent({
      force: true
    });
  }

  function handleContentDeleted(event) {
    const id = event?.detail?.id;

    if (!id) {
      return;
    }

    state.items = state.items.filter(
      (item) => item.id !== id
    );

    applyFilters();
  }

  function registerEvents() {
    if (refs.searchInput) {
      refs.searchInput.addEventListener(
        "input",
        handleSearch
      );
    }

    if (refs.typeFilter) {
      refs.typeFilter.addEventListener(
        "change",
        handleTypeFilter
      );
    }

    if (refs.languageFilter) {
      refs.languageFilter.addEventListener(
        "change",
        handleLanguageFilter
      );
    }

    if (refs.statusFilter) {
      refs.statusFilter.addEventListener(
        "change",
        handleStatusFilter
      );
    }

    if (refs.clearFiltersButton) {
      refs.clearFiltersButton.addEventListener(
        "click",
        clearFilters
      );
    }

    if (refs.refreshButton) {
      refs.refreshButton.addEventListener(
        "click",
        handleRefresh
      );
    }

    if (refs.libraryGrid) {
      refs.libraryGrid.addEventListener(
        "click",
        handleLibraryClick
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
     FILTER OPTION NORMALIZATION
     ============================================================ */

  function ensureSelectOptions(select, values, labels) {
    if (!select) {
      return;
    }

    const currentValue = select.value;

    /*
     * Keep the existing first option if it represents
     * "All" / "Any" / an empty selection.
     */
    const firstOption =
      select.querySelector(
        'option[value=""]'
      );

    select.innerHTML = "";

    if (firstOption) {
      select.appendChild(
        firstOption.cloneNode(true)
      );
    } else {
      const allOption =
        document.createElement("option");

      allOption.value = "";
      allOption.textContent = "All";

      select.appendChild(allOption);
    }

    values.forEach((value) => {
      const option =
        document.createElement("option");

      option.value = value;
      option.textContent =
        labels[value] || value;

      select.appendChild(option);
    });

    if (
      values.includes(currentValue)
    ) {
      select.value = currentValue;
    } else {
      select.value = "";
    }
  }

  function prepareFilters() {
    ensureSelectOptions(
      refs.typeFilter,
      SUPPORTED_TYPES,
      TYPE_LABELS
    );

    ensureSelectOptions(
      refs.languageFilter,
      SUPPORTED_LANGUAGES,
      LANGUAGE_LABELS
    );

    ensureSelectOptions(
      refs.statusFilter,
      SUPPORTED_STATUSES,
      STATUS_LABELS
    );
  }

  /* ============================================================
     INITIALIZATION
     ============================================================ */

  function initializeLibrary() {
    if (state.initialized) {
      return;
    }

    cacheDom();

    /*
     * Library section/grid may be temporarily absent during
     * page construction. The module remains safe and waits
     * for the actual DOM without throwing.
     */
    if (!refs.libraryGrid) {
      console.warn(
        `${MODULE_NAME}: Library container was not found.`
      );

      return;
    }

    prepareFilters();
    registerEvents();

    state.initialized = true;

    /*
     * If authentication has already completed before this
     * module initializes, load immediately.
     */
    if (isAuthenticated()) {
      loadContent({
        force: true
      });
    } else {
      setStatus(
        "Sign in to view the content library.",
        "info"
      );

      render();
    }

    emit("echoes:library-ready");
  }

  /* ============================================================
     PUBLIC API
     ============================================================ */

  window.ECHOES_ADMIN_LIBRARY = {
    load: loadContent,

    refresh: () =>
      loadContent({
        force: true
      }),

    render,

    applyFilters,

    clearFilters,

    getItems() {
      return [...state.items];
    },

    getFilteredItems() {
      return [...state.filteredItems];
    },

    getState() {
      return {
        initialized: state.initialized,
        loading: state.loading,
        itemCount: state.items.length,
        filteredCount: state.filteredItems.length,
        search: state.search,
        type: state.type,
        language: state.language,
        status: state.status,
        error: state.error
      };
    },

    edit: editContent,

    remove: deleteContent,

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
      initializeLibrary,
      {
        once: true
      }
    );
  } else {
    initializeLibrary();
  }

  /*
   * The Admin shell may initialize its modules after DOMContentLoaded.
   * This event provides a second safe initialization path without
   * creating duplicate listeners.
   */
  document.addEventListener(
    "echoes:admin-ready",
    initializeLibrary,
    {
      once: true
    }
  );
    /* ============================================================
     END OF ECHOES OF HUMANITY — ADMIN CONTENT LIBRARY
     ============================================================ */

})();
