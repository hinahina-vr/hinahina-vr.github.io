import path from "node:path";
import {
  collectDiaryMarkdownFiles,
  readDiaryFile,
  repoRoot,
  splitDiaryMarkdown,
} from "./lib/diary-self-date.mjs";

const DISCOURAGED_PATTERNS = [
  {
    label: "前日参照に頼る見出し・本文",
    regex: /前日|前の日|前夜|昨夜|昨日|その翌日|翌日/g,
  },
  {
    label: "投稿前提の指示語",
    regex: /今日はその翌日に|あれはかなり良かった|そのことをひとこと書いた|と書いた|と書いている/g,
  },
  {
    label: "説明不足の主題導入",
    regex: /今日は「[^」]+」の話ばかりしていた|そのなかで出てきた|その流れで|そのくせ最後には/g,
  },
  {
    label: "抽象的な空気表現",
    regex: /言葉だけで空気が動く|空気が動く日/g,
  },
  {
    label: "抽象ラベルでまとめた本文",
    regex: /日記の骨|部品の多い話|欲しいものの値段から始まった|話へずれていく|考えていた頭|大きな出来事はない|大きな事件|大きな話|出来事として説明しようとすると|日記に残すなら|引き戻す|現実へ戻す/g,
  },
  {
    label: "日を指示語でまとめる表現",
    regex: /その日|この日/g,
  },
  {
    label: "今日で雑に始める導入",
    regex: /今日は特にこれといって何もなかった|今日はというか|今日はそこに|今日はその/g,
  },
  {
    label: "曖昧な回帰表現",
    regex: /戻った/g,
  },
  {
    label: "読み手に見えない出来事の受け方",
    regex: /今日の人間は|だが今日起きているのは|要するに今日は/g,
  },
  {
    label: "本編に混ざったキャラ所感",
    regex: /\*\*ひなの所感\*\*/g,
  },
  {
    label: "本文内の日付表現",
    regex: /(?:\d{4}年\d{1,2}月\d{1,2}日|(?:\d{1,2}|[一二三四五六七八九十〇零]+)月(?:\d{1,2}|[一二三四五六七八九十〇零]+)日)/g,
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

function getOpeningText(body) {
  const paragraphs = body
    .replace(/<!--[\s\S]*?-->/g, " ")
    .split(/\r?\n\s*\r?\n/)
    .map(stripMarkup)
    .filter(Boolean);

  return paragraphs[0] ?? "";
}

function parseArgs(argv) {
  const args = { date: null };

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--date") {
      args.date = argv[i + 1] ?? null;
      i += 1;
    }
  }

  return args;
}

const { date: requestedDate } = parseArgs(process.argv.slice(2));
const files = collectDiaryMarkdownFiles()
  .filter((file) => file.dir === "diary")
  .filter((file) => !requestedDate || file.date === requestedDate);

if (files.length === 0) {
  console.error(requestedDate ? `${requestedDate} の本編日記が見つかりませんでした。` : "対象の本編日記が見つかりませんでした。");
  process.exit(1);
}

const findings = [];

for (const file of files) {
  const markdown = readDiaryFile(file);
  const { heading, body } = splitDiaryMarkdown(markdown);
  const plainBody = stripMarkup(`${heading}\n${body}`);
  const openingText = getOpeningText(body);
  const matches = [];

  for (const pattern of DISCOURAGED_PATTERNS) {
    const hit = plainBody.match(pattern.regex);
    if (!hit) continue;
    matches.push(`${pattern.label}: ${[...new Set(hit)].join(", ")}`);
  }

  if (matches.length === 0) continue;

  findings.push({
    file: path.relative(repoRoot, file.fullPath),
    matches,
  });
}

if (findings.length === 0) {
  console.log(requestedDate ? `${requestedDate} の本文文脈チェックを通過しました。` : "本編日記の文脈チェックを通過しました。");
  process.exit(0);
}

console.error("本編日記に、読み手が裏文脈を補完しないと伝わりにくい言い回しが残っています。");
for (const finding of findings) {
  console.error(`- ${finding.file}: ${finding.matches.join(" / ")}`);
}
process.exit(1);
