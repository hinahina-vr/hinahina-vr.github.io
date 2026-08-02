import path from "node:path";
import {
  collectDiaryMarkdownFiles,
  readDiaryFile,
  repoRoot,
} from "./lib/diary-self-date.mjs";

const DATE_TITLE_RE = /^(\d{4}-\d{2}-\d{2})_(.+)\.md$/;
const ALLOWED_TO_FRAGMENTS = [
  "ちゃんと",
  "きちんと",
  "ずっと",
  "そっと",
  "もっと",
  "ちょっと",
  "やっと",
  "ほっと",
  "ふと",
  "きっと",
  "とても",
  "として",
  "という",
  "とき",
  "ところ",
  "こと",
  "ひと",
  "あと",
  "と呼ぶ",
  "と言う",
];

function parseArgs(argv) {
  const args = { all: false, date: null };

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--all") {
      args.all = true;
      continue;
    }

    if (argv[i] === "--date") {
      args.date = argv[i + 1] ?? null;
      i += 1;
      continue;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(argv[i]) && !args.date) {
      args.date = argv[i];
    }
  }

  return args;
}

function latestDate(files) {
  return files.map((file) => file.date).sort((left, right) => right.localeCompare(left))[0] ?? null;
}

function titleFromFilename(name) {
  return name.match(DATE_TITLE_RE)?.[2] ?? null;
}

function titleFromHeading(markdown, date) {
  const match = markdown.match(/^#\s+(.+)\s*$/m);
  if (!match) return null;
  return match[1].replace(new RegExp(`^${date}\\s+`), "").trim();
}

function stripAllowedToFragments(title) {
  return ALLOWED_TO_FRAGMENTS.reduce(
    (next, fragment) => next.replaceAll(fragment, ""),
    title,
  );
}

function hasParallelTitle(title) {
  return stripAllowedToFragments(title).includes("と");
}

const args = parseArgs(process.argv.slice(2));
const files = collectDiaryMarkdownFiles().filter((file) => file.dir === "diary");
const targetDate = args.date ?? (args.all ? null : latestDate(files));
const targets = files.filter((file) => args.all || file.date === targetDate);

if (targets.length === 0) {
  console.error(targetDate ? `${targetDate} の本編日記が見つかりませんでした。` : "対象の本編日記が見つかりませんでした。");
  process.exit(1);
}

const findings = [];

for (const file of targets) {
  const markdown = readDiaryFile(file);
  const filenameTitle = titleFromFilename(file.name);
  const headingTitle = titleFromHeading(markdown, file.date);
  const titles = [
    ["ファイル名", filenameTitle],
    ["見出し", headingTitle],
  ].filter(([, title]) => title);

  for (const [label, title] of titles) {
    if (!hasParallelTitle(title)) continue;
    findings.push({
      file: path.relative(repoRoot, file.fullPath),
      label,
      title,
    });
  }
}

if (findings.length === 0) {
  console.log(targetDate ? `${targetDate} の本編日記タイトル並列表現チェックを通過しました。` : "本編日記タイトル並列表現チェックを通過しました。");
  process.exit(0);
}

console.error("本編日記タイトルに、AとBのような安易な並列表現が残っています。主役を1つに絞ったタイトルへ直してください。");
for (const finding of findings) {
  console.error(`- ${finding.file} (${finding.label}): ${finding.title}`);
}
process.exit(1);
