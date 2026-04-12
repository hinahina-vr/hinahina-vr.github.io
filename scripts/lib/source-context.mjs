import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { stripDailyContextBlock } from "./daily-context.mjs";

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

export function extractLeadParagraphsFromMarkdown(markdown, paragraphLimit = 2) {
  const body = stripDailyContextBlock(markdown)
    .replace(/^\uFEFF?/, "")
    .replace(/^#[^\r\n]+[\r\n]+/, "")
    .trim();

  return body
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .filter((paragraph) => !paragraph.startsWith("<!--"))
    .filter((paragraph) => !paragraph.startsWith("<p style="))
    .slice(0, paragraphLimit);
}

export async function loadSourceDiaryContext({ rootDir, rawEntry, paragraphLimit = 2 }) {
  const sourcePath = parseEntrySourcePath(rawEntry);
  if (!sourcePath) return null;

  try {
    const rawSource = await readFile(join(rootDir, sourcePath), "utf-8");
    const paragraphs = extractLeadParagraphsFromMarkdown(rawSource, paragraphLimit);
    if (paragraphs.length === 0) return null;
    const topics = parseEntryTopics(rawEntry);
    const topicBlock =
      topics.length > 0
        ? `\n\n**この日の話題**\n${topics.map((topic) => `- ${topic}`).join("\n")}`
        : "";

    return {
      sourcePath,
      ...parseSourceFileMeta(sourcePath),
      markdown: `${paragraphs.join("\n\n")}${topicBlock}`,
    };
  } catch {
    return null;
  }
}
