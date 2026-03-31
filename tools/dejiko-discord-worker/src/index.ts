import {
  DiscordWebhookClient,
  InteractionResponseType,
  InteractionType,
  createDeferredResponse,
  createImmediateMessageResponse,
  getCommandName,
  getInteractionDisplayName,
  getInteractionUser,
  getStringOption,
  jsonResponse,
  verifyDiscordRequest,
  type DiscordApiClient,
  type DiscordApplicationCommandInteraction,
} from "./discord";
import { HttpDifyClient, type DifyClient } from "./dify";
import {
  D1Storage,
  makeConversationKey,
  type ConversationRecord,
  type Storage,
  type UserProfileRecord,
} from "./db";
import {
  DEFAULT_RELATIONSHIP_STAGE,
  DEJIKO_BUSY_FALLBACK,
  DEJIKO_ERROR_FALLBACK,
  DEJIKO_MAX_MESSAGE_LENGTH,
  deriveProfileSnapshot,
  formatProfileMessage,
  mergeProfileSnapshots,
  toUserProfileRecord,
  trimDiscordMessage,
} from "./persona";

export interface Env {
  ALLOWED_CHANNEL_IDS?: string;
  ALLOWED_GUILD_ID?: string;
  BOT_TIMEOUT_MS?: string;
  DB: D1Database;
  DIFY_API_BASE: string;
  DIFY_API_KEY: string;
  DISCORD_APPLICATION_ID: string;
  DISCORD_PUBLIC_KEY: string;
}

export interface ExecutionContextLike {
  waitUntil(promise: Promise<unknown>): void;
}

interface AppRuntime {
  allowedChannelIds: Set<string>;
  allowedGuildId: string | null;
  applicationId: string;
  dify: DifyClient;
  discord: DiscordApiClient;
  now: () => Date;
  publicKey: string;
  storage: Storage;
}

function parseAllowedChannelIds(value: string | undefined): Set<string> {
  if (!value) {
    return new Set<string>();
  }

  return new Set(
    value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0),
  );
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => `${item}`.trim())
      .filter((item) => item.length > 0);
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  return [];
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    if (value === "true" || value === "1") {
      return true;
    }
    if (value === "false" || value === "0") {
      return false;
    }
  }
  return undefined;
}

function isAllowedLocation(
  interaction: DiscordApplicationCommandInteraction,
  runtime: AppRuntime,
): boolean {
  if (!interaction.guild_id || !interaction.channel_id) {
    return false;
  }

  if (runtime.allowedGuildId && interaction.guild_id !== runtime.allowedGuildId) {
    return false;
  }

  if (runtime.allowedChannelIds.size === 0) {
    return true;
  }

  return runtime.allowedChannelIds.has(interaction.channel_id);
}

function buildUserIdentifier(interaction: DiscordApplicationCommandInteraction): string {
  const user = getInteractionUser(interaction);
  return `discord:${interaction.guild_id ?? "noguild"}:${user?.id ?? "unknown-user"}`;
}

function buildRuntime(env: Env): AppRuntime {
  const timeoutMs = Number.parseInt(env.BOT_TIMEOUT_MS ?? "25000", 10);
  const difyApiBase = env.DIFY_API_BASE?.trim() || "https://api.dify.ai/v1";
  return {
    allowedChannelIds: parseAllowedChannelIds(env.ALLOWED_CHANNEL_IDS),
    allowedGuildId: env.ALLOWED_GUILD_ID?.trim() || null,
    applicationId: env.DISCORD_APPLICATION_ID ?? "",
    dify: new HttpDifyClient(
      difyApiBase.replace(/\/+$/, ""),
      env.DIFY_API_KEY ?? "",
      Number.isFinite(timeoutMs) ? timeoutMs : 25000,
    ),
    discord: new DiscordWebhookClient(env.DISCORD_APPLICATION_ID ?? ""),
    now: () => new Date(),
    publicKey: env.DISCORD_PUBLIC_KEY ?? "",
    storage: new D1Storage(env.DB),
  };
}

function mergeProfileFromDify(
  variables: Record<string, unknown>,
): Partial<ReturnType<typeof deriveProfileSnapshot>> {
  return {
    akibaMode: asBoolean(variables.akiba_mode),
    favoriteTopics: asStringArray(variables.favorite_topics),
    lastMood: asNullableString(variables.last_mood),
    nickname: asNullableString(variables.nickname),
    relationshipStage: asNullableString(variables.relationship_stage) ?? undefined,
  };
}

