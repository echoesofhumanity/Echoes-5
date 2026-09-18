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
        loading: false
    };

    function requireContentModule() {
        if (!window.EchoesAdminContent) {
            throw new Error(
                "Admin V3 Library: Content module is not available."
            );
        }

        return window.EchoesAdminContent;
    }

    function normalizeFilters(filters) {
        const source = filters || {};

        return {
            search:
                typeof source.search === "string"
                    ? source.search.trim()
                    : "",

            status:
                source.status || "",

            type:
                source.type || "",

            language:
                source.language || "",

            categoryId:
                source.categoryId || "",

            featured:
                source.featured === undefined ||
                source.featured === ""
                    ? null
                    : Boolean(source.featured)
        };
    }

    function applySearch(items, search) {
        if (!search) {
            return items;
        }

        const query =
            search.toLowerCase();

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
        const content =
            requireContentModule();

        state.loading = true;

        try {
            state.filters =
                normalizeFilters(filters);

            const queryFilters = {
                status:
                    state.filters.status || undefined,

                type:
                    state.filters.type || undefined,

                language:
                    state.filters.language || undefined,

                categoryId:
                    state.filters.categoryId || undefined,

                featured:
                    state.filters.featured === null
                        ? undefined
                        : state.filters.featured
            };

            const items =
                await content.loadContent(
                    queryFilters
                );

            state.items =
                applySearch(
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
        state.filters =
            normalizeFilters(filters);

        state.items =
            applySearch(
                state.items,
                state.filters.search
            );

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
        return Object.assign(
            {},
            state.filters
        );
    }

    function getItemById(id) {
        if (!id) {
            return null;
        }

        return (
            state.items.find(
                function (item) {
                    return item.id === id;
                }
            ) || null
        );
    }

    async function openItem(id) {
        const content =
            requireContentModule();

        return content.getContentById(id);
    }

    function getCounts() {
        const counts = {
            total: state.items.length,
            draft: 0,
            review: 0,
            published: 0,
            archived: 0
        };

        state.items.forEach(
            function (item) {
                if (
                    Object.prototype.hasOwnProperty.call(
                        counts,
                        item.status
                    )
                ) {
                    counts[item.status] += 1;
                }
            }
        );

        return counts;
    }

    function getTypes() {
        const content =
            requireContentModule();

        return content.getTypes();
    }

    function getStatuses() {
        const content =
            requireContentModule();

        return content.getStatuses();
    }

    function isLoading() {
        return state.loading;
    }

    function getState() {
        return {
            items:
                state.items.slice(),

            filters:
                Object.assign(
                    {},
                    state.filters
                ),

            initialized:
                state.initialized,

            loading:
                state.loading
        };
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
})();
