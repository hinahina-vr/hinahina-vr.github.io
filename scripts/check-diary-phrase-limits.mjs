import fs from "node:fs";
import path from "node:path";

import {
  collectDiaryMarkdownFiles,
  readDiaryFile,
  repoRoot,
  splitDiaryMarkdown,
} from "./lib/diary-self-date.mjs";

const DIARY_OUTPUT_FILE_RE = /^diary(?:-.+)?\.html$/;
const BANNED_PHRASES = ["着地", "輪郭"];

const PHRASE_LIMITS = [
  ...BANNED_PHRASES.map((phrase) => ({
    phrase,
    max: 0,
    label: `禁止語: ${phrase}`,
    scope: "all-diaries",
    includeHeading: true,
  })),
  {
    phrase: "AIと抱き枕",
    max: 1,
    label: "4/19 の題材フレーズ復唱",
  },
  {
    phrase: "ESP32とLLMガチャ",
    max: 1,
    label: "4/20 の題材フレーズ復唱",
  },
  {
    phrase: "値札とトルソー",
    max: 1,
    label: "4/21 の題材フレーズ復唱",
  },
  {
    phrase: "ヴォイヴォイとアネモイ",
    max: 1,
    label: "4/22 の題材フレーズ復唱",
  },
  {
    phrase: "アネモイという風の名前",
    max: 1,
    label: "4/22 の説明句の復唱",
  },
  {
    phrase: "中本と赤い冗談",
    max: 1,
    label: "4/23 の題材フレーズ復唱",
  },
  {
    phrase: "外の足あとが赤い店で止まること",
    max: 1,
    label: "4/23 の説明句の復唱",
  },
];

function stripMarkup(body) {
  return body
    .replace(/<[^>]+>/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/\[[^\]]+\]\([^)]+\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countPhrase(text, phrase) {
  let count = 0;
  let index = 0;

  while (true) {
    const nextIndex = text.indexOf(phrase, index);
    if (nextIndex === -1) return count;
    count += 1;
    index = nextIndex + phrase.length;
  }
}

function collectDiaryHtmlFiles(rootDir = repoRoot) {
  return fs
    .readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && DIARY_OUTPUT_FILE_RE.test(entry.name))
    .map((entry) => ({
      name: entry.name,
      fullPath: path.join(rootDir, entry.name),
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "ja"));
}

const files = collectDiaryMarkdownFiles();
const htmlFiles = collectDiaryHtmlFiles();
const findings = [];

for (const limit of PHRASE_LIMITS) {
  let total = 0;
  const owners = [];

  for (const file of files) {
    if (limit.scope !== "all-diaries" && !file.dir.startsWith("diary-")) continue;

    const markdown = readDiaryFile(file);
    const { heading, body } = splitDiaryMarkdown(markdown);
    const text = limit.includeHeading ? `${file.name}\n${heading}\n${body}` : body;
    const count = countPhrase(stripMarkup(text), limit.phrase);
    if (count === 0) continue;

    total += count;
    owners.push(`${file.dir}/${file.name}: ${count}件`);
  }

  if (total > limit.max) {
    findings.push({ ...limit, total, owners });
  }
}

for (const phrase of BANNED_PHRASES) {
  let total = 0;
  const owners = [];

  for (const file of htmlFiles) {
    const html = fs.readFileSync(file.fullPath, "utf8");
    const count = countPhrase(stripMarkup(`${file.name}\n${html}`), phrase);
    if (count === 0) continue;

    total += count;
    owners.push(`${file.name}: ${count}件`);
  }

  if (total > 0) {
    findings.push({
      phrase,
      max: 0,
      label: `禁止語: ${phrase} (生成HTML)`,
      total,
      owners,
    });
  }
}

if (findings.length === 0) {
  console.log("日記ソースと生成HTMLの言い回し上限チェックを通過しました。");
  process.exit(0);
}

console.error("日記本文に、使い回しを避けるべき同一表現が残っています。");
for (const finding of findings) {
  console.error(`- ${finding.label}: 「${finding.phrase}」 ${finding.total}件 (上限 ${finding.max}件)`);
  for (const owner of finding.owners) {
    console.error(`  - ${owner}`);
  }
}
process.exit(1);
