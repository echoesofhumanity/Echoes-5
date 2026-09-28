(function () {
  "use strict";

  const TRACK = {
    title: "Where Humanity Echoes",
    subtitle: "A Contemporary Humanist Chamber Symphony",
    artist: "Efe",
    src: "assets/audio/where-humanity-echoes.m4a"
  };

  const audio = new Audio(TRACK.src);
  audio.preload = "metadata";
  audio.loop = false;

  let toggle = null;
  let identityPanel = null;
  let awaitingFirstInteraction = false;
  let pressTimer = null;
  let longPressTriggered = false;
  const LONG_PRESS_MS = 620;

  const syncToggle = () => {
    if (!toggle) return;
    const playing = !audio.paused && !audio.ended;
    toggle.setAttribute("aria-pressed", String(playing));
    toggle.setAttribute("aria-label", playing ? "Pause Where Humanity Echoes" : "Play Where Humanity Echoes");
    toggle.dataset.symphonyState = playing ? "playing" : "paused";
    if (identityPanel) {
      const status = identityPanel.querySelector("[data-symphony-status]");
      if (status) status.textContent = playing ? "NOW PLAYING" : "PAUSED";
    }
  };

  const ensureIdentityPanel = () => {
    if (identityPanel) return identityPanel;
    identityPanel = document.createElement("div");
    identityPanel.className = "symphony-identity";
    identityPanel.hidden = true;
    identityPanel.setAttribute("role", "status");
    identityPanel.setAttribute("aria-live", "polite");
    identityPanel.innerHTML = `
      <div class="symphony-identity__eyebrow" data-symphony-status>PAUSED</div>
      <strong class="symphony-identity__title">${TRACK.title}</strong>
      <span class="symphony-identity__subtitle">${TRACK.subtitle}</span>
      <span class="symphony-identity__artist">Music by ${TRACK.artist}</span>
    `;
    document.body.appendChild(identityPanel);
    syncToggle();
    return identityPanel;
  };

  const showIdentity = () => {
    const panel = ensureIdentityPanel();
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add("is-visible"));
  };

  const hideIdentity = () => {
    if (!identityPanel || identityPanel.hidden) return;
    identityPanel.classList.remove("is-visible");
    window.setTimeout(() => {
      if (!identityPanel.classList.contains("is-visible")) identityPanel.hidden = true;
    }, 360);
  };

  const removeAutoplayFallback = () => {
    if (!awaitingFirstInteraction) return;
    awaitingFirstInteraction = false;
    document.removeEventListener("pointerdown", resumeAfterFirstInteraction, true);
    document.removeEventListener("keydown", resumeAfterFirstInteraction, true);
  };

  const resumeAfterFirstInteraction = async (event) => {
    if (event.target && event.target.closest && event.target.closest("[data-symphony-toggle]")) {
      removeAutoplayFallback();
      return;
    }
    removeAutoplayFallback();
    try { await audio.play(); } catch (error) { console.info("Echoes symphony awaits manual playback."); }
  };

  const installAutoplayFallback = () => {
    if (awaitingFirstInteraction) return;
    awaitingFirstInteraction = true;
    document.addEventListener("pointerdown", resumeAfterFirstInteraction, true);
    document.addEventListener("keydown", resumeAfterFirstInteraction, true);
  };

  const attemptAutoplay = async () => {
    try {
      await audio.play();
      removeAutoplayFallback();
    } catch (error) {
      installAutoplayFallback();
      syncToggle();
    }
  };

  const togglePlayback = async () => {
    removeAutoplayFallback();
    hideIdentity();
    try {
      if (audio.paused || audio.ended) {
        if (audio.ended) audio.currentTime = 0;
        await audio.play();
      } else {
        audio.pause();
      }
    } catch (error) {
      console.error("Echoes symphony playback failed:", error);
    } finally {
      syncToggle();
    }
  };

  const beginPress = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    longPressTriggered = false;
    window.clearTimeout(pressTimer);
    pressTimer = window.setTimeout(() => {
      longPressTriggered = true;
      showIdentity();
    }, LONG_PRESS_MS);
  };

  const endPress = () => {
    window.clearTimeout(pressTimer);
    pressTimer = null;
  };

  const handleToggleClick = (event) => {
    if (longPressTriggered) {
      event.preventDefault();
      event.stopPropagation();
      longPressTriggered = false;
      return;
    }
    togglePlayback();
  };

  const bindToggle = () => {
    const nextToggle = document.querySelector("[data-symphony-toggle]");
    if (!nextToggle || nextToggle === toggle) return;
    toggle = nextToggle;
    toggle.style.touchAction = "manipulation";
    toggle.style.webkitTouchCallout = "none";
    toggle.style.webkitUserSelect = "none";
    toggle.style.userSelect = "none";
    toggle.addEventListener("pointerdown", beginPress);
    toggle.addEventListener("pointerup", endPress);
    toggle.addEventListener("pointercancel", endPress);
    toggle.addEventListener("contextmenu", event => event.preventDefault());
    toggle.addEventListener("click", handleToggleClick);
    syncToggle();
  };

  audio.addEventListener("play", syncToggle);
  audio.addEventListener("pause", syncToggle);
  audio.addEventListener("ended", syncToggle);

  document.addEventListener("echoes:layout-ready", bindToggle);
  document.addEventListener("pointerdown", event => {
    if (!identityPanel || identityPanel.hidden) return;
    if (event.target.closest("[data-symphony-toggle]") || event.target.closest(".symphony-identity")) return;
    hideIdentity();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      bindToggle();
      attemptAutoplay();
    }, { once: true });
  } else {
    bindToggle();
    attemptAutoplay();
  }

  window.EchoesSymphony = { track: TRACK, audio, toggle: togglePlayback, showIdentity, hideIdentity };
})();