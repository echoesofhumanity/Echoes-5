(() => {
  "use strict";

  /*
   * ============================================================
   * ECHOES OF HUMANITY — ADMIN APPLICATION CONTROLLER
   * ============================================================
   *
   * Responsibilities:
   * - Control authentication view / Admin shell visibility.
   * - Control Admin section navigation.
   * - Manage active navigation state.
   * - Respond to application-level CustomEvents.
   * - Coordinate module startup without duplicating module logic.
   * - Keep the Admin interface safe during sign-in/sign-out.
   *
   * This module does NOT:
   * - Query Supabase directly.
   * - Perform Content CRUD.
   * - Upload or delete Storage files.
   * - Implement authentication.
   * - Implement Dashboard calculations.
   * - Implement Library filtering.
   * - Implement Settings checks.
   *
   * Those responsibilities belong to their dedicated modules.
   * ============================================================
   */

  const MODULE_NAME =
    "Echoes Admin: Application Controller";

  const DEFAULT_SECTION =
    "dashboardSection";

  const AUTH_SECTION =
    "authView";

  const SECTION_IDS = [
    "dashboardSection",
    "contentSection",
    "librarySection",
    "settingsSection"
  ];

  const state = {
    initialized: false,
    authenticated: false,
    activeSection: DEFAULT_SECTION,
    currentUser: null
  };

  const refs = {};

  /* ============================================================
     DOM
     ============================================================ */

  function cacheDom() {
    refs.adminApp =
      document.querySelector("#adminApp");

    refs.authView =
      document.querySelector("#authView");

    refs.adminShell =
      document.querySelector("#adminShell");

    refs.adminNav =
      document.querySelector(".admin-nav");

    refs.navButtons = refs.adminNav
      ? Array.from(
          refs.adminNav.querySelectorAll(
            "[data-section]"
          )
        )
      : [];

    refs.sections = new Map();

    SECTION_IDS.forEach((id) => {
      const section =
        document.getElementById(id);

      if (section) {
        refs.sections.set(id, section);
      }
    });

    refs.connectionStatus =
      document.querySelector(
        "#connectionStatus"
      );
  }

  /* ============================================================
     HELPERS
     ============================================================ */

  function emit(name, detail = {}) {
    document.dispatchEvent(
      new CustomEvent(name, {
        detail
      })
    );
  }

  function setHidden(element, hidden) {
    if (!element) {
      return;
    }

    element.hidden = hidden;

    if (hidden) {
      element.setAttribute(
        "aria-hidden",
        "true"
      );
    } else {
      element.removeAttribute(
        "aria-hidden"
      );
    }
  }

  function setActiveClass(
    element,
    active
  ) {
    if (!element) {
      return;
    }

    element.classList.toggle(
      "is-active",
      active
    );

    if (
      element.tagName === "BUTTON"
    ) {
      element.setAttribute(
        "aria-current",
        active ? "page" : "false"
      );
    }
  }

  function getAuthApi() {
    return (
      window.ECHOES_ADMIN_AUTH ||
      null
    );
  }

  function isAuthenticatedFromApi() {
    const auth =
      getAuthApi();

    if (!auth) {
      return false;
    }

    if (
      typeof auth.isAuthenticated ===
      "function"
    ) {
      try {
        return Boolean(
          auth.isAuthenticated()
        );
      } catch (error) {
        console.warn(
          `${MODULE_NAME}: Authentication state check failed.`,
          error
        );
      }
    }

    if (
      Object.prototype.hasOwnProperty.call(
        auth,
        "currentUser"
      )
    ) {
      return Boolean(
        auth.currentUser
      );
    }

    return false;
  }

  function getCurrentUserFromApi() {
    const auth =
      getAuthApi();

    if (!auth) {
      return null;
    }

    if (
      auth.currentUser
    ) {
      return auth.currentUser;
    }

    return null;
  }

  /* ============================================================
     CONNECTION STATUS
     ============================================================ */

  function setConnectionStatus(
    label,
    status
  ) {
    if (!refs.connectionStatus) {
      return;
    }

    const dot =
      refs.connectionStatus.querySelector(
        ".admin-status-dot"
      );

    const text =
      refs.connectionStatus.querySelector(
        "span:last-child"
      );

    if (text) {
      text.textContent =
        label;
    }

    refs.connectionStatus.dataset.status =
      status || "";

    if (dot) {
      dot.dataset.status =
        status || "";
    }
  }

  /* ============================================================
     AUTH VIEW / SHELL
     ============================================================ */

  function showAuthView() {
    state.authenticated = false;
    state.currentUser = null;

    setHidden(
      refs.authView,
      false
    );

    setHidden(
      refs.adminShell,
      true
    );

    setConnectionStatus(
      "Sign in required",
      "signed-out"
    );

    /*
     * Keep the authentication screen visually active.
     */
    setActiveClass(
      refs.authView,
      true
    );

    /*
     * Do not expose authenticated sections while signed out.
     */
    refs.sections.forEach(
      (section) => {
        setHidden(section, true);
        setActiveClass(
          section,
          false
        );
      }
    );

    refs.navButtons.forEach(
      (button) => {
        setActiveClass(
          button,
          false
        );
      }
    );
  }

  function showAdminShell(
    user = null
  ) {
    state.authenticated = true;
    state.currentUser =
      user || null;

    setHidden(
      refs.authView,
      true
    );

    setHidden(
      refs.adminShell,
      false
    );

    setActiveClass(
      refs.authView,
      false
    );

    setConnectionStatus(
      "Administrator connected",
      "connected"
    );

    /*
     * Restore the current section if it is valid.
     * Otherwise use Dashboard.
     */
    if (
      !SECTION_IDS.includes(
        state.activeSection
      )
    ) {
      state.activeSection =
        DEFAULT_SECTION;
    }

    showSection(
      state.activeSection,
      {
        emitEvent: false
      }
    );
  }

  /* ============================================================
     SECTION NAVIGATION
     ============================================================ */

  function showSection(
    sectionId,
    options = {}
  ) {
    const {
      emitEvent = true
    } = options;

    if (
      !state.authenticated
    ) {
      return false;
    }

    if (
      !SECTION_IDS.includes(
        sectionId
      )
    ) {
      console.warn(
        `${MODULE_NAME}: Unknown section "${sectionId}".`
      );

      return false;
    }

    const target =
      refs.sections.get(
        sectionId
      );

    if (!target) {
      console.warn(
        `${MODULE_NAME}: Section "${sectionId}" was not found.`
      );

      return false;
    }

    state.activeSection =
      sectionId;

    refs.sections.forEach(
      (section, id) => {
        const active =
          id === sectionId;

        setHidden(
          section,
          !active
        );

        setActiveClass(
          section,
          active
        );
      }
    );

    refs.navButtons.forEach(
      (button) => {
        const active =
          button.dataset.section ===
          sectionId;

        setActiveClass(
          button,
          active
        );
      }
    );

    /*
     * Move focus to the section heading where possible.
     * This improves keyboard accessibility without changing
     * the visual layout.
     */
    const heading =
      target.querySelector(
        "h1, h2"
      );

    if (heading) {
      if (
        !heading.hasAttribute(
          "tabindex"
        )
      ) {
        heading.setAttribute(
          "tabindex",
          "-1"
        );
      }

      try {
        heading.focus({
          preventScroll: true
        });
      } catch {
        /*
         * Older browsers may not support the options object.
         */
        heading.focus();
      }
    }

    if (emitEvent) {
      emit(
        "echoes:section-changed",
        {
          section:
            sectionId
        }
      );
    }

    return true;
  }

  function handleNavigationClick(
    event
  ) {
    const button =
      event.target.closest(
        "[data-section]"
      );

    if (!button) {
      return;
    }

    if (
      !refs.adminNav ||
      !refs.adminNav.contains(
        button
      )
    ) {
      return;
    }

    const sectionId =
      button.dataset.section;

    showSection(
      sectionId
    );
      }

    /* ============================================================
     APPLICATION EVENTS
     ============================================================ */

  function handleAuthenticated(
    event
  ) {
    const user =
      event?.detail?.user ||
      getCurrentUserFromApi();

    showAdminShell(
      user
    );

    /*
     * Dedicated modules listen to the same authentication event
     * and perform their own data loading.
     */
    emit(
      "echoes:admin-ready",
      {
        user:
          state.currentUser
      }
    );
  }

  function handleSignedOut() {
    showAuthView();
  }

  function handleNavigate(
    event
  ) {
    const section =
      event?.detail?.section;

    if (!section) {
      return;
    }

    /*
     * Accept both:
     *   "dashboardSection"
     * and the short logical names:
     *   "dashboard", "content", "library", "settings"
     */
    const sectionMap = {
      dashboard:
        "dashboardSection",

      content:
        "contentSection",

      library:
        "librarySection",

      settings:
        "settingsSection"
    };

    const resolvedSection =
      sectionMap[section] ||
      section;

    showSection(
      resolvedSection
    );
  }

  function handleAuthError(
    event
  ) {
    const message =
      event?.detail?.message;

    setConnectionStatus(
      message ||
        "Authentication error",
      "error"
    );
  }

  function handleSettingsError() {
    /*
     * Settings errors are displayed by Settings itself.
     * The controller only keeps the global connection indicator
     * meaningful.
     */
    if (
      state.authenticated
    ) {
      setConnectionStatus(
        "Administrator connected",
        "connected"
      );
    }
  }

  function registerApplicationEvents() {
    document.addEventListener(
      "echoes:authenticated",
      handleAuthenticated
    );

    document.addEventListener(
      "echoes:signed-out",
      handleSignedOut
    );

    document.addEventListener(
      "echoes:navigate",
      handleNavigate
    );

    document.addEventListener(
      "echoes:auth-error",
      handleAuthError
    );

    document.addEventListener(
      "echoes:settings-error",
      handleSettingsError
    );
  }

  /* ============================================================
     NAVIGATION
     ============================================================ */

  function registerNavigation() {
    if (!refs.adminNav) {
      return;
    }

    refs.adminNav.addEventListener(
      "click",
      handleNavigationClick
    );
  }

  /* ============================================================
     INITIAL VIEW
     ============================================================ */

  function determineInitialState() {
    if (
      isAuthenticatedFromApi()
    ) {
      showAdminShell(
        getCurrentUserFromApi()
      );

      /*
       * Notify modules that the Admin shell is ready even when
       * authentication happened before this controller loaded.
       */
      emit(
        "echoes:admin-ready",
        {
          user:
            state.currentUser
        }
      );

      return;
    }

    showAuthView();
  }

  /* ============================================================
     INITIALIZATION
     ============================================================ */

  function initializeAdmin() {
    if (
      state.initialized
    ) {
      return;
    }

    cacheDom();

    if (!refs.adminApp) {
      console.error(
        `${MODULE_NAME}: #adminApp was not found.`
      );

      return;
    }

    if (!refs.authView) {
      console.error(
        `${MODULE_NAME}: #authView was not found.`
      );

      return;
    }

    if (!refs.adminShell) {
      console.error(
        `${MODULE_NAME}: #adminShell was not found.`
      );

      return;
    }

    registerNavigation();
    registerApplicationEvents();

    state.initialized =
      true;

    determineInitialState();

    emit(
      "echoes:controller-ready",
      {
        section:
          state.activeSection,
        authenticated:
          state.authenticated
      }
    );
  }

  /* ============================================================
     MOBILE NAVIGATION SUPPORT
     ============================================================ */

  function closeMobileNavigation() {
    if (!refs.adminNav) {
      return;
    }

    refs.adminNav.classList.remove(
      "is-open"
    );
  }

  function handleSectionChanged() {
    /*
     * On small screens, selecting a section should leave the
     * navigation in its normal state.
     *
     * No custom mobile menu button is required by the HTML.
     */
    closeMobileNavigation();
  }

  function registerSectionEvents() {
    document.addEventListener(
      "echoes:section-changed",
      handleSectionChanged
    );
  }

   /* ============================================================
     LOGOUT SAFETY
     ============================================================ */

  function handleBeforeUnload() {
    /*
     * Nothing is persisted here.
     * This handler exists only to ensure the controller does not
     * accidentally retain page-level application state outside
     * the current document lifecycle.
     */
    state.currentUser = null;
  }

  function registerLifecycleEvents() {
    window.addEventListener(
      "beforeunload",
      handleBeforeUnload
    );
  }

  /* ============================================================
     PUBLIC NAVIGATION API
     ============================================================ */

  function navigate(section) {
    const sectionMap = {
      dashboard:
        "dashboardSection",

      content:
        "contentSection",

      library:
        "librarySection",

      settings:
        "settingsSection"
    };

    const resolved =
      sectionMap[section] ||
      section;

    return showSection(
      resolved
    );
  }

  function getActiveSection() {
    return state.activeSection;
  }

  function getState() {
    return {
      initialized:
        state.initialized,

      authenticated:
        state.authenticated,

      activeSection:
        state.activeSection,

      currentUser:
        state.currentUser
          ? {
              id:
                state.currentUser.id ||
                null,

              email:
                state.currentUser.email ||
                null
            }
          : null
    };
  }

  /* ============================================================
     PUBLIC API
     ============================================================ */

  window.ECHOES_ADMIN = {
    navigate,

    showSection: navigate,

    getActiveSection,

    getState,

    isAuthenticated() {
      return state.authenticated;
    },

    getCurrentUser() {
      return state.currentUser;
    }
  };

  /* ============================================================
     STARTUP
     ============================================================ */

  function start() {
    initializeAdmin();
    registerSectionEvents();
    registerLifecycleEvents();
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      start,
      {
        once: true
      }
    );
  } else {
    start();
  }

  /*
   * Secondary safe startup path.
   *
   * The initialization guard prevents duplicate setup if another
   * Admin module dispatches echoes:admin-ready before DOM ready.
   */
  document.addEventListener(
    "echoes:admin-ready",
    () => {
      if (
        !state.initialized
      ) {
        initializeAdmin();
      }
    },
    {
      once: true
    }
  );

   /* ============================================================
     END OF ECHOES OF HUMANITY — ADMIN APPLICATION CONTROLLER
     ============================================================ */

})();
