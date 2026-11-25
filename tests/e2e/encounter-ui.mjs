// Visual/interaction regression for the accepted encounter layout; no balance simulation.
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
      const h = [...document.querySelectorAll('.party-hero')];
      for (const el of [...document.querySelectorAll('.party-hero.sel')].reverse()) el.click();
      h[0].click();
      h[1].click();
      document.getElementById('formationConfirm').click();
      window.__step(180);
    });
    const ids = await page.evaluate(async () => Object.keys((await import('/src/data/npcs.ts')).NPCS));
    for (const id of [...ids, 'passer'])
      for (const level of id === 'passer' ? [0] : [0, 1, 2, 3]) {
        const expected = await page.evaluate(
          async ({ id, level }) => {
            const { G } = await import('/src/core/context.ts');
            const { openEncounter } = await import('/src/scenes/encounter.ts');
            const { rewardName } = await import('/src/systems/quest.ts');
            G.state.quest = null;
            G.state.meetArrive = undefined;
            G.state.forceNpc = id;
            G.state.bond[id] = level;
            G.state.met[id] = level % 2;
            openEncounter();
            return G.state.offer.map(q => ({ mode: q.mode, target: q.target, npc: q.npc, reward: rewardName(q) }));
          },
          { id, level },
        );
        const offers = page.locator('.encounter-offer');
        assert.equal(await offers.count(), 2);
        const boxes = await offers.evaluateAll(nodes =>
          nodes.map(el => {
            const r = el.getBoundingClientRect();
            return { x: r.x, y: r.y, w: r.width, b: r.bottom };
          }),
        );
        assert.ok(boxes[0].x < boxes[1].x && Math.abs(boxes[0].y - boxes[1].y) < 1, `${id}: left/right`);
        for (let i = 0; i < 2; i++) {
          assert.ok(
            (await offers.nth(i).innerText()).includes(expected[i].reward),
            `${id} level ${level}: live reward`,
          );
          assert.ok((await offers.nth(i).locator('.encounter-task').innerText()).includes(String(expected[i].target)));
          assert.ok(
            await offers
              .nth(i)
              .locator('img')
              .evaluate(img => img.complete && img.naturalWidth > 0),
            `${id}: reward image loaded`,
          );
        }
        const geometry = await page.locator('#choice .panel').evaluate(el => ({
          overflow: el.scrollWidth > el.clientWidth,
          buttons: [...el.querySelectorAll('.act')].map(b => {
            const r = b.getBoundingClientRect();
            return { h: r.height, b: r.bottom };
          }),
          bottom: el.getBoundingClientRect().bottom,
        }));
        assert.equal(geometry.overflow, false);
        assert.ok(
          geometry.buttons.every(r => r.h >= 44 && r.b <= geometry.bottom + 1),
          `${id} ${level}: buttons visible ${JSON.stringify(geometry)}`,
        );
        if ((id === 'monk' && level === 0) || id === 'passer')
          await page.screenshot({ path: `${output}/${id}-${viewport.width}.png` });
        await page
          .locator('.act')
          .nth(level % 2)
          .click();
        assert.deepEqual(
          await page.evaluate(async () => {
            const q = (await import('/src/core/context.ts')).G.state.quest;
            return { mode: q.mode, target: q.target, npc: q.npc };
          }),
          { mode: expected[level % 2].mode, target: expected[level % 2].target, npc: expected[level % 2].npc },
        );
      }
    // The encounter skin must not leak into formation / other choices.
    await page.evaluate(async () => {
      (await import('/src/systems/flow.ts')).start();
    });
    assert.equal(await page.locator('#choice.encounter-screen').count(), 0);
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`PASS ${viewport.width}: all NPC tiers, passer rewards, choices and geometry`);
  }
} finally {
  await browser.close();
  await server.close();
}
