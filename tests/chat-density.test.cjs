const fs = require('node:fs');
const { chromium } = require('playwright');
const { createServer } = require('node:http');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const output = process.env.CHAT_TEST_OUTPUT || path.join(os.tmpdir(), 'waddy-chat-density-tests');
if (!/^[Ee]:[\\/]/.test(output) || !/^[Ee]:[\\/]/.test(os.tmpdir())) throw new Error('Test outputs and TEMP must be on E:');
fs.mkdirSync(output, { recursive: true });
const mime = { '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.woff2': 'font/woff2', '.png': 'image/png' };
const server = createServer((request, response) => {
  let file;
  try { file = path.resolve(root, '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname)); }
  catch { response.writeHead(400); response.end(); return; }
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { response.writeHead(404); response.end(); return; }
  response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(response);
});
let browser;
const checks = [], errors = [], geometries = [], readingPositions = [];
async function check(name, action) { await action(); checks.push({ name, passed: true }); console.log('PASS', name); }
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = process.env.CHAT_TEST_ORIGIN || 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ executablePath: process.env.CHAT_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  await context.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    window.__densityRequests = [];
    window.fetch = (url, options = {}) => {
      if (String(url) !== 'https://openrouter.ai/api/v1/chat/completions') return originalFetch(url, options);
      window.__densityRequests.push(JSON.parse(options.body));
      const encoder = new TextEncoder(); let closed = false;
      const stream = new ReadableStream({
        start(controller) {
          window.__densityStream = {
            push(text) {
              if (closed) throw new Error('Density test stream already closed');
              controller.enqueue(encoder.encode('data: ' + JSON.stringify({ choices: [{ delta: { content: text } }] }) + '\n\n'));
            },
            finish() {
              if (closed) throw new Error('Density test stream already closed');
              closed = true; controller.enqueue(encoder.encode('data: [DONE]\n\n')); controller.close();
            }
          };
          options.signal.addEventListener('abort', () => { if (!closed) { closed = true; controller.error(new DOMException('aborted', 'AbortError')); } }, { once: true });
        },
        cancel() { closed = true; }
      });
      return Promise.resolve(new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } }));
    };
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  async function settled() { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
  async function ready() { await page.waitForFunction(() => !document.querySelector('#message').disabled && document.body.dataset.soulArt === 'ready'); await page.evaluate(() => document.fonts.ready); await settled(); }
  async function closeDrawer() {
    await page.locator('#back-to-conversation').click();
    await page.waitForFunction(() => !document.querySelector('#chat-drawer').open && !document.querySelector('#settings-panel-connection'));
  }
  async function expanded(value) {
    const toggle = page.locator('#chat-space-toggle');
    if ((await toggle.getAttribute('aria-pressed') === 'true') !== value) await toggle.click();
    assert.equal(await toggle.getAttribute('aria-pressed'), String(value)); await settled();
  }
  async function geometry(label) {
    const result = await page.evaluate(() => {
      const bounds = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
      return { character: bounds('#soul-character-wrap'), chat: bounds('.conversation-panel'), input: bounds('#message'), viewport: { width: innerWidth, height: visualViewport?.height || innerHeight }, documentWidth: document.documentElement.scrollWidth };
    });
    assert.ok(result.character.height >= 100, 'Face region must keep at least 100px: ' + JSON.stringify(result));
    assert.ok(result.character.bottom <= result.chat.y + 1, 'Chat must not cover the character: ' + JSON.stringify(result));
    assert.ok(result.input.y >= result.chat.y && result.input.bottom <= result.viewport.height + 1, 'Input must remain visible');
    assert.ok(result.documentWidth <= result.viewport.width, 'Horizontal overflow');
    geometries.push({ label, ...result }); return result;
  }
  async function send(text) {
    const before = await page.evaluate(() => window.__densityRequests.length);
    await page.locator('#message').fill(text); await page.locator('#send').click();
    await page.waitForFunction(count => window.__densityRequests.length === count + 1 && document.body.dataset.soulPhase === 'waiting', before);
  }
  async function push(text) {
    await page.evaluate(value => window.__densityStream.push(value), text);
    await page.waitForFunction(value => document.querySelector('#transcript .chat-message.assistant:last-child .message-text')?.textContent.endsWith(value), text);
    await settled();
  }
  async function finish() {
    await page.evaluate(() => window.__densityStream.finish());
    await page.waitForFunction(() => document.querySelector('#chat-status').textContent === '返事が届いたよ。' && ['idle', 'typing'].includes(document.body.dataset.soulPhase));
    await settled();
  }
  async function reading(label) {
    const result = await page.locator('#transcript').evaluate(element => {
      const reply = element.querySelector('.chat-message.assistant:last-child');
      const text = reply?.querySelector('.message-text');
      const range = document.createRange();
      const node = text?.firstChild;
      if (!node) throw new Error('Last assistant reply has no rendered text node');
      range.setStart(node, 0); range.setEnd(node, Math.min(10, node.textContent.length));
      const r = element.getBoundingClientRect(), a = reply.getBoundingClientRect(), first = range.getBoundingClientRect();
      return { top: element.scrollTop, height: element.scrollHeight, client: element.clientHeight, viewport: { y: r.y, bottom: r.bottom }, reply: { y: a.y, bottom: a.bottom }, firstLine: { y: first.y, bottom: first.bottom } };
    });
    readingPositions.push({ label, ...result }); return result;
  }
  async function assertStartVisible(label) {
    const result = await reading(label);
    assert.ok(result.firstLine.y >= result.viewport.y - 1 && result.firstLine.bottom <= result.viewport.bottom + 1, 'The reply must open at its beginning, not its tail: ' + JSON.stringify(result));
    return result;
  }
  await page.goto(origin + '/chat.html?persona=hina&mode=immersive');
  await ready();
  await page.locator('#open-settings').click(); await page.locator('#settings-tab-connection').click();
  await page.locator('#api-key').fill('sk-or-density-test-not-real');
  await page.locator('#connection-form button[type=submit]').click();
  await page.waitForFunction(() => !document.querySelector('#chat-drawer').open);
  assert.equal(await page.evaluate(() => localStorage.getItem('waddy-chat-openrouter-key-v1')), null);

  await check('本文を14px・行高21pxに詰めても、入力16px・操作44px・顔の領域を保つ', async () => {
    await send('こんばんは'); await push('おかえり。'); await finish();
    const fonts = await page.evaluate(() => {
      const text = getComputedStyle(document.querySelector('#transcript .message-text')), input = getComputedStyle(document.querySelector('#message'));
      return { text: parseFloat(text.fontSize), line: parseFloat(text.lineHeight), input: parseFloat(input.fontSize) };
    });
    assert.equal(fonts.text, 14); assert.ok(Math.abs(fonts.line - 21) <= .2, JSON.stringify(fonts)); assert.equal(fonts.input, 16);
    for (const selector of ['#change-resident', '#open-history', '#open-settings', '#open-chat-menu', '#chat-space-toggle', '#send']) {
      const b = await page.locator(selector).boundingBox(); assert.ok(b && b.height >= 44, selector + ' must keep a 44px touch target');
    }
    await geometry('390x844 standard');
    await page.setViewportSize({ width: 390, height: 480 }); await expanded(true); await geometry('390x480 expanded');
    await page.setViewportSize({ width: 320, height: 568 }); await geometry('320x568 expanded');
    await page.setViewportSize({ width: 390, height: 844 }); await expanded(false);
  });
  await check('390x844で150字前後の普通の一往復を手動スクロールなしで読める', async () => {
    await page.locator('#open-history').click(); page.once('dialog', dialog => dialog.accept()); await page.locator('#clear-conversation').click(); await closeDrawer();
    const text = 'おかえり、おにいちゃん。今日はお仕事がんばってきたんだね。ひな、ここで待ってたよ。まずはお茶を飲んで、ちょっとひと休みしよ。急がなくても大丈夫。今日あったこと、うれしかったことも疲れたことも、話したいところから聞かせてね。ひなは、おにいちゃんのお話をゆっくり聞けるだけでうれしいよ。';
    assert.ok(text.length >= 120 && text.length <= 180, 'Representative reply length must stay within 120–180 Japanese characters: ' + text.length);
    await send('ただいま。');
    for (const chunk of [text.slice(0, 45), text.slice(45, 95), text.slice(95)]) await push(chunk);
    await finish();
    const result = await assertStartVisible('ordinary reply');
    assert.ok(result.reply.y >= result.viewport.y - 1 && result.reply.bottom <= result.viewport.bottom + 1, 'Entire ordinary reply must be visible without manual scrolling: ' + JSON.stringify(result));
    assert.ok(result.height <= result.client + 2, 'A short user prompt plus ordinary reply should fit in one viewport: ' + JSON.stringify(result));
    await geometry('ordinary reply');
    await page.screenshot({ path: path.join(output, 'density-mobile.png') });
  });
  await check('新しい長文の返事は末尾に飛ばず、冒頭から読める位置へ開く', async () => {
    await send('今日のお話を最初から聞かせて');
    await push('まず、今日のことを最初からお話しするね。\n' + 'ひとつずつ、ゆっくりお話を聞いてね。\n'.repeat(100));
    const result = await assertStartVisible('new long reply');
    assert.ok(result.height > result.client + 1000, 'The long reply must materially exceed the reading area');
    await page.screenshot({ path: path.join(output, 'density-long-start.png') });
  });
  await check('長文の次トークンが届いても、読んでいる冒頭の位置を保持する', async () => {
    const before = await reading('before next chunk');
    await push('この先にも、まだお話が続くよ。\n'.repeat(50));
    const after = await assertStartVisible('after next chunk');
    assert.ok(Math.abs(after.top - before.top) <= 2, 'Streaming must not move the beginning out of view: ' + JSON.stringify({ before, after }));
  });
  await check('手動で前の会話へ戻った位置を、次のトークンでも動かさない', async () => {
    const original = await page.locator('#transcript').evaluate(element => element.scrollTop);
    await page.locator('#transcript').evaluate(element => { element.scrollTop = Math.max(0, element.scrollTop - 120); element.dispatchEvent(new Event('scroll')); });
    const before = await page.locator('#transcript').evaluate(element => element.scrollTop);
    assert.ok(original - before >= 30, 'The test must actually move to earlier conversation');
    await push('前のお話を読んでいても、急がなくて大丈夫だよ。\n'.repeat(25));
    const after = await page.locator('#transcript').evaluate(element => element.scrollTop);
    assert.ok(Math.abs(after - before) <= 2, 'Incoming text must preserve a manually chosen reading position');
    assert.ok(await page.locator('#latest-chat').isVisible());
  });
  await check('明示的に最新へ戻った後は次トークンでも末尾に追従し、完了で入力へフォーカスを奪わない', async () => {
    await page.locator('#latest-chat').click();
    await page.waitForFunction(() => { const e = document.querySelector('#transcript'); return e.scrollHeight - e.clientHeight - e.scrollTop <= 3; });
    await push('最後まで聞いてくれて、ありがとう。\n'.repeat(30));
    await page.waitForFunction(() => { const e = document.querySelector('#transcript'); return e.scrollHeight - e.clientHeight - e.scrollTop <= 3; });
    await page.locator('#open-history').click(); await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#chat-drawer').open);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'open-history');
    await finish();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'open-history');
  });
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(output, 'density-test-report.json'), JSON.stringify({ passed: true, checkedAt: new Date().toISOString(), origin, checks, geometries, readingPositions, pageErrors: errors, limitations: ['Chrome mobile and touch emulation, not a physical phone or actual OS keyboard.', 'Reply text and timing are controlled browser-side SSE test streams; no paid-model quality tested.'] }, null, 2));
})().catch(error => {
  console.error(error);
  fs.writeFileSync(path.join(output, 'density-test-report.json'), JSON.stringify({ passed: false, checks, geometries, readingPositions, pageErrors: errors, error: error.message }, null, 2));
  process.exitCode = 1;
}).finally(async () => { await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
