const { chromium, devices } = require("playwright");

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

  async function withPage(contextOptions, run) {
    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();
    try {
      await run(page);
    } finally {
      await context.close();
    }
  }

  function getGraphSnapshotScript() {
    return () => {
      function getRect(nodeId) {
        const element = document.querySelector(`.scenario-card[data-graph-node-id="${nodeId}"]`);
        return element ? element.getBoundingClientRect().toJSON() : null;
      }

      function getOptionalRect(selector) {
        const element = document.querySelector(selector);
        return element ? element.getBoundingClientRect().toJSON() : null;
      }

      const graphShell = document.getElementById("graph-shell");
      const header = document.querySelector(".header");
      const headerCopy = document.querySelector(".header-copy");
      const headerStyle = header ? getComputedStyle(header) : null;
      const graphShellStyle = graphShell ? getComputedStyle(graphShell) : null;
      const layerEightNodes = Array.from(document.querySelectorAll('.scenario-card[data-graph-layer="8"]'));
      const layerEightLefts = layerEightNodes.map((element) => Math.round(parseFloat(element.style.left)));
      const layerEightTops = layerEightNodes.map((element) => Math.round(parseFloat(element.style.top)));
      const canvas = document.getElementById("particle-canvas");

      return {
        layoutMode: document.body.dataset.graphLayout,
        headerHeight: header ? Math.round(header.getBoundingClientRect().height) : null,
        headerWidth: header ? Math.round(header.getBoundingClientRect().width) : null,
        headerCopyWidth: headerCopy ? Math.round(headerCopy.getBoundingClientRect().width) : null,
        headerRightGap:
          header && headerCopy ? Math.round(header.getBoundingClientRect().right - headerCopy.getBoundingClientRect().right) : null,
        headerLeftDelta:
          header && headerCopy ? Math.round(headerCopy.getBoundingClientRect().left - header.getBoundingClientRect().left) : null,
        dateLabelRect: getOptionalRect("#date-label"),
        titleRect: getOptionalRect("h1"),
        subtitleRect: getOptionalRect(".subtitle"),
        mapTitleRect: getOptionalRect("#map-title"),
        legendRect: getOptionalRect(".legend"),
        headerVars: {
          topBg: headerStyle ? headerStyle.getPropertyValue("--header-top-bg").trim() : "",
          bottomBg: headerStyle ? headerStyle.getPropertyValue("--header-bottom-bg").trim() : "",
          blur: headerStyle ? headerStyle.getPropertyValue("--header-blur").trim() : "",
          graphShellTopBg: graphShellStyle ? graphShellStyle.getPropertyValue("--graph-shell-top-bg").trim() : "",
        },
        shellWidth: Math.round(graphShell.getBoundingClientRect().width),
        shellClientWidth: graphShell.clientWidth,
        shellScrollWidth: graphShell.scrollWidth,
        viewportWidth: window.innerWidth,
        canvasWidth: canvas ? canvas.width : null,
        canvasHeight: canvas ? canvas.height : null,
        viewportHeight: window.innerHeight,
        livingStart: getRect("living_start"),
        hall: getRect("hall"),
        residentHub: getRect("resident_hub"),
        worldEdge: getRect("world_edge"),
        layerEightRowCount: new Set(layerEightTops).size,
        layerEightColumnCount: new Set(layerEightLefts).size,
      };
    };
  }

  console.log("\n=== desktop 2026-03-20 graph ===");
  await withPage({ viewport: { width: 1600, height: 1000 } }, async (page) => {
    await page.goto(`${baseUrl}/dream-select.html?date=2026-03-20`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('.scenario-card[data-graph-node-id="kanekoya_common"]', { timeout: 5000 });
    const march20RejoinCount = await page.locator('.graph-edge[data-edge-style="rejoin"]').count();
    const march20RejoinNodeCount = await page.locator('.scenario-card[data-graph-kind="rejoin"]').count();
    assert(march20RejoinCount >= 1, `2026-03-20 graph exposes at least one rejoin edge (got: ${march20RejoinCount})`);
    assert(
      march20RejoinNodeCount >= 2,
      `2026-03-20 graph exposes the main rejoin nodes such as kanekoya_common / iv_inside (got: ${march20RejoinNodeCount})`
    );
  });

  console.log("\n=== desktop 2026-03-21 graph ===");
  await withPage({ viewport: { width: 1600, height: 1000 } }, async (page) => {
    await page.goto(`${baseUrl}/dream-select.html?date=2026-03-21`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('.scenario-card[data-graph-node-id="zone_10"]', { timeout: 5000 });
    const march21GenkaiCount = await page.locator('.scenario-card[data-graph-kind="side"][data-graph-realm="genkai"]').count();
    const march21EndingCount = await page.locator('.scenario-card[data-graph-kind="ending"][data-graph-realm="kenkai"]').count();
    const snapshot = await page.evaluate(getGraphSnapshotScript());
    assert(march21GenkaiCount === 10, `2026-03-21 graph shows 10 genkai side nodes (got: ${march21GenkaiCount})`);
    assert(march21EndingCount === 5, `2026-03-21 graph shows 5 kenkai endings (got: ${march21EndingCount})`);
    assert(snapshot.headerHeight !== null && snapshot.headerHeight <= 110, `desktop header is compressed into a thin band (got: ${snapshot.headerHeight}px)`);
    assert(snapshot.headerLeftDelta !== null && snapshot.headerLeftDelta <= 16, `desktop header copy stays near the left edge (got: ${snapshot.headerLeftDelta}px)`);
    assert(snapshot.headerRightGap !== null && snapshot.headerRightGap >= 320, `desktop header leaves a broad empty right side (got: ${snapshot.headerRightGap}px)`);
    assert(
      snapshot.dateLabelRect &&
        snapshot.titleRect &&
        snapshot.subtitleRect &&
        snapshot.mapTitleRect &&
        snapshot.legendRect &&
        Math.abs(snapshot.dateLabelRect.left - snapshot.titleRect.left) <= 2 &&
        Math.abs(snapshot.titleRect.left - snapshot.subtitleRect.left) <= 2 &&
        Math.abs(snapshot.subtitleRect.left - snapshot.mapTitleRect.left) <= 2 &&
        Math.abs(snapshot.mapTitleRect.left - snapshot.legendRect.left) <= 2,
      "desktop header text and legend are left-aligned inside the margin"
    );
    assert(
      snapshot.headerVars.topBg.includes("0.28") &&
        snapshot.headerVars.bottomBg.includes("0.36") &&
        snapshot.headerVars.blur.includes("4px") &&
        snapshot.headerVars.graphShellTopBg.includes("0.76"),
      `desktop header and graph shell use the lighter transparency settings (${JSON.stringify(snapshot.headerVars)})`
    );
  });

  console.log("\n=== desktop 2026-03-22 graph ===");
  await withPage({ viewport: { width: 1600, height: 1000 } }, async (page) => {
    await page.goto(`${baseUrl}/dream-select.html?date=2026-03-22`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('.scenario-card[data-graph-node-id="resident_hub"]', { timeout: 5000 });
    const snapshot = await page.evaluate(getGraphSnapshotScript());
    assert(snapshot.layoutMode === "desktop-horizontal", `desktop uses desktop-horizontal layout (got: ${snapshot.layoutMode})`);
    assert(
      snapshot.livingStart &&
        snapshot.hall &&
        snapshot.residentHub &&
        snapshot.worldEdge &&
        snapshot.livingStart.x < snapshot.hall.x &&
        snapshot.hall.x < snapshot.residentHub.x &&
        snapshot.residentHub.x < snapshot.worldEdge.x,
      "desktop graph lays out the main kenkai route in increasing layer order"
    );
    assert(
      snapshot.shellWidth >= snapshot.viewportWidth - 64,
      `desktop graph shell uses nearly the full viewport width (viewport: ${snapshot.viewportWidth}, shell: ${snapshot.shellWidth})`
    );
    assert(
      snapshot.canvasWidth === snapshot.viewportWidth && snapshot.canvasHeight === snapshot.viewportHeight,
      `particle canvas is sized to the viewport (got: ${snapshot.canvasWidth}x${snapshot.canvasHeight}, viewport: ${snapshot.viewportWidth}x${snapshot.viewportHeight})`
    );
  });

  console.log("\n=== mobile portrait 2026-03-22 graph ===");
  await withPage({ ...devices["iPhone 13"] }, async (page) => {
    await page.goto(`${baseUrl}/dream-select.html?date=2026-03-22`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('.scenario-card[data-graph-node-id="resident_hub"]', { timeout: 5000 });
    const snapshot = await page.evaluate(getGraphSnapshotScript());
    assert(snapshot.layoutMode === "mobile-vertical", `mobile portrait uses mobile-vertical layout (got: ${snapshot.layoutMode})`);
    assert(
      snapshot.livingStart &&
        snapshot.hall &&
        snapshot.residentHub &&
        snapshot.worldEdge &&
        snapshot.livingStart.y < snapshot.hall.y &&
        snapshot.hall.y < snapshot.residentHub.y &&
        snapshot.residentHub.y < snapshot.worldEdge.y,
      "mobile portrait graph lays out the main kenkai route in vertical order"
    );
    assert(
      snapshot.shellScrollWidth <= snapshot.shellClientWidth + 1,
      `mobile portrait graph does not require horizontal scrolling (client: ${snapshot.shellClientWidth}, scroll: ${snapshot.shellScrollWidth})`
    );
    assert(
      snapshot.layerEightRowCount >= 4 && snapshot.layerEightColumnCount >= 2,
      `mobile portrait graph spreads resident branches into multiple rows and columns (rows: ${snapshot.layerEightRowCount}, cols: ${snapshot.layerEightColumnCount})`
    );
    assert(
      snapshot.dateLabelRect &&
        snapshot.titleRect &&
        snapshot.subtitleRect &&
        snapshot.mapTitleRect &&
        Math.abs(snapshot.dateLabelRect.left - snapshot.titleRect.left) <= 2 &&
        Math.abs(snapshot.titleRect.left - snapshot.subtitleRect.left) <= 2 &&
        Math.abs(snapshot.subtitleRect.left - snapshot.mapTitleRect.left) <= 2,
      "mobile portrait header remains left-aligned"
    );
    assert(
      snapshot.headerVars.topBg.includes("0.34") &&
        snapshot.headerVars.bottomBg.includes("0.44") &&
        snapshot.headerVars.blur === "none",
      `mobile portrait uses the denser transparent header settings (${JSON.stringify(snapshot.headerVars)})`
    );
  });

  console.log("\n=== mobile landscape 2026-03-22 graph ===");
  await withPage(
    {
      ...devices["iPhone 13"],
      viewport: { width: 844, height: 390 },
      screen: { width: 844, height: 390 },
    },
    async (page) => {
      await page.goto(`${baseUrl}/dream-select.html?date=2026-03-22`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector('.scenario-card[data-graph-node-id="resident_hub"]', { timeout: 5000 });
      const snapshot = await page.evaluate(getGraphSnapshotScript());
      assert(snapshot.layoutMode === "desktop-horizontal", `mobile landscape falls back to desktop-horizontal layout (got: ${snapshot.layoutMode})`);
      assert(
        snapshot.livingStart &&
          snapshot.hall &&
          snapshot.residentHub &&
          snapshot.worldEdge &&
          snapshot.livingStart.x < snapshot.hall.x &&
          snapshot.hall.x < snapshot.residentHub.x &&
          snapshot.residentHub.x < snapshot.worldEdge.x,
        "mobile landscape graph returns to horizontal layer order"
      );
      assert(
        snapshot.shellScrollWidth > snapshot.shellClientWidth,
        `mobile landscape graph allows horizontal scroll again (client: ${snapshot.shellClientWidth}, scroll: ${snapshot.shellScrollWidth})`
      );
    }
  );

  console.log(`\n=== result: ${passed} passed, ${failed} failed ===`);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();
