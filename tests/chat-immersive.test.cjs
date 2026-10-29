const { chromium } = require('playwright');
const { createServer } = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const output = process.env.CHAT_TEST_OUTPUT || path.join(os.tmpdir(), 'waddy-chat-immersive-tests');
if (!/^[Ee]:[\\/]/.test(output) || !/^[Ee]:[\\/]/.test(os.tmpdir())) throw new Error('Test outputs and TEMP must be on E:');
fs.mkdirSync(output, { recursive: true });
const mime = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp' };
const server = createServer((req, res) => {
  let file;
  try { file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname)); } catch { res.writeHead(400); res.end(); return; }
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(file).pipe(res);
});
let browser;
const checks = [];
const errors = [];
const details = {};
async function check(name, fn) { await fn(); checks.push({ name, passed: true }); console.log('PASS', name); }

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.CHAT_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  // Deliberately controlled token timing for visual/interaction tests. No paid model is called.
  await context.addInitScript(() => {
    const realFetch = window.fetch.bind(window);
    window.__chatTestRequests = [];
    window.fetch = (url, options) => {
      if (String(url) !== 'https://openrouter.ai/api/v1/chat/completions') return realFetch(url, options);
      window.__chatTestRequests.push(JSON.parse(options.body));
      const encoder = new TextEncoder(); let timer; let finished = false;
      const chunks = ['えへへ、', 'おにいちゃん。', 'ここで、ゆっくりお話しよ。'];
      const stream = new ReadableStream({
        start(controller) {
          let index = 0;
          const next = () => {
            if (finished) return;
            if (index < chunks.length) {
              controller.enqueue(encoder.encode('data: ' + JSON.stringify({ model: 'deepseek/deepseek-v4.1-flash', choices: [{ delta: { content: chunks[index++] } }] }) + '\n\n'));
              timer = setTimeout(next, 250);
            } else { finished = true; controller.enqueue(encoder.encode('data: [DONE]\n\n')); controller.close(); }
          };
          options.signal.addEventListener('abort', () => { clearTimeout(timer); if (!finished) { finished = true; controller.error(new DOMException('aborted', 'AbortError')); } }, { once: true });
          timer = setTimeout(next, 450);
        },
        cancel() { finished = true; clearTimeout(timer); },
      });
      return Promise.resolve(new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } }));
    };
  });
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  page.on('console', message => { if (message.type() === 'warning' && message.text().includes('shader')) console.log('SHADER', message.text()); });
  await page.goto(origin + '/chat.html?persona=hina');
  await page.waitForFunction(() => !document.querySelector('#message').disabled);
  await check('通常表示から没入モードへ入り、WebGLで描画する', async () => {
    await page.locator('#immersive-toggle').click();
    await page.waitForFunction(() => ['webgl', 'fallback'].includes(document.body.dataset.soulRenderer));
    assert.equal(await page.evaluate(() => document.body.dataset.soulRenderer), 'webgl');
    await page.waitForFunction(() => Number(document.querySelector('#soul-canvas').dataset.frames) >= 3);
    const bounds = await page.locator('main').boundingBox();
    assert.equal(bounds.x, 0); assert.equal(bounds.y, 0); assert.equal(bounds.width, 1440); assert.equal(bounds.height, 960);
    details.webgl = await page.evaluate(() => { const c = document.querySelector('#soul-canvas'), gl = c.getContext('webgl'); return { version: gl.getParameter(gl.VERSION), width: c.width, height: c.height, frames: Number(c.dataset.frames) }; });
    assert.ok(details.webgl.width > 0 && details.webgl.height > 0);
    await page.screenshot({ path: path.join(output, 'immersive-desktop.png') });
  });
  await check('入力欄と人格名・操作ボタンが画面内に収まる', async () => {
    for (const selector of ['#message', '#immersive-toggle', '#open-settings', '#open-history', '#open-residents', '#conversation-title', '#open-wardrobe']) {
      const b = await page.locator(selector).boundingBox();
      assert.ok(b && b.x >= 0 && b.y >= 0 && b.x + b.width <= 1441 && b.y + b.height <= 961, selector + ': ' + JSON.stringify(b));
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  });
  await check('5種類の着せ替えを選び、ダーク表示も保存・再表示できる', async () => {
    const identity = await page.locator('#conversation-title').innerText();
    await page.locator('#open-wardrobe').click();
    assert.equal(await page.locator('input[name=soul-theme]').count(), 5);
    assert.equal(await page.locator('input[name=soul-theme]:checked').inputValue(), 'sakura');
    for (const theme of ['sakura', 'milk', 'mint', 'honey', 'night']) {
      await page.locator(`input[name=soul-theme][value=${theme}]`).check();
      await page.waitForFunction(id => document.body.dataset.soulTheme === id, theme);
      await page.locator('#back-to-conversation').click();
      await page.waitForFunction(() => !document.querySelector('#chat-drawer').open);
      await page.evaluate(() => Promise.all(document.getAnimations().filter(a => a instanceof CSSTransition).map(a => a.finished.catch(() => {}))));
      await page.screenshot({ path: path.join(output, `theme-${theme}.png`) });
      assert.equal(await page.locator('#conversation-title').innerText(), identity);
      await page.locator('#open-wardrobe').click();
    }
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('waddy-chat-visual-v1')).theme), 'night');
    const restored = await context.newPage(); await restored.goto(origin + '/chat.html?persona=hina&mode=immersive');
    await restored.waitForFunction(() => document.body.dataset.soulTheme === 'night'); await restored.close();
    await page.locator('input[name=soul-theme][value=sakura]').check();
    await page.locator('#back-to-conversation').click();
    await page.waitForFunction(() => !document.querySelector('#chat-drawer').open);
  });
  await check('入力中の文章を保ったまま接続設定を開き、保存同意なしで使える', async () => {
    await page.locator('#message').fill('こんにちは');
    await page.locator('#demo-connect').click();
    await page.locator('#chat-drawer[open]').waitFor();
    assert.equal(await page.locator('#remember-key').isChecked(), false);
    assert.equal(await page.locator('#model-id').inputValue(), 'deepseek/deepseek-v4.1-flash');
    await page.locator('#api-key').fill('sk-or-test-not-real');
    await page.locator('#connection-form button[type=submit]').click();
    await page.waitForFunction(() => !document.querySelector('#chat-drawer').open);
    assert.equal(await page.locator('#message').inputValue(), 'こんにちは');
    assert.equal(await page.evaluate(() => localStorage.getItem('waddy-chat-openrouter-key-v1')), null);
    await page.waitForFunction(() => document.activeElement.id === 'message');
  });
  await check('日本語変換中のEnterとShift+Enterで送信しない', async () => {
    await page.locator('#message').dispatchEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true });
    assert.equal(await page.evaluate(() => window.__chatTestRequests.length), 0);
    await page.locator('#message').press('Shift+Enter');
    assert.equal(await page.evaluate(() => window.__chatTestRequests.length), 0);
    assert.ok((await page.locator('#message').inputValue()).includes('\n'));
  });
  await check('Enterで直接送信し、待機・返答に合わせて光が変わる', async () => {
    await page.locator('#message').press('Enter');
    await page.waitForFunction(() => document.body.dataset.soulPhase === 'waiting');
    await page.waitForFunction(() => document.body.dataset.soulPhase === 'replying');
    await page.screenshot({ path: path.join(output, 'immersive-replying.png') });
    await page.waitForFunction(() => document.querySelector('#chat-status').textContent === '返事が届いたよ。');
    assert.equal(await page.evaluate(() => document.body.dataset.soulPhase), 'idle');
    assert.match(await page.locator('#transcript').innerText(), /ゆっくりお話しよ/);
    assert.equal(await page.evaluate(() => window.__chatTestRequests[0].model), 'deepseek/deepseek-v4.1-flash');
  });
  await check('履歴パネルで全発言を読み、Escで会話へ戻れる', async () => {
    await page.locator('#open-history').click();
    assert.equal(await page.locator('#chat-drawer .chat-message').count(), 2);
    assert.ok(await page.locator('#chat-drawer .chat-message.user').isVisible());
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#chat-drawer').open);
    assert.ok(await page.evaluate(() => document.body.classList.contains('chat-immersive')));
    assert.equal(await page.locator('#message-form').count(), 1);
  });
  await check('人格を検索して切り替え、下書きや各人格の会話を保つ', async () => {
    await page.locator('#message').fill('ひなたへの下書き');
    await page.keyboard.press('Control+k');
    await page.locator('#persona-search').fill('ククリ');
    await page.locator('#persona-select').selectOption('kukuri');
    await page.waitForFunction(() => document.querySelector('#conversation-title').textContent.includes('ククリ'));
    await page.locator('#back-to-conversation').click();
    await page.waitForFunction(() => !document.querySelector('#chat-drawer').open);
    assert.equal(await page.locator('#message').inputValue(), '');
    await page.locator('#open-residents').click(); await page.locator('#persona-search').fill('');
    await page.locator('#persona-select').selectOption('hina');
    await page.waitForFunction(() => document.querySelector('#conversation-title').textContent.includes('ひなた'));
    await page.locator('#back-to-conversation').click();
    await page.waitForFunction(() => !document.querySelector('#chat-drawer').open);
    assert.equal(await page.locator('#message').inputValue(), 'ひなたへの下書き');
    assert.equal(await page.locator('.chat-message').count(), 2);
  });
  await check('設定パネルで追加設定と明るさを保存し、動きを抑えられる', async () => {
    await page.locator('#open-settings').click();
    await page.locator('#personality').fill('ゆっくり短く話す'); await page.locator('#save-personality').click();
    await page.locator('#settings-tab-visuals').click();
    await page.locator('#soul-reduced-motion').check(); await page.locator('#soul-intensity').fill('40'); await page.locator('#soul-intensity').dispatchEvent('input');
    await page.locator('#back-to-conversation').click();
    await page.waitForFunction(() => !document.querySelector('#chat-drawer').open);
    const before = await page.locator('#soul-canvas').getAttribute('data-frames'); await page.waitForTimeout(160);
    assert.equal(await page.locator('#soul-canvas').getAttribute('data-frames'), before);
    const preference = await page.evaluate(() => JSON.parse(localStorage.getItem('waddy-chat-visual-v1')));
    assert.equal(preference.reduced, true); assert.equal(preference.intensity, 40);
    assert.equal(await page.locator('#personality').inputValue(), 'ゆっくり短く話す');
  });
  await check('通常表示へ戻しても入力・履歴を保ち、設定のDOMを重複させない', async () => {
    await page.locator('#immersive-toggle').click();
    assert.ok(!(await page.evaluate(() => document.body.classList.contains('chat-immersive'))));
    assert.equal(await page.locator('#message').inputValue(), 'ひなたへの下書き');
    assert.equal(await page.locator('#transcript .chat-message').count(), 2);
    assert.equal(await page.locator('#api-key').count(), 1); assert.equal(await page.locator('#personality').count(), 1);
    await page.locator('#immersive-toggle').click();
  });
  await check('全画面APIで入り、ボタンで元の表示へ戻れる', async () => {
    details.fullscreenAvailable = await page.evaluate(() => document.fullscreenEnabled);
    if (!details.fullscreenAvailable) return;
    await page.locator('#chat-fullscreen').click(); await page.waitForFunction(() => !!document.fullscreenElement);
    await page.locator('#chat-fullscreen').click(); await page.waitForFunction(() => !document.fullscreenElement);
  });
  await check('スマホと低い画面でも入力・設定を操作できる', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    for (const selector of ['#message', '#change-resident', '#open-history', '#open-settings', '#open-chat-menu']) {
      const b = await page.locator(selector).boundingBox(); assert.ok(b && b.x >= 0 && b.y >= 0 && b.x + b.width <= 391 && b.y + b.height <= 845, selector + ': ' + JSON.stringify(b));
    }
    await page.screenshot({ path: path.join(output, 'immersive-mobile.png') });
    await page.setViewportSize({ width: 390, height: 480 });
    await page.waitForFunction(() => Math.abs(document.querySelector('main').getBoundingClientRect().height - innerHeight) < 1);
    const input = await page.locator('#message').boundingBox(); assert.ok(input.y >= 0 && input.y + input.height <= 480, JSON.stringify(input));
    await page.locator('#open-settings').click();
    await page.locator('#settings-tab-connection').click();
    await page.locator('#remember-key').check(); await page.locator('#remember-key').uncheck();
    await page.locator('#drawer-close').click();
    await page.waitForFunction(() => !document.querySelector('#chat-drawer').open);
    await page.screenshot({ path: path.join(output, 'immersive-short-viewport.png') });
    await page.setViewportSize({ width: 1440, height: 960 });
  });
  await check('WebGLコンテキスト喪失から復帰できる', async () => {
    details.contextLossSupported = await page.evaluate(() => { window.__testLoseContext = document.querySelector('#soul-canvas').getContext('webgl').getExtension('WEBGL_lose_context'); return !!window.__testLoseContext; });
    if (!details.contextLossSupported) return;
    await page.evaluate(() => window.__testLoseContext.loseContext());
    await page.waitForFunction(() => document.body.dataset.soulRenderer === 'fallback');
    await page.evaluate(() => window.__testLoseContext.restoreContext());
    await page.waitForFunction(() => document.body.dataset.soulRenderer === 'webgl');
  });
  await check('WebGLが使えなくても会話UIを利用できる', async () => {
    const fallback = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await fallback.addInitScript(() => { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type.startsWith('webgl') ? null : original.call(this, type, ...args); }; });
    const fp = await fallback.newPage(); fp.on('pageerror', e => errors.push(e.message));
    await fp.goto(origin + '/chat.html?persona=hina&mode=immersive');
    await fp.waitForFunction(() => document.body.dataset.soulRenderer === 'fallback' && !document.querySelector('#message').disabled);
    await fp.locator('#message').fill('光がなくても下書きできる');
    assert.equal(await fp.locator('#message').inputValue(), '光がなくても下書きできる');
    await fp.locator('#open-settings').click(); await fp.locator('#settings-tab-visuals').click(); assert.equal(await fp.locator('#soul-reduced-motion').isChecked(), true);
    await fallback.close();
  });
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(output, 'immersive-test-report.json'), JSON.stringify({ passed: true, checkedAt: new Date().toISOString(), checks, details, pageErrors: errors, limitations: ['Responses are timed test streams; no valid-key DeepSeek model call.', 'Mobile viewport and composition events are browser simulations, not a real phone/OS IME.'] }, null, 2));
})().catch(error => {
  console.error(error);
  fs.writeFileSync(path.join(output, 'immersive-test-report.json'), JSON.stringify({ passed: false, checks, details, error: error.message, pageErrors: errors }, null, 2)); process.exitCode = 1;
}).finally(async () => { await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
