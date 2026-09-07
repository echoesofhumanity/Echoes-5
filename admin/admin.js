/* =========================================================
   ECHOES OF HUMANITY
   ADMIN APPLICATION
   Core UI + Authentication
   ========================================================= */

(() => {
  "use strict";

  /* =======================================================
     SUPABASE
     ======================================================= */

  const supabaseClient = window.supabase.createClient(
    window.ECHOES_SUPABASE_URL,
    window.ECHOES_SUPABASE_PUBLISHABLE_KEY
  );

  window.ECHOES_SUPABASE = supabaseClient;


  /* =======================================================
     DOM
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

  const connectionStatusText =
    connectionStatus
      ? connectionStatus.querySelector("span:last-child")
      : null;

  const navigationButtons =
    document.querySelectorAll(
      ".admin-nav button[data-section]"
    );

  const sections =
    document.querySelectorAll(
      "main .admin-section"
    );


  /* =======================================================
     STATE
     ======================================================= */

  const state = {
    user: null,
    authenticated: false,
    isAdmin: false
  };


  /* =======================================================
     UI HELPERS
     ======================================================= */

  function showMessage(
    element,
    message,
    type = "error"
  ) {
    if (!element) {
      return;
    }

    element.textContent = message;

    element.className =
      `admin-message admin-message-${type} is-visible`;
  }


  function clearMessage(element) {
    if (!element) {
      return;
    }

    element.textContent = "";
    element.className = "admin-message";
  }


  function setConnectionStatus(
    text,
    status = "default"
  ) {
    if (!connectionStatus) {
      return;
    }

    connectionStatus.classList.remove(
      "is-connected",
      "is-error"
    );

    if (status === "connected") {
      connectionStatus.classList.add(
        "is-connected"
      );
    }

    if (status === "error") {
      connectionStatus.classList.add(
        "is-error"
      );
    }

    if (connectionStatusText) {
      connectionStatusText.textContent = text;
    }
  }


  /* =======================================================
     VIEW STATE
     ======================================================= */

  function showLogin() {
    state.authenticated = false;
    state.user = null;
    state.isAdmin = false;

    if (authView) {
      authView.classList.add("is-active");
      authView.hidden = false;
    }

    if (adminShell) {
      adminShell.hidden = true;
    }

    clearMessage(loginMessage);

    setConnectionStatus(
      "Authentication required"
    );
  }


  function showAdmin() {
    state.authenticated = true;

    if (authView) {
      authView.classList.remove("is-active");
      authView.hidden = true;
    }

    if (adminShell) {
      adminShell.hidden = false;
    }

    setConnectionStatus(
      "Connected",
      "connected"
    );
  }


  /* =======================================================
     NAVIGATION
     ======================================================= */

  function activateSection(sectionId) {
    if (!sectionId) {
      return;
    }

    sections.forEach(section => {
      const isTarget =
        section.id === sectionId;

      section.classList.toggle(
        "is-active",
        isTarget
      );
    });

    navigationButtons.forEach(button => {
      const isTarget =
        button.dataset.section === sectionId;

      button.classList.toggle(
        "is-active",
        isTarget
      );
    });
  }


  navigationButtons.forEach(button => {
    button.addEventListener(
      "click",
      () => {
        activateSection(
          button.dataset.section
        );
      }
    );
  });


  /* =======================================================
     ADMIN CHECK
     ======================================================= */

  async function verifyAdmin() {
    const {
      data: {
        user
      }
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return false;
    }

    const {
      data,
      error
    } = await supabaseClient.rpc(
      "is_admin"
    );

    if (error) {
      console.error(
        "Admin verification failed:",
        error
      );

      return false;
    }

    return data === true;
  }


  /* =======================================================
     SESSION
     ======================================================= */

  async function restoreSession() {
    setConnectionStatus(
      "Checking session..."
    );

    const {
      data: {
        session
      },
      error
    } = await supabaseClient.auth.getSession();

    if (error) {
      console.error(
        "Session check failed:",
        error
      );

      showLogin();

      showMessage(
        loginMessage,
        "Unable to restore your session."
      );

      return;
    }

    if (!session) {
      showLogin();
      return;
    }

    const isAdmin =
      await verifyAdmin();

    if (!isAdmin) {
      await supabaseClient.auth.signOut();

      showLogin();

      showMessage(
        loginMessage,
        "This account does not have administrator access."
      );

      return;
    }

    state.user = session.user;
    state.isAdmin = true;

    showAdmin();
  }


  /* =======================================================
     LOGIN
     ======================================================= */

  async function handleLogin(event) {
    event.preventDefault();

    clearMessage(loginMessage);

    const email =
      loginEmail
        ? loginEmail.value.trim()
        : "";

    const password =
      loginPassword
        ? loginPassword.value
        : "";

    if (!email || !password) {
      showMessage(
        loginMessage,
        "Please enter your email and password."
      );

      return;
    }

    if (loginButton) {
      loginButton.disabled = true;
      loginButton.textContent = "Signing in...";
    }

    try {
      const {
        data,
        error
      } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      const isAdmin =
        await verifyAdmin();

      if (!isAdmin) {
        await supabaseClient.auth.signOut();

        showMessage(
          loginMessage,
          "This account does not have administrator access."
        );

        return;
      }

      state.user = data.user;
      state.authenticated = true;
      state.isAdmin = true;

      loginForm.reset();

      showAdmin();

    } catch (error) {
      console.error(
        "Login failed:",
        error
      );

      showMessage(
        loginMessage,
        "Sign in failed. Please check your credentials."
      );

    } finally {
      if (loginButton) {
        loginButton.disabled = false;
        loginButton.textContent = "Sign in";
      }
    }
  }


  /* =======================================================
     LOGOUT
     ======================================================= */

  async function handleLogout() {
    if (logoutButton) {
      logoutButton.disabled = true;
      logoutButton.textContent = "Signing out...";
    }

    try {
      const {
        error
      } = await supabaseClient.auth.signOut();

      if (error) {
        throw error;
      }

      showLogin();

    } catch (error) {
      console.error(
        "Logout failed:",
        error
      );

      setConnectionStatus(
        "Sign out failed",
        "error"
      );

    } finally {
      if (logoutButton) {
        logoutButton.disabled = false;
        logoutButton.textContent = "Sign out";
      }
    }
  }


  /* =======================================================
     AUTH STATE LISTENER
     ======================================================= */

  supabaseClient.auth.onAuthStateChange(
    async (_event, session) => {

      if (!session) {
        showLogin();
        return;
      }

      const isAdmin =
        await verifyAdmin();

      if (!isAdmin) {
        await supabaseClient.auth.signOut();
        showLogin();
        return;
      }

      state.user = session.user;
      state.authenticated = true;
      state.isAdmin = true;

      showAdmin();
    }
  );


  /* =======================================================
     EVENTS
     ======================================================= */

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


  /* =======================================================
     INITIALIZE
     ======================================================= */

  restoreSession();

})();
