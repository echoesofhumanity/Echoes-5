(function () {
    "use strict";

    const db = window.db;

    const STORAGE_BUCKET = "echoes-media";

    const SUPPORTED_TYPES = [
        "story",
        "essay",
        "manifesto",
        "poetry",
        "audio",
        "visual",
        "technical",
        "blueprint"
    ];

    const SUPPORTED_LANGUAGES = [
        "en",
        "tr",
        "es",
        "fr",
        "de",
        "ru"
    ];

    const SUPPORTED_STATUSES = [
        "draft",
        "review",
        "published",
        "archived"
    ];

    const state = {
        initialized: false,
        loading: false,
        error: null,

        user: null,
        isSuperAdmin: false,

        database: {
            connected: false,
            accessible: false,
            contentCount: null
        },

        storage: {
            accessible: false,
            bucket: STORAGE_BUCKET
        }
    };

    if (!db) {
        console.error(
            "Admin V3 Settings: Supabase client is not available."
        );
        return;
    }

    function requireRolesModule() {
        if (!window.EchoesAdminRoles) {
            throw new Error(
                "Admin V3 Settings: Roles module is not available."
            );
        }
    }

    function requireSuperAdmin() {
        requireRolesModule();

        if (
            !window.EchoesAdminRoles.isSuperAdmin()
        ) {
            throw new Error(
                "Admin V3 Settings: Super Admin access is required."
            );
        }
    }

    async function getCurrentUser() {
        const {
            data,
            error
        } = await db.auth.getUser();

        if (error) {
            throw error;
        }

        return data && data.user
            ? data.user
            : null;
    }

    async function verifySuperAdmin() {
        requireSuperAdmin();

        state.isSuperAdmin = true;

        return true;
    }

    async function checkDatabase() {
        const result = {
            connected: false,
            accessible: false,
            contentCount: null
        };

        const {
            count,
            error
        } = await db
            .from("content_items")
            .select("id", {
                count: "exact",
                head: true
            });

        if (error) {
            console.error(
                "Admin V3 Settings: Database check failed.",
                error
            );

            throw error;
        }

        result.connected = true;
        result.accessible = true;
        result.contentCount =
            typeof count === "number"
                ? count
                : 0;

        return result;
    }

    async function checkStorage() {
        const result = {
            accessible: false,
            bucket: STORAGE_BUCKET
        };

        const {
            data,
            error
        } = await db.storage
            .from(STORAGE_BUCKET)
            .list("", {
                limit: 1,
                offset: 0
            });

        if (error) {
            console.error(
                "Admin V3 Settings: Storage check failed.",
                error
            );

            throw error;
        }

        result.accessible =
            Array.isArray(data);

        return result;
    }

    async function loadSettings() {
        if (state.loading) {
            return getState();
        }

        state.loading = true;
        state.error = null;

        try {
            state.user =
                await getCurrentUser();

            if (!state.user) {
                throw new Error(
                    "No authenticated administrator session."
                );
            }

            await verifySuperAdmin();

            state.database =
                await checkDatabase();

            state.storage =
                await checkStorage();

            return getState();
        } catch (error) {
            state.error =
                error &&
                error.message
                    ? error.message
                    : "Settings could not be loaded.";

            console.error(
                "Admin V3 Settings: Failed to load system status.",
                error
            );

            throw error;
        } finally {
            state.loading = false;
        }
    }

    async function refresh() {
        return loadSettings();
    }

    function getSupportedTypes() {
        return SUPPORTED_TYPES.slice();
    }

    function getSupportedLanguages() {
        return SUPPORTED_LANGUAGES.slice();
    }

    function getSupportedStatuses() {
        return SUPPORTED_STATUSES.slice();
    }

    function getStorageBucket() {
        return STORAGE_BUCKET;
    }

    function getState() {
        return {
            initialized:
                state.initialized,

            loading:
                state.loading,

            error:
                state.error,

            user:
                state.user
                    ? {
                          id:
                              state.user.id ||
                              null,

                          email:
                              state.user.email ||
                              null
                      }
                    : null,

            isSuperAdmin:
                state.isSuperAdmin,

            database: {
                connected:
                    state.database.connected,

                accessible:
                    state.database.accessible,

                contentCount:
                    state.database.contentCount
            },

            storage: {
                accessible:
                    state.storage.accessible,

                bucket:
                    state.storage.bucket
            }
        };
    }

    async function initialize() {
        if (state.initialized) {
            return getState();
        }

        requireRolesModule();

        state.initialized = true;

        if (
            window.EchoesAdminRoles.isSuperAdmin()
        ) {
            try {
                await loadSettings();
            } catch (error) {
                console.error(
                    "Admin V3 Settings: Initialization check failed.",
                    error
                );
            }
        }

        return getState();
    }

    function getElement(id) {
        return document.getElementById(id);
    }

    function renderList(elementId, items) {
        const element = getElement(elementId);

        if (!element) {
            return;
        }

        element.innerHTML = items
            .map(function (item) {
                const row = document.createElement("div");
                row.className = "library-item";
                row.textContent = item;
                return row.outerHTML;
            })
            .join("");
    }

    function renderStatus() {
        const access = getElement("settingsAccessStatus");
        const database = getElement("settingsDatabaseStatus");
        const storage = getElement("settingsStorageStatus");
        const bucket = getElement("settingsBucket");
        const message = getElement("settingsMessage");

        if (access) {
            access.innerHTML =
                "<strong>Access:</strong> " +
                (state.isSuperAdmin
                    ? "Super Admin"
                    : "Not authorized");
        }

        if (database) {
            database.innerHTML =
                "<strong>Database:</strong> " +
                (state.database.connected && state.database.accessible
                    ? "Connected and accessible"
                    : "Unavailable") +
                " · Content items: " +
                (typeof state.database.contentCount === "number"
                    ? state.database.contentCount
                    : "—");
        }

        if (storage) {
            storage.innerHTML =
                "<strong>Storage:</strong> " +
                (state.storage.accessible
                    ? "Accessible"
                    : "Unavailable");
        }

        if (bucket) {
            bucket.innerHTML =
                "<strong>Bucket:</strong> " +
                state.storage.bucket;
        }

        if (message) {
            if (state.error) {
                message.textContent = state.error;
                message.className = "form-message error";
            } else {
                message.textContent = "System status loaded successfully.";
                message.className = "form-message success";
            }
        }
    }

    function renderStaticSettings() {
        renderList("settingsContentTypes", getSupportedTypes());
        renderList("settingsLanguages", getSupportedLanguages());
        renderList("settingsStatuses", getSupportedStatuses());
        renderStatus();
    }

    async function loadAndRender() {
        const refreshButton = getElement("settingsRefreshButton");

        if (refreshButton) {
            refreshButton.disabled = true;
        }

        try {
            await loadSettings();
            renderStaticSettings();
        } catch (error) {
            renderStatus();
        } finally {
            if (refreshButton) {
                refreshButton.disabled = false;
            }
        }
    }

    function bindSettingsUI() {
        const refreshButton = getElement("settingsRefreshButton");

        if (!refreshButton || refreshButton.dataset.bound === "true") {
            return;
        }

        refreshButton.dataset.bound = "true";

        refreshButton.addEventListener("click", function () {
            loadAndRender();
        });

        document.addEventListener(
            "echoes-admin-module-change",
            function (event) {
                if (
                    event.detail &&
                    event.detail.moduleId === "settings"
                ) {
                    loadAndRender();
                }
            }
        );
    }

    function initializeUI() {
        bindSettingsUI();

        document.addEventListener(
            "echoes-admin-ready",
            function () {
                if (
                    window.EchoesAdminRoles &&
                    window.EchoesAdminRoles.isSuperAdmin()
                ) {
                    loadAndRender();
                }
            }
        );

        if (
            window.EchoesAdminRoles &&
            window.EchoesAdminRoles.isSuperAdmin()
        ) {
            loadAndRender();
        }
    }

    window.EchoesAdminSettings = {
        initialize,
        loadSettings,
        refresh,
        getSupportedTypes,
        getSupportedLanguages,
        getSupportedStatuses,
        getStorageBucket,
        getState
    };
})();
