(() => {
  let audio = null;
  let endpoint = null;
  let state = "idle";

  const ensureAudio = () => {
    if (audio) return audio;

    audio = new Audio();
    audio.preload = "none";

    audio.addEventListener("playing", () => {
      state = "playing";
    });

    audio.addEventListener("pause", () => {
      if (state !== "error") state = "paused";
    });

    audio.addEventListener("waiting", () => {
      state = "buffering";
    });

    audio.addEventListener("error", () => {
      state = "error";
    });

    return audio;
  };

  const configure = (resolvedEndpoint) => {
    endpoint = resolvedEndpoint?.configured ? resolvedEndpoint : null;

    if (!endpoint?.publicStreamUrl) {
      state = "unconfigured";
      return false;
    }

    const player = ensureAudio();
    if (player.src !== endpoint.publicStreamUrl) {
      player.src = endpoint.publicStreamUrl;
    }

    state = "ready";
    return true;
  };

  const play = async () => {
    if (!endpoint?.publicStreamUrl) return false;

    try {
      await ensureAudio().play();
      return true;
    } catch {
      state = "error";
      return false;
    }
  };

  const pause = () => {
    if (!audio) return;
    audio.pause();
  };

  const getState = () => ({
    state,
    configured: Boolean(endpoint?.publicStreamUrl),
    streamType: endpoint?.streamType || null
  });

  window.EchoesRadioPlayer = Object.freeze({
    configure,
    play,
    pause,
    getState
  });
})();
