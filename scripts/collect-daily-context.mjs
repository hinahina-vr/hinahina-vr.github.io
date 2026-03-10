import { readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { chromium } from "playwright";
import {
  AUTH_DIR,
  DAILY_CONTEXT_DIR,
  DEBUG_DIR,
  RAW_DIR,
  addDays,
  buildCandidateTopics,
  cleanupAuthProfileLocks,
  ensureDir,
  getDateStringForValue,
  getDateStringInTimeZone,
  loadDailyContextConfig,
  pathExists,
  renderDailyContextBlock,
  resolveMainDiaryFile,
  upsertDailyContextBlock,
} from "./lib/daily-context.mjs";

const DEFAULT_CDP_URL = "http://127.0.0.1:9222";

function parseArgs(argv) {
  const options = {
    bestEffort: false,
    headed: false,
    date: null,
    file: null,
    existingChrome: false,
    cdpUrl: DEFAULT_CDP_URL,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--best-effort") {
      options.bestEffort = true;
      continue;
    }
    if (arg === "--headed") {
      options.headed = true;
      continue;
    }
    if (arg === "--date") {
      if (!argv[index + 1]) throw new Error("--date requires a value");
      options.date = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--file") {
      if (!argv[index + 1]) throw new Error("--file requires a value");
      options.file = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--existing-chrome") {
      options.existingChrome = true;
      continue;
    }
    if (arg === "--cdp-url") {
      if (!argv[index + 1]) throw new Error("--cdp-url requires a value");
      options.cdpUrl = argv[index + 1];
      index += 1;
      continue;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(arg) && !options.date) {
      options.date = arg;
      continue;
    }

    if (arg === "best-effort") {
      options.bestEffort = true;
      continue;
    }

    if (arg === "headed") {
      options.headed = true;
      continue;
    }
    if (arg === "existing-chrome") {
      options.existingChrome = true;
      continue;
    }

    if (arg.endsWith(".md") && !options.file) {
      options.file = arg;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function uniqueBy(items, keyFn) {
  const seen = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!seen.has(key)) seen.set(key, item);
  }
  return [...seen.values()];
}

function classifyXKind(rawText, text, statusLinkCount) {
  if (/replying to/i.test(rawText)) return "reply";
  if (/reposted/i.test(rawText) || /retweeted/i.test(rawText)) return "repost";
  if (/quote/i.test(rawText) && statusLinkCount > 1) return "quote";
  if (statusLinkCount > 1 && rawText.includes(text)) return "quote";
  return "post";
}

function isLoginErrorText(sourceName, url, bodyText) {
  const condensed = normalizeWhitespace(bodyText).toLowerCase();

  if (sourceName === "x") {
    return url.includes("/i/flow/login")
      || condensed.includes("sign in to x")
      || condensed.includes("join x today")
      || condensed.includes("happening now")
      || condensed.includes("xにログイン")
      || condensed.includes("アカウント作成");
  }

  return /login|signin/.test(url)
    || condensed.includes("log in")
    || condensed.includes("sign in")
    || condensed.includes("join foursquare");
}

function isXLoginRedirect(page) {
  return page.url().includes("/i/flow/login");
}

async function assertLoggedIn(page, sourceName) {
  const url = page.url().toLowerCase();
  const bodyText = await page.locator("body").innerText().catch(() => "");
  if (isLoginErrorText(sourceName, url, bodyText)) {
    throw new Error(`${sourceName.toUpperCase()} login appears to be missing. Run npm run auth:daily-sources`);
  }
}

async function saveDebugArtifacts(page, slug, error) {
  if (!page) return;

  await ensureDir(DEBUG_DIR);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = join(DEBUG_DIR, `${timestamp}-${slug}`);

  await ensureDir(dir);

  const metadata = {
    slug,
    error: error?.message ?? String(error),
    url: page.url(),
    title: await page.title().catch(() => null),
    capturedAt: new Date().toISOString(),
  };

  await writeFile(join(dir, "meta.json"), JSON.stringify(metadata, null, 2), "utf-8");
  await writeFile(join(dir, "page.html"), await page.content(), "utf-8").catch(() => {});
  await page.screenshot({ path: join(dir, "page.png"), fullPage: true }).catch(() => {});
}

async function scrollForMore(page) {
  const before = await page.evaluate(() => document.scrollingElement?.scrollHeight ?? document.body.scrollHeight);
  await page.mouse.wheel(0, 1800);
  await page.waitForTimeout(1200);
  const after = await page.evaluate(() => document.scrollingElement?.scrollHeight ?? document.body.scrollHeight);
  return after > before;
}

async function extractSwarmSnapshot(page) {
  return page.evaluate(() => {
    const normalize = (value) => (value || "").replace(/\s+/g, " ").trim();
    const absoluteUrl = (href) => {
      if (!href) return null;
      try {
        return new URL(href, window.location.href).toString();
      } catch {
        return href;
      }
    };

    const containers = new Set();
    const venueSelector = "a[href*='/v/'], a[href*='foursquare.com/v/'], a[href*='swarmapp.com/c/']";

    for (const timeEl of document.querySelectorAll("time")) {
      let container = timeEl.parentElement;
      for (let depth = 0; container && depth < 6; depth += 1) {
        if (container.querySelector(venueSelector)) {
          containers.add(container);
          break;
        }
        container = container.parentElement;
      }
    }

    for (const link of document.querySelectorAll(venueSelector)) {
      let container = link.parentElement;
      for (let depth = 0; container && depth < 5; depth += 1) {
        const text = normalize(container.innerText);
        if (text.length > 0 && text.length < 600) {
          containers.add(container);
          break;
        }
        container = container.parentElement;
      }
    }

    return [...containers].map((container) => {
      const timeEl = container.querySelector("time");
      const timeText = normalize(timeEl?.textContent);
      const datetime = timeEl?.getAttribute("datetime") ?? null;
      const links = [...container.querySelectorAll("a[href]")].map((link) => ({
        href: absoluteUrl(link.getAttribute("href")),
        text: normalize(link.textContent),
      }));
      const venueLink = links.find((link) => /\/v\/|foursquare\.com\/v\//i.test(link.href || "")) ?? null;
      const sourceLink = links.find((link) => /swarmapp\.com\/c\/|\/checkin\//i.test(link.href || "")) ?? venueLink;
      const areaLink = links.find((link) => link.text && link.text !== venueLink?.text && !/\/c\/|\/checkin\//i.test(link.href || ""));
      const lines = container.innerText.split(/\n+/).map(normalize).filter(Boolean);
      const filteredLines = lines.filter((line) => {
        if (!line) return false;
        if (line === timeText) return false;
        if (line === venueLink?.text) return false;
        if (line === areaLink?.text) return false;
        if (/^(check in|checked in|with \d+|friends?|likes?)$/i.test(line)) return false;
        if (/^\d{1,2}:\d{2}/.test(line)) return false;
        return true;
      });

      return {
        datetime,
        timeText,
        venueName: venueLink?.text ?? null,
        venueArea: areaLink?.text ?? null,
        venueUrl: venueLink?.href ?? null,
        sourceUrl: sourceLink?.href ?? window.location.href,
        shout: filteredLines[0] ?? null,
        rawText: normalize(container.innerText),
      };
    }).filter((item) => item.venueName || item.rawText);
  });
}

async function collectSwarmForDate(page, date, timeZone, config) {
  await page.goto(config.swarmHistoryUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  await assertLoggedIn(page, "swarm");

  const collected = [];
  let stagnantPasses = 0;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const snapshot = await extractSwarmSnapshot(page);
    const items = snapshot
      .map((item) => {
        const checkedInAt = item.datetime ? new Date(item.datetime).toISOString() : null;
        if (!checkedInAt) return null;
        if (getDateStringForValue(checkedInAt, timeZone) !== date) return null;
        return {
          checkedInAt,
          venueName: item.venueName,
          venueArea: item.venueArea,
          venueUrl: item.venueUrl,
          shout: item.shout,
          sourceUrl: item.sourceUrl,
        };
      })
      .filter(Boolean);

    const beforeCount = collected.length;
    collected.push(...items);
    const unique = uniqueBy(collected, (item) => `${item.checkedInAt}|${item.venueName}|${item.sourceUrl}`);
    collected.length = 0;
    collected.push(...unique);

    if (collected.length === beforeCount) stagnantPasses += 1;
    else stagnantPasses = 0;

    if (stagnantPasses >= 2) break;
    if (!(await scrollForMore(page))) stagnantPasses += 1;
  }

  collected.sort((left, right) => left.checkedInAt.localeCompare(right.checkedInAt));

  return {
    sourceUrl: page.url(),
    items: collected,
  };
}

function buildXSearchUrl(handle, date) {
  const nextDate = addDays(date, 1);
  const query = `(from:${handle}) since:${date} until:${nextDate}`;
  return `https://x.com/search?q=${encodeURIComponent(query)}&src=typed_query&f=live`;
}

async function extractXSnapshot(page) {
  return page.evaluate(() => {
    const normalize = (value) => (value || "").replace(/\s+/g, " ").trim();
    const absoluteUrl = (href) => {
      if (!href) return null;
      try {
        return new URL(href, window.location.href).toString();
      } catch {
        return href;
      }
    };

    const articleNodes = [...document.querySelectorAll("article[data-testid='tweet']")];
    return articleNodes.map((article) => {
      const timeEl = article.querySelector("time");
      const statusLinkNodes = [...article.querySelectorAll("a[href*='/status/']")];
      const statusHref = timeEl?.closest("a")?.getAttribute("href")
        ?? statusLinkNodes[0]?.getAttribute("href")
        ?? null;
      const text = [...article.querySelectorAll("[data-testid='tweetText']")]
        .map((node) => node.innerText)
        .join("\n")
        .trim();
      const rawText = normalize(article.innerText);
      const mediaUrls = [...article.querySelectorAll("img[src]")]
        .map((image) => image.getAttribute("src"))
        .filter((src) => src && !/profile_images|emoji|abs-0\.twimg\.com/i.test(src));

      return {
        datetime: timeEl?.getAttribute("datetime") ?? null,
        statusUrl: absoluteUrl(statusHref),
        rawText,
        text,
        statusLinkCount: statusLinkNodes.length,
        mediaUrls,
      };
    }).filter((item) => item.statusUrl && item.datetime);
  });
}

async function collectXForDate(page, date, timeZone, config) {
  await page.goto(buildXSearchUrl(config.xHandle, date), { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  if (isXLoginRedirect(page)) {
    await page.goto(`https://x.com/${config.xHandle}/with_replies`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  }

  const xBodyText = await page.locator("body").innerText().catch(() => "");
  const xArticleCount = await page.locator("article[data-testid='tweet']").count().catch(() => 0);
  if (xArticleCount === 0 && isLoginErrorText("x", page.url().toLowerCase(), xBodyText)) {
    throw new Error("X timeline could not be accessed from the current Chrome session");
  }

  const collected = [];
  let stagnantPasses = 0;

  for (let attempt = 0; attempt < 14; attempt += 1) {
    const snapshot = await extractXSnapshot(page);
    const items = snapshot
      .map((item) => {
        const tweetId = item.statusUrl.match(/status\/(\d+)/)?.[1] ?? null;
        if (!tweetId) return null;

        const postedAt = new Date(item.datetime).toISOString();
        if (getDateStringForValue(postedAt, timeZone) !== date) return null;

        return {
          postedAt,
          tweetId,
          text: item.text,
          tweetUrl: item.statusUrl,
          kind: classifyXKind(item.rawText, item.text, item.statusLinkCount),
          mediaUrls: item.mediaUrls,
        };
      })
      .filter(Boolean);

    const beforeCount = collected.length;
    collected.push(...items);
    const unique = uniqueBy(collected, (item) => item.tweetId);
    collected.length = 0;
    collected.push(...unique);

    if (collected.length === beforeCount) stagnantPasses += 1;
    else stagnantPasses = 0;

    if (stagnantPasses >= 2) break;
    if (!(await scrollForMore(page))) stagnantPasses += 1;
  }

  collected.sort((left, right) => left.postedAt.localeCompare(right.postedAt));

  return {
    sourceUrl: page.url(),
    items: collected,
  };
}

async function writeJson(path, value) {
  await writeFile(path, JSON.stringify(value, null, 2), "utf-8");
}

async function updateDiaryFile(targetFile, normalized) {
  const current = await readFile(targetFile.absPath, "utf-8");
  const block = renderDailyContextBlock(normalized);
  const updated = upsertDailyContextBlock(current, block);
  await writeFile(targetFile.absPath, updated, "utf-8");
}

async function openCollectionSession(options, config) {
  if (options.existingChrome) {
    const browser = await chromium.connectOverCDP(options.cdpUrl);
    const context = browser.contexts()[0];
    if (!context) {
      throw new Error(`No default browser context found at ${options.cdpUrl}`);
    }

    const swarmPage = await context.newPage();
    const xPage = await context.newPage();

    return {
      swarmPage,
      xPage,
      close: async () => {
        await swarmPage.close().catch(() => {});
        await xPage.close().catch(() => {});
      },
    };
  }

  if (!(await pathExists(AUTH_DIR))) {
    throw new Error(`Missing auth profile: ${AUTH_DIR}. Run npm run auth:daily-sources`);
  }
  await cleanupAuthProfileLocks();

  const context = await chromium.launchPersistentContext(AUTH_DIR, {
    channel: config.browserChannel,
    headless: !options.headed,
    ignoreDefaultArgs: ["--enable-automation"],
    viewport: { width: 1440, height: 960 },
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const swarmPage = context.pages()[0] ?? await context.newPage();
  const xPage = await context.newPage();

  return {
    swarmPage,
    xPage,
    close: async () => {
      await context.close().catch(() => {});
    },
  };
}

async function collectAndWrite(options) {
  const config = await loadDailyContextConfig();
  const fileDate = options.file ? basename(options.file).match(/^(\d{4}-\d{2}-\d{2})_/u)?.[1] : null;
  const date = options.date ?? fileDate ?? getDateStringInTimeZone(new Date(), config.timezone);
  const targetFile = await resolveMainDiaryFile({ date, file: options.file });

  if (!targetFile) {
    console.warn(`[daily-context] main diary not found for ${date}; skipped.`);
    return;
  }

  await ensureDir(DAILY_CONTEXT_DIR);
  await ensureDir(RAW_DIR);

  let swarmPage;
  let xPage;
  let session;

  try {
    session = await openCollectionSession(options, config);
    swarmPage = session.swarmPage;
    xPage = session.xPage;

    let swarm;
    try {
      swarm = await collectSwarmForDate(swarmPage, date, config.timezone, config);
      swarm = { status: "ok", note: null, ...swarm };
    } catch (error) {
      await saveDebugArtifacts(swarmPage, `swarm-${date}`, error);
      swarm = {
        status: "error",
        note: error.message,
        sourceUrl: swarmPage?.url?.() ?? config.swarmHistoryUrl,
        items: [],
      };
    }

    let x;
    try {
      x = await collectXForDate(xPage, date, config.timezone, config);
      x = { status: "ok", note: null, ...x };
    } catch (error) {
      await saveDebugArtifacts(xPage, `x-${date}`, error);
      x = {
        status: "error",
        note: error.message,
        sourceUrl: xPage?.url?.() ?? `https://x.com/${config.xHandle}`,
        items: [],
      };
    }

    if (swarm.status === "error" && x.status === "error") {
      throw new Error(`All sources failed: swarm=${swarm.note}; x=${x.note}`);
    }

    const normalized = {
      date,
      timezone: config.timezone,
      generatedAt: new Date().toISOString(),
      sources: {
        swarm,
        x,
      },
      candidateTopics: [],
    };

    normalized.candidateTopics = buildCandidateTopics(normalized);

    const swarmRaw = {
      date,
      collectedAt: normalized.generatedAt,
      status: swarm.status,
      note: swarm.note,
      sourceUrl: swarm.sourceUrl,
      items: swarm.items,
    };
    const xRaw = {
      date,
      collectedAt: normalized.generatedAt,
      status: x.status,
      note: x.note,
      sourceUrl: x.sourceUrl,
      items: x.items,
    };

    await writeJson(join(RAW_DIR, `${date}.swarm.json`), swarmRaw);
    await writeJson(join(RAW_DIR, `${date}.x.json`), xRaw);
    await writeJson(join(DAILY_CONTEXT_DIR, `${date}.json`), normalized);
    await updateDiaryFile(targetFile, normalized);

    console.log(`[daily-context] updated ${targetFile.relPath}`);
    console.log(`[daily-context] Swarm ${swarm.items.length}件 / X ${x.items.length}件`);
  } catch (error) {
    await saveDebugArtifacts(swarmPage, `swarm-${date}`, error);
    await saveDebugArtifacts(xPage, `x-${date}`, error);
    throw error;
  } finally {
    await session?.close().catch(() => {});
  }
}

async function main() {
  const options = parseArgs(process.argv);

  try {
    await collectAndWrite(options);
    if (options.existingChrome) process.exit(0);
  } catch (error) {
    if (options.bestEffort) {
      console.warn(`[daily-context] skipped: ${error.message}`);
      if (options.existingChrome) process.exit(0);
      return;
    }

    console.error("[daily-context] failed");
    console.error(error);
    process.exit(1);
  }
}

main();
