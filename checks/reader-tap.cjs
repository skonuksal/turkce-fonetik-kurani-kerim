const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');

async function main() {
  const browser = await chromium.launch({channel: 'chrome'});
  try {
    const page = await browser.newPage({
      viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true,
    });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:4173/');
    await page.locator('.surah-item[data-surah="1"]').tap();
    const verse = page.locator('.verse[data-verse="1"]');
    const tooltip = page.getByRole('tooltip');
    for (const mode of ['turkish', 'arabic', 'wbw']) {
      await page.locator(`[data-mode="${mode}"]`).tap();
      const buttons = verse.locator('button[data-translit]');
      assert.equal(await buttons.count(), 4);
      for (const [index, expected] of [[0, 'bis-mil-'], [1, 'la-hir-']]) {
        await buttons.nth(index).tap();
        await tooltip.waitFor({state: 'visible'});
        assert.equal(await tooltip.locator('.tooltip-text').textContent(), expected);
        assert.equal(await buttons.nth(index).getAttribute('aria-expanded'), 'true');
        const rect = await tooltip.boundingBox();
        assert.ok(rect.x >= 0 && rect.x + rect.width <= 391);
        assert.ok(rect.y >= 0 && rect.y + rect.height <= 845);
      }
      await buttons.nth(1).tap();
      await tooltip.waitFor({state: 'hidden'});
      await buttons.first().focus();
      await page.keyboard.press('Enter');
      await tooltip.waitFor({state: 'visible'});
      await page.keyboard.press('Escape');
      await tooltip.waitFor({state: 'hidden'});
    }

    await page.locator('#backBtn').tap();
    await page.locator('.surah-item[data-surah="4"]').tap();
    const nisa = page.locator('.verse[data-verse="119"] button[data-translit]');
    assert.equal(await nisa.count(), 21);
    await nisa.last().tap();
    await tooltip.waitFor({state: 'visible'});
    assert.equal(await tooltip.locator('.tooltip-text').textContent(), 'mübînâ');
    assert.match(await tooltip.textContent(), /Muhammet Abay/);

    // Check every packaged Arabic position against both Arabic sources.
    const checks = await page.evaluate(() => {
      const result = [];
      for (const ar of [arabicUthmaniData, arabicAcikkuranData]) {
        for (const [key, value] of Object.entries(ar)) {
          const count = value.split(' ').length;
          const words = translitData[key].length ? translitData[key] :
            referenceWordsFor(key, referenceReadings[key], count);
          if (words.length !== count || words.some(word => !word)) result.push(key);
        }
      }
      return result;
    });
    assert.deepEqual(checks, []);
    assert.deepEqual(errors, []);
    console.log('Touch, keyboard, viewport, reference fallback and corpus checks passed.');
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
