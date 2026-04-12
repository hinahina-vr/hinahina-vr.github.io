import { basename } from "node:path";

const SOURCE_PATH_PATTERN = /### 元ネタ\s*\r?\n- ([^\r\n]+)/;
const ENTRY_TOPICS_PATTERN = /### 本日の話題\s*\r?\n((?:- [^\r\n]+\r?\n?)*)/;

export function parseEntrySourcePath(rawMarkdown) {
  const match = rawMarkdown.match(SOURCE_PATH_PATTERN);
  return match?.[1]?.trim() || null;
}

export function parseSourceFileMeta(relativePath) {
  const base = basename(relativePath, ".md");
  const match = base.match(/^(\d{4}-\d{2}-\d{2})_(.+)$/);
  if (!match) return { date: null, title: null };
  return { date: match[1], title: match[2] };
}

export function parseEntryTopics(rawMarkdown) {
  const match = rawMarkdown.match(ENTRY_TOPICS_PATTERN);
  if (!match) return [];

  return match[1]
    .split(/\r?\n/)
    .map((line) => line.replace(/^- /, "").trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[A-Z]\.\s*/, "").trim())
    .filter(Boolean);
}

export async function loadSourceDiaryContext({ rootDir, rawEntry, paragraphLimit = 2 }) {
  return null;
}
