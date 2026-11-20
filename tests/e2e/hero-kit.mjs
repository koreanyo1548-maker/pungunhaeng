// Hero traits and entry skills (docs/ability-redesign-plan.md, 3장 and 7장), on the dev server.
// usage: node tests/e2e/hero-kit.mjs
// Checks, for all 12 heroes: their art loads, their trait works (and only while it should), the second hero enters
// with their entry skill when the vanguard falls, and each entry skill does its job, lasts its time and ends.
// Also the save migration for heroes and the formation by name.
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
    // a run with the given party, in play, with an empty field
    window.party = (first, second) => {
      M.clearSkillAnimations();
      M.start();
      document.querySelector('#choice button.card').click(); // S1 산길
      for (const id of [first, second]) {
        const name = M.HEROES[id].name;
        [...document.querySelectorAll('#choice button.card')]
          .find(c => c.querySelector('h3')?.textContent === name)
          .click();
        document.getElementById('formationConfirm').click();
      }
      const { G } = M;
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
    // the vanguard takes a lethal hit; the second hero enters
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
      entry: !!M.HEROES[id].entry.name,
      trait: !!M.HEROES[id].trait.name,
    }));
  }, IDS);
  for (const a of art) assert.deepEqual(a, { id: a.id, run: 4, portrait: true, entry: true, trait: true });
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
  console.log('PASS 12 heroes have art, a trait and an entry skill; save code keeps hero pieces');

  // ---------------------------------------------------------------- traits
  const traits = await page.evaluate(() => {
    const { G } = M,
      out = {};
    // 풍운객: a close kill clears bullets around him
    party('pungun', 'mukyoung');
    const near = hazard(40, -20),
      far = hazard(150, -20),
      e = target(0, -60);
    M.kill(e);
    out.pungun = { near: !!near.dead, far: !!far.dead };
    // 철혈: +1 health from the start (as vanguard and as second)
    party('cheolhyeol', 'mukyoung');
    out.cheolhyeolFirst = { hp: G.player.hp, max: G.player.maxHp };
    party('mukyoung', 'cheolhyeol');
    out.cheolhyeolSecond = structuredClone(G.state.heroHealth.cheolhyeol);
    // 묵영: wider graze while he fights
    party('mukyoung', 'pungun');
    out.mukyoung = M.grazeReach();
    // 비천: every 10th kill of a combo sends a homing sword (4 basic shots of damage); other kills do not
    party('bicheon', 'pungun');
    const swords = () => G.shots.filter(s => s.kind === 'sword' && s.homing);
    G.state.combo = 4;
    M.kill(target(80, -200));
    const off = swords().length;
    G.state.combo = 9;
    M.kill(target(80, -200));
    out.bicheon = { off, on: swords().length, power: Math.round((swords()[0]?.damage / M.D()) * 10) / 10 };
    party('pungun', 'bicheon');
    G.state.combo = 9;
    M.kill(target(80, -200));
    out.bicheonWaiting = swords().length;
    // 홍련: some hits are critical (game random)
    party('hongryeon', 'pungun');
    const t = target();
    let crits = 0;
    for (let i = 0; i < 400; i++) if (M.critical(t, 10) === 20) crits++;
    out.hongryeon = crits / 400;
    // 목청완: basic shots pass through one enemy
    party('cheongwan', 'pungun');
    M.shoot();
    out.cheongwan = G.shots.every(s => s.pierceLeft === 1);
    // 매설영: +50% coins on one a kill, carried between kills (1 and 2)
    party('seolyeong', 'pungun');
    out.seolyeong = [M.coinsForKill(), M.coinsForKill(), M.coinsForKill(), M.coinsForKill()];
    // 한소운: the 무아지경 item lasts 50% longer
    party('soun', 'pungun');
    out.soun = M.hyperItemScale();
    // 아영: attack +20% while she fights (her trait; it used to be one more attack level)
    party('ayeong', 'pungun');
    out.ayeong = Math.round((M.shotPower() / 10) * 100) / 100;
    // 정요란: 의뢰 targets −15% while she fights
    party('yoran', 'pungun');
    out.yoran = M.traitActive('yoran');
    out.yoranTarget = M.questTarget({ n: 30 }, 0);
    // 운학 (party): one more 필살기 at the start, even as second
    party('pungun', 'unhak');
    out.unhak = G.state.bombs;
    // 황연청 (party): a magnet even as second; none once she has fallen (there is no magnet without her)
    party('pungun', 'yeoncheong');
    const second = M.magnetReach();
    party('yeoncheong', 'pungun');
    const first = M.magnetReach();
    fell();
    out.yeoncheong = { second, first, afterFall: M.magnetReach() };
    // traits of the hero who does not fight stay off (self scope), on every road
    party('mukyoung', 'hongryeon');
    G.state.stage = 4; // a 운해 stage
    out.offWhileWaiting = { graze: M.grazeReach(), crit: M.traitActive('hongryeon') };
    return out;
  });
  assert.deepEqual(traits.pungun, { near: true, far: false }, '풍운객 clears bullets near a close kill');
  assert.deepEqual(traits.cheolhyeolFirst, { hp: 2, max: 2 });
  assert.deepEqual(traits.cheolhyeolSecond, { hp: 2, maxHp: 2, fallen: false });
  assert.equal(traits.mukyoung, 1.4);
  assert.deepEqual(traits.bicheon, { off: 0, on: 1, power: 4 }, '비천: a sword on the 10th combo kill');
  assert.equal(traits.bicheonWaiting, 0, '비천 waiting: no sword');
  assert.ok(traits.hongryeon > 0.08 && traits.hongryeon < 0.24, 'about 15% crits: ' + traits.hongryeon);
  assert.equal(traits.cheongwan, true);
  assert.deepEqual(traits.seolyeong, [1, 2, 1, 2]);
  assert.equal(traits.soun, 1.5);
  assert.equal(traits.ayeong, 1.2, '아영: attack +20% while she fights');
  assert.equal(traits.yoran, true);
  assert.equal(traits.yoranTarget, 21, '정요란: an 의뢰 of 30 (asks 25) asks 21');
  assert.equal(traits.unhak, 2, 'one 필살기 + 1');
  assert.deepEqual(traits.yeoncheong, { second: 2, first: 2, afterFall: 0 });
  assert.deepEqual(traits.offWhileWaiting, { graze: 1.4, crit: false });
  console.log('PASS 12 traits, their scope (self / party), no road affinity, party trait off after a fall');

  // ---------------------------------------------------------------- entry skills
  const entries = await page.evaluate(ids => {
    const { G } = M,
      out = {};
    for (const id of ids) {
      const first = id === 'pungun' ? 'hongryeon' : 'pungun';
      party(first, id);
      const r = { active: null, hero: null, total: 0 };
      fell();
      r.active = G.state.formation[G.state.active];
      r.hero = G.state.effect?.hero;
      r.via = G.state.effect?.via;
      r.total = G.state.effect?.total;
      G.player.inv = 0;
      // what the skill does, checked a moment after it starts
      switch (id) {
        case 'cheolhyeol': {
          const e = target(0, -60),
            hp = G.player.hp;
          G.player.inv = 0;
          M.damagePlayer();
          r.check = { kept: G.player.hp === hp, hp, hit: e.hp < e.maxHp };
          break;
        }
        case 'mukyoung':
          M.shoot();
          r.check = G.shots.length; // 2 shots + 2 from one clone
          break;
        case 'bicheon': {
          G.player.inv = 99;
          const hs = [0, 1, 2, 3, 4, 5].map(i => hazard(Math.cos(i) * 62, -10 + Math.sin(i) * 62));
          run(1.6);
          r.check = hs.filter(h => h.dead).length > 0;
          break;
        }
        case 'unhak': {
          G.player.inv = 99;
          const h = hazard(60, -40);
          run(0.05);
          r.check = !!h.dead;
          break;
        }
        case 'hongryeon':
        case 'pungun':
          r.check = M.critical(target(), 10);
          break;
        case 'cheongwan':
          G.player.inv = 99;
          run(0.05);
          r.check = G.shots.some(s => s.pierce && s.w === 16);
          break;
        case 'seolyeong':
          r.check = M.hazardSpeed();
          break;
        case 'soun':
          r.check = G.state.hyper;
          break;
        case 'yoran': {
          G.player.inv = 99;
          const h = hazard(10, -50);
          run(0.05);
          r.check = !!h.dead && G.shots.some(s => s.homing);
          break;
        }
        case 'ayeong':
          M.shoot();
          r.check = G.shots.every(s => s.homing);
          break;
        case 'yeoncheong':
          G.player.inv = 99;
          target(0, -300);
          run(0.6);
          r.check = G.shots.filter(s => s.homing).length;
          break;
      }
      // it ends after its time, and a new run starts without it
      G.player.inv = 999;
      G.state.hyper = 0;
      // no 만남 while it runs out
      G.state.meetTimer = 1e6;
      if (G.state.quest) G.state.quest.left = 1e6;
      // a little extra: kills cause short hit-stops that slow game time
      run(r.total + 3, 1 / 20);
      r.ended = G.state.effect === null;
      r.mode = G.mode;
      out[id] = r;
    }
    party('pungun', 'mukyoung');
    out.fresh = G.state.effect;
    return out;
  }, IDS);
  for (const id of IDS) {
    const r = entries[id];
    assert.equal(r.active, id, id + ' enters');
    assert.equal(r.hero, id === 'pungun' ? 'hongryeon' : id, id + ' entry skill');
    assert.ok(r.ended && r.mode === 'play', id + ' entry skill ends: ' + JSON.stringify(r));
  }
  assert.equal(entries.pungun.via, 'pungun', '풍운객 casts the fallen vanguard skill (계승)');
  assert.equal(entries.pungun.check, 20, '계승 of 홍련화: every hit critical');
  assert.equal(entries.pungun.total, 15, '계승 lasts as long as the vanguard skill at ★1');
  assert.deepEqual(entries.cheolhyeol.check, { kept: true, hp: 2, hit: true }, '불굴: no health lost, shockwave');
  assert.equal(entries.mukyoung.check, 2, '그림자 분신 copies the basic attack (one shot each)');
  assert.equal(entries.bicheon.check, true, '어검진 blocks hazards');
  assert.equal(entries.unhak.check, true, '학의 장막 clears hazards inside');
  assert.equal(entries.hongryeon.check, 20, '홍련화: every hit critical');
  assert.equal(entries.cheongwan.check, true, '관창 throws piercing spears');
  assert.equal(entries.seolyeong.check, 0.5, '음풍 halves hazard speed');
  assert.ok(entries.soun.check >= 8, '질풍 starts 무아지경');
  assert.equal(entries.yoran.check, true, '정심반사 turns a hazard into a homing shot');
  assert.equal(entries.ayeong.check, true, '매의 눈 aims basic shots');
  assert.ok(entries.yeoncheong.check >= 1, '은침 비 fires homing needles');
  assert.equal(entries.fresh, null, 'a new run has no entry skill running');
  console.log(
    'PASS 12 entry skills start when the vanguard falls, do their job, end on time; 계승 casts the vanguard skill',
  );

  // ---------------------------------------------------------------- 성급: ★3 and ★5 change entry skills
  const stars = await page.evaluate(() => {
    const { G } = M,
      out = {};
    const at = pieces =>
      M.loadProfile({ heroes: { mukyoung: pieces, bicheon: pieces, cheongwan: pieces, pungun: pieces } });
    for (const [label, pieces] of [
      ['s1', 1],
      ['s3', 6],
      ['s5', 15],
    ]) {
      at(pieces);
      party('pungun', 'mukyoung');
      fell();
      G.shots = [];
      M.shoot();
      const clones = G.shots.length - 1;
      party('pungun', 'bicheon');
      fell();
      const swords = M.swordPositions().length;
      party('pungun', 'cheongwan');
      fell();
      G.player.inv = 99;
      G.shots = [];
      M.update(1 / 60);
      const spears = G.shots.filter(s => s.w === 16).length;
      party('hongryeon', 'pungun');
      fell();
      out[label] = { clones, swords, spears, inherit: G.state.inheritTrait ?? null, time: G.state.effect.total };
    }
    M.loadProfile({});
    return out;
  });
  assert.deepEqual(stars.s1, { clones: 1, swords: 3, spears: 1, inherit: null, time: 15 });
  assert.deepEqual(stars.s3, { clones: 2, swords: 5, spears: 2, inherit: null, time: 25.5 });
  assert.deepEqual(stars.s5, { clones: 3, swords: 5, spears: 2, inherit: 'hongryeon', time: 28.5 });
  console.log('PASS 성급 ★3·★5: more clones, swords and spears; 계승 lasts longer and, at ★5, carries the trait');

  // ---------------------------------------------------------------- defeat, formation by name, errors
  const defeat = await page.evaluate(() => {
    party('pungun', 'mukyoung');
    fell();
    window.M.G.state.effect = null;
    fell();
    return window.M.G.mode;
  });
  assert.equal(defeat, 'result', 'both fallen: defeat');
  const chosen = await page.evaluate(() => {
    party('cheongwan', 'ayeong');
    return [...M.G.state.formation];
  });
  assert.deepEqual(chosen, ['cheongwan', 'ayeong']);
  await page.evaluate(() => {
    M.syncHUD();
    M.draw();
  });
  assert.deepEqual(errors, []);
  console.log('PASS defeat when both fall, formation by name, no browser errors');
} finally {
  await browser.close();
  await server.close();
}
