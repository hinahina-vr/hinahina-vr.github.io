import { createServer } from "node:http";

const PORT = Number(process.env.GALGE_MESSAGE_API_PORT || 8182);
const CLIENT_TIMEOUT = 1000 * 60 * 5;
const messageQueues = new Map();

function createCorsHeaders(contentType = "application/json; charset=utf-8") {
  return {
    "Content-Type": contentType,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, createCorsHeaders());
  response.end(JSON.stringify(body));
}

function sendAudio(response, statusCode, buffer, contentType) {
  response.writeHead(statusCode, createCorsHeaders(contentType || "audio/mpeg"));
  response.end(buffer);
}

function cleanupQueues() {
  const now = Date.now();
  for (const [clientId, queue] of messageQueues.entries()) {
    if (now - queue.lastAccessed > CLIENT_TIMEOUT) {
      messageQueues.delete(clientId);
    }
  }
}

function ensureQueue(clientId) {
  if (!messageQueues.has(clientId)) {
    messageQueues.set(clientId, {
      messages: [],
      lastAccessed: Date.now(),
    });
  }
  return messageQueues.get(clientId);
}

function normalizeMessageEntry(entry, fallbackType) {
  if (typeof entry === "string") {
    return {
      timestamp: Date.now(),
      type: fallbackType,
      message: entry,
    };
  }

  if (!entry || typeof entry !== "object" || typeof entry.message !== "string") {
    return null;
  }

  return {
    timestamp: Date.now(),
    type: typeof entry.type === "string" ? entry.type : fallbackType,
    message: entry.message,
    speaker: typeof entry.speaker === "string" ? entry.speaker : undefined,
    expression: typeof entry.expression === "string" ? entry.expression : undefined,
    emotion: typeof entry.emotion === "string" ? entry.emotion : undefined,
  };
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    throw new Error("Invalid JSON body");
  }
}

function normalizeBaseUrl(value) {
  return typeof value === "string" ? value.trim().replace(/\/+$/, "") : "";
}

function parseJsonObject(value) {
  if (!value || typeof value !== "string") {
    return {};
  }
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
}

async function fetchBinary(url, options) {
  const response = await fetch(url, options);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!response.ok) {
    const errorText = buffer.toString("utf8");
    throw new Error(`HTTP ${response.status}: ${errorText}`.trim());
  }
  return {
    buffer,
    contentType: response.headers.get("content-type") || "application/octet-stream",
  };
}

async function synthesizeVoiceVox(text, config) {
  const settings = config.settings || {};
  const serverUrl = normalizeBaseUrl(settings.serverUrl || "http://127.0.0.1:50021");
  const speaker = Number.isFinite(Number(settings.speaker)) ? Number(settings.speaker) : 1;
  const queryUrl = new URL(`${serverUrl}/audio_query`);
  queryUrl.searchParams.set("text", text);
  queryUrl.searchParams.set("speaker", String(speaker));

  const queryResponse = await fetch(queryUrl, {
    method: "POST",
  });
  if (!queryResponse.ok) {
    throw new Error(`VOICEVOX audio_query HTTP ${queryResponse.status}`);
  }

  const audioQuery = await queryResponse.json();
  if (Number.isFinite(Number(settings.speed))) {
    audioQuery.speedScale = Number(settings.speed);
  }
  if (Number.isFinite(Number(settings.pitch))) {
    audioQuery.pitchScale = Number(settings.pitch);
  }
  if (Number.isFinite(Number(settings.intonation))) {
    audioQuery.intonationScale = Number(settings.intonation);
  }

  const synthesisUrl = new URL(`${serverUrl}/synthesis`);
  synthesisUrl.searchParams.set("speaker", String(speaker));

  return fetchBinary(synthesisUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(audioQuery),
  });
}

async function synthesizeOpenAiCompatible(text, config, defaults = {}) {
  const settings = config.settings || {};
  const baseUrl = normalizeBaseUrl(settings.baseUrl || defaults.baseUrl);
  if (!baseUrl) {
    throw new Error("baseUrl is required");
  }

  const headers = {
    "Content-Type": "application/json",
    ...parseJsonObject(settings.headersJson),
  };
  if (settings.apiKey) {
    headers.Authorization = `Bearer ${settings.apiKey}`;
  }

  return fetchBinary(`${baseUrl}/audio/speech`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: settings.model || defaults.model || "gpt-4o-mini-tts",
      input: text,
      voice: settings.voice || defaults.voice || "alloy",
      speed: Number.isFinite(Number(settings.speed)) ? Number(settings.speed) : 1,
      response_format: settings.format || defaults.format || "mp3",
    }),
  });
}

