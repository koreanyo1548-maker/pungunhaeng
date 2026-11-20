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
            '/src/scenes/encounter.ts',
            '/src/scenes/gacha.ts',
            '/src/render/renderer.ts',
          ].map(x => import(x)),
        )),
      );
      while (!document.getElementById('stagePrev').disabled) document.getElementById('stagePrev').click(); // S1
      document.getElementById('start').click();
      ((a = 0, b = 1) => {
        for (const el of [...document.querySelectorAll('#choice .party-hero.sel')].reverse()) el.click();
        const h = [...document.querySelectorAll('#choice .party-hero')];
        h[a].click();
        h[b].click();
        document.getElementById('formationConfirm').click();
      })();
    });
    assert.equal(await p.evaluate(() => Object.keys(M.ambientPictures).length), 13);
    // passers-by (forced) in portrait order; helping one takes its 의뢰 and adds 정 or 사 (rolled per passer-by)
    for (let n = 0; n < 4; n++) {
      await p.evaluate(n => {
        M.G.state.passers = n;
        M.G.state.forceNpc = 'passer';
        M.G.state.coins = 40;
        M.G.mode = 'play';
        M.openEncounter();
      }, n);
      await p.waitForFunction(() => {
        let im = document.querySelector('#choice .npc-choice-art');
        return im?.complete && im.naturalWidth === 314;
      });
      await p.screenshot({ path: `${out}/${width}-passer-${n + 1}.png` });
      const before = await p.evaluate(() => ({ points: M.G.state.good + M.G.state.evil }));
      await p.locator('#choice .act').first().click();
      const after = await p.evaluate(() => ({
        points: M.G.state.good + M.G.state.evil,
        quest: M.G.state.quest?.t,
        mode: M.G.mode,
        toast: document.querySelector('#toast img')?.getAttribute('src'),
      }));
      assert.equal(after.points, before.points + 1);
      assert.equal(after.quest, 'kills');
      assert.equal(after.mode, 'play');
      assert.ok(after.toast?.startsWith('data:image/png'));
      await p.waitForFunction(() => document.querySelector('#toast img')?.complete);
      await p.evaluate(() => M.draw());
      await p.screenshot({ path: `${out}/${width}-thanks-${n + 1}.png` });
    }
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
    console.log(`PASS ${width}: four passer portraits + thanks, help (적 처치 의뢰, 정·사), hero piece icon`);
    await p.close();
  }
} finally {
  await b.close();
  await server.close();
}
