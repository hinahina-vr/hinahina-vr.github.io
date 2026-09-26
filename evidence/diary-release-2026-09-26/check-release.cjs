const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const base=process.argv[2]||'http://127.0.0.1:8188/';
const live=base.startsWith('https:');
const dates=fs.readFileSync(path.join(__dirname,'changed-dates.txt'),'utf8').trim().split(/\r?\n/);
const dirs=fs.readdirSync('.').filter(n=>n.startsWith('diary-')&&fs.statSync(n).isDirectory());
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const results=[],routes=new Map();
 for(const date of dates){
  const response=await page.goto(new URL('diary-voices-'+date+'.html',base).href,{waitUntil:'domcontentloaded'});
  if(response.status()!==200)throw Error('Bundle HTTP '+date);
  if(await page.locator('.voice-bundle-card').count()!==33)throw Error('33 voices '+date);
  const label=await page.locator('.diary-writing-model').innerText();
  if(['2026-05-05','2026-05-06'].includes(date)?!label.includes('GPT-6 Astra（gpt-6-astra）'):!label.includes('未記録'))throw Error('Model '+date);
  for(const dir of dirs){
   const file=fs.readdirSync(dir).find(n=>n.startsWith(date+'_')&&n.endsWith('.md'));
   if(!file)throw Error('Missing source '+dir+' '+date);
   const raw=fs.readFileSync(path.join(dir,file),'utf8');
   const title=raw.match(/^# \d{4}-\d{2}-\d{2} (.+)/m)[1].trim();
   const card=page.locator('#'+dir);
   if((await card.locator('.voice-bundle-title').innerText()).trim()!==title)throw Error('Bundle title '+dir+' '+date);
   const body=await card.locator('.voice-bundle-body').innerText();
   const prose=raw.split('<!-- daily-context:start -->')[0].split(/\r?\n/).filter(s=>s.trim()&&!/^(#|<!--|---)/.test(s));
   for(const p of prose)if(!body.includes(p.trim()))throw Error('Body '+dir+' '+date);
   const href=await card.locator('.voice-bundle-name').getAttribute('href');
   const url=new URL(href,base);url.hash='';
   if(!routes.has(url.href))routes.set(url.href,[]);
   routes.get(url.href).push({date,title});
  }
  if(['2026-05-05','2026-05-06'].includes(date)){
   await page.screenshot({path:path.join(__dirname,(live?'live-':'local-')+date+'-voices.png')});
   await page.setViewportSize({width:390,height:844});
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Mobile bundle overflow');
   await page.screenshot({path:path.join(__dirname,(live?'live-':'local-')+date+'-voices-mobile.png')});
   await page.setViewportSize({width:1280,height:900});
  }
  results.push({date,voices:33,titles:true,paragraphs:true,model:true});
 }
 let individualTitles=0;
 for(const [url,entries] of routes){
  const response=await page.goto(url,{waitUntil:'domcontentloaded'});
  if(response.status()!==200)throw Error('Character HTTP '+url);
  for(const {date,title} of entries){
   if((await page.locator('[id="'+date+'"] .entry-title').innerText()).trim()!==title)throw Error('Character title '+url+' '+date);
   individualTitles++;
  }
 }
 const covers=[];
 for(const date of ['2026-05-05','2026-05-06']){
  await page.goto(new URL('diary-2026-05.html',base).href,{waitUntil:'domcontentloaded'});
  const entry=page.locator('[id^="'+date+'_"]');
  const cover=entry.locator('.entry-cover-image');
  await cover.scrollIntoViewIfNeeded();await cover.evaluate(i=>i.decode());
  const dimensions=await cover.evaluate(i=>({width:i.naturalWidth,height:i.naturalHeight}));
  if(dimensions.width!==1536||dimensions.height!==1024)throw Error('Cover size');
  const src=new URL(await cover.getAttribute('src'),base);
  const served=await(await page.request.get(src.href)).body();
  const local=fs.readFileSync(decodeURIComponent(src.pathname.replace(/^\//,'')));
  if(sha(served)!==sha(local))throw Error('Cover bytes '+date);
  await cover.evaluate(i=>i.scrollIntoView({block:'center'}));
  await page.screenshot({path:path.join(__dirname,(live?'live-':'local-')+date+'-cover.png')});
  await page.setViewportSize({width:390,height:844});await cover.evaluate(i=>i.scrollIntoView({block:'center'}));
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Mobile cover overflow');
  await page.screenshot({path:path.join(__dirname,(live?'live-':'local-')+date+'-cover-mobile.png')});
  await page.setViewportSize({width:1280,height:900});
  await entry.locator('a[href="./diary-voices-'+date+'.html"]').first().click();
  await page.waitForURL('**/diary-voices-'+date+'.html');
  covers.push({date,...dimensions,sha256:sha(served),navigation:true});
 }
 for(const file of ['index.html','diary.html','diary-2026-01.html','diary-voices-2026-07-28.html']){
  const response=await page.goto(new URL(file,base).href,{waitUntil:'domcontentloaded'});
  if(response.status()!==200||!(await page.locator('h1').innerText()).trim())throw Error('Smoke '+file);
 }
 const report={base,results,individualTitles,characterPages:routes.size,covers,smoke:true};
 fs.writeFileSync(path.join(__dirname,(live?'live':'local')+'-browser.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({base,dates:results.length,individualTitles,characterPages:routes.size,covers,smoke:true}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
