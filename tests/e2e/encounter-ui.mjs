// Visual/interaction regression for the encounter layout, now the 공명의 조짐 card (2026-11: one card, a tap takes
// it; no 인연, passer-by or choice of two); no balance simulation.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';
const root = fileURLToPath(new URL('../../', import.meta.url));
const output = process.env.SCREENSHOT_DIR || root + 'test-results/encounter';
await mkdir(output, { recursive: true });
const server = await createServer({ root, server: { host: '127.0.0.1', port: 5214, strictPort: true } });
await server.listen();
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox'],
});
try {
  for (const viewport of [
    { width: 360, height: 640 },
    { width: 390, height: 844 },
    { width: 1280, height: 900 },
  ]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      let now = 0,
        q = [];
      window.requestAnimationFrame = cb => {
        q.push(cb);
        return q.length;
      };
      performance.now = () => now;
      window.__step = n => {
        for (let i = 0; i < n; i++) {
          now += 1000 / 60;
          const callbacks = q;
          q = [];
          for (const f of callbacks) f(now);
        }
      };
    });
    await page.goto('http://127.0.0.1:5214/#debug&seed=42');
    await page.waitForFunction(() => !document.getElementById('start').disabled, null, { timeout: 120000 });
    await page.click('#start');
    await page.evaluate(() => {
      document.querySelectorAll('.party-hero')[0].click();
      document.getElementById('formationConfirm').click();
      window.__step(2);
      // the first 조짐 opens with the stage: take it, then fly a while
      document.querySelector('#choice .card').click();
      window.__step(180);
    });
    for (const t of ['graze', 'step', 'nearKill', 'rowClear', 'combo']) {
      const expected = await page.evaluate(async t => {
        const { G } = await import('/src/core/context.ts');
        const { openEncounter } = await import('/src/scenes/encounter.ts');
        G.state.quest = null;
        G.state.meetArrive = undefined;
        G.state.forceSign = t;
        openEncounter();
        return { title: document.getElementById('choiceTitle').textContent };
      }, t);
      assert.equal(expected.title, '공명의 조짐');
      const offers = page.locator('.encounter-offer');
      assert.equal(await offers.count(), 1, `${t}: one 조짐`);
      assert.equal(await page.locator('#choice .act').count(), 0, `${t}: no buttons`);
      assert.ok((await offers.first().innerText()).includes('공명'), `${t}: what meeting it brings`);
      assert.ok(
        await page
          .locator('#choice .card img')
          .first()
          .evaluate(img => img.complete && img.naturalWidth > 0),
        `${t}: card image loaded`,
      );
      const geometry = await page.locator('#choice .panel').evaluate(el => ({
        overflow: el.scrollWidth > el.clientWidth,
        tap: !!el.querySelector('.encounter-tap'),
      }));
      assert.deepEqual(geometry, { overflow: false, tap: true }, `${t}: fits, with its countdown`);
      if (t === 'graze') await page.screenshot({ path: `${output}/sign-${viewport.width}.png` });
      await page.locator('#choice').click();
      const q = await page.evaluate(async () => {
        const { G } = await import('/src/core/context.ts');
        return { t: G.state.quest.t, target: G.state.quest.target, mode: G.mode };
      });
      assert.equal(q.t, t);
      assert.equal(q.mode, 'play');
    }
    // The encounter skin must not leak into the hero screen / other choices.
    await page.evaluate(async () => {
      (await import('/src/systems/flow.ts')).start();
    });
    assert.equal(await page.locator('#choice.encounter-screen').count(), 0);
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`PASS ${viewport.width}: the 조짐 card for every condition, a tap takes it, geometry`);
  }
} finally {
  await browser.close();
  await server.close();
}
