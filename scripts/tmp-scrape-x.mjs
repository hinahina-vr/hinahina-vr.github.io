import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();

  // Find ALL X pages
  const xPages = [];
  for (const ctx of contexts) {
    for (const page of ctx.pages()) {
      const url = page.url();
      if (url.includes('x.com/hinahina_vr')) {
        xPages.push(page);
      }
    }
  }

  console.log(`Found ${xPages.length} X pages`);

  for (let pi = 0; pi < xPages.length; pi++) {
    const xPage = xPages[pi];
    console.log(`\n====== Page ${pi+1}: ${xPage.url()} ======`);

    // Scroll to top
    await xPage.evaluate(() => window.scrollTo(0, 0));
    await xPage.waitForTimeout(2000);

    // Slowly scroll down, collecting posts
    const allPosts = [];
    for (let i = 0; i < 3; i++) {
      const posts = await xPage.evaluate(() => {
        const articles = document.querySelectorAll('article[data-testid="tweet"]');
        const results = [];
        for (const article of articles) {
          const textEl = article.querySelector('[data-testid="tweetText"]');
          const timeEl = article.querySelector('time');
          const text = textEl ? textEl.innerText : '(no text)';
          const time = timeEl ? timeEl.getAttribute('datetime') : '';
          results.push({ text: text.substring(0, 200), time });
        }
        return results;
      });
      
      for (const p of posts) {
        if (!allPosts.some(x => x.time === p.time && x.text === p.text)) {
          allPosts.push(p);
        }
      }

      await xPage.mouse.wheel(0, 800);
      await xPage.waitForTimeout(1500);
    }

    allPosts.sort((a, b) => (b.time || '').localeCompare(a.time || ''));

    for (const p of allPosts) {
      console.log(`[${p.time}] ${p.text}`);
    }
    console.log(`--- ${allPosts.length} unique posts on this page ---`);
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
