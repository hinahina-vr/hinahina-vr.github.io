const { chromium } = require('playwright');
const { createServer } = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const output = process.env.CHAT_TEST_OUTPUT || path.join(os.tmpdir(), 'waddy-chat-browser-tests');
if (!/^[Ee]:[\\/]/.test(output) || !/^[Ee]:[\\/]/.test(os.tmpdir())) throw new Error('Test outputs and TEMP must be on E:');
fs.mkdirSync(output, { recursive: true });
const mime = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const localApiRequests = [];
const server = createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) localApiRequests.push(url.pathname);
  let file;
  try { file = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)); } catch { response.writeHead(400); response.end(); return; }
  if (!file.startsWith(root + path.sep)) { response.writeHead(403); response.end(); return; }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { response.writeHead(404); response.end(); return; }
  response.writeHead(200, { 'Content-Type': `${mime[path.extname(file)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(response);
});

let browser;
const checks = [];
async function check(name, action) { await action(); checks.push({ name, passed: true }); console.log('PASS', name); }
function reply(text, model = 'test/actual-model') { return `: heartbeat\n\ndata: ${JSON.stringify({ model, choices: [{ delta: { content: text } }] })}\n\ndata: [DONE]\n\n`; }

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const executablePath = process.env.CHAT_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  browser = await chromium.launch({ executablePath, headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await context.newPage();
  const errors = []; const requests = []; let mode = 'success';
  page.on('pageerror', error => errors.push(error.message));
  await context.route('https://openrouter.ai/api/v1/models', route => route.fulfill({ json: { data: [{ id: 'test/model', name: '試験用テキスト', architecture: { output_modalities: ['text'] } }] } }));
  await context.route('https://openrouter.ai/api/v1/chat/completions', async route => {
    const request = route.request(); requests.push({ url: request.url(), headers: request.headers(), body: request.postDataJSON() });
    if (mode === 'hold') return; // The browser must abort this in-flight request through the Stop control.
    if (mode === 'auth-error') return route.fulfill({ status: 401, json: { error: { message: 'sk-or-test-not-real PRIVATE PROMPT' } } });
    if (mode === 'cut') return route.fulfill({ contentType: 'text/event-stream', body: 'data: {"choices":[{"delta":{"content":"中断された断片"}}]}\n\n' });
    const text = requests.at(-1).body.messages[0].content.includes('base_persona>\n\n# ひなた') ? 'えへへ、おにいちゃん。映画のお話しよ。' : '勇者様、今日は何をして遊ぶ？';
    return route.fulfill({ contentType: 'text/event-stream', body: reply(mode === 'xss' ? '<img src=x onerror="alert(1)">こんにちは' : text) });
  });

  await page.goto(origin + '/chat.html?persona=hina');
  await page.locator('#message').waitFor({ state: 'visible' });
  await check('33人が選べて基本設定の本文は画面に表示されない', async () => {
    await page.waitForFunction(() => document.querySelector('#persona-select').options.length === 33 && !document.querySelector('#message').disabled);
    assert.equal(await page.locator('#conversation-title').innerText(), '🌸 ひなた');
    assert.ok(!(await page.locator('body').innerText()).includes('性格・キャラクター性'));
    assert.equal(await page.locator('#remember-key').isChecked(), false);
    assert.equal(await page.locator('#remember-history').isChecked(), false);
    assert.equal(await page.locator('#model-id').inputValue(), 'deepseek/deepseek-v4.1-flash');
  });
  async function configure(remember = false) {
    await page.locator('#api-key').fill('sk-or-test-not-real');
    await page.locator('#model-id').fill('test/model');
    await page.locator('#remember-key').setChecked(remember);
    await page.locator('#connection-form button[type=submit]').click();
  }
  await check('初期モデルを入力し直さずDeepSeek V4.1 Flashへ送信できる', async () => {
    await page.locator('#api-key').fill('sk-or-test-not-real');
    await page.locator('#connection-form button[type=submit]').click();
    await page.locator('#message').fill('初期モデルの接続試験'); await page.locator('#send').click();
    await page.waitForFunction(() => document.querySelector('#chat-status').textContent === '返事が届いたよ。');
    assert.equal(requests.at(-1).body.model, 'deepseek/deepseek-v4.1-flash');
    page.once('dialog', dialog => dialog.accept()); await page.locator('#clear-conversation').click();
    requests.length = 0;
  });
  await check('保存同意なしではAPIキーがlocalStorageにもsessionStorageにも入らない', async () => {
    await configure(false);
    assert.equal(await page.evaluate(() => localStorage.getItem('waddy-chat-openrouter-key-v1')), null);
    assert.ok(!(await page.evaluate(() => JSON.stringify(sessionStorage))).includes('sk-or-test-not-real'));
    await page.reload(); await page.waitForFunction(() => !document.querySelector('#message').disabled);
    assert.equal(await page.locator('#api-key').inputValue(), '');
    await configure(false);
  });
  await check('モデル一覧をブラウザから取得し、設定を入力できる', async () => {
    await page.locator('#load-models').click();
    await page.waitForFunction(() => document.querySelector('#model-note').textContent.includes('1件取得'));
    assert.equal(await page.locator('#model-options option').getAttribute('value'), 'test/model');
  });
  await check('追加設定を保存すると基本人格と共にOpenRouterへ直接送る', async () => {
    await page.locator('.additional-settings summary').click();
    await page.locator('#personality').fill('映画が好き。短めに話す。');
    await page.locator('#message').fill('こんばんは'); await page.locator('#send').click();
    await page.getByRole('alert').filter({ hasText: '未保存' }).waitFor();
    assert.equal(requests.length, 0);
    await page.locator('#save-personality').click(); await page.locator('#send').click();
    await page.waitForFunction(() => document.querySelector('#chat-status').textContent === '返事が届いたよ。');
    const r = requests.at(-1); assert.equal(r.url, 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(r.headers.authorization, 'Bearer sk-or-test-not-real');
    assert.match(r.body.messages[0].content, /敬語を使わない/); assert.match(r.body.messages[0].content, /映画が好き/);
    assert.equal(r.body.messages.at(-1).content, 'こんばんは');
    assert.ok(!JSON.stringify(r.body).includes('sk-or-test-not-real'));
    assert.equal(localApiRequests.length, 0);
  });
  await check('人格を替えても設定と会話が混ざらず、保存して再読み込みできる', async () => {
    await page.locator('#remember-history').check();
    await page.locator('#persona-select').selectOption('kukuri');
    await page.waitForFunction(() => document.querySelector('#conversation-title').textContent.includes('ククリ'));
    assert.equal(await page.locator('#personality').inputValue(), '');
    assert.equal(await page.locator('.chat-message').count(), 0);
    await page.locator('#message').fill('おはよう'); await page.locator('#send').click();
    await page.waitForFunction(() => document.querySelector('#chat-status').textContent === '返事が届いたよ。');
    const r = requests.at(-1); assert.match(r.body.messages[0].content, /勇者様とワディーを別人にする/);
    assert.ok(!r.body.messages[0].content.includes('映画が好き。短めに話す。'));
    await page.locator('#persona-select').selectOption('hina');
    await page.waitForFunction(() => document.querySelector('#conversation-title').textContent.includes('ひなた'));
    assert.equal(await page.locator('#personality').inputValue(), '映画が好き。短めに話す。');
    assert.equal(await page.locator('.chat-message.user').count(), 1);
    await page.reload(); await page.waitForFunction(() => !document.querySelector('#message').disabled);
    assert.equal(await page.locator('.chat-message.user').count(), 1);
    assert.equal(await page.locator('#api-key').inputValue(), '');
    await configure(true);
  });
  await check('APIキーの保存は明示同意後だけ、撤回と削除が再読み込み後にも反映する', async () => {
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('waddy-chat-openrouter-key-v1')).consented), true);
    await page.reload(); await page.waitForFunction(() => !document.querySelector('#message').disabled);
    assert.equal(await page.locator('#api-key').inputValue(), 'sk-or-test-not-real');
    const other = await context.newPage();
    await other.goto(origin + '/chat.html?persona=hina');
    await other.waitForFunction(() => !document.querySelector('#message').disabled);
    assert.equal(await other.locator('#api-key').inputValue(), 'sk-or-test-not-real');
    await page.locator('#remember-key').uncheck();
    assert.equal(await page.evaluate(() => localStorage.getItem('waddy-chat-openrouter-key-v1')), null);
    await other.waitForFunction(() => document.querySelector('#api-key').value === '' && !document.querySelector('#remember-key').checked);
    await other.close();
    await configure(true); await page.locator('#forget-key').click();
    assert.equal(await page.locator('#api-key').inputValue(), '');
    assert.equal(await page.evaluate(() => localStorage.getItem('waddy-chat-openrouter-key-v1')), null);
    await configure(false);
  });
  await check('HTTP認証エラーを説明し、上流のキーや内部情報は画面に出さない', async () => {
    mode = 'auth-error'; await page.locator('#message').fill('エラーのテスト'); await page.locator('#send').click();
    await page.waitForFunction(() => !document.querySelector('#retry').hidden);
    assert.ok((await page.locator('#chat-error').innerText()).includes('APIキーを確認'));
    assert.ok(!(await page.locator('#chat-error').innerText()).includes('sk-or-test-not-real'));
    const count = await page.locator('.chat-message.user').count(); mode = 'success'; await page.locator('#retry').click();
    await page.waitForFunction(() => document.querySelector('#chat-status').textContent === '返事が届いたよ。');
    assert.equal(await page.locator('.chat-message.user').count(), count);
  });
  await check('途中切断の断片を保存・次の送信へ混ぜず再送できる', async () => {
    mode = 'cut'; await page.locator('#message').fill('途中切断'); await page.locator('#send').click();
    await page.waitForFunction(() => !document.querySelector('#retry').hidden);
    assert.ok((await page.locator('#chat-error').innerText()).includes('通信が切れた'));
    assert.ok(!(await page.evaluate(() => localStorage.getItem('waddy-chat-v1'))).includes('中断された断片'));
    mode = 'success'; await page.locator('#retry').click();
    await page.waitForFunction(() => document.querySelector('#chat-status').textContent === '返事が届いたよ。');
    assert.ok(!JSON.stringify(requests.at(-1).body).includes('中断された断片'));
  });
  await check('受信中に停止し、送信内容を増やさず再試行できる', async () => {
    mode = 'hold'; const before = requests.length;
    await page.locator('#message').fill('停止のテスト'); await page.locator('#send').click();
    await page.waitForFunction(() => !document.querySelector('#stop').hidden);
    while (requests.length === before) await page.waitForTimeout(10);
    await page.locator('#stop').click();
    await page.waitForFunction(() => document.querySelector('#chat-status').textContent === '受信を止めたよ。');
    const count = await page.locator('.chat-message.user').count(); mode = 'success'; await page.locator('#retry').click();
    await page.waitForFunction(() => document.querySelector('#chat-status').textContent === '返事が届いたよ。');
    assert.equal(await page.locator('.chat-message.user').count(), count);
  });
  await check('モデルの返答をHTMLとして実行しない', async () => {
    mode = 'xss'; await page.locator('#message').fill('表示のテスト'); await page.locator('#send').click();
    await page.waitForFunction(() => document.querySelector('#chat-status').textContent === '返事が届いたよ。');
    assert.equal(await page.locator('#transcript img').count(), 0);
    assert.ok((await page.locator('.chat-message.assistant').last().innerText()).includes('<img'));
  });
  await check('書き出した会話JSONにAPIキーや基本設定を含めない', async () => {
    const downloadReady = page.waitForEvent('download'); await page.locator('#export-conversation').click();
    const download = await downloadReady; const file = path.join(output, download.suggestedFilename());
    try { await download.saveAs(file); } catch (error) { throw new Error(`Export failed: ${await download.failure()}; ${error.message}`); }
    const data = fs.readFileSync(file, 'utf8'); const parsed = JSON.parse(data);
    assert.equal(parsed.persona, 'hina'); assert.equal(parsed.additionalPersonality, '映画が好き。短めに話す。');
    assert.ok(!data.includes('sk-or-test-not-real')); assert.ok(!data.includes('base_persona')); assert.ok(parsed.messages.length > 0);
  });
  await check('検索だけでは別の人格へ切り替わらない', async () => {
    await page.locator('#persona-search').fill('ククリ');
    assert.equal(await page.locator('#persona-select option').count(), 1);
    assert.ok((await page.locator('#conversation-title').innerText()).includes('ひなた'));
    await page.locator('#persona-search').fill('');
  });
  await check('保存撤回で履歴が消え、追加設定はそのまま残る', async () => {
    await page.locator('#remember-history').uncheck();
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('waddy-chat-v1')).conversations), {});
    await page.reload(); await page.waitForFunction(() => !document.querySelector('#message').disabled);
    assert.equal(await page.locator('.chat-message.user').count(), 0);
    assert.equal(await page.locator('[data-demo-greeting]').count(), 1);
    assert.equal(await page.locator('#personality').inputValue(), '映画が好き。短めに話す。');
  });
  await check('住人紹介の33リンクとホームからチャットへ進める', async () => {
    await page.goto(origin + '/characters.html'); assert.equal(await page.locator('a[href^="./chat.html?persona="]').count(), 33);
    await page.locator('a[href="./chat.html?persona=kukuri"]').click();
    await page.waitForFunction(() => document.querySelector('#conversation-title').textContent.includes('ククリ'));
    await page.goto(origin + '/index.html'); await page.getByRole('link', { name: '住人とおしゃべり', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('#message').disabled);
  });
  await check('デスクトップとスマホで横にはみ出さず操作できる', async () => {
    await page.goto(origin + '/chat.html?persona=hina');
    await page.waitForFunction(() => !document.querySelector('#message').disabled);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    const residents = await page.locator('#persona-select option').evaluateAll(options => options.map(option => ({ id: option.value, name: option.textContent })));
    for (const resident of residents) {
      await page.locator('#persona-select').selectOption(resident.id);
      await page.waitForFunction(name => document.querySelector('#conversation-title').textContent === name && !document.querySelector('#message').disabled, resident.name);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile overflow: ' + resident.id);
    }
    await page.locator('#persona-select').selectOption('hina');
    await page.waitForFunction(() => document.querySelector('#conversation-title').textContent.includes('ひなた') && !document.querySelector('#message').disabled);
    await page.screenshot({ path: path.join(output, 'mobile.png'), fullPage: true });
    assert.equal(errors.length, 0, errors.join('\n'));
  });
  const report = { passed: true, checkedAt: new Date().toISOString(), tests: checks, directOpenRouterRequestsObserved: requests.length, localChatApiRequests: localApiRequests.length, mock: 'OpenRouter model and completion responses substituted by browser routes. No real paid model call.', screenshots: ['desktop.png', 'mobile.png'], pageErrors: errors };
  fs.writeFileSync(path.join(output, 'browser-test-report.json'), JSON.stringify(report, null, 2));
})().catch(error => {
  console.error(error); fs.writeFileSync(path.join(output, 'browser-test-report.json'), JSON.stringify({ passed: false, checks, error: error.message }, null, 2)); process.exitCode = 1;
}).finally(async () => { await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
