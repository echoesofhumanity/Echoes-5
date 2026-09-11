/*
============================================================
ECHOES OF HUMANITY — ADMIN V2
CENTRAL ADMIN CONTROLLER
PART 1 / 4
============================================================
*/

(() => {
  "use strict";

  /*
  ==========================================================
  DOM REFERENCES
  ==========================================================
  */

  const adminApp = document.getElementById("adminApp");

  const authView = document.getElementById("authView");
  const adminShell = document.getElementById("adminShell");

  const adminNavigation = document.getElementById("adminNavigation");
  const logoutButton = document.getElementById("logoutButton");
  const connectionStatus = document.getElementById("connectionStatus");

  const dashboardSection = document.getElementById("dashboardSection");
  const contentSection = document.getElementById("contentSection");
  const librarySection = document.getElementById("librarySection");
  const settingsSection = document.getElementById("settingsSection");

  /*
  ==========================================================
  SECTION REGISTRY
  ==========================================================
  */

  const sections = {
    dashboardSection,
    contentSection,
    librarySection,
    settingsSection
  };

  const sectionOrder = [
    "dashboardSection",
    "contentSection",
    "librarySection",
    "settingsSection"
  ];

  let currentSection = "dashboardSection";

  /*
  ==========================================================
  SAFETY CHECK
  ==========================================================
  */

  const requiredElements = [
    ["adminApp", adminApp],
    ["authView", authView],
    ["adminShell", adminShell],
    ["adminNavigation", adminNavigation],
    ["logoutButton", logoutButton],
    ["connectionStatus", connectionStatus],
    ["dashboardSection", dashboardSection],
    ["contentSection", contentSection],
    ["librarySection", librarySection],
    ["settingsSection", settingsSection]
  ];

  const missingElements = requiredElements
    .filter(([, element]) => !element)
    .map(([name]) => name);

  if (missingElements.length > 0) {
    console.error(
      "Echoes Admin V2: Required elements are missing:",
      missingElements
    );
    return;
  }

  /*
  ==========================================================
  SECTION HELPERS
  ==========================================================
  */

  function isValidSection(sectionId) {
    return Object.prototype.hasOwnProperty.call(
      sections,
      sectionId
    );
  }

  function setActiveNavigation(sectionId) {
    const navigationButtons =
      adminNavigation.querySelectorAll(
        "[data-section]"
      );

    navigationButtons.forEach((button) => {
      const targetSection =
        button.getAttribute("data-section");

      const isActive =
        targetSection === sectionId;

      button.classList.toggle(
        "is-active",
        isActive
      );

      button.setAttribute(
        "aria-current",
        isActive ? "page" : "false"
      );
    });
  }

  function showSection(sectionId) {
    if (!isValidSection(sectionId)) {
      console.warn(
        "Echoes Admin V2: Unknown section:",
        sectionId
      );
      return false;
    }

    sectionOrder.forEach((id) => {
      const section = sections[id];

      if (!section) {
        return;
      }

      const isTarget = id === sectionId;

      section.hidden = !isTarget;
      section.classList.toggle(
        "is-active",
        isTarget
      );
    });

    currentSection = sectionId;

    setActiveNavigation(sectionId);

    return true;
        }

    /*
  ==========================================================
  AUTHENTICATION VIEW STATE
  ==========================================================
  */

  function showAuthenticatedShell() {
    authView.hidden = true;
    adminShell.hidden = false;

    adminApp.classList.add("is-authenticated");

    showSection(currentSection);
  }

  function showAuthenticationView() {
    adminShell.hidden = true;
    authView.hidden = false;

    adminApp.classList.remove(
      "is-authenticated"
    );

    currentSection = "dashboardSection";

    showSection(currentSection);
  }

  /*
  ==========================================================
  CONNECTION STATUS
  ==========================================================
  */

  function setConnectionStatus(
    message,
    state = ""
  ) {
    connectionStatus.textContent = message;

    connectionStatus.classList.remove(
      "is-connected",
      "is-error",
      "is-loading"
    );

    if (state) {
      connectionStatus.classList.add(
        state
      );
    }
  }

  /*
  ==========================================================
  NAVIGATION
  ==========================================================
  */

  function handleNavigation(sectionId) {
    if (!isValidSection(sectionId)) {
      return;
    }

    if (!window.ECHOES_ADMIN_AUTH) {
      console.warn(
        "Echoes Admin V2: Authentication module is unavailable."
      );
      return;
    }

    if (
      !window.ECHOES_ADMIN_AUTH.isAuthenticated()
    ) {
      return;
    }

    showSection(sectionId);

    if (
      sectionId === "dashboardSection" &&
      window.ECHOES_ADMIN_DASHBOARD
    ) {
      window.ECHOES_ADMIN_DASHBOARD
        .refresh()
        .catch(() => {});
    }

    if (
      sectionId === "librarySection" &&
      window.ECHOES_ADMIN_LIBRARY
    ) {
      window.ECHOES_ADMIN_LIBRARY
        .refresh()
        .catch(() => {});
    }

    if (
      sectionId === "settingsSection" &&
      window.ECHOES_ADMIN_SETTINGS
    ) {
      window.ECHOES_ADMIN_SETTINGS
        .refresh()
        .catch(() => {});
    }
  }

  function handleNavigationClick(event) {
    const button =
      event.target.closest(
        "[data-section]"
      );

    if (!button) {
      return;
    }

    if (
      !adminNavigation.contains(button)
    ) {
      return;
    }

    event.preventDefault();

    const sectionId =
      button.getAttribute(
        "data-section"
      );

    handleNavigation(sectionId);
  }

  /*
  ==========================================================
  CUSTOM NAVIGATION EVENTS
  ==========================================================
  */

  function handleNavigateEvent(event) {
    if (!event.detail) {
      return;
    }

    const sectionId =
      event.detail.section;

    if (!sectionId) {
      return;
    }

    handleNavigation(sectionId);
  }

  /*
  ==========================================================
  AUTHENTICATED EVENT
  ==========================================================
  */

  function handleAuthenticated(event) {
    showAuthenticatedShell();

    setConnectionStatus(
      "Connected",
      "is-connected"
    );

    /*
    Always begin a newly authenticated session
    on Dashboard.
    */

    showSection(
      "dashboardSection"
    );

    /*
    The individual modules listen to the same
    authentication event and load their own data.
    */
  }

  function handleSignedOut() {
    showAuthenticationView();

    setConnectionStatus(
      "Signed out",
      ""
    );
  }

    /*
  ==========================================================
  AUTH ERROR
  ==========================================================
  */

  function handleAuthError() {
    showAuthenticationView();

    setConnectionStatus(
      "Authentication error",
      "is-error"
    );
  }

  /*
  ==========================================================
  AUTH STATE SYNCHRONIZATION
  ==========================================================
  */

  function synchronizeAuthenticationState() {
    if (
      !window.ECHOES_ADMIN_AUTH
    ) {
      showAuthenticationView();

      setConnectionStatus(
        "Authentication unavailable",
        "is-error"
      );

      return;
    }

    const authenticated =
      window.ECHOES_ADMIN_AUTH
        .isAuthenticated();

    if (authenticated) {
      showAuthenticatedShell();

      setConnectionStatus(
        "Connected",
        "is-connected"
      );

      showSection(
        "dashboardSection"
      );

      return;
    }

    showAuthenticationView();

    setConnectionStatus(
      "Waiting for sign in",
      "is-loading"
    );
  }

  /*
  ==========================================================
  LOGOUT
  ==========================================================
  */

  async function handleLogout() {
    if (
      !window.ECHOES_ADMIN_AUTH
    ) {
      return;
    }

    logoutButton.disabled = true;

    setConnectionStatus(
      "Signing out...",
      "is-loading"
    );

    try {
      await window.ECHOES_ADMIN_AUTH
        .logout();
    } catch (error) {
      console.error(
        "Echoes Admin V2: Logout failed.",
        error
      );

      setConnectionStatus(
        "Sign out failed",
        "is-error"
      );

      logoutButton.disabled = false;
    }
  }

  /*
  ==========================================================
  MODULE NAVIGATION
  ==========================================================
  */

  function handleContentEditing() {
    handleNavigation(
      "contentSection"
    );
  }

  /*
  ==========================================================
  EVENT REGISTRATION
  ==========================================================
  */

  function registerEvents() {
    adminNavigation.addEventListener(
      "click",
      handleNavigationClick
    );

    logoutButton.addEventListener(
      "click",
      handleLogout
    );

    window.addEventListener(
      "echoes:authenticated",
      handleAuthenticated
    );

    window.addEventListener(
      "echoes:signed-out",
      handleSignedOut
    );

    window.addEventListener(
      "echoes:auth-error",
      handleAuthError
    );

    window.addEventListener(
      "echoes:navigate",
      handleNavigateEvent
    );

    window.addEventListener(
      "echoes:content-editing",
      handleContentEditing
    );
  }

  /*
  ==========================================================
  INITIAL SECTION STATE
  ==========================================================
  */

  function initializeSections() {
    sectionOrder.forEach((id) => {
      const section = sections[id];

      if (!section) {
        return;
      }

      section.hidden =
        id !== "dashboardSection";

      section.classList.toggle(
        "is-active",
        id === "dashboardSection"
      );
    });

    currentSection =
      "dashboardSection";

    setActiveNavigation(
      "dashboardSection"
    );
  }

    /*
  ==========================================================
  INITIALIZE
  ==========================================================
  */

  function initializeController() {
    initializeSections();

    registerEvents();

    synchronizeAuthenticationState();

    console.info(
      "Echoes Admin V2: Central controller initialized."
    );
  }

  /*
  ==========================================================
  PUBLIC API
  ==========================================================
  */

  window.ECHOES_ADMIN_CONTROLLER = {
    showSection,
    navigate: handleNavigation,
    getCurrentSection: () =>
      currentSection,
    isValidSection,
    synchronizeAuthenticationState
  };

  /*
  ==========================================================
  STARTUP
  ==========================================================
  */

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initializeController,
      { once: true }
    );
  } else {
    initializeController();
  }
})();
