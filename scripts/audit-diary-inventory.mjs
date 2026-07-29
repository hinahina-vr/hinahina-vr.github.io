import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";

const root = join(import.meta.dirname, "..");
const datePattern = /^(2026-\d{2}-\d{2})_/;
const overridePath = join(root, "data", "diary-source-overrides.json");

function listFiles(dir, extension) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((name) => join(dir, name))
    .filter((file) => statSync(file).isFile())
    .filter((file) => !extension || file.endsWith(extension));
}

function dateFromFile(file) {
  return basename(file).match(datePattern)?.[1] ?? null;
}

function countByDate(files) {
  const counts = new Map();
  for (const file of files) {
    const date = dateFromFile(file);
    if (!date) continue;
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }
  return counts;
}

function readActivityDates() {
  const contextDir = join(root, ".local", "daily-context");
  const dates = [];

  for (const file of listFiles(contextDir, ".json")) {
    const date = basename(file, ".json");
    if (!/^2026-\d{2}-\d{2}$/.test(date)) continue;

    const context = JSON.parse(readFileSync(file, "utf8"));
    const swarmItems = context.sources?.swarm?.items ?? [];
    const xItems = context.sources?.x?.items ?? [];
    const hasActivity =
      swarmItems.length > 0 || xItems.some((item) => item.kind !== "repost");

    if (hasActivity) dates.push(date);
  }

  if (existsSync(overridePath)) {
    const overrides = JSON.parse(readFileSync(overridePath, "utf8"));
    for (const [date, value] of Object.entries(overrides)) {
      if ((value?.swarm?.length ?? 0) > 0 || (value?.x?.length ?? 0) > 0) {
        dates.push(date);
      }
    }
  }

  return [...new Set(dates)].sort();
}

const mainFiles = listFiles(join(root, "diary"), ".md");
const voiceDirectories = readdirSync(root)
  .filter((name) => name.startsWith("diary-"))
  .filter((name) => statSync(join(root, name)).isDirectory());
const voiceFiles = voiceDirectories.flatMap((dir) => listFiles(join(root, dir), ".md"));
const scenarioFiles = listFiles(join(root, "scenarios")).filter((file) =>
  /\.(?:md|json)$/i.test(file),
);

const mainCounts = countByDate(mainFiles);
const voiceCounts = countByDate(voiceFiles);
const scenarioCounts = countByDate(scenarioFiles);
const activityDates = readActivityDates();
const allDates = [...new Set([...mainCounts.keys(), ...voiceCounts.keys()])].sort();

console.log(`main_files=${mainFiles.length}`);
console.log(`voice_directories=${voiceDirectories.length}`);
console.log(`voice_files=${voiceFiles.length}`);
console.log(`scenario_files=${scenarioFiles.length}`);
console.log(`first_diary_date=${allDates[0] ?? "none"}`);
console.log(`last_diary_date=${allDates.at(-1) ?? "none"}`);
console.log(`cached_activity_first=${activityDates[0] ?? "none"}`);
console.log(`cached_activity_last=${activityDates.at(-1) ?? "none"}`);
console.log(`cached_activity_dates=${activityDates.length}`);
console.log("");
console.log("date\tmain\tvoices\tscenarios\tcached_activity");

for (const date of [...new Set([...allDates, ...activityDates])].sort()) {
  console.log(
    [
      date,
      mainCounts.get(date) ?? 0,
      voiceCounts.get(date) ?? 0,
      scenarioCounts.get(date) ?? 0,
      activityDates.includes(date) ? "yes" : "no",
    ].join("\t"),
  );
}
