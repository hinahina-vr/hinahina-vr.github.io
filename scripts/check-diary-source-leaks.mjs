import {
  formatSourceMentionFindings,
  getLatestDiaryDate,
  validateSourceMentionsForDate,
} from "./lib/diary-source-leaks.mjs";

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
const date = requestedDate ?? getLatestDiaryDate();

if (!date) {
  console.error("対象の日記が見つかりませんでした。");
  process.exit(1);
}

const result = validateSourceMentionsForDate(date);

if (result.checked.length === 0) {
  console.error(`${date} の日記が見つかりませんでした。`);
  process.exit(1);
}

if (result.findings.length > 0) {
  console.error(formatSourceMentionFindings(result));
  process.exit(1);
}

console.log(`${date} の素材取得元名チェックを通過しました。対象: ${result.checked.length}件`);
