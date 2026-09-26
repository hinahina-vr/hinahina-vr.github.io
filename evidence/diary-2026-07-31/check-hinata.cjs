const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const definition=JSON.parse(fs.readFileSync('scenarios/2026-07-31_寝る前に片づける机.json','utf8'));
 const target=definition.scenario.find(s=>s.speaker==='hina').text;
 await page.goto('http://127.0.0.1:8188/galge-scenario.html?scenario='+encodeURIComponent('2026-07-31_寝る前に片づける机')+'&mode=classic&entry=door');
 await page.locator('#start-btn').click();await page.waitForTimeout(600);
 for(let i=0;i<90;i++){
  if((await page.locator('#name-plate').innerText()).trim()==='【ひな】')break;
  await page.keyboard.press('Space');await page.waitForTimeout(400);
 }
 if((await page.locator('#name-plate').innerText()).trim()!=='【ひな】')throw Error('Hinata not reached');
 if((await page.locator('#text-content').innerText())!==target){await page.keyboard.press('Space');await page.waitForTimeout(150);}
 if((await page.locator('#text-content').innerText())!==target)throw Error('Hinata dialogue mismatch');
 await page.screenshot({path:path.join(__dirname,'hinata-dream-desktop.png')});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);
 await page.screenshot({path:path.join(__dirname,'hinata-dream-mobile.png')});
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Overflow');
 await page.goto('http://127.0.0.1:8188/diary-voices-2026-07-31.html#diary-hina');
 const card=page.locator('#diary-hina');await card.scrollIntoViewIfNeeded();
 const text=await card.innerText();
 for(const rejected of ['画面の外へ出かける','その時間は、ねおぴっぴさんと','一緒にいた人の名前まで書いてある'])if(text.includes(rejected))throw Error('Old analytical narration remains');
 if(!text.includes('おやすみはひなの番')||!text.includes('おにいちゃんといるの、好きだもん。'))throw Error('Updated diary missing');
 if(/です|ます|でした|ました|ください/.test(text)||/です|ます|ください/.test(target))throw Error('Formal Hinata voice returned');
 await page.screenshot({path:path.join(__dirname,'hinata-diary-mobile.png')});
 fs.writeFileSync(path.join(__dirname,'hinata-browser-result.json'),JSON.stringify({dreamSpeaker:'ひな',dialogue:target,desktop:true,mobile:true,oldAnalyticalNarrationAbsent:true},null,2));
 console.log('Hinata diary and actual dream dialogue verified.');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
