(() => {
  const DATA_URL = "data/radio/schedule.json";

  const setText = (selector, value) => {
    const element = document.querySelector(selector);
    if (element && value) element.textContent = value;
  };

  const renderRadioSchedule = (data) => {
    if (!data) return;

    setText("#radio-now", data.now?.title || "Awaiting scheduled broadcast");
    setText("#radio-next", data.upNext?.title || "Schedule will appear here");
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
