import { access, mkdir, readdir, readFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import {
  buildHealthCandidateTopics,
  mergeHealthConfig,
  renderHealthSourceLines,
} from "./health-context.mjs";

export const ROOT_DIR = join(import.meta.dirname, "..", "..");
export const DIARY_DIR = join(ROOT_DIR, "diary");
export const LOCAL_DIR = join(ROOT_DIR, ".local");
export const AUTH_DIR = join(LOCAL_DIR, "auth");
export const CHROME_DEBUG_PROFILE_DIR = join(AUTH_DIR, "chrome-debug-profile");
export const DAILY_CONTEXT_DIR = join(LOCAL_DIR, "daily-context");
export const RAW_DIR = join(DAILY_CONTEXT_DIR, "raw");
export const DEBUG_DIR = join(DAILY_CONTEXT_DIR, "debug");
export const CONFIG_PATH = join(ROOT_DIR, "daily-context.config.json");
export const DEFAULT_CHROME_EXECUTABLE_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
export const DEFAULT_BROWSER_DEBUG_URL = "http://127.0.0.1:9222";

export const DAILY_CONTEXT_START = "<!-- daily-context:start -->";
export const DAILY_CONTEXT_END = "<!-- daily-context:end -->";
export const BUNGOU_STYLE_START = "<!-- bungou-style:start -->";
export const BUNGOU_STYLE_END = "<!-- bungou-style:end -->";

const DAILY_CONTEXT_BLOCK_RE = /\n?<!-- daily-context:start -->[\s\S]*?<!-- daily-context:end -->\n?/g;
const BUNGOU_STYLE_BLOCK_RE = /\n?<!-- bungou-style:start -->[\s\S]*?<!-- bungou-style:end -->\n?/g;
const BUNGOU_STYLE_ROUND_ROBIN_START_DATE = "2026-02-23";
const DAY_MS = 24 * 60 * 60 * 1000;

const BUNGOU_STYLE_CATALOG = [
  {
    key: "murakami",
    label: "村上春樹",
    school: "冷静塾",
    defaultReason: "日常の観察を少し引いた場所から拾いやすい",
    notes: [
      "短文主体で、乾いた観察を静かに積む",
      "比喩は遠くから持ってきて、断定は静かに置く",
    ],
    signals: [
      { keywords: ["日常", "観察", "朝", "夜", "静か", "コーヒー", "散歩", "音楽"], score: 2, reason: "日常の観察を引いた距離から書きやすい" },
    ],
  },
  {
    key: "mukouda",
    label: "向田邦子",
    school: "冷静塾",
    defaultReason: "食卓や季節の小さな機微で感情を受けられる",
    notes: [
      "食べ物や部屋の細部から、その日の感情を受ける",
      "大げさにせず、最後に少しだけ切なさを残す",
    ],
    signals: [
      { keywords: ["食卓", "台所", "家族", "夕飯", "朝ごはん", "味噌汁", "鍋", "弁当", "卵", "季節"], score: 3, reason: "家庭や食卓の細部で書くのに向いている" },
    ],
  },
  {
    key: "kaiko",
    label: "開高健",
    school: "激情塾",
    defaultReason: "酒・食・旅行・肉体の圧を五感で押し込める",
    notes: [
      "長文がうねる勢いで、五感と臓器の反応を前に出す",
      "曖昧な形容詞は避け、酒や汗や移動の手触りで押す",
    ],
    signals: [
      { keywords: ["酒", "ハイボール", "ウイスキー", "魚", "肉", "居酒屋", "立ち飲み", "焼肉", "旅", "駅", "宿", "巡礼", "休暇", "海", "汗", "酔"], score: 4, reason: "酒・食・旅・肉体の成分が強い" },
    ],
  },
  {
    key: "maeda",
    label: "麻枝准",
    school: "耽美塾",
    defaultReason: "青春・喪失・泣きの回路が動いている",
    notes: [
      "会話は軽く、地の文はやわらかい抒情で包む",
      "泣きの場面や余韻は説明しすぎず、音楽や空気で効かせる",
    ],
    signals: [
      { keywords: ["青春", "涙", "泣", "挿入歌", "エピローグ", "約束", "風", "空", "聖地", "ゲーム", "Key", "AIR", "Kanon", "CLANNAD"], score: 4, reason: "青春・聖地・泣きの配線が強い" },
    ],
  },
  {
    key: "banana",
    label: "吉本ばなな",
    school: "耽美塾",
    defaultReason: "喪失や回復をやわらかい静けさで受け止めやすい",
    notes: [
      "短めの文で、静かな回復や余熱をそのまま置く",
      "光や月や深夜の手触りで、きつさをやわらげる",
    ],
    signals: [
      { keywords: ["回復", "静けさ", "月", "深夜", "やわらか", "光", "眠り", "キッチン", "喪失"], score: 3, reason: "静かな回復や喪失後の空気を受けやすい" },
    ],
  },
  {
    key: "soseki",
    label: "夏目漱石",
    school: "知層塾",
    defaultReason: "思索や教養の流れを、少し格調高く整理できる",
    notes: [
      "教養ある中文で、観察と考えをゆっくり接続する",
      "距離を取りつつ、人間観察の余白を残す",
    ],
    signals: [
      { keywords: ["思索", "教養", "人間観察", "概念", "倫理", "理屈", "構造", "人類", "OS", "力学"], score: 3, reason: "思索や概念整理の比重が大きい" },
    ],
  },
  {
    key: "dazai",
    label: "太宰治",
    school: "知層塾",
    defaultReason: "弱さや疲労や自己嫌悪を、そのまま告白の熱にできる",
    notes: [
      "口語で、自意識とだめさを真正面から引き受ける",
      "格好つけず、失敗や疲労をそのまま文章の燃料にする",
    ],
    signals: [
      { keywords: ["疲れ", "疲労", "寝た", "眠", "永眠", "だめ", "すみません", "自己嫌悪", "恥", "二日酔い", "怒り", "請求書", "呪い"], score: 4, reason: "弱さや疲労や自己嫌悪が主題に近い" },
    ],
  },
  {
    key: "hoshi",
    label: "星新一",
    school: "冷静塾",
    defaultReason: "SFや装置や寓話として切り出すと締まりやすい",
    notes: [
      "余計な形容詞を削って、事実を並べて寓話に寄せる",
      "感情を直接説明せず、最後の一行で反転を作る",
    ],
    signals: [
      { keywords: ["SF", "宇宙", "未来", "ロボ", "装置", "発明", "物理演算", "近似", "フェイク"], score: 3, reason: "SFや装置的な見立てに向いている" },
    ],
  },
  {
    key: "machida",
    label: "町田康",
    school: "破壊塾",
    defaultReason: "不条理や笑い混じりの暴走を、そのまま速度にできる",
    notes: [
      "大真面目なまま滑稽へ転がり落ちるテンポを許す",
      "格好つけず、暴走して転倒してまた立ち上がる",
    ],
    signals: [
      { keywords: ["不条理", "変な", "変だ", "おかしい", "バカ", "狂って", "パンク", "ハシゴ", "月まで", "どうかしてる"], score: 4, reason: "不条理や暴走の笑いが強い" },
    ],
  },
  {
    key: "scadi",
    label: "SCA-自",
    school: "破壊塾",
    defaultReason: "日常の上に観念や多層構造が割り込んでいる",
    notes: [
      "平明な日常文の上に、長い思索や観念を割り込ませる",
      "単線的に説明しきらず、亀裂や多層感を残す",
    ],
    signals: [
      { keywords: ["AI", "哲学", "多層", "観念", "シミュレーション", "世界", "電波", "夢", "構造", "本物", "偽物"], score: 4, reason: "観念や多層構造の割り込みが強い" },
    ],
  },
];

function hasDailyContextBlock(markdown) {
  DAILY_CONTEXT_BLOCK_RE.lastIndex = 0;
  return DAILY_CONTEXT_BLOCK_RE.test(markdown);
}

function hasBungouStyleBlock(markdown) {
  BUNGOU_STYLE_BLOCK_RE.lastIndex = 0;
  return BUNGOU_STYLE_BLOCK_RE.test(markdown);
}

function getFormattedParts(date, timeZone, options) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, ...options }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
}

