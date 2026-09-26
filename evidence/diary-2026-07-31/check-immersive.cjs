const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),crypto=require('crypto');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const scenario='2026-07-31_寝る前に片づける机';
 const url='http://127.0.0.1:8188/galge-scenario.html?scenario='+encodeURIComponent(scenario)+'&mode=immersive';
 await page.goto(url);await page.locator('#start-btn').click();await page.waitForTimeout(600);
 for(let i=0;i<30&&!(await page.locator('#name-plate').innerText()).trim();i++){await page.keyboard.press('Space');await page.waitForTimeout(500);}
 if(!(await page.locator('#name-plate').innerText()).trim())throw Error('No immersive speaker');
 await page.screenshot({path:path.join(__dirname,'dream-dialogue-desktop.png')});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);
 await page.screenshot({path:path.join(__dirname,'dream-dialogue-mobile.png')});
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Overflow');
 await page.setViewportSize({width:1280,height:900});
 await page.goto(url+'&entry=END_SAVE');await page.locator('#start-btn').click();await page.waitForTimeout(600);
 for(let i=0;i<15&&!await page.locator('#end-screen.visible').count();i++){await page.keyboard.press('Space');await page.waitForTimeout(400);}
 await page.locator('#end-screen.visible').waitFor();await page.waitForTimeout(1000);
 await page.screenshot({path:path.join(__dirname,'dream-ending-settled.png')});
 const assets=['assets/diary-covers/2026-07-31_AIに寝かしつけを頼んだら笑ってしまった.png','scenarios/bg/'+scenario+'/paper_desk.png'];
 const hashes={};
 for(const asset of assets){const response=await page.request.get('http://127.0.0.1:8188/'+asset);const bytes=await response.body();if(!response.ok()||!bytes.equals(fs.readFileSync(asset)))throw Error('Asset mismatch');hashes[asset]=crypto.createHash('sha256').update(bytes).digest('hex');}
 const report={immersiveDesktop:true,immersiveMobile:true,assetByteEquality:true,hashes};
 fs.writeFileSync(path.join(__dirname,'immersive-result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
