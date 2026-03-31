import nacl from "tweetnacl";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/index";
import { MemoryStorage, makeConversationKey } from "../src/db";
import type { DifyChatRequest, DifyChatResult, DifyClient } from "../src/dify";
import type { DiscordApiClient } from "../src/discord";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function signInteraction(body: string, timestamp: string, secretKey: Uint8Array): string {
  const message = new TextEncoder().encode(`${timestamp}${body}`);
  return toHex(nacl.sign.detached(message, secretKey));
}

function buildSignedRequest(body: Record<string, unknown>, secretKey: Uint8Array): Request {
  const timestamp = "1711900000";
  const payload = JSON.stringify(body);
  const signature = signInteraction(payload, timestamp, secretKey);
  return new Request("https://example.com/discord/interactions", {
    body: payload,
    headers: {
      "Content-Type": "application/json",
      "X-Signature-Ed25519": signature,
      "X-Signature-Timestamp": timestamp,
    },
    method: "POST",
  });
}

class StubDifyClient implements DifyClient {
  public readonly deleted: Array<{ conversationId: string; user: string }> = [];
  public readonly requests: DifyChatRequest[] = [];
  public shouldFail = false;

  async deleteConversation(conversationId: string, user: string): Promise<void> {
    this.deleted.push({ conversationId, user });
  }

  async getConversationVariables(): Promise<Record<string, unknown>> {
    return {
      akiba_mode: "true",
      favorite_topics: ["プリン", "秋葉原"],
      last_mood: "ごきげん",
      relationship_stage: "familiar",
    };
  }

  async sendChatMessage(request: DifyChatRequest): Promise<DifyChatResult> {
    this.requests.push(request);
    if (this.shouldFail) {
      throw new Error("boom");
    }

    return {
      answer: "べ、別に待ってたわけじゃないにょ。まあ、話すくらいなら付き合うにょ。",
      conversationId: request.conversationId ?? "conv-1",
      messageId: "msg-1",
    };
  }
}

class StubDiscordClient implements DiscordApiClient {
  public readonly edits: Array<{ content: string; ephemeral?: boolean; interactionToken: string }> = [];

  async editOriginalInteraction(
    interactionToken: string,
    payload: { content: string; ephemeral?: boolean },
  ): Promise<void> {
    this.edits.push({ interactionToken, ...payload });
  }
}

function createExecutionContext() {
  const tasks: Promise<unknown>[] = [];

  return {
    async drain(): Promise<void> {
      await Promise.all(tasks);
    },
    waitUntil(promise: Promise<unknown>): void {
      tasks.push(promise);
    },
  };
}

function createRuntime(stubDify: StubDifyClient, stubDiscord: StubDiscordClient) {
  const keyPair = nacl.sign.keyPair();
  return {
    app: createApp({
      allowedChannelIds: new Set(["channel-1"]),
      allowedGuildId: "guild-1",
      applicationId: "app-1",
      dify: stubDify,
      discord: stubDiscord,
      now: () => new Date("2026-03-31T00:00:00.000Z"),
      publicKey: toHex(keyPair.publicKey),
      storage: new MemoryStorage(),
    }),
    keyPair,
  };
}

describe("worker interactions", () => {
  it("answers Discord ping requests immediately", async () => {
    const dify = new StubDifyClient();
    const discord = new StubDiscordClient();
    const { app, keyPair } = createRuntime(dify, discord);
    const ctx = createExecutionContext();

    const response = await app.fetch(buildSignedRequest({ type: 1 }, keyPair.secretKey), ctx);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ type: 1 });
  });

  it("defers /dejiko and stores conversation state", async () => {
    const dify = new StubDifyClient();
    const discord = new StubDiscordClient();
    const { app, keyPair } = createRuntime(dify, discord);
    const ctx = createExecutionContext();

    const body = {
      application_id: "app-1",
      channel_id: "channel-1",
      data: {
        name: "dejiko",
        options: [{ name: "message", type: 3, value: "秋葉原でプリン食べたい" }],
      },
      guild_id: "guild-1",
      id: "interaction-1",
      member: {
        nick: "alice",
        user: { id: "user-1", username: "alice" },
      },
      token: "token-1",
      type: 2,
    };

    const response = await app.fetch(buildSignedRequest(body, keyPair.secretKey), ctx);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: {}, type: 5 });

    await ctx.drain();

    expect(dify.requests).toHaveLength(1);
    expect(dify.requests[0]?.inputs.relationship_stage_hint).toBe("new_friend");
    expect(discord.edits[0]?.content).toContain("付き合う");
  });

  it("clears stored conversation on /newchat", async () => {
    const dify = new StubDifyClient();
    const discord = new StubDiscordClient();
    const { app, keyPair } = createRuntime(dify, discord);
    const ctx1 = createExecutionContext();

    const dejikoInteraction = {
      application_id: "app-1",
      channel_id: "channel-1",
      data: {
        name: "dejiko",
        options: [{ name: "message", type: 3, value: "プリンは正義？" }],
      },
      guild_id: "guild-1",
      id: "interaction-2",
      member: {
        user: { id: "user-1", username: "alice" },
      },
      token: "token-2",
      type: 2,
    };

    await app.fetch(buildSignedRequest(dejikoInteraction, keyPair.secretKey), ctx1);
    await ctx1.drain();

    const ctx2 = createExecutionContext();
    const newChatInteraction = {
      application_id: "app-1",
      channel_id: "channel-1",
      data: { name: "newchat" },
      guild_id: "guild-1",
      id: "interaction-3",
      member: {
        user: { id: "user-1", username: "alice" },
      },
      token: "token-3",
      type: 2,
    };

    const response = await app.fetch(buildSignedRequest(newChatInteraction, keyPair.secretKey), ctx2);
    expect(response.status).toBe(200);
    await ctx2.drain();

    expect(discord.edits.at(-1)?.content).toContain("まっさらにした");
    expect(dify.deleted).toEqual([{ conversationId: "conv-1", user: "discord:guild-1:user-1" }]);
  });

  it("falls back cleanly when Dify errors", async () => {
    const dify = new StubDifyClient();
    dify.shouldFail = true;
    const discord = new StubDiscordClient();
    const { app, keyPair } = createRuntime(dify, discord);
    const ctx = createExecutionContext();

    const body = {
      application_id: "app-1",
      channel_id: "channel-1",
      data: {
        name: "dejiko",
        options: [{ name: "message", type: 3, value: "なんか返して" }],
      },
      guild_id: "guild-1",
      id: "interaction-4",
      member: {
        user: { id: "user-1", username: "alice" },
      },
      token: "token-4",
      type: 2,
    };

    await app.fetch(buildSignedRequest(body, keyPair.secretKey), ctx);
    await ctx.drain();

    expect(discord.edits.at(-1)?.content).toContain("今ちょっと立て込んでるにょ");
  });
});
