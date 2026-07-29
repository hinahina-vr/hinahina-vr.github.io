import { copyFile, mkdir, readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, extname, join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const DIARY_DIR = join(ROOT, "diary");
const SCENARIO_DIR = join(ROOT, "scenarios");
const BACKGROUND_DIR = join(SCENARIO_DIR, "bg");
const COVER_DIR = join(ROOT, "assets", "diary-covers");
const SCENARIO_PATTERN = /^(2026-\d{2}-\d{2})_.+\.json$/;
const COVER_EXTENSIONS = [".webp", ".png", ".jpg", ".jpeg"];

function sanitizeBackgroundKey(value) {
  return value.replace(/[^a-z0-9_]/gi, "_");
}

async function coverForDate(date) {
  const diaryFile = (await readdir(DIARY_DIR))
    .find((name) => name.startsWith(`${date}_`) && name.endsWith(".md"));
  if (!diaryFile) {
    throw new Error(`${date}: 対応する本編日記がありません。`);
  }

  const slug = basename(diaryFile, extname(diaryFile));
  for (const extension of COVER_EXTENSIONS) {
    const cover = join(COVER_DIR, `${slug}${extension}`);
    if (existsSync(cover)) return cover;
  }
  throw new Error(`${date}: 対応するImageGenカバーがありません。`);
}

const scenarioFiles = (await readdir(SCENARIO_DIR))
  .filter((name) => SCENARIO_PATTERN.test(name))
  .sort();
let backgroundCount = 0;

for (const file of scenarioFiles) {
  const date = file.match(SCENARIO_PATTERN)[1];
  const scenarioName = basename(file, ".json");
  const scenario = JSON.parse(await readFile(join(SCENARIO_DIR, file), "utf8"));
  const backgroundKeys = new Set(
    (scenario.scenario ?? [])
      .map((step) => step?.bg)
      .filter((value) => typeof value === "string" && value.length > 0)
      .map(sanitizeBackgroundKey),
  );
  if (backgroundKeys.size === 0) {
    throw new Error(`${file}: 背景指定がありません。`);
  }

  const sourceCover = await coverForDate(date);
  const targetDir = join(BACKGROUND_DIR, scenarioName);
  await mkdir(targetDir, { recursive: true });
  for (const key of backgroundKeys) {
    await copyFile(sourceCover, join(targetDir, `${key}.webp`));
    await copyFile(sourceCover, join(targetDir, `${key}.png`));
    backgroundCount += 2;
  }
}

console.log(
  `Generated ${backgroundCount} dream background bindings for ${scenarioFiles.length} scenarios.`,
);
