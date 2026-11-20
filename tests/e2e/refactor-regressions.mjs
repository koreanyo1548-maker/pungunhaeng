import { createServer } from 'vite';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const server = await createServer({ server: { host: '127.0.0.1', port: 5193 } });
await server.listen();
const b = await chromium.launch();
try {
  const p = await b.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(() => {
    window.requestAnimationFrame = () => 0;
  });
  await p.goto('http://127.0.0.1:5193/');
  await p.waitForFunction(() => !document.getElementById('start').disabled, null, { timeout: 120000 });
  await p.evaluate(async () => {
    window.C = await import('/src/core/skill-context.ts');
    window.M = Object.assign(
      {},
      ...(await Promise.all(
        [
          '/src/core/context.ts',
          '/src/core/profile.ts',
          '/src/ui/hud.ts',
          '/src/systems/flow.ts',
          '/src/scenes/gacha.ts',
          '/src/core/skill-context.ts',
          '/src/render/skill-animation.ts',
        ].map(path => import(path)),
      )),
    );
    // Export a higher record, then use the real save-code UI to import it into a lower record.
    M.loadProfile({ best: 99999 });
    window.highCode = M.exportCode();
    M.loadProfile({ best: 0 });
    M.openGacha();
    document.getElementById('saveCode').value = highCode;
    document.getElementById('saveLoad').click();
  });
  assert.equal(await p.locator('#introBest').textContent(), '최고 기록 99,999');
  await p.locator('#gachaClose').click();
  const begin = () =>
    p.evaluate(() => {
      M.start();
      for (let i = 0; i < 3; i++) {
        const confirm = document.getElementById('formationConfirm');
        document.querySelector('#choice button.card').click();
        confirm?.click();
      }
    });
  await begin();
  await p.evaluate(() => {
    M.G.state.score = 100;
    M.end(false);
  });
  assert.equal(await p.evaluate(() => M.profile.best), 99999);
  assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('pungun-profile-v2')).best), 99999);
  await begin();
  await p.evaluate(() => {
    M.G.state.score = 100000;
    M.end(false);
  });
  assert.equal(await p.evaluate(() => M.profile.best), 100000);
  assert.equal(await p.locator('#introBest').textContent(), '최고 기록 100,000');
  await begin();
  const ownership = await p.evaluate(() => {
    const values = [];
    try {
      M.withSkill('outer', () => {
        values.push(C.visualSkill);
        try {
          M.withSkill('inner', () => {
            values.push(C.visualSkill);
            throw new Error('nested');
          });
        } catch {}
        values.push(C.visualSkill);
        throw new Error('outer');
      });
    } catch {}
    values.push(C.visualSkill);
    return values;
  });
  assert.deepEqual(ownership, ['outer', 'inner', 'outer', undefined]);
  // Exercise the real restart path, including renderer-owned state and simulation collections.
  const reset = await p.evaluate(() => {
    M.G.state.skills.push({ id: 'mancheon' });
    M.G.shots.push({ x: 20, y: 20 });
    M.G.hazards.push({ x: 30, y: 30 });
    M.skillCue('mancheon', 240, 400);
    M.skillAura('muyoung', 2);
    M.G.player.hp = 1;
    M.G.state.coins = 42;
    Object.assign(M.G.state, {
      good: 4,
      evil: 2,
      unlocked: ['yakseon'],
      bond: { yakseon: 2 },
      meetTimer: 3,
      encounters: 3,
      passers: 2,
    });
    M.G.state.meetReady = true;
    M.start();
    return {
      hp: M.G.player.hp,
      coins: M.G.state.coins,
      skills: M.G.state.skills.length,
      shots: M.G.shots.length,
      hazards: M.G.hazards.length,
      best: M.profile.best,
      cues: M.skillAnimationSnapshot().cues.length,
      auras: M.skillAnimationSnapshot().auras.length,
      run: [
        M.G.state.good + M.G.state.evil,
        M.G.state.unlocked.length,
        Object.keys(M.G.state.bond).length,
        M.G.state.meetTimer,
        M.G.state.meetReady,
        M.G.state.encounters,
        M.G.state.passers,
      ].join(),
    };
  });
  assert.deepEqual(reset, {
    hp: 1,
    coins: 0,
    skills: 0,
    shots: 0,
    hazards: 0,
    best: 100000,
    cues: 0,
    auras: 0,
    run: '0,0,0,10,false,0,0',
  });
  assert.deepEqual(errors, []);
  console.log(
    'PASS imported best display/persistence, lower and higher run settlement, nested skill scope, real restart (scale, 인연 levels, 만남 wait reset)',
  );
} finally {
  await b.close();
  await server.close();
}
