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

        const roleState =
            await window.EchoesAdminRoles.initialize();

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

        const permissionState =
            await window.EchoesAdminPermissions.initialize();


        /*
         * STEP 8
         * Apply navigation access
         */

        const navigationState =
            window.EchoesAdminNavigation.initialize();


        /*
         * STEP 9
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


        /*
         * STEP 10
         * Notify the rest of Admin V3
         */

        document.dispatchEvent(
            new CustomEvent(
                "echoes-admin-ready",
                {
                    detail: {
                        roles: roleState,
                        permissions: permissionState,
                        navigation: navigationState
                    }
                }
            )
        );
    }


    document.addEventListener(
        "DOMContentLoaded",
        function () {

            initializeAdminV3().catch(function (error) {

                console.error(
                    "Admin V3: Initialization failed.",
                    error
                );

            });

        }
    );

})();
