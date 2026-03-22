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
  const isHomePage = document.querySelector("main.home-page") !== null;

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

  const nebulae = [];
  const pillars = [];
  const streams = [];
  const starscape = [];
  const comets = [];
  const wisps = [];
  const dpr = () => Math.min(window.devicePixelRatio || 1, 2);
  let animationFrame = 0;
  let running = false;
  let width = 0;
  let height = 0;
  let viewportScale = 1;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    viewportScale = Math.max(0.72, Math.min(1.28, Math.sqrt((width * height) / 1280000)));
    canvas.width = Math.round(width * dpr());
    canvas.height = Math.round(height * dpr());
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr(), 0, 0, dpr(), 0, 0);
    seedParticles();
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function resetNebula(nebula, scatter = false) {
    const radiusBase = Math.min(width, height) * randomBetween(0.18, 0.34);
    nebula.x = scatter ? randomBetween(-width * 0.12, width * 1.12) : Math.random() > 0.5 ? -radiusBase : width + radiusBase;
    nebula.y = scatter ? randomBetween(-height * 0.08, height * 1.08) : randomBetween(-height * 0.1, height * 1.1);
    nebula.radius = radiusBase;
    nebula.dx = randomBetween(-0.08, 0.08);
    nebula.dy = randomBetween(-0.05, 0.05);
    nebula.phase = randomBetween(0, Math.PI * 2);
    nebula.pulseSpeed = randomBetween(0.24, 0.58);
    nebula.hue = Math.random() > 0.45 ? randomBetween(188, 224) : randomBetween(278, 320);
    nebula.saturation = randomBetween(54, 82);
    nebula.alpha = randomBetween(0.08, 0.18);
  }

  function resetPillar(pillar, scatter = false) {
    pillar.x = scatter ? randomBetween(0, width) : Math.random() > 0.5 ? -80 : width + 80;
    pillar.width = randomBetween(18, 58) * viewportScale;
    pillar.phase = randomBetween(0, Math.PI * 2);
    pillar.pulseSpeed = randomBetween(0.5, 1.2);
    pillar.sway = randomBetween(10, 36) * viewportScale;
    pillar.drift = randomBetween(-0.42, 0.42);
    pillar.hue = Math.random() > 0.35 ? randomBetween(198, 224) : randomBetween(284, 312);
    pillar.alpha = isHomePage ? randomBetween(0.08, 0.2) : randomBetween(0.06, 0.16);
  }

  function resetStream(stream, scatter = false) {
    stream.anchorX = randomBetween(width * (isHomePage ? 0.12 : 0.04), width * (isHomePage ? 0.88 : 0.96));
    stream.y = scatter ? randomBetween(-height * 0.1, height * 1.1) : height + randomBetween(10, height * 0.2);
    stream.amplitude = randomBetween(width * (isHomePage ? 0.015 : 0.03), width * (isHomePage ? 0.05 : 0.11));
    stream.secondaryAmplitude = randomBetween(isHomePage ? 8 : 10, isHomePage ? 22 : 36) * viewportScale;
    stream.frequency = randomBetween(isHomePage ? 0.35 : 0.8, isHomePage ? 0.7 : 1.55);
    stream.speed = randomBetween(isHomePage ? 0.35 : 0.75, isHomePage ? 0.9 : 2.3) * (0.82 + viewportScale * 0.18);
    stream.width = randomBetween(isHomePage ? 2.2 : 1.2, isHomePage ? 4.4 : 3.2) * viewportScale;
    stream.phase = randomBetween(0, Math.PI * 2);
    stream.hue = Math.random() > 0.4 ? randomBetween(194, 226) : randomBetween(290, 322);
    stream.alpha = randomBetween(isHomePage ? 0.16 : 0.34, isHomePage ? 0.34 : 0.72);
    stream.trail = [];
    stream.trailLength = Math.round(randomBetween(isHomePage ? 60 : 42, isHomePage ? 120 : 94) * viewportScale);
  }

  function resetStar(star, scatter = false) {
    star.x = randomBetween(0, width);
    star.y = scatter ? randomBetween(0, height) : height + randomBetween(0, height * 0.12);
    star.vx = isHomePage ? randomBetween(-0.03, 0.07) : randomBetween(-0.08, 0.16);
    star.vy = isHomePage ? randomBetween(-0.08, 0.03) : randomBetween(-0.24, 0.08);
    star.radius = randomBetween(0.6, isHomePage ? 2.8 : 2.4) * viewportScale;
    star.alpha = randomBetween(isHomePage ? 0.45 : 0.35, 0.95);
    star.phase = randomBetween(0, Math.PI * 2);
    star.speed = randomBetween(isHomePage ? 0.5 : 0.8, isHomePage ? 2.2 : 2.8);
    star.hue = Math.random() > 0.3 ? randomBetween(194, 220) : randomBetween(280, 320);
    star.flare = Math.random() > (isHomePage ? 0.72 : 0.84);
  }

  function resetComet(comet, scatter = false) {
    comet.x = scatter ? randomBetween(-width * 0.15, width * 1.05) : randomBetween(-width * 0.2, width * 0.85);
    comet.y = scatter ? randomBetween(height * 0.08, height * 0.92) : randomBetween(height * 0.35, height * 0.95);
    comet.vx = randomBetween(isHomePage ? 1 : 1.6, isHomePage ? 2.4 : 3.8) * viewportScale;
    comet.vy = -randomBetween(isHomePage ? 0.55 : 0.9, isHomePage ? 1.6 : 2.4) * viewportScale;
    comet.radius = randomBetween(1.1, 2.8) * viewportScale;
    comet.hue = Math.random() > 0.35 ? randomBetween(198, 226) : randomBetween(286, 320);
    comet.alpha = randomBetween(isHomePage ? 0.32 : 0.48, isHomePage ? 0.62 : 0.82);
    comet.phase = randomBetween(0, Math.PI * 2);
    comet.tail = [];
    comet.tailLength = Math.round(randomBetween(10, 24));
  }

  function resetWisp(wisp, scatter = false) {
    const baseRadius = Math.min(width, height) * randomBetween(0.05, 0.12);
    wisp.x = scatter ? randomBetween(-baseRadius, width + baseRadius) : Math.random() > 0.5 ? -baseRadius : width + baseRadius;
    wisp.y = scatter ? randomBetween(-baseRadius, height + baseRadius) : randomBetween(height * 0.08, height * 0.92);
    wisp.radiusX = baseRadius;
    wisp.radiusY = baseRadius * randomBetween(0.45, 0.8);
    wisp.dx = randomBetween(-0.05, 0.05);
    wisp.dy = randomBetween(-0.02, 0.02);
    wisp.phase = randomBetween(0, Math.PI * 2);
    wisp.pulseSpeed = randomBetween(0.2, 0.46);
    wisp.rotation = randomBetween(-Math.PI / 3, Math.PI / 3);
    wisp.hue = Math.random() > 0.46 ? randomBetween(196, 220) : randomBetween(286, 316);
    wisp.alpha = randomBetween(0.08, 0.18);
  }

  function seedParticles() {
    nebulae.length = 0;
    pillars.length = 0;
    streams.length = 0;
    starscape.length = 0;
    comets.length = 0;
    wisps.length = 0;

    const nebulaCount = Math.round((isHomePage ? 6 : 4) + viewportScale * (isHomePage ? 4 : 3));
    const pillarCount = Math.round((isHomePage ? 4 : 2) + viewportScale * (isHomePage ? 3 : 2));
    const streamCount = isHomePage ? Math.round(1 + viewportScale) : Math.round(5 + viewportScale * 4);
    const starCount = Math.round((isHomePage ? 76 : 58) + viewportScale * (isHomePage ? 48 : 38));
    const cometCount = isHomePage ? Math.max(1, Math.round(viewportScale)) : Math.round(3 + viewportScale * 2);
    const wispCount = isHomePage ? Math.round(8 + viewportScale * 5) : 0;

    for (let index = 0; index < nebulaCount; index += 1) {
      const nebula = {};
      resetNebula(nebula, true);
      nebulae.push(nebula);
    }

    for (let index = 0; index < pillarCount; index += 1) {
      const pillar = {};
      resetPillar(pillar, true);
      pillars.push(pillar);
    }

    for (let index = 0; index < streamCount; index += 1) {
      const stream = {};
      resetStream(stream, true);
      streams.push(stream);
    }

    for (let index = 0; index < starCount; index += 1) {
      const star = {};
      resetStar(star, true);
      starscape.push(star);
    }

    for (let index = 0; index < cometCount; index += 1) {
      const comet = {};
      resetComet(comet, true);
      comets.push(comet);
    }

    for (let index = 0; index < wispCount; index += 1) {
      const wisp = {};
      resetWisp(wisp, true);
      wisps.push(wisp);
    }
  }

  function drawNebulae(seconds) {
    for (const nebula of nebulae) {
      nebula.x += nebula.dx + Math.sin(seconds * 0.18 + nebula.phase) * 0.06;
      nebula.y += nebula.dy + Math.cos(seconds * 0.14 + nebula.phase) * 0.04;

      const wrapX = nebula.radius * 1.4;
      const wrapY = nebula.radius * 1.4;
      if (nebula.x < -wrapX) {
        nebula.x = width + wrapX;
      } else if (nebula.x > width + wrapX) {
        nebula.x = -wrapX;
      }
      if (nebula.y < -wrapY) {
        nebula.y = height + wrapY;
      } else if (nebula.y > height + wrapY) {
        nebula.y = -wrapY;
      }

      const pulse = 0.84 + Math.sin(seconds * nebula.pulseSpeed + nebula.phase) * 0.22;
      const radius = nebula.radius * pulse;
      const gradient = ctx.createRadialGradient(nebula.x, nebula.y, 0, nebula.x, nebula.y, radius);
      gradient.addColorStop(0, `hsla(${nebula.hue}, ${nebula.saturation}%, 62%, ${nebula.alpha})`);
      gradient.addColorStop(0.38, `hsla(${nebula.hue}, ${nebula.saturation}%, 42%, ${nebula.alpha * 0.58})`);
      gradient.addColorStop(1, `hsla(${nebula.hue}, ${nebula.saturation}%, 18%, 0)`);

      ctx.beginPath();
      ctx.arc(nebula.x, nebula.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  }

  function drawPillars(seconds) {
    for (const pillar of pillars) {
      pillar.x += pillar.drift + Math.sin(seconds * 0.42 + pillar.phase) * 0.28;
      if (pillar.x < -120) {
        pillar.x = width + 120;
      } else if (pillar.x > width + 120) {
        pillar.x = -120;
      }

      const offset = Math.sin(seconds * pillar.pulseSpeed + pillar.phase) * pillar.sway;
      const centerX = pillar.x + offset;
      const alpha = pillar.alpha * (0.72 + Math.sin(seconds * pillar.pulseSpeed * 0.72 + pillar.phase) * 0.22);
      const gradient = ctx.createLinearGradient(centerX - pillar.width, 0, centerX + pillar.width, 0);
      gradient.addColorStop(0, `hsla(${pillar.hue}, 72%, 58%, 0)`);
      gradient.addColorStop(0.5, `hsla(${pillar.hue}, 78%, 62%, ${alpha})`);
      gradient.addColorStop(1, `hsla(${pillar.hue}, 72%, 58%, 0)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(centerX - pillar.width * 1.2, 0, pillar.width * 2.4, height);
    }
  }

  function drawWisps(seconds) {
    for (const wisp of wisps) {
      wisp.x += wisp.dx + Math.sin(seconds * 0.14 + wisp.phase) * 0.08;
      wisp.y += wisp.dy + Math.cos(seconds * 0.12 + wisp.phase) * 0.05;

      const wrapX = wisp.radiusX * 1.6;
      const wrapY = wisp.radiusY * 1.6;
      if (wisp.x < -wrapX) {
        wisp.x = width + wrapX;
      } else if (wisp.x > width + wrapX) {
        wisp.x = -wrapX;
      }
      if (wisp.y < -wrapY) {
        wisp.y = height + wrapY;
      } else if (wisp.y > height + wrapY) {
        wisp.y = -wrapY;
      }

      const pulse = 0.82 + Math.sin(seconds * wisp.pulseSpeed + wisp.phase) * 0.18;
      const alpha = wisp.alpha * (0.72 + Math.cos(seconds * wisp.pulseSpeed * 1.2 + wisp.phase) * 0.12);

      ctx.save();
      ctx.translate(wisp.x, wisp.y);
      ctx.rotate(wisp.rotation + Math.sin(seconds * 0.09 + wisp.phase) * 0.08);
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, wisp.radiusX * pulse);
      gradient.addColorStop(0, `hsla(${wisp.hue}, 90%, 80%, ${alpha})`);
      gradient.addColorStop(0.42, `hsla(${wisp.hue}, 86%, 68%, ${alpha * 0.46})`);
      gradient.addColorStop(1, `hsla(${wisp.hue}, 82%, 28%, 0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(0, 0, wisp.radiusX * pulse, wisp.radiusY * pulse, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawStreams(seconds) {
    for (const stream of streams) {
      const x =
        stream.anchorX +
        Math.sin(seconds * stream.frequency + stream.phase) * stream.amplitude +
        Math.cos(seconds * (stream.frequency * 0.54) + stream.phase * 0.5) * stream.secondaryAmplitude;

      stream.trail.push({ x, y: stream.y });
      stream.y -= stream.speed;

      if (stream.y < -32) {
        resetStream(stream);
      }

      if (stream.trail.length > stream.trailLength) {
        stream.trail.shift();
      }

      if (stream.trail.length < 3) {
        continue;
      }

      ctx.beginPath();
      ctx.moveTo(stream.trail[0].x, stream.trail[0].y);
      for (let index = 1; index < stream.trail.length; index += 1) {
        const point = stream.trail[index];
        const previous = stream.trail[index - 1];
        ctx.quadraticCurveTo(previous.x, previous.y, (previous.x + point.x) / 2, (previous.y + point.y) / 2);
      }

      ctx.strokeStyle = `hsla(${stream.hue}, 80%, 66%, ${stream.alpha * 0.38})`;
      ctx.lineWidth = stream.width * 2.8;
      ctx.shadowColor = `hsla(${stream.hue}, 88%, 64%, ${stream.alpha * 0.8})`;
      ctx.shadowBlur = 18;
      ctx.stroke();

      ctx.strokeStyle = `hsla(${stream.hue}, 92%, 78%, ${stream.alpha})`;
      ctx.lineWidth = stream.width;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  function drawStars(seconds) {
    for (const star of starscape) {
      star.x += star.vx + Math.sin(seconds * 0.24 + star.phase) * 0.05;
      star.y += star.vy + Math.cos(seconds * 0.2 + star.phase) * 0.04;

      if (star.x < -12) {
        star.x = width + 12;
      } else if (star.x > width + 12) {
        star.x = -12;
      }
      if (star.y < -12) {
        star.y = height + 12;
      } else if (star.y > height + 12) {
        star.y = -12;
      }

      const flicker = 0.66 + Math.sin(seconds * star.speed * 2.2 + star.phase) * 0.34;
      const alpha = star.alpha * flicker;
      const glowRadius = star.radius * (star.flare ? 5.2 : 3.6);

      ctx.beginPath();
      ctx.arc(star.x, star.y, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${star.hue}, 88%, 72%, ${alpha * 0.12})`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius * 1.2, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${star.hue}, 98%, 88%, ${alpha})`;
      ctx.fill();

      if (star.flare) {
        ctx.strokeStyle = `hsla(${star.hue}, 90%, 78%, ${alpha * 0.34})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(star.x - glowRadius, star.y);
        ctx.lineTo(star.x + glowRadius, star.y);
        ctx.moveTo(star.x, star.y - glowRadius);
        ctx.lineTo(star.x, star.y + glowRadius);
        ctx.stroke();
      }
    }
  }

  function drawComets(seconds) {
    for (const comet of comets) {
      comet.x += comet.vx + Math.cos(seconds * 0.9 + comet.phase) * 0.18;
      comet.y += comet.vy + Math.sin(seconds * 0.72 + comet.phase) * 0.12;
      comet.tail.push({ x: comet.x, y: comet.y });

      if (comet.tail.length > comet.tailLength) {
        comet.tail.shift();
      }

      if (comet.x > width + 80 || comet.y < -80) {
        resetComet(comet);
      }

      if (comet.tail.length < 2) {
        continue;
      }

      ctx.beginPath();
      ctx.moveTo(comet.tail[0].x, comet.tail[0].y);
      for (let index = 1; index < comet.tail.length; index += 1) {
        const point = comet.tail[index];
        const previous = comet.tail[index - 1];
        ctx.quadraticCurveTo(previous.x, previous.y, (previous.x + point.x) / 2, (previous.y + point.y) / 2);
      }
      ctx.strokeStyle = `hsla(${comet.hue}, 90%, 76%, ${comet.alpha * 0.42})`;
      ctx.lineWidth = comet.radius * 1.8;
      ctx.shadowColor = `hsla(${comet.hue}, 96%, 72%, ${comet.alpha})`;
      ctx.shadowBlur = 16;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(comet.x, comet.y, comet.radius * 1.4, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${comet.hue}, 100%, 88%, ${comet.alpha})`;
      ctx.fill();
    }
  }

  function drawFrame(time) {
    if (!running) {
      return;
    }

    const seconds = time * 0.001;
    ctx.clearRect(0, 0, width, height);

    ctx.globalCompositeOperation = "source-over";
    drawNebulae(seconds);
    drawPillars(seconds);
    if (isHomePage) {
      drawWisps(seconds);
    }

    ctx.globalCompositeOperation = "lighter";
    if (!isHomePage || streams.length > 0) {
      drawStreams(seconds);
    }
    drawStars(seconds);
    drawComets(seconds);
    ctx.globalCompositeOperation = "source-over";

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
  window.addEventListener("resize", resize);

  return { sync };
}

function markPageVariants() {
  if (!document.body) {
    return;
  }

  const hasCharacterDiaryHeader = document.querySelector(
    'main.page-frame > header:not(.retro-header):not(.waddy-header)'
  );
  const hasDiaryEntries =
    document.querySelector(".entry-list .entry-date") &&
    document.querySelector(".entry-list .entry-title");

  if (hasCharacterDiaryHeader && hasDiaryEntries) {
    document.body.classList.add("character-diary-page");
  }
}

function initSiteMode() {
  markPageVariants();
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
