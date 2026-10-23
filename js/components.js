document.addEventListener("DOMContentLoaded", () => {
  loadComponent('[data-component="footer"]', "footer.html");
});

async function loadComponent(selector, file) {
  const container = document.querySelector(selector);

  if (!container) {
    return;
  }

  try {
    const response = await fetch(filePath(file));

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ao carregar ${file}`);
    }

    container.innerHTML = await response.text();

    if (file === "footer.html") {
      configureLanguageLinks();
    }
  } catch (error) {
    console.error(`Erro ao carregar ${file}:`, error);
  }
}

function filePath(file) {
  const componentPath = document.body.dataset.componentPath || "components/";

  return componentPath + file;
}

function configureLanguageLinks() {
  const currentLanguage = document.documentElement.lang;

  const currentPath = window.location.pathname;

  const fileName = currentPath.split("/").pop() || "index.html";

  const pageMap = {
    /* =========================
       INDEX
       ========================= */

    "index.html": {
      "pt-BR": "index.html",
      en: "index.html",
      es: "index.html",
      fr: "index.html",
      de: "index.html",
      it: "index.html",
    },

    /* =========================
       TERMOS / TERMS / TÉRMINOS
       ========================= */

    "termos.html": {
      "pt-BR": "termos.html",
      en: "terms.html",
      es: "terminos.html",
      fr: "conditions.html",
      de: "nutzungsbedingungen.html",
      it: "termini.html",
    },

    "terms.html": {
      "pt-BR": "termos.html",
      en: "terms.html",
      es: "terminos.html",
      fr: "conditions.html",
      de: "nutzungsbedingungen.html",
      it: "termini.html",
    },

    "terminos.html": {
      "pt-BR": "termos.html",
      en: "terms.html",
      es: "terminos.html",
      fr: "conditions.html",
      de: "nutzungsbedingungen.html",
      it: "termini.html",
    },

    "conditions.html": {
      "pt-BR": "termos.html",
      en: "terms.html",
      es: "terminos.html",
      fr: "conditions.html",
      de: "nutzungsbedingungen.html",
      it: "termini.html",
    },

    "nutzungsbedingungen.html": {
      "pt-BR": "termos.html",
      en: "terms.html",
      es: "terminos.html",
      fr: "conditions.html",
      de: "nutzungsbedingungen.html",
      it: "termini.html",
    },

    "termini.html": {
      "pt-BR": "termos.html",
      en: "terms.html",
      es: "terminos.html",
      fr: "conditions.html",
      de: "nutzungsbedingungen.html",
      it: "termini.html",
    },

    /* =========================
       PRIVACIDADE / PRIVACY
       ========================= */

    "privacidade.html": {
      "pt-BR": "privacidade.html",
      en: "privacy.html",
      es: "privacidad.html",
      fr: "confidentialite.html",
      de: "datenschutz.html",
      it: "privacy.html",
    },

    "privacy.html": {
      "pt-BR": "privacidade.html",
      en: "privacy.html",
      es: "privacidad.html",
      fr: "confidentialite.html",
      de: "datenschutz.html",
      it: "privacy.html",
    },

    "privacidad.html": {
      "pt-BR": "privacidade.html",
      en: "privacy.html",
      es: "privacidad.html",
      fr: "confidentialite.html",
      de: "datenschutz.html",
      it: "privacy.html",
    },

    "confidentialite.html": {
      "pt-BR": "privacidade.html",
      en: "privacy.html",
      es: "privacidad.html",
      fr: "confidentialite.html",
      de: "datenschutz.html",
      it: "privacy.html",
    },

    "datenschutz.html": {
      "pt-BR": "privacidade.html",
      en: "privacy.html",
      es: "privacidad.html",
      fr: "confidentialite.html",
      de: "datenschutz.html",
      it: "privacy.html",
    },

    /* =========================
       EXCLUSÃO / DELETION
       ========================= */

    "exclusao.html": {
      "pt-BR": "exclusao.html",
      en: "deletion.html",
      es: "eliminacion.html",
      fr: "suppression.html",
      de: "kontoloeschung.html",
      it: "eliminazione.html",
    },

    "deletion.html": {
      "pt-BR": "exclusao.html",
      en: "deletion.html",
      es: "eliminacion.html",
      fr: "suppression.html",
      de: "kontoloeschung.html",
      it: "eliminazione.html",
    },

    "eliminacion.html": {
      "pt-BR": "exclusao.html",
      en: "deletion.html",
      es: "eliminacion.html",
      fr: "suppression.html",
      de: "kontoloeschung.html",
      it: "eliminazione.html",
    },

    "suppression.html": {
      "pt-BR": "exclusao.html",
      en: "deletion.html",
      es: "eliminacion.html",
      fr: "suppression.html",
      de: "kontoloeschung.html",
      it: "eliminazione.html",
    },

    "kontoloeschung.html": {
      "pt-BR": "exclusao.html",
      en: "deletion.html",
      es: "eliminacion.html",
      fr: "suppression.html",
      de: "kontoloeschung.html",
      it: "eliminazione.html",
    },

    "eliminazione.html": {
      "pt-BR": "exclusao.html",
      en: "deletion.html",
      es: "eliminacion.html",
      fr: "suppression.html",
      de: "kontoloeschung.html",
      it: "eliminazione.html",
    },
  };

  const pageFiles = pageMap[fileName];

  if (!pageFiles) {
    console.warn(`components.js: página não mapeada: ${fileName}`);
    return;
  }

  const directories = {
    "pt-BR": "",
    en: "en/",
    es: "es/",
    fr: "fr/",
    de: "de/",
    it: "it/",
  };

  document.querySelectorAll("[data-lang]").forEach((link) => {
    const language = link.dataset.lang;

    const targetFile = pageFiles[language];

    const directory = directories[language];

    if (!targetFile || directory === undefined) {
      return;
    }

    link.href = getRootPath() + directory + targetFile;

    link.lang = language;

    if (language === currentLanguage) {
      link.setAttribute("aria-current", "page");
    }
  });
}

function getRootPath() {
  const path = window.location.pathname;

  const folders = ["/en/", "/es/", "/fr/", "/de/", "/it/"];

  const positions = folders
    .map((folder) => path.indexOf(folder))
    .filter((position) => position >= 0);

  if (positions.length === 0) {
    return "";
  }

  return path.substring(0, Math.min(...positions) + 1);
}
