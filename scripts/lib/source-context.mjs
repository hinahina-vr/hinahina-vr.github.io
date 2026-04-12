import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { stripDailyContextBlock } from "./daily-context.mjs";

const SOURCE_PATH_PATTERN = /### 元ネタ\s*\r?\n- ([^\r\n]+)/;

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

    return {
      sourcePath,
      ...parseSourceFileMeta(sourcePath),
      markdown: paragraphs.join("\n\n"),
    };
  } catch {
    return null;
  }
}
