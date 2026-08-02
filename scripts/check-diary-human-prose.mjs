import fs from "node:fs";
import path from "node:path";
import {
  collectDiaryMarkdownFiles,
  readDiaryFile,
  repoRoot,
  splitDiaryMarkdown,
} from "./lib/diary-self-date.mjs";

const PROSE_PATTERNS = [
  {
    label: "画面・投稿を見た報告だけの導入",
    regex: /(?:画像|画面|投稿|写真)を見た[。．]/g,
    scope: "opening",
  },
  {
    label: "短い反応を作業記録として書く表現",
    regex: /三文字だけ(?:反応|返事)|一言だけ(?:反応|返事)|三文字しかない(?:んじゃなくて|のではなく)/g,
    scope: "any",
  },
  {
    label: "読み手に見えない資料を根拠にして始める・閉じる表現",
    regex: /記録に(?:は)?ない|資料に(?:は)?ありません|確認でき(?:ません|ない)|断定でき(?:ません|ない)/g,
    scope: "edges",
  },
  {
    label: "欠けた情報の説明だけで閉じる表現",
    regex: /どんな[^。]{0,24}(?:書いて|記録されて)ない(?:けど|が)|(?:訪問|仕事|授業|注文)の?目的(?:は|が)[^。]{0,16}(?:不明|分からない|わからない)/g,
    scope: "closing",
  },
  {
    label: "本文を監査報告として閉じる表現",
    regex: /一件で閉じ|証拠の境界|記録だけで終え|記録として残|位置記録として|分からない部分は/g,
    scope: "closing",
  },
  {
    label: "角括弧に頼った台詞・用語表現",
    regex: /[「」]/g,
    scope: "any",
  },
];

const IMPERATIVE_ENDINGS =
  /(?:してください|しておきましょう|しましょう|しなさい|すべきです|べきです|なさい)[。．]?$/;

const CHECKLIST_CHOICE =
  /^(?:確認する|記録する|保存する|分類する|一覧にする|手順を書く|条件を決める|基準を残す|担当者を決める)/;

function visibleMarkdown(markdown) {
  const { heading, body } = splitDiaryMarkdown(markdown);
  return `${heading}\n${body}`
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/\[[^\]]+\]\([^)]+\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sentenceList(text) {
  return text
    .split(/(?<=[。！？])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function scopedText(text, scope) {
  const sentences = sentenceList(text);
  if (scope === "opening") return sentences.slice(0, 1).join(" ");
  if (scope === "closing") return sentences.slice(-1).join(" ");
  if (scope === "edges") return [sentences[0], sentences.at(-1)].filter(Boolean).join(" ");
  return text;
}

function proseIssue(text, pattern) {
  const hits = scopedText(text, pattern.scope).match(pattern.regex);
  if (!hits) return null;
  return `${pattern.label}: ${[...new Set(hits)].join(", ")}`;
}

const findings = [];

for (const file of collectDiaryMarkdownFiles()) {
  const text = visibleMarkdown(readDiaryFile(file));

  for (const pattern of PROSE_PATTERNS) {
    const issue = proseIssue(text, pattern);
    if (!issue) continue;
    findings.push({
      file: path.relative(repoRoot, file.fullPath),
      issue,
    });
  }

  if (file.dir === "diary") continue;

  const imperativeCount = sentenceList(text).filter((sentence) =>
    IMPERATIVE_ENDINGS.test(sentence),
  ).length;
  if (imperativeCount >= 2) {
    findings.push({
      file: path.relative(repoRoot, file.fullPath),
      issue: `助言・命令文が${imperativeCount}文連続するため、人物の所感ではなく手順書に見えます`,
    });
  }
}

const scenarioDir = path.join(repoRoot, "scenarios");
for (const name of fs.readdirSync(scenarioDir).filter((entry) => /^2026-.+\.json$/.test(entry))) {
  const fullPath = path.join(scenarioDir, name);
  const data = JSON.parse(fs.readFileSync(fullPath, "utf8"));

  for (const entry of data.scenario ?? []) {
    if (typeof entry.text === "string") {
      for (const pattern of PROSE_PATTERNS) {
        const issue = proseIssue(entry.text, pattern);
        if (!issue) continue;
        findings.push({
          file: path.relative(repoRoot, fullPath),
          issue,
        });
      }
    }

    for (const choice of entry.choices ?? []) {
      if (!CHECKLIST_CHOICE.test(choice.text)) continue;
      findings.push({
        file: path.relative(repoRoot, fullPath),
        issue: `選択肢が物語上の行動ではなく検査項目です: ${choice.text}`,
      });
    }
  }
}

if (findings.length === 0) {
  console.log("本編・大奥AI・夢分岐の人間的な文章チェックを通過しました。");
  process.exit(0);
}

console.error("監査文、定型的な命令文、または作業項目風の選択肢が残っています。");
for (const finding of findings) {
  console.error(`- ${finding.file}: ${finding.issue}`);
}
process.exit(1);
