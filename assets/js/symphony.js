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
  let awaitingFirstInteraction = false;

  const syncToggle = () => {
    if (!toggle) return;
    const playing = !audio.paused && !audio.ended;
    toggle.setAttribute("aria-pressed", String(playing));
    toggle.setAttribute(
      "aria-label",
      playing ? "Pause Where Humanity Echoes" : "Play Where Humanity Echoes"
    );
    toggle.dataset.symphonyState = playing ? "playing" : "paused";
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
    try {
      await audio.play();
    } catch (error) {
      console.info("Echoes symphony awaits manual playback.");
    }
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

  const bindToggle = () => {
    const nextToggle = document.querySelector("[data-symphony-toggle]");
    if (!nextToggle || nextToggle === toggle) return;

    toggle = nextToggle;
    toggle.addEventListener("click", togglePlayback);
    syncToggle();
  };

  audio.addEventListener("play", syncToggle);
  audio.addEventListener("pause", syncToggle);
  audio.addEventListener("ended", syncToggle);

  document.addEventListener("echoes:layout-ready", bindToggle);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      bindToggle();
      attemptAutoplay();
    }, { once: true });
  } else {
    bindToggle();
    attemptAutoplay();
  }

  window.EchoesSymphony = {
    track: TRACK,
    audio,
    toggle: togglePlayback
  };
})();