import path from "node:path";
import {
  collectDiaryMarkdownFiles,
  findSelfDateMentions,
  readDiaryFile,
  repoRoot,
  splitDiaryMarkdown,
} from "./lib/diary-self-date.mjs";

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
const files = collectDiaryMarkdownFiles().filter((file) => !requestedDate || file.date === requestedDate);

if (files.length === 0) {
  console.error(requestedDate ? `${requestedDate} の日記が見つかりませんでした。` : "対象の日記が見つかりませんでした。");
  process.exit(1);
}

const findings = [];

for (const file of files) {
  const markdown = readDiaryFile(file);
  const { body } = splitDiaryMarkdown(markdown);
  const matches = findSelfDateMentions(body, file.date);
  if (matches.length === 0) continue;

  findings.push({
    file: path.relative(repoRoot, file.fullPath),
    matches,
  });
}

if (findings.length === 0) {
  console.log(requestedDate ? `${requestedDate} の本文に自己日付は残っていません。` : "日記本文の自己日付チェックを通過しました。");
  process.exit(0);
}

console.error("日記本文に、対象日自身の日付が残っています。");
for (const finding of findings) {
  console.error(`- ${finding.file}: ${finding.matches.join(", ")}`);
}
process.exit(1);
