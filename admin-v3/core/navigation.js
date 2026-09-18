(function () {
    "use strict";

    /*
     * Echoes of Humanity — Admin V3
     * Navigation Module
     *
     * Responsibilities:
     * - Define Admin V3 modules
     * - Resolve module access
     * - Apply permission-based visibility
     * - Handle module switching
     * - Maintain active navigation state
     *
     * This module does NOT handle:
     * - Authentication
     * - Roles
     * - Permissions data loading
     * - Content
     * - Library
     * - Media
     * - Categories
     * - Admin management
     * - Settings
     */

    const state = {
        modules: [],
        activeModule: "dashboard",
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

        return MODULES
            .filter(function (module) {
                return canAccessModule(module);
            })
            .map(function (module) {
                return Object.assign({}, module);
            });
    }


    function getModuleById(moduleId) {

        if (!moduleId) {
            return null;
        }

        return MODULES.find(function (module) {
            return module.id === moduleId;
        }) || null;
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


        state.modules =
            accessibleModules;


        return accessibleModules;
    }


    function applyActiveNavigation(moduleId) {

        const navigationElements =
            document.querySelectorAll(
                "[data-module]"
            );


        navigationElements.forEach(function (element) {

            const elementModuleId =
                element.getAttribute("data-module");

            const isActive =
                elementModuleId === moduleId &&
                !element.hidden;

            element.classList.toggle(
                "active",
                isActive
            );

            if (isActive) {
                element.setAttribute(
                    "aria-current",
                    "page"
                );
            } else {
                element.removeAttribute(
                    "aria-current"
                );
            }
        });
    }


    function applyActiveModule(moduleId) {

        const moduleSections =
            document.querySelectorAll(
                ".module"
            );


        moduleSections.forEach(function (section) {

            const sectionId =
                section.id;

            const expectedId =
                "module-" + moduleId;

            const isActive =
                sectionId === expectedId;

            section.classList.toggle(
                "active",
                isActive
            );
        });
    }


    function openModule(moduleId) {

        const module =
            getModuleById(moduleId);

        if (!module) {

            console.warn(
                "Admin V3 Navigation: Unknown module.",
                moduleId
            );

            return false;
        }


        if (!canAccessModule(module)) {

            console.warn(
                "Admin V3 Navigation: Access denied.",
                moduleId
            );

            return false;
        }


        applyActiveModule(moduleId);

        applyActiveNavigation(moduleId);

        state.activeModule =
            moduleId;


        document.dispatchEvent(
            new CustomEvent(
                "echoes-admin-module-change",
                {
                    detail: {
                        moduleId: moduleId,
                        module: Object.assign({}, module)
                    }
                }
            )
        );


        return true;
    }


    function bindNavigation() {

        const navigationElements =
            document.querySelectorAll(
                "[data-module]"
            );


        navigationElements.forEach(function (element) {

            element.addEventListener(
                "click",
                function () {

                    const moduleId =
                        element.getAttribute(
                            "data-module"
                        );

                    openModule(moduleId);
                }
            );
        });
    }


    function ensureActiveModule() {

        const accessibleIds =
            new Set(
                state.modules.map(function (module) {
                    return module.id;
                })
            );


        if (
            !accessibleIds.has(
                state.activeModule
            )
        ) {
            state.activeModule =
                "dashboard";
        }


        applyActiveModule(
            state.activeModule
        );

        applyActiveNavigation(
            state.activeModule
        );
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

        bindNavigation();

        ensureActiveModule();


        state.initialized = true;


        return getState();
    }


    function getActiveModule() {
        return state.activeModule;
    }


    function getState() {

        return {
            modules:
                state.modules.map(function (module) {
                    return Object.assign({}, module);
                }),

            activeModule:
                state.activeModule,

            initialized:
                state.initialized
        };
    }


    window.EchoesAdminNavigation = {

        initialize,

        getModules,

        getAccessibleModules,

        getModuleById,

        applyModuleVisibility,

        applyActiveNavigation,

        applyActiveModule,

        openModule,

        getActiveModule,

        getState
    };

})();
