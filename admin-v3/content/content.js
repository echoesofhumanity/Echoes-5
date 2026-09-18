(function () {
    "use strict";

    const db = window.db;

    if (!db) {
        console.error(
            "Admin V3 Content: Supabase client is not available."
        );
        return;
    }

    const state = {
        items: [],
        currentItem: null,
        initialized: false,
        loading: false
    };

    const CONTENT_TYPES = [
        "story",
        "essay",
        "manifesto",
        "poetry",
        "audio",
        "visual",
        "technical",
        "blueprint"
    ];

    const CONTENT_STATUSES = [
        "draft",
        "review",
        "published",
        "archived"
    ];

    function requireViewPermission() {
        if (!window.EchoesAdminPermissions) {
            throw new Error(
                "Admin V3 Content: Permissions module is not available."
            );
        }

        if (
            !window.EchoesAdminPermissions.hasPermission(
                "content.view"
            )
        ) {
            throw new Error(
                "Admin V3 Content: View permission is required."
            );
        }
    }

    function requireManagePermission() {
        if (!window.EchoesAdminPermissions) {
            throw new Error(
                "Admin V3 Content: Permissions module is not available."
            );
        }

        if (
            !window.EchoesAdminPermissions.hasPermission(
                "content.manage"
            )
        ) {
            throw new Error(
                "Admin V3 Content: Manage permission is required."
            );
        }
    }

    function validateType(type) {
        if (!CONTENT_TYPES.includes(type)) {
            throw new Error(
                "Admin V3 Content: Invalid content type."
            );
        }
    }

    function validateStatus(status) {
        if (!CONTENT_STATUSES.includes(status)) {
            throw new Error(
                "Admin V3 Content: Invalid content status."
            );
        }
    }

    function normalizeContentData(data) {
        if (!data || typeof data !== "object") {
            throw new Error(
                "Admin V3 Content: Content data is required."
            );
        }

        const normalized = {
            title: data.title || null,
            slug: data.slug || null,
            subtitle: data.subtitle || null,
            summary: data.summary || null,
            body: data.body || null,
            type: data.type || "story",
            status: data.status || "draft",
            language: data.language || null,
            region_code: data.region_code || null,
            category_id: data.category_id || null,
            tags: Array.isArray(data.tags)
                ? data.tags
                : [],
            cover_image_url:
                data.cover_image_url || null,
            file_path: data.file_path || null,
            featured: Boolean(data.featured),
            translation_group_id:
                data.translation_group_id || null
        };

        validateType(normalized.type);
        validateStatus(normalized.status);

        if (!normalized.title) {
            throw new Error(
                "Admin V3 Content: Title is required."
            );
        }

        if (!normalized.slug) {
            throw new Error(
                "Admin V3 Content: Slug is required."
            );
        }

        return normalized;
    }

    async function loadContent(options) {
        requireViewPermission();

        const settings = options || {};

        state.loading = true;

        try {
            let query = db
                .from("content_items")
                .select(`
                    id,
                    title,
                    slug,
                    subtitle,
                    summary,
                    body,
                    type,
                    status,
                    language,
                    region_code,
                    category_id,
                    tags,
                    cover_image_url,
                    file_path,
                    featured,
                    views_count,
                    published_at,
                    created_at,
                    updated_at,
                    translation_group_id
                `)
                .order("created_at", {
                    ascending: false
                });

            if (settings.status) {
                validateStatus(settings.status);

                query = query.eq(
                    "status",
                    settings.status
                );
            }

            if (settings.type) {
                validateType(settings.type);

                query = query.eq(
                    "type",
                    settings.type
                );
            }

            if (settings.language) {
                query = query.eq(
                    "language",
                    settings.language
                );
            }

            if (settings.categoryId) {
                query = query.eq(
                    "category_id",
                    settings.categoryId
                );
            }

            if (settings.featured !== undefined) {
                query = query.eq(
                    "featured",
                    Boolean(settings.featured)
                );
            }

            const { data, error } =
                await query;

            if (error) {
                console.error(
                    "Admin V3 Content: Failed to load content.",
                    error
                );

                throw error;
            }

            state.items = data || [];

            return getItems();
        } finally {
            state.loading = false;
        }
    }

    async function getContentById(id) {
        requireViewPermission();

        if (!id) {
            throw new Error(
                "Admin V3 Content: Content ID is required."
            );
        }

        const { data, error } =
            await db
                .from("content_items")
                .select(`
                    id,
                    title,
                    slug,
                    subtitle,
                    summary,
                    body,
                    type,
                    status,
                    language,
                    region_code,
                    category_id,
                    tags,
                    cover_image_url,
                    file_path,
                    featured,
                    views_count,
                    published_at,
                    created_at,
                    updated_at,
                    translation_group_id
                `)
                .eq("id", id)
                .single();

        if (error) {
            console.error(
                "Admin V3 Content: Failed to load content item.",
                error
            );

            throw error;
        }

        state.currentItem = data;

        return data;
    }

    async function createContent(data) {
        requireManagePermission();

        const content =
            normalizeContentData(data);

        const { data: created, error } =
            await db
                .from("content_items")
                .insert(content)
                .select()
                .single();

        if (error) {
            console.error(
                "Admin V3 Content: Failed to create content.",
                error
            );

            throw error;
        }

        state.currentItem = created;
        state.items = [
            created,
            ...state.items
        ];

        return created;
    }

    async function updateContent(id, data) {
        requireManagePermission();

        if (!id) {
            throw new Error(
                "Admin V3 Content: Content ID is required."
            );
        }

        const content =
            normalizeContentData(data);

        const { data: updated, error } =
            await db
                .from("content_items")
                .update(content)
                .eq("id", id)
                .select()
                .single();

        if (error) {
            console.error(
                "Admin V3 Content: Failed to update content.",
                error
            );

            throw error;
        }

        state.currentItem = updated;

        state.items = state.items.map(
            function (item) {
                return item.id === id
                    ? updated
                    : item;
            }
        );

        return updated;
    }

    async function updateStatus(id, status) {
        requireManagePermission();

        if (!id) {
            throw new Error(
                "Admin V3 Content: Content ID is required."
            );
        }

        validateStatus(status);

        const updateData = {
            status
        };

        if (status === "published") {
            updateData.published_at =
                new Date().toISOString();
        } else {
            updateData.published_at = null;
        }

        const { data: updated, error } =
            await db
                .from("content_items")
                .update(updateData)
                .eq("id", id)
                .select()
                .single();

        if (error) {
            console.error(
                "Admin V3 Content: Failed to update content status.",
                error
            );

            throw error;
        }

        state.currentItem = updated;

        state.items = state.items.map(
            function (item) {
                return item.id === id
                    ? updated
                    : item;
            }
        );

        return updated;
    }

    async function deleteContent(id) {
        requireManagePermission();

        if (!id) {
            throw new Error(
                "Admin V3 Content: Content ID is required."
            );
        }

        const { error } =
            await db
                .from("content_items")
                .delete()
                .eq("id", id);

        if (error) {
            console.error(
                "Admin V3 Content: Failed to delete content.",
                error
            );

            throw error;
        }

        state.items = state.items.filter(
            function (item) {
                return item.id !== id;
            }
        );

        if (
            state.currentItem &&
            state.currentItem.id === id
        ) {
            state.currentItem = null;
        }

        return true;
    }

    function setCurrentItem(item) {
        state.currentItem = item || null;

        return state.currentItem;
    }

    function getItems() {
        return state.items.slice();
    }

    function getCurrentItem() {
        return state.currentItem;
    }

    function getTypes() {
        return CONTENT_TYPES.slice();
    }

    function getStatuses() {
        return CONTENT_STATUSES.slice();
    }

    function isLoading() {
        return state.loading;
    }

    function getState() {
        return {
            items: state.items.slice(),
            currentItem: state.currentItem,
            initialized: state.initialized,
            loading: state.loading
        };
    }

    async function initialize() {
        if (state.initialized) {
            return getState();
        }

        if (!window.EchoesAdminPermissions) {
            throw new Error(
                "Admin V3 Content: Permissions module is not available."
            );
        }

        state.initialized = true;

        return getState();
    }

    window.EchoesAdminContent = {
        initialize,
        loadContent,
        getContentById,
        createContent,
        updateContent,
        updateStatus,
        deleteContent,
        setCurrentItem,
        getItems,
        getCurrentItem,
        getTypes,
        getStatuses,
        isLoading,
        getState
    };
})();
