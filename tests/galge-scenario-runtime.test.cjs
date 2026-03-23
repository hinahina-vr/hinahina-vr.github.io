const { chromium } = require("playwright");
const { spawn } = require("child_process");
const path = require("path");

function createSilentWavBuffer() {
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const durationSamples = 2400;
  const blockAlign = numChannels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const dataSize = durationSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

async function isVisible(page, selector) {
  return page.$eval(selector, (element) => {
    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden";
  });
}

async function advanceUntilChoice(page, maxIterations = 220) {
  for (let index = 0; index < maxIterations; index += 1) {
    const choiceCount = await page.locator("#choice-container.visible .choice-btn").count();
    if (choiceCount > 0) {
      return true;
    }

    if (await isVisible(page, "#chapter-overlay")) {
      await page.waitForTimeout(2500);
      continue;
    }

    await page.mouse.click(480, 520);
    await page.waitForTimeout(20);
    await page.mouse.click(480, 520);
    await page.waitForTimeout(20);
  }

  return false;
}

async function waitForNonEmptyText(page, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const text = await page.$eval("#text-content", (element) => element.textContent || "");
    if (text.length > 0) {
      return text;
    }
    await page.waitForTimeout(100);
  }
  return "";
}

async function waitForApiMessage(page, expectedText, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const text = await page.$eval("#text-content", (element) => element.textContent || "");
    if (text.includes(expectedText)) {
      return true;
    }
    await page.waitForTimeout(25);
  }
  return false;
}

async function waitForTextIncludes(page, expectedText, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const text = await page.$eval("#text-content", (element) => element.textContent || "");
    if (text.includes(expectedText)) {
      return true;
    }
    await page.waitForTimeout(50);
  }
  return false;
}

async function advanceUntilScenarioTitle(page, expectedTitle, maxIterations = 120) {
  for (let index = 0; index < maxIterations; index += 1) {
    const currentTitle = await page.evaluate(() => window.__galgeRuntimeApp?.scenario?.title || "");
    if (currentTitle.includes(expectedTitle)) {
      return true;
    }

    if (await isVisible(page, "#chapter-overlay")) {
      await page.waitForTimeout(400);
      continue;
    }

    await page.mouse.click(480, 520);
    await page.waitForTimeout(20);
    await page.mouse.click(480, 520);
    await page.waitForTimeout(40);
  }

  return false;
}

