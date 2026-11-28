// Hero traits (docs/ability-redesign-plan.md, 3장), on the dev server.
// usage: node tests/e2e/hero-kit.mjs
// Checks, for all 12 heroes (the 7 hidden ones too, set directly): their art loads and their trait works while they
// fight. One hero a run since 2026-11 (docs/resonance-plan.md): no second hero, no entry skill; a fall ends the run.
// Also the save code for heroes.
import { createServer } from 'vite';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const server = await createServer({ server: { host: '127.0.0.1', port: 5196 } });
await server.listen();
const browser = await chromium.launch();
const IDS = [
  'pungun',
  'cheolhyeol',
  'mukyoung',
  'bicheon',
  'unhak',
  'hongryeon',
  'yeoncheong',
  'cheongwan',
  'seolyeong',
  'soun',
  'yoran',
  'ayeong',
];
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } }),
    errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    window.requestAnimationFrame = () => 0;
  });
  await page.goto('http://127.0.0.1:5196/#debug&roster');
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
          'systems/hero-effects',
          'systems/quest',
          'systems/combat',
          'entities/player',
          'entities/enemies',
          'render/skill-animation',
          'render/renderer',
          'systems/loop',
          'ui/hud',
        ].map(p => import('/src/' + p + '.ts')),
      )),
    );
    // a run with the given hero, in play, with an empty field and no 조짐. The hero screen lists only the heroes in
    // play, so the first is confirmed and the hero is then set directly (with its start traits)
    window.party = id => {
      M.clearSkillAnimations();
      while (!document.getElementById('stagePrev').disabled) document.getElementById('stagePrev').click(); // S1
      M.start();
      document.querySelectorAll('#choice .party-hero')[0].click();
      document.getElementById('formationConfirm').click();
      const { G } = M;
      for (const h of Object.values(G.state.heroHealth)) Object.assign(h, { hp: 1, maxHp: 1, fallen: false });
      G.state.bombs = 1;
      G.state.hero = id;
      M.applyStartTraits();
      G.state.meetTimer = G.state.meetWait = 1e6;
      G.time = 10;
      G.state.phase = 'flight';
      G.banner = null;
      G.bossIntro = null;
      G.shots = [];
      G.enemies = [];
      G.hazards = [];
      G.pickups = [];
      G.player.inv = 0;
      G.player.fire = 999;
    };
    window.target = (dx = 0, dy = -120) => {
      const { G } = M;
      const e = {
        x: G.player.x + dx,
        baseX: G.player.x + dx,
        y: G.player.y + dy,
        type: 0,
        rank: 0,
        size: 44,
        phase: 0,
        hit: 0,
        row: -1,
        hp: 10000,
        maxHp: 10000,
        r: 20,
        dead: false,
      };
      G.enemies.push(e);
      return e;
    };
    window.hazard = (dx, dy) => {
      const { G } = M;
      const h = { kind: 'bullet', x: G.player.x + dx, y: G.player.y + dy, vx: 0, vy: 0, r: 8, warn: 0 };
      G.hazards.push(h);
      return h;
    };
    // the hero takes a lethal hit (the run ends)
    window.fell = () => {
      const { G } = M;
      G.player.inv = 0;
      G.state.hyper = 0;
      G.player.hp = 1;
      M.damagePlayer();
    };
    window.run = (seconds, dt = 1 / 60) => {
      for (let t = 0; t < seconds; t += dt) M.update(dt);
    };
  });

  // ---------------------------------------------------------------- art and saves
  const art = await page.evaluate(ids => {
    return ids.map(id => ({
      id,
      run: M.heroAnimations[id]?.length,
      portrait: M.heroPictures[id]?.startsWith('data:image/png'),
      entry: 'entry' in M.HEROES[id],
      trait: !!M.HEROES[id].trait.name,
    }));
  }, IDS);
  for (const a of art) assert.deepEqual(a, { id: a.id, run: 4, portrait: true, entry: false, trait: true });
  const migration = await page.evaluate(() => {
    M.loadProfile({ v: 2, coins: 321, heroes: { pungun: 6, bicheon: 3 }, cards: { dosa: 1 } });
    const code = M.exportCode();
    M.loadProfile({});
    M.importCode(code);
    const kept = structuredClone(M.profile);
    M.loadProfile({}); // back to every hero at ★1 (debug roster) for the checks below
    return kept;
  });
  assert.equal(migration.coins, 321);
  assert.equal(migration.heroes.pungun, 6);
  console.log('PASS 12 heroes have art and a trait (no entry skill); save code keeps hero pieces');

  // ---------------------------------------------------------------- traits
  const traits = await page.evaluate(() => {
    const { G } = M,
      out = {};
    // 풍운객: a close kill clears bullets around him
    party('pungun');
    const near = hazard(40, -20),
      far = hazard(150, -20),
      e = target(0, -60);
    M.kill(e);
    out.pungun = { near: !!near.dead, far: !!far.dead };
    // 철혈: +1 health from the start
    party('cheolhyeol');
    out.cheolhyeol = { hp: G.player.hp, max: G.player.maxHp };
    // 묵영: wider graze while he fights
    party('mukyoung');
    out.mukyoung = M.grazeReach();
    // 비천: every 10th kill of a combo sends a homing sword (4 basic shots of damage); other kills do not
    party('bicheon');
    const swords = () => G.shots.filter(s => s.kind === 'sword' && s.homing);
    G.state.combo = 4;
    M.kill(target(80, -200));
    const off = swords().length;
    G.state.combo = 9;
    M.kill(target(80, -200));
    out.bicheon = { off, on: swords().length, power: Math.round((swords()[0]?.damage / M.D()) * 10) / 10 };
    // 홍련: some hits are critical (game random)
    party('hongryeon');
    const t = target();
    let crits = 0;
    for (let i = 0; i < 400; i++) if (M.critical(t, 10) === 20) crits++;
    out.hongryeon = crits / 400;
    // 목청완: basic shots pass through one enemy
    party('cheongwan');
    M.shoot();
    out.cheongwan = G.shots.every(s => s.pierceLeft === 1);
    // 매설영: +50% coins on one a kill, carried between kills (1 and 2)
    party('seolyeong');
    out.seolyeong = [M.coinsForKill(), M.coinsForKill(), M.coinsForKill(), M.coinsForKill()];
    // 한소운: the 무아지경 item lasts 50% longer
    party('soun');
    out.soun = M.hyperItemScale();
    // 아영: attack +20% while she fights
    party('ayeong');
    out.ayeong = Math.round((M.shotPower() / 10) * 100) / 100;
    // 정요란: 조짐 targets −15% while she fights
    party('yoran');
    out.yoran = M.traitActive('yoran');
    out.yoranTarget = M.questTarget({ n: 30 }, 0);
    // 운학: one more 필살기 at the start
    party('unhak');
    out.unhak = G.state.bombs;
    // 황연청: a magnet while she fights; none for another hero
    party('yeoncheong');
    const with_ = M.magnetReach();
    party('pungun');
    out.yeoncheong = { with: with_, without: M.magnetReach() };
    // another hero's trait stays off, on every road
    party('mukyoung');
    G.state.stage = 4; // a 운해 stage
    out.others = { graze: M.grazeReach(), crit: M.traitActive('hongryeon') };
    return out;
  });
  assert.deepEqual(traits.pungun, { near: true, far: false }, '풍운객 clears bullets near a close kill');
  assert.deepEqual(traits.cheolhyeol, { hp: 2, max: 2 });
  assert.equal(traits.mukyoung, 1.4);
  assert.deepEqual(traits.bicheon, { off: 0, on: 1, power: 4 }, '비천: a sword on the 10th combo kill');
  assert.ok(traits.hongryeon > 0.08 && traits.hongryeon < 0.24, 'about 15% crits: ' + traits.hongryeon);
  assert.equal(traits.cheongwan, true);
  assert.deepEqual(traits.seolyeong, [1, 2, 1, 2]);
  assert.equal(traits.soun, 1.5);
  assert.equal(traits.ayeong, 1.2, '아영: attack +20% while she fights');
  assert.equal(traits.yoran, true);
  assert.equal(traits.yoranTarget, 21, '정요란: a 조짐 of 30 (asks 25) asks 21');
  assert.equal(traits.unhak, 2, 'one 필살기 + 1');
  // the magnet reaches BASELINE.magnet.graze (6) × the 스침 거리 while she fights
  assert.ok(traits.yeoncheong.with > 100 && traits.yeoncheong.without === 0, JSON.stringify(traits.yeoncheong));
  assert.deepEqual(traits.others, { graze: 1.4, crit: false });
  console.log('PASS 12 traits, on only for the hero who fights, no road affinity');

  // ---------------------------------------------------------------- 성급, defeat, errors
  const star = await page.evaluate(() => {
    M.loadProfile({ heroes: { pungun: 6 } });
    party('pungun');
    const hero = M.HEROES.pungun.trait.value(M.G.state.meta.heroes.pungun);
    M.loadProfile({});
    return hero;
  });
  assert.equal(star, 100, '풍운객 ★3: radius 100');
  const defeat = await page.evaluate(() => {
    party('pungun');
    fell();
    return window.M.G.mode;
  });
  assert.equal(defeat, 'result', 'a fall ends the run');
  await page.evaluate(() => {
    M.syncHUD();
    M.draw();
  });
  assert.deepEqual(errors, []);
  console.log('PASS 성급 raises the trait, a fall ends the run, no browser errors');
} finally {
  await browser.close();
  await server.close();
}
