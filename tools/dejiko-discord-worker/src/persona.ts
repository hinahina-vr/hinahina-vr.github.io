import type { UserProfileRecord } from "./db";

export const DEFAULT_RELATIONSHIP_STAGE = "new_friend";
export const DEJIKO_BUSY_FALLBACK = "今ちょっと立て込んでるにょ。もう一回言うにょ。";
export const DEJIKO_ERROR_FALLBACK = "いま少し機嫌と回線が悪いにょ。ちょっとしてからまた来るにょ。";
export const DEJIKO_MAX_MESSAGE_LENGTH = 1000;

const FAVORITE_TOPIC_HINTS: Array<{ keyword: RegExp; topic: string }> = [
  { keyword: /秋葉原|アキバ|akiba/i, topic: "秋葉原" },
  { keyword: /ゲーマーズ|gamers/i, topic: "ゲーマーズ" },
  { keyword: /プリン|pudding/i, topic: "プリン" },
  { keyword: /ブロッコリー|broccoli/i, topic: "ブロッコリー" },
  { keyword: /ゲーム|げーむ|game/i, topic: "ゲーム" },
];

const MOOD_HINTS: Array<{ keyword: RegExp; mood: string }> = [
  { keyword: /うれし|楽しい|最高|好き|ありがと/i, mood: "ごきげん" },
  { keyword: /かなしい|寂しい|つらい|しんどい|疲れた/i, mood: "しょんぼり" },
  { keyword: /怒|むかつ|イライラ|腹立/i, mood: "ぷんすか" },
  { keyword: /眠い|ねむい|おやすみ/i, mood: "ねむねむ" },
];

export interface ProfileSnapshot {
  akibaMode: boolean;
  favoriteTopics: string[];
  lastMood: string | null;
  nickname: string | null;
  relationshipStage: string;
  turnCount: number;
}

function uniqueTopics(topics: string[]): string[] {
  return Array.from(new Set(topics.map((topic) => topic.trim()).filter(Boolean)));
}

function stageFromTurnCount(turnCount: number): string {
  if (turnCount >= 7) {
    return "special";
  }
  if (turnCount >= 4) {
    return "regular";
  }
  if (turnCount >= 2) {
    return "familiar";
  }
  return DEFAULT_RELATIONSHIP_STAGE;
}

function stageLabel(stage: string): string {
  switch (stage) {
    case "familiar":
      return "顔見知り";
    case "regular":
      return "よく来るやつ";
    case "special":
      return "ちょっと特別";
    case DEFAULT_RELATIONSHIP_STAGE:
    default:
      return "まだ様子見";
  }
}

export function deriveProfileSnapshot(
  existingProfile: UserProfileRecord | null,
  message: string,
  nextTurnCount: number,
): ProfileSnapshot {
  const favoriteTopics = uniqueTopics([
    ...(existingProfile?.favoriteTopics ?? []),
    ...FAVORITE_TOPIC_HINTS.filter((entry) => entry.keyword.test(message)).map((entry) => entry.topic),
  ]);

  const mood =
    MOOD_HINTS.find((entry) => entry.keyword.test(message))?.mood ?? existingProfile?.lastMood ?? null;
  const akibaMode =
    existingProfile?.akibaMode === true ||
    /秋葉原|アキバ|ゲーマーズ|プリン|broccoli|ブロッコリー/i.test(message);

  return {
    akibaMode,
    favoriteTopics,
    lastMood: mood,
    nickname: existingProfile?.nickname ?? null,
    relationshipStage: existingProfile?.relationshipStage || stageFromTurnCount(nextTurnCount),
    turnCount: nextTurnCount,
  };
}

export function mergeProfileSnapshots(
  base: ProfileSnapshot,
  fromDify: Partial<ProfileSnapshot>,
): ProfileSnapshot {
  return {
    akibaMode: fromDify.akibaMode ?? base.akibaMode,
    favoriteTopics: uniqueTopics(fromDify.favoriteTopics ?? base.favoriteTopics),
    lastMood: fromDify.lastMood ?? base.lastMood,
    nickname: fromDify.nickname ?? base.nickname,
    relationshipStage: fromDify.relationshipStage ?? base.relationshipStage,
    turnCount: fromDify.turnCount ?? base.turnCount,
  };
}

export function formatProfileMessage(profile: UserProfileRecord | null): string {
  if (!profile) {
    return [
      "でじこのメモはまだ薄いにょ。",
      "呼び方: まだ決めてないにょ",
      `距離感: ${stageLabel(DEFAULT_RELATIONSHIP_STAGE)}`,
      "最近のノリ: まだ観測中にょ",
      "好きそうな話題: まだ少ないにょ",
    ].join("\n");
  }

  return [
    "でじこのメモにょ。",
    `呼び方: ${profile.nickname ?? "まだ決めてないにょ"}`,
    `距離感: ${stageLabel(profile.relationshipStage)}`,
    `最近のノリ: ${profile.lastMood ?? "ふつう"}`,
    `好きそうな話題: ${profile.favoriteTopics.length > 0 ? profile.favoriteTopics.join(" / ") : "まだ少ないにょ"}`,
    `アキバ熱: ${profile.akibaMode ? "上がり気味にょ" : "平常運転にょ"}`,
  ].join("\n");
}

export function toUserProfileRecord(
  base: Omit<
    UserProfileRecord,
    "akibaMode" | "favoriteTopics" | "lastMood" | "nickname" | "relationshipStage" | "turnCount" | "updatedAt"
  >,
  snapshot: ProfileSnapshot,
  updatedAt: string,
): UserProfileRecord {
  return {
    ...base,
    akibaMode: snapshot.akibaMode,
    favoriteTopics: snapshot.favoriteTopics,
    lastMood: snapshot.lastMood,
    nickname: snapshot.nickname,
    relationshipStage: snapshot.relationshipStage,
    turnCount: snapshot.turnCount,
    updatedAt,
  };
}

export function trimDiscordMessage(content: string, limit = 1900): string {
  if (content.length <= limit) {
    return content;
  }

  return `${content.slice(0, limit - 1).trimEnd()}…`;
}
