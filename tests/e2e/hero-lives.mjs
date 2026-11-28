import { createServer } from 'vite';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const SHOTS = process.env.SCREENSHOT_DIR || 'test-results';
const server = await createServer({ server: { host: '127.0.0.1', port: 5194 } });
await server.listen();
const browser = await chromium.launch();
try {
  const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(() => {
    window.requestAnimationFrame = () => 0;
  });
  await p.goto('http://127.0.0.1:5194/#debug&roster');
  await p.waitForFunction(() => !document.getElementById('start').disabled, null, { timeout: 120000 });
  await p.evaluate(async () => {
    window.M = Object.assign(
      {},
      ...(await Promise.all(
        [
          '/src/core/context.ts',
          '/src/core/profile.ts',
          '/src/systems/flow.ts',
          '/src/systems/formation.ts',
          '/src/entities/player.ts',
          '/src/systems/abilities.ts',
          '/src/data/skills.ts',
          '/src/ui/hud.ts',
          '/src/systems/loop.ts',
          '/src/render/renderer.ts',
        ].map(x => import(x)),
      )),
    );
    // stage 1, then the first hero (풍운객). One hero a run since 2026-11 (편대 비행 removed): no second hero, no
    // entry skill. No 조짐 cards here (their timer is pushed back), so the hits are all that happens.
    window.begin = () => {
      while (!document.getElementById('stagePrev').disabled) document.getElementById('stagePrev').click(); // S1
      M.start();
      document.querySelectorAll('#choice .party-hero')[0].click();
      document.getElementById('formationConfirm').click();
      M.G.state.meetTimer = M.G.state.meetWait = 1e6;
      M.G.player.inv = 0;
      M.G.time = 10;
    };
  });
  const result = await p.evaluate(() => {
    begin();
    const { G } = M;
    const id = G.state.hero;
    const initial = structuredClone(G.state.heroHealth[id]);
    const bank = M.profile.coins;
    M.damagePlayer();
    return {
      id,
      initial,
      mode: G.mode,
      health: structuredClone(G.state.heroHealth[id]),
      bankBanked: M.profile.coins >= bank,
    };
  });
  assert.deepEqual(result.initial, { hp: 1, maxHp: 1, fallen: false });
  assert.equal(result.mode, 'result', 'a lethal hit ends the run: no second hero');
  assert.deepEqual(result.health, { hp: 0, maxHp: 1, fallen: true });
  console.log('PASS base 1 HP, a lethal hit ends the run (one hero, no replacement)');
  // more health (as gear or 철혈 give): a hit takes one, then a grace of invulnerability
  const wounded = await p.evaluate(() => {
    begin();
    const { G } = M;
    G.player.maxHp = 2;
    G.player.hp = 2;
    M.damagePlayer();
    const first = { hp: G.player.hp, mode: G.mode, inv: G.player.inv };
    M.damagePlayer(); // within the grace: nothing
    return { first, protectedHp: G.player.hp };
  });
  assert.equal(wounded.first.hp, 1);
  assert.equal(wounded.first.mode, 'play');
  assert.ok(wounded.first.inv > 0);
  assert.equal(wounded.protectedHp, 1);
  console.log('PASS a hit takes one health, then a grace of invulnerability');
  for (const defense of ['inv', 'hyper']) {
    const state = await p.evaluate(defense => {
      begin();
      const { G } = M;
      if (defense === 'inv') G.player.inv = 0.3;
      if (defense === 'hyper') G.state.hyper = 1;
      M.damagePlayer();
      return { hp: G.player.hp, mode: G.mode };
    }, defense);
    assert.deepEqual(state, { hp: 1, mode: 'play' });
  }
  console.log('PASS invulnerability and 무아지경 keep the hero');
  // simultaneous overlapping hazards take one health in one simulation step
  const collision = await p.evaluate(() => {
    begin();
    const { G } = M;
    G.player.maxHp = 2;
    G.player.hp = 2;
    G.state.stageTime = 5;
    G.state.rowTimer = 100;
    G.enemies = [];
    G.hazards = Array.from({ length: 3 }, () => ({ x: G.player.x, y: G.player.y, vy: 0, vx: 0, r: 8, warn: 0 }));
    M.update(1 / 60);
    return { mode: G.mode, hp: G.player.hp };
  });
  assert.deepEqual(collision, { mode: 'play', hp: 1 });
  await p.evaluate(() => {
    M.syncHUD();
    M.G.banner = null;
    M.draw();
  });
  // the shot is kept for a person to look at; tests run anywhere, so it goes under test-results/
  await mkdir(SHOTS, { recursive: true });
  await p.screenshot({ path: `${SHOTS}/one-hero-health.png` });
  const reset = await p.evaluate(() => {
    begin();
    return M.G.state.heroHealth[M.G.state.hero];
  });
  assert.deepEqual(reset, { hp: 1, maxHp: 1, fallen: false });
  assert.deepEqual(errors, []);
  console.log('PASS real hazard collision grace, a fresh run restores the health');
} finally {
  await browser.close();
  await server.close();
}
