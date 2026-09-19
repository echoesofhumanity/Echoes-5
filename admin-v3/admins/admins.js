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

    async function searchAuthUsers(search, page) {
        requireSuperAdmin();

        const normalizedSearch =
            typeof search === "string"
                ? search.trim().slice(0, 100)
                : "";

        const requestedPage =
            Number.isInteger(page) && page > 0
                ? page
                : 1;

        const {
            data,
            error
        } = await db.functions.invoke(
            "admin-user-directory",
            {
                body: {
                    search: normalizedSearch,
                    page: requestedPage
                }
            }
        );

        if (error) {
            console.error(
                "Admin V3 Admins: Failed to search Auth users.",
                error
            );

            throw error;
        }

        return data || {
            users: [],
            count: 0,
            page: requestedPage
        };
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

    function getElement(id) {
        return document.getElementById(id);
    }

    function renderAdminList() {
        const list = getElement("adminList");
        const searchInput = getElement("adminSearch");

        if (!list) {
            return;
        }

        const query = searchInput
            ? searchInput.value.trim().toLowerCase()
            : "";

        const filtered = state.admins.filter(function (admin) {
            return admin.user_id
                .toLowerCase()
                .includes(query);
        });

        if (filtered.length === 0) {
            list.innerHTML =
                '<div class="library-empty">No administrators found.</div>';
            return;
        }

        list.innerHTML = "";

        filtered.forEach(function (admin) {
            const item = document.createElement("div");
            item.className = "library-item";

            const roles = admin.roles.length > 0
                ? admin.roles.map(function (role) {
                    return role.name;
                }).join(", ")
                : "No roles";

            item.innerHTML =
                '<div class="library-item-main">' +
                    '<div class="library-item-title">' +
                        admin.user_id +
                    '</div>' +
                    '<div class="library-item-meta">' +
                        'Roles: ' + roles +
                    '</div>' +
                '</div>';

            item.addEventListener("click", function () {
                setCurrentAdmin(admin);
                renderAdminList();
                renderAdminDetails();
            });

            if (
                state.currentAdmin &&
                state.currentAdmin.user_id === admin.user_id
            ) {
                item.classList.add("active");
            }

            list.appendChild(item);
        });
    }

    function renderAdminDetails() {
        const details = getElement("adminDetails");
        const roleList = getElement("adminRoleList");
        const saveButton = getElement("adminSaveRolesButton");
        const clearButton = getElement("adminClearSelectionButton");

        const authSearchInput = getElement("adminAuthUserSearch");
        const authSearchButton = getElement("adminAuthUserSearchButton");

        if (!details || !roleList) {
            return;
        }

        if (!state.currentAdmin) {
            details.textContent =
                "Select an administrator to manage roles.";

            roleList.innerHTML =
                '<div class="library-empty">' +
                "No administrator selected." +
                "</div>";

            if (saveButton) {
                saveButton.disabled = true;
            }

            if (clearButton) {
                clearButton.disabled = true;
            }

            return;
        }

        details.textContent =
            "User ID: " + state.currentAdmin.user_id;

        const assignedRoleIds =
            state.currentAdmin.roles.map(function (role) {
                return role.id;
            });

        roleList.innerHTML = "";

        state.roles.forEach(function (role) {
            const label = document.createElement("label");
            label.className = "library-item";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.value = role.id;
            checkbox.checked =
                assignedRoleIds.includes(role.id);
            checkbox.dataset.adminRole = "true";

            const text = document.createElement("span");
            text.textContent = role.name;

            label.appendChild(checkbox);
            label.appendChild(text);
            roleList.appendChild(label);
        });

        if (saveButton) {
            saveButton.disabled = false;
        }

        if (clearButton) {
            clearButton.disabled = false;
        }
    }

    async function saveSelectedRoles() {
        const message = getElement("adminFormMessage");

        if (!state.currentAdmin) {
            if (message) {
                message.textContent =
                    "Select an administrator first.";
            }
            return;
        }

        const checkboxes = document.querySelectorAll(
            '#adminRoleList input[data-admin-role="true"]'
        );

        const roleIds = Array.from(checkboxes)
            .filter(function (checkbox) {
                return checkbox.checked;
            })
            .map(function (checkbox) {
                return checkbox.value;
            });

        if (roleIds.length === 0) {
            if (message) {
                message.textContent =
                    "At least one role must remain assigned.";
            }
            return;
        }

        const saveButton = getElement("adminSaveRolesButton");

        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = "Saving...";
        }

        if (message) {
            message.textContent = "";
        }

        try {
            const updated = await setRoles(
                state.currentAdmin.user_id,
                roleIds
            );

            state.currentAdmin = updated;

            renderAdminList();
            renderAdminDetails();

            if (message) {
                message.textContent =
                    "Administrator roles saved successfully.";
            }

            if (saveButton) {
                saveButton.disabled = false;
                saveButton.textContent = "Save Roles";
            }
        } catch (error) {
            console.error(
                "Admin V3 Admins: Failed to save roles.",
                error
            );

            if (message) {
                message.textContent =
                    String(
                        error && error.message
                            ? error.message
                            : error
                    );
            }

            renderAdminDetails();
        }
    }

    function clearAdminSelection() {
        setCurrentAdmin(null);

        const message = getElement("adminFormMessage");

        if (message) {
            message.textContent = "";
        }

        renderAdminList();
        renderAdminDetails();
    }

    function renderAuthUserResults(users) {
        const list = getElement("adminAuthUserList");

        if (!list) {
            return;
        }

        list.innerHTML = "";

        if (!Array.isArray(users) || users.length === 0) {
            const empty = document.createElement("div");
            empty.className = "library-empty";
            empty.textContent = "No Auth users found.";
            list.appendChild(empty);
            return;
        }

        users.forEach(function (user) {
            const item = document.createElement("div");
            item.className = "library-item";

            const main = document.createElement("div");
            main.className = "library-item-main";

            const title = document.createElement("div");
            title.className = "library-item-title";
            title.textContent = user.email || "No email address";

            const userId = document.createElement("div");
            userId.className = "library-item-meta";
            userId.textContent = "User ID: " + String(user.id || "");

            const roles = document.createElement("div");
            roles.className = "library-item-meta";
            roles.textContent =
                "Roles: " +
                (Array.isArray(user.roles) && user.roles.length > 0
                    ? user.roles.map(function (role) {
                        return role.name;
                    }).join(", ")
                    : "None");

            main.appendChild(title);
            main.appendChild(userId);
            main.appendChild(roles);
            item.appendChild(main);
            list.appendChild(item);
        });
    }

    async function searchAuthUsersFromUI() {
        const input = getElement("adminAuthUserSearch");
        const button = getElement("adminAuthUserSearchButton");
        const message = getElement("adminAuthUserMessage");
        const list = getElement("adminAuthUserList");

        const search = input
            ? input.value.trim()
            : "";

        if (!search) {
            if (message) {
                message.textContent = "Enter an email address or User ID."; 
            }

            if (list) {
                list.innerHTML =
                    '<div class="library-empty">Enter a search value to begin.</div>';
            }

            return;
        }

        if (button) {
            button.disabled = true;
            button.textContent = "Searching...";
        }

        if (message) {
            message.textContent = "";
        }

        try {
            const result = await searchAuthUsers(search, 1);
            const users = result && Array.isArray(result.users)
                ? result.users
                : [];

            renderAuthUserResults(users);

            if (message) {
                message.textContent =
                    users.length === 0
                        ? "No Auth users found."
                        : users.length + " Auth user" +
                          (users.length === 1 ? "" : "s") + " found.";
            }
        } catch (error) {
            console.error(
                "Admin V3 Admins: Failed to search Auth users from UI.",
                error
            );

            if (message) {
                message.textContent =
                    String(
                        error && error.message
                            ? error.message
                            : error
                    );
            }

            if (list) {
                list.innerHTML =
                    '<div class="library-empty">Unable to load Auth users.</div>';
            }
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = "Search Users";
            }
        }
    }

    async function initializeUI() {
        const searchInput = getElement("adminSearch");
        const saveButton = getElement("adminSaveRolesButton");
        const clearButton = getElement("adminClearSelectionButton");
        const authSearchInput = getElement("adminAuthUserSearch");
        const authSearchButton = getElement("adminAuthUserSearchButton");

        if (
            saveButton &&
            saveButton.dataset.bound !== "true"
        ) {
            saveButton.dataset.bound = "true";

            saveButton.addEventListener("click", function () {
                saveSelectedRoles();
            });
        }

        if (
            clearButton &&
            clearButton.dataset.bound !== "true"
        ) {
            clearButton.dataset.bound = "true";

            clearButton.addEventListener("click", function () {
                clearAdminSelection();
            });
        }

        if (
            authSearchButton &&
            authSearchButton.dataset.bound !== "true"
        ) {
            authSearchButton.dataset.bound = "true";

            authSearchButton.addEventListener("click", function () {
                searchAuthUsersFromUI();
            });
        }

        if (
            authSearchInput &&
            authSearchInput.dataset.bound !== "true"
        ) {
            authSearchInput.dataset.bound = "true";

            authSearchInput.addEventListener("keydown", function (event) {
                if (event.key === "Enter") {
                    event.preventDefault();
                    searchAuthUsersFromUI();
                }
            });
        }

        if (
            searchInput &&
            searchInput.dataset.bound !== "true"
        ) {
            searchInput.dataset.bound = "true";

            searchInput.addEventListener("input", function () {
                renderAdminList();
            });
        }

        document.addEventListener(
            "echoes-admin-ready",
            async function () {
                try {
                    await initialize();
                    renderAdminList();
                    renderAdminDetails();
                } catch (error) {
                    const list = getElement("adminList");

                    if (list) {
                        list.innerHTML =
                            '<div class="library-empty">' +
                            String(
                                error && error.message
                                    ? error.message
                                    : error
                            ) +
                            '</div>';
                    }
                }
            }
        );

        document.addEventListener(
            "echoes-admin-module-change",
            async function (event) {
                if (
                    event.detail &&
                    event.detail.moduleId === "admins"
                ) {
                    try {
                        await initialize();

                        renderAdminList();
                        renderAdminDetails();
                    } catch (error) {
                        const list = getElement("adminList");

                        if (list) {
                            list.innerHTML =
                                '<div class="library-empty">' +
                                String(
                                    error && error.message
                                        ? error.message
                                        : error
                                ) +
                                '</div>';
                        }
                    }
                }
            }
        );
    }

    initializeUI();

    window.EchoesAdminAdmins = {
        initialize,
        loadRoles,
        loadAdmins,
        searchAuthUsers,
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
