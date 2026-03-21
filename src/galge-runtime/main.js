import { BGMController } from "./bgm-controller.js";
import { resolveEmotion } from "./emotion-resolver.js";
import { loadScenarioDefinition } from "./scenario-loader.js";
import { MessageApiReceiver } from "./message-api-receiver.js";
import { SettingsPanel } from "./settings-panel.js";
import { VoiceController } from "./voice-controller.js";
import { VRMAssetStore } from "./vrm-asset-store.js";
import { VRMStage } from "./vrm-stage.js";

class GalgeRuntimeApp {
  constructor() {
    this.currentMode =
      new URLSearchParams(window.location.search).get("mode") === "classic"
        ? "classic"
        : "immersive";
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
    this.$settingsBtn = this.$("settings-btn");
    this.$titleVoiceToggle = this.$("title-voice-toggle");
    this.$voiceToggle = this.$("voice-toggle");
    this.$titleBgmToggle = this.$("title-bgm-toggle");
    this.$bgmToggle = this.$("bgm-toggle");
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

    this.$settingsBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      this.settingsPanel.open();
    });

    this.$titleVoiceToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      this.toggleMute();
    });

    this.$voiceToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      this.toggleMute();
    });

    this.$titleBgmToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      this.toggleBgm();
    });

    this.$bgmToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      this.toggleBgm();
    });

    this.$startBtn.addEventListener("click", async (event) => {
      event.stopPropagation();
      await this.startExperience();
    });

    document.addEventListener("click", (event) => {
      if (
        event.target === this.$modeToggle ||
        event.target === this.$startBtn ||
        event.target === this.$settingsBtn ||
        event.target === this.$titleSettingsBtn ||
        event.target === this.$voiceToggle ||
        event.target === this.$titleVoiceToggle ||
        event.target.closest("#settings-modal") ||
        event.target.closest("#back-btn") ||
        event.target.closest("#end-screen a")
      ) {
        return;
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
    const text = this.voiceController.isMuted() ? "🔇 音声OFF" : "🔊 音声ON";
    this.$voiceToggle.textContent = text;
    this.$titleVoiceToggle.textContent = text;
  }

  toggleMute() {
    this.voiceController.setMuted(!this.voiceController.isMuted());
    this.updateVoiceToggle();
  }

  updateBgmToggle() {
    const text = this.bgmController.isEnabled() ? "🎵 BGM ON" : "🎵 BGM OFF";
    this.$bgmToggle.textContent = text;
    this.$titleBgmToggle.textContent = text;
  }

  toggleBgm() {
    this.bgmController.setEnabled(!this.bgmController.isEnabled());
    this.updateBgmToggle();
    if (this.started) {
      this.syncBgmForIndex(this.currentStep);
    }
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
    await this.voiceController.speakText(text, {
      lang: "ja-JP",
      voiceConfig: config,
      speakerKey,
      allowBrowserFallback: true,
    });
  }

  findActiveBgmCue(index) {
    if (!this.scenario?.steps?.length) {
      return null;
    }

    let activeCue = null;
    const safeIndex = Math.min(index, this.scenario.steps.length - 1);
    for (let stepIndex = 0; stepIndex <= safeIndex; stepIndex += 1) {
      const cue = this.scenario.steps[stepIndex]?.bgm;
      if (cue) {
        activeCue = cue.stop ? { stop: true } : cue;
      }
    }
    return activeCue;
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
      this.ctx.fillStyle = `rgba(200,180,255,${alpha * 0.8})`;
      this.ctx.fill();
      if (star.size > 1.5) {
        this.ctx.beginPath();
        this.ctx.arc(star.x, star.y, star.size * 3 * flicker, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(160,140,220,${alpha * 0.15})`;
        this.ctx.fill();
      }
    }

    this.animId = requestAnimationFrame(this.drawKongou);
  };

  setAtmosphere(bg) {
    if (!bg) {
      return;
    }

    const presets = {
      dark_chapel: { h: 270, s: 40, l: 8, clear: "rgba(15,5,30,0.15)" },
      void: { h: 260, s: 30, l: 4, clear: "rgba(5,3,15,0.18)" },
      cathedral: { h: 250, s: 50, l: 12, clear: "rgba(10,10,46,0.15)" },
      twilight: { h: 220, s: 45, l: 15, clear: "rgba(8,12,40,0.14)" },
      crimson: { h: 0, s: 60, l: 10, clear: "rgba(30,5,10,0.16)" },
      abyss: { h: 240, s: 20, l: 3, clear: "rgba(3,3,10,0.20)" },
      dawn: { h: 30, s: 50, l: 18, clear: "rgba(30,15,8,0.12)" },
      station: { h: 35, s: 40, l: 14, clear: "rgba(20,12,8,0.14)" },
      station_night: { h: 220, s: 35, l: 8, clear: "rgba(6,8,22,0.16)" },
      akihabara: { h: 280, s: 50, l: 12, clear: "rgba(18,8,30,0.14)" },
      default: { h: 240, s: 50, l: 12, clear: "rgba(10,10,46,0.15)" },
    };

    const bgKey = typeof bg === "string" ? bg : (bg.preset || "default");
    const preset = presets[bgKey] || presets.default;

    this.bgColor = { h: preset.h, s: preset.s, l: preset.l };
    this.bgClearColor = preset.clear;
    for (const nebula of this.kNebula) {
      nebula.hue = Math.floor(Math.random() * 80 + this.bgColor.h - 40);
    }
    for (const pillar of this.kPillars) {
      pillar.hue = Math.floor(Math.random() * 40 + this.bgColor.h - 20);
    }
    for (const stream of this.kStreams) {
      stream.hue = Math.floor(Math.random() * 60 + this.bgColor.h - 30);
    }

    document.body.style.background = `linear-gradient(180deg, hsl(${this.bgColor.h},${this.bgColor.s}%,${this.bgColor.l}%) 0%, hsl(${this.bgColor.h},${this.bgColor.s}%,${Math.max(1, this.bgColor.l - 5)}%) 50%, hsl(${this.bgColor.h},${this.bgColor.s}%,${this.bgColor.l}%) 100%)`;

    // Background image support
    const bgImageKey = bgKey.replace(/[^a-z0-9_]/gi, "_");
    const imgPath = `./scenarios/bg/${bgImageKey}.jpg`;
    this._showBgImage(imgPath);
  }

  _showBgImage(src) {
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
        transition: "opacity 0.8s ease",
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
      // No bg image for this scene — hide it
      el.style.opacity = "0";
      el.dataset.currentSrc = "";
    };
    img.src = src;
  }

  setMode(mode) {
    this.currentMode = mode;
    document.body.classList.remove("mode-immersive", "mode-classic");
    document.body.classList.add(`mode-${mode}`);
    this.$modeToggle.textContent = mode === "immersive" ? "🌙" : "🖥️";
    this.$cursor.textContent = mode === "classic" ? "▌" : "█";

    let frame = document.querySelector(".pc98-frame");
    if (mode === "classic") {
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

    this.$continueIndicator.textContent =
      mode === "classic" ? "＞次へ  SPACE / ENTER" : "▼ クリック / スペースで次へ";

    const currentStep = this.scenario?.steps?.[this.currentStep];
    if (this.started && currentStep?.kind === "text" && currentStep.speaker !== "narrator") {
      const charData = this.getCharData(currentStep.speaker);
      if (mode === "classic") {
        this.$namePlate.textContent = `【${charData.name}】`;
        this.$namePlate.style.color = "#ffffff";
        this.$namePlate.style.textShadow = "none";
      } else {
        this.$namePlate.textContent = `${charData.emoji} ${charData.name}`.trim();
        this.$namePlate.style.color = charData.color || "#ffffff";
        this.$namePlate.style.textShadow = `0 0 12px ${charData.color || "#ffffff"}40`;
      }
    }
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
        const button = document.createElement("button");
        button.className = "choice-btn";
        button.textContent = choice.text;
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          this.showingChoice = false;
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
    await this.voiceController.speakText(text, {
      lang: "ja-JP",
      voiceConfig,
      speakerKey: speaker,
      allowBrowserFallback: true,
    });

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
