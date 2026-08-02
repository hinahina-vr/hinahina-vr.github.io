import {
  findLatestMainDiaryDate,
  formatVoiceFindings,
  validateAllCharacterVoices,
  validateCharacterVoicesForDate,
} from "./lib/diary-character-voice.mjs";

function parseArgs(argv) {
  const args = { date: null, all: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--all") args.all = true;
    else if (argv[i] === "--date") {
      args.date = argv[i + 1] ?? null;
      i += 1;
    } else if (!argv[i].startsWith("-") && !args.date) args.date = argv[i];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const result = args.all
  ? validateAllCharacterVoices()
  : validateCharacterVoicesForDate(args.date ?? findLatestMainDiaryDate());

if (result.findings.length > 0) {
  console.error(formatVoiceFindings(result));
  process.exit(1);
}

if (args.all) console.log(`全${result.dates.length}日・${result.checked}件のキャラ口調チェックを通過しました。`);
else console.log(`${result.date} のキャラ口調チェックを通過しました。対象: ${result.checked.length}件`);
