import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "playwright";
import {
  DAILY_CONTEXT_DIR,
  DEBUG_DIR,
  RAW_DIR,
  addDays,
  buildCandidateTopics,
  ensureDir,
  getDateStringForValue,
  getDateStringInTimeZone,
  loadDailyContextConfig,
  pathExists,
  renderDailyContextBlock,
  resolveMainDiaryFile,
  upsertDailyContextBlock,
} from "./lib/daily-context.mjs";
import {
  cloneJson,
  createSkippedHealthSource,
  normalizeHealthExport,
} from "./lib/health-context.mjs";
import { buildAdbArgs, runCommand } from "./lib/adb.mjs";

function parseArgs(argv) {
  const options = {
    bestEffort: false,
    date: null,
    file: null,
    cdpUrl: null,
    skipHealth: false,
    healthFile: null,
    adbSerial: null,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--best-effort") {
      options.bestEffort = true;
      continue;
    }
    if (arg === "--headed" || arg === "--existing-chrome") {
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
    if (arg === "--cdp-url") {
      if (!argv[index + 1]) throw new Error("--cdp-url requires a value");
      options.cdpUrl = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--skip-health") {
      options.skipHealth = true;
      continue;
    }
    if (arg === "--health-file") {
      if (!argv[index + 1]) throw new Error("--health-file requires a value");
      options.healthFile = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--adb-serial") {
      if (!argv[index + 1]) throw new Error("--adb-serial requires a value");
      options.adbSerial = argv[index + 1];
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

    if (arg === "headed" || arg === "existing-chrome") {
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

function buildSwarmErrorSource(note, config, existing) {
  if (existing) return cloneJson(existing);
  return {
    status: "error",
    note,
    sourceUrl: config.swarmHistoryUrl,
    items: [],
  };
}

function buildXErrorSource(note, config, existing) {
  if (existing) return cloneJson(existing);
  return {
    status: "error",
    note,
    sourceUrl: `https://x.com/${config.xHandle}`,
    items: [],
  };
}

function buildHealthErrorSource(note, config, existing) {
  if (existing) return cloneJson(existing);
  const source = createSkippedHealthSource(config.health, note);
  source.status = "error";
  source.note = note;
  return source;
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

    return [...document.querySelectorAll("#history .activity")].map((activity) => {
      const venueLink = activity.querySelector(".activity-checkinInfo-venue a[href]");
      const address = activity.querySelector(".activity-venueAddress .global");
      const timestamp = activity.querySelector(".timestamp[data-created-at]");
      const sourceLink = activity.querySelector("a.activity-lastSeenTime[href]")
        ?? activity.querySelector("a[href*='/checkin/'], a[href*='/user/'][href*='/checkin/']");
      const shoutNode = activity.querySelector(".activity-shout, .activity-message, .activity-comment");
      const createdAt = timestamp?.getAttribute("data-created-at");

      return {
        createdAt,
        timeText: normalize(timestamp?.textContent),
        venueName: normalize(venueLink?.textContent) || null,
        venueArea: normalize(address?.textContent) || null,
        venueUrl: absoluteUrl(venueLink?.getAttribute("href")),
        sourceUrl: absoluteUrl(sourceLink?.getAttribute("href")) ?? window.location.href,
        shout: normalize(shoutNode?.textContent) || null,
        rawText: normalize(activity.innerText),
      };
    }).filter((item) => item.venueName || item.createdAt || item.rawText);
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
        const checkedInAt = item.createdAt ? new Date(Number(item.createdAt) * 1000).toISOString() : null;
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
    throw new Error("X timeline could not be accessed from the current browser session");
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

async function readJson(path) {
  const raw = await readFile(path, "utf-8");
  return JSON.parse(raw);
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
  const cdpUrl = options.cdpUrl ?? config.browserDebugUrl;
  let browser;
  try {
    browser = await chromium.connectOverCDP(cdpUrl);
  } catch (error) {
    throw new Error(`Could not connect to the normal Chrome session at ${cdpUrl}. Run npm run auth:daily-sources first. ${error.message}`);
  }
  const context = browser.contexts()[0];
  if (!context) {
    throw new Error(`No default browser context found at ${cdpUrl}. Run npm run auth:daily-sources first.`);
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

async function loadExistingDailyContext(date) {
  const path = join(DAILY_CONTEXT_DIR, `${date}.json`);
  if (!(await pathExists(path))) return null;

  try {
    return await readJson(path);
  } catch (error) {
    console.warn(`[daily-context] existing context for ${date} could not be read: ${error.message}`);
    return null;
  }
}

function resolveHealthAdbCommand(config) {
  return config.health.adbPath || "adb";
}

async function runAdb(config, options, args, commandOptions = {}) {
  const command = resolveHealthAdbCommand(config);
  return runCommand(command, buildAdbArgs(args, options.adbSerial), commandOptions);
}

async function waitForDeviceExport(config, options, devicePath, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      await runAdb(config, options, ["shell", "ls", devicePath], {
        timeoutMs: 5000,
      });
      return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  throw new Error(`Timed out waiting for device export: ${devicePath}`);
}

async function collectHealthPayloadFromDevice(date, config, options) {
  const exportDir = config.health.exportDirOnDevice.replace(/\/+$/, "");
  const devicePath = `${exportDir}/${date}.json`;
  const action = `${config.health.androidPackage}.EXPORT_HEALTH`;
  const component = `${config.health.androidPackage}/.ExportHealthReceiver`;

  await runAdb(config, options, ["shell", "rm", "-f", devicePath], {
    timeoutMs: 15000,
    acceptExitCodes: [0, 1],
  }).catch(() => {});

  await runAdb(config, options, [
    "shell",
    "am",
    "broadcast",
    "-a",
    action,
    "-n",
    component,
    "--es",
    "date",
    date,
  ], {
    timeoutMs: 15000,
  });

  await waitForDeviceExport(config, options, devicePath);

  const tempDir = await mkdtemp(join(tmpdir(), "ooku-health-"));
  const localPath = join(tempDir, `${date}.json`);

  try {
    await runAdb(config, options, ["pull", devicePath, localPath], {
      timeoutMs: 30000,
    });
    return await readJson(localPath);
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function collectHealthForDate(date, config, options) {
  if (!config.health.enabled) {
    return {
      source: {
        ...createSkippedHealthSource(config.health, "health disabled in config"),
        status: "disabled",
      },
      raw: null,
    };
  }

  if (options.skipHealth) {
    return {
      source: createSkippedHealthSource(config.health, "health 取得をスキップ (--skip-health)"),
      raw: null,
    };
  }

  const payload = options.healthFile
    ? await readJson(options.healthFile)
    : await collectHealthPayloadFromDevice(date, config, options);

  return {
    source: normalizeHealthExport(payload, {
      date,
      timezone: config.timezone,
      config: config.health,
    }),
    raw: payload,
  };
}

async function collectAndWrite(options) {
  const config = await loadDailyContextConfig();
  const fileDate = options.file ? basename(options.file).match(/^(\d{4}-\d{2}-\d{2})_/u)?.[1] : null;
  const date = options.date ?? fileDate ?? getDateStringInTimeZone(new Date(), config.timezone);

  // Target: drafts/ directory instead of diary/
  const DRAFTS_DIR = join(import.meta.dirname, "..", "drafts");
  await ensureDir(DRAFTS_DIR);
  const draftFileName = `${date}_下書き.md`;
  const draftAbsPath = join(DRAFTS_DIR, draftFileName);

  // Create draft file if it doesn't exist
  if (!(await pathExists(draftAbsPath))) {
    const draftContent = `# ${date} 下書き\n\n## 元ネタ・話題候補\n\n`;
    await writeFile(draftAbsPath, draftContent, "utf-8");
  }

  const targetFile = {
    absPath: draftAbsPath,
    relPath: `drafts/${draftFileName}`,
    date,
  };

  await ensureDir(DAILY_CONTEXT_DIR);
  await ensureDir(RAW_DIR);

  const existingContext = await loadExistingDailyContext(date);
  const existingSources = existingContext?.sources ?? {};

  let health;
  let healthRawPayload = null;
  try {
    const collected = await collectHealthForDate(date, config, options);
    health = collected.source;
    healthRawPayload = collected.raw;
  } catch (error) {
    if (existingSources.health?.status === "ok") {
      console.warn(`[daily-context] health failed for ${date}, reusing existing data: ${error.message}`);
      health = cloneJson(existingSources.health);
    } else {
      health = buildHealthErrorSource(error.message, config, null);
    }
  }

  if ((options.skipHealth || !config.health.enabled) && existingSources.health?.status === "ok") {
    health = cloneJson(existingSources.health);
  }

  let swarm;
  let x;
  let swarmRawPayload = null;
  let xRawPayload = null;
  let swarmPage;
  let xPage;
  let session;

  const reuseExistingBrowserSources = Boolean(options.healthFile && existingSources.swarm && existingSources.x);

  try {
    if (reuseExistingBrowserSources) {
      swarm = cloneJson(existingSources.swarm);
      x = cloneJson(existingSources.x);
    } else {
      try {
        session = await openCollectionSession(options, config);
        swarmPage = session.swarmPage;
        xPage = session.xPage;
      } catch (error) {
        if (existingSources.swarm || existingSources.x || health.status === "ok") {
          console.warn(`[daily-context] browser session unavailable for ${date}: ${error.message}`);
          swarm = buildSwarmErrorSource(error.message, config, existingSources.swarm);
          x = buildXErrorSource(error.message, config, existingSources.x);
        } else {
          throw error;
        }
      }

      if (session) {
        try {
          const swarmCollected = await collectSwarmForDate(swarmPage, date, config.timezone, config);
          swarm = { status: "ok", note: null, ...swarmCollected };
          swarmRawPayload = swarmCollected;
        } catch (error) {
          await saveDebugArtifacts(swarmPage, `swarm-${date}`, error);
          if (existingSources.swarm?.status === "ok") {
            console.warn(`[daily-context] swarm failed for ${date}, reusing existing data: ${error.message}`);
            swarm = cloneJson(existingSources.swarm);
          } else {
            swarm = buildSwarmErrorSource(error.message, config, null);
          }
        }

        try {
          const xCollected = await collectXForDate(xPage, date, config.timezone, config);
          x = { status: "ok", note: null, ...xCollected };
          xRawPayload = xCollected;
        } catch (error) {
          await saveDebugArtifacts(xPage, `x-${date}`, error);
          if (existingSources.x?.status === "ok") {
            console.warn(`[daily-context] x failed for ${date}, reusing existing data: ${error.message}`);
            x = cloneJson(existingSources.x);
          } else {
            x = buildXErrorSource(error.message, config, null);
          }
        }
      }
    }

    swarm ??= buildSwarmErrorSource("Swarm data unavailable", config, existingSources.swarm);
    x ??= buildXErrorSource("X data unavailable", config, existingSources.x);

    const normalized = {
      date,
      timezone: config.timezone,
      generatedAt: new Date().toISOString(),
      sources: {
        swarm,
        x,
        health,
      },
      candidateTopics: [],
    };

    if (swarm.status === "error" && x.status === "error" && health.status !== "ok") {
      throw new Error(`All sources failed: swarm=${swarm.note}; x=${x.note}; health=${health.note}`);
    }

    normalized.candidateTopics = buildCandidateTopics(normalized);

    const swarmRaw = {
      date,
      collectedAt: normalized.generatedAt,
      status: swarm.status,
      note: swarm.note,
      sourceUrl: swarm.sourceUrl,
      items: swarm.items,
      payload: swarmRawPayload,
    };
    const xRaw = {
      date,
      collectedAt: normalized.generatedAt,
      status: x.status,
      note: x.note,
      sourceUrl: x.sourceUrl,
      items: x.items,
      payload: xRawPayload,
    };
    const healthRaw = {
      date,
      collectedAt: normalized.generatedAt,
      status: health.status,
      note: health.note,
      source: health.source,
      exportedAt: health.exportedAt,
      device: health.device,
      summary: health.summary,
      payload: healthRawPayload,
    };

    await writeJson(join(RAW_DIR, `${date}.swarm.json`), swarmRaw);
    await writeJson(join(RAW_DIR, `${date}.x.json`), xRaw);
    await writeJson(join(RAW_DIR, `${date}.health.json`), healthRaw);
    await writeJson(join(DAILY_CONTEXT_DIR, `${date}.json`), normalized);
    await updateDiaryFile(targetFile, normalized);

    console.log(`[daily-context] updated ${targetFile.relPath}`);
    console.log(`[daily-context] Swarm ${swarm.items?.length ?? 0}件 / X ${x.items?.length ?? 0}件 / Health ${health.status}`);
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
    process.exit(0);
  } catch (error) {
    if (options.bestEffort) {
      console.warn(`[daily-context] skipped: ${error.message}`);
      process.exit(0);
    }

    console.error("[daily-context] failed");
    console.error(error);
    process.exit(1);
  }
}

main();
