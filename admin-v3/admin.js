(function () {
    "use strict";

    /*
     * Echoes of Humanity — Admin V3
     * Application Bootstrap
     *
     * Responsibility:
     * - Start the Admin V3 application
     * - Coordinate core modules
     * - Establish initialization order
     *
     * Initialization order:
     *
     * AUTH
     *   ↓
     * ROLES
     *   ↓
     * PERMISSIONS
     *   ↓
     * NAVIGATION
     *   ↓
     * DASHBOARD
     *   ↓
     * ADMIN READY
     *
     * This file does NOT handle:
     * - Authentication logic
     * - Role logic
     * - Permission logic
     * - Navigation logic
     * - Content
     * - Library
     * - Media
     * - Categories
     * - Admin management
     * - Settings
     */

    function showBootstrapError(stage, error) {
        console.error("Admin V3: Bootstrap failed at " + stage + ".", error);

        const main = document.querySelector(".admin-main");

        if (!main) {
            return;
        }

        const existing = document.getElementById("admin-v3-bootstrap-error");

        if (existing) {
            existing.remove();
        }

        const panel = document.createElement("div");
        panel.id = "admin-v3-bootstrap-error";
        panel.style.cssText = "margin:24px;padding:20px;border:1px solid #ef6464;border-radius:10px;background:#21141a;color:#f4f7fb;font-family:inherit;";
        panel.innerHTML = "<strong>Admin V3 initialization error</strong><br><br>Stage: " +
            String(stage) + "<br>Error: " +
            String(error && error.message ? error.message : error);

        main.prepend(panel);
    }


    function bindAdminHeaderActions() {
        const logoutButton =
            document.getElementById("adminLogoutButton");

        if (!logoutButton) {
            return;
        }

        logoutButton.addEventListener(
            "click",
            async function () {
                logoutButton.disabled = true;
                logoutButton.textContent = "Logging Out...";

                try {
                    await window.EchoesAdminAuth.logout();
                } catch (error) {
                    console.error(
                        "Admin V3: Logout failed.",
                        error
                    );

                    logoutButton.disabled = false;
                    logoutButton.textContent = "Logout";
                }
            }
        );
    }

    async function initializeAdminV3() {

        /*
         * STEP 1
         * Authentication module
         */

        if (!window.EchoesAdminAuth) {
            console.error(
                "Admin V3: Authentication module is not available."
            );

            return;
        }


        /*
         * STEP 2
         * Roles module
         */

        if (!window.EchoesAdminRoles) {
            console.error(
                "Admin V3: Roles module is not available."
            );

            return;
        }


        /*
         * STEP 3
         * Permissions module
         */

        if (!window.EchoesAdminPermissions) {
            console.error(
                "Admin V3: Permissions module is not available."
            );

            return;
        }


        /*
         * STEP 4
         * Navigation module
         */

        if (!window.EchoesAdminNavigation) {
            console.error(
                "Admin V3: Navigation module is not available."
            );

            return;
        }


        /*
         * STEP 5
         * Verify authentication
         */

        const authenticated =
            await window.EchoesAdminAuth.protectAdminPage();

        if (!authenticated) {
            return;
        }


        /*
         * STEP 6
         * Resolve roles
         */

        let roleState;
        try {
            roleState = await window.EchoesAdminRoles.initialize();
        } catch (error) {
            showBootstrapError("ROLES", error);
            return;
        }

        if (!roleState.isAdmin) {
            console.error(
                "Admin V3: Authenticated user is not an administrator."
            );

            await window.EchoesAdminAuth.logout();

            return;
        }


        /*
         * STEP 7
         * Resolve permissions
         */

        let permissionState;
        try {
            permissionState = await window.EchoesAdminPermissions.initialize();
        } catch (error) {
            showBootstrapError("PERMISSIONS", error);
            return;
        }


        /*
         * STEP 8
         * Apply navigation access
         */

        let navigationState;
        try {
            navigationState = window.EchoesAdminNavigation.initialize();
        } catch (error) {
            showBootstrapError("NAVIGATION", error);
            return;
        }


        /*
         * STEP 9
         * Initialize Dashboard data layer
         */

        if (!window.EchoesAdminDashboard) {
            showBootstrapError(
                "DASHBOARD_MODULE",
                new Error("Dashboard module is not available.")
            );
            return;
        }

        let dashboardState;
        try {
            dashboardState =
                await window.EchoesAdminDashboard.initialize();
        } catch (error) {
            showBootstrapError("DASHBOARD", error);
            return;
        }


        /*
         * STEP 10
         * Confirm successful core initialization
         */

        console.info(
            "Admin V3: Authentication verified."
        );

        console.info(
            "Admin V3: Roles loaded.",
            roleState.roles
        );

        console.info(
            "Admin V3: Permissions loaded.",
            permissionState.permissions
        );

        console.info(
            "Admin V3: Navigation initialized.",
            navigationState.modules
        );

        console.info(
            "Admin V3: Dashboard data loaded.",
            dashboardState
        );


        /*
         * STEP 11
         * Notify the rest of Admin V3
         */

        document.dispatchEvent(
            new CustomEvent(
                "echoes-admin-ready",
                {
                    detail: {
                        roles: roleState,
                        permissions: permissionState,
                        navigation: navigationState,
                        dashboard: dashboardState
                    }
                }
            )
        );
    }


    document.addEventListener(
        "DOMContentLoaded",
        function () {

            bindAdminHeaderActions();

            initializeAdminV3().catch(function (error) {

                console.error(
                    "Admin V3: Initialization failed.",
                    error
                );

            });

        }
    );

})();
