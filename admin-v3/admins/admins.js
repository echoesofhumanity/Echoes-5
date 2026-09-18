(function () {
    "use strict";

    const db = window.db;

    const state = {
        admins: [],
        roles: [],
        currentAdmin: null,
        initialized: false,
        loading: false,
        saving: false
    };

    if (!db) {
        console.error(
            "Admin V3 Admins: Supabase client is not available."
        );
        return;
    }

    function requireRolesModule() {
        if (!window.EchoesAdminRoles) {
            throw new Error(
                "Admin V3 Admins: Roles module is not available."
            );
        }
    }

    function requireSuperAdmin() {
        requireRolesModule();

        if (!window.EchoesAdminRoles.isSuperAdmin()) {
            throw new Error(
                "Admin V3 Admins: Super Admin access is required."
            );
        }
    }

    function validateUserId(userId) {
        if (
            typeof userId !== "string" ||
            !userId.trim()
        ) {
            throw new Error(
                "Admin V3 Admins: User ID is required."
            );
        }

        return userId.trim();
    }

    function validateRoleId(roleId) {
        if (
            typeof roleId !== "string" ||
            !roleId.trim()
        ) {
            throw new Error(
                "Admin V3 Admins: Role ID is required."
            );
        }

        return roleId.trim();
    }

    async function loadRoles() {
        requireSuperAdmin();

        const {
            data,
            error
        } = await db
            .from("admin_roles")
            .select(`
                id,
                name,
                slug,
                description,
                created_at
            `)
            .order("created_at", {
                ascending: true
            });

        if (error) {
            console.error(
                "Admin V3 Admins: Failed to load roles.",
                error
            );

            throw error;
        }

        state.roles = data || [];

        return getRoles();
    }

    async function loadAdmins() {
        requireSuperAdmin();

        state.loading = true;

        try {
            const {
                data,
                error
            } = await db
                .from("admin_user_roles")
                .select(`
                    user_id,
                    role_id,
                    created_at,
                    admin_roles (
                        id,
                        name,
                        slug,
                        description
                    )
                `)
                .order("created_at", {
                    ascending: true
                });

            if (error) {
                console.error(
                    "Admin V3 Admins: Failed to load admin assignments.",
                    error
                );

                throw error;
            }

            const assignments = data || [];

            const grouped = new Map();

            assignments.forEach(function (assignment) {
                const userId = assignment.user_id;

                if (!grouped.has(userId)) {
                    grouped.set(userId, {
                        user_id: userId,
                        roles: [],
                        created_at:
                            assignment.created_at
                    });
                }

                if (assignment.admin_roles) {
                    grouped
                        .get(userId)
                        .roles
                        .push(
                            Object.assign(
                                {},
                                assignment.admin_roles
                            )
                        );
                }
            });

            state.admins =
                Array.from(
                    grouped.values()
                );

            return getAdmins();
        } finally {
            state.loading = false;
        }
    }

    async function getAdminByUserId(userId) {
        requireSuperAdmin();

        const normalizedUserId =
            validateUserId(userId);

        const {
            data,
            error
        } = await db
            .from("admin_user_roles")
            .select(`
                user_id,
                role_id,
                created_at,
                admin_roles (
                    id,
                    name,
                    slug,
                    description
                )
            `)
            .eq(
                "user_id",
                normalizedUserId
            )
            .order("created_at", {
                ascending: true
            });

        if (error) {
            console.error(
                "Admin V3 Admins: Failed to load admin.",
                error
            );

            throw error;
        }

        const assignments = data || [];

        const admin = {
            user_id:
                normalizedUserId,

            roles:
                assignments
                    .filter(function (
                        assignment
                    ) {
                        return Boolean(
                            assignment.admin_roles
                        );
                    })
                    .map(function (
                        assignment
                    ) {
                        return Object.assign(
                            {},
                            assignment.admin_roles
                        );
                    }),

            created_at:
                assignments.length > 0
                    ? assignments[0].created_at
                    : null
        };

        state.currentAdmin = admin;

        return admin;
    }

    async function assignRole(
        userId,
        roleId
    ) {
        requireSuperAdmin();

        const normalizedUserId =
            validateUserId(userId);

        const normalizedRoleId =
            validateRoleId(roleId);

        state.saving = true;

        try {
            const {
                data: existing,
                error: lookupError
            } = await db
                .from("admin_user_roles")
                .select(`
                    user_id,
                    role_id
                `)
                .eq(
                    "user_id",
                    normalizedUserId
                )
                .eq(
                    "role_id",
                    normalizedRoleId
                )
                .maybeSingle();

            if (lookupError) {
                console.error(
                    "Admin V3 Admins: Failed to check existing role assignment.",
                    lookupError
                );

                throw lookupError;
            }

            if (existing) {
                return existing;
            }

            const {
                data,
                error
            } = await db
                .from("admin_user_roles")
                .insert({
                    user_id:
                        normalizedUserId,

                    role_id:
                        normalizedRoleId
                })
                .select(`
                    user_id,
                    role_id,
                    created_at
                `)
                .single();

            if (error) {
                console.error(
                    "Admin V3 Admins: Failed to assign role.",
                    error
                );

                throw error;
            }

            await loadAdmins();

            return data;
        } finally {
            state.saving = false;
        }
    }

    async function removeRole(
        userId,
        roleId
    ) {
        requireSuperAdmin();

        const normalizedUserId =
            validateUserId(userId);

        const normalizedRoleId =
            validateRoleId(roleId);

        state.saving = true;

        try {
            const {
                error
            } = await db
                .from("admin_user_roles")
                .delete()
                .eq(
                    "user_id",
                    normalizedUserId
                )
                .eq(
                    "role_id",
                    normalizedRoleId
                );

            if (error) {
                console.error(
                    "Admin V3 Admins: Failed to remove role.",
                    error
                );

                throw error;
            }

            await loadAdmins();

            return true;
        } finally {
            state.saving = false;
        }
    }

    async function setRoles(
        userId,
        roleIds
    ) {
        requireSuperAdmin();

        const normalizedUserId =
            validateUserId(userId);

        if (!Array.isArray(roleIds)) {
            throw new Error(
                "Admin V3 Admins: Role IDs must be an array."
            );
        }

        const normalizedRoleIds =
            Array.from(
                new Set(
                    roleIds.map(function (
                        roleId
                    ) {
                        return validateRoleId(
                            roleId
                        );
                    })
                )
            );

        const current =
            await getAdminByUserId(
                normalizedUserId
            );

        const currentRoleIds =
            current.roles.map(
                function (role) {
                    return role.id;
                }
            );

        const rolesToAdd =
            normalizedRoleIds.filter(
                function (roleId) {
                    return !currentRoleIds.includes(
                        roleId
                    );
                }
            );

        const rolesToRemove =
            currentRoleIds.filter(
                function (roleId) {
                    return !normalizedRoleIds.includes(
                        roleId
                    );
                }
            );

        state.saving = true;

        try {
            for (
                const roleId of rolesToAdd
            ) {
                await assignRole(
                    normalizedUserId,
                    roleId
                );
            }

            for (
                const roleId of rolesToRemove
            ) {
                await removeRole(
                    normalizedUserId,
                    roleId
                );
            }

            return await getAdminByUserId(
                normalizedUserId
            );
        } finally {
            state.saving = false;
        }
    }

    async function initialize() {
        if (state.initialized) {
            return getState();
        }

        requireRolesModule();

        if (
            !window.EchoesAdminRoles.isSuperAdmin()
        ) {
            state.initialized = true;

            return getState();
        }

        await loadRoles();
        await loadAdmins();

        state.initialized = true;

        return getState();
    }

    function setCurrentAdmin(admin) {
        state.currentAdmin =
            admin || null;

        return state.currentAdmin;
    }

    function getAdmins() {
        return state.admins.map(
            function (admin) {
                return {
                    user_id:
                        admin.user_id,

                    roles:
                        admin.roles.map(
                            function (role) {
                                return Object.assign(
                                    {},
                                    role
                                );
                            }
                        ),

                    created_at:
                        admin.created_at
                };
            }
        );
    }

    function getRoles() {
        return state.roles.map(
            function (role) {
                return Object.assign(
                    {},
                    role
                );
            }
        );
    }

    function getCurrentAdmin() {
        return state.currentAdmin;
    }

    function isLoading() {
        return state.loading;
    }

    function isSaving() {
        return state.saving;
    }

    function getState() {
        return {
            admins:
                getAdmins(),

            roles:
                getRoles(),

            currentAdmin:
                state.currentAdmin,

            initialized:
                state.initialized,

            loading:
                state.loading,

            saving:
                state.saving
        };
    }

    window.EchoesAdminAdmins = {
        initialize,
        loadRoles,
        loadAdmins,
        getAdminByUserId,
        assignRole,
        removeRole,
        setRoles,
        setCurrentAdmin,
        getAdmins,
        getRoles,
        getCurrentAdmin,
        isLoading,
        isSaving,
        getState
    };
})();
