import { LRUCache } from "./lru-cache.js";
import { isProxyVoiceApiProvider, normalizeVoiceApiConfig } from "./voice-api-config.js";

const MAX_AUDIO_CACHE = 12;
const MAX_DYNAMIC_AUDIO_CACHE = 8;
const ANALYSER_SIZE = 2048;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function buildAudioCandidates(audioNamespace, speaker, voiceId) {
  const safeNamespace = encodeURIComponent(audioNamespace);
  const safeSpeaker = encodeURIComponent(speaker);
  const safeVoiceId = encodeURIComponent(voiceId);
  const basePath = `./assets/voices/scenarios/${safeNamespace}/${safeSpeaker}/${safeVoiceId}`;
  return [`${basePath}.wav`, `${basePath}.mp3`];
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function normalizeProxyBase(base) {
  return typeof base === "string" ? base.trim().replace(/\/+$/, "") : "";
}

export class VoiceController {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.masterGain = null;
    this.currentSource = null;
    this.currentPlaybackToken = 0;
    this.currentRequestToken = 0;
    this.audioCache = new LRUCache(MAX_AUDIO_CACHE);
    this.dynamicAudioCache = new LRUCache(MAX_DYNAMIC_AUDIO_CACHE);
    this.levelData = new Float32Array(ANALYSER_SIZE);
    this.muted = true;
    this.speechSynthesisActive = false;
    this.speechSynthesisStartedAt = 0;
    this.proxyBase = "";
  }

  setProxyBase(base) {
    this.proxyBase = normalizeProxyBase(base);
  }

  async ensureAudioContext() {
    if (this.audioContext) {
      return;
    }

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) {
      throw new Error("このブラウザでは AudioContext が利用できません。");
    }

    this.audioContext = new AudioContextCtor();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = ANALYSER_SIZE;
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 1;
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
  }

  async unlock() {
    await this.ensureAudioContext();
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
  }

  isMuted() {
    return this.muted;
  }

  setMuted(nextMuted) {
    this.muted = nextMuted;
    if (nextMuted) {
      this.stopCurrent();
    }
  }

  getVolume() {
    return this.masterGain ? this.masterGain.gain.value : 1;
  }

  setVolume(v) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.min(1, Math.max(0, v));
    }
  }

  stopPlayback() {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (error) {
        console.warn("voice stop error:", error);
      }
      try {
        this.currentSource.disconnect();
      } catch (error) {
        console.warn("voice disconnect error:", error);
      }
      this.currentSource = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.speechSynthesisActive = false;
  }

  stopCurrent() {
    this.currentRequestToken += 1;
    this.currentPlaybackToken += 1;
    this.stopPlayback();
  }

  beginRequest() {
    this.currentRequestToken += 1;
    this.stopPlayback();
    return this.currentRequestToken;
  }

  getLevel() {
    if (this.speechSynthesisActive) {
      const elapsed = (performance.now() - this.speechSynthesisStartedAt) / 1000;
      const level = 0.15 + Math.abs(Math.sin(elapsed * 8.2)) * 0.55;
      return clamp(level, 0, 1);
    }

    if (!this.analyser) {
      return 0;
    }

    this.analyser.getFloatTimeDomainData(this.levelData);
    let peak = 0;
    for (let index = 0; index < this.levelData.length; index += 1) {
      peak = Math.max(peak, Math.abs(this.levelData[index]));
    }

    const cooked = 1 / (1 + Math.exp(-45 * peak + 5));
    return clamp(cooked, 0, 1);
  }

  async fetchAudioBuffer(url) {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    if (!arrayBuffer.byteLength) {
      return null;
    }
    return this.audioContext.decodeAudioData(arrayBuffer.slice(0));
  }

  async resolveAudioBuffer(audioNamespace, speaker, voiceId) {
    if (!voiceId) {
      return null;
    }

    await this.ensureAudioContext();

    const cacheKey = `${audioNamespace}/${speaker}/${voiceId}`;
    const cached = this.audioCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const pending = (async () => {
      for (const candidate of buildAudioCandidates(audioNamespace, speaker, voiceId)) {
        try {
          const buffer = await this.fetchAudioBuffer(candidate);
          if (buffer) {
            return buffer;
          }
        } catch (error) {
          console.warn(`audio fetch failed: ${candidate}`, error);
        }
      }
      return null;
    })();

    const eviction = this.audioCache.set(cacheKey, pending);
    if (eviction) {
      this.audioCache.delete(eviction.evictedKey);
    }

    const resolved = await pending;
    this.audioCache.set(cacheKey, resolved);
    return resolved;
  }

  getProxyEndpoint() {
    return this.proxyBase ? `${this.proxyBase}/api/tts` : "";
  }

  async fetchProxyTtsBuffer(text, voiceConfig) {
    const endpoint = this.getProxyEndpoint();
    if (!endpoint) {
      return null;
    }

    await this.ensureAudioContext();
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "audio/*,application/json",
      },
      body: JSON.stringify({
        text,
        config: voiceConfig,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`TTS proxy HTTP ${response.status}: ${errorText}`.trim());
    }

    const arrayBuffer = await response.arrayBuffer();
    if (!arrayBuffer.byteLength) {
      return null;
    }
    return this.audioContext.decodeAudioData(arrayBuffer.slice(0));
  }

  async resolveDynamicTtsBuffer(text, voiceConfig) {
    const normalizedConfig = normalizeVoiceApiConfig(voiceConfig);
    if (!normalizedConfig || normalizedConfig.provider === "browser") {
      return null;
    }

    const cacheKey = `tts:${normalizedConfig.provider}:${stableStringify(
      normalizedConfig.settings
    )}:${text}`;
    const cached = this.dynamicAudioCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const pending = this.fetchProxyTtsBuffer(text, normalizedConfig);
    const eviction = this.dynamicAudioCache.set(cacheKey, pending);
    if (eviction) {
      this.dynamicAudioCache.delete(eviction.evictedKey);
    }

    const resolved = await pending.catch((error) => {
      this.dynamicAudioCache.delete(cacheKey);
      throw error;
    });
    this.dynamicAudioCache.set(cacheKey, resolved);
    return resolved;
  }

  async playAudioBuffer(buffer, requestToken, awaitEnd = false) {
    if (!buffer || requestToken !== this.currentRequestToken) {
      return false;
    }

    await this.unlock();
    if (requestToken !== this.currentRequestToken) {
      return false;
    }

    return new Promise((resolve) => {
      const playbackToken = ++this.currentPlaybackToken;
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.masterGain);
      source.onended = () => {
        if (playbackToken === this.currentPlaybackToken && this.currentSource === source) {
          this.currentSource = null;
        }
        resolve(true);
      };
      this.currentSource = source;
      source.start(0);
      if (!awaitEnd) {
        resolve(true);
      }
    });
  }

  async playStep(scenario, step, options = {}) {
    if (this.muted) {
      return false;
    }

    const requestToken = this.beginRequest();
    const voiceConfig = normalizeVoiceApiConfig(options.voiceConfig);

    let buffer = null;
    if (step.voiceId) {
      buffer = await this.resolveAudioBuffer(scenario.audioNamespace, step.speaker, step.voiceId);
    }
    if (requestToken !== this.currentRequestToken) {
      return false;
    }

    if (buffer) {
      return this.playAudioBuffer(buffer, requestToken, false);
    }

    if (voiceConfig) {
      return this.speakText(step.text, {
        lang: "ja-JP",
        voiceConfig,
        allowBrowserFallback: voiceConfig.provider === "browser",
      });
    }

    // No voice config — fall back to browser speech synthesis
    return this.speakWithSpeechSynthesis(step.text, { lang: "ja-JP" });
  }

  async speakWithSpeechSynthesis(text, options = {}) {
    if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === "undefined") {
      return false;
    }

    const requestToken = this.beginRequest();
    const utterance = new SpeechSynthesisUtterance(String(text).trim());
    utterance.lang = options.lang || "ja-JP";
    utterance.rate = Number.isFinite(options.rate) ? options.rate : 1;
    utterance.pitch = Number.isFinite(options.pitch) ? options.pitch : 1;

    const voices = window.speechSynthesis.getVoices?.() || [];
    const preferredVoice =
      voices.find((voice) => voice.lang?.toLowerCase().startsWith(utterance.lang.toLowerCase())) ||
      voices.find((voice) => voice.lang?.toLowerCase().startsWith("ja")) ||
      voices[0];
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    return new Promise((resolve) => {
      utterance.onstart = () => {
        if (requestToken !== this.currentRequestToken) {
          return;
        }
        this.speechSynthesisActive = true;
        this.speechSynthesisStartedAt = performance.now();
      };
      utterance.onend = () => {
        if (requestToken === this.currentRequestToken) {
          this.speechSynthesisActive = false;
        }
        resolve(requestToken === this.currentRequestToken);
      };
      utterance.onerror = (error) => {
        console.warn("speech synthesis error:", error);
        if (requestToken === this.currentRequestToken) {
          this.speechSynthesisActive = false;
        }
        resolve(false);
      };
      window.speechSynthesis.speak(utterance);
    });
  }

  async speakText(text, options = {}) {
    const trimmedText = String(text || "").trim();
    if (this.muted || !trimmedText) {
      return false;
    }

    const voiceConfig = normalizeVoiceApiConfig(options.voiceConfig);
    if (voiceConfig && voiceConfig.provider !== "browser") {
      const requestToken = this.beginRequest();
      try {
        const buffer = await this.resolveDynamicTtsBuffer(trimmedText, voiceConfig);
        if (requestToken !== this.currentRequestToken) {
          return false;
        }
        if (buffer) {
          return this.playAudioBuffer(buffer, requestToken, true);
        }
      } catch (error) {
        console.warn("proxy tts failed:", error);
      }

      if (!options.allowBrowserFallback) {
        if (isProxyVoiceApiProvider(voiceConfig.provider) && !this.getProxyEndpoint()) {
          console.warn("proxy tts skipped: /api/tts is not configured");
        }
        return false;
      }
    }

    return this.speakWithSpeechSynthesis(trimmedText, {
      lang: voiceConfig?.settings?.lang || options.lang || "ja-JP",
      rate:
        Number.isFinite(voiceConfig?.settings?.rate) ? voiceConfig.settings.rate : options.rate,
      pitch:
        Number.isFinite(voiceConfig?.settings?.pitch)
          ? voiceConfig.settings.pitch
          : options.pitch,
    });
  }

  async prefetchSteps(scenario, steps) {
    const tasks = steps
      .filter((step) => step.kind === "text" && step.voiceId)
      .map((step) =>
        this.resolveAudioBuffer(scenario.audioNamespace, step.speaker, step.voiceId).catch(
          () => null
        )
      );

    await Promise.all(tasks);
  }
}
