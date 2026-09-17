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
        if (!window.EchoesAdminAuth) {
            console.error(
                "Admin V3: Authentication module is not available."
            );

            return;
        }

        if (!window.EchoesAdminRoles) {
            console.error(
                "Admin V3: Roles module is not available."
            );

            return;
        }

        const authenticated =
            await window.EchoesAdminAuth.protectAdminPage();

        if (!authenticated) {
            return;
        }

        const roleState =
            await window.EchoesAdminRoles.initialize();

        if (!roleState.isAdmin) {
            console.error(
                "Admin V3: Authenticated user is not an administrator."
            );

            await window.EchoesAdminAuth.logout();

            return;
        }

        console.info(
            "Admin V3: Authentication verified."
        );

        console.info(
            "Admin V3: Roles loaded.",
            roleState.roles
        );

        document.dispatchEvent(
            new CustomEvent(
                "echoes-admin-ready",
                {
                    detail: roleState
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
