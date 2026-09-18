(function () {
    "use strict";

    const state = {
        modules: [],
        initialized: false
    };

    const MODULES = [
        {
            id: "dashboard",
            label: "Dashboard",
            permission: null,
            alwaysVisible: true
        },
        {
            id: "content",
            label: "New Content",
            permission: "content.view"
        },
        {
            id: "library",
            label: "Library",
            permission: "content.view"
        },
        {
            id: "media",
            label: "Media",
            permission: "media.view"
        },
        {
            id: "categories",
            label: "Categories",
            permission: "content.manage"
        },
        {
            id: "admins",
            label: "Admins",
            permission: null,
            superAdminOnly: true
        },
        {
            id: "settings",
            label: "Settings",
            permission: null,
            superAdminOnly: true
        }
    ];

    function getModules() {
        return MODULES.map(function (module) {
            return Object.assign({}, module);
        });
    }

    function canAccessModule(module) {
        if (module.alwaysVisible) {
            return true;
        }

        if (module.superAdminOnly) {
            if (!window.EchoesAdminRoles) {
                console.error(
                    "Admin V3 Navigation: Roles module is not available."
                );
                return false;
            }

            return window.EchoesAdminRoles.isSuperAdmin();
        }

        if (!module.permission) {
            return true;
        }

        if (!window.EchoesAdminPermissions) {
            console.error(
                "Admin V3 Navigation: Permissions module is not available."
            );
            return false;
        }

        return window.EchoesAdminPermissions.hasPermission(
            module.permission
        );
    }

    function getAccessibleModules() {
        return MODULES.filter(function (module) {
            return canAccessModule(module);
        }).map(function (module) {
            return Object.assign({}, module);
        });
    }

    function applyModuleVisibility() {
        const accessibleModules =
            getAccessibleModules();

        const accessibleIds =
            new Set(
                accessibleModules.map(function (module) {
                    return module.id;
                })
            );

        const navigationElements =
            document.querySelectorAll(
                "[data-module]"
            );

        navigationElements.forEach(function (element) {
            const moduleId =
                element.getAttribute("data-module");

            if (accessibleIds.has(moduleId)) {
                element.hidden = false;
                element.removeAttribute(
                    "aria-hidden"
                );
            } else {
                element.hidden = true;
                element.setAttribute(
                    "aria-hidden",
                    "true"
                );
            }
        });

        state.modules = accessibleModules;

        return accessibleModules;
    }

    function initialize() {
        if (
            !window.EchoesAdminPermissions ||
            !window.EchoesAdminRoles
        ) {
            console.error(
                "Admin V3 Navigation: Required security modules are not available."
            );

            return getState();
        }

        applyModuleVisibility();

        state.initialized = true;

        return getState();
    }

    function getState() {
        return {
            modules:
                state.modules.map(function (module) {
                    return Object.assign({}, module);
                }),

            initialized:
                state.initialized
        };
    }

    window.EchoesAdminNavigation = {
        initialize,
        getModules,
        getAccessibleModules,
        applyModuleVisibility,
        getState
    };
})();
