import {
  collectDiaryMarkdownFiles,
  readDiaryFile,
  splitDiaryMarkdown,
} from "./lib/diary-self-date.mjs";

const PHRASE_LIMITS = [
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

const files = collectDiaryMarkdownFiles();
const findings = [];

for (const limit of PHRASE_LIMITS) {
  let total = 0;
  const owners = [];

  for (const file of files) {
    if (!file.dir.startsWith("diary-")) continue;

    const markdown = readDiaryFile(file);
    const { body } = splitDiaryMarkdown(markdown);
    const count = countPhrase(stripMarkup(body), limit.phrase);
    if (count === 0) continue;

    total += count;
    owners.push(`${file.dir}/${file.name}: ${count}件`);
  }

  if (total > limit.max) {
    findings.push({ ...limit, total, owners });
  }
}

if (findings.length === 0) {
  console.log("日記本文の言い回し上限チェックを通過しました。");
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
