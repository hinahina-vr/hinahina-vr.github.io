import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import {
  DAILY_CONTEXT_DIR,
  addDays,
  hasDiarySourceActivity,
  pathExists,
} from "./lib/daily-context.mjs";

const ROOT_DIR = join(import.meta.dirname, "..");
const DIARY_DIR = join(ROOT_DIR, "diary");
const OVERRIDE_PATH = join(ROOT_DIR, "data", "diary-source-overrides.json");

function parseArgs(argv) {
  const options = {
    from: "2026-01-01",
    to: "2026-07-29",
    output: join(ROOT_DIR, ".local", "diary-source-ledger.md"),
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--from" || arg === "--to" || arg === "--output") {
      const value = argv[index + 1];
      if (!value) throw new Error(`${arg} requires a value`);
      options[arg.slice(2)] = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function clip(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function datesBetween(from, to) {
  const dates = [];
  for (let date = from; date <= to; date = addDays(date, 1)) dates.push(date);
  return dates;
}

function parseDiaryFilename(filename) {
  const match = basename(filename, ".md").match(/^(\d{4}-\d{2}-\d{2})_(.+)$/);
  return match ? { date: match[1], title: match[2], filename } : null;
}

async function main() {
  const options = parseArgs(process.argv);
  const overrides = (await pathExists(OVERRIDE_PATH))
    ? JSON.parse(await readFile(OVERRIDE_PATH, "utf-8"))
    : {};
  const diaryFiles = (await readdir(DIARY_DIR))
    .filter((filename) => filename.endsWith(".md"))
    .map(parseDiaryFilename)
    .filter(Boolean);
  const diaryByDate = new Map();
  for (const item of diaryFiles) {
    if (!diaryByDate.has(item.date)) diaryByDate.set(item.date, []);
    diaryByDate.get(item.date).push(item);
  }

  const lines = [
    "# 日記一次資料台帳",
    "",
    `対象: ${options.from} から ${options.to}`,
    "",
  ];
  let activeCount = 0;

  for (const date of datesBetween(options.from, options.to)) {
    const contextPath = join(DAILY_CONTEXT_DIR, `${date}.json`);
    const context = (await pathExists(contextPath))
      ? JSON.parse(await readFile(contextPath, "utf-8"))
      : null;
    const override = overrides[date] ?? null;
    const hasOverrideActivity =
      (override?.swarm?.length ?? 0) > 0 || (override?.x?.length ?? 0) > 0;
    if (!(context && hasDiarySourceActivity(context)) && !hasOverrideActivity) continue;
    activeCount += 1;

    lines.push(`## ${date}`);
    const existing = diaryByDate.get(date) ?? [];
    lines.push(`- 既存本文: ${existing.length > 0 ? existing.map((item) => item.filename).join(" / ") : "なし"}`);

    const swarmItems = [
      ...(context?.sources?.swarm?.items ?? []),
      ...(override?.swarm ?? []),
    ];
    if (swarmItems.length === 0) {
      lines.push("- Swarm: なし");
    } else {
      for (const item of swarmItems) {
        lines.push(`- Swarm: ${item.checkedInAt} | ${clip(item.venueName)} | ${clip(item.venueArea)}${item.shout ? ` | ${clip(item.shout)}` : ""}`);
      }
    }

    const xItems = [
      ...(context?.sources?.x?.items ?? []).filter((item) => item.kind !== "repost"),
      ...(override?.x ?? []),
    ];
    if (xItems.length === 0) {
      lines.push("- X: なし");
    } else {
      for (const item of xItems) {
        const timestamp = item.postedAt ?? item.recordedAt ?? "時刻不明";
        const source = item.tweetUrl
          ? ` | ${item.tweetUrl}`
          : override?.provenance
            ? ` | 出典: ${override.provenance}`
            : "";
        lines.push(`- X: ${timestamp} | ${item.kind} | ${clip(item.text) || "(本文なし)"}${source}`);
      }
    }
    lines.push("");
  }

  lines.splice(3, 0, `活動日数: ${activeCount}`);
  await writeFile(options.output, `${lines.join("\n")}\n`, "utf-8");
  console.log(`[source-ledger] ${activeCount} active dates -> ${options.output}`);
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exit(1);
});
