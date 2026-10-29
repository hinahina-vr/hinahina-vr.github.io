const { chromium } = require('playwright');
const { createServer } = require('node:http');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const output = process.env.CHAT_TEST_OUTPUT || path.join(os.tmpdir(), 'waddy-hinata-motion-tests');
if (!/^E:[\\/]/i.test(output) || !/^E:[\\/]/i.test(os.tmpdir())) throw Error('Use E: for output and TEMP');
fs.mkdirSync(output, { recursive: true });
const mime = { '.html':'text/html', '.mjs':'text/javascript', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.webp':'image/webp', '.woff2':'font/woff2' };
const server = createServer((req, res) => {
  let file;
  try { file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname)); } catch { res.writeHead(400); res.end(); return; }
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type':mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store' }); fs.createReadStream(file).pipe(res);
});
const checks = [], errors = [], geometry = [], motionSamples = [];
let browser, page;
async function check(name, fn) { await fn(); checks.push({ name, passed:true }); console.log('PASS', name); }
async function ready() { await page.waitForFunction(() => document.body.dataset.hinaMotion === 'ready' && Number(document.querySelector('#hinata-live').dataset.frames) > 2); }
async function close() { await page.locator('#back-to-conversation').click(); await page.waitForFunction(() => !document.querySelector('#chat-drawer').open); }
async function settings() { await page.locator('#open-settings').click(); await page.locator('#settings-tab-visuals').click(); }
async function shot(name) { await page.screenshot({ path:path.join(output, name + '.png') }); }
async function bounds(label, target = page) {
  const b = await target.evaluate(() => {
    const box = s => { const b = document.querySelector(s).getBoundingClientRect(); return { left:b.left, top:b.top, right:b.right, bottom:b.bottom, width:b.width, height:b.height }; };
    return { image:box('#soul-character'), canvas:box('#hinata-live'), host:box('#soul-character-wrap'), chat:box('.conversation-panel'), button:box('#hinata-pat'), wave:box('#hinata-wave'), touch:box('#hinata-touch'), width:innerWidth, height:innerHeight, scroll:document.documentElement.scrollWidth };
  });
  assert.ok(Math.abs((b.image.left + b.image.right - b.canvas.left - b.canvas.right) / 2) < 1 && Math.abs(b.image.top - b.canvas.top) < 1, 'Rig must stay centered on the existing portrait');
  assert.ok(b.canvas.left >= -1 && b.canvas.right <= b.width + 1 && b.canvas.bottom <= b.chat.top + 70, 'Hands and hair must fit the visible character area');
  assert.ok(b.host.bottom <= b.chat.top + 1, 'Chat must not cover the face area');
  assert.ok(b.button.left >= 0 && b.button.right <= b.width && b.button.top >= b.host.top && b.button.bottom <= b.host.bottom + 1, 'Pat button must stay in the character area');
  assert.ok(b.wave.left >= 0 && b.wave.right <= b.width && b.wave.top >= b.host.top && b.wave.bottom <= b.host.bottom + 1, 'Wave control must stay above the chat');
  assert.ok(b.touch.width > 0 && b.touch.height > 0 && b.touch.left >= 0 && b.touch.right <= b.width + 1 && b.touch.top >= b.host.top && b.touch.bottom <= b.chat.top + 1, 'Direct-touch area must not cover the conversation');
  assert.ok(b.scroll <= b.width); geometry.push({ label, ...b });
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = process.env.CHAT_TEST_ORIGIN || 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ executablePath:process.env.CHAT_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:true });
  const context = await browser.newContext({ viewport:{ width:1280, height:900 }, reducedMotion:'no-preference' });
  await context.addInitScript(() => {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (url, options = {}) => {
      if (String(url) !== 'https://openrouter.ai/api/v1/chat/completions') return nativeFetch(url, options);
      const encoder = new TextEncoder(); let done = false;
      const stream = new ReadableStream({ start(controller) {
        window.motionTestStream = {
          push(text) { if (!done) controller.enqueue(encoder.encode('data: ' + JSON.stringify({ choices:[{ delta:{ content:text } }] }) + '\n\n')); },
          finish() { if (!done) { done = true; controller.enqueue(encoder.encode('data: [DONE]\n\n')); controller.close(); } }
        };
        options.signal.addEventListener('abort', () => { if (!done) { done = true; controller.error(new DOMException('aborted', 'AbortError')); } }, { once:true });
      } });
      return Promise.resolve(new Response(stream, { headers:{ 'Content-Type':'text/event-stream' } }));
    };
  });
  page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') console.log(m.type(), m.text()); });
  await page.goto(origin + '/chat.html?persona=hina&mode=immersive'); await ready();
  await check('Independent arms and hair animate around a connected face and neck', async () => {
    assert.ok(await page.locator('#soul-character').evaluate(i => i.complete && i.naturalWidth >= 800 && i.currentSrc.includes('/hina-indoor.png')));
    assert.equal(await page.locator('#hinata-live').getAttribute('data-renderer'), 'pixi-articulated');
    assert.equal(await page.locator('#hinata-live').getAttribute('data-parts'), '9');
    assert.ok(Number(await page.locator('#hinata-live').getAttribute('data-vertices')) > 1000);
    await page.waitForFunction(() => Number(document.querySelector('#hinata-live').dataset.wave) > .4);
    await shot('hinata-wave');
    await page.waitForFunction(() => Number(document.querySelector('#hinata-live').dataset.wave) < .02);
    await bounds('desktop'); await shot('hinata-desktop');
    await page.waitForFunction(() => Number(document.querySelector('#hinata-live').dataset.blink) > .88);
    assert.equal(await page.locator('#hinata-live').getAttribute('data-eyes'), 'closed');
    const rig = page.locator('#hinata-live');
    const frame = await rig.screenshot(); await page.waitForTimeout(450);
    assert.ok(!frame.equals(await rig.screenshot()), 'Rendered portrait must actually change between frames');
  });
  await check('Wave control articulates the shoulder, elbow and wrist independently of the face', async () => {
    await page.locator('#hinata-wave').click();
    await page.waitForFunction(() => Number(document.querySelector('#hinata-live').dataset.wave) > .95);
    const before = await page.locator('#hinata-live').evaluate(c => ({ ...c.dataset }));
    assert.ok(Number(before.rightElbow) < -.20 && Number(before.rightElbow) > -.31 && Number(before.rightShoulder) > -.12 && Number(before.rightShoulder) < -.06);
    const pixels = await page.locator('#hinata-live').screenshot(); await page.waitForTimeout(300);
    const after = await page.locator('#hinata-live').evaluate(c => ({ ...c.dataset }));
    assert.notEqual(before.rightWrist, after.rightWrist);
    assert.notEqual(before.hair, after.hair);
    assert.ok(!pixels.equals(await page.locator('#hinata-live').screenshot()));
    await shot('hinata-articulated-wave');
  });
  await check('Pat interaction changes the expression; typing does not pretend to speak', async () => {
    await page.locator('#hinata-pat').click(); await page.waitForFunction(() => Number(document.querySelector('#hinata-live').dataset.happy) > .9);
    assert.equal(await page.locator('#hinata-live').getAttribute('data-mouth-frame'), 'smile');
    await shot('hinata-happy');
    await page.locator('#message').fill('ひなた、ただいま'); await page.waitForTimeout(1900);
    assert.equal(await page.locator('#hinata-live').getAttribute('data-phase'), 'typing');
    assert.ok(Number(await page.locator('#hinata-live').getAttribute('data-mouth')) < .02);
  });
  await check('Repeated pats select complete wink and smile portraits', async () => {
    await page.locator('#hinata-pat').click(); await page.waitForTimeout(200);
    await page.locator('#hinata-pat').click();
    await page.waitForFunction(() => document.querySelector('#hinata-live').dataset.eyes === 'wink');
    assert.equal(await page.locator('#hinata-live').getAttribute('data-mouth-frame'), 'smile');
    await shot('hinata-wink'); await page.waitForTimeout(2000);
  });
  await check('Dragging preserves a single rigid face-neck-shoulder drawing and cannot move facial features', async () => {
    const b = await page.locator('#hinata-touch').boundingBox(), y = b.y + b.height * .2;
    await page.mouse.move(b.x + b.width / 2, y); await page.mouse.down();
    await page.mouse.move(b.x + 12, y, { steps:12 });
    await page.waitForFunction(() => Number(document.querySelector('#hinata-live').dataset.lookX) < -.9 && Number(document.querySelector('#hinata-live').dataset.tilt) < -.01);
    await page.waitForTimeout(250);
    const left = await page.locator('#hinata-live').evaluate(c => ({ ...c.dataset }));
    const pixels = await page.locator('#hinata-live').screenshot(); await shot('hinata-drag-left');
    await page.mouse.move(b.x + b.width - 12, y - 20, { steps:18 });
    await page.waitForFunction(() => Number(document.querySelector('#hinata-live').dataset.lookX) > .9 && Number(document.querySelector('#hinata-live').dataset.tilt) > .01);
    await page.waitForTimeout(250);
    const right = await page.locator('#hinata-live').evaluate(c => ({ ...c.dataset }));
    assert.ok(Number(right.tilt) > Number(left.tilt), 'Rigid lean follows touch');
    assert.ok(Math.abs(Number(right.tilt)) < .15 && Math.abs(Number(left.tilt)) < .15, 'Keep head motion within the connected neck range');
    assert.equal(left.parts, '7'); assert.equal(right.parts, '7');
    assert.equal(left.faceRigid, 'true'); assert.equal(right.faceRigid, 'true');
    assert.ok(!pixels.equals(await page.locator('#hinata-live').screenshot())); await shot('hinata-drag-right');
    await page.mouse.up(); await page.waitForFunction(() => document.querySelector('#hinata-live').dataset.dragging === 'false');
    assert.equal(Number(await page.locator('#hinata-live').getAttribute('data-happy')), 0);
    motionSamples.push({ input:'mouse drag', left, right }); await page.mouse.move(1, 1);
  });
  await check('Simulated streamed reply moves the mouth; completion and cancellation stop it', async () => {
    await page.locator('#open-settings').click(); await page.locator('#settings-tab-connection').click();
    await page.locator('#api-key').fill('sk-or-animation-test-not-real'); await page.locator('#connection-form button[type=submit]').click();
    await page.locator('#send').click(); await page.waitForFunction(() => document.body.dataset.soulPhase === 'waiting' && window.motionTestStream);
    assert.ok(Number(await page.locator('#hinata-live').getAttribute('data-mouth')) < .02);
    await page.evaluate(() => window.motionTestStream.push('おー。おかえり、おにいちゃん。'));
    await page.waitForFunction(() => Number(document.querySelector('#hinata-live').dataset.mouth) > .3); await shot('hinata-replying');
    await page.evaluate(() => window.motionTestStream.finish()); await page.waitForFunction(() => document.body.dataset.soulPhase === 'idle');
    await page.waitForTimeout(650); assert.ok(Number(await page.locator('#hinata-live').getAttribute('data-mouth')) < .02);
    await page.locator('#message').fill('もうひとつ'); await page.locator('#send').click(); await page.waitForFunction(() => document.body.dataset.soulPhase === 'waiting');
    await page.evaluate(() => window.motionTestStream.push('ひな、')); await page.waitForFunction(() => document.body.dataset.soulPhase === 'replying');
    await page.locator('#stop').click(); await page.waitForTimeout(650); assert.ok(Number(await page.locator('#hinata-live').getAttribute('data-mouth')) < .02);
    assert.equal(await page.evaluate(() => Object.values(localStorage).some(v => v.includes('sk-or-animation-test-not-real'))), false);
  });
  await check('Motion preference persists and reduced motion stops the animation loop', async () => {
    await settings(); await page.locator('#character-motion').uncheck(); await close();
    assert.equal(await page.locator('#hinata-live').isVisible(), false); assert.equal(await page.locator('#soul-character').evaluate(i => getComputedStyle(i).opacity), '1');
    await page.reload(); await page.waitForFunction(() => document.body.dataset.soulArt === 'ready'); assert.equal(await page.locator('#hinata-pat').isVisible(), false);
    await settings(); assert.equal(await page.locator('#character-motion').isChecked(), false); await page.locator('#character-motion').check(); await close(); await ready();
    await settings(); await page.locator('#soul-reduced-motion').check(); await close();
    assert.equal(await page.locator('#hinata-wave').isEnabled(), false);
    const frames = await page.locator('#hinata-live').getAttribute('data-frames'); await page.waitForTimeout(400); assert.equal(await page.locator('#hinata-live').getAttribute('data-frames'), frames);
    await settings(); await page.locator('#soul-reduced-motion').uncheck(); await close();
    assert.equal(await page.locator('#hinata-wave').isEnabled(), true);
  });
  await check('Motion strength is selectable, applied and retained after reload', async () => {
    await settings(); await page.locator('#hinata-energy').selectOption('0.5'); await close();
    await page.waitForFunction(() => document.querySelector('#hinata-live').dataset.strength === '0.5');
    await page.reload(); await ready();
    assert.equal(await page.locator('#hinata-live').getAttribute('data-strength'), '0.5');
    await settings(); assert.equal(await page.locator('#hinata-energy').inputValue(), '0.5');
    await page.locator('#hinata-energy').selectOption('1.25'); await close();
    await page.waitForFunction(() => document.querySelector('#hinata-live').dataset.strength === '1.25');
  });
  await check('Switching residents and dark theme never shows a stale Hinata', async () => {
    await page.locator('#immersive-toggle').click();
    assert.equal(await page.locator('#hinata-live').isVisible(), false); assert.equal(await page.locator('#hinata-pat').isVisible(), false);
    assert.equal(await page.locator('#hinata-touch').isVisible(), false);
    assert.equal(await page.locator('#hinata-wave').isVisible(), false);
    await page.locator('#immersive-toggle').click(); await ready();
    await page.locator('#open-residents').click(); await page.locator('#persona-select').selectOption('mii'); await close();
    await page.waitForFunction(() => document.body.dataset.soulCharacter === 'mii' && document.body.dataset.soulArt === 'ready');
    assert.equal(await page.locator('#hinata-live').isVisible(), false); assert.equal(await page.locator('#hinata-pat').isVisible(), false);
    assert.equal(await page.locator('#hinata-touch').isVisible(), false);
    await page.locator('#open-residents').click(); await page.locator('#persona-select').selectOption('hina'); await close(); await ready();
    assert.equal(await page.locator('#hinata-live').count(), 1);
    await page.locator('#open-wardrobe').click(); await page.locator('input[name=soul-theme][value=night]').check(); await close();
    assert.equal(await page.locator('#hinata-live').isVisible(), false);
    await page.locator('#open-wardrobe').click(); await page.locator('input[name=soul-theme][value=sakura]').check(); await close(); await ready();
  });
  await check('Mobile and short viewport preserve a separate face and conversation area', async () => {
    for (const height of [844, 480]) {
      await page.setViewportSize({ width:390, height }); await page.waitForTimeout(150); await bounds('mobile-' + height); await shot('hinata-mobile-' + height);
    }
    await page.setViewportSize({ width:390, height:844 }); await page.locator('#hinata-pat').click(); await page.waitForTimeout(200); await shot('hinata-mobile-happy');
  });
  await check('Context loss restores the original portrait and context restoration reactivates the rig', async () => {
    await page.locator('#hinata-live').evaluate(c => { window.motionLoss = (c.getContext('webgl2') || c.getContext('webgl')).getExtension('WEBGL_lose_context'); window.motionLoss.loseContext(); });
    await page.waitForFunction(() => document.body.dataset.hinaMotion === 'off');
    assert.equal(await page.locator('#soul-character').evaluate(i => getComputedStyle(i).opacity), '1');
    assert.equal(await page.locator('#hinata-touch').isVisible(), false);
    await page.waitForTimeout(150); await page.evaluate(() => window.motionLoss.restoreContext()); await ready();
    await shot('hinata-restored');
  });
  await check('Touch drag, tap, cancellation and keyboard activation work without blocking keyless chat', async () => {
    const mobile = await browser.newContext({ viewport:{ width:390, height:844 }, deviceScaleFactor:2, isMobile:true, hasTouch:true, reducedMotion:'no-preference' });
    const m = await mobile.newPage(); m.on('pageerror', e => errors.push(e.message));
    await m.goto(origin + '/chat.html?persona=hina&mode=immersive');
    await m.waitForFunction(() => document.body.dataset.hinaMotion === 'ready' && Number(document.querySelector('#hinata-live').dataset.frames) > 2);
    await bounds('mobile-touch', m);
    const cdp = await mobile.newCDPSession(m);
    const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints:x == null ? [] : [{ x, y, id:1 }] });
    await touch('touchStart', 195, 185); await touch('touchMove', 55, 170);
    await m.waitForFunction(() => Number(document.querySelector('#hinata-live').dataset.lookX) < -.9);
    const left = await m.locator('#hinata-live').evaluate(c => ({ ...c.dataset }));
    await m.screenshot({ path:path.join(output, 'hinata-touch-left.png') });
    await touch('touchMove', 335, 140);
    await m.waitForFunction(() => Number(document.querySelector('#hinata-live').dataset.lookX) > .9);
    await m.waitForTimeout(350);
    const right = await m.locator('#hinata-live').evaluate(c => ({ ...c.dataset }));
    await m.screenshot({ path:path.join(output, 'hinata-touch-right.png') });
    await touch('touchEnd'); await m.waitForFunction(() => document.querySelector('#hinata-live').dataset.dragging === 'false');
    assert.equal(Number(await m.locator('#hinata-live').getAttribute('data-happy')), 0);
    await m.waitForFunction(() => Math.abs(Number(document.querySelector('#hinata-live').dataset.lookX)) < .4);
    await m.touchscreen.tap(195, 180); await m.waitForFunction(() => Number(document.querySelector('#hinata-live').dataset.happy) > .9);
    await m.waitForTimeout(1800); await m.locator('#hinata-touch').focus(); await m.keyboard.press('Enter');
    await m.waitForFunction(() => Number(document.querySelector('#hinata-live').dataset.happy) > .9);
    await touch('touchStart', 195, 185); await touch('touchMove', 45, 185); await touch('touchCancel');
    await m.waitForFunction(() => document.querySelector('#hinata-live').dataset.dragging === 'false');
    await m.locator('#message').tap(); await m.locator('#message').fill('ただいま'); await m.locator('#send').tap();
    await m.waitForFunction(() => document.body.dataset.soulPhase === 'replying');
    await m.waitForFunction(() => document.body.dataset.soulPhase === 'idle');
    assert.ok((await m.locator('#transcript').innerText()).includes('おかえり'));
    assert.equal(await m.evaluate(() => scrollY), 0); await bounds('mobile-touch-after-chat', m);
    motionSamples.push({ input:'emulated touch', left, right }); await mobile.close();
  });
  await check('Missing generated artwork falls back to the intact original without blocking chat', async () => {
    const missing = await browser.newContext({ viewport:{ width:390, height:844 } });
    await missing.route('**/hina-rig/core-v2.png', route => route.abort());
    const f = await missing.newPage(); f.on('pageerror', e => errors.push(e.message));
    const failed = f.waitForEvent('console', { predicate:m => m.text().includes('Hinata illustration fallback:') });
    await f.goto(origin + '/chat.html?persona=hina&mode=immersive'); await failed;
    assert.equal(await f.locator('#hinata-live').isVisible(), false);
    assert.equal(await f.locator('#hinata-touch').isVisible(), false);
    assert.equal(await f.locator('#soul-character').evaluate(i => getComputedStyle(i).opacity), '1');
    await f.locator('#message').fill('ただいま'); await f.locator('#send').click();
    await f.waitForFunction(() => document.body.dataset.soulPhase === 'idle' && document.querySelector('#transcript').textContent.includes('おかえり'));
    await f.screenshot({ path:path.join(output, 'hinata-missing-asset.png') }); await missing.close();
  });
  await check('No-WebGL environment keeps the original picture and chat usable', async () => {
    const fallback = await browser.newContext({ viewport:{ width:390, height:844 }, reducedMotion:'reduce' });
    await fallback.addInitScript(() => { const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(t, ...a) { return t.startsWith('webgl') ? null : get.call(this, t, ...a); }; });
    const f = await fallback.newPage(); f.on('pageerror', e => errors.push(e.message)); await f.goto(origin + '/chat.html?persona=hina&mode=immersive');
    await f.waitForFunction(() => document.body.dataset.soulArt === 'ready' && document.body.dataset.soulRenderer === 'fallback');
    assert.equal(await f.locator('#soul-character').evaluate(i => getComputedStyle(i).opacity), '1');
    await f.locator('#message').fill('画像が動かない環境でも話せる'); assert.equal(await f.locator('#hinata-pat').isVisible(), false);
    await f.screenshot({ path:path.join(output, 'hinata-fallback.png') }); await fallback.close();
  });
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(output, 'hinata-motion-report.json'), JSON.stringify({ passed:true, checkedAt:new Date().toISOString(), origin, checks, geometry, motionSamples, errors, limits:['Browser viewport and emulated touch testing, not a physical smartphone.', 'OpenRouter responses simulated; no real API key or voice lip-sync used.', 'PixiJS mesh rig with connected face expression frames; no Cubism model or 3D face turn.'] }, null, 2));
})().catch(async error => { console.error(error); await page?.screenshot({ path:path.join(output, 'hinata-failure.png') }).catch(() => {}); fs.writeFileSync(path.join(output, 'hinata-motion-report.json'), JSON.stringify({ passed:false, checks, errors, error:error.stack }, null, 2)); process.exitCode = 1; }).finally(async () => { await browser?.close(); server.closeAllConnections(); server.close(); });
