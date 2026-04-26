import path from "node:path";
import {
  collectDiaryMarkdownFiles,
  readDiaryFile,
  repoRoot,
  splitDiaryMarkdown,
} from "./lib/diary-self-date.mjs";
import { getLatestDiaryDate } from "./lib/diary-source-leaks.mjs";

const MAX_PARAGRAPH_CHARS = 320;
const MAX_SENTENCE_CHARS = 110;
const ABSTRACT_SENTENCE_MIN_CHARS = 75;
const MAX_ABSTRACT_TERMS_IN_LONG_SENTENCE = 3;

const ABSTRACT_TERMS = [
  "抽象",
  "観念",
  "概念",
  "構造",
  "多層",
  "接続",
  "生成",
  "消費",
  "供給",
  "需要",
  "欲望",
  "技術",
  "身体",
  "未来",
  "地政学",
  "代替",
  "産業",
  "装置",
  "体系",
  "回路",
  "文脈",
  "シミュレーション",
  "データベース",
];

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

function stripMarkup(body) {
  return body
    .replace(/<[^>]+>/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/\[[^\]]+\]\([^)]+\)/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function compactLength(value) {
  return value.replace(/\s+/g, "").length;
}

function splitParagraphs(body) {
  return stripMarkup(body)
    .split(/\r?\n\s*\r?\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .filter((paragraph) => !paragraph.startsWith("<!--"));
}

function splitSentences(paragraph) {
  return paragraph
    .split(/(?<=[。！？])/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function countAbstractTerms(sentence) {
  return ABSTRACT_TERMS.filter((term) => sentence.includes(term)).length;
}

function collectReadabilityFindings(body) {
  const findings = [];
  const paragraphs = splitParagraphs(body);

  for (let index = 0; index < paragraphs.length; index += 1) {
    const paragraph = paragraphs[index];
    const paragraphLength = compactLength(paragraph);

    if (paragraphLength > MAX_PARAGRAPH_CHARS) {
      findings.push({
        label: "段落が長すぎる",
        detail: `${paragraphLength}文字 (上限 ${MAX_PARAGRAPH_CHARS}文字)`,
        excerpt: paragraph.slice(0, 80),
      });
    }

    for (const sentence of splitSentences(paragraph)) {
      const sentenceLength = compactLength(sentence);
      const abstractTermCount = countAbstractTerms(sentence);

      if (sentenceLength > MAX_SENTENCE_CHARS) {
        findings.push({
          label: "一文が長すぎる",
          detail: `${sentenceLength}文字 (上限 ${MAX_SENTENCE_CHARS}文字)`,
          excerpt: sentence.slice(0, 80),
        });
      }

      if (
        sentenceLength >= ABSTRACT_SENTENCE_MIN_CHARS
        && abstractTermCount > MAX_ABSTRACT_TERMS_IN_LONG_SENTENCE
      ) {
        findings.push({
          label: "長い抽象文",
          detail: `抽象語 ${abstractTermCount}個 (上限 ${MAX_ABSTRACT_TERMS_IN_LONG_SENTENCE}個)`,
          excerpt: sentence.slice(0, 80),
        });
      }
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
  .filter((file) => file.dir === "diary")
  .filter((file) => args.all || file.date === date);

if (files.length === 0) {
  console.error(date ? `${date} の本編日記が見つかりませんでした。` : "対象の本編日記が見つかりませんでした。");
  process.exit(1);
}

const findings = [];

for (const file of files) {
  const markdown = readDiaryFile(file);
  const { body } = splitDiaryMarkdown(markdown);
  const matches = collectReadabilityFindings(body);

  if (matches.length === 0) continue;

  findings.push({
    file: path.relative(repoRoot, file.fullPath),
    matches,
  });
}

if (findings.length === 0) {
  console.log(date ? `${date} の本文読みやすさチェックを通過しました。` : "本文読みやすさチェックを通過しました。");
  process.exit(0);
}

console.error("本編日記に、難解になりやすい文章が残っています。短い文や段落にほどいてください。");
for (const finding of findings) {
  console.error(`- ${finding.file}`);
  for (const match of finding.matches) {
    console.error(`  - ${match.label}: ${match.detail}`);
    console.error(`    ${match.excerpt}`);
  }
}
process.exit(1);
