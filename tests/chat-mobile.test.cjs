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
let browser;const checks=[],errors=[],geometries=[],requests=[];
async function check(name,fn){await fn();checks.push({name,passed:true});console.log('PASS',name);}
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin=process.env.CHAT_TEST_ORIGIN||'http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce',acceptDownloads:true});
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
  let replyText='今日は何をしてた？　ゆっくりお話しようね。\n'.repeat(90),mode='success';
  await p.route('https://openrouter.ai/api/v1/chat/completions',async route=>{
    requests.push(route.request().postDataJSON());
    if(mode==='auth')return route.fulfill({status:401,json:{error:{message:'test auth failure'}}});
    return route.fulfill({contentType:'text/event-stream',body:'data: '+JSON.stringify({choices:[{delta:{content:replyText}}]})+'\n\ndata: [DONE]\n\n'});
  });
  async function ready(page=p){await page.waitForFunction(()=>!document.querySelector('#message').disabled&&document.body.dataset.soulArt==='ready');}
  async function close(page=p){await page.locator('#back-to-conversation').click();await page.waitForFunction(()=>!document.querySelector('#chat-drawer').open);}
  async function geometry(label,page=p,top=0,height=null){
    const result=await page.evaluate(()=>{
      const r=s=>{const b=document.querySelector(s).getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,bottom:b.bottom,right:b.right};};
      return {character:r('#soul-character-wrap'),image:r('#soul-character'),chat:r('.conversation-panel'),transcript:r('#transcript'),input:r('#message'),form:r('#message-form'),name:r('#change-resident'),history:r('#open-history'),main:r('main'),clientWidth:innerWidth,documentWidth:document.documentElement.scrollWidth};
    });
    const h=height??result.main.height,bottom=top+h;
    assert.ok(result.character.bottom<=result.chat.y+.5,'Face/character region must never overlap chat: '+JSON.stringify(result));
    assert.ok(result.character.height>=80,'Visible character region is too small: '+JSON.stringify(result));
    assert.ok(result.image.y>=result.character.y-8&&result.image.y<=result.character.y+20,'Head must start at top of reserved area');
    assert.ok(result.image.width>=100,'Character must remain recognizable');
    assert.ok(result.input.y>=result.chat.y&&result.input.bottom<=bottom+1,'Input must remain accessible: '+JSON.stringify(result));
    assert.ok(result.form.bottom<=bottom+1,'Composer must remain above keyboard');
    assert.ok(result.name.right<=result.history.x,'Name and navigation must be separate');
    assert.ok(result.documentWidth<=result.clientWidth,'Horizontal overflow');
    geometries.push({label,...result});return result;
  }
  await p.goto(origin+'/chat.html?persona=hina');await ready();
  await check('スマホは初回からキャラとのチャット表示。名前・履歴・設定・メニューを押せる',async()=>{
    assert.ok(await p.locator('body').evaluate(e=>e.classList.contains('chat-immersive')));
    for(const s of ['#change-resident','#open-history','#open-settings','#open-chat-menu']){assert.ok(await p.locator(s).isVisible());const b=await p.locator(s).boundingBox();assert.ok(b.height>=44,s);}
    await geometry('empty 390x844');
  });
  await check('長い返事を表示しても、キャラと会話欄が別の領域に収まる',async()=>{
    await p.locator('#open-settings').click();await p.locator('#api-key').fill('sk-or-mobile-test-not-real');await p.locator('#connection-form button[type=submit]').click();await p.waitForFunction(()=>!document.querySelector('#chat-drawer').open);
    await p.locator('#message').fill('今日のお話をして');await p.locator('#send').click();await p.waitForFunction(()=>document.querySelector('#chat-status').textContent==='返事が届いたよ。');
    assert.equal(await p.locator('#transcript .chat-message:visible').count(),2);
    assert.ok(await p.locator('#transcript').evaluate(e=>e.scrollHeight>e.clientHeight));
    await geometry('long reply 390x844');
    await p.screenshot({path:path.join(output,'mobile-long-reply.png')});
  });
  await check('18行の下書きとキーボード相当の低い画面でも顔と入力欄を保つ',async()=>{
    await p.locator('#message').fill('書きかけの文章です。\n'.repeat(18));
    for(const [width,height] of [[390,480],[320,568],[360,640],[430,932],[844,390],[390,360]]){
      await p.setViewportSize({width,height});await p.waitForFunction(()=>Math.abs(document.querySelector('main').getBoundingClientRect().height-innerHeight)<1);
      await geometry(width+'x'+height);
      assert.equal(await p.locator('#message').inputValue(),'書きかけの文章です。\n'.repeat(18));
      if(width===390&&height===480)await p.screenshot({path:path.join(output,'mobile-keyboard-sized.png')});
    }
    await p.setViewportSize({width:390,height:844});
  });
  await check('スマホのEnter・日本語変換中のEnterで誤送信せず、送信ボタンから送れる',async()=>{
    const before=requests.length;await p.locator('#message').fill('改行のテスト');await p.locator('#message').press('Enter');assert.match(await p.locator('#message').inputValue(),/\n/);
    await p.locator('#message').dispatchEvent('keydown',{key:'Enter',isComposing:true,bubbles:true});assert.equal(requests.length,before);
    replyText='うん、ゆっくり話そ。';await p.locator('#send').click();await p.waitForFunction(()=>document.querySelector('#chat-status').textContent==='返事が届いたよ。');assert.equal(requests.length,before+1);
  });
  await check('表示領域だけが縮むキーボードとスクロール位置の変化にも追従する',async()=>{
    const vc=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    await vc.addInitScript(()=>{
      const visual=new EventTarget();Object.assign(visual,{height:400,width:390,scale:1,offsetTop:0});
      Object.defineProperty(window,'visualViewport',{configurable:true,value:visual});window.__testVisual=visual;
    });
    const vp=await vc.newPage();vp.on('pageerror',e=>errors.push(e.message));await vp.goto(origin+'/chat.html?persona=hina&mode=immersive');await ready(vp);
    await vp.locator('#message').fill('キーボードを出したまま書く。\n'.repeat(12));await geometry('visual viewport 400',vp,0,400);
    await vp.evaluate(()=>{window.__testVisual.height=370;window.__testVisual.offsetTop=70;window.__testVisual.dispatchEvent(new Event('resize'));window.__testVisual.dispatchEvent(new Event('scroll'));});
    await vp.waitForFunction(()=>Math.abs(document.querySelector('main').getBoundingClientRect().y-70)<1);
    await geometry('visual viewport offset 70, height 370',vp,70,370);
    await vp.locator('#open-settings').click();const dialog=await vp.locator('#chat-drawer').boundingBox();assert.ok(dialog.y>=70&&dialog.y+dialog.height<=441,JSON.stringify(dialog));await close(vp);
    await vp.screenshot({path:path.join(output,'mobile-visual-viewport.png')});await vc.close();
  });
  await check('相手の名前から切り替え、顔と名前と下書きが別人格に混ざらない',async()=>{
    await p.locator('#message').fill('ひなたへの下書き');await p.locator('#change-resident').click();await p.locator('#persona-select').selectOption('mii');await ready();await close();
    assert.match(await p.locator('#conversation-title').innerText(),/みぃ/);assert.equal(await p.locator('#message').inputValue(),'');await geometry('mii');
    await p.screenshot({path:path.join(output,'mobile-mii.png')});await p.locator('#change-resident').click();await p.locator('#persona-select').selectOption('hina');await ready();await close();assert.equal(await p.locator('#message').inputValue(),'ひなたへの下書き');
  });
  await check('メニューから相手・着せ替え・通常表示に進み、会話の下書きを保つ',async()=>{
    await p.locator('#open-chat-menu').click();assert.ok(await p.locator('#open-residents').isVisible());assert.ok(await p.locator('#open-wardrobe').isVisible());assert.ok(await p.locator('#immersive-toggle').isVisible());
    await p.locator('#open-wardrobe').click();await p.locator('input[name=soul-theme][value=mint]').check();await close();await geometry('mint wardrobe');
    assert.equal(await p.locator('#message').inputValue(),'ひなたへの下書き');
    await p.locator('#open-chat-menu').click();await p.locator('#immersive-toggle').click();await p.waitForFunction(()=>!document.body.classList.contains('chat-immersive'));
    assert.equal(await p.locator('#message').inputValue(),'ひなたへの下書き');
    await p.goto(origin+'/chat.html?persona=hina');await ready();assert.ok(!(await p.locator('body').evaluate(e=>e.classList.contains('chat-immersive'))),'Explicit classic preference must be respected');
    await p.locator('#immersive-toggle').click();await ready();
  });
  await check('履歴をスクロールでき、設定画面へ移っても会話と入力欄を保つ',async()=>{
    await p.locator('#message').fill('残しておく下書き');await p.locator('#open-history').click();assert.ok(await p.locator('#chat-drawer #transcript').isVisible());await close();
    await p.locator('#open-settings').click();await p.locator('#settings-tab-personality').click();await p.locator('#personality').fill('返事は短めに。');await p.locator('#save-personality').click();await close();assert.equal(await p.locator('#message').inputValue(),'残しておく下書き');await geometry('after settings/history');
  });
  await check('通信エラーと再送ボタンが出ても顔を覆わず、再送できる',async()=>{
    await p.locator('#open-settings').click();await p.locator('#settings-tab-connection').click();await p.locator('#api-key').fill('sk-or-mobile-test-not-real');await p.locator('#connection-form button[type=submit]').click();await p.waitForFunction(()=>!document.querySelector('#chat-drawer').open);
    mode='auth';await p.locator('#message').fill('エラーの確認');await p.locator('#send').click();await p.waitForFunction(()=>!document.querySelector('#retry').hidden);
    await p.setViewportSize({width:390,height:360});await p.locator('#message').fill('下書き\n'.repeat(12));await geometry('error with keyboard');
    const retry=await p.locator('#retry').boundingBox();assert.ok(retry.y>=164&&retry.y+retry.height<=361);await p.screenshot({path:path.join(output,'mobile-error.png')});
    mode='success';await p.locator('#retry').click();await p.waitForFunction(()=>document.querySelector('#chat-status').textContent==='返事が届いたよ。');
  });
  await check('通常の短い会話をスマホのチャット画面として表示する',async()=>{
    await p.setViewportSize({width:390,height:844});await p.locator('#open-chat-menu').click();await p.locator('#open-wardrobe').click();await p.locator('input[name=soul-theme][value=sakura]').check();await close();
    await p.locator('#open-history').click();p.once('dialog',d=>d.accept());await p.locator('#clear-conversation').click();await close();
    replyText='おにいちゃん、おかえり。\n今日はどんな一日だった？\nひな、ゆっくり聞きたいな。';
    await p.locator('#message').fill('ただいま。今日はちょっと疲れた');await p.locator('#send').click();await p.waitForFunction(()=>document.querySelector('#chat-status').textContent==='返事が届いたよ。');
    await p.locator('#message').fill('ありがとう、ひなた');await geometry('short conversation');await p.screenshot({path:path.join(output,'mobile-chat-final.png')});
  });
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(output,'mobile-test-report.json'),JSON.stringify({passed:true,checkedAt:new Date().toISOString(),origin,checks,geometries,pageErrors:errors,limitations:['Chrome mobile/touch emulation, not a physical phone or real OS keyboard.','VisualViewport changes include deliberate fault injection.','OpenRouter replies are mocked; no paid-model response quality checked.']},null,2));
})().catch(e=>{console.error(e);fs.writeFileSync(path.join(output,'mobile-test-report.json'),JSON.stringify({passed:false,checks,geometries,pageErrors:errors,error:e.message},null,2));process.exitCode=1;}).finally(async()=>{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));});
