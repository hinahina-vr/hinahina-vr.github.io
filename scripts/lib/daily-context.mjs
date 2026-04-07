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

const DAILY_CONTEXT_BLOCK_RE = /\n?<!-- daily-context:start -->[\s\S]*?<!-- daily-context:end -->\n?/g;

function hasDailyContextBlock(markdown) {
  DAILY_CONTEXT_BLOCK_RE.lastIndex = 0;
  return DAILY_CONTEXT_BLOCK_RE.test(markdown);
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
      .map((item) => `- ${formatTimeInTimeZone(item.postedAt, normalized.timezone)} ${item.kind}: ${clipText(item.text || "(本文なし)", 120)}`);
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
    if (item.venueName) addTopic(`${item.venueName}に行った`);
    if (item.venueArea && item.venueName) addTopic(`${item.venueArea}で${item.venueName}に立ち寄った`);
    if (item.shout) addTopic(clipText(item.shout, 48));
    if (baseTopics.length >= 4) break;
  }

  for (const item of sources.x.items) {
    if (item.kind === "repost" || !item.text) continue;
    addTopic(clipText(item.text, 52));
    if (baseTopics.length >= 6) break;
  }

  if (sources.swarm.items.length > 0 && sources.x.items.some((item) => item.kind !== "repost")) {
    const venueName = sources.swarm.items[0]?.venueName;
    addTopic(venueName ? `${venueName}での外出とXの投稿が重なった日` : "外出とXの投稿が重なった日");
  }

  const healthTopics = buildHealthCandidateTopics(sources.health);
  topics.push(...baseTopics.slice(0, Math.max(0, 6 - healthTopics.length)));
  topics.push(...healthTopics);
  return topics.slice(0, 6);
}
