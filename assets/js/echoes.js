/*
 * Echoes of Humanity
 * Shared site interaction layer
 */

(function () {
  "use strict";

  function initNavigation() {
    const toggle = document.querySelector("[data-menu-toggle]");
    const nav = document.querySelector("[data-site-nav]");

    if (!toggle || !nav) {
      return;
    }

    toggle.addEventListener("click", function () {
      const isOpen = nav.classList.toggle("is-open");

      toggle.setAttribute(
        "aria-expanded",
        String(isOpen)
      );
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });

    document.addEventListener("click", function (event) {
      if (
        !nav.contains(event.target) &&
        !toggle.contains(event.target)
      ) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }


  function initReveal() {
    const elements = document.querySelectorAll(
      "[data-reveal]"
    );

    if (!elements.length) {
      return;
    }

    if (
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
    ) {
      elements.forEach(function (element) {
        element.classList.add("is-visible");
      });

      return;
    }

    const observer = new IntersectionObserver(
      function (entries, observerInstance) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add("is-visible");
          observerInstance.unobserve(entry.target);
        });
      },
      {
        threshold: 0.12
      }
    );

    elements.forEach(function (element) {
      observer.observe(element);
    });
  }


  function init() {
    initNavigation();
    initReveal();
  }


  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }

})();
