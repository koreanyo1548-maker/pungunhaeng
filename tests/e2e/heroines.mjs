import { createServer } from 'vite';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const server = await createServer({ server: { host: '127.0.0.1', port: 5196 } });
await server.listen();
const browser = await chromium.launch();
const out = '/workspace/artifacts/heroines-play';
await mkdir(out, { recursive: true });
const ids = ['yeoncheong', 'cheongwan', 'seolyeong', 'soun', 'yoran', 'ayeong'];
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } }),
    errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    window.requestAnimationFrame = () => 0;
  });
  await page.goto('http://127.0.0.1:5196/#debug');
  await page.waitForFunction(() => !document.getElementById('start').disabled, null, { timeout: 120000 });
  await page.evaluate(async () => {
    window.M = Object.assign(
      {},
      ...(await Promise.all(
        [
          'core/context',
          'core/profile',
          'core/assets',
          'data/heroes',
          'data/roster',
          'systems/flow',
          'systems/formation',
          'systems/hero-actions',
          'entities/player',
          'entities/enemies',
          'render/skill-animation',
          'render/renderer',
          'systems/loop',
          'ui/hud',
        ].map(p => import('/src/' + p + '.ts')),
      )),
    );
  });
  const migration = await page.evaluate(() => {
    M.loadProfile({ v: 2, coins: 321, heroes: { pungun: 6, bicheon: 3 }, cards: { dosa: 1 } });
    const old = structuredClone(M.profile);
    for (const id of M.HERO_IDS) M.profile.heroes[id] = 1;
    M.saveProfile();
    const code = M.exportCode();
    M.loadProfile({});
    M.importCode(code);
    return { old, roundtrip: structuredClone(M.profile) };
  });
  assert.equal(migration.old.coins, 321);
  assert.equal(migration.old.heroes.pungun, 6);
  for (const id of ids) {
    assert.equal(migration.old.heroes[id], 0);
    assert.equal(migration.roundtrip.heroes[id], 1);
  }
  await page.evaluate(() => document.getElementById('openRoster').click());
  assert.equal(await page.locator('#collectionGrid .tile').count(), 12);
  await page.screenshot({ path: out + '/roster.png' });
  await page.evaluate(() => document.getElementById('collectionClose').click());
  await page.evaluate(() => {
    window.begin = () => {
      M.clearHeroActions();
      M.clearSkillAnimations();
      M.start();
      for (let i = 0; i < 3; i++) {
        const c = document.getElementById('formationConfirm');
        document.querySelector('#choice button.card').click();
        c?.click();
      }
      [...document.querySelectorAll('#choice .act')].at(-1).click();
      const { G } = M;
      G.time = 10;
      G.state.phase = 'flight';
      G.banner = null;
      G.bossIntro = null;
      G.shots = [];
      G.enemies = [];
      G.hazards = [];
      G.player.inv = 0;
    };
    window.fixture = id => {
      begin();
      const { G } = M;
      G.state.course = 'ground';
      G.state.formation = ['pungun', id];
      G.state.active = 0;
      G.state.swapReady = 0;
      G.enemies = [
        { x: G.player.x, y: G.player.y - 100, hp: 10000, maxHp: 10000, r: 20, boss: false, dead: false, stun: 0 },
      ];
    };
  });
  for (const id of ids) {
    const r = await page.evaluate(id => {
      fixture(id);
      const { G } = M;
      const loaded = {
        run: M.heroAnimations[id].length,
        cast: M.heroCastAnimations[id].length,
        portrait: M.heroPictures[id].startsWith('data:image/png'),
      };
      M.swapHero();
      const immediate = G.shots.length;
      G.time += 0.159;
      M.updateHeroActions();
      const early = G.shots.length;
      G.time += 0.002;
      M.updateHeroActions();
      const first = { shots: G.shots.length, hp: G.enemies[0].hp };
      for (let i = 0; i < 4; i++) {
        G.time += 0.1;
        M.updateHeroActions();
      }
      const total = { shots: G.shots.length, hp: G.enemies[0].hp };
      G.shots = [];
      M.shoot();
      const basic = G.shots.map(s => ({ skill: s.skill, basic: s.basic }));
      const traits = [M.traitPower(), M.traitFire(), M.traitCharge(), M.traitGraze()];
      G.state.course = 'sky';
      const wrong = [M.traitPower(), M.traitFire(), M.traitCharge(), M.traitGraze()];
      G.state.course = 'ground';
      M.syncHUD();
      M.draw();
      return { loaded, immediate, early, first, total, basic, traits, wrong, hp: G.player.hp };
    }, id);
    assert.deepEqual(r.loaded, { run: 4, cast: 4, portrait: true });
    assert.equal(r.immediate, 0);
    assert.equal(r.early, 0);
    assert.equal(r.hp, 1);
    assert.ok(
      r.traits.some(v => v > 1),
      JSON.stringify({ id, ...r }),
    );
    assert.deepEqual(r.wrong, [1, 1, 1, 1]);
    assert.ok(r.basic.every(s => s.skill === id && s.basic));
    if (id === 'yeoncheong') assert.equal(r.total.shots, 7);
    if (id === 'cheongwan' || id === 'yoran') assert.equal(r.total.shots, 1);
    if (id === 'ayeong') {
      assert.equal(r.first.shots, 1);
      assert.equal(r.total.shots, 3);
    }
    if (id === 'seolyeong') assert.ok(r.total.hp < 10000);
    if (id === 'soun') assert.ok(10000 - r.total.hp > 1.9 * (10000 - r.first.hp));
    const impact = await page.evaluate(id => {
      fixture(id);
      const { G } = M;
      G.enemies = [];
      M.spawnRow();
      G.enemies.forEach((e, i) => {
        e.y = G.player.y - 100 - i * 12;
        e.hp = e.maxHp = 10000;
      });
      G.enemies[2].x = G.enemies[2].baseX = G.player.x;
      G.state.spawn = 999;
      G.player.fire = 999;
      G.player.inv = 999;
      M.swapHero();
      for (let i = 0; i < 25; i++) {
        M.update(0.016);
        M.updateSkillAnimations(0.016);
      }
      const cues = M.skillAnimationSnapshot().cues;
      M.syncHUD();
      M.draw();
      return { damaged: G.enemies.some(e => e.hp < e.maxHp), impact: cues.some(c => c.id === id && c.impact) };
    }, id);
    assert.ok(impact.damaged, id + ' real collision damages enemy');
    assert.ok(impact.impact, id + ' real hit paints impact row');
    await page.screenshot({ path: out + '/' + id + '.png' });
    const death = await page.evaluate(id => {
      fixture(id);
      const { G } = M;
      G.state.swapReady = 999;
      M.damagePlayer();
      const first = { active: G.state.active, hp: G.player.hp, fallen: G.state.heroHealth.pungun.fallen };
      G.time += 0.17;
      M.updateHeroActions();
      G.player.inv = 0;
      M.damagePlayer();
      G.time += 1;
      M.updateHeroActions();
      const count = G.shots.length;
      G.time += 1;
      M.updateHeroActions();
      return { first, mode: G.mode, fallen: G.state.heroHealth[id].fallen, noLate: G.shots.length === count };
    }, id);
    assert.deepEqual(death.first, { active: 1, hp: 1, fallen: true });
    assert.equal(death.mode, 'result');
    assert.ok(death.fallen && death.noLate);
    console.log('PASS', id, 'art, traits, cast timing, basic shots, lethal auto-swap');
  }
  // Aim from the actual muzzle: close lateral targets must not have their direction clamped.
  const aim = await page.evaluate(() => {
    fixture('ayeong');
    const { G } = M;
    G.state.active = 1;
    const enemy = {
      x: G.player.x + 100,
      baseX: G.player.x + 100,
      y: G.player.y - 40,
      type: 0,
      rank: 0,
      size: 44,
      phase: 0,
      hit: 0,
      row: 1,
      hp: 999,
      maxHp: 999,
      r: 20,
      dead: false,
    };
    G.enemies = [enemy];
    M.HEROES.ayeong.fx(1, 0);
    const shot = G.shots[0],
      cross = (enemy.x - shot.x) * shot.vy - (shot.y - enemy.y) * shot.vx;
    G.player.fire = 999;
    G.player.inv = 999;
    for (let i = 0; i < 30; i++) M.update(0.016);
    const hp = enemy.hp;
    fixture('ayeong');
    G.state.active = 1;
    G.enemies = [{ ...enemy, x: G.player.x + 100, y: G.player.y - 10, dead: false }];
    M.HEROES.ayeong.fx(1, 0);
    return { cross, hp, fallback: { vx: G.shots[0].vx, vy: G.shots[0].vy } };
  });
  assert.ok(Math.abs(aim.cross) < 1e-6, 'arrow points at close lateral target from its muzzle');
  assert.ok(aim.hp < 999, 'close lateral target takes damage in the actual simulation');
  assert.deepEqual(aim.fallback, { vx: 0, vy: 1050 }, 'target behind muzzle is ignored');
  for (const id of ['seolyeong', 'soun']) {
    const effects = await page.evaluate(id => {
      fixture(id);
      const { G } = M;
      G.enemies = [];
      M.swapHero();
      G.time += 0.161;
      M.updateHeroActions();
      const empty = M.skillAnimationSnapshot().cues;
      fixture(id);
      M.swapHero();
      G.time += 0.161;
      M.updateHeroActions();
      const hit = M.skillAnimationSnapshot().cues;
      return { empty, hit, hp: G.enemies[0].hp, target: { x: G.enemies[0].x, y: G.enemies[0].y } };
    }, id);
    assert.ok(
      effects.empty.some(c => c.effectRow === 1),
      id + ' retains swing on miss',
    );
    assert.ok(
      effects.empty.every(c => !c.impact),
      id + ' has no impact without a target',
    );
    assert.ok(effects.hp < 10000, id + ' retains area damage');
    assert.ok(
      effects.hit.some(c => c.impact),
      id + ' retains real hit impact',
    );
    assert.ok(
      effects.hit
        .filter(c => c.impact)
        .every(c => c.x === effects.target.x && c.y === effects.target.y && c.size === 62),
      id + ' impacts only at the struck enemy',
    );
  }
  console.log('PASS close lateral aim, forward muzzle targeting, no impact on miss, real hit impacts retained');
  const canceled = await page.evaluate(() => {
    fixture('ayeong');
    const { G } = M;
    M.swapHero();
    G.time += 0.17;
    M.updateHeroActions();
    const before = G.shots.length;
    G.state.swapReady = 0;
    M.swapHero();
    const after = G.shots.length;
    G.time += 1;
    M.updateHeroActions();
    return { before, after, final: G.shots.length };
  });
  assert.equal(canceled.before, 1);
  assert.equal(canceled.after, canceled.final);
  const chosen = await page.evaluate(() => {
    M.start();
    document.querySelector('#choice button.card').click();
    for (const name of ['목청완', '아영']) {
      [...document.querySelectorAll('#choice button.card')]
        .find(c => c.querySelector('h3')?.textContent === name)
        .click();
      document.getElementById('formationConfirm').click();
    }
    [...document.querySelectorAll('#choice .act')].at(-1).click();
    return { formation: [...M.G.state.formation], mode: M.G.mode };
  });
  assert.deepEqual(chosen, { formation: ['cheongwan', 'ayeong'], mode: 'play' });
  assert.deepEqual(errors, []);
  console.log('PASS old save migration, save-code roundtrip, 12 portraits, cancellation and no browser errors');
} finally {
  await browser.close();
  await server.close();
}
