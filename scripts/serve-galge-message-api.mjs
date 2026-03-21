import { createServer } from "node:http";

const PORT = Number(process.env.GALGE_MESSAGE_API_PORT || 8182);
const CLIENT_TIMEOUT = 1000 * 60 * 5;
const messageQueues = new Map();

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  response.end(JSON.stringify(body));
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

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);

  if (request.method === "OPTIONS") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (url.pathname !== "/api/messages") {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

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
    const chunks = [];
    for await (const chunk of request) {
      chunks.push(chunk);
    }

    let body = {};
    try {
      body = chunks.length > 0 ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
    } catch (error) {
      sendJson(response, 400, { error: "Invalid JSON body" });
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
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Galge message API listening on http://127.0.0.1:${PORT}/api/messages`);
});
