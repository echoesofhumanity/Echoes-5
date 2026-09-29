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

  fetch(DATA_URL, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error(`Radio schedule request failed: ${response.status}`);
      return response.json();
    })
    .then(renderRadioSchedule)
    .catch((error) => console.warn("Echoes Radio schedule unavailable.", error));
})();
