import { access, cp, mkdir, readdir, readFile, rm } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";

export const ROOT_DIR = join(import.meta.dirname, "..", "..");
export const DIARY_DIR = join(ROOT_DIR, "diary");
export const LOCAL_DIR = join(ROOT_DIR, ".local");
export const AUTH_DIR = join(LOCAL_DIR, "auth", "daily-sources");
export const DAILY_CONTEXT_DIR = join(LOCAL_DIR, "daily-context");
export const RAW_DIR = join(DAILY_CONTEXT_DIR, "raw");
export const DEBUG_DIR = join(DAILY_CONTEXT_DIR, "debug");
export const CONFIG_PATH = join(ROOT_DIR, "daily-context.config.json");
export const SYSTEM_CHROME_USER_DATA_DIR = join(os.homedir(), "AppData", "Local", "Google", "Chrome", "User Data");

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

  return {
    browserChannel: "chrome",
    ...config,
  };
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

export async function getChromeProfileInfo() {
  const localStatePath = join(SYSTEM_CHROME_USER_DATA_DIR, "Local State");
  if (!(await pathExists(localStatePath))) {
    throw new Error(`Chrome Local State not found: ${localStatePath}`);
  }

  const localState = JSON.parse(await readFile(localStatePath, "utf-8"));
  const profile = localState?.profile;
  const profileDirectory = profile?.last_used ?? "Default";
  const profileName = profile?.info_cache?.[profileDirectory]?.name ?? profileDirectory;

  return {
    userDataDir: SYSTEM_CHROME_USER_DATA_DIR,
    localStatePath,
    profileDirectory,
    profileName,
  };
}

export async function seedAuthProfileFromChrome() {
  const chrome = await getChromeProfileInfo();
  const sourceProfileDir = join(chrome.userDataDir, chrome.profileDirectory);
  const sourceCookiesPath = join(sourceProfileDir, "Network", "Cookies");
  const destProfileDir = join(AUTH_DIR, chrome.profileDirectory);
  const destCookiesPath = join(destProfileDir, "Network", "Cookies");

  if (!(await pathExists(sourceProfileDir))) {
    throw new Error(`Chrome profile not found: ${sourceProfileDir}`);
  }

  await rm(AUTH_DIR, { recursive: true, force: true });
  await ensureDir(AUTH_DIR);
  await cp(chrome.localStatePath, join(AUTH_DIR, "Local State"));
  await cp(sourceProfileDir, destProfileDir, {
    recursive: true,
    force: true,
    filter: (src) => {
      const normalized = src.replace(/\\/g, "/");
      if (/\/(Network|Safe Browsing Network)\/.*Cookies(-journal)?$/i.test(normalized)) return false;
      if (/\/(History|History-journal|Login Data|Login Data For Account|Login Data-journal|Web Data|Web Data-journal|Visited Links|Current Session|Current Tabs|Last Session|Last Tabs|LOCK|SingletonCookie|SingletonLock|SingletonSocket)$/i.test(normalized)) return false;
      return !/\/(Cache|Code Cache|GPUCache|Service Worker|ShaderCache|GrShaderCache|GraphiteDawnCache|Crashpad|DawnGraphiteCache|DawnWebGPUCache|Sessions)\b/i.test(normalized);
    },
  });
  await backupSqliteFile(sourceCookiesPath, destCookiesPath);

  return {
    ...chrome,
    seededAuthDir: AUTH_DIR,
  };
}

export async function cleanupAuthProfileLocks(profileRoot = AUTH_DIR) {
  const names = [
    "lockfile",
    "SingletonCookie",
    "SingletonLock",
    "SingletonSocket",
    "DevToolsActivePort",
  ];

  for (const name of names) {
    await rm(join(profileRoot, name), { force: true }).catch(() => {});
  }
}

async function backupSqliteFile(sourcePath, destinationPath) {
  if (!(await pathExists(sourcePath))) return;

  await ensureDir(dirname(destinationPath));

  const pythonScript = [
    "import pathlib, sqlite3, sys",
    "src = pathlib.Path(sys.argv[1])",
    "dst = pathlib.Path(sys.argv[2])",
    "dst.parent.mkdir(parents=True, exist_ok=True)",
    "src_uri = 'file:' + src.resolve().as_posix() + '?mode=ro'",
    "src_db = sqlite3.connect(src_uri, uri=True, timeout=5)",
    "dst_db = sqlite3.connect(str(dst))",
    "src_db.backup(dst_db)",
    "dst_db.close()",
    "src_db.close()",
  ].join("; ");

  const runners = [
    { command: "python", args: ["-c", pythonScript, sourcePath, destinationPath] },
    { command: "py", args: ["-3", "-c", pythonScript, sourcePath, destinationPath] },
  ];

  let lastError = null;
  for (const runner of runners) {
    try {
      await runCommand(runner.command, runner.args);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error(`Failed to back up sqlite file: ${sourcePath}`);
}

async function runCommand(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"], windowsHide: true });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited with code ${code}: ${stderr.trim()}`));
    });
  });
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
    "### 話題候補",
    ...topicLines,
    DAILY_CONTEXT_END,
  ];

  return lines.join("\n");
}

export function buildCandidateTopics({ sources }) {
  const topics = [];
  const seen = new Set();

  const addTopic = (value) => {
    const topic = cleanText(value);
    if (!topic || seen.has(topic)) return;
    seen.add(topic);
    topics.push(topic);
  };

  for (const item of sources.swarm.items) {
    if (item.venueName) addTopic(`${item.venueName}に行った`);
    if (item.venueArea && item.venueName) addTopic(`${item.venueArea}で${item.venueName}に立ち寄った`);
    if (item.shout) addTopic(clipText(item.shout, 48));
    if (topics.length >= 4) break;
  }

  for (const item of sources.x.items) {
    if (item.kind === "repost" || !item.text) continue;
    addTopic(clipText(item.text, 52));
    if (topics.length >= 6) break;
  }

  if (sources.swarm.items.length > 0 && sources.x.items.some((item) => item.kind !== "repost")) {
    const venueName = sources.swarm.items[0]?.venueName;
    addTopic(venueName ? `${venueName}での外出とXの投稿が重なった日` : "外出とXの投稿が重なった日");
  }

  return topics.slice(0, 6);
}
