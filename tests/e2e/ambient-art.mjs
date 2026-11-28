import { createServer } from 'vite';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const out = process.env.SCREENSHOT_DIR || 'test-results/ambient-art';
await mkdir(out, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 5191 } });
await server.listen();
const b = await chromium.launch();
try {
  for (const width of [360, 480]) {
    const p = await b.newPage({ viewport: { width, height: width === 360 ? 640 : 800 } });
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    await p.addInitScript(() => {
      window.requestAnimationFrame = () => 0;
    });
    await p.goto('http://127.0.0.1:5191/#debug');
    await p.waitForFunction(() => !document.getElementById('start').disabled, null, { timeout: 120000 });
    await p.evaluate(async () => {
      window.M = Object.assign(
        {},
        ...(await Promise.all(
          [
            '/src/core/context.ts',
            '/src/core/profile.ts',
            '/src/core/ambient-art.ts',
            '/src/scenes/gacha.ts',
            '/src/render/renderer.ts',
          ].map(x => import(x)),
        )),
      );
      while (!document.getElementById('stagePrev').disabled) document.getElementById('stagePrev').click(); // S1
      document.getElementById('start').click();
      // one hero a run (2026-11): the first
      document.querySelectorAll('#choice .party-hero')[0].click();
      document.getElementById('formationConfirm').click();
    });
    assert.equal(await p.evaluate(() => Object.keys(M.ambientPictures).length), 13);
    // (2026-11: the passers-by and their 의뢰 were removed with 공명; their portraits stay in the sheet, unused)
    await p.evaluate(() => {
      document.getElementById('choice').classList.add('hidden');
      M.profile.coins = 1000;
      M.openGacha();
      Math.random = () => 0;
    });
    await p.locator('#drawOne').click();
    await p.waitForFunction(() => document.querySelector('.piece-icon')?.complete);
    assert.equal(
      await p.locator('.piece-icon').getAttribute('src'),
      await p.evaluate(() => M.ambientPictures['hero-piece']),
    );
    await p.screenshot({ path: `${out}/${width}-hero-piece.png` });
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}: ambient pictures loaded, hero piece icon`);
    await p.close();
  }
} finally {
  await b.close();
  await server.close();
}
