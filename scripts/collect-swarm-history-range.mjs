import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import {
  DAILY_CONTEXT_DIR,
  RAW_DIR,
  addDays,
  buildBungouStyleRecommendation,
  buildCandidateTopics,
  ensureDir,
  getDateStringForValue,
  loadDailyContextConfig,
  pathExists,
} from "./lib/daily-context.mjs";

function parseArgs(argv) {
  const options = {
    from: null,
    to: null,
    cdpUrl: null,
    maxScrolls: 800,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--from" || arg === "--to" || arg === "--cdp-url" || arg === "--max-scrolls") {
      const value = argv[index + 1];
      if (!value) throw new Error(`${arg} requires a value`);
      const key = arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      options[key] = arg === "--max-scrolls" ? Number(value) : value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.from ?? "")) {
    throw new Error("--from must be YYYY-MM-DD");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.to ?? "")) {
    throw new Error("--to must be YYYY-MM-DD");
  }
  if (options.from > options.to) throw new Error("--from must not be after --to");
  if (!Number.isInteger(options.maxScrolls) || options.maxScrolls < 1) {
    throw new Error("--max-scrolls must be a positive integer");
  }
  return options;
}

function datesBetween(from, to) {
  const dates = [];
  for (let date = from; date <= to; date = addDays(date, 1)) dates.push(date);
  return dates;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf-8"));
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

async function extractSnapshot(page) {
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

    return [...document.querySelectorAll("#history .activity")].map((activity) => {
      const venueLink = activity.querySelector(".activity-checkinInfo-venue a[href]");
      const address = activity.querySelector(".activity-venueAddress .global");
      const timestamp = activity.querySelector(".timestamp[data-created-at]");
      const sourceLink = activity.querySelector("a.activity-lastSeenTime[href]")
        ?? activity.querySelector("a[href*='/checkin/'], a[href*='/user/'][href*='/checkin/']");
      const shoutNode = activity.querySelector(".activity-shout, .activity-message, .activity-comment");

      return {
        createdAt: timestamp?.getAttribute("data-created-at") ?? null,
        venueName: normalize(venueLink?.textContent) || null,
        venueArea: normalize(address?.textContent) || null,
        venueUrl: absoluteUrl(venueLink?.getAttribute("href")),
        sourceUrl: absoluteUrl(sourceLink?.getAttribute("href")) ?? window.location.href,
        shout: normalize(shoutNode?.textContent) || null,
      };
    }).filter((item) => item.createdAt);
  });
}