async function syncGuildSnapshot(
  interaction: DiscordApplicationCommandInteraction,
  runtime: AppRuntime,
): Promise<void> {
  if (!interaction.guild_id) {
    return;
  }

  await runtime.storage.upsertGuildSettings({
    allowedChannelIds: Array.from(runtime.allowedChannelIds),
    guildId: interaction.guild_id,
    guildName: `guild:${interaction.guild_id}`,
    updatedAt: runtime.now().toISOString(),
  });
}

async function updateInteractionResponse(
  interaction: DiscordApplicationCommandInteraction,
  runtime: AppRuntime,
  payload: { content: string; ephemeral?: boolean },
): Promise<void> {
  try {
    await runtime.discord.editOriginalInteraction(interaction.token, payload);
  } catch (error) {
    console.warn("Failed to edit original Discord interaction, trying follow-up", {
      commandName: getCommandName(interaction),
      error: error instanceof Error ? error.message : String(error),
      interactionId: interaction.id,
    });
    await runtime.discord.createFollowupInteraction(interaction.token, payload);
  }
}

async function handleNewChat(
  interaction: DiscordApplicationCommandInteraction,
  runtime: AppRuntime,
): Promise<void> {
  const user = getInteractionUser(interaction);
  if (!user || !interaction.guild_id || !interaction.channel_id) {
    throw new Error("Interaction user or location is missing.");
  }

  const conversationKey = makeConversationKey({
    channelId: interaction.channel_id,
    guildId: interaction.guild_id,
    userId: user.id,
  });
  const previousConversation = await runtime.storage.getConversation(conversationKey);

  if (previousConversation?.conversationId) {
    try {
      await runtime.dify.deleteConversation(
        previousConversation.conversationId,
        buildUserIdentifier(interaction),
      );
    } catch (error) {
      console.warn("Failed to delete Dify conversation during /newchat", error);
    }
  }

  await runtime.storage.clearConversation(conversationKey);
  await runtime.storage.clearUserProfile(conversationKey);

  await updateInteractionResponse(interaction, runtime, {
    content: "会話をまっさらにしたにょ。最初から話すにょ。",
    ephemeral: true,
  });
}

async function handleProfile(
  interaction: DiscordApplicationCommandInteraction,
  runtime: AppRuntime,
): Promise<void> {
  const user = getInteractionUser(interaction);
  if (!user || !interaction.guild_id || !interaction.channel_id) {
    throw new Error("Interaction user or location is missing.");
  }

  const conversationKey = makeConversationKey({
    channelId: interaction.channel_id,
    guildId: interaction.guild_id,
    userId: user.id,
  });

  const profile = await runtime.storage.getUserProfile(conversationKey);
  await updateInteractionResponse(interaction, runtime, {
    content: formatProfileMessage(profile),
    ephemeral: true,
  });
}

async function handleDejiko(
  interaction: DiscordApplicationCommandInteraction,
  runtime: AppRuntime,
): Promise<void> {
  const user = getInteractionUser(interaction);
  const message = getStringOption(interaction, "message");
  if (!user || !interaction.guild_id || !interaction.channel_id || !message) {
    throw new Error("Required interaction data is missing.");
  }

  const conversationKey = makeConversationKey({
    channelId: interaction.channel_id,
    guildId: interaction.guild_id,
    userId: user.id,
  });
  const previousConversation = await runtime.storage.getConversation(conversationKey);
  const previousProfile = await runtime.storage.getUserProfile(conversationKey);
  const nextTurnCount = Math.max(previousConversation?.turnCount ?? 0, previousProfile?.turnCount ?? 0) + 1;
  const heuristicSnapshot = deriveProfileSnapshot(previousProfile, message, nextTurnCount);
  console.log("Starting /dejiko command", {
    conversationKey,
    hasPreviousConversation: Boolean(previousConversation?.conversationId),
    interactionId: interaction.id,
    userId: user.id,
  });
  const difyResult = await runtime.dify.sendChatMessage({
    conversationId: previousConversation?.conversationId ?? null,
    inputs: {
      channel_name: `channel:${interaction.channel_id}`,
      guild_name: `guild:${interaction.guild_id}`,
      relationship_stage_hint: heuristicSnapshot.relationshipStage || DEFAULT_RELATIONSHIP_STAGE,
      reply_surface: "slash",
      user_display_name: getInteractionDisplayName(interaction),
    },
    query: message,
    user: buildUserIdentifier(interaction),
  });
  console.log("Completed Dify response", {
    answerLength: difyResult.answer.length,
    conversationId: difyResult.conversationId,
    interactionId: interaction.id,
  });

  let mergedSnapshot = heuristicSnapshot;
  if (difyResult.conversationId) {
    try {
      const difyVariables = await runtime.dify.getConversationVariables(
        difyResult.conversationId,
        buildUserIdentifier(interaction),
      );
      mergedSnapshot = mergeProfileSnapshots(heuristicSnapshot, mergeProfileFromDify(difyVariables));
    } catch (error) {
      console.warn("Failed to read Dify conversation variables", error);
    }
  }

  const nowIso = runtime.now().toISOString();
  const conversationRecord: ConversationRecord = {
    channelId: interaction.channel_id,
    conversationId: difyResult.conversationId ?? previousConversation?.conversationId ?? null,
    conversationKey,
    createdAt: previousConversation?.createdAt ?? nowIso,
    guildId: interaction.guild_id,
    lastMessageAt: nowIso,
    turnCount: nextTurnCount,
    userId: user.id,
  };
  await runtime.storage.upsertConversation(conversationRecord);

  const profileRecord: UserProfileRecord = toUserProfileRecord(
    {
      channelId: interaction.channel_id,
      conversationKey,
      guildId: interaction.guild_id,
      userId: user.id,
    },
    mergedSnapshot,
    nowIso,
  );
  await runtime.storage.upsertUserProfile(profileRecord);

  await updateInteractionResponse(interaction, runtime, {
    content: trimDiscordMessage(difyResult.answer || DEJIKO_ERROR_FALLBACK),
  });
}

