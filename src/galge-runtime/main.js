import { BGMController } from "./bgm-controller.js";
import { resolveEmotion } from "./emotion-resolver.js";
import { loadScenarioDefinition } from "./scenario-loader.js";
import { MessageApiReceiver } from "./message-api-receiver.js";
import { SettingsPanel } from "./settings-panel.js";
import { VoiceController } from "./voice-controller.js";
import { VRMAssetStore } from "./vrm-asset-store.js";
import { VRMStage } from "./vrm-stage.js";

const SITE_MODE_STORAGE_KEY = "waddy-display-mode";
const SITE_MODE_DEFAULT = "classic";

function getModeFromQuery() {
  const mode = new URLSearchParams(window.location.search).get("mode");
  return mode === "classic" || mode === "immersive" ? mode : null;
}

function getStoredMode() {
  try {
    const storedMode = window.localStorage.getItem(SITE_MODE_STORAGE_KEY);
    return storedMode === "classic" || storedMode === "immersive" ? storedMode : null;
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

function resolveInitialSiteMode() {
  return window.__waddyInitialSiteMode || getModeFromQuery() || getStoredMode() || SITE_MODE_DEFAULT;
}

function updateModeUrl(mode) {
  const url = new URL(window.location.href);
  url.searchParams.set("mode", mode);
  window.history.replaceState({}, "", url);
}

class GalgeRuntimeApp {
  constructor() {
    this.currentMode = resolveInitialSiteMode();
    this.currentStep = 0;
    this.isTyping = false;
    this.typeTimer = null;
    this.started = false;
    this.showingChoice = false;
    this.isAdvancing = false;
    this.ctrlSkipTimer = null;
    this.backlog = [];
    this.backlogOpen = false;
    this.currentChapter = "";
    this.textSteps = [];
    this.scenario = null;
    this.renderToken = 0;
    this.flags = new Set();

    this.$ = (id) => document.getElementById(id);
    this.$loading = this.$("loading");
    this.$canvas = this.$("particle-canvas");
    this.$hud = this.$("hud");
    this.$namePlate = this.$("name-plate");
    this.$textContent = this.$("text-content");
    this.$cursor = this.$("cursor");
    this.$continueIndicator = this.$("continue-indicator");
    this.$chapterDisplay = this.$("chapter-display");
    this.$expressionTag = this.$("expression-tag");
    this.$modeToggle = this.$("mode-toggle");
    this.$progressBar = this.$("progress-bar");
    this.$titleScreen = this.$("title-screen");
    this.$startBtn = this.$("start-btn");
    this.$pc98Bg = document.querySelector(".pc98-bg");
    this.$chapterOverlay = this.$("chapter-overlay");
    this.$chapterTitle = this.$("chapter-title");
    this.$endScreen = this.$("end-screen");
    this.$choiceContainer = this.$("choice-container");
    this.$textWindow = this.$("text-window");
    this.$backBtn = this.$("back-btn");
    this.$titlePrimarySubtitle = document.querySelector("#title-screen .subtitle");
    this.$titleSecondarySubtitle = document.querySelector("#title-screen .subtitle:nth-of-type(2)");
    this.$titleModelSummary = this.$("title-model-summary");
    this.$miniModelSummary = this.$("mini-model-summary");
    this.$runtimeWarning = this.$("runtime-warning");
    this.$titleSettingsBtn = this.$("title-settings-btn");
    this.$titleModeToggleBtn = this.$("title-mode-toggle-btn");
    this.$titleBgmToggle = this.$("title-bgm-toggle");
    this.$settingsBtn = this.$("settings-btn");
    this.$titleSoundSettingsBtn = this.$("title-sound-settings-btn");
    this.$soundSettingsBtn = this.$("sound-settings-btn");
    this.$volumePopup = this.$("volume-popup");
    this.$bgmToggle = this.$("bgm-toggle");
    this.$bgmSlider = this.$("bgm-slider");
    this.$bgmValue = this.$("bgm-value");
    this.$voiceToggle = this.$("voice-toggle");
    this.$voiceSlider = this.$("voice-slider");
    this.$voiceValue = this.$("voice-value");
    this.$titleApiClientId = this.$("title-api-client-id");
    this.$titleApiStatus = this.$("title-api-status");
    this.$apiClientId = this.$("api-client-id");
    this.$apiStatus = this.$("api-status");

    this.voiceController = new VoiceController();
    this.bgmController = new BGMController();
    this.assetStore = new VRMAssetStore();
    this.vrmStage = new VRMStage({
      host: this.$("avatar-stage-shell"),
      canvas: this.$("avatar-stage"),
      placeholder: this.$("avatar-stage-placeholder"),
      getLipSyncLevel: () => this.voiceController.getLevel(),
    });

    this.settingsPanel = new SettingsPanel({
      assetStore: this.assetStore,
      modal: this.$("settings-modal"),
      list: this.$("settings-list"),
      summary: this.$("settings-summary"),
      fallbackStatus: this.$("fallback-status"),
      warningList: this.$("settings-warning-list"),
      closeButton: this.$("settings-close"),
      backdrop: this.$("settings-backdrop"),
      onModelChange: async (speakerKey) => {
        await this.refreshCurrentStage(speakerKey);
      },
      onSummaryChange: (summary) => {
        this.updateModelSummary(summary);
      },
      onVoiceTest: async ({ speakerKey, speakerLabel, config }) => {
        await this.playVoiceTest(speakerKey, speakerLabel, config);
      },
    });

    this.messageApiReceiver = new MessageApiReceiver({
      onMessages: async (messages) => {
        await this.handleReceivedMessages(messages);
      },
      onStatusChange: ({ message, clientId, apiBase, configured }) => {
        this.updateMessageApiUI({ message, clientId, apiBase, configured });
      },
    });

    this.ctx = this.$canvas.getContext("2d");
    this.animId = 0;
    this.kongouActive = false;
    this.kStreams = [];
    this.kStars = [];
    this.kNebula = [];
    this.kPillars = [];
    this.bgColor = { h: 240, s: 50, l: 12 };
    this.bgClearColor = "rgba(10,10,46,0.15)";
    this.starColor = "200,180,255";
    this.starGlowColor = "160,140,220";

    // Fade transition support: current and target HSL/RGB values
    this._colorCurrent = { h: 240, s: 50, l: 12 };
    this._colorTarget = { h: 240, s: 50, l: 12 };
    this._starCurrent = { r: 200, g: 180, b: 255 };
    this._starTarget = { r: 200, g: 180, b: 255 };
    this._starGlowCurrent = { r: 160, g: 140, b: 220 };
    this._starGlowTarget = { r: 160, g: 140, b: 220 };
    this._clearCurrent = { r: 10, g: 10, b: 46, a: 0.15 };
    this._clearTarget = { r: 10, g: 10, b: 46, a: 0.15 };
    this._colorFadeSpeed = 0.008; // ~2s to converge (roughly 1 - 0.008^120 ≈ done in 120 frames)
  }

  async init() {
    try {
      this.scenario = await loadScenarioDefinition();
    } catch (error) {
      console.error(error);
      this.$loading.textContent = error.message;
      return;
    }

    this.textSteps = this.scenario.steps.filter((step) => step.kind === "text");
    this.applyScenarioMetadata();
    await this.settingsPanel.setScenario(this.scenario);
    this.bindEvents();
    this.setMode(this.currentMode);
    this.messageApiReceiver.start();
    window.setTimeout(() => {
      this.$loading.classList.add("fade-out");
      window.setTimeout(() => {
        this.$loading.style.display = "none";
      }, 800);
    }, 300);
  }

  applyScenarioMetadata() {
    document.title = `${this.scenario.title} | ビジュアルノベル`;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        "content",
        `${this.scenario.title}${this.scenario.subtitle ? ` ${this.scenario.subtitle}` : ""}`
      );
    }
    const titleEl = document.querySelector("#title-screen h1");
    titleEl.textContent = this.scenario.title;
    this.$titlePrimarySubtitle.textContent = this.scenario.subtitle || "─ 在ることの残響 ─";
    if (this.$titleSecondarySubtitle) {
      this.$titleSecondarySubtitle.textContent = this.scenario.genre || "群像哲学ノベル";
    }

    // Realm-based styling (顕界 vs 幻界)
    const isGenkai = (this.scenario.genre || "").includes("幻界");
    document.body.classList.toggle("realm-genkai", isGenkai);
    document.body.classList.toggle("realm-kenkai", !isGenkai);

    // Realm-based particle colors (fade transition)
    if (isGenkai) {
      this._setColorTarget(
        { h: 220, s: 55, l: 10 },
        { r: 6, g: 10, b: 36, a: 0.15 },
        { r: 140, g: 180, b: 255 },
        { r: 100, g: 140, b: 220 }
      );
    } else {
      this._setColorTarget(
        { h: 40, s: 50, l: 10 },
        { r: 20, g: 16, b: 6, a: 0.15 },
        { r: 255, g: 220, b: 140 },
        { r: 220, g: 180, b: 100 }
      );
    }

    if (this.scenario.warnings.length) {
      this.$runtimeWarning.hidden = false;
      this.$runtimeWarning.textContent = `検証警告 ${this.scenario.warnings.length} 件`;
      for (const warning of this.scenario.warnings) {
        console.warn("[scenario warning]", warning);
      }
    } else {
      this.$runtimeWarning.hidden = true;
    }
  }

  updateModelSummary(summary) {
    const text = `モデル設定済み ${summary.dedicatedCount} / ${summary.relevantCount}`;
    this.$titleModelSummary.textContent = text;
    this.$miniModelSummary.textContent = text;
  }

  async getSpeakerVoiceConfig(speakerKey) {
    return this.assetStore.getSpeakerVoiceConfig(speakerKey);
  }

  bindEvents() {
    this.$modeToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      this.setMode(this.currentMode === "immersive" ? "classic" : "immersive");
    });

    this.$titleSettingsBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      this.settingsPanel.open();
    });

    if (this.$titleModeToggleBtn) {
      this.$titleModeToggleBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        this.setMode(this.currentMode === "immersive" ? "classic" : "immersive");
      });
    }

    if (this.$titleBgmToggle) {
      this.$titleBgmToggle.addEventListener("click", (event) => {
        event.stopPropagation();
        this.toggleBgm();
      });
    }

    this.$settingsBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      this.settingsPanel.open();
    });

    this.$titleSoundSettingsBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      this.toggleSoundPopup();
    });

    this.$soundSettingsBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      this.toggleSoundPopup();
    });

    this.$bgmToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      this.toggleBgm();
    });

    this.$voiceToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      this.toggleMute();
    });

    this.$bgmSlider.addEventListener("input", (event) => {
      event.stopPropagation();
      const v = parseInt(this.$bgmSlider.value, 10);
      this.$bgmValue.textContent = v;
      this.bgmController.setVolume(v / 100);
    });

    this.$voiceSlider.addEventListener("input", (event) => {
      event.stopPropagation();
      const v = parseInt(this.$voiceSlider.value, 10);
      this.$voiceValue.textContent = v;
      this.voiceController.setVolume(v / 100);
    });

    this.$volumePopup.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    this.$startBtn.addEventListener("click", async (event) => {
      event.stopPropagation();
      await this.startExperience();
    });

    document.addEventListener("click", (event) => {
      if (
        event.target === this.$modeToggle ||
        event.target === this.$titleModeToggleBtn ||
        event.target.closest("#title-mode-toggle-btn") ||
        event.target === this.$startBtn ||
        event.target === this.$titleBgmToggle ||
        event.target === this.$settingsBtn ||
        event.target === this.$titleSettingsBtn ||
        event.target === this.$soundSettingsBtn ||
        event.target === this.$titleSoundSettingsBtn ||
        event.target.closest("#volume-popup") ||
        event.target.closest("#settings-modal") ||
        event.target.closest("#back-btn") ||
        event.target.closest("#end-screen a")
      ) {
        return;
      }
      if (this.$volumePopup.classList.contains("visible")) {
        this.closeSoundPopup();
      }
      this.advance();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Control" && !event.repeat) {
        this.startCtrlSkip();
        return;
      }
      if (event.key === " " || event.key === "Enter" || event.key === "ArrowRight") {
        event.preventDefault();
        this.advance();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        this.goBack();
      } else if (event.key === "Escape") {
        if (this.backlogOpen) {
          this.closeBacklog();
          return;
        }
        if (!this.$("settings-modal").hidden) {
          this.settingsPanel.close();
          return;
        }
        window.location.href = "./diary.html";
      }
    });

    document.addEventListener("keyup", (event) => {
      if (event.key === "Control") {
        this.stopCtrlSkip();
      }
    });

    document.addEventListener("wheel", (event) => {
      if (!this.started || !this.$("settings-modal").hidden) {
        return;
      }
      if (event.deltaY < 0) {
        // Scroll up → open backlog
        if (!this.backlogOpen) {
          this.openBacklog();
        }
      } else if (event.deltaY > 0 && !this.backlogOpen) {
        // Scroll down → advance
        this.advance();
      }
    });

    window.addEventListener("resize", () => {
      if (this.currentMode === "immersive") {
        this.initCanvas();
        this.initKongou();
      }
      this.vrmStage.resize();
    });

    this.updateVoiceToggle();
    this.updateBgmToggle();
    this.updateMessageApiUI({
      message: this.messageApiReceiver.isConfigured() ? "発話API 接続待機中" : "発話API 未設定",
      clientId: this.messageApiReceiver.getClientId(),
      apiBase: this.messageApiReceiver.getApiBase(),
      configured: this.messageApiReceiver.isConfigured(),
    });
  }

  async startExperience() {
    await this.voiceController.unlock().catch((error) => {
      console.warn("audio unlock failed:", error);
    });
    this.started = true;
    document.body.classList.add("runtime-started");
    this.$titleScreen.classList.add("fade-out");
    window.setTimeout(() => {
      this.$titleScreen.style.display = "none";
      this.$hud.style.display = "flex";
      this.showStep(0);
    }, 800);
  }

  updateVoiceToggle() {
    const muted = this.voiceController.isMuted();
    this.$voiceToggle.className = `vol-toggle ${muted ? "off" : "on"}`;
  }

  toggleMute() {
    this.voiceController.setMuted(!this.voiceController.isMuted());
    this.updateVoiceToggle();
  }

  updateBgmToggle() {
    const enabled = this.bgmController.isEnabled();
    this.$bgmToggle.className = `vol-toggle ${enabled ? "on" : "off"}`;
    const runtimeLabel = enabled ? "BGM ON" : "BGM OFF";
    this.$bgmToggle.setAttribute("aria-label", runtimeLabel);
    const runtimeHiddenLabel = this.$bgmToggle.querySelector(".sr-only");
    if (runtimeHiddenLabel) {
      runtimeHiddenLabel.textContent = runtimeLabel;
    }
    if (this.$titleBgmToggle) {
      const titleLabel = this.$titleBgmToggle.querySelector(".btn-text");
      if (titleLabel) {
        titleLabel.textContent = runtimeLabel;
      } else {
        this.$titleBgmToggle.textContent = runtimeLabel;
      }
      this.$titleBgmToggle.setAttribute("aria-label", runtimeLabel);
      this.$titleBgmToggle.setAttribute("title", runtimeLabel);
    }
  }

  toggleBgm() {
    this.bgmController.setEnabled(!this.bgmController.isEnabled());
    this.updateBgmToggle();
    if (this.started) {
      this.syncBgmForIndex(this.currentStep);
    }
  }

  toggleSoundPopup() {
    if (this.$volumePopup.classList.contains("visible")) {
      this.closeSoundPopup();
    } else {
      this.$volumePopup.style.display = "flex";
      window.requestAnimationFrame(() => {
        this.$volumePopup.classList.add("visible");
      });
    }
  }

  closeSoundPopup() {
    this.$volumePopup.classList.remove("visible");
    window.setTimeout(() => {
      if (!this.$volumePopup.classList.contains("visible")) {
        this.$volumePopup.style.display = "none";
      }
    }, 300);
  }

  updateMessageApiUI({ message, clientId, apiBase, configured }) {
    this.voiceController.setProxyBase(apiBase);
    const clientLabel = `API client: ${clientId}`;
    const statusLabel = configured
      ? `${message}${apiBase ? ` (${apiBase})` : ""}`
      : "発話API 未設定 (?messageApiBase=http://127.0.0.1:8182)";
    this.$titleApiClientId.textContent = clientLabel;
    this.$apiClientId.textContent = clientLabel;
    this.$titleApiStatus.textContent = statusLabel;
    this.$apiStatus.textContent = statusLabel;
  }

  async playVoiceTest(speakerKey, speakerLabel, config) {
    const text = `${speakerLabel}の音声テストです。`;
    const wasMuted = this.voiceController.isMuted();
    if (wasMuted) {
      this.voiceController.setMuted(false);
    }
    await this.voiceController.unlock().catch((error) => {
      console.warn("audio unlock failed:", error);
    });
    try {
      await this.voiceController.speakText(text, {
        lang: "ja-JP",
        voiceConfig: config,
        speakerKey,
        allowBrowserFallback: true,
      });
    } finally {
      if (wasMuted) {
        this.voiceController.setMuted(true);
      }
    }
  }

  findActiveBgmCue(index) {
    if (!this.scenario?.steps?.length) {
      return this.scenario?.defaultBgm || null;
    }

    let activeCue = null;
    const safeIndex = Math.min(index, this.scenario.steps.length - 1);
    for (let stepIndex = 0; stepIndex <= safeIndex; stepIndex += 1) {
      const cue = this.scenario.steps[stepIndex]?.bgm;
      if (cue) {
        activeCue = cue.stop ? { stop: true } : cue;
      }
    }
    return activeCue || this.scenario?.defaultBgm || null;
  }

  syncBgmForIndex(index) {
    const cue = this.findActiveBgmCue(index);
    this.bgmController.setCue(this.scenario?.bgmNamespace || this.scenario?.audioNamespace || "", cue);
  }

  initCanvas() {
    this.$canvas.width = window.innerWidth;
    this.$canvas.height = window.innerHeight;
  }

  initKongou() {
    this.kStreams.length = 0;
    this.kStars.length = 0;
    this.kNebula.length = 0;
    this.kPillars.length = 0;
    const width = this.$canvas.width;
    const height = this.$canvas.height;

    for (let index = 0; index < 8; index += 1) {
      this.kStreams.push({
        y: Math.random() * height,
        baseX: Math.random() * width,
        amp: Math.random() * 120 + 60,
        freq: Math.random() * 0.008 + 0.003,
        speed: Math.random() * 2 + 1.5,
        phase: Math.random() * Math.PI * 2,
        width: Math.random() * 3 + 1,
        hue: Math.floor(Math.random() * 60 + this.bgColor.h - 30),
        len: Math.floor(Math.random() * 80 + 60),
        trail: [],
      });
    }

    for (let index = 0; index < 120; index += 1) {
      this.kStars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.3) * 3,
        vy: (Math.random() - 0.5) * 1.5,
        size: Math.random() * 2.5 + 0.5,
        brightness: Math.random(),
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 3 + 1,
      });
    }

    for (let index = 0; index < 6; index += 1) {
      this.kNebula.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 200 + 100,
        dx: (Math.random() - 0.5) * 0.4,
        dy: (Math.random() - 0.5) * 0.3,
        phase: Math.random() * Math.PI * 2,
        hue: Math.floor(Math.random() * 80 + this.bgColor.h - 40),
        sat: Math.floor(Math.random() * 40 + 60),
      });
    }

    for (let index = 0; index < 4; index += 1) {
      this.kPillars.push({
        x: Math.random() * width,
        width: Math.random() * 60 + 20,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.02 + 0.01,
        hue: Math.floor(Math.random() * 40 + this.bgColor.h - 20),
        drift: (Math.random() - 0.5) * 2 + (Math.random() > 0.5 ? 0.5 : -0.5),
      });
    }
  }

  drawKongou = () => {
    if (!this.kongouActive) {
      return;
    }

    // Interpolate colors toward target each frame
    this._lerpColors();

    const width = this.$canvas.width;
    const height = this.$canvas.height;
    const time = Date.now() * 0.001;
    this.ctx.fillStyle = this.bgClearColor;
    this.ctx.fillRect(0, 0, width, height);

    for (const nebula of this.kNebula) {
      nebula.x += nebula.dx;
      nebula.y += nebula.dy;
      if (nebula.x < -200) nebula.x = width + 200;
      if (nebula.x > width + 200) nebula.x = -200;
      if (nebula.y < -200) nebula.y = height + 200;
      if (nebula.y > height + 200) nebula.y = -200;
      const pulse = Math.sin(time * 1.5 + nebula.phase) * 0.4 + 0.6;
      const gradient = this.ctx.createRadialGradient(
        nebula.x,
        nebula.y,
        0,
        nebula.x,
        nebula.y,
        nebula.r * pulse
      );
      gradient.addColorStop(0, `hsla(${nebula.hue},${nebula.sat}%,50%,${0.15 * pulse})`);
      gradient.addColorStop(0.4, `hsla(${nebula.hue},${nebula.sat}%,30%,${0.08 * pulse})`);
      gradient.addColorStop(1, `hsla(${nebula.hue},${nebula.sat}%,10%,0)`);
      this.ctx.beginPath();
      this.ctx.arc(nebula.x, nebula.y, nebula.r * pulse, 0, Math.PI * 2);
      this.ctx.fillStyle = gradient;
      this.ctx.fill();
    }

    for (const pillar of this.kPillars) {
      pillar.x += pillar.drift + Math.sin(time * 0.8 + pillar.phase) * 1.5;
      if (pillar.x < -100) pillar.x = width + 100;
      if (pillar.x > width + 100) pillar.x = -100;
      const intensity = Math.sin(time * pillar.speed * 50 + pillar.phase) * 0.5 + 0.5;
      const gradient = this.ctx.createLinearGradient(
        pillar.x - pillar.width / 2,
        0,
        pillar.x + pillar.width / 2,
        0
      );
      gradient.addColorStop(0, `hsla(${pillar.hue},70%,60%,0)`);
      gradient.addColorStop(0.5, `hsla(${pillar.hue},70%,60%,${0.12 * intensity})`);
      gradient.addColorStop(1, `hsla(${pillar.hue},70%,60%,0)`);
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(pillar.x - pillar.width, 0, pillar.width * 2, height);
    }

    for (const stream of this.kStreams) {
      const currentX = stream.baseX + Math.sin(time * 0.5 + stream.phase) * 100;
      stream.trail.push({
        x: currentX + Math.sin(time * stream.freq * 100 + stream.phase) * stream.amp,
        y: stream.y,
      });
      stream.y -= stream.speed;
      if (stream.y < -20) {
        stream.y = height + 20;
        stream.trail.length = 0;
      }
      if (stream.trail.length > stream.len) {
        stream.trail.shift();
      }
      if (stream.trail.length > 2) {
        this.ctx.beginPath();
        this.ctx.moveTo(stream.trail[0].x, stream.trail[0].y);
        for (let index = 1; index < stream.trail.length; index += 1) {
          const point = stream.trail[index];
          const previous = stream.trail[index - 1];
          this.ctx.quadraticCurveTo(
            previous.x,
            previous.y,
            (previous.x + point.x) / 2,
            (previous.y + point.y) / 2
          );
        }
        this.ctx.strokeStyle = `hsla(${stream.hue},80%,70%,0.6)`;
        this.ctx.lineWidth = stream.width;
        this.ctx.shadowColor = `hsla(${stream.hue},90%,60%,0.8)`;
        this.ctx.shadowBlur = 15;
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
      }
    }

    for (const star of this.kStars) {
      star.x += star.vx;
      star.y += star.vy;
      if (star.x < 0) star.x = width;
      if (star.x > width) star.x = 0;
      if (star.y < 0) star.y = height;
      if (star.y > height) star.y = 0;
      const flicker = Math.sin(time * star.speed * 3 + star.phase) * 0.3 + 0.7;
      const alpha = star.brightness * flicker;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size * flicker, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(${this.starColor},${alpha * 0.8})`;
      this.ctx.fill();
      if (star.size > 1.5) {
        this.ctx.beginPath();
        this.ctx.arc(star.x, star.y, star.size * 3 * flicker, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(${this.starGlowColor},${alpha * 0.15})`;
        this.ctx.fill();
      }
    }

    this.animId = requestAnimationFrame(this.drawKongou);
  };

  // ── Color fade helpers ──
  _parseRgba(str) {
    // Parse "rgba(r,g,b,a)" to { r, g, b, a }
    const m = str.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    if (!m) return { r: 10, g: 10, b: 46, a: 0.15 };
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 };
  }

  _lerpVal(current, target, t) {
    return current + (target - current) * t;
  }

  _setColorTarget(hsl, clear, star, starGlow) {
    this._colorTarget = { ...hsl };
    this._clearTarget = typeof clear === "string" ? this._parseRgba(clear) : { ...clear };
    this._starTarget = { ...star };
    this._starGlowTarget = { ...starGlow };
  }

  _setColorImmediate(hsl, clear, star, starGlow) {
    this._colorTarget = { ...hsl };
    this._colorCurrent = { ...hsl };
    this.bgColor = { ...hsl };
    const clearObj = typeof clear === "string" ? this._parseRgba(clear) : { ...clear };
    this._clearTarget = { ...clearObj };
    this._clearCurrent = { ...clearObj };
    this.bgClearColor = `rgba(${clearObj.r},${clearObj.g},${clearObj.b},${clearObj.a})`;
    this._starTarget = { ...star };
    this._starCurrent = { ...star };
    this.starColor = `${star.r},${star.g},${star.b}`;
    this._starGlowTarget = { ...starGlow };
    this._starGlowCurrent = { ...starGlow };
    this.starGlowColor = `${starGlow.r},${starGlow.g},${starGlow.b}`;
  }

  _lerpColors() {
    const t = this._colorFadeSpeed;
    const threshold = 0.5;

    // HSL bg color
    const ch = this._colorCurrent;
    const th = this._colorTarget;
    ch.h = this._lerpVal(ch.h, th.h, t);
    ch.s = this._lerpVal(ch.s, th.s, t);
    ch.l = this._lerpVal(ch.l, th.l, t);
    this.bgColor = { h: ch.h, s: ch.s, l: ch.l };

    // Clear color (RGBA)
    const cc = this._clearCurrent;
    const tc = this._clearTarget;
    cc.r = this._lerpVal(cc.r, tc.r, t);
    cc.g = this._lerpVal(cc.g, tc.g, t);
    cc.b = this._lerpVal(cc.b, tc.b, t);
    cc.a = this._lerpVal(cc.a, tc.a, t);
    this.bgClearColor = `rgba(${Math.round(cc.r)},${Math.round(cc.g)},${Math.round(cc.b)},${cc.a.toFixed(3)})`;

    // Star color (RGB string)
    const sc = this._starCurrent;
    const st = this._starTarget;
    sc.r = this._lerpVal(sc.r, st.r, t);
    sc.g = this._lerpVal(sc.g, st.g, t);
    sc.b = this._lerpVal(sc.b, st.b, t);
    this.starColor = `${Math.round(sc.r)},${Math.round(sc.g)},${Math.round(sc.b)}`;

    // Star glow color (RGB string)
    const sgc = this._starGlowCurrent;
    const sgt = this._starGlowTarget;
    sgc.r = this._lerpVal(sgc.r, sgt.r, t);
    sgc.g = this._lerpVal(sgc.g, sgt.g, t);
    sgc.b = this._lerpVal(sgc.b, sgt.b, t);
    this.starGlowColor = `${Math.round(sgc.r)},${Math.round(sgc.g)},${Math.round(sgc.b)}`;

    // Also update nebula/pillar/stream hues toward target hue
    for (const nebula of this.kNebula) {
      const targetHue = Math.floor(Math.random() * 0.2 + this.bgColor.h - 0.1 + nebula.hue * 0.99);
      nebula.hue = this._lerpVal(nebula.hue, this.bgColor.h + (nebula.hue - Math.round(nebula.hue / 80) * 80), t * 0.5);
    }
    for (const pillar of this.kPillars) {
      pillar.hue = this._lerpVal(pillar.hue, this.bgColor.h + (pillar.hue - Math.round(pillar.hue / 40) * 40), t * 0.5);
    }
    for (const stream of this.kStreams) {
      stream.hue = this._lerpVal(stream.hue, this.bgColor.h + (stream.hue - Math.round(stream.hue / 60) * 60), t * 0.5);
    }

    // Update body background gradient
    document.body.style.background = `linear-gradient(180deg, hsl(${Math.round(this.bgColor.h)},${Math.round(this.bgColor.s)}%,${Math.round(this.bgColor.l)}%) 0%, hsl(${Math.round(this.bgColor.h)},${Math.round(this.bgColor.s)}%,${Math.max(1, Math.round(this.bgColor.l) - 5)}%) 50%, hsl(${Math.round(this.bgColor.h)},${Math.round(this.bgColor.s)}%,${Math.round(this.bgColor.l)}%) 100%)`;
  }

  setAtmosphere(bg) {
    if (!bg) {
      return;
    }

    const presets = {
      dark_chapel: { h: 270, s: 40, l: 8, clear: "rgba(15,5,30,0.15)", star: { r: 200, g: 160, b: 240 }, glow: { r: 180, g: 140, b: 210 } },
      void: { h: 260, s: 30, l: 4, clear: "rgba(5,3,15,0.18)", star: { r: 180, g: 160, b: 230 }, glow: { r: 150, g: 130, b: 200 } },
      cathedral: { h: 250, s: 50, l: 12, clear: "rgba(10,10,46,0.15)", star: { r: 200, g: 180, b: 255 }, glow: { r: 160, g: 140, b: 220 } },
      twilight: { h: 220, s: 45, l: 15, clear: "rgba(8,12,40,0.14)", star: { r: 160, g: 190, b: 250 }, glow: { r: 120, g: 150, b: 220 } },
      crimson: { h: 0, s: 60, l: 10, clear: "rgba(30,5,10,0.16)", star: { r: 255, g: 160, b: 140 }, glow: { r: 220, g: 120, b: 100 } },
      abyss: { h: 240, s: 20, l: 3, clear: "rgba(3,3,10,0.20)", star: { r: 170, g: 170, b: 200 }, glow: { r: 130, g: 130, b: 170 } },
      dawn: { h: 30, s: 50, l: 18, clear: "rgba(30,15,8,0.12)", star: { r: 255, g: 220, b: 160 }, glow: { r: 230, g: 190, b: 130 } },
      station: { h: 35, s: 40, l: 14, clear: "rgba(20,12,8,0.14)", star: { r: 250, g: 215, b: 150 }, glow: { r: 215, g: 175, b: 110 } },
      station_night: { h: 220, s: 35, l: 8, clear: "rgba(6,8,22,0.16)", star: { r: 150, g: 180, b: 240 }, glow: { r: 110, g: 140, b: 200 } },
      akihabara: { h: 280, s: 50, l: 12, clear: "rgba(18,8,30,0.14)", star: { r: 220, g: 170, b: 255 }, glow: { r: 180, g: 130, b: 220 } },
      default: { h: 240, s: 50, l: 12, clear: "rgba(10,10,46,0.15)", star: { r: 200, g: 180, b: 255 }, glow: { r: 160, g: 140, b: 220 } },
    };

    const bgKey = typeof bg === "string" ? bg : (bg.preset || "default");
    const preset = presets[bgKey] || presets.default;

    // Use fade transition instead of immediate set
    this._setColorTarget(
      { h: preset.h, s: preset.s, l: preset.l },
      preset.clear,
      preset.star,
      preset.glow
    );

    // Background image support
    const bgImageKey = bgKey.replace(/[^a-z0-9_]/gi, "_");
    const scenarioDir = this.scenario.scenarioName || "";
    const baseDir = scenarioDir
      ? `./scenarios/bg/${encodeURIComponent(scenarioDir)}`
      : `./scenarios/bg`;
    this._showBgImage(`${baseDir}/${bgImageKey}.png`, `${baseDir}/${bgImageKey}.jpg`);
  }

  _showBgImage(src, fallbackSrc) {
    let el = document.getElementById("scene-bg-img");
    if (!el) {
      el = document.createElement("img");
      el.id = "scene-bg-img";
      Object.assign(el.style, {
        position: "fixed",
        inset: "0",
        width: "100%",
        height: "100%",
        objectFit: "cover",
        zIndex: "1",
        pointerEvents: "none",
        opacity: "0",
        transition: "opacity 1.6s ease",
      });
      document.body.insertBefore(el, document.body.firstChild);
    }

    if (el.dataset.currentSrc === src) {
      return;
    }

    // Fade out, swap, fade in
    el.style.opacity = "0";
    const img = new Image();
    img.onload = () => {
      el.src = src;
      el.dataset.currentSrc = src;
      requestAnimationFrame(() => {
        el.style.opacity = "0.55";
      });
    };
    img.onerror = () => {
      if (fallbackSrc) {
        const fb = new Image();
        fb.onload = () => {
          el.src = fallbackSrc;
          el.dataset.currentSrc = fallbackSrc;
          requestAnimationFrame(() => { el.style.opacity = "0.55"; });
        };
        fb.onerror = () => {
          el.style.opacity = "0";
          el.dataset.currentSrc = "";
        };
        fb.src = fallbackSrc;
      } else {
        el.style.opacity = "0";
        el.dataset.currentSrc = "";
      }
    };
    img.src = src;
  }

  setMode(mode) {
    this.currentMode = mode === "classic" ? "classic" : "immersive";
    document.documentElement.dataset.siteMode = this.currentMode;
    setStoredMode(this.currentMode);
    document.body.classList.remove("mode-immersive", "mode-classic");
    document.body.classList.add(`mode-${this.currentMode}`);
    const modeIcon = this.currentMode === "immersive" ? "🌙" : "🖥️";
    const floatingIcon = this.$modeToggle?.querySelector(".btn-icon");
    if (floatingIcon) {
      floatingIcon.textContent = modeIcon;
    } else if (this.$modeToggle) {
      this.$modeToggle.textContent = modeIcon;
    }
    if (this.$titleModeToggleBtn) {
      const icon = this.$titleModeToggleBtn.querySelector(".btn-icon");
      if (icon) icon.textContent = modeIcon;
    }
    this.$cursor.textContent = this.currentMode === "classic" ? "▌" : "█";

    let frame = document.querySelector(".pc98-frame");
    if (this.currentMode === "classic") {
      if (!frame) {
        frame = document.createElement("div");
        frame.className = "pc98-frame";
        document.body.appendChild(frame);
      }
      frame.style.display = "block";
      this.$canvas.style.display = "none";
      this.$pc98Bg.style.display = "block";
      this.kongouActive = false;
      cancelAnimationFrame(this.animId);
    } else {
      if (frame) {
        frame.style.display = "none";
      }
      this.$canvas.style.display = "block";
      this.$pc98Bg.style.display = "none";
      this.initCanvas();
      this.initKongou();
      this.kongouActive = true;
      this.drawKongou();
    }

    const isMobile = window.innerWidth <= 960;
    this.$continueIndicator.textContent =
      this.currentMode === "classic"
        ? "＞次へ  SPACE / ENTER" 
        : (isMobile ? "▼ タップで次へ" : "▼ クリック / スペースで次へ");

    const currentStep = this.scenario?.steps?.[this.currentStep];
    if (this.started && currentStep?.kind === "text" && currentStep.speaker !== "narrator") {
      const charData = this.getCharData(currentStep.speaker);
      if (this.currentMode === "classic") {
        this.$namePlate.textContent = `【${charData.name}】`;
        this.$namePlate.style.color = "#ffffff";
        this.$namePlate.style.textShadow = "none";
      } else {
        this.$namePlate.textContent = `${charData.emoji} ${charData.name}`.trim();
        this.$namePlate.style.color = charData.color || "#ffffff";
        this.$namePlate.style.textShadow = `0 0 12px ${charData.color || "#ffffff"}40`;
      }
    }

    updateModeUrl(this.currentMode);
  }

  getCharData(speakerKey) {
    return (
      this.scenario.chars[speakerKey] || {
        name: speakerKey,
        color: "#d0d0d0",
        emoji: "",
      }
    );
  }

  typeText(text, onDone) {
    this.isTyping = true;
    this.$textContent.textContent = "";
    this.$cursor.style.display = "inline-block";
    this.$continueIndicator.classList.remove("visible");
    let index = 0;
    const speed = this.currentMode === "classic" ? 35 : 28;
    const step = () => {
      if (index < text.length) {
        this.$textContent.textContent += text[index];
        index += 1;
        this.$textWindow.scrollTop = this.$textWindow.scrollHeight;
        this.typeTimer = window.setTimeout(step, speed);
      } else {
        this.isTyping = false;
        this.$cursor.style.display = "none";
        this.$continueIndicator.classList.add("visible");
        onDone?.();
      }
    };
    step();
  }

  skipType(text) {
    window.clearTimeout(this.typeTimer);
    this.$textContent.textContent = text;
    this.$textWindow.scrollTop = this.$textWindow.scrollHeight;
    this.isTyping = false;
    this.$cursor.style.display = "none";
    this.$continueIndicator.classList.add("visible");
  }

  updateProgress() {
    const textIndex = this.scenario.steps
      .slice(0, this.currentStep + 1)
      .filter((step) => step.kind === "text").length;
    const percent = this.textSteps.length > 1 ? (textIndex / this.textSteps.length) * 100 : 0;
    this.$progressBar.style.width = `${percent}%`;
  }

  collectPrefetchSteps(fromIndex) {
    const steps = [];
    for (let index = fromIndex; index < this.scenario.steps.length; index += 1) {
      const step = this.scenario.steps[index];
      if (index > fromIndex && step.kind === "choices") {
        break;
      }
      if (step.kind === "text") {
        steps.push(step);
      }
      if (steps.length >= 3) {
        break;
      }
    }
    return steps;
  }

  async resolveModelRecordForSpeaker(speakerKey) {
    if (speakerKey === "narrator") {
      return this.assetStore.getSpeakerModel("narrator");
    }
    const directRecord = await this.assetStore.getSpeakerModel(speakerKey);
    if (directRecord) {
      return directRecord;
    }
    return this.assetStore.getSharedFallbackModel();
  }

  async refreshCurrentStage(changedSpeakerKey) {
    if (!this.started) {
      return;
    }
    const step = this.scenario.steps[this.currentStep];
    if (!step || step.kind !== "text") {
      return;
    }
    if (changedSpeakerKey && changedSpeakerKey !== step.speaker) {
      const directRecord = await this.assetStore.getSpeakerModel(step.speaker);
      if (directRecord) {
        return;
      }
    }
    const emotion = resolveEmotion(step.emotion, step.expression);
    const modelRecord = await this.resolveModelRecordForSpeaker(step.speaker);
    await this.vrmStage.setSpeaker({
      speakerKey: step.speaker,
      modelRecord,
      emotion,
    });
  }

  async showStep(index) {
    if (index >= this.scenario.steps.length) {
      return;
    }

    const step = this.scenario.steps[index];
    this.currentStep = index;
    this.renderToken += 1;
    const token = this.renderToken;
    this.updateProgress();
    this.syncBgmForIndex(index);

    if (step.kind === "label") {
      await this.showStep(index + 1);
      return;
    }

    if (step.kind === "goto") {
      const targetIndex = this.scenario.steps.findIndex(
        (candidate) => candidate.kind === "label" && candidate.label === step.target
      );
      if (targetIndex >= 0) {
        await this.showStep(targetIndex + 1);
      } else {
        console.warn(`[goto] target label "${step.target}" not found`);
        await this.showStep(index + 1);
      }
      return;
    }

    if (step.kind === "loadScenario") {
      console.log(`[loadScenario] redirecting to: ${step.scenario}`);
      const url = new URL(window.location.href);
      url.searchParams.set("scenario", step.scenario);
      window.location.replace(url.toString());
      return;
    }

    if (step.kind === "flag") {
      this.flags.add(step.flag);
      console.log(`[flag] set: ${step.flag}`, [...this.flags]);
      await this.showStep(index + 1);
      return;
    }

    if (step.kind === "if") {
      const hasFlagValue = this.flags.has(step.condition);
      if (hasFlagValue) {
        const targetIndex = this.scenario.steps.findIndex(
          (candidate) => candidate.kind === "label" && candidate.label === step.target
        );
        if (targetIndex >= 0) {
          await this.showStep(targetIndex + 1);
          return;
        }
      } else if (step.elseTarget) {
        const elseIndex = this.scenario.steps.findIndex(
          (candidate) => candidate.kind === "label" && candidate.label === step.elseTarget
        );
        if (elseIndex >= 0) {
          await this.showStep(elseIndex + 1);
          return;
        }
      }
      await this.showStep(index + 1);
      return;
    }

    if (step.kind === "ifNot") {
      const hasFlagValue = this.flags.has(step.condition);
      if (!hasFlagValue) {
        const targetIndex = this.scenario.steps.findIndex(
          (candidate) => candidate.kind === "label" && candidate.label === step.target
        );
        if (targetIndex >= 0) {
          await this.showStep(targetIndex + 1);
          return;
        }
      } else if (step.elseTarget) {
        const elseIndex = this.scenario.steps.findIndex(
          (candidate) => candidate.kind === "label" && candidate.label === step.elseTarget
        );
        if (elseIndex >= 0) {
          await this.showStep(elseIndex + 1);
          return;
        }
      }
      await this.showStep(index + 1);
      return;
    }

    if (step.kind === "bg") {
      this.setAtmosphere(step.bg);
      if (step.bgm) {
        this.bgmController.setCue(this.scenario.audioNamespace, step.bgm);
      }
      await this.showStep(index + 1);
      return;
    }

    if (step.kind === "bgm") {
      if (step.bgm) {
        this.bgmController.setCue(this.scenario.audioNamespace, step.bgm);
      }
      await this.showStep(index + 1);
      return;
    }

    if (step.kind === "end") {
      this.voiceController.stopCurrent();
      this.vrmStage.hide();
      this.$hud.style.display = "none";
      this.$("end-title").textContent = step.title;
      this.$("end-subtitle").textContent = step.subtitle;
      this.$endScreen.style.display = "flex";
      window.setTimeout(() => this.$endScreen.classList.add("visible"), 50);
      return;
    }

    if (step.kind === "chapter") {
      this.voiceController.stopCurrent();
      this.vrmStage.hide();
      this.currentChapter = step.chapter;
      if (step.bg) {
        this.setAtmosphere(step.bg);
      }
      this.$chapterDisplay.textContent = step.chapter;
      this.$chapterTitle.textContent = step.chapter;
      this.$chapterOverlay.style.display = "flex";
      window.setTimeout(() => this.$chapterOverlay.classList.add("visible"), 50);
      window.setTimeout(() => {
        this.$chapterOverlay.classList.remove("visible");
        window.setTimeout(() => {
          this.$chapterOverlay.style.display = "none";
          this.showStep(index + 1);
        }, 600);
      }, 1800);
      return;
    }

    if (step.kind === "choices") {
      this.showingChoice = true;
      this.voiceController.stopCurrent();
      this.$choiceContainer.innerHTML = "";
      for (const choice of step.choices) {
        // Conditional visibility: skip choices whose condition is not met
        if (choice.if && !this.flags.has(choice.if)) {
          continue;
        }
        if (choice.ifNot && this.flags.has(choice.ifNot)) {
          continue;
        }
        const button = document.createElement("button");
        button.className = "choice-btn";
        button.textContent = choice.text;
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          this.showingChoice = false;
          // Set flag if choice has one
          if (choice.flag) {
            this.flags.add(choice.flag);
            console.log(`[choice flag] set: ${choice.flag}`, [...this.flags]);
          }
          this.$choiceContainer.classList.remove("visible");
          window.setTimeout(() => {
            this.$choiceContainer.style.display = "none";
          }, 400);
          if (choice.goto) {
            const targetIndex = this.scenario.steps.findIndex(
              (candidate) => candidate.kind === "label" && candidate.label === choice.goto
            );
            if (targetIndex >= 0) {
              this.showStep(targetIndex + 1);
              return;
            }
          }
          this.showStep(index + 1);
        });
        this.$choiceContainer.appendChild(button);
      }
      this.$choiceContainer.style.display = "flex";
      window.setTimeout(() => {
        this.$choiceContainer.classList.add("visible");
      }, 30);
      return;
    }

    if (step.kind !== "text") {
      return;
    }

    this.addToBacklog(step);

    const charData = this.getCharData(step.speaker);
    const isNarrator = step.speaker === "narrator";
    const emotion = resolveEmotion(step.emotion, step.expression);

    if (step.bg) {
      this.setAtmosphere(step.bg);
    }

    const modelRecord = await this.resolveModelRecordForSpeaker(step.speaker);
    if (token !== this.renderToken) {
      return;
    }

    await this.vrmStage.setSpeaker({
      speakerKey: step.speaker,
      modelRecord,
      emotion,
    });
    if (token !== this.renderToken) {
      return;
    }

    this.voiceController.stopCurrent();
    this.voiceController.prefetchSteps(this.scenario, this.collectPrefetchSteps(index)).catch(() => null);
    const voiceConfig = await this.getSpeakerVoiceConfig(step.speaker);
    this.voiceController.playStep(this.scenario, step, { voiceConfig }).catch((error) => {
      console.warn("voice playback failed:", error);
    });

    this.$textContent.classList.add("text-fade-out");
    window.setTimeout(() => {
      if (token !== this.renderToken) {
        return;
      }

      // Update name plate and text color AFTER fade-out completes
      if (isNarrator) {
        this.$namePlate.style.display = "none";
      } else {
        this.$namePlate.style.display = "inline-block";
        if (this.currentMode === "classic") {
          this.$namePlate.textContent = `【${charData.name}】`;
          this.$namePlate.style.color = "#ffffff";
          this.$namePlate.style.textShadow = "none";
        } else {
          this.$namePlate.textContent = `${charData.emoji} ${charData.name}`.trim();
          this.$namePlate.style.color = charData.color || "#ffffff";
          this.$namePlate.style.textShadow = `0 0 12px ${charData.color || "#ffffff"}40`;
        }
      }
      this.$expressionTag.textContent = step.expression || "";
      if (this.currentMode === "immersive" && !isNarrator && charData.color) {
        this.$textContent.style.color = charData.color;
      } else {
        this.$textContent.style.color = "";
      }

      this.$textContent.classList.remove("text-fade-out");
      this.$textContent.classList.add("text-fade-in");
      this.typeText(step.text, () => {
        this.$textContent.classList.remove("text-fade-in");
      });
    }, 240);
  }

  getVisibleChoiceButtons() {
    return Array.from(this.$choiceContainer.querySelectorAll(".choice-btn"));
  }

  captureTextWindowSnapshot() {
    return {
      stepIndex: this.currentStep,
      renderToken: this.renderToken,
      namePlateDisplay: this.$namePlate.style.display,
      namePlateText: this.$namePlate.textContent,
      namePlateColor: this.$namePlate.style.color,
      namePlateTextShadow: this.$namePlate.style.textShadow,
      expressionText: this.$expressionTag.textContent,
      textContent: this.$textContent.textContent,
      textColor: this.$textContent.style.color,
      continueVisible: this.$continueIndicator.classList.contains("visible"),
      cursorDisplay: this.$cursor.style.display,
    };
  }

  restoreTextWindowSnapshot(snapshot) {
    if (!snapshot) {
      return;
    }
    this.$namePlate.style.display = snapshot.namePlateDisplay;
    this.$namePlate.textContent = snapshot.namePlateText;
    this.$namePlate.style.color = snapshot.namePlateColor;
    this.$namePlate.style.textShadow = snapshot.namePlateTextShadow;
    this.$expressionTag.textContent = snapshot.expressionText;
    this.$textContent.textContent = snapshot.textContent;
    this.$textContent.style.color = snapshot.textColor;
    this.$cursor.style.display = snapshot.cursorDisplay;
    this.$continueIndicator.classList.toggle("visible", snapshot.continueVisible);
  }

  async directSpeakMessage(messageData) {
    const text = String(messageData?.message || "").trim();
    if (!text) {
      return;
    }

    const currentScenarioStep = this.scenario.steps[this.currentStep];
    if (this.isTyping && currentScenarioStep?.kind === "text") {
      this.skipType(currentScenarioStep.text);
    }

    const snapshot = this.started ? this.captureTextWindowSnapshot() : null;
    const speaker =
      typeof messageData?.speaker === "string" && this.scenario.chars[messageData.speaker]
        ? messageData.speaker
        : this.scenario.steps[this.currentStep]?.kind === "text"
          ? this.scenario.steps[this.currentStep].speaker
          : "narrator";
    const charData = this.getCharData(speaker);
    const isNarrator = speaker === "narrator";
    const expression = typeof messageData?.expression === "string" ? messageData.expression : "";
    const emotion = resolveEmotion(messageData?.emotion, expression);

    this.voiceController.stopCurrent();
    const modelRecord = await this.resolveModelRecordForSpeaker(speaker);
    await this.vrmStage.setSpeaker({
      speakerKey: speaker,
      modelRecord,
      emotion,
    });

    if (this.started) {
      if (isNarrator) {
        this.$namePlate.style.display = "none";
      } else {
        this.$namePlate.style.display = "inline-block";
        if (this.currentMode === "classic") {
          this.$namePlate.textContent = `【${charData.name}】`;
          this.$namePlate.style.color = "#ffffff";
          this.$namePlate.style.textShadow = "none";
        } else {
          this.$namePlate.textContent = `${charData.emoji} ${charData.name}`.trim();
          this.$namePlate.style.color = charData.color || "#ffffff";
          this.$namePlate.style.textShadow = `0 0 12px ${charData.color || "#ffffff"}40`;
        }
      }
      this.$expressionTag.textContent = expression;
      this.$textContent.textContent = text;
      this.$cursor.style.display = "none";
      this.$continueIndicator.classList.remove("visible");
      if (this.currentMode === "immersive" && !isNarrator && charData.color) {
        this.$textContent.style.color = charData.color;
      } else {
        this.$textContent.style.color = "";
      }
    }

    const voiceConfig = await this.getSpeakerVoiceConfig(speaker);
    const wasMuted = this.voiceController.isMuted();
    if (wasMuted) {
      this.voiceController.setMuted(false);
    }
    try {
      await this.voiceController.speakText(text, {
        lang: "ja-JP",
        voiceConfig,
        speakerKey: speaker,
        allowBrowserFallback: true,
      });
    } finally {
      if (wasMuted) {
        this.voiceController.setMuted(true);
      }
    }

    if (
      snapshot &&
      this.started &&
      this.currentStep === snapshot.stepIndex &&
      this.renderToken === snapshot.renderToken &&
      !this.showingChoice
    ) {
      this.restoreTextWindowSnapshot(snapshot);
      await this.refreshCurrentStage(null);
    }
  }

  async handleReceivedMessages(messages) {
    for (const message of messages) {
      const type = typeof message?.type === "string" ? message.type : "direct_send";
      if (type !== "direct_send") {
        console.warn(`unsupported message type: ${type}`);
        continue;
      }
      await this.directSpeakMessage(message);
    }
  }

  advance() {
    if (
      !this.started ||
      this.showingChoice ||
      this.isAdvancing ||
      !this.$("settings-modal").hidden ||
      this.$chapterOverlay.style.display === "flex" ||
      this.$endScreen.style.display === "flex"
    ) {
      return;
    }

    if (this.isTyping) {
      const step = this.scenario.steps[this.currentStep];
      if (step?.kind === "text") {
        this.skipType(step.text);
      }
      return;
    }

    this.voiceController.stopCurrent();
    const nextIndex = this.currentStep + 1;
    if (nextIndex < this.scenario.steps.length) {
      this.isAdvancing = true;
      this.showStep(nextIndex).finally(() => {
        this.isAdvancing = false;
      });
    }
  }

  goBack() {
    if (
      !this.started ||
      this.isTyping ||
      this.isAdvancing ||
      !this.$("settings-modal").hidden ||
      this.$chapterOverlay.style.display === "flex" ||
      this.$endScreen.style.display === "flex"
    ) {
      return;
    }

    this.voiceController.stopCurrent();
    let previousIndex = this.currentStep - 1;
    while (previousIndex >= 0) {
      if (this.scenario.steps[previousIndex].kind === "text") {
        break;
      }
      previousIndex -= 1;
    }
    if (previousIndex >= 0) {
      // Apply the most recent bg before the target text step
      for (let i = previousIndex - 1; i >= 0; i -= 1) {
        const s = this.scenario.steps[i];
        if (s.kind === "bg") {
          this.setAtmosphere(s.bg);
          break;
        }
        if (s.kind === "text" && s.bg) {
          this.setAtmosphere(s.bg);
          break;
        }
      }
      this.isAdvancing = true;
      this.showStep(previousIndex).finally(() => {
        this.isAdvancing = false;
      });
    }
  }

  addToBacklog(step) {
    const charData = this.getCharData(step.speaker);
    this.backlog.push({
      speaker: step.speaker,
      name: charData.name,
      color: charData.color || "#d0d0d0",
      emoji: charData.emoji || "",
      text: step.text,
    });
  }

  startCtrlSkip() {
    if (!this.started || this.ctrlSkipTimer || this.backlogOpen) {
      return;
    }
    const tick = () => {
      if (this.showingChoice || this.$endScreen.style.display === "flex") {
        this.stopCtrlSkip();
        return;
      }
      const step = this.scenario.steps[this.currentStep];
      if (this.isTyping && step?.kind === "text") {
        this.skipType(step.text);
      }
      if (!this.isAdvancing) {
        const nextIndex = this.currentStep + 1;
        if (nextIndex < this.scenario.steps.length) {
          this.isAdvancing = true;
          this.showStep(nextIndex).finally(() => {
            this.isAdvancing = false;
          });
        } else {
          this.stopCtrlSkip();
          return;
        }
      }
      this.ctrlSkipTimer = window.setTimeout(tick, 80);
    };
    tick();
  }

  stopCtrlSkip() {
    if (this.ctrlSkipTimer) {
      window.clearTimeout(this.ctrlSkipTimer);
      this.ctrlSkipTimer = null;
    }
  }

  openBacklog() {
    if (this.backlogOpen || this.backlog.length === 0) {
      return;
    }
    this.backlogOpen = true;
    let el = document.getElementById("backlog-panel");
    if (!el) {
      el = document.createElement("div");
      el.id = "backlog-panel";
      el.innerHTML = `
        <div id="backlog-header">
          <span>バックログ</span>
          <button id="backlog-close" type="button">✕ 閉じる</button>
        </div>
        <div id="backlog-content"></div>
      `;
      document.body.appendChild(el);
      el.querySelector("#backlog-close").addEventListener("click", (event) => {
        event.stopPropagation();
        this.closeBacklog();
      });
      el.addEventListener("click", (event) => {
        event.stopPropagation();
      });
      el.addEventListener("wheel", (event) => {
        event.stopPropagation();
      });
    }

    const content = el.querySelector("#backlog-content");
    content.innerHTML = "";
    for (const entry of this.backlog) {
      const row = document.createElement("div");
      row.className = "backlog-entry";
      const nameEl = document.createElement("span");
      nameEl.className = "backlog-name";
      nameEl.style.color = entry.color;
      nameEl.textContent = entry.speaker === "narrator"
        ? ""
        : `${entry.emoji} ${entry.name}`.trim();
      const textEl = document.createElement("span");
      textEl.className = "backlog-text";
      if (entry.speaker !== "narrator") {
        textEl.style.color = entry.color;
      }
      textEl.textContent = entry.text;
      if (entry.speaker !== "narrator") {
        row.appendChild(nameEl);
      }
      row.appendChild(textEl);
      content.appendChild(row);
    }

    el.style.display = "flex";
    window.requestAnimationFrame(() => {
      el.classList.add("visible");
      content.scrollTop = content.scrollHeight;
    });
  }

  closeBacklog() {
    const el = document.getElementById("backlog-panel");
    if (el) {
      el.classList.remove("visible");
      window.setTimeout(() => {
        el.style.display = "none";
      }, 300);
    }
    this.backlogOpen = false;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const app = new GalgeRuntimeApp();
  window.__galgeRuntimeApp = app;
  app.init().catch((error) => {
    console.error(error);
    const loading = document.getElementById("loading");
    if (loading) {
      loading.textContent = "ランタイム初期化に失敗しました。";
    }
  });
});
