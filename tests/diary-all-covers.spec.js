// @ts-check
const { test, expect } = require('playwright/test');

const pages = [
  'http://127.0.0.1:8080/diary.html',
  'http://127.0.0.1:8080/diary-2026-03.html',
  'http://127.0.0.1:8080/diary-2026-02.html',
];

test.describe('全日記の扉絵', () => {
  for (const url of pages) {
    test(`${url} の各エントリに扉絵がある`, async ({ page }) => {
      await page.goto(url);

      const entries = page.locator('li[id]');
      const count = await entries.count();
      expect(count).toBeGreaterThan(0);

      for (let i = 0; i < count; i += 1) {
        const cover = entries.nth(i).locator('.entry-cover-image');
        await expect(cover).toBeVisible();
        await expect(cover).toHaveAttribute('src', /assets\/diary-covers\/.+\.png$/);
      }
    });
  }
});
