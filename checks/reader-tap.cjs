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

    // P0 check: Turkish search handles İ/ı/â folding ("ihlas" finds 112. İhlâs)
    await page.locator('#surahSearch').fill('ihlas');
    assert.equal(await page.locator('.surah-item[data-surah="112"]').count(), 1);
    await page.locator('#surahSearch').fill('');

    // P0 check: switching Arapça source (Mushaf/Diyanet) must NOT reset selected theme
    await page.locator('#homeScreen [data-action="openSettings"]').tap();
    await page.locator('.theme-option[data-t="bordo"]').tap();
    await page.locator('.source-option[data-source="acikkuran"]').tap();
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'bordo');
    await page.locator('.source-option[data-source="uthmani"]').tap();
    // Open separate Okunuş Ayarları panel from Settings, then Tecvid Guide
    await page.locator('#openReadingFromSettings').tap();
    await page.locator('#readingSettingsOverlay.open').waitFor({state: 'visible'});
    await page.locator('#openGuideBtn').tap();
    await page.locator('#guideOverlay.open').waitFor({state: 'visible'});
    await page.locator('#closeGuideBtn').tap();
    await page.locator('#closeReadingBtn').tap();
    await page.locator('#closeSettingsBtn').tap();

    await page.locator('.surah-item[data-surah="1"]').tap();
    assert.equal(await page.locator('.surah-besmele').count(), 0);
    const verse = page.locator('.verse[data-verse="1"]');
    const tooltip = page.getByRole('tooltip');

    // Okuma mode: 2-mode toggle (Okuma / Kelime) + word bubble + Birlikte context
    assert.equal(await page.locator('.mode-btn').count(), 2);
    await page.locator('[data-mode="reading"]').tap();
    const buttons = verse.locator('button[data-translit]');
    assert.equal(await buttons.count(), 4);
    for (const [index, expected] of [[0, 'bis-mil-'], [1, 'lâ-hir-']]) {
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

    // WBW mode groups connected readings into a single tappable card with Turkish meaning
    await page.locator('[data-mode="wbw"]').tap();
    const wbwButtons = verse.locator('button[data-translit]');
    assert.equal(await wbwButtons.count(), 1);
    assert.ok((await wbwButtons.first().locator('.wbw-meaning').textContent()).includes('Allah'));
    await wbwButtons.first().tap();
    await tooltip.waitFor({state: 'visible'});
    assert.equal(await tooltip.locator('.tooltip-text').textContent(), 'bis-mil-lâ-hir-rah-mâ-nir-ra-hîm');
    await wbwButtons.first().tap();
    await tooltip.waitFor({state: 'hidden'});

    // Optional QoL toggles via dedicated Okunuş Ayarları button in reader header
    await page.locator('#readerScreen [data-action="openReadingSettings"]').tap();
    await page.locator('#readingSettingsOverlay.open').waitFor({state: 'visible'});
    await page.locator('[data-toggle="groupLiaison"]').tap();
    assert.equal(await wbwButtons.count(), 4);
    await page.locator('[data-toggle="showSyllables"]').tap();
    await page.locator('[data-toggle="showLongVowels"]').tap();
    await page.locator('[data-toggle="showVersePhonetic"]').tap();
    await page.locator('#closeReadingBtn').tap();

    await page.locator('[data-mode="reading"]').tap();
    assert.equal(await verse.locator('.verse-phonetic').textContent(), 'bismil lahir rahmanir rahim');
    await buttons.first().tap();
    await tooltip.waitFor({state: 'visible'});
    assert.equal(await tooltip.locator('.tooltip-text').textContent(), 'bismil');
    await buttons.first().tap();

    // Reset back to defaults from slim Settings panel
    await page.locator('#readerScreen [data-action="openSettings"]').tap();
    await page.locator('#resetSettingsBtn').tap();
    await page.locator('#closeSettingsBtn').tap();
    assert.equal(await verse.locator('.verse-phonetic').count(), 0);

    // Surah 48: Besmele header + Fetih 48:4 Pratik vs Klasik style toggle + Fetih 48:18
    await page.locator('#surahSelectReader').selectOption('48');
    assert.equal(await page.locator('.surah-besmele').count(), 1);
    const fetih4 = page.locator('.verse[data-verse="4"] button[data-translit]');
    assert.equal(await fetih4.nth(15).getAttribute('data-translit'), 've-kâ-nal-');
    assert.equal(await fetih4.nth(16).getAttribute('data-translit'), 'lâ-hu');
    await page.locator('#readerScreen [data-action="openReadingSettings"]').tap();
    await page.locator('.style-option[data-style="classic"]').tap();
    await page.locator('#closeReadingBtn').tap();
    assert.equal(await fetih4.nth(15).getAttribute('data-translit'), 've-kâ-nel-');
    assert.equal(await fetih4.nth(16).getAttribute('data-translit'), 'lâ-hü');
    await page.locator('#readerScreen [data-action="openReadingSettings"]').tap();
    await page.locator('.style-option[data-style="practical"]').tap();
    await page.locator('#closeReadingBtn').tap();

    const fetih18 = page.locator('.verse[data-verse="18"] button[data-translit]');
    assert.equal(await fetih18.count(), 19);
    await fetih18.nth(1).tap();
    await tooltip.waitFor({state: 'visible'});
    assert.equal(await tooltip.locator('.tooltip-text').textContent(), 'ra-dı-yal-');
    assert.match(await tooltip.textContent(), /Birlikte: radıyal-lâhu/);

    // Surah 9 (Tevbe): no Besmele header
    await page.locator('#surahSelectReader').selectOption('9');
    assert.equal(await page.locator('.surah-besmele').count(), 0);

    // Surah 4:119 complete 21 words
    await page.locator('#surahSelectReader').selectOption('4');
    const nisa = page.locator('.verse[data-verse="119"] button[data-translit]');
    assert.equal(await nisa.count(), 21);
    await nisa.last().tap();
    await tooltip.waitFor({state: 'visible'});
    assert.equal(await tooltip.locator('.tooltip-text').textContent(), 'mü-bî-nâ');

    // Check every packaged Arabic position across both Arabic sources & both levels.
    const checks = await page.evaluate(() => {
      const result = [];
      for (const ar of [arabicUthmaniData, arabicAcikkuranData]) {
        for (const [key, value] of Object.entries(ar)) {
          const count = value.split(' ').length;
          for (const data of [translitData, translitTajweedData]) {
            const words = data[key] || [];
            if (words.length !== count || words.some(word => !word)) result.push(key);
          }
        }
      }
      return result;
    });
    assert.deepEqual(checks, []);
    assert.deepEqual(errors, []);
    console.log('Search, theme, guide, Besmele, touch, WBW grouping, Fetih 48:18, Nisa 4:119 and full corpus checks passed.');
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
