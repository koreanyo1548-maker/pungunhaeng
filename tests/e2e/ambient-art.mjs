import { createServer } from 'vite';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const out = process.env.SCREENSHOT_DIR || '/workspace/review/ambient-art';
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
            '/src/scenes/crossroads.ts',
            '/src/scenes/inn.ts',
            '/src/scenes/gacha.ts',
            '/src/render/renderer.ts',
          ].map(x => import(x)),
        )),
      );
      document.getElementById('start').click();
      for (let i = 0; i < 3; i++) {
        let c = document.getElementById('formationConfirm');
        document.querySelector('#choice button.card').click();
        c?.click();
      }
    });
    assert.equal(await p.evaluate(() => Object.keys(M.ambientPictures).length), 13);
    for (let stage = 1; stage <= 4; stage++) {
      await p.evaluate(stage => {
        M.G.state.stage = stage;
        M.G.state.coins = 40;
        M.openCrossroads();
      }, stage);
      await p.waitForFunction(() => {
        let im = document.querySelector('#choice .npc-choice-art');
        return im?.complete && im.naturalWidth === 627;
      });
      await p.screenshot({ path: `${out}/${width}-passer-${stage}.png` });
      const before = await p.evaluate(() => ({ coins: M.G.state.coins, virtue: M.G.state.virtue }));
      await p.locator('#choice .act').first().click();
      const after = await p.evaluate(() => ({
        coins: M.G.state.coins,
        virtue: M.G.state.virtue,
        mode: M.G.mode,
        toast: document.querySelector('#toast img')?.getAttribute('src'),
      }));
      assert.equal(after.coins, before.coins - 20);
      assert.equal(after.virtue, before.virtue + 2);
      assert.equal(after.mode, 'play');
      assert.ok(after.toast?.startsWith('data:image/png'));
      await p.waitForFunction(() => document.querySelector('#toast img')?.complete);
      await p.evaluate(() => M.draw());
      await p.screenshot({ path: `${out}/${width}-thanks-${stage}.png` });
    }
    await p.evaluate(() => {
      M.G.state.stage = 2;
      M.G.state.coins = 1000;
      M.G.player.hp = 2;
      M.openInn();
    });
    await p.waitForFunction(() =>
      [...document.querySelectorAll('#choice .skill-choice-art')].every(im => im.complete && im.naturalWidth === 512),
    );
    assert.equal(await p.locator('#choice .skill-choice-art').count(), 3);
    await p.screenshot({ path: `${out}/${width}-inn.png` });
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
    await p.evaluate(() => {
      Math.random = () => 0.9;
    });
    await p.locator('#drawOne').click();
    assert.equal(
      await p.locator('.piece-icon').getAttribute('src'),
      await p.evaluate(() => M.ambientPictures['bond-piece']),
    );
    await p.screenshot({ path: `${out}/${width}-bond-piece.png` });
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}: four portraits + thanks, unchanged payment/virtue, three inn items, both piece types`);
    await p.close();
  }
} finally {
  await b.close();
  await server.close();
}
