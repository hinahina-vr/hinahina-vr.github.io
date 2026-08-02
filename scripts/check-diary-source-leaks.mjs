import {
  formatSourceMentionFindings,
  validateSourceMentionsForDate,
} from "./lib/diary-source-leaks.mjs";
import { collectDiaryMarkdownFiles } from "./lib/diary-self-date.mjs";

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
const dates = requestedDate
  ? [requestedDate]
  : [...new Set(
      collectDiaryMarkdownFiles()
        .filter((file) => file.dir === "diary")
        .map((file) => file.date),
    )].sort();

if (dates.length === 0) {
  console.error("対象の日記が見つかりませんでした。");
  process.exit(1);
}

const results = dates.map((date) => validateSourceMentionsForDate(date));
const empty = results.filter((result) => result.checked.length === 0);
const failed = results.filter((result) => result.findings.length > 0);

if (empty.length > 0) {
  console.error(`${empty.map((result) => result.date).join(", ")} の日記が見つかりませんでした。`);
  process.exit(1);
}

if (failed.length > 0) {
  console.error(failed.map((result) => formatSourceMentionFindings(result)).join("\n"));
  process.exit(1);
}

const checkedCount = results.reduce((sum, result) => sum + result.checked.length, 0);
console.log(
  requestedDate
    ? `${requestedDate} の素材取得元名チェックを通過しました。対象: ${checkedCount}件`
    : `全${dates.length}日分の素材取得元名チェックを通過しました。対象: ${checkedCount}件`,
);
