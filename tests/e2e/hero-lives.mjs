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
    // stage 1, then the vanguard (first card: 풍운객) and the second (second card after him: 묵영). 철혈 is left out
    // on purpose: his trait (+1 health) and entry skill (불굴) are tested in heroines.mjs.
    window.begin = () => {
      M.start();
      document.querySelector('#choice button.card').click();
      ((a = 0, b = 1) => {
        for (const el of [...document.querySelectorAll('#choice .party-hero.sel')].reverse()) el.click();
        const h = [...document.querySelectorAll('#choice .party-hero')];
        h[a].click();
        h[b].click();
        document.getElementById('formationConfirm').click();
      })(0, 2);
      M.G.player.inv = 0;
      M.G.time = 10;
    };
  });
  const result = await p.evaluate(() => {
    begin();
    const { G } = M;
    const ids = [...G.state.formation];
    const initial = structuredClone(G.state.heroHealth);
    M.damagePlayer();
    M.syncHUD();
    const first = {
      active: G.state.active,
      hp: G.player.hp,
      dead: structuredClone(G.state.heroHealth[ids[0]]),
      mode: G.mode,
      inv: G.player.inv,
      effect: G.state.effect?.hero,
    };
    M.damagePlayer();
    const protectedHp = G.player.hp;
    G.player.inv = 0;
    M.damagePlayer();
    const bank = M.profile.coins;
    M.damagePlayer();
    return {
      ids,
      initial,
      first,
      protectedHp,
      final: { mode: G.mode, health: structuredClone(G.state.heroHealth), bankUnchanged: M.profile.coins === bank },
    };
  });
  for (const id of result.ids) assert.deepEqual(result.initial[id], { hp: 1, maxHp: 1, fallen: false });
  assert.equal(result.first.active, 1);
  assert.equal(result.first.hp, 1);
  assert.equal(result.first.mode, 'play');
  assert.ok(result.first.inv > 0);
  assert.equal(result.first.effect, result.ids[1], 'the second hero starts their entry skill');
  assert.deepEqual(result.first.dead, { hp: 0, maxHp: 1, fallen: true });
  assert.equal(result.protectedHp, 1);
  assert.equal(result.final.mode, 'result');
  assert.equal(result.final.bankUnchanged, true);
  for (const id of result.ids) assert.equal(result.final.health[id].fallen, true);
  console.log(
    'PASS base 1 HP, lethal hit brings in the second hero with their entry skill, grace invulnerability, all fallen defeat, single settlement',
  );
  // The accessors always refer to the active hero; each hero keeps their own health. No manual swap exists.
  const manual = await p.evaluate(() => {
    begin();
    const { G } = M;
    M.learn('cheolgol'); // both heroes: max 2, health 2
    const ids = G.state.formation;
    G.player.inv = 0;
    M.damagePlayer(); // vanguard 2 -> 1
    const woundedHp = G.player.hp;
    G.player.inv = 0;
    M.damagePlayer(); // vanguard falls; the second enters with their own 2
    G.state.effect = null;
    const entered = { mode: G.mode, hp: G.player.hp, max: G.player.maxHp, active: G.state.active };
    G.player.inv = 0;
    M.damagePlayer(); // second 2 -> 1
    const wounded = G.player.hp;
    // 약선 1단계 again: the living hero gains, the fallen one stays down
    M.learn('cheolgol');
    const healed = G.player.hp;
    const afterBuff = structuredClone(G.state.heroHealth[ids[0]]);
    return { woundedHp, entered, wounded, healed, afterBuff };
  });
  assert.equal(manual.woundedHp, 1);
  assert.deepEqual(manual.entered, { mode: 'play', hp: 2, max: 2, active: 1 });
  assert.equal(manual.wounded, 1);
  assert.equal(manual.healed, 2);
  assert.equal(manual.afterBuff.hp, 0);
  assert.equal(manual.afterBuff.fallen, true);
  console.log('PASS individual health, retained HP buff, 약선 1단계 heals the living and cannot revive the fallen');
  for (const defense of ['shield', 'hoechun', 'inv', 'hyper']) {
    const state = await p.evaluate(defense => {
      begin();
      const { G } = M;
      if (defense === 'shield') G.player.shield = 1;
      if (defense === 'hoechun') {
        M.learn('hoechun');
        M.updateSkills(1 / 60); // its first period arms it at once
      }
      if (defense === 'inv') G.player.inv = 0.3;
      if (defense === 'hyper') G.state.hyper = 1;
      M.damagePlayer();
      return { hp: G.player.hp, active: G.state.active, fallen: G.state.heroHealth[G.state.formation[0]].fallen };
    }, defense);
    assert.deepEqual(state, { hp: 1, active: 0, fallen: false });
  }
  console.log('PASS shield, first-hit negate, invulnerability, hyper retained');
  // Simultaneous overlapping hazards must not kill both heroes in one simulation step.
  const collision = await p.evaluate(() => {
    begin();
    const { G } = M;
    G.state.stageTime = 5;
    G.state.rowTimer = 100;
    G.enemies = [];
    G.hazards = Array.from({ length: 3 }, () => ({ x: G.player.x, y: G.player.y, vy: 0, vx: 0, r: 8, warn: 0 }));
    M.update(1 / 60);
    return {
      mode: G.mode,
      active: G.state.active,
      hp: G.player.hp,
      fallen: G.state.formation.filter(id => G.state.heroHealth[id].fallen).length,
    };
  });
  assert.deepEqual(collision, { mode: 'play', active: 1, hp: 1, fallen: 1 });
  await p.evaluate(() => {
    M.syncHUD();
    M.G.banner = null;
    M.draw();
  });
  // the shot is kept for a person to look at; tests run anywhere, so it goes under test-results/
  await mkdir(SHOTS, { recursive: true });
  await p.screenshot({ path: `${SHOTS}/one-health-auto-replacement.png` });
  const reset = await p.evaluate(() => {
    begin();
    return M.G.state.formation.map(id => M.G.state.heroHealth[id]);
  });
  for (const h of reset) assert.deepEqual(h, { hp: 1, maxHp: 1, fallen: false });
  assert.deepEqual(errors, []);
  console.log('PASS real hazard collision grace, fresh run restores both lives');
} finally {
  await browser.close();
  await server.close();
}
