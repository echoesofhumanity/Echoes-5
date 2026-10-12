(() => {
  const DATA_URL = "data/radio/schedule.json";

  const setText = (selector, value) => {
    const element = document.querySelector(selector);
    if (element && value) element.textContent = value;
  };

  const hasValidTime = (value) => {
    if (!value) return false;
    return !Number.isNaN(Date.parse(value));
  };

  const isAllowedStreamSource = (source, type, policy) => {
    if (!source || !type || !policy) return false;

    try {
      const url = new URL(source, window.location.href);
      const protocol = url.protocol.replace(":", "");
      const acceptedProtocols = Array.isArray(policy.acceptedProtocols) ? policy.acceptedProtocols : [];
      const acceptedTypes = Array.isArray(policy.acceptedStreamTypes) ? policy.acceptedStreamTypes : [];

      if (policy.requireSecureSource && protocol !== "https") return false;
      if (acceptedProtocols.length && !acceptedProtocols.includes(protocol)) return false;
      if (acceptedTypes.length && !acceptedTypes.includes(type)) return false;

      return true;
    } catch {
      return false;
    }
  };

  const resolveLiveState = (data) => {
    const live = data?.live;
    const validStream = isAllowedStreamSource(
      live?.streamSource,
      live?.streamType,
      data?.streamPolicy
    );
    const isLive = Boolean(
      live?.enabled &&
      live?.authorized &&
      live?.status === "on-air" &&
      validStream
    );

    if (!isLive) return null;

    return {
      title: live.programTitle || "Echoes Radio Live",
      format: "live",
      host: live.presenter || "Echoes Radio",
      streamSource: live.streamSource,
      streamType: live.streamType,
      startedAt: live.startedAt || null,
      isLive: true
    };
  };

  const resolveProgramState = (data) => {
    const liveProgram = resolveLiveState(data);
    const schedule = Array.isArray(data?.schedule) ? data.schedule : [];
    const nowTime = Date.now();

    const timedPrograms = schedule
      .filter((program) => hasValidTime(program.startAt) && hasValidTime(program.endAt))
      .map((program) => ({
        ...program,
        startTime: Date.parse(program.startAt),
        endTime: Date.parse(program.endAt)
      }))
      .sort((a, b) => a.startTime - b.startTime);

    const scheduledNow = timedPrograms.find(
      (program) => program.status !== "cancelled" && program.startTime <= nowTime && nowTime < program.endTime
    );

    const nextProgram = timedPrograms.find(
      (program) => program.status !== "cancelled" && program.startTime > nowTime
    );

    return {
      now: liveProgram || data?.now || scheduledNow || null,
      upNext: data?.upNext || nextProgram || null,
      live: Boolean(liveProgram)
    };
  };

  const renderRadioSchedule = (data) => {
    if (!data) return;

    const state = resolveProgramState(data);

    setText("#radio-now", state.now?.title || "Awaiting scheduled broadcast");
    setText("#radio-next", state.upNext?.title || "Schedule will appear here");
    setText("#radio-flow", data.fallback?.label || "24/7 Flow");
  };

  // Display verified Icecast metadata without changing scheduled-program logic.
  const initializeNowMetadata = () => {
    const nowElement = document.querySelector("#radio-now");
    const liveNowElement = document.querySelector("#radio-live-now-title");
    if (!nowElement && !liveNowElement) return;

    const refresh = async () => {
      try {
        const response = await fetch("https://138.2.134.174/radio-now", {
          cache: "no-store",
          signal: AbortSignal.timeout(8000)
        });
        if (!response.ok) throw new Error("Now metadata request failed");
        const data = await response.json();
        if (typeof data.title !== "string" || !data.title.trim()) {
          throw new Error("Now metadata title unavailable");
        }
        if (nowElement) nowElement.textContent = data.title.trim();
        if (liveNowElement) liveNowElement.textContent = data.title.trim();
      } catch (error) {
        console.warn("Echoes Radio now metadata unavailable.", error);
      }
    };

    refresh();
    window.setInterval(refresh, 30000);
  };

  const loadStreamEndpoint = async () => {
    if (!window.EchoesRadioStream?.loadEndpoint) return null;

    try {
      return await window.EchoesRadioStream.loadEndpoint();
    } catch (error) {
      console.warn("Echoes Radio stream endpoint unavailable.", error);
      return null;
    }
  };

  const configurePlayer = (streamEndpoint) => {
    if (!window.EchoesRadioPlayer?.configure) return false;
    return window.EchoesRadioPlayer.configure(streamEndpoint);
  };

  const syncListenerControl = (playerConfigured) => {
    const control = document.querySelector("#radio-play-toggle");
    if (!control) return;

    const sync = () => {
      const state = window.EchoesRadioPlayer?.getState?.().state || "unconfigured";
      const playing = state === "playing";
      const buffering = state === "buffering";
      control.disabled = !playerConfigured;
      control.setAttribute("aria-disabled", String(!playerConfigured));
      control.setAttribute("aria-pressed", String(playing));
      control.setAttribute("aria-busy", String(buffering));
      control.textContent = playing ? "Pause Live" : buffering ? "Connecting…" : "Listen Live";
    };

    sync();
    if (!playerConfigured) return;

    control.addEventListener("click", async () => {
      const player = window.EchoesRadioPlayer;
      if (!player || control.getAttribute("aria-busy") === "true") return;
      if (player.getState?.().state === "playing") {
        player.pause();
      } else {
        await player.play();
      }
      sync();
    });

    // Audio playback can change without a button click (network interruption,
    // buffering, browser media controls). Keep the visible control truthful.
    window.setInterval(sync, 500);
    window.addEventListener("pagehide", () => {
      window.EchoesRadioPlayer?.pause?.();
    }, { once: true });
  };

  // Read only the public, filtered listener statistics endpoint.
  const initializeListenerStats = () => {
    const counter = document.querySelector("#radio-live-listeners");
    const peakCounter = document.querySelector("#radio-peak-listeners");
    if (!counter || !peakCounter) return;

    const refresh = async () => {
      try {
        const response = await fetch("https://138.2.134.174/radio-stats", {
          cache: "no-store",
          signal: AbortSignal.timeout(8000)
        });
        if (!response.ok) throw new Error("Statistics request failed");
        const data = await response.json();
        if (!Number.isSafeInteger(data.listeners) || data.listeners < 0) {
          throw new Error("Invalid listener count");
        }
        counter.textContent = String(data.listeners);
        counter.setAttribute("aria-label", `${data.listeners} live listeners`);
        if (!Number.isSafeInteger(data.peakListeners) || data.peakListeners < 0) {
          throw new Error("Invalid peak listener count");
        }
        peakCounter.textContent = String(data.peakListeners);
        peakCounter.setAttribute("aria-label", `${data.peakListeners} peak concurrent listeners`);
      } catch (error) {
        counter.textContent = "—";
        counter.setAttribute("aria-label", "Live listener count unavailable");
        peakCounter.textContent = "—";
        peakCounter.setAttribute("aria-label", "Peak listener count unavailable");
        console.warn("Echoes Radio listener statistics unavailable.", error);
      }
    };

    refresh();
    window.setInterval(refresh, 30000);
  };

  const initializeRadio = async () => {
    const [scheduleResult, streamEndpoint] = await Promise.all([
      fetch(DATA_URL, { cache: "no-store" })
        .then((response) => {
          if (!response.ok) throw new Error(`Radio schedule request failed: ${response.status}`);
          return response.json();
        })
        .catch((error) => {
          console.warn("Echoes Radio schedule unavailable.", error);
          return null;
        }),
      loadStreamEndpoint()
    ]);

    renderRadioSchedule(scheduleResult);
    initializeNowMetadata();
    const playerConfigured = configurePlayer(streamEndpoint);
    syncListenerControl(playerConfigured);
    initializeListenerStats();

    window.EchoesRadioRuntime = Object.freeze({
      streamEndpoint,
      playerConfigured
    });
  };

  initializeRadio();
})();
