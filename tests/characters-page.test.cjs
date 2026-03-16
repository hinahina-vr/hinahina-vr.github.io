// Playwright test for characters.html - 13 new characters verification
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const baseUrl = 'http://127.0.0.1:8181';
  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`  PASS: ${name}`);
      passed++;
    } else {
      console.log(`  FAIL: ${name}`);
      failed++;
    }
  }

  // Test 1: characters.html loads successfully
  console.log('\n=== characters.html テスト ===');
  const res = await page.goto(`${baseUrl}/characters.html`, { waitUntil: 'domcontentloaded' });
  assert(res.status() === 200, 'characters.html が200で読み込めること');

  // Test 2: Page title
  const title = await page.title();
  assert(title.includes('登場人物'), `ページタイトルに「登場人物」が含まれること (got: "${title}")`);

  // Test 3: Total character cards count (19 existing + 13 new = 32)
  const totalCards = await page.$$('.char-card');
  assert(totalCards.length === 33, `キャラカードが合計33枚あること（シミュラクル4+大奥28+みとら1） (got: ${totalCards.length})`);

  // Test 4: Count updated to 28
  const pageContent = await page.content();
  assert(pageContent.includes('28名'), `大奥の人数が「28名」と表示されること`);

  // Test 5: Verify all 13 new character cards exist with correct links
  console.log('\n=== 新キャラ13名の検証 ===');

  const newChars = [
    { css: '.card-hazuki', name: '葉月クルミ', diary: 'diary-hazuki.html' },
    { css: '.card-mitsuba', name: '丸井みつば', diary: 'diary-mitsuba.html' },
    { css: '.card-tama', name: 'たまちゃん', diary: 'diary-tama.html' },
    { css: '.card-rizel', name: 'りぜる', diary: 'diary-rizel.html' },
    { css: '.card-mayuki', name: '柊真雪', diary: 'diary-mayuki.html' },
    { css: '.card-ana', name: 'アナ・コッポラ', diary: 'diary-ana.html' },
    { css: '.card-kyoko', name: '歳納京子', diary: 'diary-kyoko.html' },
    { css: '.card-sharo', name: '桐間紗路', diary: 'diary-sharo.html' },
    { css: '.card-kukuri', name: 'ククリ', diary: 'diary-kukuri.html' },
    { css: '.card-rin', name: '九重りん', diary: 'diary-rin.html' },
    { css: '.card-nemurin', name: 'ねむりん', diary: 'diary-nemurin.html' },
    { css: '.card-hinako', name: '雛子', diary: 'diary-hinako.html' },
    { css: '.card-astarotte', name: 'アスタロッテ', diary: 'diary-astarotte.html' },
  ];

  for (const char of newChars) {
    const card = await page.$(char.css);
    assert(card !== null, `${char.name} のカード (${char.css}) が存在すること`);
    
    if (card) {
      const nameEl = await card.$('.char-name');
      const nameText = nameEl ? await nameEl.textContent() : '';
      assert(nameText.includes(char.name), `${char.name} の名前が正しいこと (got: "${nameText}")`);
      
      const link = await card.$('.char-links a');
      if (link) {
        const href = await link.getAttribute('href');
        assert(href && href.includes(char.diary), `${char.name} の日記リンクが ${char.diary} を含むこと (got: "${href}")`);
      } else {
        assert(false, `${char.name} の日記リンクが存在すること`);
      }
    }
  }

  // Test 6: Verify diary pages are accessible for new characters
  console.log('\n=== 日記ページリンクの到達性テスト ===');
  for (const char of newChars) {
    const diaryRes = await page.goto(`${baseUrl}/${char.diary}`, { waitUntil: 'domcontentloaded' });
    assert(diaryRes.status() === 200, `${char.name} の日記 (${char.diary}) が200で読み込めること`);
  }

  // Summary
  console.log(`\n=== 結果: ${passed} passed, ${failed} failed ===`);
  
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();
