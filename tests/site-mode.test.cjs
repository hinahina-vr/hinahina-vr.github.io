const { chromium } = require("playwright");

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
  assert(htmlMode === "immersive", `index.html 初回表示が immersive であること (got: "${htmlMode}")`);
  assert(bodyClass.includes("mode-immersive"), `body に mode-immersive が付くこと (got: "${bodyClass}")`);

  console.log("\n=== site mode persistence across pages ===");
  await page.click("[data-site-mode-toggle]");
  await page.waitForTimeout(250);
  htmlMode = await page.getAttribute("html", "data-site-mode");
  let storedMode = await page.evaluate(() => window.localStorage.getItem("waddy-display-mode"));
  assert(htmlMode === "classic", `トップで classic に切り替わること (got: "${htmlMode}")`);
  assert(storedMode === "classic", `localStorage に classic が保存されること (got: "${storedMode}")`);
  await page.goto(`${baseUrl}/links.html`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-site-mode-toggle]", { timeout: 5000 });
  htmlMode = await page.getAttribute("html", "data-site-mode");
  bodyClass = await page.getAttribute("body", "class");
  assert(htmlMode === "classic", `links.html でも classic が維持されること (got: "${htmlMode}")`);
  assert(bodyClass.includes("mode-classic"), `links.html の body が classic であること (got: "${bodyClass}")`);

  console.log("\n=== diary despair coexistence ===");
  await page.goto(`${baseUrl}/diary.html`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  bodyClass = await page.getAttribute("body", "class");
  assert(bodyClass.includes("diary-despair"), `diary.html に diary-despair が残ること (got: "${bodyClass}")`);
  assert(bodyClass.includes("mode-classic"), `diary.html でも classic が共存すること (got: "${bodyClass}")`);

  console.log("\n=== galge mode honors stored classic ===");
  await page.goto(`${baseUrl}/galge-mode.html?char=hina&date=2026-03-16`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  bodyClass = await page.getAttribute("body", "class");
  assert(bodyClass.includes("mode-classic"), `galge-mode.html が保存済み classic で開くこと (got: "${bodyClass}")`);

  console.log("\n=== query mode override ===");
  await page.goto(`${baseUrl}/index.html?mode=immersive`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-site-mode-toggle]", { timeout: 5000 });
  htmlMode = await page.getAttribute("html", "data-site-mode");
  storedMode = await page.evaluate(() => window.localStorage.getItem("waddy-display-mode"));
  assert(htmlMode === "immersive", `?mode=immersive が保存値を上書きすること (got: "${htmlMode}")`);
  assert(storedMode === "immersive", `query override 後に storage も immersive になること (got: "${storedMode}")`);

  console.log("\n=== dream select propagation ===");
  await page.goto(`${baseUrl}/dream-select.html?date=2026-03-20`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#mode-toggle", { timeout: 5000 });
  await page.click("#mode-toggle");
  await page.waitForTimeout(250);
  const firstHref = await page.$eval(".scenario-card", (el) => el.getAttribute("href"));
  assert(firstHref.includes("mode=classic"), `dream-select.html の遷移先に mode=classic が付くこと (got: "${firstHref}")`);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded" }),
    page.click(".scenario-card"),
  ]);
  const currentUrl = page.url();
  const scenarioHtmlMode = await page.getAttribute("html", "data-site-mode");
  assert(currentUrl.includes("mode=classic"), `galge-scenario.html への遷移 URL に mode=classic が含まれること (got: "${currentUrl}")`);
  assert(scenarioHtmlMode === "classic", `galge-scenario.html でも classic が反映されること (got: "${scenarioHtmlMode}")`);

  console.log(`\n=== 結果: ${passed} passed, ${failed} failed ===`);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();
