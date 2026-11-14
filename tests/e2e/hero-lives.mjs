import { createServer } from 'vite';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
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
          '/src/scenes/inn.ts',
          '/src/render/renderer.ts',
        ].map(x => import(x)),
      )),
    );
    window.begin = () => {
      M.start();
      for (let i = 0; i < 3; i++) {
        const confirm = document.getElementById('formationConfirm');
        document.querySelector('#choice button.card').click();
        confirm?.click();
      }
      document.querySelector('#choice .act').click();
      M.G.player.inv = 0;
      M.G.time = 10;
    };
  });
  const result = await p.evaluate(() => {
    begin();
    const { G } = M;
    const ids = [...G.state.formation];
    const initial = structuredClone(G.state.heroHealth);
    G.state.swapReady = 999;
    M.damagePlayer();
    M.syncHUD();
    const first = {
      active: G.state.active,
      hp: G.player.hp,
      dead: structuredClone(G.state.heroHealth[ids[0]]),
      mode: G.mode,
      disabled: document.getElementById('swap').disabled,
      inv: G.player.inv,
      combos: G.state.combos2 || 0,
    };
    M.swapHero();
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
  assert.equal(result.first.combos, 0);
  assert.equal(result.first.disabled, true);
  assert.deepEqual(result.first.dead, { hp: 0, maxHp: 1, fallen: true });
  assert.equal(result.protectedHp, 1);
  assert.equal(result.final.mode, 'result');
  assert.equal(result.final.bankUnchanged, true);
  for (const id of result.ids) assert.equal(result.final.health[id].fallen, true);
  console.log(
    'PASS base 1 HP, lethal auto-replacement through cooldown, grace invulnerability, no dead swap, all fallen defeat, single settlement',
  );
  // The accessors always refer to the active hero; manual swaps preserve individual wounds.
  const manual = await p.evaluate(() => {
    begin();
    const { G } = M;
    M.learn('cheolgol');
    const ids = G.state.formation;
    G.player.hp = 1;
    M.swapHero();
    const reserveHp = G.player.hp;
    G.state.swapReady = 0;
    M.swapHero();
    const firstHp = G.player.hp;
    G.player.inv = 0;
    M.damagePlayer(); // active has 1 HP, falls; the reserve still has 2.
    G.player.inv = 0;
    M.damagePlayer();
    const survived = { mode: G.mode, hp: G.player.hp, max: G.player.maxHp, active: G.state.active };
    M.learn('hoegi');
    G.state.skills.find(s => s.id === 'hoegi').used = false;
    M.trig('blast');
    const healed = G.player.hp;
    M.SKILLS.cheolgol.lose();
    G.state.skills = G.state.skills.filter(s => s.id !== 'cheolgol');
    M.nextStage();
    const afterStage = structuredClone(G.state.heroHealth[ids[0]]);
    M.learn('cheolgol');
    const afterBuff = structuredClone(G.state.heroHealth[ids[0]]);
    return { reserveHp, firstHp, survived, healed, afterStage, afterBuff };
  });
  assert.equal(manual.reserveHp, 2);
  assert.equal(manual.firstHp, 1);
  assert.deepEqual(manual.survived, { mode: 'play', hp: 1, max: 2, active: 1 });
  assert.equal(manual.healed, 2);
  assert.equal(manual.afterStage.hp, 0);
  assert.equal(manual.afterStage.fallen, true);
  assert.equal(manual.afterBuff.hp, 0);
  assert.equal(manual.afterBuff.fallen, true);
  console.log(
    'PASS independent manual-swap health, retained HP buff/heal, buff removal, stage recovery cannot revive fallen heroes',
  );
  for (const defense of ['shield', 'hoechun', 'inv', 'hyper']) {
    const state = await p.evaluate(defense => {
      begin();
      const { G } = M;
      if (defense === 'shield') G.player.shield = 1;
      if (defense === 'hoechun') M.learn('hoechun');
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
  await p.screenshot({ path: '/workspace/artifacts/one-health-auto-replacement.png' });
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
