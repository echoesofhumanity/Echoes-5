(() => {
  const ENDPOINT_URL = "data/radio/stream-endpoint.json";

  const isHttpsUrl = (value) => {
    if (!value) return false;

    try {
      return new URL(value, window.location.href).protocol === "https:";
    } catch {
      return false;
    }
  };

  const resolveEndpoint = (payload) => {
    const endpoint = payload?.broadcastStreamEndpoint;
    if (!endpoint) return null;

    const supportedTypes = Array.isArray(endpoint.supportedStreamTypes)
      ? endpoint.supportedStreamTypes
      : [];

    const configured = Boolean(
      endpoint.status === "configured" &&
      endpoint.publicStreamUrl &&
      endpoint.streamType &&
      supportedTypes.includes(endpoint.streamType) &&
      (!endpoint.secureTransportRequired || isHttpsUrl(endpoint.publicStreamUrl))
    );

    return {
      configured,
      stationId: endpoint.stationId || "echoes-radio",
      publicStreamUrl: configured ? endpoint.publicStreamUrl : null,
      streamType: configured ? endpoint.streamType : null,
      metadataUrl: endpoint.metadataUrl || null,
      healthUrl: endpoint.healthUrl || null
    };
  };

  const loadEndpoint = async () => {
    const response = await fetch(ENDPOINT_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Radio stream endpoint request failed: ${response.status}`);
    }

    return resolveEndpoint(await response.json());
  };

  window.EchoesRadioStream = Object.freeze({
    loadEndpoint
  });
})();
