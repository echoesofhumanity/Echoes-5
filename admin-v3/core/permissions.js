(function () {
    "use strict";

    const db = window.db;

    if (!db) {
        console.error(
            "Admin V3 Permissions: Supabase client is not available."
        );
        return;
    }

    const state = {
        permissions: [],
        permissionSlugs: new Set(),
        initialized: false
    };

    async function loadPermissions() {
        if (!window.EchoesAdminRoles) {
            throw new Error(
                "Admin V3 Permissions: Roles module is not available."
            );
        }

        const roleState =
            window.EchoesAdminRoles.getState();

        if (!roleState || !Array.isArray(roleState.roles)) {
            throw new Error(
                "Admin V3 Permissions: Role state is not available."
            );
        }

        const roleIds =
            roleState.roles.map(function (role) {
                return role.id;
            });

        if (roleIds.length === 0) {
            state.permissions = [];
            state.permissionSlugs = new Set();
            state.initialized = true;

            return getState();
        }

        const { data, error } = await db
            .from("admin_role_permissions")
            .select(`
                role_id,
                permission_id,
                admin_permissions (
                    id,
                    name,
                    slug,
                    description
                )
            `)
            .in("role_id", roleIds);

        if (error) {
            console.error(
                "Admin V3 Permissions: Failed to load permissions.",
                error
            );

            throw error;
        }

        const permissionMap = new Map();

        (data || []).forEach(function (row) {
            const permission =
                row.admin_permissions;

            if (!permission) {
                return;
            }

            permissionMap.set(
                permission.id,
                permission
            );
        });

        state.permissions =
            Array.from(permissionMap.values());

        state.permissionSlugs =
            new Set(
                state.permissions.map(function (permission) {
                    return permission.slug;
                })
            );

        state.initialized = true;

        return getState();
    }

    function hasPermission(permissionSlug) {
        if (!permissionSlug) {
            return false;
        }

        return state.permissionSlugs.has(
            permissionSlug
        );
    }

    function hasAnyPermission(permissionSlugs) {
        if (!Array.isArray(permissionSlugs)) {
            return false;
        }

        return permissionSlugs.some(function (slug) {
            return hasPermission(slug);
        });
    }

    function hasAllPermissions(permissionSlugs) {
        if (!Array.isArray(permissionSlugs)) {
            return false;
        }

        return permissionSlugs.every(function (slug) {
            return hasPermission(slug);
        });
    }

    function canView(moduleSlug) {
        return hasPermission(
            moduleSlug + ".view"
        );
    }

    function canManage(moduleSlug) {
        return hasPermission(
            moduleSlug + ".manage"
        );
    }

    function getPermissions() {
        return state.permissions.slice();
    }

    function getState() {
        return {
            permissions:
                state.permissions.slice(),

            permissionSlugs:
                new Set(state.permissionSlugs),

            initialized:
                state.initialized
        };
    }

    async function initialize() {
        if (state.initialized) {
            return getState();
        }

        await loadPermissions();

        return getState();
    }

    window.EchoesAdminPermissions = {
        initialize,
        loadPermissions,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        canView,
        canManage,
        getPermissions,
        getState
    };
})();
