import { createServer } from 'vite';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const screenshots = process.env.SCREENSHOT_DIR || root + 'test-results/gear-ui';
await mkdir(screenshots, { recursive: true });
const server = await createServer({ root, server: { host: '127.0.0.1', port: 5199 } });
await server.listen();
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox'],
});
try {
  for (const width of [360, 390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: width === 1280 ? 900 : 844 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:5199/');
    await page.waitForFunction(
      () =>
        window.__g?.loaded ||
        (!document.querySelector('#start').disabled && document.querySelector('#start').textContent.includes('강호')),
      null,
      { timeout: 120000 },
    );
    await page.evaluate(async () => {
      const { profile, addGear, equip } = await import('/src/core/profile.ts');
      const { GEAR_ITEM_IDS } = await import('/src/data/gear.ts');
      profile.coins = 20000;
      for (const item of GEAR_ITEM_IDS) {
        addGear(item, 2);
        addGear(item, 1);
      }
      equip('pungun', 'weapon', 1);
      equip('bicheon', 'robe', 9);
      document.querySelector('#openRoster').click();
    });
    await page.click('#collectionGrid [data-id="pungun"]');
    await page.click('[data-tab="1"]');
    assert.equal(await page.locator('.equipment-grid > button').count(), 30);
    assert.equal(await page.locator('.loadout-slot').count(), 4);
    await page.screenshot({ path: `${screenshots}/overview-${width}.png` });
    await page.click('[data-gear="7"]');
    assert.match(await page.locator('.equipment-compare').innerText(), /공격력 −10%/);
    await page.screenshot({ path: `${screenshots}/detail-${width}.png` });
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#gearDetail').isVisible(), false);
    assert.equal(await page.locator('#detail').isVisible(), true);
    await page.click('.loadout-slot[data-slot="weapon"]');
    await page.click('[data-action="plus"]');
    const before = await page.evaluate(async () => {
      const { profile } = await import('/src/core/profile.ts');
      return { coins: profile.coins, n: profile.gear.length, plus: profile.gear[0].plus };
    });
    assert.equal(before.plus, 0);
    await page.screenshot({ path: `${screenshots}/upgrade-${width}.png` });
    await page.click('[data-action="confirm-plus"]');
    const after = await page.evaluate(async () => {
      const { profile } = await import('/src/core/profile.ts');
      return { coins: profile.coins, n: profile.gear.length, plus: profile.gear[0].plus };
    });
    assert.equal(after.plus, 1);
    assert.equal(after.coins, before.coins - 100);
    assert.equal(after.n, before.n - 1);
    await page.click('[data-action="enchant"]');
    await page.click('[data-material="4"]');
    await page.screenshot({ path: `${screenshots}/enchant-${width}.png` });
    const n = await page.evaluate(async () => (await import('/src/core/profile.ts')).profile.gear.length);
    assert.equal(n, 29);
    await page.click('[data-action="confirm-enchant"]');
    assert.match(await page.locator('.equipment-message').innerText(), /완료/);
    assert.equal(await page.evaluate(async () => (await import('/src/core/profile.ts')).profile.gear.length), 28);
    await page.click('[data-action="close"]');
    await page.click('[data-filter="robe"]');
    assert.equal(await page.locator('.equipment-grid > button').count(), 6);
    await page.click('[data-gear="9"]');
    assert.match(await page.locator('[data-action="equip"]').innerText(), /비천/);
    await page.click('[data-action="equip"]');
    assert.equal(
      await page.evaluate(async () => {
        const { profile } = await import('/src/core/profile.ts');
        return profile.equipped.bicheon.robe;
      }),
      undefined,
    );
    await page.click('[data-action="equip"]');
    assert.match(await page.locator('.equipment-message').innerText(), /해제/);
    await page.click('[data-action="close"]');
    const overflow = await page.locator('#detail .panel').evaluate(el => el.scrollWidth > el.clientWidth);
    assert.equal(overflow, false);
    await page.evaluate(async () => {
      const { profile } = await import('/src/core/profile.ts');
      profile.gear = [];
      for (const h of Object.values(profile.equipped)) for (const k of Object.keys(h)) delete h[k];
      const { refreshCollection } = await import('/src/ui/collection.ts');
      refreshCollection();
    });
    assert.match(await page.locator('.equipment-empty').innerText(), /장비가 없습니다/);
    await page.screenshot({ path: `${screenshots}/empty-${width}.png` });
    assert.deepEqual(errors, []);
    console.log(
      `PASS ${width}: grid, comparison, staged upgrade/enchant, transfer, unequip, empty, Escape, no overflow`,
    );
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
