import {
  findLatestMainDiaryDate,
  formatVoiceFindings,
  validateCharacterVoicesForDate,
} from "./lib/diary-character-voice.mjs";

function parseArgs(argv) {
  const args = { date: null };

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--date") {
      args.date = argv[i + 1] ?? null;
      i += 1;
      continue;
    }

    if (!argv[i].startsWith("-") && !args.date) {
      args.date = argv[i];
    }
  }

  return args;
}

const { date: requestedDate } = parseArgs(process.argv.slice(2));
const date = requestedDate ?? findLatestMainDiaryDate();

if (!date) {
  console.error("日付を特定できませんでした。`--date YYYY-MM-DD` を指定してください。");
  process.exit(1);
}

const result = validateCharacterVoicesForDate(date);

if (result.findings.length > 0) {
  console.error(formatVoiceFindings(result));
  process.exit(1);
}

console.log(`${date} のキャラ口調チェックを通過しました。対象: ${result.checked.length}件`);
