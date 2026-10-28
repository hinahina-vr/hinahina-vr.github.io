const fs = require('node:fs');
const { chromium } = require('playwright');
const { createServer } = require('node:http');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const output = process.env.CHAT_TEST_OUTPUT || path.join(os.tmpdir(), 'waddy-chat-polish-tests');
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
const checks = [], errors = [], geometries = [];
async function check(name, action) { await action(); checks.push({ name, passed: true }); console.log('PASS', name); }
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = process.env.CHAT_TEST_ORIGIN || 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ executablePath: process.env.CHAT_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const installTestStreams = () => {
    const originalFetch = window.fetch.bind(window);
    window.__polishRequests = [];
    window.fetch = (url, options = {}) => {
      if (String(url) !== 'https://openrouter.ai/api/v1/chat/completions') return originalFetch(url, options);
      window.__polishRequests.push(JSON.parse(options.body));
      const encoder = new TextEncoder();
      let closed = false;
      const stream = new ReadableStream({
        start(controller) {
          window.__polishStream = {
            push(text) {
              if (closed) throw new Error('Test stream is already closed');
              controller.enqueue(encoder.encode('data: ' + JSON.stringify({ choices: [{ delta: { content: text } }] }) + '\n\n'));
            },
            fail() {
              if (closed) throw new Error('Test stream is already closed');
              closed = true;
              controller.enqueue(encoder.encode('data: ' + JSON.stringify({ error: { message: 'test failure' } }) + '\n\n'));
              controller.close();
            },
            finish() {
              if (closed) throw new Error('Test stream is already closed');
              closed = true;
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            }
          };
          options.signal.addEventListener('abort', () => {
            if (!closed) { closed = true; controller.error(new DOMException('aborted', 'AbortError')); }
          }, { once: true });
        },
        cancel() { closed = true; }
      });
      return Promise.resolve(new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } }));
    };
  };
  await context.addInitScript(installTestStreams);
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  async function ready() {
    await page.waitForFunction(() => !document.querySelector('#message').disabled && document.body.dataset.soulArt === 'ready');
  }
  async function closeDrawer() {
    await page.locator('#back-to-conversation').click();
    await page.waitForFunction(() => !document.querySelector('#chat-drawer').open && !document.querySelector('#settings-panel-connection'));
  }
  async function expanded(value) {
    const toggle = page.locator('#chat-space-toggle');
    assert.ok(await toggle.isVisible(), 'Conversation space toggle must be directly reachable');
    if ((await toggle.getAttribute('aria-pressed') === 'true') !== value) await toggle.click();
    assert.equal(await toggle.getAttribute('aria-pressed'), String(value));
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  }
  async function geometry(label) {
    const result = await page.evaluate(() => {
      const bounds = selector => {
        const rect = document.querySelector(selector).getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom };
      };
      return { character: bounds('#soul-character-wrap'), chat: bounds('.conversation-panel'), input: bounds('#message'), toggle: bounds('#chat-space-toggle'), viewport: { width: innerWidth, height: window.visualViewport?.height || innerHeight } };
    });
    assert.ok(result.character.height >= 100, 'Character area must keep at least 100px: ' + JSON.stringify(result));
    assert.ok(result.character.bottom <= result.chat.y + 1, 'Character and chat areas must not overlap: ' + JSON.stringify(result));
    assert.ok(result.input.y >= result.chat.y && result.input.bottom <= result.viewport.height + 1, 'Composer must remain inside the visible chat area');
    if (await page.locator('#chat-space-toggle').isVisible()) assert.ok(result.toggle.y >= result.chat.y && result.toggle.bottom <= result.chat.bottom + 1, 'Space toggle must not cover the character');
    geometries.push({ label, ...result });
    return result;
  }
  async function send(text) {
    const count = await page.evaluate(() => window.__polishRequests.length);
    await page.locator('#message').fill(text);
    await page.locator('#send').click();
    await page.waitForFunction(before => window.__polishRequests.length === before + 1 && !!window.__polishStream, count);
    await page.waitForFunction(() => document.body.dataset.soulPhase === 'waiting');
  }
  async function push(text) {
    await page.evaluate(value => window.__polishStream.push(value), text);
    await page.waitForFunction(() => document.body.dataset.soulPhase === 'replying');
    await page.waitForFunction(value => document.querySelector('#transcript .chat-message.assistant:last-child .message-text')?.textContent.endsWith(value), text);
  }
  async function finish() {
    await page.evaluate(() => window.__polishStream.finish());
    await page.waitForFunction(() => document.querySelector('#chat-status').textContent === '返事が届いたよ。' && ['idle', 'typing'].includes(document.body.dataset.soulPhase));
  }
  await page.goto(origin + '/chat.html?persona=hina&mode=immersive');
  await ready();

  await check('会話を広くしても低い画面で顔の領域を100px以上保ち、会話欄を重ねない', async () => {
    await page.setViewportSize({ width: 390, height: 480 });
    await expanded(false); const normal = await geometry('390x480 character priority');
    await expanded(true); const wide = await geometry('390x480 conversation priority');
    assert.ok(wide.chat.height > normal.chat.height + 20, 'Expanded conversation must provide materially more reading space');
    for (const [width, height] of [[320, 568], [360, 640], [430, 932]]) {
      await page.setViewportSize({ width, height });
      await geometry(width + 'x' + height + ' expanded');
    }
  });
  await check('会話の広さを明示的に選び、再読み込み後も同じ設定を復元する', async () => {
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('waddy-chat-visual-v1')).chatSpace), 'conversation');
    await page.reload(); await ready();
    assert.equal(await page.locator('#chat-space-toggle').getAttribute('aria-pressed'), 'true');
    await expanded(false);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('waddy-chat-visual-v1')).chatSpace), 'character');
    await page.reload(); await ready();
    assert.equal(await page.locator('#chat-space-toggle').getAttribute('aria-pressed'), 'false');
    await page.setViewportSize({ width: 390, height: 844 });
  });

  await page.locator('#open-settings').click();
  await page.locator('#settings-tab-connection').click();
  await page.locator('#api-key').fill('sk-or-polish-test-not-real');
  await page.locator('#connection-form button[type=submit]').click();
  await page.waitForFunction(() => !document.querySelector('#chat-drawer').open);
  assert.equal(await page.evaluate(() => localStorage.getItem('waddy-chat-openrouter-key-v1')), null);

  await check('待機と受信を見分けられ、上を読んでいる間は次のトークンで位置を奪わず最新へ戻れる', async () => {
    await send('今日のお話を、たくさん聞かせて');
    const activity = page.locator('#mobile-chat-activity');
    assert.ok(await activity.isVisible());
    const waiting = (await activity.innerText()).trim();
    assert.ok(waiting.length > 0, 'Waiting state must be visible');
    await push('今日はこんなことがあったよ。\n'.repeat(180));
    const receiving = (await activity.innerText()).trim();
    assert.ok(receiving.length > 0 && receiving !== waiting, 'Receiving state must be distinguishable from waiting');
    await page.locator('#transcript').evaluate(element => {
      element.scrollTop = 0;
      element.dispatchEvent(new Event('scroll'));
    });
    const before = await page.locator('#transcript').evaluate(element => ({ top: element.scrollTop, height: element.scrollHeight, client: element.clientHeight }));
    assert.ok(before.height - before.client > 1000, 'Enough history must exist to test reading older text');
    await push('このあとにも、まだお話が続くよ。\n'.repeat(40));
    await page.waitForFunction(() => document.querySelector('#transcript').scrollHeight > 1000);
    const after = await page.locator('#transcript').evaluate(element => element.scrollTop);
    assert.ok(Math.abs(after - before.top) <= 2, 'Incoming tokens must keep the reader at the same position');
    assert.ok(await page.locator('#latest-chat').isVisible());
    const latest = await page.locator('#latest-chat').boundingBox(), chat = await page.locator('.conversation-panel').boundingBox();
    assert.ok(latest.y >= chat.y && latest.y + latest.height <= chat.y + chat.height + 1, 'Latest button must stay in chat and not cover the character');
    await page.locator('#latest-chat').click();
    await page.waitForFunction(() => { const e = document.querySelector('#transcript'); return e.scrollHeight - e.clientHeight - e.scrollTop <= 3; });
    await push('最後まで聞いてくれて、ありがとう。');
    await finish();
    assert.ok(!(await activity.isVisible()) || !(await activity.innerText()).trim(), 'Activity must clear after completion');
  });

  await check('返答中に接続設定へ移ったら、完了後も設定とAPIキー欄のフォーカスを保つ', async () => {
    await send('少し待っていてね');
    await page.locator('#open-settings').click();
    await page.locator('#settings-tab-connection').click();
    await page.locator('#api-key').focus();
    await push('うん、お話の続きだよ。');
    await finish();
    assert.ok(await page.locator('#chat-drawer').evaluate(element => element.open));
    assert.equal(await page.evaluate(() => document.activeElement.id), 'api-key');
    await closeDrawer();
  });
  await check('返答中に履歴を開いたら、完了後も履歴を閉じず読む場所を保つ', async () => {
    await send('今のお話を覚えてる？');
    await page.locator('#open-history').click();
    await page.locator('#transcript').focus();
    await push('さっきのお話、覚えてるよ。');
    await finish();
    assert.ok(await page.locator('#chat-drawer').evaluate(element => element.open));
    assert.equal(await page.evaluate(() => document.activeElement.id), 'transcript');
    await closeDrawer();
  });
  await check('履歴をEscで閉じたあとも、返事の完了で入力欄へフォーカスを奪わない', async () => {
    await send('もうひとつ聞かせて');
    await page.locator('#open-history').click();
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#chat-drawer').open && document.activeElement.id === 'open-history');
    await push('うん、ゆっくり聞いてね。');
    await finish();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'open-history');
  });
  await check('PC幅でも履歴をEscで閉じたあと、返事の完了で履歴ボタンのフォーカスを奪わない', async () => {
    const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });
    await desktopContext.addInitScript(installTestStreams);
    const desktop = await desktopContext.newPage(); desktop.on('pageerror', error => errors.push(error.message));
    try {
      await desktop.goto(origin + '/chat.html?persona=hina&mode=immersive');
      await desktop.waitForFunction(() => !document.querySelector('#message').disabled && document.body.dataset.soulArt === 'ready');
      await desktop.locator('#open-settings').click(); await desktop.locator('#settings-tab-connection').click();
      await desktop.locator('#api-key').fill('sk-or-polish-test-not-real'); await desktop.locator('#connection-form button[type=submit]').click();
      await desktop.waitForFunction(() => !document.querySelector('#chat-drawer').open);
      await desktop.locator('#message').fill('PCでも少し待っていてね'); await desktop.locator('#send').click();
      await desktop.waitForFunction(() => !!window.__polishStream && document.body.dataset.soulPhase === 'waiting');
      await desktop.locator('#open-history').click(); await desktop.keyboard.press('Escape');
      await desktop.waitForFunction(() => !document.querySelector('#chat-drawer').open && document.activeElement.id === 'open-history');
      await desktop.evaluate(() => { window.__polishStream.push('うん、お話の続きだよ。'); window.__polishStream.finish(); });
      await desktop.waitForFunction(() => document.querySelector('#chat-status').textContent === '返事が届いたよ。' && document.body.dataset.soulPhase === 'idle');
      assert.equal(await desktop.evaluate(() => document.activeElement.id), 'open-history');
    } finally { await desktopContext.close(); }
  });
  await check('過去の会話を読んでいる間に通信エラーが出ても、最新ボタンで入力や再送を覆わない', async () => {
    await page.setViewportSize({ width: 390, height: 480 });
    await expanded(false);
    await send('少し長いお話を聞かせて');
    await push('今日はこんなことがあったよ。\n'.repeat(180));
    await page.locator('#transcript').evaluate(element => { element.scrollTop = 0; element.dispatchEvent(new Event('scroll')); });
    await push('この続きのお話もあるよ。\n'.repeat(30));
    assert.ok(await page.locator('#latest-chat').isVisible(), 'Latest control must be visible before failure');
    await page.evaluate(() => window.__polishStream.fail());
    await page.waitForFunction(() => !document.querySelector('#chat-error').hidden && !document.querySelector('#retry').hidden && document.body.dataset.soulPhase === 'idle');
    assert.ok(await page.locator('#chat-error').isVisible());
    assert.ok(await page.locator('#retry').isVisible());
    assert.ok(!(await page.locator('#latest-chat').isVisible()), 'Latest control must yield to the error/retry row');
    await page.locator('#message').fill('書きかけの文章\n'.repeat(12));
    const layout = await geometry('error while reading older reply');
    const retry = await page.locator('#retry').boundingBox();
    assert.ok(retry.x >= 0 && retry.y >= layout.chat.y && retry.x + retry.width <= layout.viewport.width + 1 && retry.y + retry.height <= layout.chat.bottom + 1, 'Retry must remain in the visible chat area');
    assert.ok(await page.locator('#retry').evaluate(element => { const r = element.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return hit === element || element.contains(hit); }), 'Retry must not be covered by another floating control');
    await page.locator('#message').focus();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'message');
    const before = await page.evaluate(() => window.__polishRequests.length);
    await page.locator('#retry').click();
    await page.waitForFunction(count => window.__polishRequests.length === count + 1 && document.body.dataset.soulPhase === 'waiting', before);
    await push('うん、お話の続きを聞いてね。');
    await finish();
    assert.ok(!(await page.locator('#chat-error').isVisible()));
    assert.equal(await page.locator('#message').inputValue(), '書きかけの文章\n'.repeat(12), 'Retry must preserve the next message draft');
    await page.setViewportSize({ width: 390, height: 844 });
  });
  await check('通常と会話を広げたスマホ表示を、短い会話と入力欄を含めて確認する', async () => {
    await page.locator('#open-history').click();
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#clear-conversation').click();
    await closeDrawer();
    await send('ただいま、ひなた');
    await push('おにいちゃん、おかえり。\n今日はどんな一日だった？');
    await finish();
    await page.locator('#message').fill('今日はちょっと疲れた');
    await expanded(false); await geometry('normal chat final');
    await page.screenshot({ path: path.join(output, 'polish-mobile.png') });
    await expanded(true); await geometry('expanded chat final');
    await page.screenshot({ path: path.join(output, 'polish-expanded.png') });
  });
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(output, 'polish-test-report.json'), JSON.stringify({
    passed: true, checkedAt: new Date().toISOString(), origin, checks, geometries, pageErrors: errors,
    limitations: ['Chrome mobile and touch emulation, not a physical phone or actual OS keyboard.', 'OpenRouter replies are controlled browser-side SSE test streams; no paid-model quality tested.']
  }, null, 2));
})().catch(error => {
  console.error(error);
  fs.writeFileSync(path.join(output, 'polish-test-report.json'), JSON.stringify({ passed: false, checks, geometries, pageErrors: errors, error: error.message }, null, 2));
  process.exitCode = 1;
}).finally(async () => { await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