(async () => {
  const apiPort = 8182;
  const apiServer = spawn("node", ["scripts/serve-galge-message-api.mjs"], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, GALGE_MESSAGE_API_PORT: String(apiPort) },
    stdio: "ignore",
  });
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const baseUrl = "http://127.0.0.1:8181";
  const messageApiBase = `http://127.0.0.1:${apiPort}`;
  const dummyVrmPath = path.join(__dirname, "fixtures", "invalid-model.vrm");
  const proxyTtsRequests = [];
  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`  PASS: ${name}`);
      passed += 1;
    } else {
      console.log(`  FAIL: ${name}`);
      failed += 1;
    }
  }

  await page.addInitScript(() => {
    window.__bgmEvents = {
      plays: [],
      pauses: [],
    };

    const originalLoad = window.HTMLMediaElement.prototype.load;
    window.HTMLMediaElement.prototype.play = function play() {
      window.__bgmEvents.plays.push({ src: this.currentSrc || this.src || "" });
      return Promise.resolve();
    };
    window.HTMLMediaElement.prototype.pause = function pause() {
      window.__bgmEvents.pauses.push({ src: this.currentSrc || this.src || "" });
    };
    window.HTMLMediaElement.prototype.load = function load() {
      return originalLoad ? originalLoad.call(this) : undefined;
    };

    class FakeSpeechSynthesisUtterance {
      constructor(text) {
        this.text = text;
        this.lang = "ja-JP";
        this.rate = 1;
        this.pitch = 1;
      }
    }

    window.SpeechSynthesisUtterance = FakeSpeechSynthesisUtterance;
    window.speechSynthesis = {
      getVoices() {
        return [{ name: "Fake Japanese", lang: "ja-JP" }];
      },
      speak(utterance) {
        setTimeout(() => {
          utterance.onstart?.();
          setTimeout(() => {
            utterance.onend?.();
          }, 300);
        }, 10);
      },
      cancel() {},
    };
  });

  await page.route("**/api/tts*", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
      return;
    }
    const payload = route.request().postDataJSON();
    proxyTtsRequests.push(payload);
    await route.fulfill({
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Access-Control-Allow-Origin": "*",
      },
      body: createSilentWavBuffer(),
    });
  });

  console.log("\n=== galge-scenario runtime test ===");

  let response = await page.goto(
    `${baseUrl}/galge-scenario.html?scenario=${encodeURIComponent("2026-03-18_声の座標")}&messageApiBase=${encodeURIComponent(messageApiBase)}`,
    {
      waitUntil: "domcontentloaded",
    }
  );
  assert(response.status() === 200, "explicit scenario page loads");

  await page.waitForSelector("#title-screen");
  const defaultTitle = await page.$eval("#title-screen h1", (element) => element.textContent);
  assert(defaultTitle.includes("声の座標"), `default scenario title loads (got: "${defaultTitle}")`);
  const titleApiClient = await page.$eval("#title-api-client-id", (element) => element.textContent);
  assert(titleApiClient.includes("API client:"), `message api client id is shown (got: "${titleApiClient}")`);

  await page.click("#title-settings-btn");
  await page.waitForSelector("#settings-modal.visible");
  const defaultRows = await page.$$eval("#settings-list .settings-row", (elements) =>
    elements.map((element) => element.dataset.speakerKey)
  );
  assert(defaultRows.includes("hina"), "settings panel derives speakers from default scenario");
  assert(defaultRows.includes("narrator"), "settings panel includes optional narrator row");

  await page.click("#settings-close");
  await page.waitForTimeout(200);

  response = await page.goto(
    `${baseUrl}/galge-scenario.html?scenario=${encodeURIComponent("2026-03-19_影の踊り子")}&messageApiBase=${encodeURIComponent(messageApiBase)}`,
    { waitUntil: "domcontentloaded" }
  );
  assert(response.status() === 200, "alternate scenario page loads");

  await page.waitForSelector("#title-screen");
  const altTitle = await page.$eval("#title-screen h1", (element) => element.textContent);
  assert(
    altTitle.includes("影の踊り子"),
    `alternate scenario title loads (got: "${altTitle}")`
  );

  await page.click("#title-settings-btn");
  await page.waitForSelector("#settings-modal.visible");
  const scenarioRows = await page.$$eval("#settings-list .settings-row", (elements) =>
    elements.map((element) => element.dataset.speakerKey)
  );
  assert(scenarioRows.includes("hinahina"), "dynamic settings rows include hinahina");
  assert(scenarioRows.includes("waddy"), "dynamic settings rows include waddy");

  await page.selectOption('select[data-speaker-voice-provider="hinahina"]', "openai");
  await page.waitForTimeout(200);
  const hinahinaProviderValue = await page.$eval(
    'select[data-speaker-voice-provider="hinahina"]',
    (element) => element.value
  );
  assert(hinahinaProviderValue === "openai", "speaker voice provider can be changed via settings");

  await page
    .locator('.settings-row[data-speaker-key="hinahina"] .settings-voice-section button', {
      hasText: "音声テスト",
    })
    .click();
  await page.waitForTimeout(1200);
  assert(proxyTtsRequests.length >= 1, "voice test uses /api/tts proxy");
  assert(
    proxyTtsRequests.at(-1)?.config?.provider === "openai",
    "voice test forwards configured provider"
  );

  await page.setInputFiles('input[data-speaker-file="hinahina"]', dummyVrmPath);
  await page.waitForTimeout(400);
  const hinahinaStatus = await page.$eval(
    '.settings-row[data-speaker-key="hinahina"] .settings-row-status',
    (element) => element.textContent
  );
  assert(hinahinaStatus.includes("専用モデルあり"), "uploaded model updates row status");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("#title-screen");
  await page.click("#title-settings-btn");
  await page.waitForSelector("#settings-modal.visible");
  const persistedStatus = await page.$eval(
    '.settings-row[data-speaker-key="hinahina"] .settings-row-status',
    (element) => element.textContent
  );
  assert(persistedStatus.includes("専用モデルあり"), "uploaded model persists via IndexedDB");
  const persistedProvider = await page.$eval(
    'select[data-speaker-voice-provider="hinahina"]',
    (element) => element.value
  );
  assert(persistedProvider === "openai", "speaker voice provider persists via IndexedDB");
  await page.click("#settings-close");
  await page.waitForTimeout(200);

  await page.click("#start-btn");
  await page.waitForTimeout(1200);
  const hudDisplay = await page.$eval("#hud", (element) => element.style.display);
  assert(hudDisplay === "flex", `HUD appears after start (got: "${hudDisplay}")`);

  const currentText = await waitForNonEmptyText(page, 5000);
  assert(currentText.length > 0, `text renders without any valid VRM (length: ${currentText.length})`);
  const titleBgmToggleText = await page.$eval("#title-bgm-toggle", (element) => element.textContent);
  assert(titleBgmToggleText.includes("BGM OFF"), "BGM defaults to OFF on title screen");

  await page.evaluate(async () => {
    const app = window.__galgeRuntimeApp;
    app.scenario.steps[app.currentStep].bgm = {
      track: "test-theme",
      volume: 0.3,
    };
    app.syncBgmForIndex(app.currentStep);
  });
  await page.waitForTimeout(300);
  let bgmPlayCount = await page.evaluate(() => window.__bgmEvents.plays.length);
  assert(bgmPlayCount === 0, "BGM does not autoplay while toggle is OFF");

  await page.click("#sound-settings-btn");
  await page.waitForSelector("#volume-popup.visible");
  await page.click("#bgm-toggle");
  await page.waitForTimeout(300);
  bgmPlayCount = await page.evaluate(() => window.__bgmEvents.plays.length);
  assert(bgmPlayCount >= 1, "enabling BGM starts current track playback");
  const runtimeBgmToggleText = await page.$eval("#bgm-toggle", (element) => element.textContent);
  assert(runtimeBgmToggleText.includes("BGM ON"), "runtime BGM toggle switches to ON");
  await page.click("#sound-settings-btn");
  await page.waitForTimeout(200);

  const runtimeClientId = await page.$eval("#api-client-id", (element) => element.textContent);
  const clientId = runtimeClientId.replace("API client:", "").trim();
  const directSendResponse = await fetch(
    `${messageApiBase}/api/messages?clientId=${encodeURIComponent(clientId)}&type=direct_send`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            message: "APIからの発話テストです。",
            speaker: "hinahina",
            expression: "外部API",
          },
        ],
      }),
    }
  );
  assert(directSendResponse.status === 201, `direct_send API accepts messages (got: ${directSendResponse.status})`);
  const apiMessageShown = await waitForApiMessage(page, "APIからの発話テストです。", 6000);
  assert(apiMessageShown, "page speaks text received from message API");
  await page.waitForTimeout(800);
  assert(
    proxyTtsRequests.some(
      (payload) =>
        payload?.text === "APIからの発話テストです。" && payload?.config?.provider === "openai"
    ),
    "direct_send speech uses configured speaker TTS provider"
  );

  await page.click("#mode-toggle");
  await page.waitForTimeout(300);
  let bodyClass = await page.$eval("body", (element) => element.className);
  assert(bodyClass.includes("mode-immersive"), `mode toggle switches to immersive (got: "${bodyClass}")`);

  await page.click("#mode-toggle");
  await page.waitForTimeout(300);
  bodyClass = await page.$eval("body", (element) => element.className);
  assert(bodyClass.includes("mode-classic"), `mode toggle switches back to classic (got: "${bodyClass}")`);

  response = await page.goto(
    `${baseUrl}/galge-scenario.html?scenario=${encodeURIComponent("2026-03-18_声の座標")}&messageApiBase=${encodeURIComponent(messageApiBase)}`,
    {
    waitUntil: "domcontentloaded",
    }
  );
  assert(response.status() === 200, "explicit scenario reloads for branch test");
  await page.waitForSelector("#title-screen");
  await page.click("#start-btn");
  await page.waitForTimeout(1200);

  const choiceShown = await advanceUntilChoice(page);
  assert(choiceShown, "branching scenario reaches a visible choice");

  if (choiceShown) {
    const branchClientLabel = await page.$eval("#api-client-id", (element) => element.textContent);
    const branchClientId = branchClientLabel.replace("API client:", "").trim();
    const branchResponse = await fetch(
      `${messageApiBase}/api/messages?clientId=${encodeURIComponent(branchClientId)}&type=direct_send`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ message: "分岐テスト発話です。", speaker: "hina" }],
        }),
      }
    );
    assert(branchResponse.status === 201, `message API accepts branch-stage message (got: ${branchResponse.status})`);
    await page.waitForTimeout(1800);
    await page.locator("#choice-container.visible .choice-btn").first().click();
    await page.waitForTimeout(2800);
    const textAfterChoice = await page.$eval("#text-content", (element) => element.textContent);
    assert(textAfterChoice.length > 0, "choice selection continues the scenario after API speech");
  }

  console.log("\n=== entry label startup ===");
  response = await page.goto(
    `${baseUrl}/galge-scenario.html?scenario=${encodeURIComponent("2026-03-21_沈黙のリビング")}&entry=${encodeURIComponent("entry_from_main")}&messageApiBase=${encodeURIComponent(messageApiBase)}`,
    {
      waitUntil: "domcontentloaded",
    }
  );
  assert(response.status() === 200, "entry label scenario page loads");
  await page.waitForSelector("#title-screen");
  await page.click("#start-btn");
  const entryTextShown = await waitForTextIncludes(page, "歪んだゲストハウスのリビング", 6000);
  assert(entryTextShown, "entry=entry_from_main starts from the in-branch scene");
  const branchEntryText = await page.$eval("#text-content", (element) => element.textContent || "");
  assert(
    !branchEntryText.includes("これは、何も選ばなかった世界線の記録"),
    "entry=entry_from_main skips the standalone intro text"
  );

  console.log("\n=== inline branch transition ===");
  response = await page.goto(
    `${baseUrl}/galge-scenario.html?scenario=${encodeURIComponent("2026-03-21_百夢回廊")}&messageApiBase=${encodeURIComponent(messageApiBase)}`,
    {
      waitUntil: "domcontentloaded",
    }
  );
  assert(response.status() === 200, "main branch scenario loads");
  await page.waitForSelector("#title-screen");
  await page.click("#start-btn");
  await page.waitForTimeout(1200);
  const inlineChoiceShown = await advanceUntilChoice(page);
  assert(inlineChoiceShown, "main branch scenario reaches the first branch choice");

  if (inlineChoiceShown) {
    const beforeBranchState = await page.evaluate(() => {
      const app = window.__galgeRuntimeApp;
      app.flags.add("__inline_branch_flag");
      return {
        backlogLength: app.backlog.length,
        url: window.location.href,
      };
    });
    const branchChoiceCount = await page.locator("#choice-container.visible .choice-btn").count();
    assert(branchChoiceCount >= 3, "first branch choice exposes the genkai branch option");
    await page.locator("#choice-container.visible .choice-btn").nth(2).click();
    const inlineScenarioLoaded = await advanceUntilScenarioTitle(page, "沈黙のリビング");
    assert(inlineScenarioLoaded, "loadScenario inline transition swaps the in-memory scenario");
    const inlineBranchText = await waitForNonEmptyText(page, 4000);
    assert(inlineBranchText.length > 0, "loadScenario inline transition keeps rendering text after the swap");
    const afterBranchState = await page.evaluate(() => {
      const app = window.__galgeRuntimeApp;
      return {
        title: app.scenario?.title || "",
        entry: app.currentScenarioEntry,
        backlogLength: app.backlog.length,
        hasFlag: app.flags.has("__inline_branch_flag"),
        url: window.location.href,
      };
    });
    assert(
      afterBranchState.url === beforeBranchState.url,
      "inline branch transition does not rewrite the current page URL"
    );
    assert(
      afterBranchState.title.includes("沈黙のリビング"),
      `inline branch transition loads the target scenario in-memory (got: "${afterBranchState.title}")`
    );
    assert(
      afterBranchState.entry === "entry_from_main",
      `inline branch transition records the requested entry label (got: "${afterBranchState.entry}")`
    );
    assert(afterBranchState.hasFlag, "inline branch transition preserves previously set flags");
    assert(
      afterBranchState.backlogLength >= beforeBranchState.backlogLength,
      `inline branch transition preserves backlog history (before: ${beforeBranchState.backlogLength}, after: ${afterBranchState.backlogLength})`
    );
    assert(
      !inlineBranchText.includes("これは、何も選ばなかった世界線の記録"),
      "inline branch transition skips the standalone intro and starts at entry_from_main"
    );
  }

  console.log(`\n=== result: ${passed} passed, ${failed} failed ===`);
  await browser.close();
  apiServer.kill();
  process.exit(failed > 0 ? 1 : 0);
})();
