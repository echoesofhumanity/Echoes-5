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

  const init = () => applyDocumentLanguage(getLanguage());

  window.EchoesI18n = Object.freeze({
    defaultLanguage: DEFAULT_LANGUAGE,
    languages: LANGUAGES,
    getLanguage,
    setLanguage,
    isSupported,
    isActive,
    init
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
