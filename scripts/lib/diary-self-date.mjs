import fs from "node:fs";
import path from "node:path";

export const repoRoot = path.resolve(import.meta.dirname, "..", "..");

const DIARY_FILE_RE = /^(\d{4}-\d{2}-\d{2})_.+\.md$/;
const DAILY_CONTEXT_BLOCK_RE = /<!-- daily-context:start -->[\s\S]*?<!-- daily-context:end -->\s*/m;
const KANJI_DIGITS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function numberToKanji(value) {
  if (value < 10) return KANJI_DIGITS[value];
  if (value === 10) return "十";
  if (value < 20) return `十${KANJI_DIGITS[value - 10]}`;
  if (value < 100) {
    const tens = Math.floor(value / 10);
    const ones = value % 10;
    return `${tens === 1 ? "十" : `${KANJI_DIGITS[tens]}十`}${ones ? KANJI_DIGITS[ones] : ""}`;
  }
  return String(value);
}

export function getDiaryTargetDirs(rootDir = repoRoot) {
  return fs
    .readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && (entry.name === "diary" || entry.name.startsWith("diary-")))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, "ja"));
}

export function collectDiaryMarkdownFiles(rootDir = repoRoot) {
  const files = [];

  for (const dir of getDiaryTargetDirs(rootDir)) {
    const fullDir = path.join(rootDir, dir);
    for (const name of fs.readdirSync(fullDir)) {
      if (!DIARY_FILE_RE.test(name)) continue;
      files.push({
        dir,
        name,
        date: name.slice(0, 10),
        fullPath: path.join(fullDir, name),
      });
    }
  }

  return files.sort((left, right) => left.fullPath.localeCompare(right.fullPath, "ja"));
}

export function splitDiaryMarkdown(markdown) {
  const normalized = markdown.replace(/^\uFEFF?/, "");
  const headingMatch = normalized.match(/^(#[^\r\n]*\r?\n(?:\r?\n)?)/);
  const heading = headingMatch ? headingMatch[0] : "";
  const rest = heading ? normalized.slice(heading.length) : normalized;
  const contextMatch = rest.match(DAILY_CONTEXT_BLOCK_RE);

  if (!contextMatch) {
    return { heading, body: rest, trailer: "" };
  }

  const index = contextMatch.index ?? rest.indexOf(contextMatch[0]);
  return {
    heading,
    body: rest.slice(0, index),
    trailer: rest.slice(index),
  };
}

export function buildSelfDateVariants(date) {
  const [year, month, day] = date.split("-").map(Number);
  const variants = [
    `${year}年${month}月${day}日`,
    `${year}年${numberToKanji(month)}月${numberToKanji(day)}日`,
    `${month}月${day}日`,
    `${numberToKanji(month)}月${numberToKanji(day)}日`,
  ];

  return [...new Set(variants)].sort((left, right) => right.length - left.length);
}

export function findSelfDateMentions(body, date) {
  return buildSelfDateVariants(date).filter((variant) => body.includes(variant));
}

export function replaceSelfDateMentionsInBody(body, date) {
  let next = body;

  for (const variant of buildSelfDateVariants(date)) {
    next = next.replace(new RegExp(escapeRegExp(variant), "g"), "当日");
  }

  return next;
}

export function readDiaryFile(file) {
  return fs.readFileSync(file.fullPath, "utf8");
}

export function writeDiaryFile(file, markdown) {
  fs.writeFileSync(file.fullPath, markdown, "utf8");
}
