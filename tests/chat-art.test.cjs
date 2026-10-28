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
const mime = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp':'image/webp' };
const server = createServer((req, res) => {
  let file;
  try { file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname)); } catch { res.writeHead(400); res.end(); return; }
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(file).pipe(res);
});

let browser;
const checks=[],errors=[],portraits=[];
const catalog=JSON.parse(fs.readFileSync(path.join(root,'assets/chat/catalog.json'),'utf8'));
async function check(name,fn){await fn();checks.push({name,passed:true});console.log('PASS',name);}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:960}});
 const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
 const requests=new Set();p.on('request',r=>{if(r.url().includes('/chat/characters/'))requests.add(new URL(r.url()).pathname);});
 await p.goto(origin+'/chat.html?persona=hina&mode=immersive');
 await p.waitForFunction(()=>document.body.dataset.soulArt==='ready'&&Number(document.querySelector('#soul-canvas').dataset.frames)>2);
 await check('丸い精霊を人格別の立ち絵へ置き換え、初期背景に大奥の寝室を表示する',async()=>{
  assert.equal(await p.evaluate(()=>document.body.dataset.soulScene),'bedroom');
  assert.ok(await p.locator('#soul-room').isVisible());
  assert.equal(await p.evaluate(()=>document.body.dataset.soulCharacter),'hina');
  assert.equal(requests.size,1);
  const presence=await p.locator('.soul-presence').boundingBox(),portrait=await p.locator('#soul-character').boundingBox();assert.ok(presence.y+presence.height<=portrait.y,'Status label must not cover hair or head ornaments: '+JSON.stringify({presence,portrait}));
  await p.screenshot({path:path.join(output,'character-desktop.png')});
 });
 await check('背景の変更と再読み込み後の復元が会話や着せ替えを変更しない',async()=>{
  await p.locator('#message').fill('書きかけ');
  await p.locator('#open-settings').click();await p.locator('#settings-tab-visuals').click();await p.locator('#soul-scene').selectOption('light');await p.locator('#back-to-conversation').click();
  assert.equal(await p.locator('#message').inputValue(),'書きかけ');assert.equal(await p.evaluate(()=>document.body.dataset.soulCharacter),'hina');assert.equal(await p.evaluate(()=>document.body.dataset.soulTheme),'sakura');
  await p.reload();await p.waitForFunction(()=>document.body.dataset.soulArt==='ready');
  assert.equal(await p.evaluate(()=>document.body.dataset.soulScene),'light');
  await p.locator('#open-settings').click();await p.locator('#settings-tab-visuals').click();await p.locator('#soul-scene').selectOption('bedroom');await p.locator('#back-to-conversation').click();
 });
 await check('33人を実際に選択し、それぞれ別の立ち絵を読み込んで表示する',async()=>{
  fs.mkdirSync(path.join(output,'residents'),{recursive:true});
  const hashes=new Set();
  for(const {id,name} of catalog){
   await p.locator('#open-residents').click();await p.locator('#persona-select').selectOption(id);
   await p.waitForFunction(id=>document.body.dataset.soulCharacter===id&&document.body.dataset.soulArt==='ready',id);
   await p.locator('#drawer-close').click();await p.waitForFunction(()=>!document.querySelector('#chat-drawer').open);
   assert.ok((await p.locator('#conversation-title').innerText()).includes(name),id);
   const info=await p.locator('#soul-character').evaluate(i=>({src:i.currentSrc,width:i.naturalWidth,height:i.naturalHeight,loaded:i.complete}));
   assert.ok(info.loaded&&info.width>300&&info.height>500,id);
   assert.ok(await p.locator('#soul-character').isVisible(),id);
   const file='assets/chat/characters/'+id+'.webp',hash=require('crypto').createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');hashes.add(hash);
   await p.screenshot({path:path.join(output,'residents',id+'.png')});portraits.push({id,name,...info,sha256:hash});
  }
  assert.equal(hashes.size,33);
  await p.locator('#open-residents').click();await p.locator('#persona-select').selectOption('hina');await p.waitForFunction(()=>document.body.dataset.soulCharacter==='hina'&&document.body.dataset.soulArt==='ready');await p.locator('#drawer-close').click();
 });
 await check('スマホで人格名とボタンが重ならず、立ち絵も画面内に収まる',async()=>{
  await p.setViewportSize({width:390,height:844});await p.waitForFunction(()=>Math.abs(document.querySelector('main').getBoundingClientRect().height-innerHeight)<1);
  const title=await p.locator('.conversation-header').boundingBox(),button=await p.locator('#open-history').boundingBox();assert.ok(title.x+title.width<=button.x,title.x+title.width+' > '+button.x);
  for(const s of ['#soul-character','#message']){const b=await p.locator(s).boundingBox();assert.ok(b&&b.x>=0&&b.y>=0&&b.x+b.width<=391&&b.y+b.height<=845,s);}
  await p.screenshot({path:path.join(output,'character-mobile.png')});
  await p.setViewportSize({width:390,height:480});await p.waitForFunction(()=>Math.abs(document.querySelector('main').getBoundingClientRect().height-innerHeight)<1);await p.screenshot({path:path.join(output,'character-short.png')});
 });
 await check('画像の読み込みに失敗した時に別人格の古い絵を表示しない',async()=>{
  await p.route('**/chat/characters/mitra.webp*',r=>r.abort());
  await p.locator('#change-resident').click();await p.locator('#persona-select').selectOption('mitra');await p.waitForFunction(()=>document.body.dataset.soulArt==='unavailable');await p.locator('#drawer-close').click();
  assert.equal(await p.locator('#soul-character').isVisible(),false);await p.locator('#message').fill('画像がなくても書ける');
 });
 await check('WebGLなしでも立ち絵と寝室を表示し、OSの動きを減らす設定を守る',async()=>{
  const fallback=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return t.startsWith('webgl')?null:original.call(this,t,...a);};});
  const f=await fallback.newPage();f.on('pageerror',e=>errors.push(e.message));await f.goto(origin+'/chat.html?persona=hina&mode=immersive');await f.waitForFunction(()=>document.body.dataset.soulArt==='ready'&&document.body.dataset.soulRenderer==='fallback');
  assert.ok(await f.locator('#soul-character').isVisible());assert.ok(await f.locator('#soul-room').isVisible());assert.equal(await f.locator('#soul-character').evaluate(i=>getComputedStyle(i).animationName),'none');
  await f.screenshot({path:path.join(output,'character-fallback.png')});await fallback.close();
 });
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(output,'character-test-report.json'),JSON.stringify({passed:true,checkedAt:new Date().toISOString(),checks,portraits,pageErrors:errors,limitations:['No paid-model response tested.','Mobile viewport and synthetic input, not a physical phone.']},null,2));
})().catch(e=>{console.error(e);fs.writeFileSync(path.join(output,'character-test-report.json'),JSON.stringify({passed:false,checks,portraits,pageErrors:errors,error:e.message},null,2));process.exitCode=1;}).finally(async()=>{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));});
