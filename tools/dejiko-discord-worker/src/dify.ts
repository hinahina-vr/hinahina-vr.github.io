export interface DifyChatRequest {
  conversationId?: string | null;
  inputs: Record<string, string>;
  query: string;
  user: string;
}

export interface DifyChatResult {
  answer: string;
  conversationId: string | null;
  messageId: string | null;
}

export interface DifyClient {
  deleteConversation(conversationId: string, user: string): Promise<void>;
  getConversationVariables(conversationId: string, user: string): Promise<Record<string, unknown>>;
  sendChatMessage(request: DifyChatRequest): Promise<DifyChatResult>;
}

interface DifyChatResponsePayload {
  answer?: string;
  conversation_id?: string;
  message_id?: string;
}

interface DifyConversationVariableItem {
  name: string;
  value: unknown;
}

interface DifyConversationVariableResponse {
  data?: DifyConversationVariableItem[];
}

function normaliseValue(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (
    (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
    (trimmed.startsWith("{") && trimmed.endsWith("}"))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  return value;
}

async function readErrorMessage(response: Response): Promise<string> {
  const body = await response.text();
  return body || `${response.status} ${response.statusText}`;
}

function createTimeoutError(timeoutMs: number): Error {
  return new Error(`Dify request timed out after ${timeoutMs}ms`);
}

export class HttpDifyClient implements DifyClient {
  constructor(
    private readonly apiBase: string,
    private readonly apiKey: string,
    private readonly timeoutMs: number,
    private readonly fetchImpl: typeof fetch = (...args) => fetch(...args),
  ) {}

  private async fetchWithTimeout(input: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    try {
      return await new Promise<Response>((resolve, reject) => {
        timeoutHandle = setTimeout(() => {
          controller.abort("timeout");
          reject(createTimeoutError(this.timeoutMs));
        }, this.timeoutMs);

        this.fetchImpl(input, {
          ...init,
          signal: controller.signal,
        }).then(resolve, reject);
      });
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  async deleteConversation(conversationId: string, user: string): Promise<void> {
    const response = await this.fetchWithTimeout(`${this.apiBase}/conversations/${conversationId}`, {
      body: JSON.stringify({ user }),
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      method: "DELETE",
    });

    if (response.status === 404 || response.status === 204) {
      return;
    }

    if (!response.ok) {
      throw new Error(`Failed to delete Dify conversation: ${await readErrorMessage(response)}`);
    }
  }

  async getConversationVariables(conversationId: string, user: string): Promise<Record<string, unknown>> {
    const url = new URL(`${this.apiBase}/conversations/${conversationId}/variables`);
    url.searchParams.set("user", user);
    url.searchParams.set("limit", "100");

    const response = await this.fetchWithTimeout(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Dify conversation variables: ${await readErrorMessage(response)}`);
    }

    const payload = (await response.json()) as DifyConversationVariableResponse;
    const variables: Record<string, unknown> = {};
    for (const item of payload.data ?? []) {
      variables[item.name] = normaliseValue(item.value);
    }
    return variables;
  }

  async sendChatMessage(request: DifyChatRequest): Promise<DifyChatResult> {
    const response = await this.fetchWithTimeout(`${this.apiBase}/chat-messages`, {
      body: JSON.stringify({
        auto_generate_name: false,
        conversation_id: request.conversationId ?? undefined,
        inputs: request.inputs,
        query: request.query,
        response_mode: "blocking",
        user: request.user,
      }),
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Failed to send Dify chat message: ${await readErrorMessage(response)}`);
    }

    const payload = (await response.json()) as DifyChatResponsePayload;
    return {
      answer: payload.answer?.trim() || "",
      conversationId: payload.conversation_id ?? request.conversationId ?? null,
      messageId: payload.message_id ?? null,
    };
  }
}
