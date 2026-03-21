const CLIENT_ID_STORAGE_KEY = "galgeMessageApiClientId";
const API_BASE_STORAGE_KEY = "galgeMessageApiBase";

function createClientId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `galge-${Math.random().toString(36).slice(2, 10)}`;
}

function resolveApiBase() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("messageApiBase");
  if (fromQuery) {
    window.localStorage.setItem(API_BASE_STORAGE_KEY, fromQuery);
    return fromQuery;
  }

  const fromStorage = window.localStorage.getItem(API_BASE_STORAGE_KEY);
  if (fromStorage) {
    return fromStorage;
  }

  return "";
}

export class MessageApiReceiver {
  constructor({ onMessages, onStatusChange }) {
    this.onMessages = onMessages;
    this.onStatusChange = onStatusChange;
    this.clientId =
      window.localStorage.getItem(CLIENT_ID_STORAGE_KEY) || createClientId();
    window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, this.clientId);
    this.apiBase = resolveApiBase();
    this.pollTimer = 0;
    this.active = false;
    this.pollIntervalMs = 1000;
  }

  getClientId() {
    return this.clientId;
  }

  getApiBase() {
    return this.apiBase;
  }

  getEndpoint() {
    if (!this.apiBase) {
      return "";
    }
    const normalizedBase = this.apiBase.replace(/\/+$/, "");
    return `${normalizedBase}/api/messages`;
  }

  isConfigured() {
    return Boolean(this.getEndpoint());
  }

  start() {
    if (!this.isConfigured() || this.active) {
      this.publishStatus(this.isConfigured() ? "発話API 接続待機中" : "発話API 未設定");
      return;
    }

    this.active = true;
    this.publishStatus("発話API 接続待機中");
    this.schedulePoll(50);
  }

  stop() {
    this.active = false;
    window.clearTimeout(this.pollTimer);
  }

  schedulePoll(delayMs = this.pollIntervalMs) {
    window.clearTimeout(this.pollTimer);
    if (!this.active) {
      return;
    }
    this.pollTimer = window.setTimeout(() => {
      this.poll().catch((error) => {
        console.warn("message api poll failed:", error);
      });
    }, delayMs);
  }

  async poll() {
    if (!this.active) {
      return;
    }

    const endpoint = this.getEndpoint();
    if (!endpoint) {
      this.publishStatus("発話API 未設定");
      this.active = false;
      return;
    }

    try {
      const url = new URL(endpoint);
      url.searchParams.set("clientId", this.clientId);
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const messages = Array.isArray(data.messages) ? data.messages : [];
      this.publishStatus(
        messages.length > 0 ? `発話API 受信 ${messages.length} 件` : "発話API 待機中"
      );
      if (messages.length > 0) {
        await this.onMessages?.(messages);
      }
      this.schedulePoll();
    } catch (error) {
      this.publishStatus("発話API 未接続");
      this.schedulePoll(5000);
    }
  }

  publishStatus(message) {
    this.onStatusChange?.({
      message,
      clientId: this.clientId,
      apiBase: this.apiBase,
      configured: this.isConfigured(),
    });
  }
}
