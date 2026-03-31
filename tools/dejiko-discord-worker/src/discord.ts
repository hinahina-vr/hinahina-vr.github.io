import nacl from "tweetnacl";

export interface DiscordUser {
  global_name?: string | null;
  id: string;
  username: string;
}

export interface DiscordInteractionMember {
  nick?: string | null;
  user?: DiscordUser;
}

export interface DiscordApplicationCommandInteraction {
  application_id: string;
  channel_id?: string;
  data?: {
    name?: string;
    options?: Array<{
      name: string;
      type: number;
      value?: string;
    }>;
  };
  guild_id?: string;
  id: string;
  member?: DiscordInteractionMember;
  token: string;
  type: number;
  user?: DiscordUser;
}

export interface DiscordApiClient {
  editOriginalInteraction(
    interactionToken: string,
    payload: { content: string; ephemeral?: boolean },
  ): Promise<void>;
}

export interface DiscordCommandDefinition {
  description: string;
  name: string;
  options?: Array<{
    description: string;
    max_length?: number;
    name: string;
    required?: boolean;
    type: number;
  }>;
}

const DISCORD_API_BASE = "https://discord.com/api/v10";
const EPHEMERAL_FLAG = 1 << 6;

export const InteractionType = {
  ApplicationCommand: 2,
  Ping: 1,
} as const;

export const InteractionResponseType = {
  ChannelMessageWithSource: 4,
  DeferredChannelMessageWithSource: 5,
  Pong: 1,
} as const;

export const COMMAND_DEFINITIONS: DiscordCommandDefinition[] = [
  {
    description: "でじこに話しかける",
    name: "dejiko",
    options: [
      {
        description: "でじこへのメッセージ",
        max_length: 1000,
        name: "message",
        required: true,
        type: 3,
      },
    ],
  },
  {
    description: "でじことの会話を最初からやり直す",
    name: "newchat",
  },
  {
    description: "でじこが覚えているプロフィールを見る",
    name: "profile",
  },
];

function hexToUint8Array(input: string): Uint8Array {
  const bytes = new Uint8Array(input.length / 2);
  for (let index = 0; index < input.length; index += 2) {
    bytes[index / 2] = Number.parseInt(input.slice(index, index + 2), 16);
  }
  return bytes;
}

export async function verifyDiscordRequest(
  request: Request,
  publicKey: string,
): Promise<{ bodyText: string; isValid: boolean }> {
  const signature = request.headers.get("X-Signature-Ed25519");
  const timestamp = request.headers.get("X-Signature-Timestamp");
  const bodyText = await request.clone().text();

  if (!signature || !timestamp || !publicKey) {
    return { bodyText, isValid: false };
  }

  const messageBytes = new TextEncoder().encode(`${timestamp}${bodyText}`);
  const signatureBytes = hexToUint8Array(signature);
  const publicKeyBytes = hexToUint8Array(publicKey);

  return {
    bodyText,
    isValid: nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes),
  };
}

export function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json",
    },
    status,
  });
}

export function createDeferredResponse(ephemeral: boolean): Record<string, unknown> {
  return {
    data: ephemeral ? { flags: EPHEMERAL_FLAG } : {},
    type: InteractionResponseType.DeferredChannelMessageWithSource,
  };
}

export function createImmediateMessageResponse(
  content: string,
  ephemeral = true,
): Record<string, unknown> {
  return {
    data: {
      allowed_mentions: { parse: [] },
      content,
      ...(ephemeral ? { flags: EPHEMERAL_FLAG } : {}),
    },
    type: InteractionResponseType.ChannelMessageWithSource,
  };
}

export function getCommandName(interaction: DiscordApplicationCommandInteraction): string | null {
  return interaction.data?.name ?? null;
}

export function getInteractionUser(interaction: DiscordApplicationCommandInteraction): DiscordUser | null {
  return interaction.member?.user ?? interaction.user ?? null;
}

export function getInteractionDisplayName(interaction: DiscordApplicationCommandInteraction): string {
  return (
    interaction.member?.nick ??
    getInteractionUser(interaction)?.global_name ??
    getInteractionUser(interaction)?.username ??
    "unknown-user"
  );
}

export function getStringOption(
  interaction: DiscordApplicationCommandInteraction,
  optionName: string,
): string | null {
  const option = interaction.data?.options?.find((candidate) => candidate.name === optionName);
  return typeof option?.value === "string" ? option.value : null;
}

export class DiscordWebhookClient implements DiscordApiClient {
  constructor(
    private readonly applicationId: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async editOriginalInteraction(
    interactionToken: string,
    payload: { content: string; ephemeral?: boolean },
  ): Promise<void> {
    const response = await this.fetchImpl(
      `${DISCORD_API_BASE}/webhooks/${this.applicationId}/${interactionToken}/messages/@original`,
      {
        body: JSON.stringify({
          allowed_mentions: { parse: [] },
          content: payload.content,
          ...(payload.ephemeral ? { flags: EPHEMERAL_FLAG } : {}),
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to edit original Discord interaction: ${response.status} ${response.statusText}`);
    }
  }
}
