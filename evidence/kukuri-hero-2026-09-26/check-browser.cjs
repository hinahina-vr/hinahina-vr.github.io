const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const base='http://127.0.0.1:8188/';
const old='勇者様なら宿屋へ戻りそうな22時40分、ワディーさんは';
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 await page.goto(base+'diary-kukuri.html');
 if(process.argv.includes('--before')){
   assert.ok((await page.locator('[id="2026-07-03"]').innerText()).includes(old));
   await page.locator('[id="2026-07-03"]').scrollIntoViewIfNeeded();
   await page.screenshot({path:path.join(__dirname,'before.png')});
   fs.writeFileSync(path.join(__dirname,'before.json'),JSON.stringify({symptom:old,reproduced:true,route:base+'diary-kukuri.html#2026-07-03'},null,2));
   return;
 }
 const report={base,entries:[],viewports:[]};
 const files=fs.readdirSync('diary-kukuri').filter(f=>f.endsWith('.md')).sort();
 for(const file of files){
   const raw=fs.readFileSync(path.join('diary-kukuri',file),'utf8');
   const prose=raw.split('<!-- daily-context:start -->')[0];
   const lines=prose.split(/\r?\n/).filter(l=>l.trim()&&!/^(#|<!--|---)/.test(l)).map(l=>l.replace(/\*\*/g,'').trim());
   const date=file.slice(0,10),entry=page.locator('[id="'+date+'"]');
   const text=await entry.innerText();
   assert.ok(!text.includes(old));
   for(const line of lines)assert.ok(text.includes(line),'Individual '+file+': '+line);
   report.entries.push({date,file,sourceSha256:crypto.createHash('sha256').update(raw).digest('hex'),individual:true,lines});
 }
 for(const entry of report.entries){
   const response=await page.goto(base+'diary-voices-'+entry.date+'.html',{waitUntil:'domcontentloaded'});
   assert.equal(response.status(),200);
   assert.equal(await page.locator('.voice-bundle-card').count(),33);
   const card=page.locator('#diary-kukuri'),text=await card.innerText();
   for(const line of entry.lines)assert.ok(text.includes(line),'Bundle '+entry.date+': '+line);
   const href=await card.locator('.voice-bundle-name').getAttribute('href');
   assert.ok(href.includes('diary-kukuri.html'));
   entry.bundle=true;entry.cards=33;delete entry.lines;
 }
 for(const width of [1280,390]){
   await page.setViewportSize({width,height:900});
   await page.goto(base+'diary-kukuri.html#2026-07-03');
   await page.locator('[id="2026-07-03"]').scrollIntoViewIfNeeded();
   assert.ok((await page.locator('[id="2026-07-03"]').innerText()).includes('勇者様は町田の蒙古タンメン中本へ'));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   await page.screenshot({path:path.join(__dirname,'diary-'+width+'.png')});
   await page.goto(base+'diary-voices-2026-07-31.html#diary-kukuri');
   await page.locator('#diary-kukuri').scrollIntoViewIfNeeded();
   await page.screenshot({path:path.join(__dirname,'bundle-'+width+'.png')});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   await page.locator('#diary-kukuri .voice-bundle-name').click();
   assert.ok(page.url().includes('diary-kukuri.html'));
   report.viewports.push({width,noOverflow:true,diaryLinkClicked:true});
 }
 fs.writeFileSync(path.join(__dirname,'browser-result.json'),JSON.stringify(report,null,2));
 console.log('Verified '+report.entries.length+' individual entries and daily bundles, plus desktop/mobile navigation.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
