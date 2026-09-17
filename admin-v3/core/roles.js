(function () {
    "use strict";

    /*
     * Echoes of Humanity — Admin V3
     * Roles Module
     *
     * Responsibility:
     * - Resolve the current authenticated admin
     * - Verify admin membership
     * - Load assigned roles
     * - Expose role information to other V3 modules
     *
     * This module does NOT handle:
     * - Authentication
     * - Permissions
     * - Navigation
     * - Content
     * - UI rendering
     */

    const db = window.db;

    if (!db) {
        console.error(
            "Admin V3 Roles: Supabase client is not available."
        );
        return;
    }

    const state = {
        initialized: false,
        userId: null,
        isAdmin: false,
        roles: []
    };

    async function getCurrentUser() {
        const {
            data,
            error
        } = await db.auth.getUser();

        if (error) {
            console.error(
                "Admin V3 Roles: Failed to get authenticated user.",
                error
            );

            return null;
        }

        return data.user || null;
    }

    async function verifyAdminUser(userId) {
        if (!userId) {
            return false;
        }

        const {
            data,
            error
        } = await db
            .from("admin_users")
            .select("user_id")
            .eq("user_id", userId)
            .maybeSingle();

        if (error) {
            console.error(
                "Admin V3 Roles: Failed to verify admin user.",
                error
            );

            return false;
        }

        return Boolean(data);
    }

    async function loadRolesForUser(userId) {
        if (!userId) {
            return [];
        }

        const {
            data: assignments,
            error: assignmentError
        } = await db
            .from("admin_user_roles")
            .select("role_id")
            .eq("user_id", userId);

        if (assignmentError) {
            console.error(
                "Admin V3 Roles: Failed to load role assignments.",
                assignmentError
            );

            throw assignmentError;
        }

        if (!assignments || assignments.length === 0) {
            return [];
        }

        const roleIds = assignments
            .map(function (assignment) {
                return assignment.role_id;
            })
            .filter(Boolean);

        if (roleIds.length === 0) {
            return [];
        }

        const {
            data: roles,
            error: roleError
        } = await db
            .from("admin_roles")
            .select(
                "id, name, slug, description, created_at"
            )
            .in("id", roleIds)
            .order("name", {
                ascending: true
            });

        if (roleError) {
            console.error(
                "Admin V3 Roles: Failed to load roles.",
                roleError
            );

            throw roleError;
        }

        return roles || [];
    }

    async function initialize() {
        if (state.initialized) {
            return getState();
        }

        const user = await getCurrentUser();

        if (!user) {
            state.initialized = true;
            state.userId = null;
            state.isAdmin = false;
            state.roles = [];

            return getState();
        }

        state.userId = user.id;

        state.isAdmin =
            await verifyAdminUser(user.id);

        if (!state.isAdmin) {
            state.roles = [];
            state.initialized = true;

            return getState();
        }

        state.roles =
            await loadRolesForUser(user.id);

        state.initialized = true;

        return getState();
    }

    function getState() {
        return {
            initialized: state.initialized,
            userId: state.userId,
            isAdmin: state.isAdmin,
            roles: [...state.roles]
        };
    }

    function getRoles() {
        return [...state.roles];
    }

    function hasRole(roleSlug) {
        if (!roleSlug) {
            return false;
        }

        return state.roles.some(function (role) {
            return role.slug === roleSlug;
        });
    }

    function isSuperAdmin() {
        return hasRole("super_admin");
    }

    function reset() {
        state.initialized = false;
        state.userId = null;
        state.isAdmin = false;
        state.roles = [];
    }

    window.EchoesAdminRoles = {
        initialize,
        getState,
        getRoles,
        hasRole,
        isSuperAdmin,
        reset
    };
})();
