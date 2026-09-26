const {chromium}=require('playwright');
const fs=require('fs');
const path=require('path');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));
 const results=[];
 for(const date of manifest.dates){
  await page.goto('http://127.0.0.1:8187/diary-voices-'+date+'.html',{waitUntil:'networkidle'});
  if(await page.locator('.voice-bundle-card').count()!==33) throw Error('Coverage '+date);
  const model=await page.locator('.diary-writing-model').innerText();
  if(['2026-05-05','2026-05-06'].includes(date) ? !model.includes('GPT-6 Astra（gpt-6-astra）') : !model.includes('未記録')) throw Error('Model attribution '+date);
  for(const t of manifest.titles.filter(t=>t.date===date&&t.dir!=='diary')){
   const card=page.locator('#'+t.dir);
   if((await card.locator('.voice-bundle-title').innerText()).trim()!==t.title) throw Error('Title '+t.dir);
   const raw=fs.readFileSync(t.dir+'/'+fs.readdirSync(t.dir).find(n=>n.startsWith(date+'_')),'utf8');
   const paragraphs=raw.split('\n').map(s=>s.trim()).filter(s=>s&&!s.startsWith('#')&&!s.startsWith('<!--')&&!s.startsWith('-'));
   const body=await card.locator('.voice-bundle-body').innerText();
   for(const p of paragraphs) if(!body.includes(p)) throw Error('Body '+t.dir);
   const href=await card.locator('.voice-bundle-name').getAttribute('href');
   if((await page.request.get(new URL(href,page.url()).href)).status()!==200) throw Error('Link '+href);
   const individual=await browser.newPage();
   await individual.goto(new URL(href,page.url()).href,{waitUntil:'domcontentloaded'});
   if((await individual.locator('[id="'+date+'"] .entry-title').innerText()).trim()!==t.title) throw Error('Individual title '+t.dir+' '+date);
   await individual.close();
  }
  await page.screenshot({path:path.join(__dirname,date+'-desktop.png')});
  await page.setViewportSize({width:390,height:844});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)) throw Error('Mobile overflow '+date);
  await page.screenshot({path:path.join(__dirname,date+'-mobile.png')});
  await page.setViewportSize({width:1280,height:900});
  results.push({date,cards:33,titles:'pass',allParagraphs:'pass',characterLinks:'33 HTTP 200',mobileOverflow:false});
 }
 await page.goto('http://127.0.0.1:8187/diary-voices-2026-05-04.html');
 await page.locator('#diary-ana .voice-bundle-name').click();
 await page.waitForLoadState('domcontentloaded');
 if(!(await page.locator('[id="2026-05-04"]').innerText()).includes('英語に直して')) throw Error('Character navigation failed');
 const covers=[];
 for(const date of ['2026-05-05','2026-05-06']) {
  await page.goto('http://127.0.0.1:8187/diary.html#'+date,{waitUntil:'networkidle'});
  const cover=page.locator('[id^="'+date+'_"] .entry-cover-image');
  await cover.scrollIntoViewIfNeeded();
  await cover.evaluate(img=>img.decode());
  const dimensions=await cover.evaluate(img=>({width:img.naturalWidth,height:img.naturalHeight}));
  if(dimensions.width!==1536||dimensions.height!==1024) throw Error('Cover dimensions '+date);
  const bytes=await (await page.request.get(new URL(await cover.getAttribute('src'),page.url()).href)).body();
  const name=fs.readdirSync('assets/diary-covers').find(n=>n.startsWith(date+'_'));
  if(!bytes.equals(fs.readFileSync(path.join('assets/diary-covers',name)))) throw Error('Stale cover '+date);
  await page.screenshot({path:path.join(__dirname,date+'-cover-desktop.png')});
  await page.setViewportSize({width:390,height:844});
  await cover.scrollIntoViewIfNeeded();
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)) throw Error('Cover overflow '+date);
  await page.screenshot({path:path.join(__dirname,date+'-cover-mobile.png')});
  await page.setViewportSize({width:1280,height:900});
  covers.push({date,...dimensions,servedBytesMatch:true,mobileOverflow:false});
 }
 fs.writeFileSync(path.join(__dirname,'browser-check.json'),JSON.stringify({head:manifest.head,results,covers,navigation:'Ana link click and revised paragraph passed; all 132 individual titles checked',scope:'Local four-date build using repository builders without HTML title postprocessing; not a full production build or deployment'},null,2));
 console.log(JSON.stringify(results));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
