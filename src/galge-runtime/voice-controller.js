import { LRUCache } from "./lru-cache.js";

const MAX_AUDIO_CACHE = 12;
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

export class VoiceController {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.masterGain = null;
    this.currentSource = null;
    this.currentPlaybackToken = 0;
    this.audioCache = new LRUCache(MAX_AUDIO_CACHE);
    this.levelData = new Float32Array(ANALYSER_SIZE);
    this.muted = false;
    this.speechSynthesisActive = false;
    this.speechSynthesisStartedAt = 0;
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

  stopCurrent() {
    this.currentPlaybackToken += 1;
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

  async playStep(scenario, step) {
    if (this.muted || !step.voiceId) {
      return false;
    }

    const buffer = await this.resolveAudioBuffer(
      scenario.audioNamespace,
      step.speaker,
      step.voiceId
    );

    if (!buffer) {
      return false;
    }

    await this.unlock();
    this.stopCurrent();
    const playbackToken = this.currentPlaybackToken;
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.masterGain);
    source.onended = () => {
      if (playbackToken === this.currentPlaybackToken && this.currentSource === source) {
        this.currentSource = null;
      }
    };
    source.start(0);
    this.currentSource = source;
    return true;
  }

  async speakText(text, options = {}) {
    if (this.muted || !String(text || "").trim()) {
      return false;
    }

    if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === "undefined") {
      return false;
    }

    this.stopCurrent();
    const utterance = new SpeechSynthesisUtterance(String(text).trim());
    utterance.lang = options.lang || "ja-JP";
    utterance.rate = Number.isFinite(options.rate) ? options.rate : 1;
    utterance.pitch = Number.isFinite(options.pitch) ? options.pitch : 1;

    const voices = window.speechSynthesis.getVoices?.() || [];
    const preferredVoice =
      voices.find((voice) => voice.lang?.toLowerCase().startsWith("ja")) || voices[0];
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    return new Promise((resolve) => {
      utterance.onstart = () => {
        this.speechSynthesisActive = true;
        this.speechSynthesisStartedAt = performance.now();
      };
      utterance.onend = () => {
        this.speechSynthesisActive = false;
        resolve(true);
      };
      utterance.onerror = (error) => {
        console.warn("speech synthesis error:", error);
        this.speechSynthesisActive = false;
        resolve(false);
      };
      window.speechSynthesis.speak(utterance);
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
