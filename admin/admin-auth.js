(() => {
  "use strict";

  /*
   * ============================================================
   * ECHOES OF HUMANITY — ADMIN AUTHENTICATION
   * ============================================================
   *
   * Responsibilities:
   * - Manage administrator sign-in.
   * - Restore an existing Supabase session.
   * - Verify administrator privileges through is_admin().
   * - React to Supabase authentication state changes.
   * - Manage sign-out.
   * - Expose authentication state to the Admin application.
   *
   * This module does NOT:
   * - render dashboard data
   * - manage content
   * - manage the library
   * - manage settings
   * - modify database records directly
   */

  const refs = {
    authView: null,
    adminShell: null,
    loginForm: null,
    loginEmail: null,
    loginPassword: null,
    loginButton: null,
    loginMessage: null,
    logoutButton: null,
    connectionStatus: null
  };


  /* ============================================================
     STATE
     ============================================================ */

  let currentUser = null;
  let authInitialized = false;
  let authListener = null;
  let loginInProgress = false;
  let logoutInProgress = false;


  /* ============================================================
     DOM REFERENCES
     ============================================================ */

  function cacheDom() {
    refs.authView =
      document.getElementById("authView");

    refs.adminShell =
      document.getElementById("adminShell");

    refs.loginForm =
      document.getElementById("loginForm");

    refs.loginEmail =
      document.getElementById("loginEmail");

    refs.loginPassword =
      document.getElementById("loginPassword");

    refs.loginButton =
      document.getElementById("loginButton");

    refs.loginMessage =
      document.getElementById("loginMessage");

    refs.logoutButton =
      document.getElementById("logoutButton");

    refs.connectionStatus =
      document.getElementById("connectionStatus");
  }


  /* ============================================================
     SUPABASE ACCESS
     ============================================================ */

  function getSupabase() {
    if (
      !window.ECHOES_SUPABASE_API ||
      typeof window.ECHOES_SUPABASE_API.getClient !== "function"
    ) {
      return null;
    }

    return window.ECHOES_SUPABASE_API.getClient();
  }

  function isSupabaseReady() {
    return Boolean(
      window.ECHOES_SUPABASE_API &&
      typeof window.ECHOES_SUPABASE_API.isReady === "function" &&
      window.ECHOES_SUPABASE_API.isReady()
    );
  }


  /* ============================================================
     UI HELPERS
     ============================================================ */

  function setLoginMessage(message, type = "") {
    if (!refs.loginMessage) {
      return;
    }

    refs.loginMessage.textContent = message || "";

    refs.loginMessage.classList.remove(
      "success",
      "warning",
      "error"
    );

    if (type) {
      refs.loginMessage.classList.add(type);
    }
  }


  function setConnectionStatus(message, type = "") {
    if (!refs.connectionStatus) {
      return;
    }

    refs.connectionStatus.textContent =
      message || "";

    refs.connectionStatus.classList.remove(
      "is-success",
      "is-warning",
      "is-error"
    );

    if (type) {
      refs.connectionStatus.classList.add(
        `is-${type}`
      );
    }
  }


  function setLoginLoading(isLoading) {
    if (!refs.loginButton) {
      return;
    }

    refs.loginButton.disabled = isLoading;

    refs.loginButton.classList.toggle(
      "is-loading",
      isLoading
    );

    const label =
      refs.loginButton.querySelector(
        ".button-label"
      );

    if (label) {
      label.textContent = isLoading
        ? "Signing in…"
        : "Sign in";
    }
  }


  function clearLoginForm() {
    if (refs.loginEmail) {
      refs.loginEmail.value = "";
    }

    if (refs.loginPassword) {
      refs.loginPassword.value = "";
    }
  }


  /* ============================================================
     EVENTS
     ============================================================ */

  function emit(name, detail = {}) {
    document.dispatchEvent(
      new CustomEvent(name, {
        detail
      })
    );
  }


  /* ============================================================
     ADMIN VERIFICATION
     ============================================================ */

  async function verifyAdmin(user = null) {
    const supabase = getSupabase();

    if (!supabase) {
      throw new Error(
        "Supabase connection is unavailable."
      );
    }

    const targetUser =
      user || currentUser;

    if (!targetUser || !targetUser.id) {
      return false;
    }

    const {
      data,
      error
    } = await supabase.rpc("is_admin");

    if (error) {
      console.error(
        "Echoes Admin: Admin verification failed.",
        error
      );

      throw new Error(
        "Administrator verification failed."
      );
    }

    return data === true;
  }


  /* ============================================================
     SESSION RESTORATION
     ============================================================ */

  async function restoreSession() {
    const supabase = getSupabase();

    if (!supabase) {
      currentUser = null;

      setConnectionStatus(
        "Supabase unavailable",
        "error"
      );

      emit(
        "echoes:auth-error",
        {
          message:
            "Supabase connection is unavailable."
        }
      );

      return false;
    }

    try {
      setConnectionStatus(
        "Checking session…"
      );

      const {
        data,
        error
      } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      const session = data && data.session
        ? data.session
        : null;

      if (!session || !session.user) {
        currentUser = null;

        setConnectionStatus(
          "Signed out"
        );

        return false;
      }

      currentUser = session.user;

      const isAdmin =
        await verifyAdmin(currentUser);

      if (!isAdmin) {
        await supabase.auth.signOut();

        currentUser = null;

        setLoginMessage(
          "This account does not have administrator access.",
          "error"
        );

        setConnectionStatus(
          "Access denied",
          "error"
        );

        emit(
          "echoes:auth-error",
          {
            message:
              "Administrator access is required."
          }
        );

        return false;
      }

      setConnectionStatus(
        "Connected",
        "success"
      );

      emit(
        "echoes:authenticated",
        {
          user: currentUser
        }
      );

      return true;

    } catch (error) {
      console.error(
        "Echoes Admin: Session restoration failed.",
        error
      );

      currentUser = null;

      setConnectionStatus(
        "Authentication error",
        "error"
      );

      emit(
        "echoes:auth-error",
        {
          message:
            "Unable to restore the administrator session."
        }
      );

      return false;
    }
  }


  /* ============================================================
     SIGN IN
     ============================================================ */

  async function handleLogin(event) {
    event.preventDefault();

    if (loginInProgress) {
      return;
    }

    const supabase = getSupabase();

    if (!supabase || !isSupabaseReady()) {
      setLoginMessage(
        "Supabase connection is unavailable.",
        "error"
      );

      setConnectionStatus(
        "Supabase unavailable",
        "error"
      );

      return;
    }

    const email =
      refs.loginEmail
        ? refs.loginEmail.value.trim()
        : "";

    const password =
      refs.loginPassword
        ? refs.loginPassword.value
        : "";

    if (!email) {
      setLoginMessage(
        "Enter your email address.",
        "error"
      );

      refs.loginEmail?.focus();

      return;
    }

    if (!password) {
      setLoginMessage(
        "Enter your password.",
        "error"
      );

      refs.loginPassword?.focus();

      return;
    }

    loginInProgress = true;

    setLoginLoading(true);

    setLoginMessage("");

    setConnectionStatus(
      "Signing in…"
    );

    try {
      const {
        data,
        error
      } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      if (
        !data ||
        !data.user
      ) {
        throw new Error(
          "Authentication returned no user."
        );
      }

      currentUser = data.user;

      const isAdmin =
        await verifyAdmin(currentUser);

      if (!isAdmin) {
        await supabase.auth.signOut();

        currentUser = null;

        setLoginMessage(
          "This account does not have administrator access.",
          "error"
        );

        setConnectionStatus(
          "Access denied",
          "error"
        );

        emit(
          "echoes:auth-error",
          {
            message:
              "Administrator access is required."
          }
        );

        return;
      }

      setLoginMessage(
        "Signed in successfully.",
        "success"
      );

      setConnectionStatus(
        "Connected",
        "success"
      );

      emit(
        "echoes:authenticated",
        {
          user: currentUser
        }
      );

    } catch (error) {
      console.error(
        "Echoes Admin: Sign-in failed.",
        error
      );

      currentUser = null;

      let message =
        "Unable to sign in.";

      if (
        error &&
        typeof error.message === "string" &&
        error.message.trim()
      ) {
        message =
          error.message;
      }

      setLoginMessage(
        message,
        "error"
      );

      setConnectionStatus(
        "Sign-in failed",
        "error"
      );

      emit(
        "echoes:auth-error",
        {
          message
        }
      );

    } finally {
      loginInProgress = false;

      setLoginLoading(false);
    }
  }


  /* ============================================================
     SIGN OUT
     ============================================================ */

  async function logout() {
    if (logoutInProgress) {
      return false;
    }

    const supabase = getSupabase();

    if (!supabase) {
      currentUser = null;

      emit(
        "echoes:signed-out"
      );

      return false;
    }

    logoutInProgress = true;

    if (refs.logoutButton) {
      refs.logoutButton.disabled = true;
    }

    setConnectionStatus(
      "Signing out…"
    );

    try {
      const {
        error
      } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      currentUser = null;

      clearLoginForm();

      setLoginMessage("");

      setConnectionStatus(
        "Signed out"
      );

      emit(
        "echoes:signed-out"
      );

      return true;

    } catch (error) {
      console.error(
        "Echoes Admin: Sign-out failed.",
        error
      );

      setConnectionStatus(
        "Sign-out failed",
        "error"
      );

      emit(
        "echoes:auth-error",
        {
          message:
            "Unable to sign out."
        }
      );

      return false;

    } finally {
      logoutInProgress = false;

      if (refs.logoutButton) {
        refs.logoutButton.disabled = false;
      }
    }
  }


  /* ============================================================
     AUTH STATE CHANGE
     ============================================================ */

  function handleAuthStateChange(
    event,
    session
  ) {
    if (event === "SIGNED_OUT") {
      currentUser = null;

      emit(
        "echoes:signed-out"
      );

      return;
    }

    if (
      event === "SIGNED_IN" &&
      session &&
      session.user
    ) {
      currentUser = session.user;

      /*
       * The sign-in handler performs administrator
       * verification itself. The auth-state listener
       * therefore only synchronizes the user reference.
       *
       * Session restoration performs its own verification.
       */
      return;
    }

    if (
      event === "USER_UPDATED" &&
      session &&
      session.user
    ) {
      currentUser = session.user;
    }
  }


  /* ============================================================
     REGISTER AUTH LISTENER
     ============================================================ */

  function registerAuthListener() {
    const supabase = getSupabase();

    if (!supabase) {
      return;
    }

    if (authListener) {
      return;
    }

    const result =
      supabase.auth.onAuthStateChange(
        (event, session) => {
          handleAuthStateChange(
            event,
            session
          );
        }
      );

    if (
      result &&
      result.data &&
      result.data.subscription
    ) {
      authListener =
        result.data.subscription;
    }
  }


  /* ============================================================
     INITIALIZATION
     ============================================================ */

  async function initializeAuth() {
    if (authInitialized) {
      return;
    }

    cacheDom();

    if (!refs.loginForm) {
      console.error(
        "Echoes Admin: Login form was not found."
      );

      return;
    }

    registerAuthListener();

    refs.loginForm.addEventListener(
      "submit",
      handleLogin
    );

    if (refs.logoutButton) {
      refs.logoutButton.addEventListener(
        "click",
        logout
      );
    }

    authInitialized = true;

    if (!isSupabaseReady()) {
      setConnectionStatus(
        "Supabase unavailable",
        "error"
      );

      setLoginMessage(
        "Supabase connection is unavailable.",
        "error"
      );

      emit(
        "echoes:auth-error",
        {
          message:
            "Supabase connection is unavailable."
        }
      );

      return;
    }

    await restoreSession();
  }


  /* ============================================================
     PUBLIC API
     ============================================================ */

  window.ECHOES_ADMIN_AUTH = {
    getCurrentUser() {
      return currentUser;
    },

    isAuthenticated() {
      return Boolean(
        currentUser
      );
    },

    async verifyAdmin(user = null) {
      try {
        return await verifyAdmin(
          user
        );
      } catch (error) {
        console.error(
          "Echoes Admin: Public admin verification failed.",
          error
        );

        return false;
      }
    },

    restoreSession,

    logout,

    getConnectionStatus() {
      if (!refs.connectionStatus) {
        return "";
      }

      return refs.connectionStatus.textContent;
    }
  };


  /* ============================================================
     STARTUP
     ============================================================ */

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initializeAuth,
      {
        once: true
      }
    );
  } else {
    initializeAuth();
  }

})();
