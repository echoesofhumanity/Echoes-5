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

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return date.toLocaleString();
    }

    function formatFileSize(value) {
        const bytes = Number(value || 0);

        if (!bytes) {
            return "—";
        }

        const units = ["B", "KB", "MB", "GB"];
        let size = bytes;
        let index = 0;

        while (size >= 1024 && index < units.length - 1) {
            size /= 1024;
            index += 1;
        }

        return size.toFixed(index === 0 ? 0 : 1) + " " + units[index];
    }

    function statCard(label, value) {
        return (
            '<div class="dashboard-stat">' +
                '<strong>' + escapeHtml(value) + '</strong>' +
                '<span>' + escapeHtml(label) + '</span>' +
            '</div>'
        );
    }

    function renderContentOverview(content) {
        if (!content) {
            return "";
        }

        return (
            '<div class="panel">' +
                '<h2 class="panel-title">Content Overview</h2>' +
                '<div class="dashboard-stat-grid">' +
                    statCard("Total Content", content.total) +
                    statCard("Draft", content.statuses.draft) +
                    statCard("Review", content.statuses.review) +
                    statCard("Published", content.statuses.published) +
                    statCard("Archived", content.statuses.archived) +
                '</div>' +
            '</div>'
        );
    }

    function renderMediaOverview(media) {
        if (!media) {
            return "";
        }

        return (
            '<div class="panel">' +
                '<h2 class="panel-title">Media Overview</h2>' +
                '<div class="dashboard-stat-grid">' +
                    statCard("Total Media", media.total) +
                    statCard("Images", media.types.image) +
                    statCard("Videos", media.types.video) +
                    statCard("Audio", media.types.audio) +
                    statCard("Documents", media.types.document) +
                '</div>' +
            '</div>'
        );
    }

    function renderSystemOverview(system) {
        if (!system) {
            return "";
        }

        return (
            '<div class="panel">' +
                '<h2 class="panel-title">System Overview</h2>' +
                '<div class="dashboard-stat-grid">' +
                    statCard("Categories", system.categories) +
                    statCard("Administrators", system.administrators) +
                    statCard("Roles", system.roles) +
                '</div>' +
            '</div>'
        );
    }

    function renderRecentContent(content) {
        if (!content) {
            return "";
        }

        const rows = content.recent || [];

        const items = rows.length
            ? rows.map(function (item) {
                return (
                    '<div class="library-item">' +
                        '<div class="library-item-header">' +
                            '<div>' +
                                '<h3 class="library-item-title">' +
                                    escapeHtml(item.title || "Untitled") +
                                '</h3>' +
                                '<div class="library-item-subtitle">' +
                                    escapeHtml(item.type || "—") +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                        '<div class="library-item-meta">' +
                            '<span>Status: ' +
                                escapeHtml(item.status || "—") +
                            '</span>' +
                            '<span>Language: ' +
                                escapeHtml(item.language || "—") +
                            '</span>' +
                            '<span>Updated: ' +
                                escapeHtml(formatDate(item.updated_at)) +
                            '</span>' +
                        '</div>' +
                    '</div>'
                );
            }).join("")
            : '<div class="library-empty">No recent content.</div>';

        return (
            '<div class="panel">' +
                '<h2 class="panel-title">Recent Content</h2>' +
                '<div class="library-list">' +
                    items +
                '</div>' +
            '</div>'
        );
    }

    function renderRecentMedia(media) {
        if (!media) {
            return "";
        }

        const rows = media.recent || [];

        const items = rows.length
            ? rows.map(function (item) {
                const name =
                    item.display_name ||
                    item.original_name ||
                    "Unnamed media";

                return (
                    '<div class="library-item">' +
                        '<div class="library-item-header">' +
                            '<div>' +
                                '<h3 class="library-item-title">' +
                                    escapeHtml(name) +
                                '</h3>' +
                                '<div class="library-item-subtitle">' +
                                    escapeHtml(item.media_type || "—") +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                        '<div class="library-item-meta">' +
                            '<span>Size: ' +
                                escapeHtml(formatFileSize(item.file_size)) +
                            '</span>' +
                            '<span>Type: ' +
                                escapeHtml(item.mime_type || "—") +
                            '</span>' +
                            '<span>Added: ' +
                                escapeHtml(formatDate(item.created_at)) +
                            '</span>' +
                        '</div>' +
                    '</div>'
                );
            }).join("")
            : '<div class="library-empty">No recent media.</div>';

        return (
            '<div class="panel">' +
                '<h2 class="panel-title">Recent Media</h2>' +
                '<div class="library-list">' +
                    items +
                '</div>' +
            '</div>'
        );
    }

    function renderSystemHealth() {
        const session =
            window.EchoesAdminAuth &&
            typeof window.EchoesAdminAuth.getSession === "function"
                ? window.EchoesAdminAuth.getSession()
                : null;

        const hasSession = Boolean(session);
        const rolesReady = Boolean(
            window.EchoesAdminRoles &&
            window.EchoesAdminRoles.getState &&
            window.EchoesAdminRoles.getState().initialized
        );
        const permissionsReady = Boolean(
            window.EchoesAdminPermissions &&
            window.EchoesAdminPermissions.getState &&
            window.EchoesAdminPermissions.getState().initialized
        );

        return (
            '<div class="panel">' +
                '<h2 class="panel-title">System Health</h2>' +
                '<div class="library-list">' +
                    '<div class="status"><strong>Database</strong><br>Connected and dashboard queries completed.</div>' +
                    '<div class="status"><strong>Authentication</strong><br>' +
                        (hasSession ? "Active session." : "No active session.") +
                    '</div>' +
                    '<div class="status"><strong>Authorization</strong><br>' +
                        (rolesReady && permissionsReady
                            ? "Roles and permissions loaded."
                            : "Authorization state is not fully initialized.") +
                    '</div>' +
                    '<div class="status"><strong>Storage</strong><br>Private bucket: echoes-media.</div>' +
                '</div>' +
            '</div>'
        );
    }

    function renderDashboard(data) {
        const section = document.getElementById("module-dashboard");

        if (!section) {
            throw new Error(
                "Admin V3 Dashboard: Dashboard module element was not found."
            );
        }

        const content = data && data.content;
        const media = data && data.media;
        const system = data && data.system;

        const overviewColumns = (
            '<div class="dashboard-overview-grid">' +
                renderContentOverview(content) +
                renderMediaOverview(media) +
            '</div>'
        );

        const recentColumns = (
            '<div class="dashboard-recent-grid">' +
                renderRecentContent(content) +
                renderRecentMedia(media) +
            '</div>'
        );

        const systemSection = renderSystemOverview(system);

        const healthSection = renderSystemHealth();

        const body = section.querySelector(".panel");

        if (!body) {
            throw new Error(
                "Admin V3 Dashboard: Dashboard render container was not found."
            );
        }

        body.innerHTML =
            '<div class="dashboard-content">' +
                overviewColumns +
                systemSection +
                recentColumns +
                healthSection +
            '</div>';
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
        const data = await loadDashboardData();
        renderDashboard(data);
        return data;
    }

    window.EchoesAdminDashboard = {
        initialize,
        loadDashboardData,
        getState
    };
})();