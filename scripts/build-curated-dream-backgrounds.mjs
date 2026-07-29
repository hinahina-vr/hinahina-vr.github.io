import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { chromium } from "playwright";

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

function imageMimeType(file) {
  const extension = extname(file).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  return "image/png";
}

function chromeExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    process.env.LOCALAPPDATA
      ? join(process.env.LOCALAPPDATA, "Google/Chrome/Application/chrome.exe")
      : null,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

async function convertToWebp(page, sourceFile) {
  const source = await readFile(sourceFile);
  const dataUrl = `data:${imageMimeType(sourceFile)};base64,${source.toString("base64")}`;
  const webpDataUrl = await page.evaluate(async (url) => {
    const image = new Image();
    image.src = url;
    await image.decode();

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    return canvas.toDataURL("image/webp", 0.82);
  }, dataUrl);

  const prefix = "data:image/webp;base64,";
  if (!webpDataUrl.startsWith(prefix)) {
    throw new Error(`${sourceFile}: WebP変換に失敗しました。`);
  }
  return Buffer.from(webpDataUrl.slice(prefix.length), "base64");
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

const launchOptions = { headless: true };
const executablePath = chromeExecutable();
if (executablePath) launchOptions.executablePath = executablePath;
const browser = await chromium.launch(launchOptions);

try {
  const page = await browser.newPage();
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
    const webp = await convertToWebp(page, sourceCover);
    const targetDir = join(BACKGROUND_DIR, scenarioName);
    await rm(targetDir, { recursive: true, force: true });
    await mkdir(targetDir, { recursive: true });
    for (const key of backgroundKeys) {
      await writeFile(join(targetDir, `${key}.webp`), webp);
      backgroundCount += 1;
    }
  }
} finally {
  await browser.close();
}

console.log(
  `Generated ${backgroundCount} dream background bindings for ${scenarioFiles.length} scenarios.`,
);
