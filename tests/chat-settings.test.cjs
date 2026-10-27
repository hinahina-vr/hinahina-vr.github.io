const { chromium } = require('playwright');
const { createServer } = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const output = process.env.CHAT_TEST_OUTPUT || path.join(os.tmpdir(), 'waddy-chat-settings-tests');
if (!/^[Ee]:[\\/]/.test(output) || !/^[Ee]:[\\/]/.test(os.tmpdir())) throw new Error('Test output and TEMP must be on E:');
fs.mkdirSync(output, { recursive: true });
const mime = {'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.woff2':'font/woff2'};
const server = createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
});
let browser;const checks=[],errors=[],requests=[],fonts=[];
async function check(name,fn){await fn();checks.push({name,passed:true});console.log('PASS',name);}
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin=process.env.CHAT_TEST_ORIGIN||'http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:960},acceptDownloads:true,reducedMotion:'reduce'});
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
  p.on('console',m=>{if(m.type()==='error'&&/Content Security Policy|Refused to load the font|Failed to decode downloaded font/.test(m.text())) errors.push(m.text());});
  p.on('request',r=>{if(r.resourceType()==='font')fonts.push(r.url());});
  await p.route('https://openrouter.ai/api/v1/**',async route=>{
    const req=route.request();
    if(req.url().endsWith('/models'))return route.fulfill({json:{data:[{id:'test/model',name:'Test model'}]}});
    requests.push({url:req.url(),body:req.postDataJSON()});
    await route.fulfill({contentType:'text/event-stream',body:'data: '+JSON.stringify({choices:[{delta:{content:'えへへ、お話の続きだよ。'}}]})+'\n\ndata: [DONE]\n\n'});
  });
  async function ready(){await p.waitForFunction(()=>!document.querySelector('#message').disabled);}
  async function open(){await p.locator('#open-settings').click();await p.locator('#chat-drawer[open]').waitFor();}
  async function tab(id){await p.locator('#settings-tab-'+id).click();}
  async function close(){await p.locator('#back-to-conversation').click();await p.waitForFunction(()=>!document.querySelector('#chat-drawer').open);}
  await p.goto(origin+'/chat.html?persona=hina&mode=immersive');await ready();
  await check('Zen Maru Gothicの通常・太字をサイトから読み込んで実際に描画する',async()=>{
    const result=await p.evaluate(async()=>{await document.fonts.load('400 16px "Zen Maru Gothic"','設定');await document.fonts.load('700 16px "Zen Maru Gothic"','設定');return {regular:document.fonts.check('400 16px "Zen Maru Gothic"','設定'),bold:document.fonts.check('700 16px "Zen Maru Gothic"','設定'),family:getComputedStyle(document.querySelector('main')).fontFamily};});
    assert.ok(result.regular&&result.bold);assert.match(result.family,/Zen Maru Gothic/);assert.equal(fonts.length,2);assert.ok(fonts.every(u=>new URL(u).origin===origin));
  });
  await check('4タブのゲーム風設定を開き、矢印キーでもカテゴリを移動できる',async()=>{
    await p.locator('#message').fill('書きかけのメッセージ');await open();
    assert.equal(await p.getByRole('tab').count(),4);assert.equal(await p.locator('[role=tabpanel]:visible').count(),1);
    assert.equal(await p.locator('#remember-key').isChecked(),false);
    await p.screenshot({path:path.join(output,'settings-connection-desktop.png')});
    await p.locator('#settings-tab-connection').focus();await p.keyboard.press('ArrowDown');
    assert.equal(await p.locator('#settings-tab-personality').getAttribute('aria-selected'),'true');
    await p.keyboard.press('End');assert.equal(await p.locator('#settings-tab-history').getAttribute('aria-selected'),'true');
    await p.keyboard.press('Home');assert.equal(await p.locator('#settings-tab-connection').getAttribute('aria-selected'),'true');
    assert.ok(!(await p.locator('#chat-drawer').innerText()).includes('性格・キャラクター性'));
  });
  await check('性格の例を追記し、タブ移動で下書きを失わず人格別に保存・復元する',async()=>{
    await tab('personality');await p.locator('#personality').fill('映画の話が好き。');
    await p.locator('[data-setting-prompt="返事は短めに。"]').click();await p.locator('[data-setting-prompt="返事は短めに。"]').click();
    const value='映画の話が好き。\n返事は短めに。';assert.equal(await p.locator('#personality').inputValue(),value);
    await tab('connection');await tab('personality');assert.equal(await p.locator('#personality').inputValue(),value);
    await p.locator('#save-personality').click();await p.screenshot({path:path.join(output,'settings-personality-desktop.png')});
    await close();assert.equal(await p.locator('#message').inputValue(),'書きかけのメッセージ');
    await p.reload();await ready();await open();await tab('personality');assert.equal(await p.locator('#personality').inputValue(),value);
    await close();await p.locator('#open-residents').click();await p.locator('#persona-select').selectOption('kukuri');await ready();await close();await open();await tab('personality');
    assert.equal(await p.locator('#personality').inputValue(),'');assert.match(await p.locator('#settings-persona-name').innerText(),/ククリ/);
    await close();await p.locator('#open-residents').click();await p.locator('#persona-select').selectOption('hina');await ready();await close();
  });
  await check('新しい接続画面でも同意なしではキーを保存せず、オンにした場合だけ再読み込み後に復元する',async()=>{
    await open();await tab('connection');await p.locator('#api-key').fill('sk-or-settings-test-not-real');
    await p.locator('#toggle-key').click();assert.equal(await p.locator('#api-key').getAttribute('type'),'text');await p.locator('#toggle-key').click();
    await p.locator('#connection-form button[type=submit]').click();await p.waitForFunction(()=>!document.querySelector('#chat-drawer').open);
    assert.equal(await p.evaluate(()=>localStorage.getItem('waddy-chat-openrouter-key-v1')),null);
    await p.reload();await ready();await open();assert.equal(await p.locator('#api-key').inputValue(),'');
    await p.locator('#api-key').fill('sk-or-settings-test-not-real');await p.locator('#remember-key').check();await p.locator('#connection-form button[type=submit]').click();
    await p.reload();await ready();await open();await tab('connection');assert.equal(await p.locator('#api-key').inputValue(),'sk-or-settings-test-not-real');assert.ok(await p.locator('#remember-key').isChecked());await close();
  });
  await check('背景・光・動きの設定と数値表示が一致し、再読み込み後も復元する',async()=>{
    await open();await tab('visuals');await p.locator('#soul-scene').selectOption('light');await p.locator('#soul-intensity').fill('40');await p.locator('#soul-intensity').dispatchEvent('input');
    assert.equal(await p.locator('#soul-intensity-value').innerText(),'40%');await p.locator('#soul-reduced-motion').check();await close();
    await p.reload();await ready();await open();await tab('visuals');assert.equal(await p.locator('#soul-scene').inputValue(),'light');assert.equal(await p.locator('#soul-intensity-value').innerText(),'40%');
    await p.locator('#soul-scene').selectOption('bedroom');await p.screenshot({path:path.join(output,'settings-visuals-desktop.png')});await close();
  });
  await check('保存・履歴タブから会話を保存して書き出せる。キーや基本人格を含めない',async()=>{
    await open();await tab('history');await p.locator('#remember-history').check();await close();
    await p.locator('#message').fill('こんにちは');await p.locator('#send').click();await p.waitForFunction(()=>document.querySelector('#chat-status').textContent==='返事が届いたよ。');
    assert.equal(requests.length,1);assert.equal(requests[0].url,'https://openrouter.ai/api/v1/chat/completions');
    assert.match(requests[0].body.messages[0].content,/映画の話が好き。/);
    await open();await tab('history');const downloadReady=p.waitForEvent('download');await p.locator('#export-conversation').click();const download=await downloadReady;
    const file=path.join(output,download.suggestedFilename());await download.saveAs(file);const raw=fs.readFileSync(file,'utf8'),data=JSON.parse(raw);
    assert.equal(data.persona,'hina');assert.ok(data.messages.length>=2);assert.ok(!raw.includes('sk-or-settings-test-not-real')&&!raw.includes('base_persona'));
    await p.screenshot({path:path.join(output,'settings-history-desktop.png')});await close();await p.reload();await ready();assert.equal(await p.locator('.chat-message').count(),2);
  });
  await check('通常表示からも同じ設定を開き、閉じたあとにフォームを重複させない',async()=>{
    await p.locator('#immersive-toggle').click();await open();await tab('personality');await close();
    assert.equal(await p.locator('#api-key').count(),1);assert.equal(await p.locator('#personality').count(),1);
    assert.equal(await p.locator('.additional-settings summary').evaluate(e=>e.inert),false);
    await p.locator('.additional-settings summary').click();assert.ok(await p.locator('#personality').isVisible());
    await p.locator('#immersive-toggle').click();
  });
  await check('スマホ幅・低い画面でも全タブと閉じる操作が使え、横にはみ出さない',async()=>{
    for(const height of [844,480]){
      await p.setViewportSize({width:390,height});await open();
      for(const id of ['connection','personality','visuals','history']){
        await tab(id);
        assert.ok(await p.evaluate(()=>document.querySelector('#drawer-content').scrollWidth<=document.querySelector('#drawer-content').clientWidth+1));
        for(const sel of ['#settings-tab-'+id,'#drawer-close','#back-to-conversation']){
          const b=await p.locator(sel).boundingBox();assert.ok(b&&b.x>=0&&b.y>=0&&b.x+b.width<=391&&b.y+b.height<=height+1,sel+JSON.stringify(b));
        }
        if(height===844&&(id==='connection'||id==='personality'))await p.screenshot({path:path.join(output,'settings-'+id+'-mobile.png')});
      }
      await p.screenshot({path:path.join(output,'settings-short-'+height+'.png')});await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.querySelector('#chat-drawer').open);
    }
    await p.setViewportSize({width:1440,height:960});
  });
  await check('夜の着せ替えでは設定も暗い配色になり、保存した接続を削除できる',async()=>{
    await p.locator('#open-wardrobe').click();await p.locator('input[name=soul-theme][value=night]').check();await close();await open();await tab('personality');
    assert.equal(await p.locator('#chat-drawer').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(36, 29, 48)');
    await p.screenshot({path:path.join(output,'settings-night-desktop.png')});await tab('connection');await p.locator('#forget-key').click();assert.equal(await p.locator('#api-key').inputValue(),'');assert.equal(await p.evaluate(()=>localStorage.getItem('waddy-chat-openrouter-key-v1')),null);await close();
  });
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(output,'settings-test-report.json'),JSON.stringify({passed:true,checkedAt:new Date().toISOString(),origin,checks,fonts,pageErrors:errors,limitations:['LLM responses are mocked; no paid-model response quality tested.','Mobile and short viewports are desktop Chrome simulations.']},null,2));
})().catch(e=>{console.error(e);fs.writeFileSync(path.join(output,'settings-test-report.json'),JSON.stringify({passed:false,checks,errors,error:e.message},null,2));process.exitCode=1;}).finally(async()=>{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));});
