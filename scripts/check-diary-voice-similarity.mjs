import {
  collectDiaryMarkdownFiles,
} from "./lib/diary-self-date.mjs";
import {
  analyzeVoiceSimilarityForDate,
  formatVoiceSimilarityFindings,
  selectVoiceSimilarityTargetDates,
} from "./lib/diary-voice-similarity.mjs";

function parseArgs(argv) {
  const args = { all: false, date: null, from: null, to: null };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--all") {
      args.all = true;
      continue;
    }

    if (arg === "--date") {
      args.date = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg === "--from") {
      args.from = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg === "--to") {
      args.to = argv[index + 1] ?? null;
      index += 1;
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
const targetDates = selectVoiceSimilarityTargetDates(files, args);

if (targetDates.length === 0) {
  console.error("対象の日記が見つかりませんでした。");
  process.exit(1);
}

const results = targetDates.map((date) => analyzeVoiceSimilarityForDate(date, { files }));
const failures = results.filter((result) => result.findings.length > 0);

if (failures.length > 0) {
  console.error(failures.map(formatVoiceSimilarityFindings).join("\n\n"));
  process.exit(1);
}

for (const result of results) {
  console.log(
    `${result.date} の声の束類似度チェックを通過しました。対象: ${result.checked.length}件 / ` +
      `pairs=${result.pairCount} / mean=${result.stats.mean.toFixed(4)} / ` +
      `p95=${result.stats.p95.toFixed(4)} / max=${result.stats.max.toFixed(4)}`,
  );
}