function normalizeNewlines(value) {
  return value.replace(/\r\n/g, "\n");
}

function cleanText(value) {
  return value.replace(/\s+/g, " ").trim();
}

function clipText(value, maxLength = 88) {
  const normalized = cleanText(value);
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function escapeInlineCode(value) {
  return value.replace(/`/g, "'");
}

function ensureDateString(dateString) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    throw new Error(`Invalid date: ${dateString}`);
  }
  return dateString;
}

export async function loadDailyContextConfig() {
  const raw = await readFile(CONFIG_PATH, "utf-8");
  const config = JSON.parse(raw);

  if (!config?.timezone || !config?.swarmHistoryUrl || !config?.xHandle) {
    throw new Error(`Invalid daily context config: ${CONFIG_PATH}`);
  }

  const normalized = {
    browserEngine: "chrome",
    browserExecutablePath: DEFAULT_CHROME_EXECUTABLE_PATH,
    browserDebugUrl: DEFAULT_BROWSER_DEBUG_URL,
    ...config,
  };

  normalized.health = mergeHealthConfig(normalized.health);

  if (normalized.browserEngine !== "chrome") {
    throw new Error(`Unsupported browserEngine: ${normalized.browserEngine}. Only chrome is supported.`);
  }

  return normalized;
}

export function getDateStringInTimeZone(date = new Date(), timeZone = "Asia/Tokyo") {
  const { year, month, day } = getFormattedParts(date, timeZone, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return `${year}-${month}-${day}`;
}

export function formatTimeInTimeZone(value, timeZone = "Asia/Tokyo") {
  const date = value instanceof Date ? value : new Date(value);
  const { hour, minute } = getFormattedParts(date, timeZone, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  });
  return `${hour}:${minute}`;
}

export function getDateStringForValue(value, timeZone = "Asia/Tokyo") {
  const date = value instanceof Date ? value : new Date(value);
  return getDateStringInTimeZone(date, timeZone);
}

export function addDays(dateString, days) {
  ensureDateString(dateString);
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getTimeZoneOffsetMs(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  const utcLike = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return utcLike - date.getTime();
}

export function getUtcInstantForLocalMidnight(dateString, timeZone = "Asia/Tokyo") {
  ensureDateString(dateString);
  const [year, month, day] = dateString.split("-").map(Number);
  const wallClockUtcMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0);

  let instant = new Date(wallClockUtcMs);
  let offsetMs = getTimeZoneOffsetMs(instant, timeZone);
  instant = new Date(wallClockUtcMs - offsetMs);

  const adjustedOffsetMs = getTimeZoneOffsetMs(instant, timeZone);
  if (adjustedOffsetMs !== offsetMs) {
    instant = new Date(wallClockUtcMs - adjustedOffsetMs);
  }

  return instant;
}

export function buildSearchDateRangeForLocalDay(dateString, timeZone = "Asia/Tokyo") {
  ensureDateString(dateString);
  const startUtc = getUtcInstantForLocalMidnight(dateString, timeZone);
  const endUtc = getUtcInstantForLocalMidnight(addDays(dateString, 1), timeZone);

  const sinceDate = startUtc.toISOString().slice(0, 10);
  const endFloorDate = endUtc.toISOString().slice(0, 10);
  const endIsUtcMidnight = endUtc.getUTCHours() === 0
    && endUtc.getUTCMinutes() === 0
    && endUtc.getUTCSeconds() === 0
    && endUtc.getUTCMilliseconds() === 0;
  const untilDate = endIsUtcMidnight ? endFloorDate : addDays(endFloorDate, 1);

  return { sinceDate, untilDate };
}

export async function ensureDir(path) {
  await mkdir(path, { recursive: true });
}

export async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export function stripDailyContextBlock(markdown) {
  return normalizeNewlines(markdown).replace(DAILY_CONTEXT_BLOCK_RE, "\n").replace(/\n{3,}/g, "\n\n").trimEnd();
}

export function upsertDailyContextBlock(markdown, block) {
  const normalized = normalizeNewlines(markdown).replace(/\s+$/, "");
  if (hasDailyContextBlock(normalized)) {
    DAILY_CONTEXT_BLOCK_RE.lastIndex = 0;
    return `${normalized.replace(DAILY_CONTEXT_BLOCK_RE, `\n\n${block}\n`)}\n`;
  }
  return `${normalized}\n\n${block}\n`;
}

function stripLegacyBungouStyleBlock(markdown) {
  BUNGOU_STYLE_BLOCK_RE.lastIndex = 0;
  return markdown.replace(BUNGOU_STYLE_BLOCK_RE, "\n").replace(/\n{3,}/g, "\n\n").trimEnd();
}

function stripLegacyBungouStyleMemo(markdown) {
  return markdown
    .replace(/^- 文豪AI【文】は .*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}

export function upsertBungouStyleBlock(markdown, block) {
  const normalized = stripLegacyBungouStyleMemo(stripLegacyBungouStyleBlock(normalizeNewlines(markdown).replace(/\s+$/, "")));
  if (hasBungouStyleBlock(normalized)) {
    BUNGOU_STYLE_BLOCK_RE.lastIndex = 0;
    return `${normalized.replace(BUNGOU_STYLE_BLOCK_RE, `\n\n${block}\n`)}\n`;
  }

  if (hasDailyContextBlock(normalized)) {
    DAILY_CONTEXT_BLOCK_RE.lastIndex = 0;
    return `${normalized.replace(DAILY_CONTEXT_BLOCK_RE, `\n\n${block}\n\n$&`)}\n`;
  }

  return `${normalized}\n\n${block}\n`;
}

export async function resolveMainDiaryFile({ date, file }) {
  if (file) {
    const normalizedFile = file.replace(/\\/g, "/");
    const absPath = join(ROOT_DIR, normalizedFile);
    const relPath = relative(ROOT_DIR, absPath).replace(/\\/g, "/");

    if (relPath.startsWith("..")) {
      throw new Error(`File is outside repository: ${file}`);
    }
    if (!relPath.startsWith("diary/")) {
      throw new Error(`--file must point to a main diary markdown file under diary/: ${file}`);
    }
    if (!(await pathExists(absPath))) {
      throw new Error(`Diary file not found: ${file}`);
    }

    const fileDate = basename(relPath).match(/^(\d{4}-\d{2}-\d{2})_/u)?.[1];
    if (date && fileDate && fileDate !== date) {
      throw new Error(`--date (${date}) does not match --file (${fileDate})`);
    }

    return { absPath, relPath, date: date ?? fileDate };
  }

  ensureDateString(date);
  const files = (await readdir(DIARY_DIR)).filter((entry) => entry.startsWith(`${date}_`) && entry.endsWith(".md"));

  if (files.length === 0) return null;
  if (files.length > 1) {
    throw new Error(`Multiple main diary files matched ${date}: ${files.join(", ")}`);
  }

  return {
    absPath: join(DIARY_DIR, files[0]),
    relPath: `diary/${files[0]}`,
    date,
  };
}

export function renderDailyContextBlock(normalized) {
  const swarmLines = normalized.sources.swarm.status === "error"
    ? [`- 取得できず: ${clipText(normalized.sources.swarm.note || "不明なエラー", 120)}`]
    : normalized.sources.swarm.items.length > 0
    ? normalized.sources.swarm.items.flatMap((item) => {
      const details = [formatTimeInTimeZone(item.checkedInAt, normalized.timezone)];
      if (item.venueArea) details.push(item.venueArea);
      if (item.venueName) details.push(`\`${escapeInlineCode(item.venueName)}\``);
      const line = `- ${details.join(" ")}`;
      if (!item.shout) return [line];
      return [line, `- コメント: ${clipText(item.shout, 120)}`];
    })
    : ["- 該当なし"];

  const xLines = normalized.sources.x.status === "error"
    ? [`- 取得できず: ${clipText(normalized.sources.x.note || "不明なエラー", 120)}`]
    : normalized.sources.x.items
      .filter((item) => item.kind !== "repost")
      .map((item) => `- ${formatTimeInTimeZone(item.postedAt, normalized.timezone)} ${item.kind}: ${cleanText(item.text || "(本文なし)")}`);
  const healthLines = renderHealthSourceLines(normalized.sources.health);

  const topicLines = normalized.candidateTopics.length > 0
    ? normalized.candidateTopics.map((topic) => `- ${topic}`)
    : ["- 今日は大きな補助トピックなし"];

  const lines = [
    DAILY_CONTEXT_START,
    "## 今日のメモ（自動）",
    "",
    "### Swarm",
    ...swarmLines,
    "",
    "### X",
    ...(xLines.length > 0 ? xLines : ["- 該当なし"]),
    "",
    "### Health",
    ...healthLines,
    "",
    "### 話題候補",
    ...topicLines,
    DAILY_CONTEXT_END,
  ];

  return lines.join("\n");
}

