// @ts-check
const { test, expect } = require('playwright/test');

test.describe('日記ページの行間・段落間隔', () => {
  test('diary.html の段落に適切な line-height と margin が適用されている', async ({ page }) => {
    await page.goto('http://127.0.0.1:8080/diary.html');

    const firstParagraph = page.locator('.entry-list li p').first();
    await expect(firstParagraph).toBeVisible();

    const styles = await firstParagraph.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return {
        lineHeight: cs.lineHeight,
        marginBottom: cs.marginBottom,
        fontSize: cs.fontSize,
      };
    });

    // line-height should be around 2.1 * fontSize
    const fontSize = parseFloat(styles.fontSize);
    const lineHeight = parseFloat(styles.lineHeight);
    const ratio = lineHeight / fontSize;
    expect(ratio).toBeGreaterThanOrEqual(1.8);

    // margin-bottom should be > 0 for non-last paragraphs
    const marginBottom = parseFloat(styles.marginBottom);
    expect(marginBottom).toBeGreaterThan(0);
  });

  test('diary-hina.html の段落にも適切な行間が適用されている', async ({ page }) => {
    await page.goto('http://127.0.0.1:8080/diary-hina.html');

    const firstParagraph = page.locator('.entry-list li p').first();
    await expect(firstParagraph).toBeVisible();

    const styles = await firstParagraph.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return {
        lineHeight: cs.lineHeight,
        marginBottom: cs.marginBottom,
        fontSize: cs.fontSize,
      };
    });

    const fontSize = parseFloat(styles.fontSize);
    const lineHeight = parseFloat(styles.lineHeight);
    const ratio = lineHeight / fontSize;
    expect(ratio).toBeGreaterThanOrEqual(1.8);

    const marginBottom = parseFloat(styles.marginBottom);
    expect(marginBottom).toBeGreaterThan(0);
  });

  test('diary.html の段落間に視覚的な隙間がある', async ({ page }) => {
    await page.goto('http://127.0.0.1:8080/diary.html');

    // Get the first entry's paragraphs (skip entry-date paragraph)
    const firstEntry = page.locator('.entry-list li').first();
    const paragraphs = firstEntry.locator('p:not(.entry-date)');
    const count = await paragraphs.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // Check that consecutive paragraphs have vertical space between them
    const firstBox = await paragraphs.nth(0).boundingBox();
    const secondBox = await paragraphs.nth(1).boundingBox();

    expect(firstBox).not.toBeNull();
    expect(secondBox).not.toBeNull();

    if (firstBox && secondBox) {
      // The gap between paragraphs should be > 5px
      const gap = secondBox.y - (firstBox.y + firstBox.height);
      expect(gap).toBeGreaterThan(5);
    }
  });
});
