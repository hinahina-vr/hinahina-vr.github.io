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


let browser;const checks=[],records=[],errors=[];
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const variants=[{name:'wide-default',width:3813,height:1774,dpr:1,forced:false},{name:'wide-premultiplied',width:3813,height:1774,dpr:1,forced:true},{name:'retina',width:1906,height:887,dpr:2,forced:false},{name:'mobile',width:390,height:844,dpr:1,forced:false}];
 for(const v of variants){
  const c=await browser.newContext({viewport:{width:v.width,height:v.height},deviceScaleFactor:v.dpr,reducedMotion:'reduce'});
  await c.addInitScript(forced=>{localStorage.setItem('waddy-chat-visual-v1',JSON.stringify({mode:'immersive',theme:'sakura',intensity:100,reduced:true,scene:'bedroom'}));const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,options,...rest){if(type==='webgl'){options={...options,preserveDrawingBuffer:true};if(forced)options.premultipliedAlpha=true;}return original.call(this,type,options,...rest);};},v.forced);
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(origin+'/chat.html?persona=dejiko&mode=immersive');await p.waitForFunction(()=>document.body.dataset.soulArt==='ready'&&Number(document.querySelector('#soul-canvas').dataset.frames)>0);
  const r=await p.evaluate(()=>{const gl=document.querySelector('#soul-canvas').getContext('webgl'),samples=[];for(const [x,y] of [[5,5],[50,50],[100,100],[gl.drawingBufferWidth-10,gl.drawingBufferHeight-10]]){const b=new Uint8Array(4);gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,b);samples.push([...b]);}return {premultipliedAlpha:gl.getContextAttributes().premultipliedAlpha,samples,scene:document.body.dataset.soulScene};});
  assert.equal(r.scene,'bedroom');assert.ok(await p.locator('#soul-room').isVisible());
  for(const rgba of r.samples){assert.ok(rgba[3]<64,'Bedroom must remain visible through the light layer: '+JSON.stringify(rgba));if(r.premultipliedAlpha)for(const rgb of rgba.slice(0,3))assert.ok(rgb<=rgba[3]+2,'Invalid premultiplied color causes white clipping: '+JSON.stringify(rgba));}
  await p.screenshot({path:path.join(output,'bedroom-'+v.name+'.png')});checks.push({name:v.name+': 寝室を白く覆わずに光を合成する',passed:true});records.push({...v,...r});console.log('PASS',v.name);await c.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'bedroom-test-report.json'),JSON.stringify({passed:true,checks,records,pageErrors:errors,limitations:['Premultiplied-context override is fault injection, not a measurement of the user GPU.','Retina and mobile are desktop Chrome device simulations.']},null,2));
})().catch(e=>{console.error(e);fs.writeFileSync(path.join(output,'bedroom-test-report.json'),JSON.stringify({passed:false,checks,records,pageErrors:errors,error:e.message},null,2));process.exitCode=1;}).finally(async()=>{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));});