async function synthesizeAzure(text, config) {
  const settings = config.settings || {};
  const endpoint = normalizeBaseUrl(settings.endpoint);
  const deployment = String(settings.deployment || "").trim();
  const apiVersion = String(settings.apiVersion || "2025-04-01-preview").trim();

  if (!endpoint || !deployment || !settings.apiKey) {
    throw new Error("endpoint, deployment, apiKey are required for Azure TTS");
  }

  const requestUrl = new URL(
    `${endpoint}/openai/deployments/${encodeURIComponent(deployment)}/audio/speech`
  );
  requestUrl.searchParams.set("api-version", apiVersion);

  return fetchBinary(requestUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": settings.apiKey,
    },
    body: JSON.stringify({
      model: settings.model || "tts-1",
      input: text,
      voice: settings.voice || "alloy",
      speed: Number.isFinite(Number(settings.speed)) ? Number(settings.speed) : 1,
      response_format: settings.format || "mp3",
    }),
  });
}

async function synthesizeTts(text, config) {
  switch (config.provider) {
    case "voicevox":
      return synthesizeVoiceVox(text, config);
    case "openai":
      return synthesizeOpenAiCompatible(text, config, {
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4o-mini-tts",
        voice: "shimmer",
        format: "mp3",
      });
    case "openai_compatible":
      return synthesizeOpenAiCompatible(text, config, {
        model: "tts-1",
        voice: "alloy",
        format: "mp3",
      });
    case "azure":
      return synthesizeAzure(text, config);
    default:
      throw new Error(`Unsupported TTS provider: ${config.provider}`);
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);

  if (request.method === "OPTIONS") {
    response.writeHead(200, createCorsHeaders());
    response.end(JSON.stringify({ ok: true }));
    return;
  }

  if (url.pathname === "/api/messages") {
    const clientId = url.searchParams.get("clientId");
    const type = url.searchParams.get("type") || "direct_send";

    if (!clientId) {
      sendJson(response, 400, { error: "Client ID is required" });
      return;
    }

    cleanupQueues();
    const queue = ensureQueue(clientId);

    if (request.method === "GET") {
      const messages = queue.messages;
      queue.messages = [];
      queue.lastAccessed = Date.now();
      sendJson(response, 200, { messages });
      return;
    }

    if (request.method === "POST") {
      let body = {};
      try {
        body = await readJsonBody(request);
      } catch (error) {
        sendJson(response, 400, { error: error.message });
        return;
      }

      if (!Array.isArray(body.messages) || body.messages.length === 0) {
        sendJson(response, 400, { error: "Messages array is required" });
        return;
      }

      for (const entry of body.messages) {
        const normalized = normalizeMessageEntry(entry, type);
        if (!normalized) {
          continue;
        }
        queue.messages.push(normalized);
      }

      queue.lastAccessed = Date.now();
      sendJson(response, 201, { ok: true, queued: queue.messages.length });
      return;
    }

    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  if (url.pathname === "/api/tts") {
    if (request.method !== "POST") {
      sendJson(response, 405, { error: "Method not allowed" });
      return;
    }

    let body = {};
    try {
      body = await readJsonBody(request);
    } catch (error) {
      sendJson(response, 400, { error: error.message });
      return;
    }

    const text = typeof body.text === "string" ? body.text.trim() : "";
    const config =
      body.config && typeof body.config === "object" && !Array.isArray(body.config)
        ? body.config
        : null;

    if (!text) {
      sendJson(response, 400, { error: "text is required" });
      return;
    }
    if (!config || typeof config.provider !== "string") {
      sendJson(response, 400, { error: "config.provider is required" });
      return;
    }

    try {
      const result = await synthesizeTts(text, config);
      sendAudio(response, 200, result.buffer, result.contentType);
    } catch (error) {
      sendJson(response, 502, { error: error.message || "TTS proxy failed" });
    }
    return;
  }

  sendJson(response, 404, { error: "Not found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(
    `Galge message API listening on http://127.0.0.1:${PORT}/api/messages and /api/tts`
  );
});
