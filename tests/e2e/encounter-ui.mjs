// Single-offer encounter UI: tap/countdown acceptance and success rewards (#58).
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
      for (const level of id === 'passer' ? [0] : [0, 1, 2]) {
        const expected = await page.evaluate(
          async ({ id, level }) => {
            const { G } = await import('/src/core/context.ts');
            const { profile } = await import('/src/core/profile.ts');
            const { openEncounter } = await import('/src/scenes/encounter.ts');
            const { rewardName, questReward } = await import('/src/systems/quest.ts');
            G.state.quest = null;
            G.state.meetArrive = undefined;
            G.state.forceNpc = id;
            G.state.bond[id] = level;
            G.state.met[id] = level % 2;
            openEncounter();
            const q = G.state.offer;
            return {
              quest: { mode: q.mode, target: q.target, npc: q.npc },
              reward: rewardName(q),
              coins: questReward(q).coins,
              bank: G.state.coins,
              bond: profile.bonds[id] ?? 0,
              points: G.state.good + G.state.evil,
              path: G.state.path.length,
            };
          },
          { id, level },
        );
        const offer = page.locator('.encounter-offer');
        assert.equal(await offer.count(), 1);
        assert.equal(await page.locator('#choice .act').count(), 0, 'one offer, no choice buttons');
        assert.ok((await offer.innerText()).includes(expected.reward), `${id} level ${level}: live reward`);
        assert.ok((await offer.locator('.encounter-task').innerText()).includes(String(expected.quest.target)));
        assert.ok(
          await offer.locator('img').evaluate(img => img.complete && img.naturalWidth > 0),
          `${id}: reward image loaded`,
        );
        const geometry = await page.locator('#choice .panel').evaluate(el => ({
          overflow: el.scrollWidth > el.clientWidth,
          countdown: el.querySelector('.encounter-tap').getBoundingClientRect().bottom,
          bottom: el.getBoundingClientRect().bottom,
        }));
        assert.equal(geometry.overflow, false);
        assert.ok(geometry.countdown <= geometry.bottom + 1, `${id}: countdown visible`);
        await page.locator('.encounter-rules summary').click();
        await page.locator('.encounter-rules p').click();
        assert.equal(await page.evaluate(async () => (await import('/src/core/context.ts')).G.mode), 'choice');
        await page.locator('.encounter-rules summary').click();
        if ((id === 'monk' && level === 0) || id === 'passer')
          await page.screenshot({ path: `${output}/${id}-${viewport.width}.png` });
        if (level === 1) {
          await page.evaluate(() => window.__step(599));
          assert.equal(await page.evaluate(async () => (await import('/src/core/context.ts')).G.mode), 'choice');
          await page.evaluate(() => window.__step(2)); // cross 10 seconds on the synthetic frame clock
        } else await page.locator('.encounter-person').click();
        assert.deepEqual(
          await page.evaluate(async () => {
            const q = (await import('/src/core/context.ts')).G.state.quest;
            return { mode: q.mode, target: q.target, npc: q.npc };
          }),
          expected.quest,
        );
        const accepted = await page.evaluate(async id => {
          const { G } = await import('/src/core/context.ts');
          const { profile } = await import('/src/core/profile.ts');
          return { bond: profile.bonds[id] ?? 0, points: G.state.good + G.state.evil, path: G.state.path.length };
        }, id);
        assert.equal(accepted.bond, expected.bond, 'accepting does not grant affinity');
        assert.equal(accepted.points, expected.points + 1);
        assert.equal(accepted.path, expected.path + 1, 'the offer is accepted once');
        const completed = await page.evaluate(async id => {
          const { G } = await import('/src/core/context.ts');
          const { profile } = await import('/src/core/profile.ts');
          const { questEvent } = await import('/src/systems/quest.ts');
          const q = G.state.quest;
          if (q.t === 'combo') G.state.combo = 999;
          questEvent(q.t, 999);
          return { done: q.done, bond: profile.bonds[id] ?? 0, level: G.state.bond[id], coins: G.state.coins };
        }, id);
        assert.equal(completed.done, true);
        assert.equal(completed.bond, expected.bond + (id === 'passer' ? 0 : 1));
        assert.equal(completed.coins, expected.bank + expected.coins);
        if (id !== 'passer') assert.equal(completed.level, Math.min(2, level + 1));
      }
    // The encounter skin must not leak into formation / other choices.
    await page.evaluate(async () => {
      (await import('/src/systems/flow.ts')).start();
    });
    assert.equal(await page.locator('#choice.encounter-screen').count(), 0);
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`PASS ${viewport.width}: two NPC tiers, passer coins, tap/countdown and success rewards`);
  }
} finally {
  await browser.close();
  await server.close();
}
