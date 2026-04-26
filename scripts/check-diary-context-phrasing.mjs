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
    regex: /今日はその翌日に|あれはかなり良かった|そのことをひとこと書いた/g,
  },
  {
    label: "説明不足の主題導入",
    regex: /今日は「[^」]+」の話ばかりしていた|そのなかで出てきた|その流れで|そのくせ最後には/g,
  },
  {
    label: "読み手に見えない出来事の受け方",
    regex: /今日の人間は|だが今日起きているのは|要するに今日は|その日はまさにそうで/g,
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
