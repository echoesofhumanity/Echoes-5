(function () {
    "use strict";

    const state = {
        items: [],
        filters: {
            search: "",
            status: "",
            type: "",
            language: "",
            categoryId: "",
            featured: null
        },
        initialized: false,
        loading: false,
        uiBound: false,
        selectedItem: null
    };

    const LANGUAGES = [
        ["en", "English"],
        ["tr", "Turkish"],
        ["es", "Spanish"],
        ["fr", "French"],
        ["de", "German"],
        ["ru", "Russian"]
    ];

    function requireContentModule() {
        if (!window.EchoesAdminContent) {
            throw new Error(
                "Admin V3 Library: Content module is not available."
            );
        }

        return window.EchoesAdminContent;
    }

    function getElement(id) {
        return document.getElementById(id);
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value)
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

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return date.toLocaleString();
    }

    function canManage() {
        return Boolean(
            window.EchoesAdminPermissions &&
            window.EchoesAdminPermissions.hasPermission(
                "content.manage"
            )
        );
    }

    function normalizeFilters(filters) {
        const source = filters || {};

        return {
            search:
                typeof source.search === "string"
                    ? source.search.trim()
                    : "",

            status: source.status || "",
            type: source.type || "",
            language: source.language || "",
            categoryId: source.categoryId || "",

            featured:
                source.featured === true ||
                source.featured === "true"
                    ? true
                    : source.featured === false ||
                      source.featured === "false"
                        ? false
                        : null
        };
    }

    function applySearch(items, search) {
        if (!search) {
            return items;
        }

        const query = search.toLowerCase();

        return items.filter(function (item) {
            const searchableText = [
                item.title,
                item.slug,
                item.subtitle,
                item.summary,
                item.body,
                item.language,
                item.region_code
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return searchableText.includes(query);
        });
    }

    async function load(filters) {
        const content = requireContentModule();

        state.loading = true;

        try {
            state.filters = normalizeFilters(filters);

            const queryFilters = {
                status: state.filters.status || undefined,
                type: state.filters.type || undefined,
                language: state.filters.language || undefined,
                categoryId: state.filters.categoryId || undefined,
                featured:
                    state.filters.featured === null
                        ? undefined
                        : state.filters.featured
            };

            const items = await content.loadContent(queryFilters);

            state.items = applySearch(
                items,
                state.filters.search
            );

            return getItems();
        } finally {
            state.loading = false;
        }
    }

    async function refresh() {
        return load(state.filters);
    }

    function setFilters(filters) {
        state.filters = normalizeFilters(filters);

        return getState();
    }

    function clearFilters() {
        state.filters = {
            search: "",
            status: "",
            type: "",
            language: "",
            categoryId: "",
            featured: null
        };

        return refresh();
    }

    function getItems() {
        return state.items.slice();
    }

    function getFilters() {
        return Object.assign({}, state.filters);
    }

    function getItemById(id) {
        if (!id) {
            return null;
        }

        return (
            state.items.find(function (item) {
                return item.id === id;
            }) || null
        );
    }

    async function openItem(id) {
        const content = requireContentModule();
        const item = await content.getContentById(id);

        state.selectedItem = item;

        return item;
    }

    function getCounts() {
        const counts = {
            total: state.items.length,
            draft: 0,
            review: 0,
            published: 0,
            archived: 0
        };

        state.items.forEach(function (item) {
            if (
                Object.prototype.hasOwnProperty.call(
                    counts,
                    item.status
                )
            ) {
                counts[item.status] += 1;
            }
        });

        return counts;
    }

    function getTypes() {
        const content = requireContentModule();
        return content.getTypes();
    }

    function getStatuses() {
        const content = requireContentModule();
        return content.getStatuses();
    }

    function isLoading() {
        return state.loading;
    }

    function getState() {
        return {
            items: state.items.slice(),
            filters: Object.assign({}, state.filters),
            initialized: state.initialized,
            loading: state.loading,
            selectedItem: state.selectedItem
        };
    }

    function showMessage(message, isError) {
        const element = getElement("libraryMessage");

        if (!element) {
            return;
        }

        element.textContent = message || "";
        element.className =
            isError
                ? "library-message error"
                : "library-message";
    }

    function readUiFilters() {
        const featuredValue =
            getElement("libraryFeatured").value;

        return normalizeFilters({
            search: getElement("librarySearch").value,
            status: getElement("libraryStatus").value,
            type: getElement("libraryType").value,
            language: getElement("libraryLanguage").value,
            categoryId: getElement("libraryCategory").value,
            featured: featuredValue
        });
    }

    function syncUiFilters() {
        const filters = state.filters;

        getElement("librarySearch").value = filters.search;
        getElement("libraryStatus").value = filters.status;
        getElement("libraryType").value = filters.type;
        getElement("libraryLanguage").value = filters.language;
        getElement("libraryCategory").value = filters.categoryId;
        getElement("libraryFeatured").value =
            filters.featured === null
                ? ""
                : String(filters.featured);
    }

    function renderCategoryOptions(categories) {
        const select = getElement("libraryCategory");

        if (!select) {
            return;
        }

        const current = state.filters.categoryId;

        select.innerHTML =
            '<option value="">All Categories</option>';

        (categories || [])
            .slice()
            .sort(function (a, b) {
                return a.name.localeCompare(b.name);
            })
            .forEach(function (category) {
                const option =
                    document.createElement("option");

                option.value = category.id;
                option.textContent =
                    category.name;

                select.appendChild(option);
            });

        select.value = current;
    }

    function renderStats() {
        const counts = getCounts();
        const container = getElement("libraryStats");

        if (!container) {
            return;
        }

        const stats = [
            ["Total", counts.total],
            ["Draft", counts.draft],
            ["Review", counts.review],
            ["Published", counts.published],
            ["Archived", counts.archived]
        ];

        container.innerHTML = stats.map(function (entry) {
            return (
                '<div class="library-stat">' +
                    "<strong>" +
                        escapeHtml(entry[1]) +
                    "</strong>" +
                    "<span>" +
                        escapeHtml(entry[0]) +
                    "</span>" +
                "</div>"
            );
        }).join("");
    }

    function renderList() {
        const container = getElement("libraryList");

        if (!container) {
            return;
        }

        if (!state.items.length) {
            container.innerHTML =
                '<div class="library-empty">No content records match the current filters.</div>';

            return;
        }

        const manageable = canManage();

        container.innerHTML =
            state.items.map(function (item) {
                const title =
                    item.title || "(Untitled)";

                const subtitle =
                    item.subtitle || item.slug || "No subtitle";

                const actions =
                    manageable
                        ? (
                            '<div class="library-item-actions">' +
                                '<button type="button" class="action-button" data-library-action="details" data-content-id="' +
                                    escapeHtml(item.id) +
                                '">View Details</button>' +
                                '<button type="button" class="action-button" data-library-action="edit" data-content-id="' +
                                    escapeHtml(item.id) +
                                '">Edit</button>' +
                                '<button type="button" class="action-button" data-library-action="review" data-content-id="' +
                                    escapeHtml(item.id) +
                                '">Move to Review</button>' +
                                '<button type="button" class="action-button primary" data-library-action="publish" data-content-id="' +
                                    escapeHtml(item.id) +
                                '">Publish</button>' +
                                '<button type="button" class="action-button" data-library-action="archive" data-content-id="' +
                                    escapeHtml(item.id) +
                                '">Archive</button>' +
                                '<button type="button" class="action-button danger" data-library-action="delete" data-content-id="' +
                                    escapeHtml(item.id) +
                                '">Delete</button>' +
                            "</div>"
                        )
                        : (
                            '<div class="library-item-actions">' +
                                '<button type="button" class="action-button" data-library-action="details" data-content-id="' +
                                    escapeHtml(item.id) +
                                '">View Details</button>' +
                            "</div>"
                        );

                return (
                    '<article class="library-item">' +
                        '<div class="library-item-header">' +
                            "<div>" +
                                '<h2 class="library-item-title">' +
                                    escapeHtml(title) +
                                "</h2>" +
                                '<div class="library-item-subtitle">' +
                                    escapeHtml(subtitle) +
                                "</div>" +
                            "</div>" +
                        "</div>" +
                        '<div class="library-item-meta">' +
                            "<span>Status: " +
                                escapeHtml(item.status || "—") +
                            "</span>" +
                            "<span>Type: " +
                                escapeHtml(item.type || "—") +
                            "</span>" +
                            "<span>Language: " +
                                escapeHtml(item.language || "—") +
                            "</span>" +
                            "<span>Region: " +
                                escapeHtml(item.region_code || "—") +
                            "</span>" +
                            "<span>Featured: " +
                                escapeHtml(item.featured ? "Yes" : "No") +
                            "</span>" +
                            "<span>Updated: " +
                                escapeHtml(formatDate(item.updated_at)) +
                            "</span>" +
                        "</div>" +
                        actions +
                    "</article>"
                );
            }).join("");
    }

    function renderDetail(item) {
        const container = getElement("libraryDetail");

        if (!container) {
            return;
        }

        if (!item) {
            container.hidden = true;
            container.innerHTML = "";
            return;
        }

        container.hidden = false;
        container.innerHTML =
            '<h2 class="panel-title">Content Details</h2>' +
            '<div class="library-detail-grid">' +
                detailRow("Title", item.title) +
                detailRow("Slug", item.slug) +
                detailRow("Subtitle", item.subtitle) +
                detailRow("Type", item.type) +
                detailRow("Language", item.language) +
                detailRow("Region", item.region_code) +
                detailRow("Status", item.status) +
                detailRow("Featured", item.featured ? "Yes" : "No") +
                detailRow("Category ID", item.category_id) +
                detailRow("Tags", Array.isArray(item.tags) ? item.tags.join(", ") : item.tags) +
                detailRow("Published", formatDate(item.published_at)) +
                detailRow("Created", formatDate(item.created_at)) +
                detailRow("Updated", formatDate(item.updated_at)) +
                detailRow("Summary", item.summary) +
                detailRow("Body", item.body) +
                detailRow("Cover Image URL", item.cover_image_url) +
                detailRow("File Path", item.file_path) +
            "</div>";
    }

    function detailRow(label, value) {
        return (
            '<div class="library-detail-row">' +
                "<strong>" +
                    escapeHtml(label) +
                "</strong>" +
                "<span>" +
                    escapeHtml(value || "—") +
                "</span>" +
            "</div>"
        );
    }

    async function loadAndRender() {
        showMessage("Loading content...");

        try {
            await load(readUiFilters());
            renderStats();
            renderList();
            showMessage(
                state.items.length +
                " content record(s) loaded."
            );
        } catch (error) {
            console.error(
                "Admin V3 Library: Failed to load library.",
                error
            );

            renderStats();
            renderList();
            showMessage(
                error && error.message
                    ? error.message
                    : "Library could not be loaded.",
                true
            );
        }
    }

    async function handleAction(action, id) {
        const content = requireContentModule();

        if (!id) {
            return;
        }

        if (action === "details") {
            try {
                const item = await openItem(id);
                renderDetail(item);
                getElement("libraryDetail").scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            } catch (error) {
                showMessage(
                    error && error.message
                        ? error.message
                        : "Content details could not be loaded.",
                    true
                );
            }

            return;
        }

        if (action === "edit") {
            if (!canManage()) {
                showMessage(
                    "Content management permission is required.",
                    true
                );

                return;
            }

            try {
                const item = await openItem(id);

                if (window.EchoesAdminContent) {
                    window.EchoesAdminContent.setCurrentItem(item);
                }

                if (
                    window.EchoesAdminNavigation &&
                    typeof window.EchoesAdminNavigation.openModule === "function"
                ) {
                    window.EchoesAdminNavigation.openModule("content");
                }

                document.dispatchEvent(
                    new CustomEvent("echoes-admin-edit-content", {
                        detail: {
                            item: item
                        }
                    })
                );
            } catch (error) {
                console.error(
                    "Admin V3 Library: Edit action failed.",
                    error
                );

                showMessage(
                    error && error.message
                        ? error.message
                        : "Content could not be opened for editing.",
                    true
                );
            }

            return;
        }

        if (!canManage()) {
            showMessage(
                "Content management permission is required.",
                true
            );

            return;
        }

        try {
            if (action === "review") {
                await content.updateStatus(id, "review");
            } else if (action === "publish") {
                await content.updateStatus(id, "published");
            } else if (action === "archive") {
                await content.updateStatus(id, "archived");
            } else if (action === "delete") {
                if (
                    !window.confirm(
                        "Delete this content record permanently?"
                    )
                ) {
                    return;
                }

                await content.deleteContent(id);
            } else {
                return;
            }

            state.selectedItem = null;
            renderDetail(null);
            await loadAndRender();
            showMessage("Content updated successfully.");
        } catch (error) {
            console.error(
                "Admin V3 Library: Action failed.",
                error
            );

            showMessage(
                error && error.message
                    ? error.message
                    : "Content action failed.",
                true
            );
        }
    }

    async function loadCategories() {
        if (!window.EchoesAdminCategories) {
            return;
        }

        try {
            const categories =
                await window.EchoesAdminCategories.loadCategories();

            renderCategoryOptions(categories);
        } catch (error) {
            console.error(
                "Admin V3 Library: Failed to load categories.",
                error
            );
        }
    }

    function bindUi() {
        if (state.uiBound) {
            return;
        }

        const applyButton =
            getElement("libraryApplyFiltersButton");

        const clearButton =
            getElement("libraryClearFiltersButton");

        const refreshButton =
            getElement("libraryRefreshButton");

        const list =
            getElement("libraryList");

        if (
            !applyButton ||
            !clearButton ||
            !refreshButton ||
            !list
        ) {
            throw new Error(
                "Admin V3 Library: Required UI elements are missing."
            );
        }

        applyButton.addEventListener(
            "click",
            loadAndRender
        );

        clearButton.addEventListener(
            "click",
            async function () {
                await clearFilters();
                syncUiFilters();
                renderStats();
                renderList();
                showMessage(
                    state.items.length +
                    " content record(s) loaded."
                );
            }
        );

        refreshButton.addEventListener(
            "click",
            loadAndRender
        );

        list.addEventListener(
            "click",
            function (event) {
                const button =
                    event.target.closest(
                        "[data-library-action]"
                    );

                if (!button) {
                    return;
                }

                handleAction(
                    button.dataset.libraryAction,
                    button.dataset.contentId
                );
            }
        );

        state.uiBound = true;
    }

    async function initializeUI() {
        bindUi();
        syncUiFilters();
        await loadCategories();
        await loadAndRender();
    }

    async function initialize() {
        if (state.initialized) {
            return getState();
        }

        requireContentModule();

        state.initialized = true;

        return getState();
    }

    window.EchoesAdminLibrary = {
        initialize,
        initializeUI,
        load,
        refresh,
        setFilters,
        clearFilters,
        getItems,
        getFilters,
        getItemById,
        openItem,
        getCounts,
        getTypes,
        getStatuses,
        isLoading,
        getState
    };

    document.addEventListener(
        "echoes-admin-ready",
        function () {
            initializeUI().catch(function (error) {
                console.error(
                    "Admin V3 Library: UI initialization failed.",
                    error
                );
                showMessage(
                    error && error.message
                        ? error.message
                        : "Library UI could not be initialized.",
                    true
                );
            });
        }
    );

    document.addEventListener(
        "echoes-admin-module-change",
        function (event) {
            if (
                !event.detail ||
                event.detail.moduleId !== "library"
            ) {
                return;
            }

            initializeUI().catch(function (error) {
                console.error(
                    "Admin V3 Library: Module initialization failed.",
                    error
                );
                showMessage(
                    error && error.message
                        ? error.message
                        : "Library could not be loaded.",
                    true
                );
            });
        }
    );
})();