const SITE_MODE_STORAGE_KEY = "waddy-display-mode";
const SITE_MODE_DEFAULT = "immersive";
const SITE_MODE_VALUES = new Set(["immersive", "classic"]);
const SITE_MODE_BODY_CLASSES = ["mode-immersive", "mode-classic"];

function getModeFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  return SITE_MODE_VALUES.has(mode) ? mode : null;
}

function getStoredMode() {
  try {
    const stored = window.localStorage.getItem(SITE_MODE_STORAGE_KEY);
    return SITE_MODE_VALUES.has(stored) ? stored : null;
  } catch (error) {
    return null;
  }
}

function setStoredMode(mode) {
  try {
    window.localStorage.setItem(SITE_MODE_STORAGE_KEY, mode);
  } catch (error) {
    // Ignore storage failures and continue with in-memory mode.
  }
}

function resolveInitialMode() {
  return getModeFromQuery() || getStoredMode() || SITE_MODE_DEFAULT;
}

function applyMode(mode, options = {}) {
  const { persist = true, updateUrl = true } = options;
  const resolvedMode = SITE_MODE_VALUES.has(mode) ? mode : SITE_MODE_DEFAULT;

  document.documentElement.dataset.siteMode = resolvedMode;

  if (document.body) {
    document.body.classList.remove(...SITE_MODE_BODY_CLASSES);
    document.body.classList.add(`mode-${resolvedMode}`);
  }

  if (persist) {
    setStoredMode(resolvedMode);
  }

  if (updateUrl) {
    const url = new URL(window.location.href);
    url.searchParams.set("mode", resolvedMode);
    window.history.replaceState({}, "", url);
  }

  window.dispatchEvent(
    new CustomEvent("site-mode-change", {
      detail: { mode: resolvedMode },
    })
  );

  return resolvedMode;
}

function getToggleMarkup(mode) {
  const isImmersive = mode === "immersive";
  return `
    <span class="site-mode-toggle__icon" aria-hidden="true">${isImmersive ? "◆" : "▦"}</span>
    <span class="site-mode-toggle__label">${isImmersive ? "IMMERSIVE" : "CLASSIC"}</span>
  `;
}

function updateToggle(button, mode) {
  button.innerHTML = getToggleMarkup(mode);
  button.setAttribute(
    "aria-label",
    mode === "immersive" ? "クラシックモードに切り替える" : "イマーシブモードに切り替える"
  );
  button.setAttribute(
    "title",
    mode === "immersive" ? "Switch to classic mode" : "Switch to immersive mode"
  );
}

function ensureInjectedToggle(initialMode) {
  if (document.getElementById("mode-toggle")) {
    return null;
  }

  let button = document.querySelector("[data-site-mode-toggle]");
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.className = "site-mode-toggle";
    button.dataset.siteModeToggle = "true";
    document.body.appendChild(button);
  }

  updateToggle(button, initialMode);
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const nextMode = document.documentElement.dataset.siteMode === "immersive" ? "classic" : "immersive";
    const applied = applyMode(nextMode);
    updateToggle(button, applied);
  });

  window.addEventListener("site-mode-change", (event) => {
    updateToggle(button, event.detail.mode);
  });

  return button;
}

function initSiteMode() {
  const initialMode = window.__waddyInitialSiteMode || resolveInitialMode();
  const appliedMode = applyMode(initialMode, {
    persist: true,
    updateUrl: Boolean(getModeFromQuery()),
  });
  ensureInjectedToggle(appliedMode);
}

window.__siteMode = {
  applyMode,
  resolveInitialMode,
  getStoredMode,
  key: SITE_MODE_STORAGE_KEY,
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSiteMode, { once: true });
} else {
  initSiteMode();
}
