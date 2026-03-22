const fs = require("node:fs");
const { chromium } = require("playwright");

function parseRgb(color) {
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

function luminance(rgb) {
  const [r, g, b] = rgb.map((value) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground, background) {
  const fg = luminance(foreground);
  const bg = luminance(background);
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8181";
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

  async function clearModeStorage() {
    await page.goto(`${baseUrl}/index.html`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => window.localStorage.removeItem("waddy-display-mode"));
  }

  console.log("\n=== site mode initial state ===");
  await clearModeStorage();
  await page.goto(`${baseUrl}/index.html`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-site-mode-toggle]", { timeout: 5000 });
  let htmlMode = await page.getAttribute("html", "data-site-mode");
  let bodyClass = await page.getAttribute("body", "class");
  assert(htmlMode === "classic", `index.html 初回表示が classic であること (got: "${htmlMode}")`);
  assert(bodyClass.includes("mode-classic"), `body に mode-classic が付くこと (got: "${bodyClass}")`);

  console.log("\n=== character diary classic surface ===");
  await page.goto(`${baseUrl}/diary-mii.html`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".entry-list li", { timeout: 5000 });
  bodyClass = await page.getAttribute("body", "class");
  const diaryEntryBackground = await page.$eval(".entry-list li", (el) => window.getComputedStyle(el).backgroundImage);
  assert(bodyClass.includes("character-diary-page"), `character diary page class が付与されること (got: "${bodyClass}")`);
  assert(!diaryEntryBackground.includes("0, 0, 0"), `classic の各キャラ日記が黒ベタ背景でないこと (got: "${diaryEntryBackground}")`);
  const classicDiaryBackground = [247, 239, 219];
  const diaryPages = fs
    .readdirSync(process.cwd())
    .filter((name) => /^diary-.*\.html$/.test(name) && !["diary-2026-02.html", "diary-waddy.html"].includes(name))
    .sort();
  for (const diaryPage of diaryPages) {
    await page.goto(`${baseUrl}/${diaryPage}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".entry-list li", { timeout: 5000 });
    bodyClass = await page.getAttribute("body", "class");
    if (!bodyClass.includes("character-diary-page")) {
      continue;
    }
    const [titleColor, dateColor, bodyColor, insightColor] = await Promise.all([
      page.$eval(".entry-title", (el) => window.getComputedStyle(el).color),
      page.$eval(".entry-date", (el) => window.getComputedStyle(el).color),
      page.$eval(".entry-list li p:not(.entry-date)", (el) => window.getComputedStyle(el).color),
      page
        .$eval(".entry-list li hr ~ p", (el) => window.getComputedStyle(el).color)
        .catch(() => null),
    ]);
    const titleContrast = contrastRatio(parseRgb(titleColor), classicDiaryBackground);
    const dateContrast = contrastRatio(parseRgb(dateColor), classicDiaryBackground);
    const bodyContrast = contrastRatio(parseRgb(bodyColor), classicDiaryBackground);
    assert(titleContrast >= 4.5, `${diaryPage} のタイトルが classic でも読めること (contrast: ${titleContrast.toFixed(2)})`);
    assert(dateContrast >= 4.5, `${diaryPage} の日付が classic でも読めること (contrast: ${dateContrast.toFixed(2)})`);
    assert(bodyContrast >= 7, `${diaryPage} の本文が classic でも十分読めること (contrast: ${bodyContrast.toFixed(2)})`);
    if (insightColor) {
      const insightContrast = contrastRatio(parseRgb(insightColor), classicDiaryBackground);
      assert(insightContrast >= 5, `${diaryPage} のインサイト段落が classic でも読めること (contrast: ${insightContrast.toFixed(2)})`);
    }
  }

  console.log("\n=== site mode persistence across pages ===");
  await page.goto(`${baseUrl}/index.html`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-site-mode-toggle]", { timeout: 5000 });
  await page.click("[data-site-mode-toggle]");
  await page.waitForTimeout(250);
  htmlMode = await page.getAttribute("html", "data-site-mode");
  let storedMode = await page.evaluate(() => window.localStorage.getItem("waddy-display-mode"));
  const particleCanvas = await page.$("[data-site-mode-particles]");
  const particleOpacity = particleCanvas
    ? await page.$eval("[data-site-mode-particles]", (el) => window.getComputedStyle(el).opacity)
    : null;
  assert(htmlMode === "immersive", `トップで immersive に切り替わること (got: "${htmlMode}")`);
  assert(storedMode === "immersive", `localStorage に immersive が保存されること (got: "${storedMode}")`);
  assert(particleCanvas !== null, "immersive 用の particle canvas が存在すること");
  assert(Number(particleOpacity) > 0, `immersive で particle canvas が表示されること (got: "${particleOpacity}")`);
  await page.goto(`${baseUrl}/links.html`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-site-mode-toggle]", { timeout: 5000 });
  htmlMode = await page.getAttribute("html", "data-site-mode");
  bodyClass = await page.getAttribute("body", "class");
  assert(htmlMode === "immersive", `links.html でも immersive が維持されること (got: "${htmlMode}")`);
  assert(bodyClass.includes("mode-immersive"), `links.html の body が immersive であること (got: "${bodyClass}")`);

  console.log("\n=== diary despair coexistence ===");
  await page.goto(`${baseUrl}/diary.html`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  bodyClass = await page.getAttribute("body", "class");
  assert(bodyClass.includes("diary-despair"), `diary.html に diary-despair が残ること (got: "${bodyClass}")`);
  assert(bodyClass.includes("mode-immersive"), `diary.html でも immersive が共存すること (got: "${bodyClass}")`);

  console.log("\n=== galge mode honors stored immersive ===");
  await page.goto(`${baseUrl}/galge-mode.html?char=hina&date=2026-03-16`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  bodyClass = await page.getAttribute("body", "class");
  assert(bodyClass.includes("mode-immersive"), `galge-mode.html が保存済み immersive で開くこと (got: "${bodyClass}")`);

  console.log("\n=== query mode override ===");
  await page.goto(`${baseUrl}/index.html?mode=immersive`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-site-mode-toggle]", { timeout: 5000 });
  htmlMode = await page.getAttribute("html", "data-site-mode");
  storedMode = await page.evaluate(() => window.localStorage.getItem("waddy-display-mode"));
  assert(htmlMode === "immersive", `?mode=immersive が保存値を上書きすること (got: "${htmlMode}")`);
  assert(storedMode === "immersive", `query override 後に storage も immersive になること (got: "${storedMode}")`);

  console.log("\n=== dream select propagation ===");
  await page.goto(`${baseUrl}/index.html?mode=classic`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-site-mode-toggle]", { timeout: 5000 });
  storedMode = await page.evaluate(() => window.localStorage.getItem("waddy-display-mode"));
  assert(storedMode === "classic", `dream-select 確認前に storage を classic に戻せること (got: "${storedMode}")`);
  await page.goto(`${baseUrl}/dream-select.html?date=2026-03-20`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#mode-toggle", { timeout: 5000 });
  htmlMode = await page.getAttribute("html", "data-site-mode");
  storedMode = await page.evaluate(() => window.localStorage.getItem("waddy-display-mode"));
  const dreamToggleDisabled = await page.$eval("#mode-toggle", (el) => el.disabled);
  const firstHref = await page.$eval(".scenario-card", (el) => el.getAttribute("href"));
  assert(htmlMode === "immersive", `dream-select.html が常に immersive で開くこと (got: "${htmlMode}")`);
  assert(dreamToggleDisabled, "dream-select.html の mode toggle が無効化されること");
  assert(storedMode === "classic", `dream-select.html が保存済み classic を上書きしないこと (got: "${storedMode}")`);
  assert(firstHref.includes("mode=immersive"), `dream-select.html の遷移先に mode=immersive が付くこと (got: "${firstHref}")`);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded" }),
    page.click(".scenario-card"),
  ]);
  const currentUrl = page.url();
  const scenarioHtmlMode = await page.getAttribute("html", "data-site-mode");
  assert(currentUrl.includes("mode=immersive"), `galge-scenario.html への遷移 URL に mode=immersive が含まれること (got: "${currentUrl}")`);
  assert(scenarioHtmlMode === "immersive", `galge-scenario.html でも immersive が反映されること (got: "${scenarioHtmlMode}")`);

  console.log(`\n=== 結果: ${passed} passed, ${failed} failed ===`);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();
