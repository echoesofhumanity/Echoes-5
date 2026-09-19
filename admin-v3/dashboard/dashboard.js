(function () {
    "use strict";

    const db = window.db;

    if (!db) {
        console.error(
            "Admin V3 Dashboard: Supabase client is not available."
        );
        return;
    }

    const state = {
        initialized: false,
        loading: false,
        data: null
    };

    function getPermissions() {
        return window.EchoesAdminPermissions || null;
    }

    function canViewContent() {
        const permissions = getPermissions();

        return Boolean(
            permissions &&
            permissions.canView("content")
        );
    }

    function canViewMedia() {
        const permissions = getPermissions();

        return Boolean(
            permissions &&
            permissions.canView("media")
        );
    }

    async function countRows(table, column) {
        const { count, error } = await db
            .from(table)
            .select(column || "*", {
                count: "exact",
                head: true
            });

        if (error) {
            throw error;
        }

        return Number(count || 0);
    }

    async function countByValue(table, column, values) {
        const result = {};

        for (const value of values) {
            const { count, error } = await db
                .from(table)
                .select(column, {
                    count: "exact",
                    head: true
                })
                .eq(column, value);

            if (error) {
                throw error;
            }

            result[value] = Number(count || 0);
        }

        return result;
    }

    async function loadContentOverview() {
        if (!canViewContent()) {
            return null;
        }

        const [total, statuses, recent] = await Promise.all([
            countRows("content_items", "id"),
            countByValue(
                "content_items",
                "status",
                [
                    "draft",
                    "review",
                    "published",
                    "archived"
                ]
            ),
            db
                .from("content_items")
                .select(
                    "id,title,type,status,language,updated_at"
                )
                .order("updated_at", {
                    ascending: false
                })
                .limit(5)
        ]);

        if (recent.error) {
            throw recent.error;
        }

        return {
            total,
            statuses,
            recent: recent.data || []
        };
    }

    async function loadMediaOverview() {
        if (!canViewMedia()) {
            return null;
        }

        const [total, types, recent] = await Promise.all([
            countRows("media_assets", "id"),
            countByValue(
                "media_assets",
                "media_type",
                [
                    "image",
                    "video",
                    "audio",
                    "document"
                ]
            ),
            db
                .from("media_assets")
                .select(
                    "id,display_name,original_name,media_type,file_size,created_at,mime_type"
                )
                .order("created_at", {
                    ascending: false
                })
                .limit(5)
        ]);

        if (recent.error) {
            throw recent.error;
        }

        return {
            total,
            types,
            recent: recent.data || []
        };
    }

    async function loadSystemOverview() {
        const permissions = getPermissions();

        if (!permissions) {
            throw new Error(
                "Admin V3 Dashboard: Permissions module is not available."
            );
        }

        const isSuperAdmin =
            window.EchoesAdminRoles &&
            window.EchoesAdminRoles.isSuperAdmin();

        if (!isSuperAdmin) {
            return null;
        }

        const [categories, administrators, roles] =
            await Promise.all([
                countRows("categories", "id"),
                db
                    .from("admin_user_roles")
                    .select("user_id"),
                countRows("admin_roles", "id")
            ]);

        if (administrators.error) {
            throw administrators.error;
        }

        const administratorIds =
            new Set(
                (administrators.data || []).map(function (row) {
                    return row.user_id;
                })
            );

        return {
            categories,
            administrators: administratorIds.size,
            roles
        };
    }

    async function loadDashboardData() {
        if (state.loading) {
            return state.data;
        }

        state.loading = true;

        try {
            const [content, media, system] =
                await Promise.all([
                    loadContentOverview(),
                    loadMediaOverview(),
                    loadSystemOverview()
                ]);

            state.data = {
                content,
                media,
                system
            };

            state.initialized = true;

            return state.data;
        } finally {
            state.loading = false;
        }
    }

    function getState() {
        return {
            initialized: state.initialized,
            loading: state.loading,
            data: state.data
        };
    }

    async function initialize() {
        return loadDashboardData();
    }

    window.EchoesAdminDashboard = {
        initialize,
        loadDashboardData,
        getState
    };
})();