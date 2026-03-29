const BGM_ENABLED_STORAGE_KEY = "galgeRuntimeBgmEnabled";
const BGM_VOLUME_OVERRIDE_STORAGE_KEY = "galgeRuntimeBgmVolumeOverride";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function encodePathSegment(pathPart) {
  return pathPart
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function isDirectPath(track) {
  return /^(?:\.{1,2}\/|\/|https?:\/\/)/.test(track);
}

export class BGMController {
  constructor() {
    this.enabled = window.localStorage.getItem(BGM_ENABLED_STORAGE_KEY) === "1";
    this.volumeOverride = this.loadVolumeOverride();
    this.audio = new Audio();
    this.audio.loop = true;
    this.audio.preload = "none";
    this.currentNamespace = "";
    this.currentCue = null;
    this.currentSrc = "";
    this._fadeTimer = null;
    this._fadeDuration = 2000; // 2 seconds fade out
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(nextEnabled) {
    this.enabled = Boolean(nextEnabled);
    window.localStorage.setItem(BGM_ENABLED_STORAGE_KEY, this.enabled ? "1" : "0");
    if (!this.enabled) {
      this.audio.pause();
      this.audio.currentTime = 0;
      return;
    }
    this.syncPlayback();
  }

  loadVolumeOverride() {
    try {
      const raw = window.localStorage.getItem(BGM_VOLUME_OVERRIDE_STORAGE_KEY);
      if (raw == null || raw === "") {
        return null;
      }
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? clamp(parsed, 0, 1) : null;
    } catch (error) {
      return null;
    }
  }

  saveVolumeOverride() {
    try {
      if (this.volumeOverride == null) {
        window.localStorage.removeItem(BGM_VOLUME_OVERRIDE_STORAGE_KEY);
        return;
      }
      window.localStorage.setItem(BGM_VOLUME_OVERRIDE_STORAGE_KEY, String(this.volumeOverride));
    } catch (error) {
      // Ignore storage failures and continue with in-memory volume.
    }
  }

  resolveSource(namespace, cue) {
    if (!cue || cue.stop) {
      return "";
    }

    if (cue.src) {
      return cue.src;
    }

    const track = String(cue.track || "").trim();
    if (!track) {
      return "";
    }

    if (isDirectPath(track)) {
      return track;
    }

    const normalizedTrack = track.toLowerCase().endsWith(".mp3") ? track : `${track}.mp3`;
    return `./assets/bgm/scenarios/${encodeURIComponent(namespace)}/${encodePathSegment(normalizedTrack)}`;
  }

  setCue(namespace, cue) {
    this.currentNamespace = namespace || "";
    this.currentCue = cue ? { ...cue } : null;
    this.syncPlayback();
  }

  clearCue() {
    this.currentCue = null;
    this.currentSrc = "";
    this._fadeOut(this.audio, () => {
      this.audio.removeAttribute("src");
      this.audio.load();
    });
  }

  _fadeOut(audioEl, onComplete) {
    if (!audioEl || audioEl.paused) {
      if (onComplete) onComplete();
      return;
    }
    if (this._fadeTimer) clearInterval(this._fadeTimer);
    const startVol = audioEl.volume;
    const steps = 40;
    const interval = this._fadeDuration / steps;
    let step = 0;
    this._fadeTimer = setInterval(() => {
      step++;
      audioEl.volume = clamp(startVol * (1 - step / steps), 0, 1);
      if (step >= steps) {
        clearInterval(this._fadeTimer);
        this._fadeTimer = null;
        audioEl.pause();
        audioEl.volume = 0;
        if (onComplete) onComplete();
      }
    }, interval);
  }

  _fadeIn(audioEl, targetVol) {
    audioEl.volume = 0;
    const steps = 40;
    const interval = this._fadeDuration / steps;
    let step = 0;
    if (this._fadeTimer) clearInterval(this._fadeTimer);
    this._fadeTimer = setInterval(() => {
      step++;
      audioEl.volume = clamp(targetVol * (step / steps), 0, 1);
      if (step >= steps) {
        clearInterval(this._fadeTimer);
        this._fadeTimer = null;
      }
    }, interval);
  }

  syncPlayback() {
    if (!this.currentCue || this.currentCue.stop) {
      this.clearCue();
      return;
    }

    const nextSrc = this.resolveSource(this.currentNamespace, this.currentCue);
    if (!nextSrc) {
      this.clearCue();
      return;
    }

    const targetVol = this.getTargetVolume(this.currentCue);

    if (this.currentSrc !== nextSrc) {
      // Fade out old track, then start new track with fade in
      this._fadeOut(this.audio, () => {
        this.audio.loop = this.currentCue ? this.currentCue.loop !== false : true;
        this.currentSrc = nextSrc;
        this.audio.src = nextSrc;
        this.audio.volume = targetVol;

        if (!this.enabled) {
          this.audio.pause();
          return;
        }

        this.audio.play().catch((error) => {
          console.warn("bgm play failed:", error);
        });
      });
    } else {
      this.audio.loop = this.currentCue.loop !== false;
      this.audio.volume = targetVol;

      if (!this.enabled) {
        this.audio.pause();
        this.audio.currentTime = 0;
        return;
      }

      this.audio.play().catch((error) => {
        console.warn("bgm play failed:", error);
      });
    }
  }

  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
  }

  getVolume() {
    if (this.volumeOverride != null) {
      return this.volumeOverride;
    }
    return this.getCueVolume(this.currentCue);
  }

  setVolume(v) {
    this.volumeOverride = clamp(v, 0, 1);
    this.saveVolumeOverride();
    if (this.currentCue && !this.currentCue.stop) {
      this.audio.volume = this.getTargetVolume(this.currentCue);
    } else {
      this.audio.volume = this.volumeOverride;
    }
  }

  hasVolumeOverride() {
    return this.volumeOverride != null;
  }

  clearVolumeOverride() {
    this.volumeOverride = null;
    this.saveVolumeOverride();
    if (this.currentCue && !this.currentCue.stop) {
      this.audio.volume = this.getTargetVolume(this.currentCue);
    }
  }

  getCueVolume(cue) {
    return clamp(Number.isFinite(cue?.volume) ? cue.volume : 0.45, 0, 1);
  }

  getTargetVolume(cue) {
    if (this.volumeOverride != null) {
      return this.volumeOverride;
    }
    return this.getCueVolume(cue);
  }
}