function getBungouSignalText({ sources, candidateTopics }) {
  const parts = [
    ...candidateTopics,
    ...sources.swarm.items.map((item) => item.shout).filter(Boolean),
    ...sources.x.items.filter((item) => item.kind !== "repost").map((item) => item.text).filter(Boolean),
  ];
  return cleanText(parts.join(" "));
}

function uniqueStrings(items) {
  return [...new Set(items.filter(Boolean).map((item) => cleanText(item)).filter(Boolean))];
}

function hasSwarmNarrativeItem(items) {
  return items.some((item) => cleanText(item.shout || "").length > 0);
}

function getUtcDayNumber(dateString) {
  ensureDateString(dateString);
  const [year, month, day] = dateString.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function getRoundRobinBungouStyle(dateString) {
  const offset = getUtcDayNumber(dateString) - getUtcDayNumber(BUNGOU_STYLE_ROUND_ROBIN_START_DATE);
  const index = positiveModulo(offset, BUNGOU_STYLE_CATALOG.length);
  return { ...BUNGOU_STYLE_CATALOG[index], roundRobinIndex: index };
}

function scoreBungouStyles(normalized) {
  const signalText = getBungouSignalText(normalized);
  const hasSwarmNarrative = hasSwarmNarrativeItem(normalized.sources.swarm.items);

  return BUNGOU_STYLE_CATALOG.map((style) => {
    let score = style.key === "murakami" ? 1 : 0;
    const reasons = [];

    for (const signal of style.signals) {
      if (signal.keywords.some((keyword) => signalText.includes(keyword))) {
        score += signal.score;
        reasons.push(signal.reason);
      }
    }

    if (style.key === "kaiko" && hasSwarmNarrative) {
      score += 1;
      reasons.push("移動や現場の手触りが言葉として残っており、肉体寄りに押せる");
    }

    if (style.key === "murakami" && !hasSwarmNarrative) {
      score += 1;
      reasons.push("外の出来事より観察や思索を前に出しやすい");
    }

    if (style.key === "dazai" && normalized.sources.health?.summary?.sleep?.totalMinutes >= 600) {
      score += 1;
      reasons.push("睡眠や消耗の比重が高く、自己告白に向きやすい");
    }

    return {
      ...style,
      score,
      reasons: uniqueStrings(reasons),
    };
  }).sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    if (left.key === "murakami") return 1;
    if (right.key === "murakami") return -1;
    return left.key.localeCompare(right.key, "ja");
  });
}

