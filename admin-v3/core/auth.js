(function () {
    "use strict";

    /*
     * Echoes of Humanity — Admin V3
     * Authentication Module
     *
     * Responsibility:
     * - Supabase authentication
     * - Session handling
     * - Login
     * - Logout
     * - Authentication redirects
     *
     * This module does NOT handle:
     * - Roles
     * - Permissions
     * - Navigation
     * - Content
     * - Database administration
     */

    const db = window.db;

    if (!db) {
        console.error(
            "Admin V3 Auth: Supabase client is not available."
        );
        return;
    }

    const LOGIN_PAGE = "login.html";
    const ADMIN_PAGE = "index.html";

    function isLoginPage() {
        return window.location.pathname.endsWith(
            "/admin-v3/login.html"
        );
    }

    function isAdminPage() {
        return window.location.pathname.endsWith(
            "/admin-v3/index.html"
        );
    }

    function redirectToLogin() {
        if (!isLoginPage()) {
            window.location.href = LOGIN_PAGE;
        }
    }

    function redirectToAdmin() {
        if (!isAdminPage()) {
            window.location.href = ADMIN_PAGE;
        }
    }

    async function getSession() {
        const {
            data,
            error
        } = await db.auth.getSession();

        if (error) {
            console.error(
                "Admin V3 Auth: Failed to get session.",
                error
            );

            return null;
        }

        return data.session || null;
    }

    async function login(email, password) {
        const {
            data,
            error
        } = await db.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            throw error;
        }

        return data;
    }

    async function logout() {
        const {
            error
        } = await db.auth.signOut();

        if (error) {
            throw error;
        }

        redirectToLogin();
    }

    async function protectAdminPage() {
        const session = await getSession();

        if (!session) {
            redirectToLogin();
            return false;
        }

        return true;
    }

    async function protectLoginPage() {
        const session = await getSession();

        if (session) {
            redirectToAdmin();
            return false;
        }

        return true;
    }

    function bindLoginForm() {
        const form = document.getElementById("loginForm");

        if (!form) {
            return;
        }

        const emailInput =
            document.getElementById("email");

        const passwordInput =
            document.getElementById("password");

        const loginButton =
            document.getElementById("loginButton");

        const loginStatus =
            document.getElementById("loginStatus");

        if (
            !emailInput ||
            !passwordInput ||
            !loginButton ||
            !loginStatus
        ) {
            console.error(
                "Admin V3 Auth: Login form elements are missing."
            );

            return;
        }

        form.addEventListener("submit", async function (event) {
            event.preventDefault();

            const email =
                emailInput.value.trim();

            const password =
                passwordInput.value;

            if (!email || !password) {
                loginStatus.textContent =
                    "Email and password are required.";

                loginStatus.classList.add("visible");
                loginStatus.classList.add("error");

                return;
            }

            loginButton.disabled = true;
            loginButton.textContent = "Signing In...";

            loginStatus.textContent = "";
            loginStatus.classList.remove("visible");
            loginStatus.classList.remove("error");

            try {
                await login(email, password);

                redirectToAdmin();

            } catch (error) {
                console.error(
                    "Admin V3 Auth: Login failed.",
                    error
                );

                loginStatus.textContent =
                    error.message ||
                    "Unable to sign in. Please check your credentials.";

                loginStatus.classList.add("visible");
                loginStatus.classList.add("error");

                loginButton.disabled = false;
                loginButton.textContent = "Sign In";
            }
        });
    }

    async function initialize() {
        if (isLoginPage()) {
            const allowed =
                await protectLoginPage();

            if (allowed) {
                bindLoginForm();
            }

            return;
        }

        if (isAdminPage()) {
            await protectAdminPage();
        }
    }

    window.EchoesAdminAuth = {
        getSession,
        login,
        logout,
        protectAdminPage,
        protectLoginPage
    };

    document.addEventListener(
        "DOMContentLoaded",
        initialize
    );
})();
