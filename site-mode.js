const SITE_MODE_STORAGE_KEY = "waddy-display-mode";
const SITE_MODE_DEFAULT = "classic";
const SITE_MODE_VALUES = new Set(["immersive", "classic"]);
const SITE_MODE_BODY_CLASSES = ["mode-immersive", "mode-classic"];
const PARTICLE_CANVAS_SELECTOR = "[data-site-mode-particles]";

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

function createParticleLayer() {
  if (document.getElementById("particle-canvas")) {
    return null;
  }

  const stars = document.querySelector(".stars");
  if (!stars) {
    return null;
  }

  let canvas = document.querySelector(PARTICLE_CANVAS_SELECTOR);
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.className = "site-mode-particles";
    canvas.dataset.siteModeParticles = "true";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }

  const particles = [];
  const particleCount = 42;
  const dpr = () => Math.min(window.devicePixelRatio || 1, 2);
  let animationFrame = 0;
  let running = false;
  let width = 0;
  let height = 0;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr());
    canvas.height = Math.round(height * dpr());
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr(), 0, 0, dpr(), 0, 0);
  }

  function resetParticle(particle, scatter = false) {
    particle.x = Math.random() * width;
    particle.y = scatter ? Math.random() * height : height + Math.random() * height * 0.18;
    particle.vx = (Math.random() - 0.5) * 0.22;
    particle.vy = -(Math.random() * 0.42 + 0.16);
    particle.radius = Math.random() * 2.4 + 0.8;
    particle.alpha = Math.random() * 0.36 + 0.16;
    particle.pulse = Math.random() * Math.PI * 2;
    particle.drift = Math.random() * 0.018 + 0.004;
  }

  function seedParticles() {
    particles.length = 0;
    for (let index = 0; index < particleCount; index += 1) {
      const particle = {};
      resetParticle(particle, true);
      particles.push(particle);
    }
  }

  function drawFrame(time) {
    if (!running) {
      return;
    }

    ctx.clearRect(0, 0, width, height);

    for (const particle of particles) {
      particle.x += particle.vx + Math.sin(time * particle.drift + particle.pulse) * 0.12;
      particle.y += particle.vy;

      if (particle.y < -16 || particle.x < -24 || particle.x > width + 24) {
        resetParticle(particle);
      }

      const shimmer = Math.sin(time * 0.0018 + particle.pulse) * 0.28 + 0.72;
      const alpha = particle.alpha * shimmer;
      const gradient = ctx.createRadialGradient(
        particle.x,
        particle.y,
        0,
        particle.x,
        particle.y,
        particle.radius * 6
      );

      gradient.addColorStop(0, `rgba(196, 234, 255, ${alpha})`);
      gradient.addColorStop(0.42, `rgba(132, 212, 255, ${alpha * 0.4})`);
      gradient.addColorStop(1, "rgba(132, 212, 255, 0)");

      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius * 6, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    animationFrame = window.requestAnimationFrame(drawFrame);
  }

  function stop() {
    running = false;
    if (animationFrame) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
    ctx.clearRect(0, 0, width, height);
  }

  function start() {
    if (running) {
      return;
    }
    running = true;
    resize();
    if (!particles.length) {
      seedParticles();
    }
    animationFrame = window.requestAnimationFrame(drawFrame);
  }

  function sync(mode) {
    if (mode === "immersive") {
      start();
    } else {
      stop();
    }
  }

  resize();
  seedParticles();
  window.addEventListener("resize", resize);

  return { sync };
}

function initSiteMode() {
  const initialMode = window.__waddyInitialSiteMode || resolveInitialMode();
  const appliedMode = applyMode(initialMode, {
    persist: true,
    updateUrl: Boolean(getModeFromQuery()),
  });
  const particleLayer = createParticleLayer();
  if (particleLayer) {
    particleLayer.sync(appliedMode);
    window.addEventListener("site-mode-change", (event) => {
      particleLayer.sync(event.detail.mode);
    });
  }
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