export function buildBungouStyleRecommendation(normalized) {
  const primary = getRoundRobinBungouStyle(normalized.date);
  const scored = scoreBungouStyles(normalized);

  const alternates = scored
    .filter((style) => style.key !== primary.key && style.score > 0)
    .slice(0, 2)
    .map(({ key, label, school }) => ({ key, label, school }));

  return {
    primary: {
      key: primary.key,
      label: primary.label,
      school: primary.school,
    },
    alternates,
    reasons: [
      `${normalized.date} のラウンドロビン担当`,
      primary.defaultReason,
    ],
    notes: primary.notes,
  };
}

export function renderBungouStyleBlock(recommendation) {
  const alternateLine = recommendation.alternates.length > 0
    ? recommendation.alternates.map((style) => `\`${style.key}\` / ${style.label}（${style.school}）`).join(", ")
    : "なし";

  const lines = [
    BUNGOU_STYLE_START,
    "## 文豪AIメモ（自動）",
    "",
    `- 採用文豪AI: \`${recommendation.primary.key}\` / ${recommendation.primary.label}（${recommendation.primary.school}）`,
    `- 代替候補: ${alternateLine}`,
    ...recommendation.reasons.map((reason, index) => `- 判断メモ${index + 1}: ${reason}`),
    ...recommendation.notes.map((note, index) => `- 書き方メモ${index + 1}: ${note}`),
    BUNGOU_STYLE_END,
  ];

  return lines.join("\n");
}

export function buildCandidateTopics({ sources }) {
  const topics = [];
  const baseTopics = [];
  const seen = new Set();

  const addTopic = (value) => {
    const topic = cleanText(value);
    if (!topic || seen.has(topic)) return;
    seen.add(topic);
    baseTopics.push(topic);
  };

  for (const item of sources.swarm.items) {
    if (item.shout) addTopic(clipText(item.shout, 48));
    if (baseTopics.length >= 4) break;
  }

  for (const item of sources.x.items) {
    if (item.kind === "repost" || !item.text) continue;
    addTopic(clipText(item.text, 52));
    if (baseTopics.length >= 6) break;
  }

  const healthTopics = buildHealthCandidateTopics(sources.health);
  topics.push(...baseTopics.slice(0, Math.max(0, 6 - healthTopics.length)));
  topics.push(...healthTopics);
  return topics.slice(0, 6);
}
