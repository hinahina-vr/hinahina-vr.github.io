const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
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

  console.log("\n=== study.html テスト ===");
  let res = await page.goto(`${baseUrl}/study.html`, { waitUntil: "domcontentloaded" });
  assert(res.status() === 200, "study.html が200で読み込めること");

  let title = await page.title();
  assert(title === "勉強コーナー | ワディーゲストハウス", `ページタイトルが正しいこと (got: "${title}")`);

  const mechanicsLink = await page.$('a.feature-link[href="./study-mechanics.html"]');
  assert(mechanicsLink !== null, "study.html に力学の章一覧リンクが存在すること");

  const homeText = await page.textContent("body");
  assert(homeText.includes("力学"), "study.html に力学が掲載されていること");
  assert(!homeText.includes("このコーナーの進め方"), "study.html に運用ルールの見出しが出ていないこと");
  assert(!homeText.includes("打ち合わせMD"), "study.html に内部運用の文言が出ていないこと");

  console.log("\n=== study-mechanics.html テスト ===");
  res = await page.goto(`${baseUrl}/study-mechanics.html`, { waitUntil: "domcontentloaded" });
  assert(res.status() === 200, "study-mechanics.html が200で読み込めること");

  title = await page.title();
  assert(title === "力学 | ワディーゲストハウス", `ページタイトルが正しいこと (got: "${title}")`);

  const chapterLink = await page.$('a[href="./study-mechanics-01.html"]');
  assert(chapterLink !== null, "study-mechanics.html に第1章へのリンクが存在すること");
  const mechanicsStatus = await page.$(".study-status");
  assert(mechanicsStatus === null, "study-mechanics.html に状態バッジが出ていないこと");

  const mechanicsText = await page.textContent("body");
  assert(mechanicsText.includes("質量と速度"), "study-mechanics.html に 質量と速度 が表示されること");
  assert(mechanicsText.includes("いま読める章です"), "study-mechanics.html に自然な章説明が表示されること");
  assert(!mechanicsText.includes("この科目のルール"), "study-mechanics.html に運用ルールの見出しが出ていないこと");
  assert(!mechanicsText.includes("老中AI"), "study-mechanics.html に内部運用のAI案内が出ていないこと");

  console.log("\n=== study-mechanics-01.html テスト ===");
  res = await page.goto(`${baseUrl}/study-mechanics-01.html`, { waitUntil: "domcontentloaded" });
  assert(res.status() === 200, "study-mechanics-01.html が200で読み込めること");

  title = await page.title();
  assert(
    title === "力学 — 質量と速度 | ワディーゲストハウス",
    `ページタイトルが正しいこと (got: "${title}")`
  );
  const chapterStatus = await page.$(".study-status");
  assert(chapterStatus === null, "章ページに状態バッジが出ていないこと");

  const chapterText = await page.textContent("body");
  assert(chapterText.includes("概要"), "章ページに 概要 見出しがあること");
  assert(chapterText.includes("本文"), "章ページに 本文 見出しがあること");
  assert(chapterText.includes("補足"), "章ページに 補足 見出しがあること");
  assert(chapterText.includes("時間と位置の関係"), "章ページに節内の可視化タイトルが表示されること");
  assert(chapterText.includes("ひなた"), "章ページに ひなた の感想があること");
  assert(chapterText.includes("一ノ瀬ことみ"), "章ページに 一ノ瀬ことみ の感想があること");
  assert(chapterText.includes("キク8号"), "章ページに キク8号 の感想があること");
  assert(chapterText.includes("リチャードファインマン"), "章ページに担当した老中AI名があること");
  assert(chapterText.includes("いま読める章です"), "章ページの案内文が自然な文言になっていること");
  assert(!chapterText.includes("打ち合わせMD"), "章ページに内部の draft 情報が出ていないこと");
  const visualCount = await page.$$eval(".study-visual", (nodes) => nodes.length);
  assert(visualCount >= 4, `章ページに可視化ブロックが4つ以上あること (got: ${visualCount})`);

  console.log("\n=== index.html テスト ===");
  await page.goto(`${baseUrl}/index.html`, { waitUntil: "domcontentloaded" });
  const studyLink = await page.$('a.feature-link[href="./study.html"]');
  assert(studyLink !== null, "index.html に勉強コーナーへの導線が存在すること");
  const mechanicsChapterLink = await page.$('a.feature-link[href="./study-mechanics-01.html"]');
  assert(mechanicsChapterLink !== null, "index.html に力学第1章への直リンクが存在すること");

  const indexText = await page.textContent("body");
  assert(indexText.includes("勉強コーナー"), "index.html に勉強コーナーの文言が出ていること");
  assert(indexText.includes("力学の第1章"), "index.html に勉強コーナーの紹介文が出ていること");
  assert(indexText.includes("質量と速度"), "index.html から現在読める章が分かること");

  console.log(`\n=== 結果: ${passed} passed, ${failed} failed ===`);

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();
