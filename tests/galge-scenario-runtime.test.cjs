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

  console.log("\n=== galge-scenario runtime test ===");

  let response = await page.goto(`${baseUrl}/galge-scenario.html`, {
    waitUntil: "domcontentloaded",
  });
  assert(response.status() === 200, "default scenario page loads");

  await page.waitForSelector("#title-screen");
  const defaultTitle = await page.$eval("#title-screen h1", (element) => element.textContent);
  assert(defaultTitle.includes("声の座標"), `default scenario title loads (got: "${defaultTitle}")`);

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
    `${baseUrl}/galge-scenario.html?scenario=${encodeURIComponent("2026-03-19_選択肢のある建物")}`,
    { waitUntil: "domcontentloaded" }
  );
  assert(response.status() === 200, "alternate scenario page loads");

  await page.waitForSelector("#title-screen");
  const altTitle = await page.$eval("#title-screen h1", (element) => element.textContent);
  assert(
    altTitle.includes("選択肢のある建物"),
    `alternate scenario title loads (got: "${altTitle}")`
  );

  await page.click("#title-settings-btn");
  await page.waitForSelector("#settings-modal.visible");
  const scenarioRows = await page.$$eval("#settings-list .settings-row", (elements) =>
    elements.map((element) => element.dataset.speakerKey)
  );
  assert(scenarioRows.includes("tsumugi"), "dynamic settings rows include tsumugi");
  assert(scenarioRows.includes("rin"), "dynamic settings rows include rin");

  await page.setInputFiles('input[data-speaker-file="tsumugi"]', dummyVrmPath);
  await page.waitForTimeout(400);
  const tsumugiStatus = await page.$eval(
    '.settings-row[data-speaker-key="tsumugi"] .settings-row-status',
    (element) => element.textContent
  );
  assert(tsumugiStatus.includes("専用モデルあり"), "uploaded model updates row status");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("#title-screen");
  await page.click("#title-settings-btn");
  await page.waitForSelector("#settings-modal.visible");
  const persistedStatus = await page.$eval(
    '.settings-row[data-speaker-key="tsumugi"] .settings-row-status',
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

  await page.click("#mode-toggle");
  await page.waitForTimeout(300);
  bodyClass = await page.$eval("body", (element) => element.className);
  assert(bodyClass.includes("mode-immersive"), `mode toggle returns to immersive (got: "${bodyClass}")`);

  const choiceShown = await advanceUntilChoice(page);
  assert(choiceShown, "branching scenario reaches a visible choice");

  if (choiceShown) {
    await page.locator("#choice-container.visible .choice-btn").first().click();
    await page.waitForTimeout(2800);
    const textAfterChoice = await page.$eval("#text-content", (element) => element.textContent);
    assert(textAfterChoice.length > 0, "choice selection continues the scenario");
  }

  console.log(`\n=== result: ${passed} passed, ${failed} failed ===`);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();
