import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const evidenceDir = resolve("evidence/diary-semantic-3pass-2026-07-30");
const targets = [
  {
    source: "diary-voices-2026-06-20.html",
    output: "voice-page-final-2026-06-20.png",
    fullPage: true,
  },
  {
    source: "diary.html",
    output: "diary-page-final-2026-07.png",
    fullPage: false,
  },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 1,
});

for (const target of targets) {
  await page.goto(pathToFileURL(resolve(target.source)).href, {
    waitUntil: "networkidle",
  });
  await page.screenshot({
    path: resolve(evidenceDir, target.output),
    fullPage: target.fullPage,
  });
}

await browser.close();
