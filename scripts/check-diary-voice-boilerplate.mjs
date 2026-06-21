import {
  collectDiaryMarkdownFiles,
} from "./lib/diary-self-date.mjs";
import {
  formatVoiceBoilerplateFindings,
  selectVoiceBoilerplateTargetDates,
  validateVoiceBoilerplateForDate,
} from "./lib/diary-voice-boilerplate.mjs";

function parseArgs(argv) {
  const args = { all: false, date: null, from: null, to: null };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--all") {
      args.all = true;
      continue;
    }

    if (arg === "--date") {
      args.date = argv[i + 1] ?? null;
      i += 1;
      continue;
    }

    if (arg === "--from") {
      args.from = argv[i + 1] ?? null;
      i += 1;
      continue;
    }

    if (arg === "--to") {
      args.to = argv[i + 1] ?? null;
      i += 1;
      continue;
    }

    if (!arg.startsWith("-") && !args.date) {
      args.date = arg;
    }
  }

  return args;
}

const args = parseArgs(process.argv.slice(2));
const files = collectDiaryMarkdownFiles();
const targetDates = selectVoiceBoilerplateTargetDates(files, args);

if (targetDates.length === 0) {
  console.error("対象の日記が見つかりませんでした。");
  process.exit(1);
}

const results = targetDates.map((date) => validateVoiceBoilerplateForDate(date, { files }));
const failures = results.filter((result) => result.findings.length > 0);

if (failures.length > 0) {
  console.error(failures.map(formatVoiceBoilerplateFindings).join("\n\n"));
  process.exit(1);
}

for (const result of results) {
  console.log(`${result.date} の声の束テンプレ句チェックを通過しました。対象: ${result.checked.length}件`);
}
