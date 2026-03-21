const { chromium } = require("playwright");
const path = require("path");

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

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const baseUrl = "http://127.0.0.1:8181";
  const dummyVrmPath = path.join(__dirname, "fixtures", "invalid-model.vrm");
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
    window.__fakeSpeechQueue = [];
    window.__pushFakeSpeech = (text) => {
      window.__fakeSpeechQueue.push(text);
    };

    class FakeSpeechRecognition {
      constructor() {
        this.lang = "ja-JP";
        this.continuous = false;
        this.interimResults = true;
        this.maxAlternatives = 1;
      }

      start() {
        setTimeout(() => {
          this.onstart?.();
          const transcript = window.__fakeSpeechQueue.shift() || "";
          if (transcript) {
            const result = [{ transcript, confidence: 1 }];
            result.isFinal = true;
            const results = [result];
            this.onresult?.({ results });
          }
          this.onend?.();
        }, 20);
      }

      stop() {
        this.onend?.();
      }

      abort() {}
    }

    Object.defineProperty(window, "webkitSpeechRecognition", {
      configurable: true,
      writable: true,
      value: FakeSpeechRecognition,
    });

    if (!navigator.mediaDevices) {
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {},
      });
    }
    navigator.mediaDevices.getUserMedia = async () => ({
      getTracks() {
        return [{ stop() {} }];
      },
    });
  });

  console.log("\n=== galge-scenario runtime test ===");

  let response = await page.goto(`${baseUrl}/galge-scenario.html`, {
    waitUntil: "domcontentloaded",
  });
  assert(response.status() === 200, "default scenario page loads");

  await page.waitForSelector("#title-screen");
  const defaultTitle = await page.$eval("#title-screen h1", (element) => element.textContent);
  assert(defaultTitle.includes("声の座標"), `default scenario title loads (got: "${defaultTitle}")`);

  const speechButtonEnabled = await page.$eval("#title-speech-toggle", (element) => !element.disabled);
  assert(speechButtonEnabled, "speech input button is enabled when speech API is available");

  await page.evaluate(async () => {
    await window.__galgeRuntimeApp.handleSpeechTranscript("設定");
  });
  await page.waitForSelector("#settings-modal.visible");
  assert(true, "voice command opens settings on title screen");
  await page.evaluate(async () => {
    await window.__galgeRuntimeApp.handleSpeechTranscript("閉じる");
  });
  await page.waitForTimeout(300);
  const titleSettingsHidden = await page.$eval("#settings-modal", (element) => element.hidden);
  assert(titleSettingsHidden, "voice command closes settings on title screen");

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
    `${baseUrl}/galge-scenario.html?scenario=${encodeURIComponent("2026-03-19_影の踊り子")}`,
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
  await page.click("#settings-close");
  await page.waitForTimeout(200);

  await page.click("#start-btn");
  await page.waitForTimeout(1200);
  const hudDisplay = await page.$eval("#hud", (element) => element.style.display);
  assert(hudDisplay === "flex", `HUD appears after start (got: "${hudDisplay}")`);

  const currentText = await waitForNonEmptyText(page, 5000);
  assert(currentText.length > 0, `text renders without any valid VRM (length: ${currentText.length})`);

  await page.click("#mode-toggle");
  await page.waitForTimeout(300);
  let bodyClass = await page.$eval("body", (element) => element.className);
  assert(bodyClass.includes("mode-classic"), `mode toggle switches to classic (got: "${bodyClass}")`);

  await page.evaluate(async () => {
    await window.__galgeRuntimeApp.handleSpeechTranscript("イマーシブ");
  });
  await page.waitForTimeout(250);
  bodyClass = await page.$eval("body", (element) => element.className);
  assert(bodyClass.includes("mode-immersive"), `voice command switches to immersive (got: "${bodyClass}")`);

  await page.click("#mode-toggle");
  await page.waitForTimeout(300);
  bodyClass = await page.$eval("body", (element) => element.className);
  assert(bodyClass.includes("mode-classic"), `mode toggle switches back to classic (got: "${bodyClass}")`);

  response = await page.goto(`${baseUrl}/galge-scenario.html`, {
    waitUntil: "domcontentloaded",
  });
  assert(response.status() === 200, "default scenario reloads for branch test");
  await page.waitForSelector("#title-screen");
  await page.click("#start-btn");
  await page.waitForTimeout(1200);

  const choiceShown = await advanceUntilChoice(page);
  assert(choiceShown, "branching scenario reaches a visible choice");

  if (choiceShown) {
    await page.evaluate(async () => {
      await window.__galgeRuntimeApp.handleSpeechTranscript("一番");
    });
    await page.waitForTimeout(2800);
    const textAfterChoice = await page.$eval("#text-content", (element) => element.textContent);
    assert(textAfterChoice.length > 0, "voice command selects a choice and continues the scenario");
  }

  console.log(`\n=== result: ${passed} passed, ${failed} failed ===`);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();
