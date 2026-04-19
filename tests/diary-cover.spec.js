// @ts-check
const { test, expect } = require('playwright/test');

test.describe('日記の扉絵', () => {
  test('今週分の公開済み日記に扉絵が表示される', async ({ page }) => {
    await page.goto('http://127.0.0.1:8080/diary.html');

    const targetIds = [
      '2026-04-18_三千万と破滅のあいだ',
      '2026-04-17_科目名にまだ朝を足していく',
      '2026-04-16_シラフのまま3.3Vに降りる',
      '2026-04-15_入門書が死んでも温まるまで待つ',
      '2026-04-14_画面越しでも場は動く',
      '2026-04-13_爆発の手前で配線を信じる',
    ];

    for (const id of targetIds) {
      const cover = page.locator(`[id="${id}"] .entry-cover-image`);
      await expect(cover).toBeVisible();
      await expect(cover).toHaveAttribute('src', /assets\/diary-covers\/.+\.png$/);
    }
  });
});
