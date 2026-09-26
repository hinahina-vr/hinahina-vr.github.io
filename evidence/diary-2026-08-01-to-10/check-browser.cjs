const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const base=process.env.DIARY_TEST_BASE || 'http://127.0.0.1:8188/';
const dates=['01','02','03','04','05','07','09','10'].map(d=>'2026-08-'+d);
const out=process.env.DIARY_TEST_OUTPUT || __dirname;
fs.mkdirSync(out,{recursive:true});
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const find=(dir,date,ext)=>fs.readdirSync(dir).find(f=>f.startsWith(date+'_')&&f.endsWith(ext));
const paragraphs=raw=>raw.split('<!-- daily-context:start -->')[0].split(/\r?\n/).filter(s=>s.trim()&&!/^(#|<!--|---)/.test(s)).map(s=>s.trim());
async function noOverflow(page){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'horizontal overflow '+page.url());}
async function assets(page,files){const hashes={};for(const file of files){const r=await page.request.get(base+file);assert(r.ok(),file);const bytes=await r.body();assert(bytes.equals(fs.readFileSync(file)),file);hashes[file]=hash(bytes);}return hashes;}
async function prose(browser,date){
 const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();
 const report={date};
 await page.goto(base+'diary-voices-'+date+'.html');
 assert.equal(await page.locator('.voice-bundle-card').count(),33);
 assert((await page.locator('.diary-writing-model').innerText()).includes('GPT-6 Astra（gpt-6-astra）'));
 const routes=[];
 for(const dir of fs.readdirSync('.').filter(n=>n.startsWith('diary-')&&fs.statSync(n).isDirectory())){
  const file=find(dir,date,'.md');assert(file,dir+' missing '+date);
  const raw=fs.readFileSync(dir+'/'+file,'utf8'),title=raw.match(/^# \S+ (.+)/m)[1].trim();
  const card=page.locator('#'+dir);assert.equal((await card.locator('.voice-bundle-title').innerText()).trim(),title);
  const body=await card.locator('.voice-bundle-body').innerText();
  for(const p of paragraphs(raw))assert(body.includes(p),'bundle body '+dir+' '+date);
  routes.push({url:new URL(await card.locator('.voice-bundle-name').getAttribute('href'),base).href,title,body:paragraphs(raw)});
 }
 await noOverflow(page);await page.screenshot({path:path.join(out,date+'-voices-desktop.png')});
 await page.setViewportSize({width:390,height:844});await noOverflow(page);
 await page.locator('#diary-hina').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,date+'-hina-mobile.png')});
 for(const route of routes){
  const r=await page.goto(route.url);assert(r.ok());const entry=page.locator('[id="'+date+'"]');
  assert.equal((await entry.locator('.entry-title').innerText()).trim(),route.title);
  const body=await entry.innerText();for(const p of route.body)assert(body.includes(p),'individual body '+route.url);
  await noOverflow(page);
 }
 report.voices={cards:33,allParagraphs:true,individualPages:33,model:true,mobileOverflow:false};
 await page.setViewportSize({width:1280,height:900});await page.goto(base+'diary.html');
 const file=find('diary',date,'.md'),raw=fs.readFileSync('diary/'+file,'utf8');
 const entry=page.locator('[id^="'+date+'_"]'),text=await entry.innerText();
 for(const p of paragraphs(raw))assert(text.includes(p),'main paragraph '+date);
 const cover=entry.locator('.entry-cover-image');await cover.scrollIntoViewIfNeeded();await cover.evaluate(i=>i.decode());
 assert.deepEqual(await cover.evaluate(i=>[i.naturalWidth,i.naturalHeight]),[1536,1024]);
 await cover.evaluate(i=>i.scrollIntoView({block:'center'}));await page.screenshot({path:path.join(out,date+'-cover-desktop.png')});
 await page.setViewportSize({width:390,height:844});await cover.evaluate(i=>i.scrollIntoView({block:'center'}));await noOverflow(page);
 await page.screenshot({path:path.join(out,date+'-cover-mobile.png')});
 const stem=find('scenarios',date,'.json').slice(0,-5);
 report.assetHashes=await assets(page,['assets/diary-covers/'+file.slice(0,-3)+'.png','scenarios/bg/'+stem+'/scene.png']);
 await entry.locator('a[href*="galge-scenario.html"]').click();await page.waitForURL('**/galge-scenario.html*');
 assert.equal(new URL(page.url()).searchParams.get('scenario'),stem);await page.locator('#start-btn').waitFor();
 report.main={allParagraphs:true,cover:true,dreamLink:true,mobileOverflow:false};
 await context.close();console.log('PROSE '+date);return report;
}
async function dream(browser,date){
 const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();
 const stem=find('scenarios',date,'.json').slice(0,-5),story=JSON.parse(fs.readFileSync('scenarios/'+stem+'.json','utf8'));
 const expected=Object.entries(story.chars).filter(([id])=>id!=='narrator').map(([,v])=>v.name);
 const url=base+'galge-scenario.html?scenario='+encodeURIComponent(stem),seen=new Set(),endings=[];
 assert.equal(expected.length,33);
 for(let choice=0;choice<2;choice++){
  await page.goto(url+'&mode=classic');await page.locator('#start-btn').click();await page.waitForTimeout(500);
  for(let step=0;step<200;step++){
   const name=(await page.locator('#name-plate').innerText()).trim();if(name)seen.add(name);
   if(await page.locator('#choice-container.visible .choice-btn').count())break;
   await page.keyboard.press('Space');await page.waitForTimeout(350);
  }
  assert.equal(await page.locator('#choice-container.visible .choice-btn').count(),2,'choices '+date);
  if(choice===0)await page.screenshot({path:path.join(out,date+'-dream-choices.png')});
  await page.locator('#choice-container.visible .choice-btn').nth(choice).click();
  for(let step=0;step<24;step++){if(await page.locator('#end-screen.visible').count())break;await page.keyboard.press('Space');await page.waitForTimeout(350);}
  await page.locator('#end-screen.visible').waitFor();
  const expectedEnding=story.mapTitles[choice===0?'END_A':'END_B'];
  assert((await page.locator('#end-subtitle').innerText()).includes(expectedEnding),'ending '+date);
  endings.push(expectedEnding);await page.waitForTimeout(800);await page.screenshot({path:path.join(out,date+'-ending-'+choice+'.png')});
 }
 for(const name of expected)assert([...seen].some(s=>s.includes(name)),'missing speaker '+date+' '+name);
 await page.goto(url);await page.locator('#start-btn').click();await page.waitForTimeout(600);
 for(let step=0;step<20&&!(await page.locator('#name-plate').innerText()).trim();step++){await page.keyboard.press('Space');await page.waitForTimeout(500);}
 assert((await page.locator('#name-plate').innerText()).trim(),'immersive speaker');
 await page.keyboard.press('Space');await page.waitForTimeout(200);
 await noOverflow(page);await page.screenshot({path:path.join(out,date+'-dream-desktop.png')});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);await noOverflow(page);
 await page.screenshot({path:path.join(out,date+'-dream-mobile.png')});
 await context.close();console.log('DREAM '+date+' '+endings.join(' / '));
 return {date,cast:33,seen:[...seen],endings,classicBothBranches:true,immersiveDesktop:true,immersiveMobile:true};
}
async function pool(items,fn,n=4){const results=[];let cursor=0;await Promise.all(Array.from({length:n},async()=>{while(cursor<items.length){const index=cursor++;results[index]=await fn(items[index]);}}));return results;}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const report={testedAt:new Date().toISOString(),base,dates};
  report.prose=await pool(dates,d=>prose(browser,d));
  fs.writeFileSync(path.join(out,'prose-browser-result.json'),JSON.stringify(report,null,2));
  report.dreams=await pool(dates,d=>dream(browser,d));
  const page=await browser.newPage();
  for(const date of ['2026-05-05','2026-07-31']){await page.goto(base+'diary-voices-'+date+'.html');assert.equal(await page.locator('.voice-bundle-card').count(),33);}
  await page.goto(base+'diary.html');assert.equal(await page.locator('[id^="2026-08-"] .entry-title').count(),8);
  for(const excluded of ['2026-08-06','2026-08-08'])assert.equal(await page.locator('[id^="'+excluded+'_"]').count(),0);
  report.regression={may5:true,july31:true,eligibleDaysOnly:true};
  fs.writeFileSync(path.join(out,'browser-result.json'),JSON.stringify(report,null,2));console.log('BROWSER_ALL_PASSED');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
