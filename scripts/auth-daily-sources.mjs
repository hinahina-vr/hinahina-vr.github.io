import { basename } from "node:path";
import { spawn } from "node:child_process";
import {
  CHROME_DEBUG_PROFILE_DIR,
  ensureDir,
  loadDailyContextConfig,
  pathExists,
} from "./lib/daily-context.mjs";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runDetached(command, args) {
  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore",
    windowsHide: false,
  });
  child.unref();
}

async function waitForDevTools(browserDebugUrl, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  const endpoint = `${browserDebugUrl.replace(/\/$/, "")}/json/version`;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) return true;
    } catch {}
    await wait(1000);
  }

  return false;
}

function getDebugPort(browserDebugUrl) {
  return new URL(browserDebugUrl).port || "9222";
}

async function main() {
  const config = await loadDailyContextConfig();

  if (!(await pathExists(config.browserExecutablePath))) {
    throw new Error(`Browser executable not found: ${config.browserExecutablePath}`);
  }

  await ensureDir(CHROME_DEBUG_PROFILE_DIR);

  const endpoint = `${config.browserDebugUrl.replace(/\/$/, "")}/json/version`;
  const debugPort = getDebugPort(config.browserDebugUrl);

  try {
    const response = await fetch(endpoint);
    if (response.ok) {
      console.log(`[daily-context] Chrome debug session is already available: ${config.browserDebugUrl}`);
      console.log("[daily-context] その Chrome で Swarm と X にログインしたあと、npm run collect:daily-context を実行してください。");
      return;
    }
  } catch {}

  console.log("[daily-context] 通常 Chrome を別プロファイルで起動します。");
  console.log(`[daily-context] profile: ${CHROME_DEBUG_PROFILE_DIR}`);
  console.log("[daily-context] このウィンドウは普段使いの Chrome とは別で、remote debugging 専用です。");

  runDetached(config.browserExecutablePath, [
    `--remote-debugging-port=${debugPort}`,
    "--remote-allow-origins=*",
    `--user-data-dir=${CHROME_DEBUG_PROFILE_DIR}`,
    "--new-window",
    "--no-first-run",
    "--no-default-browser-check",
    config.swarmHistoryUrl,
    `https://x.com/${config.xHandle}`,
  ]);

  const ready = await waitForDevTools(config.browserDebugUrl);
  if (!ready) {
    throw new Error(`Chrome DevTools endpoint did not come up at ${config.browserDebugUrl}`);
  }

  console.log(`[daily-context] 通常 Chrome を起動しました: ${config.browserDebugUrl}`);
  console.log("[daily-context] この Chrome で Swarm と X にログインしてください。");
  console.log("[daily-context] ログイン後に npm run collect:daily-context を実行してください。");
}

main().catch((error) => {
  console.error("[daily-context] auth failed");
  console.error(error);
  process.exit(1);
});
