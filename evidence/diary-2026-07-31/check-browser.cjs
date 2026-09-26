const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const base='http://127.0.0.1:8188/',date='2026-07-31';
const scenarioName='2026-07-31_寝る前に片づける机';
(async()=>{
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}});
const report={date,base};
await page.goto(base+'diary-voices-'+date+'.html',{waitUntil:'domcontentloaded'});
if(await page.locator('.voice-bundle-card').count()!==33)throw Error('Coverage');
if(!(await page.locator('.diary-writing-model').innerText()).includes('GPT-6 Astra（gpt-6-astra）'))throw Error('Model');
const routes=[];
for(const dir of fs.readdirSync('.').filter(n=>n.startsWith('diary-')&&fs.statSync(n).isDirectory())){
 const file=fs.readdirSync(dir).find(n=>n.startsWith(date+'_')&&n.endsWith('.md'));
 const raw=fs.readFileSync(path.join(dir,file),'utf8');
 const title=raw.match(/^# \d{4}-\d{2}-\d{2} (.+)/m)[1].trim();
 const card=page.locator('#'+dir);
 if((await card.locator('.voice-bundle-title').innerText()).trim()!==title)throw Error('Title '+dir);
 const body=await card.locator('.voice-bundle-body').innerText();
 for(const p of raw.split('<!-- daily-context:start -->')[0].split(/\r?\n/).filter(s=>s.trim()&&!/^(#|<!--|---)/.test(s)))if(!body.includes(p.trim()))throw Error('Body '+dir);
 routes.push({url:new URL(await card.locator('.voice-bundle-name').getAttribute('href'),base).href,title});
}
await page.screenshot({path:path.join(__dirname,'voices-desktop.png')});
await page.setViewportSize({width:390,height:844});
if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Voice overflow');
await page.screenshot({path:path.join(__dirname,'voices-mobile.png')});
await page.setViewportSize({width:1280,height:900});
for(const {url,title} of routes){const response=await page.goto(url,{waitUntil:'domcontentloaded'});if(response.status()!==200||(await page.locator('[id="'+date+'"] .entry-title').innerText()).trim()!==title)throw Error('Individual '+url);}
report.voices={count:33,allParagraphs:true,titles:true,individualPages:33,model:true,mobileOverflow:false};
await page.goto(base+'diary.html',{waitUntil:'domcontentloaded'});
const entry=page.locator('[id^="'+date+'_"]');
if(!(await entry.locator('.entry-title').innerText()).includes('AIに寝かしつけを頼んだら笑ってしまった'))throw Error('Main title');
const mainRaw=fs.readFileSync('diary/2026-07-31_AIに寝かしつけを頼んだら笑ってしまった.md','utf8');
const mainText=await entry.innerText();
for(const paragraph of mainRaw.split(/\r?\n/).filter(s=>s.trim()&&!s.startsWith('#')))if(!mainText.includes(paragraph.trim()))throw Error('Main paragraph mismatch: '+paragraph);
for(const rejected of ['その18分後','名前のついた部品','笑う用事が増えた','ずいぶん違う時間の使い方'])if(mainText.includes(rejected))throw Error('Rejected prose remains: '+rejected);
const cover=entry.locator('.entry-cover-image');await cover.scrollIntoViewIfNeeded();await cover.evaluate(i=>i.decode());
const dims=await cover.evaluate(i=>({width:i.naturalWidth,height:i.naturalHeight}));
if(dims.width!==1536||dims.height!==1024)throw Error('Cover size');
await cover.evaluate(i=>i.scrollIntoView({block:'center'}));await page.screenshot({path:path.join(__dirname,'cover-desktop.png')});
await page.setViewportSize({width:390,height:844});await cover.evaluate(i=>i.scrollIntoView({block:'center'}));
if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Main overflow');
await page.screenshot({path:path.join(__dirname,'cover-mobile.png')});
await page.setViewportSize({width:1280,height:900});
await entry.locator('a[href*="galge-scenario.html"]').click();await page.waitForURL('**/galge-scenario.html*');
await page.locator('#start-btn').waitFor();
await page.screenshot({path:path.join(__dirname,'dream-start.png')});
report.main={cover:dims,dreamLink:true,mobileOverflow:false};
if(process.argv.includes('--text-only')){
 report.main.allParagraphs=true;report.main.rejectedProseAbsent=true;
 await page.goto(base+'diary-voices-2026-05-05.html');if(await page.locator('.voice-bundle-card').count()!==33)throw Error('May regression');
 report.regression='May 5 voice bundle retains 33 cards';
 fs.writeFileSync(path.join(__dirname,'rewrite-browser-result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();return;
}
const definition=JSON.parse(fs.readFileSync('scenarios/'+scenarioName+'.json','utf8'));
const expected=Object.entries(definition.chars).filter(([id])=>id!=='narrator').map(([,v])=>v.name);
if(expected.length!==33)throw Error('Dream cast count');
const dreamURL=base+'galge-scenario.html?scenario='+encodeURIComponent(scenarioName)+'&mode=classic';
const seen=new Set();
for(const [choice,title] of [[0,'灯りを別に描く'],[1,'帳面を閉じてもここにいる']]){
 await page.goto(dreamURL,{waitUntil:'domcontentloaded'});
 await page.locator('#start-btn').click();await page.waitForTimeout(500);
 for(let i=0;i<200;i++){
  const name=(await page.locator('#name-plate').innerText()).trim();if(name)seen.add(name);
  if(await page.locator('#choice-container.visible .choice-btn').count())break;
  await page.keyboard.press('Space');await page.waitForTimeout(350);
 }
 if(await page.locator('#choice-container.visible .choice-btn').count()!==2)throw Error('Dream choice not reached');
 if(choice===0)await page.screenshot({path:path.join(__dirname,'dream-choices.png')});
 await page.locator('#choice-container .choice-btn').nth(choice).click();
 for(let i=0;i<24;i++){if(await page.locator('#end-screen.visible').count())break;await page.keyboard.press('Space');await page.waitForTimeout(350);}
 if(!(await page.locator('#end-subtitle').innerText()).includes(title)||!await page.locator('#end-screen.visible').count())throw Error('Ending '+title);
 await page.waitForTimeout(750);await page.screenshot({path:path.join(__dirname,'dream-ending-'+choice+'.png')});
}
for(const name of expected)if(![...seen].some(s=>s.includes(name)))throw Error('Speaker not displayed '+name+'; seen='+JSON.stringify([...seen]));
await page.setViewportSize({width:390,height:844});await page.goto(dreamURL,{waitUntil:'domcontentloaded'});await page.locator('#start-btn').click();await page.waitForTimeout(500);await page.keyboard.press('Space');await page.screenshot({path:path.join(__dirname,'dream-mobile.png')});
if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Dream mobile overflow');
report.dream={cast:33,seen:[...seen],endings:2,mobileOverflow:false};
await page.goto(base+'diary-voices-2026-05-05.html');if(await page.locator('.voice-bundle-card').count()!==33)throw Error('May regression');
report.regression='May 5 voice bundle retains 33 cards';
fs.writeFileSync(path.join(__dirname,'browser-result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
