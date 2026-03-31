CREATE TABLE IF NOT EXISTS conversation_map (
  conversation_key TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  conversation_id TEXT,
  turn_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  last_message_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conversation_map_guild_channel_user
  ON conversation_map (guild_id, channel_id, user_id);

CREATE TABLE IF NOT EXISTS user_profile_cache (
  conversation_key TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  nickname TEXT,
  relationship_stage TEXT NOT NULL DEFAULT 'new_friend',
  last_mood TEXT,
  favorite_topics TEXT NOT NULL DEFAULT '[]',
  akiba_mode INTEGER NOT NULL DEFAULT 0,
  turn_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_profile_cache_guild_channel_user
  ON user_profile_cache (guild_id, channel_id, user_id);

CREATE TABLE IF NOT EXISTS guild_settings (
  guild_id TEXT PRIMARY KEY,
  guild_name TEXT,
  allowed_channel_ids TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL
);