function normalizeItems(snapshot) {
  const seen = new Set();
  const items = [];

  for (const item of snapshot) {
    const milliseconds = Number(item.createdAt) * 1000;
    if (!Number.isFinite(milliseconds)) continue;
    const checkedInAt = new Date(milliseconds).toISOString();
    const key = `${checkedInAt}|${item.venueName}|${item.sourceUrl}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      checkedInAt,
      venueName: item.venueName,
      venueArea: item.venueArea,
      venueUrl: item.venueUrl,
      shout: item.shout,
      sourceUrl: item.sourceUrl,
    });
  }

  return items.sort((left, right) => left.checkedInAt.localeCompare(right.checkedInAt));
}

async function loadCompleteHistory(page, from, timeZone, maxScrolls) {
  const collected = new Map();
  let previousCount = 0;
  let stagnantPasses = 0;
  let oldestDate = null;

  for (let attempt = 0; attempt < maxScrolls; attempt += 1) {
    const snapshot = await extractSnapshot(page);
    for (const item of normalizeItems(snapshot)) {
      collected.set(`${item.checkedInAt}|${item.venueName}|${item.sourceUrl}`, item);
    }
    const items = [...collected.values()]
      .sort((left, right) => left.checkedInAt.localeCompare(right.checkedInAt));
    oldestDate = items.length > 0
      ? getDateStringForValue(items[0].checkedInAt, timeZone)
      : null;

    if (attempt % 10 === 0 || oldestDate <= from) {
      console.log(`[swarm-range] pass=${attempt + 1} items=${items.length} oldest=${oldestDate ?? "none"}`);
    }

    if (oldestDate && oldestDate <= from) return items;

    if (items.length === previousCount) stagnantPasses += 1;
    else stagnantPasses = 0;
    if (stagnantPasses >= 8) break;
    previousCount = items.length;

    await page.evaluate(() => {
      const root = document.scrollingElement ?? document.documentElement;
      root.scrollTo(0, root.scrollHeight);
    });
    await page.waitForTimeout(900);
  }

  for (const item of normalizeItems(await extractSnapshot(page))) {
    collected.set(`${item.checkedInAt}|${item.venueName}|${item.sourceUrl}`, item);
  }
  const finalItems = [...collected.values()]
    .sort((left, right) => left.checkedInAt.localeCompare(right.checkedInAt));
  oldestDate = finalItems.length > 0
    ? getDateStringForValue(finalItems[0].checkedInAt, timeZone)
    : null;
  if (!oldestDate || oldestDate > from) {
    throw new Error(`Swarm history stopped at ${oldestDate ?? "no dated item"}; requested ${from}`);
  }
  return finalItems;
}

function emptySource(status, note, sourceUrl = null) {
  return { status, note, sourceUrl, items: [] };
}

async function updateDailyContexts(items, options, config, sourceUrl) {
  const grouped = new Map();
  for (const item of items) {
    const date = getDateStringForValue(item.checkedInAt, config.timezone);
    if (date < options.from || date > options.to) continue;
    if (!grouped.has(date)) grouped.set(date, []);
    grouped.get(date).push(item);
  }

  await ensureDir(DAILY_CONTEXT_DIR);
  await ensureDir(RAW_DIR);

  for (const date of datesBetween(options.from, options.to)) {
    const path = join(DAILY_CONTEXT_DIR, `${date}.json`);
    const existing = await pathExists(path) ? await readJson(path) : null;
    const swarmItems = grouped.get(date) ?? [];
    const normalized = {
      date,
      timezone: config.timezone,
      generatedAt: new Date().toISOString(),
      sources: {
        swarm: {
          status: "ok",
          note: null,
          sourceUrl,
          items: swarmItems,
        },
        x: existing?.sources?.x ?? emptySource("skipped", "X was not collected in this pass"),
        health: existing?.sources?.health ?? {
          status: "skipped",
          note: "Health was not collected in this pass",
          source: null,
          exportedAt: null,
          device: null,
          summary: null,
        },
      },
      candidateTopics: [],
      bungouStyle: null,
    };
    normalized.candidateTopics = buildCandidateTopics(normalized);
    normalized.bungouStyle = buildBungouStyleRecommendation(normalized);

    await writeJson(path, normalized);
    await writeJson(join(RAW_DIR, `${date}.swarm.json`), {
      date,
      collectedAt: normalized.generatedAt,
      status: "ok",
      note: null,
      sourceUrl,
      items: swarmItems,
      payload: { collectionMode: "single-history-pass" },
    });
  }

  const activeDates = [...grouped.entries()]
    .filter(([, groupedItems]) => groupedItems.length > 0)
    .map(([date]) => date)
    .sort();
  console.log(`[swarm-range] wrote ${datesBetween(options.from, options.to).length} daily contexts`);
  console.log(`[swarm-range] activity on ${activeDates.length} dates: ${activeDates.join(", ") || "none"}`);
}

async function main() {
  const options = parseArgs(process.argv);
  const config = await loadDailyContextConfig();
  const cdpUrl = options.cdpUrl ?? config.browserDebugUrl;
  const browser = await chromium.connectOverCDP(cdpUrl);
  const context = browser.contexts()[0];
  if (!context) throw new Error(`No browser context at ${cdpUrl}`);
  const page = await context.newPage();

  try {
    await page.goto(config.swarmHistoryUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    const bodyText = await page.locator("body").innerText().catch(() => "");
    if (/log\s?in|sign\s?in|ログイン/i.test(`${page.url()}\n${bodyText.slice(0, 3000)}`)) {
      throw new Error("Swarm login appears to be missing");
    }
    await page.waitForSelector("#history .activity", { timeout: 15000 });

    const items = await loadCompleteHistory(page, options.from, config.timezone, options.maxScrolls);
    await updateDailyContexts(items, options, config, page.url());
  } finally {
    await page.close().catch(() => {});
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`[swarm-range] ${error.stack ?? error.message}`);
    process.exit(1);
  });
