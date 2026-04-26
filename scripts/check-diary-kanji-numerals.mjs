import path from "node:path";
import {
  collectDiaryMarkdownFiles,
  readDiaryFile,
  repoRoot,
  splitDiaryMarkdown,
} from "./lib/diary-self-date.mjs";
import { getLatestDiaryDate } from "./lib/diary-source-leaks.mjs";

const KANJI_DIGIT_CHARS = "〇零一二三四五六七八九壱弐参";
const KANJI_NUMERAL_CHARS = `${KANJI_DIGIT_CHARS}十百千万億兆`;
const NUMERIC_COUNTER_RE = [
  "年",
  "ヶ月",
  "か月",
  "カ月",
  "月",
  "日",
  "時",
  "分",
  "秒",
  "週",
  "週間",
  "回",
  "個",
  "件",
  "人",
  "名",
  "歳",
  "才",
  "円",
  "点",
  "位",
  "番",
  "割",
  "本",
  "枚",
  "冊",
  "階",
  "杯",
  "泊",
  "校",
  "社",
  "店",
  "軒",
  "台",
  "基",
  "着",
  "文字",
  "字",
  "ページ",
  "頁",
  "代",
  "度",
  "章",
  "話",
  "世紀",
].join("|");

const KANJI_NUMBER_CORE_RE = `(?=[${KANJI_NUMERAL_CHARS}]*[${KANJI_DIGIT_CHARS}十百千])[${KANJI_NUMERAL_CHARS}]+`;
const KANJI_MAGNITUDE_NUMBER_CORE_RE = `(?=[${KANJI_NUMERAL_CHARS}]*[十百千万億兆])${KANJI_NUMBER_CORE_RE}`;
const KANJI_NUMERIC_VALUE_RE = new RegExp(
  [
    `(?:第)?${KANJI_NUMBER_CORE_RE}(?:${NUMERIC_COUNTER_RE})`,
    `(?:数)?${KANJI_MAGNITUDE_NUMBER_CORE_RE}`,
    "数[万億兆]",
    "[一二三四五六七八九]つ",
  ].join("|"),
  "gu",
);

const ALLOWED_IDIOMS = new Set([
  "十分",
  "村八分",
]);

function parseArgs(argv) {
  const args = { date: null, all: false };

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--date") {
      args.date = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (argv[i] === "--all") {
      args.all = true;
      continue;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(argv[i]) && !args.date) {
      args.date = argv[i];
    }
  }

  return args;
}

function maskIgnoredInlineMarkup(line) {
  return line
    .replace(/`[^`]*`/g, (match) => " ".repeat(match.length))
    .replace(/<[^>]+>/g, (match) => " ".repeat(match.length))
    .replace(/\[[^\]]+\]\([^)]+\)/g, (match) => " ".repeat(match.length));
}

function collectKanjiNumericFindings(text) {
  const findings = [];
  const lines = text.split(/\r?\n/);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = maskIgnoredInlineMarkup(lines[lineIndex]);
    KANJI_NUMERIC_VALUE_RE.lastIndex = 0;

    let match;
    while ((match = KANJI_NUMERIC_VALUE_RE.exec(line)) !== null) {
      const value = match[0];
      if (ALLOWED_IDIOMS.has(value)) continue;

      findings.push({
        line: lineIndex + 1,
        column: match.index + 1,
        value,
      });
    }
  }

  return findings;
}

const args = parseArgs(process.argv.slice(2));
const date = args.date ?? (args.all ? null : getLatestDiaryDate());

if (!args.all && !date) {
  console.error("対象の日記が見つかりませんでした。");
  process.exit(1);
}

const files = collectDiaryMarkdownFiles()
  .filter((file) => args.all || file.date === date);

if (files.length === 0) {
  console.error(date ? `${date} の日記が見つかりませんでした。` : "対象の日記が見つかりませんでした。");
  process.exit(1);
}

const findings = [];

for (const file of files) {
  const markdown = readDiaryFile(file);
  const { heading, body } = splitDiaryMarkdown(markdown);
  const matches = collectKanjiNumericFindings(`${heading}\n${body}`);

  if (matches.length === 0) continue;

  findings.push({
    file: path.relative(repoRoot, file.fullPath),
    matches,
  });
}

if (findings.length === 0) {
  console.log(date ? `${date} の漢数字表記チェックを通過しました。` : "漢数字表記チェックを通過しました。");
  process.exit(0);
}

console.error("日記本文に、漢数字の数値表記が残っています。数値は半角数字で書いてください。");
for (const finding of findings) {
  console.error(`- ${finding.file}`);
  for (const match of finding.matches) {
    console.error(`  - ${match.line}:${match.column} 「${match.value}」`);
  }
}
process.exit(1);
