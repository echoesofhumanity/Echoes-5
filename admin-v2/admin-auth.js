/* =========================================================
   ECHOES OF HUMANITY — ADMIN V2
   AUTHENTICATION MODULE
   PART 1 / 4
   ========================================================= */

(() => {
  "use strict";


  /* =======================================================
     DOM REFERENCES
     ======================================================= */

  const authView =
    document.getElementById("authView");

  const adminShell =
    document.getElementById("adminShell");

  const loginForm =
    document.getElementById("loginForm");

  const loginEmail =
    document.getElementById("loginEmail");

  const loginPassword =
    document.getElementById("loginPassword");

  const loginButton =
    document.getElementById("loginButton");

  const loginMessage =
    document.getElementById("loginMessage");

  const logoutButton =
    document.getElementById("logoutButton");

  const connectionStatus =
    document.getElementById("connectionStatus");


  /* =======================================================
     SUPABASE CLIENT
     ======================================================= */

  const supabaseApi =
    window.ECHOES_SUPABASE_API;

  const supabaseClient =
    supabaseApi && supabaseApi.isReady()
      ? supabaseApi.getClient()
      : null;


  /* =======================================================
     AUTH STATE
     ======================================================= */

  let currentUser = null;
  let authInitialized = false;


  /* =======================================================
     MESSAGE HELPERS
     ======================================================= */

  function setLoginMessage(message, type = "") {
    if (!loginMessage) {
      return;
    }

    loginMessage.textContent = message;

    loginMessage.classList.remove(
      "is-success",
      "is-warning",
      "is-error"
    );

    if (type) {
      loginMessage.classList.add(
        `is-${type}`
      );
    }
  }


  function setConnectionStatus(
    message,
    type = "success"
  ) {
    if (!connectionStatus) {
      return;
    }

    connectionStatus.textContent = message;

    connectionStatus.classList.remove(
      "is-success",
      "is-warning",
      "is-error"
    );

    connectionStatus.classList.add(
      `is-${type}`
    );
  }


  function setLoginLoading(isLoading) {
    if (!loginButton) {
      return;
    }

    loginButton.disabled = isLoading;

    loginButton.textContent =
      isLoading
        ? "Signing in…"
        : "Sign in";
  }


  /* =======================================================
     EVENTS
     ======================================================= */

  function emit(name, detail = {}) {
    window.dispatchEvent(
      new CustomEvent(name, {
        detail
      })
    );
  }

    /* =======================================================
     ADMIN VERIFICATION
     ======================================================= */

  async function verifyAdmin(user = null) {
    if (!supabaseClient) {
      return {
        isAdmin: false,
        error: new Error(
          "Supabase client is unavailable."
        )
      };
    }

    const targetUser =
      user ||
      currentUser;

    if (!targetUser) {
      return {
        isAdmin: false,
        error: null
      };
    }

    const { data, error } =
      await supabaseClient.rpc(
        "is_admin"
      );

    if (error) {
      console.error(
        "Echoes Admin V2: Admin verification failed.",
        error
      );

      return {
        isAdmin: false,
        error
      };
    }

    return {
      isAdmin: data === true,
      error: null
    };
  }


  /* =======================================================
     SESSION RESTORATION
     ======================================================= */

  async function restoreSession() {
    if (!supabaseClient) {
      setConnectionStatus(
        "Supabase unavailable",
        "error"
      );

      setLoginMessage(
        "The administration system is temporarily unavailable.",
        "error"
      );

      return;
    }

    setConnectionStatus(
      "Checking connection…",
      "warning"
    );

    const {
      data: {
        session
      },
      error
    } = await supabaseClient.auth.getSession();

    if (error) {
      console.error(
        "Echoes Admin V2: Session restoration failed.",
        error
      );

      setConnectionStatus(
        "Connection error",
        "error"
      );

      return;
    }

    if (!session || !session.user) {
      currentUser = null;

      setConnectionStatus(
        "Sign in required",
        "warning"
      );

      return;
    }

    currentUser = session.user;

    const verification =
      await verifyAdmin(
        currentUser
      );

    if (!verification.isAdmin) {
      currentUser = null;

      await supabaseClient.auth.signOut();

      setConnectionStatus(
        "Access denied",
        "error"
      );

      setLoginMessage(
        "This account does not have administrator access.",
        "error"
      );

      return;
    }

    setConnectionStatus(
      "Connected",
      "success"
    );

    emit(
      "echoes:authenticated",
      {
        user: currentUser,
        restored: true
      }
    );
  }


  /* =======================================================
     LOGIN
     ======================================================= */

  async function handleLogin(event) {
    event.preventDefault();

    if (!supabaseClient) {
      setLoginMessage(
        "Supabase is unavailable.",
        "error"
      );

      return;
    }

    const email =
      loginEmail
        ? loginEmail.value.trim()
        : "";

    const password =
      loginPassword
        ? loginPassword.value
        : "";

    if (!email || !password) {
      setLoginMessage(
        "Enter your email and password.",
        "error"
      );

      return;
    }

    setLoginMessage("");
    setLoginLoading(true);

    const {
      data,
      error
    } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error(
        "Echoes Admin V2: Login failed.",
        error
      );

      setLoginMessage(
        "Sign in failed. Check your credentials.",
        "error"
      );

      setLoginLoading(false);

      return;
    }

    const user =
      data &&
      data.user
        ? data.user
        : null;

    if (!user) {
      setLoginMessage(
        "Sign in completed, but no user session was returned.",
        "error"
      );

      setLoginLoading(false);

      return;
    }

    const verification =
      await verifyAdmin(user);

    if (!verification.isAdmin) {
      await supabaseClient.auth.signOut();

      currentUser = null;

      setLoginMessage(
        "This account does not have administrator access.",
        "error"
      );

      setConnectionStatus(
        "Access denied",
        "error"
      );

      setLoginLoading(false);

      return;
    }

    currentUser = user;

    setLoginMessage(
      "Authentication successful.",
      "success"
    );

    setConnectionStatus(
      "Connected",
      "success"
    );

    emit(
      "echoes:authenticated",
      {
        user: currentUser,
        restored: false
      }
    );

    setLoginLoading(false);
  }

    /* =======================================================
     LOGOUT
     ======================================================= */

  async function handleLogout() {
    if (!supabaseClient) {
      return;
    }

    if (logoutButton) {
      logoutButton.disabled = true;
    }

    const {
      error
    } = await supabaseClient.auth.signOut();

    if (error) {
      console.error(
        "Echoes Admin V2: Logout failed.",
        error
      );

      if (logoutButton) {
        logoutButton.disabled = false;
      }

      emit(
        "echoes:auth-error",
        {
          error
        }
      );

      return;
    }

    currentUser = null;

    setConnectionStatus(
      "Signed out",
      "warning"
    );

    setLoginMessage("");

    if (loginForm) {
      loginForm.reset();
    }

    emit(
      "echoes:signed-out"
    );

    if (logoutButton) {
      logoutButton.disabled = false;
    }
  }


  /* =======================================================
     AUTH STATE CHANGES
     ======================================================= */

  function registerAuthListener() {
    if (!supabaseClient) {
      return;
    }

    supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        if (
          event === "SIGNED_OUT"
        ) {
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

          if (!authInitialized) {
            return;
          }

          const verification =
            await verifyAdmin(
              currentUser
            );

          if (!verification.isAdmin) {
            currentUser = null;

            await supabaseClient.auth.signOut();

            setConnectionStatus(
              "Access denied",
              "error"
            );

            setLoginMessage(
              "This account does not have administrator access.",
              "error"
            );

            return;
          }

          setConnectionStatus(
            "Connected",
            "success"
          );

          emit(
            "echoes:authenticated",
            {
              user: currentUser,
              restored: false
            }
          );
        }
      }
    );
  }


  /* =======================================================
     INITIALIZATION
     ======================================================= */

  async function initializeAuth() {
    if (authInitialized) {
      return;
    }

    authInitialized = true;

    if (!supabaseClient) {
      setConnectionStatus(
        "Supabase unavailable",
        "error"
      );

      setLoginMessage(
        "The administration system is temporarily unavailable.",
        "error"
      );

      emit(
        "echoes:auth-error",
        {
          error: new Error(
            "Supabase client is unavailable."
          )
        }
      );

      return;
    }

    registerAuthListener();

    await restoreSession();
  }


  /* =======================================================
     DOM EVENTS
     ======================================================= */

  function registerDomEvents() {
    if (loginForm) {
      loginForm.addEventListener(
        "submit",
        handleLogin
      );
    }

    if (logoutButton) {
      logoutButton.addEventListener(
        "click",
        handleLogout
      );
    }
              }

    /* =======================================================
     PUBLIC API
     ======================================================= */

  window.ECHOES_ADMIN_AUTH = {
    getCurrentUser() {
      return currentUser;
    },

    isAuthenticated() {
      return !!currentUser;
    },

    async verifyAdmin(user = null) {
      return verifyAdmin(user);
    },

    async restoreSession() {
      return restoreSession();
    },

    async logout() {
      return handleLogout();
    },

    getConnectionStatus() {
      return !!supabaseClient;
    }
  };


  /* =======================================================
     STARTUP
     ======================================================= */

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        registerDomEvents();
        initializeAuth();
      },
      {
        once: true
      }
    );
  } else {
    registerDomEvents();
    initializeAuth();
  }

})();