async function processCommand(
  interaction: DiscordApplicationCommandInteraction,
  runtime: AppRuntime,
): Promise<void> {
  try {
    await syncGuildSnapshot(interaction, runtime);

    const commandName = getCommandName(interaction);
    switch (commandName) {
      case "dejiko":
        await handleDejiko(interaction, runtime);
        return;
      case "newchat":
        await handleNewChat(interaction, runtime);
        return;
      case "profile":
        await handleProfile(interaction, runtime);
        return;
      default:
        await updateInteractionResponse(interaction, runtime, {
          content: "その呼び方はまだ覚えてないにょ。",
          ephemeral: true,
        });
    }
  } catch (error) {
    console.error("Failed to process Discord interaction", error);
    const commandName = getCommandName(interaction);
    const fallback = commandName === "dejiko" ? DEJIKO_BUSY_FALLBACK : DEJIKO_ERROR_FALLBACK;
    try {
      await updateInteractionResponse(interaction, runtime, {
        content: fallback,
        ephemeral: commandName !== "dejiko",
      });
    } catch (editError) {
      console.error("Failed to write fallback Discord response", editError);
    }
  }
}

export function createApp(runtime: AppRuntime) {
  return {
    async fetch(request: Request, ctx: ExecutionContextLike): Promise<Response> {
      const url = new URL(request.url);

      if (request.method === "GET" && url.pathname === "/health") {
        return jsonResponse({
          ok: true,
          service: "dejiko-discord-worker",
          timestamp: runtime.now().toISOString(),
        });
      }

      if (request.method !== "POST" || url.pathname !== "/discord/interactions") {
        return jsonResponse({ error: "Not found" }, 404);
      }

      const { bodyText, isValid } = await verifyDiscordRequest(request, runtime.publicKey);
      if (!isValid) {
        return jsonResponse({ error: "Invalid request signature" }, 401);
      }

      const interaction = JSON.parse(bodyText) as DiscordApplicationCommandInteraction;
      if (interaction.type === InteractionType.Ping) {
        return jsonResponse({ type: InteractionResponseType.Pong });
      }

      if (interaction.type !== InteractionType.ApplicationCommand) {
        return jsonResponse(createImmediateMessageResponse("その呼び方は受け付けてないにょ。"), 400);
      }

      if (!isAllowedLocation(interaction, runtime)) {
        return jsonResponse(
          createImmediateMessageResponse("ここじゃまだ話さないにょ。指定チャンネルで呼ぶにょ。"),
        );
      }

      const commandName = getCommandName(interaction);
      if (!commandName) {
        return jsonResponse(createImmediateMessageResponse("コマンド名が見えないにょ。"), 400);
      }

      if (commandName === "dejiko") {
        const message = getStringOption(interaction, "message")?.trim();
        if (!message) {
          return jsonResponse(createImmediateMessageResponse("話しかける文を入れるにょ。"));
        }
        if (message.length > DEJIKO_MAX_MESSAGE_LENGTH) {
          return jsonResponse(
            createImmediateMessageResponse(
              `長すぎるにょ。${DEJIKO_MAX_MESSAGE_LENGTH}文字以内で頼むにょ。`,
            ),
          );
        }
      }

      const ephemeral = commandName !== "dejiko";
      ctx.waitUntil(processCommand(interaction, runtime));
      return jsonResponse(createDeferredResponse(ephemeral));
    },
  };
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContextLike): Promise<Response> {
    return createApp(buildRuntime(env)).fetch(request, ctx);
  },
};
