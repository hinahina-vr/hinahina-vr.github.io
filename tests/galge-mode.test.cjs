// Playwright test for galge-mode.html
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:8181';
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

  // === galge-mode.html 基本テスト ===
  console.log('\n=== galge-mode.html 基本テスト ===');

  // Test 1: Page loads
  const res = await page.goto(`${baseUrl}/galge-mode.html?char=hina&date=2026-03-16`, { waitUntil: 'domcontentloaded' });
  assert(res.status() === 200, 'galge-mode.html が200で読み込めること');

  // Test 2: Page title
  const title = await page.title();
  assert(title.includes('ギャルゲーモード'), `ページタイトルに「ギャルゲーモード」が含まれること (got: "${title}")`);

  // Test 3: Character name on title screen
  await page.waitForSelector('#title-char-name', { timeout: 5000 });
  const charName = await page.$eval('#title-char-name', el => el.textContent);
  assert(charName.includes('袴田ひなた'), `タイトル画面にキャラ名「袴田ひなた」が表示されること (got: "${charName}")`);

  // Test 4: Date display
  const dateText = await page.$eval('#date-display', el => el.textContent);
  assert(dateText.includes('2026-03-16'), `日付「2026-03-16」が表示されること (got: "${dateText}")`);

  // Test 5: Start button exists
  const startBtn = await page.$('#start-btn');
  assert(startBtn !== null, '「はじめる」ボタンが存在すること');

  // Test 6: Mode toggle exists
  const modeToggle = await page.$('#mode-toggle');
  assert(modeToggle !== null, 'モード切替ボタンが存在すること');

  // Test 7: Back link exists
  const backBtn = await page.$('#back-btn');
  assert(backBtn !== null, '「日記に戻る」リンクが存在すること');
  if (backBtn) {
    const href = await backBtn.getAttribute('href');
    assert(href.includes('diary-hina.html'), `戻りリンクがdiary-hina.htmlを含むこと (got: "${href}")`);
  }

  // === テキスト進行テスト ===
  console.log('\n=== テキスト進行テスト ===');

  // Test 8: Click start button
  await page.click('#start-btn');
  await page.waitForTimeout(1200); // wait for title fade + typewriter

  const hudVisible = await page.$eval('#hud', el => el.style.display);
  assert(hudVisible === 'flex', `HUDが表示されること (got: "${hudVisible}")`);

  // Test 9: Text content appears
  const textContent1 = await page.$eval('#text-content', el => el.textContent);
  assert(textContent1.length > 0, `テキストが表示されること (length: ${textContent1.length})`);

  // Test 10: Name plate shows character
  const namePlate = await page.$eval('#name-plate', el => el.textContent);
  assert(namePlate.includes('ひなた'), `ネームプレートにキャラ名が表示されること (got: "${namePlate}")`);

  // Test 11: Click text window to skip typewriter, then click to advance
  // Intercept navigation to prevent leaving the page
  await page.evaluate(() => {
    window.__origLocation = window.location.href;
    window.addEventListener('beforeunload', (e) => { e.preventDefault(); });
  });
  await page.click('#text-window');
  await page.waitForTimeout(500);
  const textContent2 = await page.$eval('#text-content', el => el.textContent);
  // Text should be fully displayed or advanced
  assert(textContent2.length > 0, `クリック後もテキストが表示されること (length: ${textContent2.length})`);


  // === モード切替テスト ===
  console.log('\n=== モード切替テスト ===');

  // Test 12: Default mode is classic
  let bodyClass = await page.$eval('body', el => el.className);
  assert(bodyClass.includes('mode-classic'), `デフォルトがクラシックモードであること (got: "${bodyClass}")`);

  // Test 13: Toggle to immersive mode
  await page.click('#mode-toggle');
  await page.waitForTimeout(300);
  bodyClass = await page.$eval('body', el => el.className);
  assert(bodyClass.includes('mode-immersive'), `トグル後にイマーシブモードになること (got: "${bodyClass}")`);

  // Test 14: Toggle back to classic
  await page.click('#mode-toggle');
  await page.waitForTimeout(300);
  bodyClass = await page.$eval('body', el => el.className);
  assert(bodyClass.includes('mode-classic'), `再トグル後にクラシックモードに戻ること (got: "${bodyClass}")`);

  // === URL パラメータ mode=classic テスト ===
  console.log('\n=== URL パラメータテスト ===');

  // Test 15: Classic mode via URL
  await page.goto(`${baseUrl}/galge-mode.html?char=feiris&date=2026-03-10&mode=classic`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  bodyClass = await page.$eval('body', el => el.className);
  assert(bodyClass.includes('mode-classic'), `URLパラメータmode=classicでクラシックモードになること (got: "${bodyClass}")`);

  // Test 16: Feiris character name
  const feirisName = await page.$eval('#title-char-name', el => el.textContent);
  assert(feirisName.includes('フェイリス'), `フェイリスのキャラ名が表示されること (got: "${feirisName}")`);

  // Test 17: Background CG appears for feiris entry with image
  await page.click('#start-btn');
  await page.waitForTimeout(1000);
  const bgCgVisible = await page.$eval('#bg-cg', el => el.classList.contains('visible'));
  assert(bgCgVisible, 'フェイリスの絵日記エントリで背景CGが表示されること');

  // === diary.html リンクテスト ===
  console.log('\n=== diary.html リンクテスト ===');

  // Test 18: diary.html has galge mode link
  await page.goto(`${baseUrl}/diary.html`, { waitUntil: 'domcontentloaded' });
  const galgeLink = await page.$('a.back-link[href="./galge-mode.html"]');
  assert(galgeLink !== null, 'diary.html にギャルゲーモードへのリンクが存在すること');

  // === galge-launcher.js テスト ===
  console.log('\n=== galge-launcher.js テスト ===');

  // Test 19: galge-launcher.js loads on diary-feiris.html
  await page.goto(`${baseUrl}/diary-feiris.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  const launcherStyles = await page.$('#galge-launcher-styles');
  assert(launcherStyles !== null, 'diary-feiris.html に galge-launcher のスタイルが注入されること');

  // Test 20: Image is wrapped in galge-launch-container
  const container = await page.$('.galge-launch-container');
  assert(container !== null, '絵日記画像が galge-launch-container で包まれること');

  // Test 21: Overlay exists
  const overlay = await page.$('.galge-launch-overlay');
  assert(overlay !== null, 'ギャルゲー起動オーバーレイが存在すること');

  // Test 22: Overlay has launch text
  const launchText = await page.$eval('.galge-launch-text', el => el.textContent);
  assert(launchText.includes('ギャルゲーモードで読む'), `オーバーレイに「ギャルゲーモードで読む」テキストがあること (got: "${launchText}")`);

  // Test 23: Click container navigates to galge-mode.html
  await page.click('.galge-launch-container');
  await page.waitForTimeout(1000);
  const newUrl = page.url();
  assert(newUrl.includes('galge-mode.html'), `クリックでギャルゲーモードに遷移すること (got: "${newUrl}")`);
  assert(newUrl.includes('char=feiris'), `URLにchar=feirisパラメータが含まれること (got: "${newUrl}")`);

  // Summary
  console.log(`\n=== 結果: ${passed} passed, ${failed} failed ===`);
  
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();
