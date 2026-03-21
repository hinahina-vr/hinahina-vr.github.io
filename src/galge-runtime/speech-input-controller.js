const LISTENING_TEXT = "🎙️ 音声入力待機中";
const IDLE_TEXT = "🎤 音声入力";
const UNSUPPORTED_TEXT = "🎤 非対応";

export class SpeechInputController {
  constructor({ onTranscript, onStatusChange }) {
    this.onTranscript = onTranscript;
    this.onStatusChange = onStatusChange;
    this.recognition = null;
    this.listening = false;
    this.supported = false;
    this.transcript = "";
    this.clearStatusTimer = 0;

    this.initialize();
  }

  initialize() {
    const SpeechRecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      this.supported = false;
      this.publishState("このブラウザでは音声入力を使えません。");
      return;
    }

    this.supported = true;
    this.recognition = new SpeechRecognitionCtor();
    this.recognition.lang = "ja-JP";
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.listening = true;
      this.transcript = "";
      this.publishState("話してください。");
    };

    this.recognition.onresult = (event) => {
      const transcript = Array.from(event.results || [])
        .map((result) => result?.[0]?.transcript || "")
        .join("")
        .trim();

      if (!transcript) {
        return;
      }

      this.transcript = transcript;
      const finalResult = Array.from(event.results || []).some((result) => result.isFinal);
      this.publishState(`認識中: ${transcript}`);
      if (finalResult) {
        this.onTranscript?.(transcript);
      }
    };

    this.recognition.onerror = (event) => {
      this.listening = false;
      const message =
        event?.error === "not-allowed"
          ? "マイク権限が拒否されました。"
          : event?.error === "no-speech"
            ? "音声を検出できませんでした。"
            : "音声入力エラーが発生しました。";
      this.publishState(message, 2400);
    };

    this.recognition.onend = () => {
      this.listening = false;
      if (this.transcript) {
        this.publishState(`認識: ${this.transcript}`, 2400);
      } else {
        this.publishState("音声入力待機", 1200);
      }
    };
  }

  isSupported() {
    return this.supported;
  }

  isListening() {
    return this.listening;
  }

  getButtonText() {
    if (!this.supported) {
      return UNSUPPORTED_TEXT;
    }
    return this.listening ? LISTENING_TEXT : IDLE_TEXT;
  }

  async ensureMicrophonePermission() {
    if (!navigator.mediaDevices?.getUserMedia) {
      return true;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  }

  async startListening() {
    if (!this.supported || !this.recognition || this.listening) {
      return false;
    }

    try {
      await this.ensureMicrophonePermission();
    } catch (error) {
      console.warn("microphone permission failed:", error);
      this.publishState("マイク権限が必要です。", 2400);
      return false;
    }

    try {
      this.transcript = "";
      this.recognition.start();
      return true;
    } catch (error) {
      console.warn("speech recognition start failed:", error);
      this.publishState("音声入力を開始できませんでした。", 2400);
      return false;
    }
  }

  stopListening() {
    if (!this.supported || !this.recognition) {
      return;
    }

    try {
      this.recognition.stop();
    } catch (error) {
      console.warn("speech recognition stop failed:", error);
    } finally {
      this.listening = false;
      this.publishState("音声入力停止", 1200);
    }
  }

  async toggleListening() {
    if (this.listening) {
      this.stopListening();
      return false;
    }
    return this.startListening();
  }

  publishState(message, resetMs = 0) {
    window.clearTimeout(this.clearStatusTimer);
    this.onStatusChange?.({
      message,
      listening: this.listening,
      supported: this.supported,
      buttonText: this.getButtonText(),
    });

    if (resetMs > 0) {
      this.clearStatusTimer = window.setTimeout(() => {
        this.onStatusChange?.({
          message: this.supported ? "音声入力待機" : "このブラウザでは音声入力を使えません。",
          listening: this.listening,
          supported: this.supported,
          buttonText: this.getButtonText(),
        });
      }, resetMs);
    }
  }
}
