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
      const graphStage = document.getElementById("graph-stage");
      const header = document.querySelector(".header");
      const headerCopy = document.querySelector(".header-copy");
      const backLink = document.querySelector(".back-link");
      const headerStyle = header ? getComputedStyle(header) : null;
      const graphShellStyle = graphShell ? getComputedStyle(graphShell) : null;
      const backLinkStyle = backLink ? getComputedStyle(backLink) : null;
      const residentHubCard = document.querySelector('.scenario-card[data-graph-node-id="resident_hub"]');
      const hallCard = document.querySelector('.scenario-card[data-graph-node-id="hall"]');
      const worldEdgeCard = document.querySelector('.scenario-card[data-graph-node-id="world_edge"]');
      const layerEightNodes = Array.from(document.querySelectorAll('.scenario-card[data-graph-layer="8"]'));
      const layerEightLefts = layerEightNodes.map((element) => Math.round(parseFloat(element.style.left)));
      const layerEightTops = layerEightNodes.map((element) => Math.round(parseFloat(element.style.top)));
      const edgeMaskRects = document.querySelectorAll('#graph-edge-mask rect[data-mask-node-id]');
      const canvas = document.getElementById("particle-canvas");
      const prevNav = document.getElementById("date-nav-prev");
      const nextNav = document.getElementById("date-nav-next");

      return {
        layoutMode: document.body.dataset.graphLayout,
        headerHeight: header ? Math.round(header.getBoundingClientRect().height) : null,
        headerWidth: header ? Math.round(header.getBoundingClientRect().width) : null,
        headerCopyWidth: headerCopy ? Math.round(headerCopy.getBoundingClientRect().width) : null,
        backLinkRect: backLink ? backLink.getBoundingClientRect().toJSON() : null,
        backLinkStyle: backLinkStyle
          ? {
              bottom: backLinkStyle.bottom,
              background: backLinkStyle.backgroundColor,
              color: backLinkStyle.color,
            }
          : null,
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
        residentHubInline: residentHubCard
          ? {
              titleCount: residentHubCard.querySelectorAll(".card-title").length,
              iconCount: residentHubCard.querySelectorAll(".card-icon").length,
              kindCount: residentHubCard.querySelectorAll(".card-kind").length,
              summaryCount: residentHubCard.querySelectorAll(".card-summary").length,
              metaCount: residentHubCard.querySelectorAll(".card-meta").length,
              visited: residentHubCard.dataset.graphVisited || "",
            }
          : null,
        hallVisited: hallCard ? hallCard.dataset.graphVisited || "" : "",
        worldEdgeVisited: worldEdgeCard ? worldEdgeCard.dataset.graphVisited || "" : "",
        edgeMaskRectCount: edgeMaskRects.length,
        hallMaskExists: Boolean(document.querySelector('#graph-edge-mask rect[data-mask-node-id="hall"]')),
        residentHubMaskExists: Boolean(document.querySelector('#graph-edge-mask rect[data-mask-node-id="resident_hub"]')),
        prevNavHidden: prevNav ? prevNav.hidden : true,
        nextNavHidden: nextNav ? nextNav.hidden : true,
        prevNavTargetDate: prevNav ? prevNav.dataset.targetDate || "" : "",
        nextNavTargetDate: nextNav ? nextNav.dataset.targetDate || "" : "",
        prevNavHref: prevNav ? prevNav.getAttribute("href") || "" : "",
        nextNavHref: nextNav ? nextNav.getAttribute("href") || "" : "",
        shellWidth: Math.round(graphShell.getBoundingClientRect().width),
        shellClientWidth: graphShell.clientWidth,
        shellScrollWidth: graphShell.scrollWidth,
        shellClientHeight: graphShell.clientHeight,
        shellScrollHeight: graphShell.scrollHeight,
        graphScale: graphStage ? Number(graphStage.dataset.graphScale || "1") : 1,
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
    assert(snapshot.headerHeight !== null && snapshot.headerHeight <= 132, `desktop header is compressed into a thin band (got: ${snapshot.headerHeight}px)`);
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
      snapshot.headerVars.topBg.includes("0.32") &&
        snapshot.headerVars.bottomBg.includes("0.42") &&
        snapshot.headerVars.blur.includes("8px") &&
        snapshot.headerVars.graphShellTopBg.includes("0.76"),
      `desktop header and graph shell use the lighter transparency settings (${JSON.stringify(snapshot.headerVars)})`
    );
  });

  console.log("\n=== desktop 2026-03-22 graph ===");
  await withPage({ viewport: { width: 1600, height: 1000 } }, async (page) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "waddy-dream-visited-v1",
        JSON.stringify({
          "2026-03-22_顕幻の交差路::resident_hub": {
            scenario: "2026-03-22_顕幻の交差路",
            entry: "resident_hub",
            visitedAt: "2026-03-22T00:00:00.000Z",
          },
          "2026-03-22_顕幻の交差路::world_edge": {
            scenario: "2026-03-22_顕幻の交差路",
            entry: "world_edge",
            visitedAt: "2026-03-22T00:00:00.000Z",
          },
        })
      );
    });
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
    assert(snapshot.graphScale < 1, `desktop graph shrinks when width or height would overflow the viewport (got: ${snapshot.graphScale})`);
    assert(
      snapshot.shellScrollWidth <= snapshot.shellClientWidth + 1,
      `desktop graph auto-fits horizontally without a scrollbar (client: ${snapshot.shellClientWidth}, scroll: ${snapshot.shellScrollWidth})`
    );
    assert(
      snapshot.shellScrollHeight <= snapshot.shellClientHeight + 1,
      `desktop graph auto-fits vertically without a scrollbar (client: ${snapshot.shellClientHeight}, scroll: ${snapshot.shellScrollHeight})`
    );
    assert(
      snapshot.backLinkRect &&
        snapshot.backLinkRect.bottom <= snapshot.viewportHeight - 40 &&
        snapshot.backLinkRect.top >= 0 &&
        Math.abs(snapshot.backLinkRect.left + snapshot.backLinkRect.width / 2 - snapshot.viewportWidth / 2) <= 24,
      `desktop back link stays visible near the bottom center (${JSON.stringify(snapshot.backLinkRect)})`
    );
    assert(
      snapshot.backLinkStyle &&
        snapshot.backLinkStyle.bottom === "64px" &&
        snapshot.backLinkStyle.background.includes("0.78") &&
        snapshot.backLinkStyle.color.includes("0.84"),
      `desktop back link uses the stronger fixed styling (${JSON.stringify(snapshot.backLinkStyle)})`
    );
    assert(
      snapshot.residentHubInline &&
        snapshot.residentHubInline.titleCount === 1 &&
        snapshot.residentHubInline.iconCount === 0 &&
        snapshot.residentHubInline.kindCount === 0 &&
        snapshot.residentHubInline.summaryCount === 0 &&
        snapshot.residentHubInline.metaCount === 0 &&
        snapshot.residentHubInline.visited === "true",
      `desktop cards render title-only inline (${JSON.stringify(snapshot.residentHubInline)})`
    );
    assert(
      snapshot.hallVisited === "false" && snapshot.worldEdgeVisited === "true",
      `dream-select colors only the visited nodes from storage (hall: ${snapshot.hallVisited}, world_edge: ${snapshot.worldEdgeVisited})`
    );
    assert(
      snapshot.edgeMaskRectCount >= 10 && snapshot.hallMaskExists && snapshot.residentHubMaskExists,
      `graph edges are masked under node cards so lines do not cross the text (mask count: ${snapshot.edgeMaskRectCount})`
    );
    assert(
      snapshot.prevNavHidden === false &&
        snapshot.nextNavHidden === false &&
        snapshot.prevNavTargetDate === "2026-03-21" &&
        snapshot.nextNavTargetDate === "2026-03-23" &&
        snapshot.prevNavHref.includes("date=2026-03-21") &&
        snapshot.nextNavHref.includes("date=2026-03-23"),
      `desktop side arrows navigate to adjacent A.D.M.S. dates (${JSON.stringify({
        prevHidden: snapshot.prevNavHidden,
        nextHidden: snapshot.nextNavHidden,
        prevDate: snapshot.prevNavTargetDate,
        nextDate: snapshot.nextNavTargetDate,
      })})`
    );

    await page.hover('.scenario-card[data-graph-node-id="resident_hub"]');
    await page.waitForSelector('#card-popup-layer[data-open="true"]', { timeout: 5000 });
    const popupSnapshot = await page.evaluate(() => ({
      popupTitle: document.getElementById("card-popup-title")?.textContent || "",
      popupSummary: document.getElementById("card-popup-summary")?.textContent || "",
      popupHref: document.getElementById("card-popup-link")?.getAttribute("href") || "",
    }));
    assert(popupSnapshot.popupTitle.includes("住"), `desktop hover popup shows the card title (got: ${popupSnapshot.popupTitle})`);
    assert(popupSnapshot.popupSummary.length > 0, "desktop hover popup exposes the hidden summary");
    assert(popupSnapshot.popupHref.includes("mode=immersive"), `desktop hover popup link keeps immersive mode (got: ${popupSnapshot.popupHref})`);
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
    assert(snapshot.graphScale === 1, `mobile portrait keeps the original scale (got: ${snapshot.graphScale})`);
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

    const beforeTapUrl = page.url();
    await page.click('.scenario-card[data-graph-node-id="resident_hub"]');
    await page.waitForSelector('#card-popup-layer[data-open="true"]', { timeout: 5000 });
    const touchPopup = await page.evaluate(() => ({
      popupHref: document.getElementById("card-popup-link")?.getAttribute("href") || "",
      popupSummary: document.getElementById("card-popup-summary")?.textContent || "",
    }));
    assert(page.url() === beforeTapUrl, "mobile portrait first tap opens the popup instead of navigating");
    assert(touchPopup.popupSummary.length > 0, "mobile portrait popup exposes hidden details");
    assert(touchPopup.popupHref.includes("mode=immersive"), `mobile portrait popup link keeps immersive mode (got: ${touchPopup.popupHref})`);
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
