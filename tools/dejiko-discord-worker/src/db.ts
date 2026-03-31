export interface ConversationKeyParts {
  channelId: string;
  guildId: string;
  userId: string;
}

export interface ConversationRecord extends ConversationKeyParts {
  conversationId: string | null;
  conversationKey: string;
  createdAt: string;
  lastMessageAt: string;
  turnCount: number;
}

export interface UserProfileRecord extends ConversationKeyParts {
  akibaMode: boolean;
  conversationKey: string;
  favoriteTopics: string[];
  lastMood: string | null;
  nickname: string | null;
  relationshipStage: string;
  turnCount: number;
  updatedAt: string;
}

export interface GuildSettingsRecord {
  allowedChannelIds: string[];
  guildId: string;
  guildName: string | null;
  updatedAt: string;
}

export interface Storage {
  clearConversation(conversationKey: string): Promise<void>;
  clearUserProfile(conversationKey: string): Promise<void>;
  getConversation(conversationKey: string): Promise<ConversationRecord | null>;
  getUserProfile(conversationKey: string): Promise<UserProfileRecord | null>;
  upsertConversation(record: ConversationRecord): Promise<void>;
  upsertGuildSettings(record: GuildSettingsRecord): Promise<void>;
  upsertUserProfile(record: UserProfileRecord): Promise<void>;
}

interface ConversationRow {
  channel_id: string;
  conversation_id: string | null;
  conversation_key: string;
  created_at: string;
  guild_id: string;
  last_message_at: string;
  turn_count: number;
  user_id: string;
}

interface UserProfileRow {
  akiba_mode: number;
  channel_id: string;
  conversation_key: string;
  favorite_topics: string;
  guild_id: string;
  last_mood: string | null;
  nickname: string | null;
  relationship_stage: string;
  turn_count: number;
  updated_at: string;
  user_id: string;
}

export function makeConversationKey(parts: ConversationKeyParts): string {
  return [parts.guildId, parts.channelId, parts.userId].join(":");
}

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => `${item}`.trim())
        .filter((item) => item.length > 0);
    }
  } catch {
    return [];
  }

  return [];
}

function serialiseTopics(topics: string[]): string {
  return JSON.stringify(
    Array.from(new Set(topics.map((topic) => topic.trim()).filter((topic) => topic.length > 0))),
  );
}

function mapConversationRow(row: ConversationRow): ConversationRecord {
  return {
    channelId: row.channel_id,
    conversationId: row.conversation_id,
    conversationKey: row.conversation_key,
    createdAt: row.created_at,
    guildId: row.guild_id,
    lastMessageAt: row.last_message_at,
    turnCount: Number(row.turn_count ?? 0),
    userId: row.user_id,
  };
}

