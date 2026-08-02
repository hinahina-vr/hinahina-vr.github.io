import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const DIARY_DIR = join(ROOT, "diary");
const CONTEXT_DIR = join(ROOT, ".local", "daily-context");
const OVERRIDE_PATH = join(ROOT, "data", "diary-source-overrides.json");
const RULE_START = "2026-04-01";

function hasContextActivity(context) {
  const swarm = context?.sources?.swarm?.items ?? [];
  const x = (context?.sources?.x?.items ?? []).filter((item) => item.kind !== "repost");
  return swarm.length > 0 || x.length > 0;
}

const diaryDates = new Set(
  readdirSync(DIARY_DIR)
    .map((name) => basename(name, ".md").match(/^(2026-\d{2}-\d{2})_/)?.[1])
    .filter((date) => date && date >= RULE_START),
);
const lastDiaryDate = [...diaryDates].sort().at(-1);
const activityDates = new Set();

if (existsSync(CONTEXT_DIR)) {
  for (const name of readdirSync(CONTEXT_DIR)) {
    const date = basename(name, ".json");
    if (!/^2026-\d{2}-\d{2}$/.test(date)) continue;
    if (date < RULE_START || date > lastDiaryDate) continue;
    const context = JSON.parse(readFileSync(join(CONTEXT_DIR, name), "utf8"));
    if (hasContextActivity(context)) activityDates.add(date);
  }
}

if (existsSync(OVERRIDE_PATH)) {
  const overrides = JSON.parse(readFileSync(OVERRIDE_PATH, "utf8"));
  for (const [date, value] of Object.entries(overrides)) {
    if (date < RULE_START || date > lastDiaryDate) continue;
    if ((value?.swarm?.length ?? 0) > 0 || (value?.x?.length ?? 0) > 0) {
      activityDates.add(date);
    }
  }
}

const withoutActivity = [...diaryDates].filter((date) => !activityDates.has(date)).sort();

if (withoutActivity.length > 0) {
  console.error(`根拠のない日記: ${withoutActivity.join(", ")}`);
  process.exit(1);
}

console.log(
  `Source activity passed: all ${diaryDates.size} diary dates from ` +
  `${RULE_START} through ${lastDiaryDate} have X or Swarm activity.`,
);
