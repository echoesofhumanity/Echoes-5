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

  const resolveProgramState = (data) => {
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

    const liveProgram = timedPrograms.find(
      (program) => program.status !== "cancelled" && program.startTime <= nowTime && nowTime < program.endTime
    );

    const nextProgram = timedPrograms.find(
      (program) => program.status !== "cancelled" && program.startTime > nowTime
    );

    return {
      now: data?.now || liveProgram || null,
      upNext: data?.upNext || nextProgram || null
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