function mapUserProfileRow(row: UserProfileRow): UserProfileRecord {
  return {
    akibaMode: Boolean(row.akiba_mode),
    channelId: row.channel_id,
    conversationKey: row.conversation_key,
    favoriteTopics: parseJsonArray(row.favorite_topics),
    guildId: row.guild_id,
    lastMood: row.last_mood,
    nickname: row.nickname,
    relationshipStage: row.relationship_stage,
    turnCount: Number(row.turn_count ?? 0),
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

export class D1Storage implements Storage {
  constructor(private readonly db: D1Database) {}

  async clearConversation(conversationKey: string): Promise<void> {
    await this.db
      .prepare("DELETE FROM conversation_map WHERE conversation_key = ?1")
      .bind(conversationKey)
      .run();
  }

  async clearUserProfile(conversationKey: string): Promise<void> {
    await this.db
      .prepare("DELETE FROM user_profile_cache WHERE conversation_key = ?1")
      .bind(conversationKey)
      .run();
  }

  async getConversation(conversationKey: string): Promise<ConversationRecord | null> {
    const row = await this.db
      .prepare(
        `SELECT conversation_key, guild_id, channel_id, user_id, conversation_id, turn_count, created_at, last_message_at
         FROM conversation_map
         WHERE conversation_key = ?1`,
      )
      .bind(conversationKey)
      .first<ConversationRow>();

    return row ? mapConversationRow(row) : null;
  }

  async getUserProfile(conversationKey: string): Promise<UserProfileRecord | null> {
    const row = await this.db
      .prepare(
        `SELECT conversation_key, guild_id, channel_id, user_id, nickname, relationship_stage, last_mood, favorite_topics, akiba_mode, turn_count, updated_at
         FROM user_profile_cache
         WHERE conversation_key = ?1`,
      )
      .bind(conversationKey)
      .first<UserProfileRow>();

    return row ? mapUserProfileRow(row) : null;
  }

  async upsertConversation(record: ConversationRecord): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO conversation_map (
           conversation_key,
           guild_id,
           channel_id,
           user_id,
           conversation_id,
           turn_count,
           created_at,
           last_message_at
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
         ON CONFLICT(conversation_key) DO UPDATE SET
           guild_id = excluded.guild_id,
           channel_id = excluded.channel_id,
           user_id = excluded.user_id,
           conversation_id = excluded.conversation_id,
           turn_count = excluded.turn_count,
           last_message_at = excluded.last_message_at`,
      )
      .bind(
        record.conversationKey,
        record.guildId,
        record.channelId,
        record.userId,
        record.conversationId,
        record.turnCount,
        record.createdAt,
        record.lastMessageAt,
      )
      .run();
  }

  async upsertGuildSettings(record: GuildSettingsRecord): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO guild_settings (
           guild_id,
           guild_name,
           allowed_channel_ids,
           updated_at
         ) VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(guild_id) DO UPDATE SET
           guild_name = excluded.guild_name,
           allowed_channel_ids = excluded.allowed_channel_ids,
           updated_at = excluded.updated_at`,
      )
      .bind(
        record.guildId,
        record.guildName,
        JSON.stringify(record.allowedChannelIds),
        record.updatedAt,
      )
      .run();
  }

  async upsertUserProfile(record: UserProfileRecord): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO user_profile_cache (
           conversation_key,
           guild_id,
           channel_id,
           user_id,
           nickname,
           relationship_stage,
           last_mood,
           favorite_topics,
           akiba_mode,
           turn_count,
           updated_at
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
         ON CONFLICT(conversation_key) DO UPDATE SET
           guild_id = excluded.guild_id,
           channel_id = excluded.channel_id,
           user_id = excluded.user_id,
           nickname = excluded.nickname,
           relationship_stage = excluded.relationship_stage,
           last_mood = excluded.last_mood,
           favorite_topics = excluded.favorite_topics,
           akiba_mode = excluded.akiba_mode,
           turn_count = excluded.turn_count,
           updated_at = excluded.updated_at`,
      )
      .bind(
        record.conversationKey,
        record.guildId,
        record.channelId,
        record.userId,
        record.nickname,
        record.relationshipStage,
        record.lastMood,
        serialiseTopics(record.favoriteTopics),
        record.akibaMode ? 1 : 0,
        record.turnCount,
        record.updatedAt,
      )
      .run();
  }
}

export class MemoryStorage implements Storage {
  private readonly conversations = new Map<string, ConversationRecord>();
  private readonly guilds = new Map<string, GuildSettingsRecord>();
  private readonly profiles = new Map<string, UserProfileRecord>();

  async clearConversation(conversationKey: string): Promise<void> {
    this.conversations.delete(conversationKey);
  }

  async clearUserProfile(conversationKey: string): Promise<void> {
    this.profiles.delete(conversationKey);
  }

  async getConversation(conversationKey: string): Promise<ConversationRecord | null> {
    return this.conversations.get(conversationKey) ?? null;
  }

  async getUserProfile(conversationKey: string): Promise<UserProfileRecord | null> {
    return this.profiles.get(conversationKey) ?? null;
  }

  async upsertConversation(record: ConversationRecord): Promise<void> {
    this.conversations.set(record.conversationKey, { ...record });
  }

  async upsertGuildSettings(record: GuildSettingsRecord): Promise<void> {
    this.guilds.set(record.guildId, { ...record });
  }

  async upsertUserProfile(record: UserProfileRecord): Promise<void> {
    this.profiles.set(record.conversationKey, {
      ...record,
      favoriteTopics: [...record.favoriteTopics],
    });
  }
}
