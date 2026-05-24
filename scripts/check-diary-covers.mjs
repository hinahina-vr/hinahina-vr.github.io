import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { basename, join } from "node:path";

const ROOT_DIR = join(import.meta.dirname, "..");
const DIARY_DIR = join(ROOT_DIR, "diary");
const COVER_DIR = join(ROOT_DIR, "assets", "diary-covers");
const COVER_EXTENSIONS = [".webp", ".png", ".jpg", ".jpeg"];

function parseArgs(argv) {
  const args = {
    date: null,
    dateFrom: null,
    dateTo: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--date") {
      args.date = argv[i + 1] ?? null;
      i += 1;
    } else if (arg === "--date-from") {
      args.dateFrom = argv[i + 1] ?? null;
      i += 1;
    } else if (arg === "--date-to") {
      args.dateTo = argv[i + 1] ?? null;
      i += 1;
    }
  }

  return args;
}

function parseDiaryFilename(filename) {
  const slug = basename(filename, ".md");
  const match = slug.match(/^(\d{4}-\d{2}-\d{2})_(.+)$/);
  if (!match) return null;
  return { filename, slug, date: match[1], title: match[2] };
}

function isWithinRange(entry, args) {
  if (args.date && entry.date !== args.date) return false;
  if (args.dateFrom && entry.date < args.dateFrom) return false;
  if (args.dateTo && entry.date > args.dateTo) return false;
  return true;
}

function findCoverAsset(slug) {
  return COVER_EXTENSIONS
    .map((extension) => join(COVER_DIR, `${slug}${extension}`))
    .find((candidate) => existsSync(candidate));
}

const args = parseArgs(process.argv.slice(2));
const files = await readdir(DIARY_DIR);
const entries = files
  .filter((file) => file.endsWith(".md") && !file.includes("下書き"))
  .map((file) => parseDiaryFilename(file))
  .filter(Boolean)
  .filter((entry) => isWithinRange(entry, args))
  .sort((a, b) => a.date.localeCompare(b.date) || a.slug.localeCompare(b.slug));

if (entries.length === 0) {
  console.error("対象の日記が見つかりませんでした。");
  process.exit(1);
}

const missing = entries.filter((entry) => !findCoverAsset(entry.slug));

if (missing.length > 0) {
  console.error("日記カバー画像がありません。PNG/JPEG/WebP の実画像を用意してください。SVGフォールバックは不可です。");
  for (const entry of missing) {
    console.error(`- ${entry.date}: ${entry.title} (${entry.slug})`);
  }
  process.exit(1);
}

console.log(`日記カバー画像チェックを通過しました。対象: ${entries.length}件`);
