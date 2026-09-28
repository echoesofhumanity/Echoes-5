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

  const togglePlayback = async () => {
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
    document.addEventListener("DOMContentLoaded", bindToggle, { once: true });
  } else {
    bindToggle();
  }

  window.EchoesSymphony = {
    track: TRACK,
    audio,
    toggle: togglePlayback
  };
})();