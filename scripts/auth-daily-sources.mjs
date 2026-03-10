import { chromium } from "playwright";
import { rm } from "node:fs/promises";
import { AUTH_DIR, cleanupAuthProfileLocks, ensureDir, loadDailyContextConfig } from "./lib/daily-context.mjs";

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function looksLoggedOut(sourceName, url, bodyText) {
  const condensed = normalizeWhitespace(bodyText);

  if (sourceName === "x") {
    return url.includes("/i/flow/login")
      || condensed.includes("sign in to x")
      || condensed.includes("join x today")
      || condensed.includes("happening now");
  }

  return /login|signin/.test(url)
    || condensed.includes("log in")
    || condensed.includes("sign in")
    || condensed.includes("join foursquare");
}

async function waitForLogin(page, sourceName, timeoutMs = 240000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const url = page.url().toLowerCase();
    const bodyText = await page.locator("body").innerText().catch(() => "");

    if (!looksLoggedOut(sourceName, url, bodyText)) {
      return true;
    }

    await page.waitForTimeout(1500);
  }

  return false;
}

async function main() {
  const config = await loadDailyContextConfig();
  await rm(AUTH_DIR, { recursive: true, force: true });
  await ensureDir(AUTH_DIR);
  await cleanupAuthProfileLocks();

  const context = await chromium.launchPersistentContext(AUTH_DIR, {
    channel: config.browserChannel,
    headless: false,
    ignoreDefaultArgs: ["--enable-automation"],
    viewport: { width: 1440, height: 960 },
    args: ["--disable-blink-features=AutomationControlled"],
  });

  try {
    const swarmPage = context.pages()[0] ?? await context.newPage();
    await swarmPage.goto(config.swarmHistoryUrl, { waitUntil: "domcontentloaded", timeout: 45000 });

    const xPage = await context.newPage();
    await xPage.goto(`https://x.com/${config.xHandle}`, { waitUntil: "domcontentloaded", timeout: 45000 });

    console.log("[daily-context] Chrome を開きました。このウィンドウで Swarm と X にログインしてください。");
    console.log("[daily-context] ログイン状態を最大4分待機して自動保存します。");

    const status = await Promise.all([
      waitForLogin(swarmPage, "swarm"),
      waitForLogin(xPage, "x"),
    ]);

    if (status.some((ok) => !ok)) {
      throw new Error("Timed out waiting for login completion");
    }
  } finally {
    await context.close();
  }

  console.log(`[daily-context] 認証状態を保存しました: ${AUTH_DIR}`);
}

main().catch((error) => {
  console.error("[daily-context] auth failed");
  console.error(error);
  process.exit(1);
});
