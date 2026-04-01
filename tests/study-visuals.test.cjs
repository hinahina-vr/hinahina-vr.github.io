const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
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

  console.log("\n=== visual runtime standard motion ===");
  const normalContext = await browser.newContext();
  const normalPage = await normalContext.newPage();
  await normalPage.goto(`${baseUrl}/tests/fixtures/study-visuals-fixture.html`, {
    waitUntil: "domcontentloaded",
  });
  await normalPage.waitForSelector('#line-demo[data-study-visual-ready="true"]');
  await normalPage.waitForSelector('#vector-demo[data-study-visual-ready="true"]');
  await normalPage.waitForSelector('#step-demo[data-study-visual-ready="true"]');

  const lineSvg = await normalPage.$("#line-demo svg");
  assert(lineSvg !== null, "line-chart が SVG を描画すること");

  await normalPage.$eval("#line-demo .study-visual__range", (input) => {
    input.value = "2";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  const highlightIndex = await normalPage.getAttribute("#line-demo", "data-study-highlight-index");
  assert(highlightIndex === "2", `line-chart の注目点が操作できること (got: "${highlightIndex}")`);

  const activeBefore = await normalPage.getAttribute("#vector-demo", "data-study-active-vectors");
  await normalPage.locator("#vector-demo .study-visual__button").first().click();
  const activeAfter = await normalPage.getAttribute("#vector-demo", "data-study-active-vectors");
  assert(activeBefore === "2" && activeAfter === "1", "vector-diagram のベクトル表示を切り替えられること");

  const initialStep = await normalPage.getAttribute("#step-demo", "data-study-current-step");
  const normalPlaying = await normalPage.getAttribute("#step-demo", "data-study-playing");
  await normalPage.waitForTimeout(450);
  const movedStep = await normalPage.getAttribute("#step-demo", "data-study-current-step");
  assert(normalPlaying === "true", `通常環境では step-animation が自動再生されること (got: "${normalPlaying}")`);
  assert(initialStep !== movedStep, "通常環境では step-animation のステップが進むこと");
  await normalContext.close();

  console.log("\n=== visual runtime reduced motion ===");
  const reducedContext = await browser.newContext({ reducedMotion: "reduce" });
  const reducedPage = await reducedContext.newPage();
  await reducedPage.goto(`${baseUrl}/tests/fixtures/study-visuals-fixture.html`, {
    waitUntil: "domcontentloaded",
  });
  await reducedPage.waitForSelector('#step-demo[data-study-visual-ready="true"]');

  const reducedMotion = await reducedPage.getAttribute("#step-demo", "data-study-motion");
  const reducedPlaying = await reducedPage.getAttribute("#step-demo", "data-study-playing");
  assert(reducedMotion === "reduced", `reduced-motion が反映されること (got: "${reducedMotion}")`);
  assert(reducedPlaying === "false", `reduced-motion では自動再生しないこと (got: "${reducedPlaying}")`);

  await reducedPage.locator("#step-demo .study-visual__button").nth(1).click();
  const steppedIndex = await reducedPage.getAttribute("#step-demo", "data-study-current-step");
  assert(steppedIndex === "1", `reduced-motion でも step 操作はできること (got: "${steppedIndex}")`);
  await reducedContext.close();

  console.log(`\n=== 結果: ${passed} passed, ${failed} failed ===`);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();
