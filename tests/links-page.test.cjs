// Playwright test for links.html
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const baseUrl = 'http://127.0.0.1:8080';
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

  // Test 1: links.html loads successfully
  console.log('\n=== links.html テスト ===');
  const res = await page.goto(`${baseUrl}/links.html`, { waitUntil: 'domcontentloaded' });
  assert(res.status() === 200, 'links.html が200で読み込めること');

  // Test 2: Page title
  const title = await page.title();
  assert(title === 'リンク集 | ワディーゲストハウス', `ページタイトルが正しいこと (got: "${title}")`);

  // Test 3: NPIP link exists and points to correct URL
  const npipLink = await page.$('a#link-npip');
  assert(npipLink !== null, 'NPIP Scribbles MX のリンクが存在すること');
  
  if (npipLink) {
    const href = await npipLink.getAttribute('href');
    assert(href === 'https://npip.me/', `リンク先が https://npip.me/ であること (got: "${href}")`);
    
    const text = await npipLink.textContent();
    assert(text.includes('NPIP Scribbles MX'), `リンクテキストが "NPIP Scribbles MX" を含むこと (got: "${text}")`);
  }

  // Test 4: Banner image exists
  const bannerImg = await page.$('img.link-card-banner');
  assert(bannerImg !== null, 'バナー画像が存在すること');
  
  if (bannerImg) {
    const src = await bannerImg.getAttribute('src');
    assert(src.includes('pippi_link.gif'), `バナー画像が pippi_link.gif であること (got: "${src}")`);
  }

  // Test 5: Description text exists
  const desc = await page.$('.link-card-desc');
  assert(desc !== null, '紹介文が存在すること');
  
  if (desc) {
    const descText = await desc.textContent();
    assert(descText.includes('ねおぴっぴ'), `紹介文に "ねおぴっぴ" が含まれること`);
  }

  // Test 6: Back link to index
  const backLink = await page.$('a.back-link[href="./index.html"]');
  assert(backLink !== null, 'トップページへの戻りリンクが存在すること');

  // Test 7: index.html has link to links.html
  console.log('\n=== index.html テスト ===');
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
  const linksPageLink = await page.$('a.feature-link[href="./links.html"]');
  assert(linksPageLink !== null, 'index.html にリンク集ページへのリンクが存在すること');

  // Summary
  console.log(`\n=== 結果: ${passed} passed, ${failed} failed ===`);
  
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();
