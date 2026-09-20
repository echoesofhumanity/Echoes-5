(function () {
  "use strict";

  const DEFAULT_LANGUAGE = "en";
  const STORAGE_KEY = "echoes.language";

  const LANGUAGES = Object.freeze({
    en: { label: "English", dir: "ltr", active: true },
    tr: { label: "Türkçe", dir: "ltr", active: true },
    ar: { label: "العربية", dir: "rtl", active: true },
    es: { label: "Español", dir: "ltr", active: false },
    fr: { label: "Français", dir: "ltr", active: false },
    de: { label: "Deutsch", dir: "ltr", active: false },
    pt: { label: "Português", dir: "ltr", active: false },
    ru: { label: "Русский", dir: "ltr", active: false },
    zh: { label: "中文", dir: "ltr", active: false },
    hi: { label: "हिन्दी", dir: "ltr", active: false }
  });

  const normalizeLanguage = (language) =>
    typeof language === "string" ? language.trim().toLowerCase().split("-")[0] : "";

  const isSupported = (language) =>
    Object.prototype.hasOwnProperty.call(LANGUAGES, normalizeLanguage(language));

  const isActive = (language) => {
    const code = normalizeLanguage(language);
    return isSupported(code) && LANGUAGES[code].active === true;
  };

  const getStoredLanguage = () => {
    try {
      return normalizeLanguage(window.localStorage.getItem(STORAGE_KEY));
    } catch (error) {
      return "";
    }
  };

  const getLanguage = () => {
    const stored = getStoredLanguage();
    return isActive(stored) ? stored : DEFAULT_LANGUAGE;
  };

  const applyDocumentLanguage = (language) => {
    const code = isActive(language) ? normalizeLanguage(language) : DEFAULT_LANGUAGE;
    document.documentElement.lang = code;
    document.documentElement.dir = LANGUAGES[code].dir;
    return code;
  };

  const setLanguage = (language) => {
    const code = isActive(language) ? normalizeLanguage(language) : DEFAULT_LANGUAGE;
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch (error) {
      // The document language still changes when storage is unavailable.
    }
    applyDocumentLanguage(code);
    document.dispatchEvent(new CustomEvent("echoes:language-change", {
      detail: { language: code }
    }));
    return code;
  };

  const getNestedValue = (source, key) =>
    key.split(".").reduce((value, part) => value && value[part], source);

  const loadDictionary = async (language, page) => {
    const response = await fetch("locales/" + language + "/pages/" + page + ".json", { cache: "no-store" });
    if (!response.ok) throw new Error("Translation unavailable: " + language + "/" + page);
    return response.json();
  };

  const translatePage = async (language = getLanguage()) => {
    const page = document.body && document.body.dataset.page;
    if (!page) return;
    const code = isActive(language) ? normalizeLanguage(language) : DEFAULT_LANGUAGE;
    let fallback = {};
    try {
      fallback = await loadDictionary(DEFAULT_LANGUAGE, page);
    } catch (error) {
      return;
    }
    let selected = fallback;
    if (code !== DEFAULT_LANGUAGE) {
      try {
        selected = await loadDictionary(code, page);
      } catch (error) {
        selected = fallback;
      }
    }
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.dataset.i18n;
      const value = getNestedValue(selected, key) || getNestedValue(fallback, key);
      if (typeof value === "string") element.textContent = value;
    });
  };

  const init = () => applyDocumentLanguage(getLanguage());

  document.addEventListener("echoes:layout-ready", () => translatePage());
  document.addEventListener("echoes:language-change", (event) => translatePage(event.detail.language));

  window.EchoesI18n = Object.freeze({
    defaultLanguage: DEFAULT_LANGUAGE,
    languages: LANGUAGES,
    getLanguage,
    setLanguage,
    isSupported,
    isActive,
    init,
    translatePage
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
