const { chromium } = require('playwright');
const { createServer } = require('node:http');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), output = process.env.CHAT_TEST_OUTPUT || path.join(os.tmpdir(), 'waddy-demo-tests');
if (!/^E:[\\/]/i.test(output) || !/^E:[\\/]/i.test(os.tmpdir())) throw Error('Use E: for tests and TEMP');
fs.mkdirSync(output, {recursive:true});
const mime = {'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.woff2':'font/woff2'};
const server = createServer((req,res)=>{
  const file = path.resolve(root, '.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.writeHead(200, {'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
});
const checks=[], errors=[], requests=[], posts=[], greetings={}, replies={};
let browser,p,origin,apiMode='success';
async function check(name,run){await run();checks.push({name,passed:true});console.log('PASS',name);}
async function ready(){await p.waitForFunction(()=>!document.querySelector('#message').disabled);}
async function send(text){await p.locator('#message').fill(text);await p.locator('#send').click();await p.waitForFunction(()=>!document.querySelector('#message').disabled&&!document.querySelector('#transcript .incomplete'));}
async function close(){await p.locator('#back-to-conversation').click();await p.waitForFunction(()=>!document.querySelector('#chat-drawer').open);}
async function configure(remember=false){
  if(!await p.locator('#chat-drawer').evaluate(d=>d.open)) await p.locator('#demo-connect').click();
  await p.locator('#settings-tab-connection').click();await p.locator('#api-key').fill('sk-or-demo-regression-not-real');
  await p.locator('#remember-key').setChecked(remember);await p.locator('#connection-form button[type=submit]').click();
  if(await p.locator('#chat-drawer').evaluate(d=>d.open)) await close();
}
async function forget(){await p.locator('#open-settings').click();await p.locator('#settings-tab-connection').click();await p.locator('#forget-key').click();await close();}
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));origin=process.env.CHAT_TEST_ORIGIN||'http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({executablePath:process.env.CHAT_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce',acceptDownloads:true});
  await context.route('https://openrouter.ai/**',async route=>{
    requests.push({url:route.request().url(),body:route.request().postDataJSON()});
    if(apiMode==='error') return route.fulfill({status:401,json:{error:{message:'unauthorized'}}});
    return route.fulfill({contentType:'text/event-stream',body:'data: '+JSON.stringify({choices:[{delta:{content:'接続後の試験用の返事です。'}}]})+'\n\ndata: [DONE]\n\n'});
  });
  p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
  p.on('request',r=>{if(r.method()==='POST')posts.push(r.url());});
  await p.goto(origin+'/chat.html?persona=hina&mode=classic');await ready();
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'assets/chat/catalog.json'),'utf8'));
  await check('All 33 residents greet in their own voice and reply with no API request',async()=>{
    for(const c of catalog){
      await p.locator('#persona-select').selectOption(c.id);await p.waitForFunction(id=>document.body.dataset.soulCharacter===id&&!document.querySelector('#message').disabled,c.id);
      greetings[c.id]=await p.locator('[data-demo-greeting] .message-text').innerText();assert.match(greetings[c.id],/APIキー/);
      await send('ただいま');replies[c.id]=await p.locator('.chat-message.assistant .message-text').last().innerText();
      assert.ok(replies[c.id].length>5);assert.equal(await p.locator('#demo-notice').isVisible(),true);
    }
    assert.equal(Object.keys(greetings).length,33);assert.equal(new Set(Object.values(replies)).size,33);assert.equal(requests.length,0);assert.deepEqual(posts,[]);
    assert.match(replies.hina,/おにいちゃん/);assert.doesNotMatch(greetings.hina+replies.hina,/です|ます|ください/);
    assert.match(replies.mii,/お兄タン/);assert.match(replies.mii,/みぃタン/);assert.match(replies.kukuri,/勇者様/);
    fs.writeFileSync(path.join(output,'all-residents.json'),JSON.stringify({greetings,replies},null,2));
  });
  await check('Demo supports topics, fallback, cancellation and retry without persisting the dialogue',async()=>{
    await p.locator('#persona-select').selectOption('hina');await ready();
    await send('好きなものは？');assert.match(await p.locator('.assistant .message-text').last().innerText(),/バスケ/);
    await send('some-unmatched-question');assert.match(await p.locator('.assistant .message-text').last().innerText(),/APIキー/);
    await p.locator('#message').fill('ちょっと疲れた');await p.locator('#send').click();await p.locator('#stop').click();
    await p.waitForFunction(()=>!document.querySelector('#retry').hidden);
    const count=await p.locator('.chat-message.user').count();await p.locator('#retry').click();await ready();
    assert.equal(await p.locator('.chat-message.user').count(),count);
    await p.locator('#remember-history').check();
    const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('waddy-chat-v1')));assert.deepEqual(saved.conversations,{});
    const downloadEvent=p.waitForEvent('download');await p.locator('#export-conversation').click();const d=await downloadEvent;
    await d.saveAs(path.join(output,'demo-export.json'));const exported=JSON.parse(fs.readFileSync(path.join(output,'demo-export.json'),'utf8'));
    assert.equal(exported.mode,'demo');assert.equal(exported.replySource,'preset');assert.ok(exported.messages.length>0);assert.equal(exported.additionalPersonality,'');
    await p.reload();await ready();assert.equal(await p.locator('[data-demo-greeting]').count(),1);assert.equal(await p.locator('.chat-message.user').count(),0);
    assert.equal(requests.length,0);
  });
  await check('Mobile prompts and connection invitation fit below the face at normal and keyboard heights',async()=>{
    await p.setViewportSize({width:390,height:844});await p.locator('#immersive-toggle').click();
    await p.waitForFunction(()=>document.body.dataset.soulArt==='ready');
    await p.screenshot({path:path.join(output,'demo-mobile-welcome.png')});
    await p.locator('.demo-choices button').filter({hasText:'ただいま'}).click();await ready();
    assert.match(await p.locator('.assistant .message-text').last().innerText(),/おかえり/);
    for(const height of [844,480]){
      await p.setViewportSize({width:390,height});await p.waitForTimeout(180);
      const b=await p.evaluate(()=>{
        const box=id=>{const r=document.querySelector(id).getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height};};
        return {face:box('#soul-character-wrap'),chat:box('.conversation-panel'),notice:box('#demo-notice'),connect:box('#demo-connect'),send:box('#send'),width:innerWidth,height:innerHeight,scroll:document.documentElement.scrollWidth};
      });
      assert.ok(b.face.bottom<=b.chat.top+1);assert.ok(b.connect.height>=44);assert.ok(b.send.bottom<=b.height);assert.ok(b.notice.top>=b.chat.top);assert.ok(b.scroll<=b.width);
      await p.screenshot({path:path.join(output,'demo-mobile-'+height+'.png')});
    }
    await p.locator('#message').fill('入力途中の話');await p.locator('#demo-connect').click();
    assert.equal(await p.locator('#api-key').isVisible(),true);await close();assert.equal(await p.locator('#message').inputValue(),'入力途中の話');
    assert.equal(requests.length,0);await p.setViewportSize({width:390,height:844});
  });
  await check('Adding a key starts real chat without sending demo history; consent and saved real history survive demo mode',async()=>{
    await configure(false);assert.equal(await p.locator('#demo-notice').isVisible(),false);assert.equal(await p.locator('.chat-message').count(),0);
    assert.equal(await p.evaluate(()=>localStorage.getItem('waddy-chat-openrouter-key-v1')),null);
    await send('本番の会話だけ');assert.equal(requests.length,1);const history=requests[0].body.messages.filter(m=>m.role!=='system');
    assert.deepEqual(history,[{role:'user',content:'本番の会話だけ'}]);
    await forget();assert.match(await p.locator('#transcript').innerText(),/本番の会話だけ/);
    await send('ただいま');assert.equal(requests.length,1);
    await configure(true);assert.equal(await p.locator('.chat-message').count(),2);
    await p.reload();await ready();assert.equal(await p.locator('#demo-notice').isVisible(),false);assert.equal(await p.locator('.chat-message').count(),2);
  });
  await check('Clearing the demo keeps the saved real conversation readable',async()=>{
    await forget();await send('ただいま');
    await p.locator('#open-history').click();p.once('dialog',d=>d.accept());await p.locator('#clear-conversation').click();
    assert.equal(await p.locator('.chat-message.user').count(),1);assert.match(await p.locator('#transcript').innerText(),/本番の会話だけ/);
    assert.equal(await p.locator('[data-demo-greeting]').count(),1);await close();await configure(true);
  });
  await check('An invalid configured key remains a visible error instead of silently substituting a demo',async()=>{
    apiMode='error';await send('接続エラーの試験');assert.match(await p.locator('#chat-error').innerText(),/APIキー/);
    assert.equal(await p.locator('#demo-notice').isVisible(),false);assert.equal(await p.locator('.assistant').count(),1);apiMode='success';
  });
  await check('Changing connection during a demo reply cancels the old reply and never mixes modes',async()=>{
    await forget();await p.locator('#message').fill('こんにちは');await p.locator('#send').click();
    await p.locator('#demo-connect').click();await configure(false);await p.waitForTimeout(900);
    assert.equal(await p.locator('#demo-notice').isVisible(),false);assert.equal(await p.locator('.incomplete').count(),0);
    assert.ok(!(await p.locator('#transcript').innerText()).includes('ひなと、ちょっと'));
    await send('切替後の会話');assert.equal(requests.at(-1).body.messages.at(-1).content,'切替後の会話');
  });
  assert.deepEqual(errors,[]);
  assert.ok(posts.every(url=>url==='https://openrouter.ai/api/v1/chat/completions'));
  fs.writeFileSync(path.join(output,'demo-test-report.json'),JSON.stringify({passed:true,checkedAt:new Date().toISOString(),checks,residents:33,pageErrors:errors,limitations:['OpenRouter responses simulated; no paid model call.','Mobile viewport checks, not physical devices.']},null,2));
})().catch(async e=>{console.error(e);await p?.screenshot({path:path.join(output,'demo-failure.png')}).catch(()=>{});fs.writeFileSync(path.join(output,'demo-test-report.json'),JSON.stringify({passed:false,checks,error:e.stack,errors},null,2));process.exitCode=1;}).finally(async()=>{await browser?.close();server.closeAllConnections();server.close();});
