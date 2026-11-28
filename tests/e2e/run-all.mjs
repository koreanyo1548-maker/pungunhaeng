// End-to-end flow tests on the built single file (run `npm run build:single` first).
// usage: node tests/e2e/run-all.mjs [build.html]
// The run flow (docs/resonance-plan.md): stage select → hero (one a run) → flight ↔ 공명의 조짐 / 공명 → boss → result.
// Scenario A (S1 산길 and S4 부유암): the first 조짐 opens with the stage (one card, a tap or 10 s), left-right movement
//   only, Q does nothing, a met 조짐 opens the 공명 choice (three 공명 기술, new or the next level), levels up to 3,
//   three slots, no more 조짐 once everything is at its last level; distance → boss → victory; the scene sequence.
// Scenario B: every 공명 기술 does what its level says (shots, blades, cooldowns, windows, reach), and the choice
//   offers only what can still be given.
// Scenario C: stages and saving: a new save opens S1 only, beating S1 opens S2 (once), death → result, 엽전 banked.
// Scenario D: 조짐 timing: the first at once, 60 s each (run out: it fails, 3 s later it is announced, then the card),
//   a met 조짐: the 공명 choice, 4.4 s to the announcement; 정요란 cuts targets, 필살기 count (no charge), 스침 and
//   근접 처치 counts, a 조짐 carried into the boss fight (its clock stopped) and met there, no 조짐 in the boss fight.
// Scenario E: 엽전과 뽑기 (새 저장, 엽전 보관 → 1회·10회 뽑기는 영웅 조각만, 저장 코드, 손상된 저장 복구, 다 모으면 뽑기 불가).
// Scenario F: 영웅 (시작 영웅 2명, 잠긴 영웅은 미리보기만, 조각으로 합류·성급, 레벨업·최대 레벨, 다음 판 반영).
// Scenario G: 인연 are disconnected (2026-11): no 인연 tile, a met 조짐 raises no 호감도, the save keeps 호감도.
import { DEFAULT_BUILD, check, launch, openGame } from '../lib/harness.mjs';

const file = process.argv[2] || DEFAULT_BUILD;
const S = () => {
  const s = window.__g.state;
  return {
    mode: window.__g.mode,
    stage: s.stage,
    phase: s.phase,
    coins: s.coins,
    hp: window.__g.player.hp,
    maxHp: window.__g.player.maxHp,
    y: window.__g.player.y,
    hero: s.hero,
    bombs: s.bombs,
    meetTimer: s.meetTimer,
    meetReady: s.meetReady,
    pickReady: s.pickReady,
    encounters: s.encounters,
    resonances: s.resonances,
    skills: s.skills.map(k => k.id + ':' + k.level),
    quest: s.quest && { t: s.quest.t, done: s.quest.done, failed: s.quest.failed },
    path: s.path.map(p => ({ t: p.t, result: p.result })),
    seed: window.__g.seed,
  };
};
const SIGN_TYPES = ['graze', 'step', 'nearKill', 'rowClear', 'combo'];
const SKILL_NAMES = [
  '기탄',
  '태극운검',
  '녹림도법',
  '잔영검',
  '붕산권',
  '천마군림',
  '어검진',
  '홍련화',
  '그림자 분신',
  '관창',
];

/** lobby: the stage card (index, 0 = S1) → 강호에 나서기 → the hero → 출발: the first 조짐 is taken, play runs */
async function setup(g, stage = 0, opts = {}) {
  await g.eval(() => window.__g.traceScenes());
  await setupFrom(g, stage, opts);
}
/** from the lobby: stage card → 강호에 나서기 → hero (grid index `hero`) → 출발; the first 조짐 card opens with the
 *  stage: tapped unless `keepSign` */
async function setupFrom(g, stage, { hero = 0, keepSign = false } = {}) {
  await g.setOut(stage);
  await g.step(2);
  await g.party(hero);
  await g.step(2);
  if (!keepSign && (await g.mode()) === 'choice') {
    await g.act(0);
    await g.step(2);
  }
}

/** open a 조짐 card now (as its time would), unless a card is open already */
async function meet(g) {
  if ((await g.mode()) === 'choice') return;
  await g.eval(() => window.__g.readyMeet());
  await g.step(2);
}

/** skip the wait after a 조짐 ends and its announcement: the next card opens */
async function nextMeet(g) {
  await g.eval(() => {
    const s = window.__g.state;
    if (!s.meetArrive) s.meetTimer = Math.min(s.meetTimer, 0.01);
  });
  await g.step(2);
  await g.eval(() => {
    const s = window.__g.state;
    if (s.meetArrive) s.meetArrive.left = 0.01;
  });
  await g.step(3);
}

/** meet the running 조짐's target; the 공명 choice opens at the next step (left open) */
async function succeed(g) {
  await g.eval(() => {
    const q = window.__g.state.quest;
    if (q.t === 'combo') window.__g.state.combo = 999;
    window.__g.questEvent(q.t, 999);
  });
  await g.step(2);
}
/** the 공명 choice's cards: title, tag and text */
const offers = g =>
  g.page.$$eval('#choice button.card', els =>
    els.map(e => ({
      title: e.querySelector('h3')?.textContent ?? '',
      tag: e.querySelector('.tag')?.textContent ?? '',
      text: e.textContent,
    })),
  );

/** stand still until the hero falls (answering any card on the way); capped at 3 minutes of game time */
async function waitForDeath(g) {
  for (let i = 0; i < 180 && (await g.mode()) !== 'result'; i++) {
    if ((await g.mode()) === 'choice') {
      // a 조짐 card: a tap takes it; a 공명 choice: its first card
      await g.eval(() => document.querySelector('#choice .card')?.click());
      await g.eval(() => {
        window.__g.player.inv = 0;
      });
    }
    await g.seconds(1);
  }
}

/** the rest of the distance, the warning, then the boss; returns the phase */
async function reachBoss(g) {
  await g.eval(() => window.__g.skipFlight());
  await g.seconds(4.5);
  return g.state(() => window.__g.state.phase);
}
async function killBoss(g) {
  await g.eval(() => window.__g.killBoss());
  await g.seconds(3.5);
}
/** one weak enemy per count in the field, then a 필살기 kills them all */
const blastKills = (g, n) =>
  g.eval(n => {
    const G = window.__g;
    G.enemies.length = 0;
    for (let i = 0; i < n; i++)
      G.enemies.push({
        x: 240,
        baseX: 240,
        y: 300,
        hp: 1,
        maxHp: 1,
        type: 1,
        rank: 0,
        size: 40,
        r: 18,
        phase: 0,
        hit: 0,
        dead: false,
        row: -1,
      });
    G.state.bombs = Math.max(1, G.state.bombs);
    const button = document.getElementById('blast');
    button.disabled = false;
    button.click();
  }, n);

async function scenarioA(browser, stage, seed) {
  const f = [];
  const g = await openGame(file, { browser, seed });
  const log = [];
  await g.eval(() => window.__g.traceScenes());
  // the lobby opens on the highest open stage: all six in the debug roster
  const lobby = await g.lobby();
  check(
    f,
    lobby.dots === 6 && lobby.on === 6 && /S6/.test(lobby.text) && /천마성/.test(lobby.text) && lobby.start,
    `lobby: six stages, S6 shown first (${JSON.stringify(lobby)})`,
  );
  // the hero screen: one hero, no 선봉 · 후발 slots
  await g.setOut(stage);
  await g.step(2);
  const pickScreen = await g.eval(() => ({
    title: document.getElementById('choiceTitle').textContent,
    slots: document.querySelectorAll('#choice .party-slot').length,
    chosen: document.querySelectorAll('#choice .party-hero.sel').length,
  }));
  check(
    f,
    pickScreen.title === '영웅' && pickScreen.slots === 0 && pickScreen.chosen === 1,
    `the hero screen: one hero chosen, no party slots (${JSON.stringify(pickScreen)})`,
  );
  await g.party(1);
  await g.step(2);
  let s = await g.state(S);
  check(f, s.seed === seed, `seed forced by URL (#seed=${seed})`);
  // the first 조짐 opens with the stage: one card, no buttons, a tap or 10 s
  const card = await g.eval(() => ({
    title: document.getElementById('choiceTitle').textContent,
    offers: [...document.querySelectorAll('#choice .encounter-offer')].map(b => b.textContent),
    buttons: document.querySelectorAll('#choice .act').length,
    tap: document.querySelector('#choice .encounter-tap')?.textContent ?? '',
  }));
  check(
    f,
    s.mode === 'choice' &&
      s.stage === stage + 1 &&
      s.encounters === 1 &&
      card.title === '공명의 조짐' &&
      card.offers.length === 1 &&
      card.buttons === 0 &&
      /공명/.test(card.offers[0]) &&
      /60초 이내/.test(card.offers[0]) &&
      /화면을 누르면 시작 10/.test(card.tap),
    `S${stage + 1}: the first 조짐 at once, one card, tap or 10 s (${JSON.stringify(card)})`,
  );
  check(
    f,
    s.hero !== 'pungun' && s.bombs === 1 && s.skills.length === 0,
    `one hero (${s.hero}), 필살기 1, no 공명 기술 yet`,
  );
  await g.act(0);
  await g.step(2);
  s = await g.state(S);
  check(
    f,
    s.mode === 'play' && SIGN_TYPES.includes(s.quest?.t) && s.path.at(-1).result === '진행 중',
    `the 조짐 is taken (${JSON.stringify(s.quest)})`,
  );
  const hud = await g.eval(() => [
    document.getElementById('stage').textContent,
    document.getElementById('stageName').textContent,
    document.getElementById('questTitle').textContent,
  ]);
  check(
    f,
    /^S\d .+ · 조짐 \d+%$/.test(hud[0]) && /공명 0번 · 보스까지/.test(hud[1]) && hud[2] === '조짐',
    `stage box: 조짐 time and distance, the 조짐 strip (${hud})`,
  );

  // attack and health are whole numbers from the tier ladder (docs/balance-baseline.md): no distance multiplier
  const stats = await g.eval(() => {
    const G = window.__g,
      d = G.state.distance,
      out = {};
    G.state.distance = 0;
    out.start = G.stats;
    G.state.distance = 10000;
    out.at10km = G.stats;
    G.state.distance = d;
    return out;
  });
  check(
    f,
    JSON.stringify(stats.start) === JSON.stringify({ attack: 10, tiers: [10, 30, 40, 60, 80, 120], boss: 2400 }) &&
      JSON.stringify(stats.at10km) === JSON.stringify(stats.start),
    `attack 10, tier health 1·3·4·6·8·12 shots, boss 30 s (2400), no distance multiplier (${JSON.stringify(stats)})`,
  );
  await g.seconds(3);
  const spawned = await g.eval(() => window.__g.enemies.filter(e => !e.boss).map(e => e.maxHp));
  check(
    f,
    spawned.length > 0 && spawned.every(h => Number.isInteger(h)),
    `spawned enemies have whole-number health (${spawned})`,
  );
  // movement is left-right on every stage: up does nothing; Q does nothing either
  const y0 = (await g.state(S)).y;
  await g.page.keyboard.down('ArrowUp');
  await g.seconds(0.5);
  await g.page.keyboard.up('ArrowUp');
  await g.key('q');
  await g.step(2);
  s = await g.state(S);
  check(f, s.y === y0 && s.hero === (await g.eval(() => window.__g.state.hero)), `no up-down movement, no swap`);
  await g.eval(() => window.__g.god());

  // 공명 1: the 조짐 met → the 공명 choice: three new 공명 기술
  await g.eval(() => {
    window.__g.pickups.length = 0;
    window.__g.enemies.length = 0;
  });
  await succeed(g);
  let o = await offers(g);
  check(
    f,
    (await g.mode()) === 'choice' &&
      (await g.choiceTitle()) === '공명' &&
      o.length === 3 &&
      new Set(o.map(c => c.title)).size === 3 &&
      o.every(c => SKILL_NAMES.includes(c.title) && c.tag === '새 기술'),
    `a met 조짐: the 공명 choice, three new 공명 기술 (${JSON.stringify(o.map(c => c.title + '/' + c.tag))})`,
  );
  const first = o[0].title;
  await g.pick(0);
  await g.step(2);
  s = await g.state(S);
  const chip = await g.eval(() => document.querySelector('#skills .chip')?.textContent);
  check(
    f,
    s.mode === 'play' && s.skills.length === 1 && /:1$/.test(s.skills[0]) && s.resonances === 1 && chip === '1',
    `picked ${first}: held at Lv 1, its chip shows 1 (${s.skills}, chip ${chip})`,
  );
  check(f, s.path.at(-1).result === '성취', 'path records 성취');

  // 공명 2–3: pick the held skill's next level each time (when offered), up to Lv 3
  for (let k = 0; k < 2; k++) {
    await nextMeet(g);
    check(f, (await g.mode()) === 'choice' && (await g.choiceTitle()) === '공명의 조짐', `조짐 ${k + 2} is open`);
    await g.act(0);
    await g.step(2);
    await succeed(g);
    o = await offers(g);
    const up = o.findIndex(c => c.title === first);
    check(
      f,
      up < 0 || o[up].tag.startsWith(`Lv ${k + 1} → ${k + 2}`),
      `a held skill is offered as its next level (${JSON.stringify(o.map(c => c.title + '/' + c.tag))})`,
    );
    if (up >= 0) await g.pick(up);
    else {
      // not offered this time (the roll): take another, and raise it as the choice would have
      await g.pick(0);
      await g.eval(() => window.__g.learn(window.__g.state.skills[0].id));
    }
    await g.step(2);
  }
  s = await g.state(S);
  check(
    f,
    s.skills.some(k => k.endsWith(':3')),
    `a skill reached Lv 3 (${s.skills})`,
  );
  // three slots: once full, only the held skills are offered; at Lv 3 nothing is left and no 조짐 comes
  const slots = await g.eval(() => {
    const G = window.__g,
      st = G.state,
      free = ['gitan', 'gwanchang', 'eogeom', 'grimja'].filter(id => !st.skills.some(k => k.id === id));
    while (st.skills.length < 3) G.learn(free.shift());
    const full = G.candidates();
    for (const k of st.skills) while (k.level < 3) G.learn(k.id);
    G.learn(st.skills[0].id); // past Lv 3: nothing changes
    return {
      held: st.skills.map(k => k.id),
      full,
      levels: st.skills.map(k => k.level),
      after: G.candidates(),
    };
  });
  check(
    f,
    slots.full.length > 0 &&
      slots.full.every(id => slots.held.includes(id)) &&
      slots.levels.join() === '3,3,3' &&
      slots.after.length === 0,
    `3 slots: only held skills offered, Lv 3 is the last, then nothing (${JSON.stringify(slots)})`,
  );
  await g.eval(() => {
    const st = window.__g.state;
    if (st.quest && !st.quest.done) st.quest.left = 0.01;
  });
  await g.seconds(1);
  await g.eval(() => (window.__g.state.meetTimer = 0.01));
  await g.seconds(3);
  check(f, (await g.mode()) === 'play' && !(await g.state(S)).meetReady, 'nothing left to give: no 조짐 comes');

  // distance → warning → boss → victory
  const phase = await reachBoss(g);
  check(f, phase === 'boss', `the boss comes after the distance (phase ${phase})`);
  await killBoss(g);
  s = await g.state(S);
  const title = await g.page.$eval('#resultTitle', e => e.textContent);
  check(f, s.mode === 'result' && title === '강호행 승리', `beating the boss ends the run (${title})`);
  const wantScenes = [
    'hero',
    'stage',
    'encounter',
    'stage',
    'resonance',
    'stage',
    ...Array(2).fill(['encounter', 'stage', 'resonance', 'stage']).flat(),
    'result',
  ];
  const got = await g.eval(() => window.__g.sceneLog);
  check(
    f,
    got.join() === wantScenes.join(),
    `scene sequence\n       want ${wantScenes.join(' → ')}\n       got  ${got.join(' → ')}`,
  );
  // the result: the score, the 엽전 with the boss bonus (no 정도 or 사도 bonus any more)
  const result = await g.eval(() => ({
    score: document.getElementById('scoreRows').textContent,
    coins: document.getElementById('coinRows').textContent,
  }));
  check(
    f,
    /기본 점수/.test(result.score) &&
      !/정도|사도/.test(result.score + result.coins) &&
      /남은 엽전/.test(result.coins) &&
      /보스 처치\+300냥/.test(result.coins),
    `the result shows the score and 엽전 with their bonuses (${JSON.stringify(result)})`,
  );
  check(f, g.errors.length === 0, 'no page errors: ' + g.errors.join(' | '));
  log.push(`S${stage + 1}: ${title}, ${s.hero}, skills ${s.skills}`);
  await g.page.close();
  return { name: `A stage ${stage + 1} seed ${seed}`, failures: f, log };
}

async function scenarioB(browser, seed) {
  const f = [];
  const g = await openGame(file, { browser, seed });
  await setup(g, 0, { keepSign: true });
  // left alone, the 조짐 card takes itself after 10 s
  await g.seconds(5);
  const waiting = await g.eval(() => ({
    mode: window.__g.mode,
    tap: document.querySelector('#choice .encounter-tap')?.textContent ?? '',
  }));
  await g.seconds(5.2);
  let s = await g.state(S);
  check(
    f,
    waiting.mode === 'choice' && /화면을 누르면 시작 5/.test(waiting.tap) && s.mode === 'play' && !!s.quest,
    `the card counts down and takes the 조짐 by itself (${JSON.stringify(waiting)}, ${s.mode})`,
  );
  await g.eval(() => window.__g.god());
  // each 공명 기술 at Lv 1 and Lv 3 on a quiet field: what it fires, how often, how hard (data/skills.ts)
  const run = (id, level, seconds, before) =>
    g.eval(
      ([id, level, seconds, before]) => {
        const G = window.__g,
          st = G.state,
          D = G.stats.attack;
        G.enemies.length = 0;
        G.hazards.length = 0;
        G.pickups.length = 0;
        G.shots.length = 0;
        st.skills = [{ id, level }];
        st.meetTimer = st.meetWait = 1e6;
        if (st.quest) st.quest.left = 1e6;
        st.showerSteps = [1, 2, 3, 4, 5, 6];
        st.rowTimer = 1e6;
        G.player.x = G.player.target = 240;
        const dummy = (x, y, hp = 1e6) => {
          const e = {
            x,
            baseX: x,
            y,
            pinY: y,
            hp,
            maxHp: hp,
            type: 1,
            rank: 0,
            size: 80,
            r: 22,
            phase: 0,
            hit: 0,
            dead: false,
            row: -1,
          };
          G.enemies.push(e);
          return e;
        };
        const ctx = { dummy, D, G };
        if (before) new Function('ctx', before)(ctx);
        const shots = [];
        const seen = new Set();
        const frames = Math.round(seconds * 60);
        for (let i = 0; i < frames; i++) {
          window.__step(1);
          // the dummies stay where they were put (rows would carry them down)
          for (const e of G.enemies) if (e.pinY !== undefined) e.y = e.pinY;
          for (const sh of G.shots)
            if (!sh.basic && !seen.has(sh)) (seen.add(sh), shots.push({ kind: sh.kind, damage: sh.damage / D }));
        }
        return {
          shots,
          enemies: G.enemies.map(e => +((e.maxHp - e.hp) / D).toFixed(2)),
          basic: G.shots.filter(x => x.basic).length,
          extra: ctx.extra,
        };
      },
      [id, level, seconds, before],
    );
  const count = (r, kind) => r.shots.filter(x => x.kind === kind).length;
  // 기탄: every 1 s, 2 / 4 homing orbs of 200%
  const gitan1 = await run('gitan', 1, 1.5),
    gitan3 = await run('gitan', 3, 1.5);
  check(
    f,
    count(gitan1, 'orb') === 4 && count(gitan3, 'orb') === 8 && gitan1.shots.every(x => x.damage === 2),
    `기탄: 2 → 4 orbs a second, 200% (${count(gitan1, 'orb')}, ${count(gitan3, 'orb')})`,
  );
  // 녹림도법: every 1.2 s, 5 / 9 blades of 170%
  const dobeop1 = await run('art_dobeop', 1, 1),
    dobeop3 = await run('art_dobeop', 3, 1);
  check(
    f,
    count(dobeop1, 'knife') === 5 && count(dobeop3, 'knife') === 9 && Math.abs(dobeop1.shots[0].damage - 1.7) < 1e-9,
    `녹림도법: 5 → 9 blades, 170% (${count(dobeop1, 'knife')}, ${count(dobeop3, 'knife')})`,
  );
  // 관창: a piercing lance of 480%, every 1.2 s → 0.6 s
  const lance1 = await run('gwanchang', 1, 2.45),
    lance3 = await run('gwanchang', 3, 2.45);
  check(
    f,
    count(lance1, 'gang') === 3 && count(lance3, 'gang') === 5 && Math.abs(lance1.shots[0].damage - 4.8) < 1e-9,
    `관창: lances in 2.45 s at Lv 1 / Lv 3 (${count(lance1, 'gang')}, ${count(lance3, 'gang')})`,
  );
  // 천마군림: the strongest enemy's column, 900%, every 3 s → 1.5 s
  const cheonma1 = await run('art_cheonma', 1, 3.05, 'ctx.dummy(120, 300); ctx.dummy(360, 300, 2e6);'),
    cheonma3 = await run('art_cheonma', 3, 3.05, 'ctx.dummy(120, 300); ctx.dummy(360, 300, 2e6);');
  check(
    f,
    cheonma1.enemies[0] === 0 && cheonma1.enemies[1] === 18 && cheonma3.enemies[1] === 27,
    `천마군림: hits the strongest only, 2 strikes in 3 s at Lv 1, 3 at Lv 3 (${cheonma1.enemies}, ${cheonma3.enemies})`,
  );
  // event skills: 태극운검 (스침), 잔영검 (좌우 전환), 붕산권 (근접 처치), each at most once a gap
  const ev = await g.eval(() => {
    const G = window.__g,
      st = G.state,
      D = G.stats.attack,
      out = {};
    const fire = (id, level, type, data) => {
      G.shots.length = 0;
      st.skills = [{ id, level }];
      G.trig(type, data);
      G.trig(type, data); // again at once: within the gap, nothing
      return G.shots.filter(x => !x.basic).map(x => x.damage / D);
    };
    out.taeguk = [fire('taeguk', 1, 'graze', {}), fire('taeguk', 3, 'graze', {})];
    out.janyoung = [fire('janyoung', 1, 'step', { x: 240 }), fire('janyoung', 3, 'step', { x: 240 })];
    // 붕산권: a 근접 처치 at (240, 500) bursts; an enemy 90 px away is hit at Lv 1 (radius 80) only from Lv 3 (120)
    const reach = level => {
      G.enemies.length = 0;
      const e = {
        x: 330,
        baseX: 330,
        y: 500,
        hp: 1e6,
        maxHp: 1e6,
        type: 1,
        rank: 0,
        size: 80,
        r: 0,
        phase: 0,
        hit: 0,
        dead: false,
        row: -1,
      };
      G.enemies.push(e);
      st.skills = [{ id: 'bungsan', level }];
      G.trig('nearKill', { e: { x: 240, y: 500 } });
      return +((e.maxHp - e.hp) / D).toFixed(2);
    };
    out.bungsan = [reach(1), reach(3)];
    return out;
  });
  check(
    f,
    ev.taeguk[0].join() === '4' && ev.taeguk[1].join() === '8',
    `태극운검: one orb a 스침 (gap 0.6 s), 400% → 800% (${JSON.stringify(ev.taeguk)})`,
  );
  check(
    f,
    ev.janyoung[0].length === 2 && ev.janyoung[1].length === 4 && ev.janyoung[0].every(d => d === 2),
    `잔영검: 2 → 4 검기 a move, 200% (${JSON.stringify(ev.janyoung)})`,
  );
  check(f, ev.bungsan.join() === '0,5', `붕산권: radius 80 → 120, 500% (${ev.bungsan})`);
  // 어검진: swords circle the hero and cut an enemy beside him; more swords at Lv 3
  const eogeom = await run('eogeom', 1, 1, 'ctx.dummy(ctx.G.player.x + 62, ctx.G.player.y - 10);');
  check(f, eogeom.enemies[0] > 0, `어검진: an enemy beside the hero is cut (${eogeom.enemies})`);
  // window skills: 그림자 분신 adds two clones to each basic volley for 5 of 10 s (Lv 3: always); 홍련화 makes every
  // hit critical for 6 of 12 s (Lv 3: always)
  const win = await g.eval(() => {
    const G = window.__g,
      st = G.state,
      out = {};
    const volley = (id, level, clock) => {
      st.skills = [{ id, level, clock }];
      G.enemies.length = 0;
      G.shots.length = 0;
      G.player.fire = 0;
      window.__step(1);
      return G.shots.filter(x => x.basic).length;
    };
    out.clone = [volley('grimja', 1, 1), volley('grimja', 1, 6), volley('grimja', 3, 6)];
    const crit = (level, clock) => {
      st.skills = [{ id: 'hongryeonhwa', level, clock }];
      G.enemies.length = 0;
      const e = {
        x: 240,
        baseX: 240,
        y: 300,
        hp: 1e6,
        maxHp: 1e6,
        type: 1,
        rank: 0,
        size: 80,
        r: 22,
        phase: 0,
        hit: 0,
        dead: false,
        row: -1,
      };
      G.enemies.push(e);
      G.hitEnemy(e, 10);
      return e.maxHp - e.hp;
    };
    out.crit = [crit(1, 1), crit(1, 7), crit(3, 7)];
    return out;
  });
  check(f, win.clone.join() === '3,1,3', `그림자 분신: 5 of 10 s, always at Lv 3 (${win.clone})`);
  check(f, win.crit.join() === '20,10,20', `홍련화: every hit critical 6 of 12 s, always at Lv 3 (${win.crit})`);
  // the choice offers only what can still be given, never twice the same
  const rolls = await g.eval(() => {
    const G = window.__g,
      st = G.state,
      out = [];
    st.skills = [
      { id: 'gitan', level: 3 },
      { id: 'grimja', level: 1 },
    ];
    for (let i = 0; i < 50; i++) out.push(G.rollChoices());
    return out;
  });
  check(
    f,
    rolls.every(r => r.length === 3 && new Set(r).size === 3 && !r.includes('gitan')),
    `offers: three different, never a skill at Lv 3 (${JSON.stringify(rolls.slice(0, 3))})`,
  );
  check(f, g.errors.length === 0, 'no page errors: ' + g.errors.join(' | '));
  await g.page.close();
  return { name: `B seed ${seed}`, failures: f, log: [] };
}

// Scenario C: stages and the save. A new save opens S1 only; beating S1 opens S2 (once); death opens nothing.
async function scenarioC(browser, seed) {
  const f = [];
  const g = await openGame(file, { browser, seed, roster: false });
  const P = () => g.state(() => JSON.parse(JSON.stringify(window.__g.profile)));
  check(f, (await P()).stages === 1, 'a new save opens S1');
  await g.eval(() => window.__g.traceScenes());
  // the lobby: S1, and S2 locked behind the arrow (강호에 나서기 off there)
  let lobby = await g.lobby();
  await g.eval(() => document.getElementById('stageNext').click());
  const next = await g.lobby();
  check(
    f,
    lobby.dots === 2 && lobby.on === 1 && lobby.start && next.locked && !next.start && /잠김/.test(next.text),
    `only S1 can set out; S2 shows locked (${JSON.stringify([lobby, next])})`,
  );
  await setupFrom(g, 0);
  await g.eval(() => window.__g.god());
  await reachBoss(g);
  await killBoss(g);
  const won = await P();
  check(f, won.stages === 2, `beating S1 opens S2 (${won.stages})`);
  check(f, won.coins >= 300, `a victory banks the clear bonus (${won.coins})`);
  // S1 again: nothing more opens. 다시 강호로 goes back to the lobby, which shows S2 (the highest open) first
  await g.eval(() => document.getElementById('retry').click());
  await g.step(2);
  lobby = await g.lobby();
  check(
    f,
    (await g.mode()) === 'title' && lobby.dots === 3 && lobby.on === 2 && lobby.start,
    `back in the lobby: S1 and S2 open, S2 first, S3 locked (${JSON.stringify(lobby)})`,
  );
  await setupFrom(g, 0);
  await g.eval(() => window.__g.god());
  await reachBoss(g);
  await killBoss(g);
  check(f, (await P()).stages === 2, 'beating S1 again opens nothing more');
  // death on S2: the result screen, 엽전 banked, no stage opened
  await g.eval(() => document.getElementById('retry').click());
  await g.step(2);
  await setupFrom(g, 1);
  await g.eval(() => {
    window.__g.state.coins = 300;
    // no 조짐 on the way
    window.__g.state.meetTimer = window.__g.state.meetWait = 1e6;
    window.__g.player.hp = 1;
    window.__g.player.inv = 0;
  });
  const before = (await P()).coins;
  await waitForDeath(g);
  const title = await g.page.$eval('#resultTitle', e => e.textContent);
  const left = await g.state(() => window.__g.state.coins);
  const p = await P();
  check(f, title === '강호행 실패', `defeat title (got ${title})`);
  const run = await g.state(() => [window.__g.state.distance, window.__g.stageDistance]);
  check(f, run[0] <= run[1] + 1, `on defeat the run had not reached the boss (${run})`);
  check(
    f,
    p.coins === before + left && p.stages === 2,
    `death banks the 엽전 and opens nothing (${before} + ${left} → ${p.coins})`,
  );
  const got = await g.eval(() => window.__g.sceneLog);
  check(f, got.at(-2) === 'stage' && got.at(-1) === 'result', 'scene sequence ends stage → result');
  check(f, g.errors.length === 0, 'no page errors: ' + g.errors.join(' | '));
  await g.page.close();
  return { name: `C seed ${seed}`, failures: f, log: [] };
}

async function scenarioD(browser, seed) {
  const f = [];
  const g = await openGame(file, { browser, seed });
  await setup(g, 0, { keepSign: true });
  // the first 조짐: at once, with no announcement
  let s = await g.state(S);
  const banner = await g.eval(() => window.__g.state.meetArrive);
  check(
    f,
    s.mode === 'choice' && s.encounters === 1 && !banner,
    `the first 조짐 opens at once (${s.mode}, ${s.encounters})`,
  );
  await g.act(0);
  await g.step(2);
  await g.eval(() => window.__g.god());
  const left0 = await g.state(() => window.__g.state.quest.left);
  check(f, left0 > 59.9, `a 조짐 has 60 s (${left0})`);
  // run out: it fails and 3 s later the next is announced (1.5 s, the fight goes on), then its card
  await g.eval(() => (window.__g.state.quest.left = 0.5));
  await g.seconds(0.3);
  const running = await g.state(() => [window.__g.mode, window.__g.state.quest.failed]);
  await g.seconds(0.4);
  s = await g.state(S);
  const wait = await g.state(() => window.__g.state.meetTimer);
  check(
    f,
    running.join() === 'play,false' && s.mode === 'play' && s.path.at(-1).result === '미달' && wait > 2.5 && wait <= 3,
    `run out: the 조짐 fails, 3 s to the next (${running}, ${s.mode}, ${wait}, ${JSON.stringify(s.path.at(-1))})`,
  );
  await g.eval(() => (window.__g.state.meetTimer = 0.5));
  await g.seconds(0.3);
  const early = await g.mode();
  await g.seconds(0.4);
  const announced = await g.eval(() => ({
    mode: window.__g.mode,
    arrive: !!window.__g.state.meetArrive,
  }));
  await g.seconds(1.6);
  check(
    f,
    early === 'play' &&
      announced.mode === 'play' &&
      announced.arrive &&
      (await g.mode()) === 'choice' &&
      (await g.choiceTitle()) === '공명의 조짐',
    `the wait runs out: the 조짐 is announced (1.5 s, the fight goes on), then the card (${early}, ${JSON.stringify(announced)})`,
  );
  // met: the 공명 choice opens; after it, 4.4 s to the announcement
  await g.act(0);
  await g.step(2);
  await succeed(g);
  check(f, (await g.mode()) === 'choice' && (await g.choiceTitle()) === '공명', 'a met 조짐 opens the 공명 choice');
  await g.pick(0);
  await g.step(1);
  const met = await g.state(() => ({ mode: window.__g.mode, wait: window.__g.state.meetTimer }));
  check(
    f,
    met.mode === 'play' && met.wait > 4.2 && met.wait <= 4.4,
    `after the 공명: 4.4 s to the announcement (${JSON.stringify(met)})`,
  );
  await nextMeet(g);
  check(f, (await g.mode()) === 'choice', 'then the next 조짐');
  await g.act(0);
  await g.step(2);
  // a 필살기 counts down with no charge
  await blastKills(g, 3);
  s = await g.state(S);
  check(f, s.bombs === 0, `필살기 used: count 1 → 0, no charge (${s.bombs})`);
  // 정요란 cuts 조짐 targets while she fights (−15% at her first star level); a 조짐 asks 5/6 of the full count
  const cut = await g.eval(() => {
    const G = window.__g,
      st = G.state,
      was = st.hero,
      c = { n: 30 };
    st.hero = 'pungun';
    const plain = G.questTarget(c, 0);
    st.hero = 'yoran';
    const yoran = G.questTarget(c, 0);
    st.hero = was;
    return [plain, yoran];
  });
  check(f, cut.join() === '25,21', `정요란: a 조짐 of 30 (asks 25) asks 21 (${cut})`);
  // 스침 on enemies: one enemy passing close beside counts once, slipping between two counts twice
  const grazes = await g.eval(() => {
    const G = window.__g,
      st = G.state,
      out = [];
    for (const sides of [[1], [-1, 1]]) {
      G.enemies.length = 0;
      G.hazards.length = 0;
      G.player.x = G.player.target = 240;
      G.player.fire = 99;
      for (const side of sides)
        G.enemies.push({
          x: 240 + side * 45,
          baseX: 240 + side * 45,
          y: G.player.y - 60,
          hp: 999,
          maxHp: 999,
          type: 1,
          rank: 0,
          size: 80,
          r: 22,
          phase: 0,
          hit: 0,
          dead: false,
          row: -1,
        });
      const before = st.grazes;
      window.__step(40);
      out.push(st.grazes - before);
    }
    G.player.fire = 0;
    return out;
  });
  check(f, grazes.join() === '1,2', `스침: one enemy beside 1, between two 2 (${grazes})`);
  // 근접 처치: a kill within the 근접 ×3 line (154px above the player) counts, one further up does not
  const near = await g.eval(() => {
    const G = window.__g,
      st = G.state,
      out = [];
    for (const dy of [120, 260]) {
      G.enemies.length = 0;
      G.hazards.length = 0;
      G.player.x = G.player.target = 240;
      const e = {
        x: 240,
        baseX: 240,
        y: G.player.y - dy,
        hp: 999,
        maxHp: 999,
        type: 1,
        rank: 0,
        size: 80,
        r: 22,
        phase: 0,
        hit: 0,
        dead: false,
        row: -1,
      };
      G.enemies.push(e);
      const before = st.stats?.nearKill || 0;
      e.hp = 0.01;
      G.player.fire = 0;
      for (let i = 0; i < 30 && !e.dead; i++) window.__step(1);
      out.push([e.dead, (st.stats?.nearKill || 0) - before]);
    }
    return out;
  });
  check(f, JSON.stringify(near) === '[[true,1],[true,0]]', `근접 처치 within 154px only (${JSON.stringify(near)})`);
  // the hero's level sets the attack (+1 a level), one shot a volley
  const byLevel = await g.eval(() => {
    const G = window.__g,
      st = G.state,
      id = st.hero,
      out = [];
    // no 공명 기술 (그림자 분신 would add clones to the volley)
    st.skills.length = 0;
    for (const level of [1, 9, 10, 20]) {
      st.meta.levels[id] = level;
      G.enemies.length = 0;
      G.shots.length = 0;
      G.player.fire = 0;
      window.__step(1);
      out.push([G.stats.attack, G.shots.filter(s => s.basic).length]);
    }
    st.meta.levels[id] = 1;
    return out;
  });
  check(
    f,
    JSON.stringify(byLevel) === '[[10,1],[18,1],[19,1],[29,1]]',
    `levels 1, 9, 10, 20: attack +1 a level, one shot a volley (${JSON.stringify(byLevel)})`,
  );
  // a 연속 처치 조짐 counts only the chain after it was taken (the combo does not run down during the card)
  await g.eval(() => {
    const st = window.__g.state;
    st.combo = 39;
    st.comboTimer = 2;
    window.__g.meet('combo');
  });
  await g.act(0);
  await g.step(1);
  await g.eval(() => {
    window.__g.state.combo = 40;
    window.__g.questEvent('combo');
  });
  const comboQuest = await g.state(() => ({ ...window.__g.state.quest }));
  check(
    f,
    comboQuest.t === 'combo' && comboQuest.prog === 1 && !comboQuest.done,
    `combo 40 reached, but the 조짐 counts 1 since it was taken (${JSON.stringify(comboQuest)})`,
  );
  // a 조짐 open at the warning carries into the boss fight; met there, its 공명 opens there
  const phase = await reachBoss(g);
  s = await g.state(S);
  check(
    f,
    phase === 'boss' && s.quest?.t === 'combo' && !s.quest.failed,
    `the 조짐 is still open in the boss fight (${phase})`,
  );
  const left = await g.state(() => window.__g.state.quest.left);
  await g.seconds(1);
  check(f, (await g.state(() => window.__g.state.quest.left)) === left, 'the 조짐 clock stops in the boss fight');
  await g.eval(() => window.__g.readyMeet());
  await g.step(2);
  check(f, (await g.mode()) === 'play', 'no 조짐 card in the boss fight');
  const held = (await g.state(S)).skills.length;
  await succeed(g);
  check(
    f,
    (await g.mode()) === 'choice' && (await g.choiceTitle()) === '공명',
    'met in the boss fight: the 공명 choice',
  );
  await g.pick(0);
  await g.step(2);
  s = await g.state(S);
  check(f, s.mode === 'play' && s.skills.length === held + 1, `the 공명 기술 is learned (${s.skills})`);
  await g.eval(() => (window.__g.state.bombs = 1));
  await g.step(10);
  const ring = await g.eval(() => document.getElementById('blast').style.getPropertyValue('--p'));
  check(f, ring === '100', `the 필살기 ring is full while one is left (${ring})`);
  check(f, g.errors.length === 0, 'no page errors: ' + g.errors.join(' | '));
  await g.page.close();
  return { name: `D seed ${seed}`, failures: f, log: [] };
}

async function scenarioE(browser, seed) {
  const f = [];
  const g = await openGame(file, { browser, seed, roster: false });
  const P = () => g.state(() => JSON.parse(JSON.stringify(window.__g.profile)));
  const sum = o => Object.values(o).reduce((a, b) => a + b, 0);
  let p = await P();
  check(
    f,
    p.coins === 0 &&
      p.heroes.pungun === 1 &&
      p.heroes.bicheon === 1 &&
      sum(p.heroes) === 2 &&
      sum(p.levels) === 12 &&
      sum(p.bonds) === 0 &&
      !('cards' in p),
    `a new save: two starters at level 1, no 호감도, no cards (${JSON.stringify(p)})`,
  );
  check(f, !(await g.eval(() => document.getElementById('openTraining'))), '수련 is gone');
  // a run: base values, then die with 700 엽전
  await setup(g, 0);
  check(f, (await g.mode()) === 'play', 'the run starts in play once the first 조짐 is taken');
  const base = await g.state(() => ({ hp: window.__g.player.hp, bombs: window.__g.state.bombs }));
  check(f, base.hp === 1 && base.bombs === 1, `a run starts with the base values (${JSON.stringify(base)})`);
  // die with 700 엽전: they are banked as they are (a short run reaches no 기준 점수 tier; no 정·사 bonus any more)
  await g.eval(() => {
    window.__g.state.coins = 700;
    window.__g.player.hp = 1;
    window.__g.player.inv = 0;
  });
  await waitForDeath(g);
  const left = await g.state(() => window.__g.state.coins);
  p = await P();
  const settleText = await g.eval(
    () => document.getElementById('scoreRows').textContent + ' | ' + document.getElementById('coinRows').textContent,
  );
  check(
    f,
    p.coins === left && left >= 700 && !/정도|사도/.test(settleText),
    `엽전 left at the end is banked (${left} → bank ${p.coins}; ${settleText})`,
  );
  // 뽑기 from the lobby: one draw, then ten
  await g.eval(() => document.getElementById('retry').click());
  await g.step(2);
  await g.eval(() => document.getElementById('openGacha').click());
  const tenOff = await g.eval(() => document.getElementById('drawTen').disabled);
  check(f, tenOff === p.coins < 1000, `10회 is disabled below 1,000냥 (${p.coins})`);
  await g.eval(() => document.getElementById('drawOne').click());
  let q = await P();
  let shown = await g.page.$$eval('#gachaResults .tile', els => els.map(e => e.textContent));
  check(
    f,
    q.coins === p.coins - 100 && sum(q.heroes) === 3 && shown.length === 1,
    `1회: 100냥 for one piece (${p.coins} → ${q.coins}, shown ${shown})`,
  );
  await g.eval(() => window.__g.loadProfile({ ...window.__g.profile, coins: 1050 }));
  // the screen reads the bank when it opens
  await g.eval(() => document.getElementById('gachaClose').click());
  await g.eval(() => document.getElementById('openGacha').click());
  await g.eval(() => document.getElementById('drawTen').click());
  p = await P();
  shown = await g.page.$$eval('#gachaResults .tile', els => els.map(e => e.textContent));
  check(
    f,
    p.coins === 50 && sum(p.heroes) === 13 && shown.length === 10,
    `10회: 1,000냥 for ten hero pieces (bank ${p.coins}, pieces ${sum(p.heroes)}, shown ${shown.length})`,
  );
  check(
    f,
    shown.every(t => /새 영웅 합류|달성|조각 \+1/.test(t) && /영웅 조각/.test(t)),
    `each result says what it did (${shown.join(' | ')})`,
  );
  const off = await g.eval(() => [
    document.getElementById('drawOne').disabled,
    document.getElementById('drawTen').disabled,
  ]);
  check(f, off.join() === 'true,true', 'draws are disabled when the bank is short');
  const heroShare = sum(p.heroes) - 2;
  // the bank and the hub follow
  await g.eval(() => document.getElementById('gachaClose').click());
  const hub = await g.eval(() => [
    document.getElementById('hubHeroes').textContent,
    document.getElementById('openCards').classList.contains('hidden'),
  ]);
  check(f, /\/ 5/.test(hub[0]) && hub[1], `the title shows the new counts, no 인연 tile (${hub})`);
  // save code: export, wipe, import
  await g.eval(() => document.getElementById('openGacha').click());
  const code = await g.eval(() => document.getElementById('saveCode').value);
  check(f, code.startsWith('PUNGUN3:'), 'save code has the new prefix');
  await g.eval(() => window.__g.loadProfile({}));
  check(f, (await P()).coins === 0, 'profile wiped');
  await g.eval(code => {
    document.getElementById('saveCode').value = code;
    document.getElementById('saveLoad').click();
  }, code);
  check(f, JSON.stringify(await P()) === JSON.stringify(p), 'save code restores the profile');
  await g.eval(() => {
    document.getElementById('saveCode').value = 'not a save code';
    document.getElementById('saveLoad').click();
  });
  check(f, JSON.stringify(await P()) === JSON.stringify(p), 'a wrong code changes nothing');
  await g.eval(() => document.getElementById('gachaClose').click());
  // repair: pieces capped at 15, the starters keep their first piece, junk becomes 0
  await g.eval(() =>
    window.__g.loadProfile({
      coins: -5,
      heroes: { pungun: 0, unhak: 99, cheolhyeol: 3 },
      levels: { pungun: 'x', unhak: 99, cheolhyeol: 40 },
      bonds: { dosa: 'x', monk: 3.7 },
      cards: { dosa: 6 },
      stages: 'x',
    }),
  );
  p = await P();
  check(
    f,
    p.coins === 0 &&
      p.heroes.pungun === 1 &&
      p.heroes.unhak === 15 &&
      p.levels.pungun === 1 &&
      p.levels.unhak === 50 &&
      p.levels.cheolhyeol === 20 &&
      p.bonds.dosa === 0 &&
      p.bonds.monk === 3 &&
      !('cards' in p) &&
      p.stages === 1,
    `a damaged save is repaired (${JSON.stringify(p)})`,
  );
  await g.eval(() => window.__g.loadProfile({ stages: 40 }));
  check(f, (await P()).stages === 6, 'stages opened are capped at 6');
  // when everything is at its last level nothing more can be drawn
  await g.eval(() =>
    window.__g.loadProfile({
      coins: 5000,
      heroes: Object.fromEntries(Object.keys(window.__g.profile.heroes).map(id => [id, 15])),
    }),
  );
  await g.eval(() => document.getElementById('openGacha').click());
  check(f, await g.eval(() => document.getElementById('drawOne').disabled), 'a full collection cannot draw');
  await g.eval(() => document.getElementById('gachaClose').click());
  check(f, g.errors.length === 0, 'no page errors: ' + g.errors.join(' | '));
  await g.page.close();
  return { name: `E seed ${seed}`, failures: f, log: [`bank ${left} → 1회 + 10회 → hero pieces ${heroShare} of 11`] };
}

// Scenario F: heroes. Two starters; the others are locked until 뽑기 gives a piece; more pieces raise 성급,
// which the next run reads (trait text and snapshot).
async function scenarioF(browser, seed) {
  const f = [];
  const g = await openGame(file, { browser, seed, roster: false });
  const formation = () =>
    g.page.$$eval('#choice .party-hero', els =>
      els.map(e => ({ name: e.querySelector('h3').textContent, locked: e.classList.contains('locked') })),
    );
  // 영웅 screen: grid, joined first; popups
  await g.eval(() => document.getElementById('openRoster').click());
  const tiles = await g.page.$$eval('#collectionGrid .tile', els =>
    els.map(e => ({ locked: e.classList.contains('locked'), text: e.textContent })),
  );
  check(
    f,
    tiles.length === 5 && tiles.filter(t => t.locked).length === 3 && !tiles[0].locked && !tiles[1].locked,
    `영웅 grid (5 heroes in play): 2 joined, then 3 locked (${tiles.map(t => t.locked)})`,
  );
  check(
    f,
    tiles.slice(2).every(t => /잠김/.test(t.text)) &&
      /Lv 1/.test(tiles[0].text) &&
      /★☆☆☆☆/.test(tiles[0].text) &&
      !/Lv 1 ★/.test(tiles[0].text),
    `portrait tiles: the name, Lv and 성급 on joined heroes, 잠김 on the rest (${tiles[0].text} | ${tiles[2].text})`,
  );
  // the 영웅 popup: portrait, then Lv · 성급, trait (no entry skill since 2026-11); tabs 레벨 (shot, attack, 레벨업), 장비 and 성급 (pieces,
  // track); a locked hero has no 장비 tab
  const popup = i =>
    g.eval(i => {
      document.querySelectorAll('#collectionGrid .tile')[i].click();
      const body = () => document.getElementById('detailBody');
      const out = {
        head: body().querySelector('.detail-head').textContent,
        summary: [...body().querySelectorAll(':scope > .detail-section')].map(e => e.textContent).join(' | '),
        tabs: [...body().querySelectorAll('.detail-tabs button')].map(b => b.textContent).join(),
        level: body().querySelector('.detail-tab').textContent,
        shot: !!body().querySelector('.detail-figure img'),
        action: document.getElementById('detailActions').textContent,
      };
      [...body().querySelectorAll('.detail-tabs button')].find(b => b.textContent === '성급').click();
      out.stars = body().querySelector('.detail-tab .detail-progress')?.textContent ?? '';
      out.track = [...body().querySelectorAll('.detail-track li')].map(li => li.className).join();
      document.getElementById('detailBack').click();
      return out;
    }, i);
  const owned0 = await popup(0),
    locked0 = await popup(2);
  check(
    f,
    /Lv 1/.test(owned0.summary) &&
      /★☆☆☆☆/.test(owned0.summary) &&
      /특성/.test(owned0.summary) &&
      !/등장 기술/.test(owned0.summary) &&
      owned0.tabs === '레벨,장비,성급' &&
      owned0.shot &&
      /공격력 10/.test(owned0.level) &&
      /레벨업/.test(owned0.action) &&
      /조각1 \/ 3/.test(owned0.stars) &&
      owned0.track === 'current,next,next,next,next',
    `a joined hero's popup: summary, 레벨 tab (shot, attack, 레벨업), 성급 tab (pieces, track) (${JSON.stringify(owned0)})`,
  );
  check(
    f,
    /잠김/.test(locked0.head) && /1개면 합류/.test(locked0.stars) && !locked0.shot && !/레벨업/.test(locked0.action),
    `a locked hero's popup: no shot or 레벨업, the 성급 tab says how to join (${JSON.stringify(locked0)})`,
  );
  await g.eval(() => document.getElementById('collectionClose').click());

  // the hero screen: owned first; a locked hero cannot be chosen
  await g.setOut(0); // S1 산길
  await g.step(2);
  let cards = await formation();
  check(
    f,
    cards.length === 5 && cards.slice(0, 2).every(c => !c.locked) && cards.slice(2).every(c => c.locked),
    `출전: 2 owned first, 3 locked (${cards.map(c => c.name + (c.locked ? '×' : '')).join(' ')})`,
  );
  // a locked hero is dim and does nothing; one hero is chosen and 출발 is ready
  const stuck = await g.eval(() => {
    const h = [...document.querySelectorAll('#choice .party-hero')];
    h.at(-1).click();
    return {
      title: document.getElementById('choiceTitle').textContent,
      disabled: document.getElementById('formationConfirm').disabled,
      picked: [...document.querySelectorAll('#choice .party-hero.sel')].map(e => e.dataset.id),
      lockedDisabled: h.at(-1).disabled,
    };
  });
  check(
    f,
    stuck.title === '영웅' && !stuck.disabled && stuck.picked.join() === 'pungun' && stuck.lockedDisabled,
    `a locked hero cannot be picked; the first hero is chosen (${JSON.stringify(stuck)})`,
  );
  await g.party(0);
  await g.step(2);
  if ((await g.mode()) === 'choice') await g.act(0);
  await g.step(2);
  // a piece of 홍련 and pieces of 풍운객 arrive mid-run (as from 뽑기): this run keeps its snapshot
  await g.eval(() =>
    window.__g.loadProfile({ ...window.__g.profile, heroes: { pungun: 6, bicheon: 1, hongryeon: 1 } }),
  );
  check(f, (await g.state(() => window.__g.state.meta.heroes.pungun)) === 0, 'the run keeps the 성급 it started with');
  await g.eval(() => {
    window.__g.player.hp = 1;
    window.__g.player.inv = 0;
  });
  await waitForDeath(g);

  // 레벨업 on the 영웅 screen: 엽전 for one level, capped by 성급 (풍운객 is ★3 now: up to Lv 30)
  await g.eval(() => document.getElementById('retry').click());
  await g.eval(() => window.__g.loadProfile({ ...window.__g.profile, coins: 1000 }));
  await g.eval(() => document.getElementById('openRoster').click());
  const button = () =>
    g.eval(() => {
      const b = document.querySelector('#detailActions button');
      return b ? { text: b.textContent, off: b.disabled } : null;
    });
  await g.eval(() => document.querySelectorAll('#collectionGrid .tile')[0].click());
  const before = await button();
  check(
    f,
    before && /레벨업 · 20냥/.test(before.text) && /공격력 10 → 11/.test(before.text) && !before.off,
    `the 레벨업 button shows the price and the attack (${JSON.stringify(before)})`,
  );
  await g.eval(() => document.querySelector('#detailActions button').click());
  const after = await g.state(() => ({
    level: window.__g.profile.levels.pungun,
    coins: window.__g.profile.coins,
    detail: document.getElementById('detailBody').textContent,
  }));
  check(
    f,
    after.level === 2 && after.coins === 980 && /레벨 2 \/ 30/.test(after.detail) && /공격력 11/.test(after.detail),
    `레벨업: Lv 2 for 20냥, the popup follows (${JSON.stringify({ ...after, detail: after.detail.slice(0, 60) })})`,
  );
  await g.eval(() =>
    window.__g.loadProfile({ ...window.__g.profile, levels: { ...window.__g.profile.levels, pungun: 30 } }),
  );
  await g.eval(() => {
    document.getElementById('detailBack').click();
    document.querySelectorAll('#collectionGrid .tile')[0].click();
  });
  const capped = await button();
  check(
    f,
    capped && /최대 레벨/.test(capped.text) && capped.off,
    `at Lv 30 (★3) the button stops (${JSON.stringify(capped)})`,
  );
  await g.eval(() =>
    window.__g.loadProfile({ ...window.__g.profile, levels: { ...window.__g.profile.levels, pungun: 2 } }),
  );
  await g.eval(() => document.getElementById('collectionClose').click());

  // next run: 홍련 joined, 풍운객 ★3 (6 pieces) and Lv 2 in the preview and the snapshot
  await g.setOut(0);
  await g.step(2);
  cards = await formation();
  check(
    f,
    cards.filter(c => !c.locked).length === 3 && cards.slice(0, 3).every(c => !c.locked),
    `next run: 3 owned first (${cards.map(c => c.name + (c.locked ? '×' : '')).join(' ')})`,
  );
  // the last run's hero is chosen again: 풍운객 in the info window
  const preview = await g.eval(() => document.querySelector('.party-info').textContent);
  check(
    f,
    /풍운객/.test(preview) && /★★★☆☆/.test(preview) && /Lv 2/.test(preview) && /반경 100/.test(preview),
    `풍운객 shows ★★★, Lv 2 and the stronger trait (${preview})`,
  );
  await g.party(0);
  await g.step(2);
  const level = await g.state(() => window.__g.state.meta.heroes);
  check(f, level.pungun === 2 && level.hongryeon === 0, `snapshot has 성급 − 1 (${JSON.stringify(level)})`);
  const lv = await g.state(() => ({ level: window.__g.state.meta.levels.pungun, attack: window.__g.stats.attack }));
  check(f, lv.level === 2 && lv.attack === 11, `the run takes Lv 2: attack 11 (${JSON.stringify(lv)})`);
  check(f, g.errors.length === 0, 'no page errors: ' + g.errors.join(' | '));
  await g.page.close();
  return { name: `F seed ${seed}`, failures: f, log: [`preview "${preview.slice(0, 60)}…"`] };
}

// Scenario G: 인연 are disconnected while 공명 replaces them (2026-11): no 인연 tile on the title, a met 조짐 raises
// no 호감도, the save keeps the 호감도 it had, and no 인연 skill is offered.
async function scenarioG(browser, seed) {
  const f = [];
  const g = await openGame(file, { browser, seed, roster: false });
  await g.eval(() =>
    window.__g.loadProfile({
      ...window.__g.profile,
      bonds: { dosa: 4, yakseon: 1 },
      heroes: { pungun: 1, bicheon: 1 },
    }),
  );
  const tile = await g.eval(() => document.getElementById('openCards').classList.contains('hidden'));
  check(f, tile, 'the 인연 tile is hidden on the title');
  await setup(g, 0);
  await g.eval(() => window.__g.god());
  await succeed(g);
  const titles = (await offers(g)).map(c => c.title);
  check(
    f,
    titles.length === 3 && titles.every(t => SKILL_NAMES.includes(t)),
    `the 공명 offers only 공명 기술 (${titles})`,
  );
  await g.pick(0);
  await g.step(2);
  const p = await g.state(() => JSON.parse(JSON.stringify(window.__g.profile.bonds)));
  check(
    f,
    p.dosa === 4 && p.yakseon === 1 && Object.values(p).reduce((a, b) => a + b, 0) === 5,
    `a met 조짐 raises no 호감도; the save keeps it (${JSON.stringify(p)})`,
  );
  check(f, g.errors.length === 0, 'no page errors: ' + g.errors.join(' | '));
  await g.page.close();
  return { name: `G seed ${seed}`, failures: f, log: [] };
}

// Scenario H: 조짐 targets 5/6 of the full count ±10% each time, the row gap (2 s → 0.8 s with
// distance), pickups pop up and fall with no magnet, the 자석 and 점수 두 배 items (5 s, retaken = full time), one
// 엽전 a kill, 무아지경 rows by distance (엽전 only), and the 기준 점수 of every stage.
async function scenarioH(browser, seed) {
  const f = [];
  const g = await openGame(file, { browser, seed });
  await setup(g, 0);
  await g.eval(() => window.__g.god());
  // 조짐 targets: each about 5/6 of its condition's full count ±10% (no growth), never the same condition twice in a row
  const full = { graze: 24, step: 90, nearKill: 12, rowClear: 4, combo: 40 };
  const targets = [];
  for (let k = 0; k < 6; k++) {
    await g.eval(() => window.__g.meet());
    await g.act(0);
    await g.step(2);
    targets.push(await g.eval(() => ({ t: window.__g.state.quest.t, target: window.__g.state.quest.target })));
  }
  check(
    f,
    targets.every(
      q => q.target >= Math.round(((full[q.t] * 5) / 6) * 0.9) && q.target <= Math.round(((full[q.t] * 5) / 6) * 1.1),
    ) && targets.every((q, i) => !i || q.t !== targets[i - 1].t),
    `조짐 targets 5/6 ±10%, a new condition each time (${JSON.stringify(targets)})`,
  );
  // row gap: 2 s at the start, 0.8 s at the boss, even in between; the real timer follows it
  const gaps = await g.eval(() => [0, 6000, 12000, 20000].map(m => window.__g.rowGap(m, 12000)));
  check(f, gaps.join() === '1.7,1.575,1.45,1.45', `row gap 1.7 → 1.45 s with the stage's progress (${gaps})`);
  await g.eval(() => {
    // no 운석 소나기 (it holds rows back at a step's end)
    window.__g.state.showerSteps = [1, 2, 3, 4, 5, 6];
    window.__g.state.distance = window.__g.stageDistance / 2;
    window.__g.state.rowTimer = 0;
  });
  await g.step(1);
  const rowTimer = await g.state(() => window.__g.state.rowTimer);
  check(f, Math.abs(rowTimer - 1.575) < 0.02, `the row timer half way through the stage is 1.575 s (${rowTimer})`);
  // pickups: no magnet by default; a pickup pops up, then falls, and is not pulled toward the hero
  const P = () =>
    g.state(() => {
      const p = window.__g.pickups[0],
        pl = window.__g.player;
      return p ? { x: p.x, y: p.y, vy: p.vy, kind: p.kind, px: pl.x, py: pl.y } : null;
    });
  await g.eval(() => {
    window.__g.enemies.length = 0;
    window.__g.pickups.length = 0;
    window.__g.state.rowTimer = 99;
    const pl = window.__g.player;
    window.__g.addPickup('coin', pl.x + 110, pl.y - 260);
  });
  const p0 = await P();
  await g.step(12);
  const p1 = await P();
  // it falls fast (gravity 1800): look at it 0.7 s in, before it leaves the screen
  await g.step(30);
  const p2 = await P();
  check(
    f,
    p0.vy < 0 && p0.y - p1.y > 60 && p2.vy > 0 && p2.y > p1.y && Math.abs(p2.x - p0.x) < 160,
    `a pickup pops up, then falls, not pulled in (${JSON.stringify([p0, p1, p2])})`,
  );
  // no magnet in 무아지경 either
  await g.eval(() => {
    window.__g.pickups.length = 0;
    window.__g.state.rowTimer = 99;
    window.__g.state.hyper = 1;
    const pl = window.__g.player;
    window.__g.addPickup('coin', pl.x + 110, pl.y - 260);
  });
  const q0 = await P();
  await g.step(30);
  const q1 = await P();
  await g.eval(() => (window.__g.state.hyper = 0));
  check(
    f,
    q1 && Math.abs(q1.px + 110 - q1.x) < 60 && q1.y < q1.py - 100,
    `무아지경 does not pull 엽전 in (${JSON.stringify([q0, q1])})`,
  );
  // the 자석 item: 3 s, pickups within reach are pulled in
  await g.eval(() => {
    window.__g.pickups.length = 0;
    const pl = window.__g.player;
    window.__g.addPickup('magnet', pl.x, pl.y);
  });
  await g.step(1);
  let s = await g.state(() => ({ magnet: window.__g.state.magnet, coins: window.__g.state.coins }));
  check(f, Math.abs(s.magnet - 5) < 0.05, `자석 runs 5 s (${s.magnet})`);
  await g.eval(() => {
    const pl = window.__g.player;
    // inside the pull (6 × the 스침 거리, about 156 px): it is drawn in
    window.__g.addPickup('coin', pl.x + 80, pl.y - 110);
  });
  await g.step(60);
  const coins = await g.state(() => window.__g.state.coins);
  check(f, coins === s.coins + 1, `자석 pulls a 엽전 in (${s.coins} → ${coins})`);
  await g.step(300);
  await g.eval(() => {
    const pl = window.__g.player;
    window.__g.addPickup('magnet', pl.x, pl.y);
  });
  await g.step(1);
  s = await g.state(() => ({ magnet: window.__g.state.magnet }));
  check(f, Math.abs(s.magnet - 5) < 0.05, `retaking 자석 sets it back to 5 s, no stacking (${s.magnet})`);
  // 점수 두 배: a 엽전 is worth 20 while it runs
  await g.eval(() => {
    const pl = window.__g.player;
    window.__g.addPickup('double', pl.x, pl.y);
  });
  await g.step(1);
  const before = await g.state(() => ({ score: window.__g.state.score, double: window.__g.state.double }));
  await g.eval(() => {
    const pl = window.__g.player;
    window.__g.addPickup('coin', pl.x, pl.y);
  });
  await g.step(1);
  const after = await g.state(() => window.__g.state.score);
  check(
    f,
    Math.abs(before.double - 5) < 0.05 && after - before.score > 20 && after - before.score < 21,
    `점수 두 배: 5 s, a 엽전 scores 20 (+${after - before.score})`,
  );
  // one 엽전 a kill (an item drops with 3%, so a few kills are checked)
  const drops = await g.eval(() => {
    const out = [];
    for (let i = 0; i < 5; i++) {
      window.__g.pickups.length = 0;
      const pl = window.__g.player,
        e = {
          x: pl.x,
          y: 100,
          hp: 1,
          maxHp: 1,
          type: 0,
          rank: 0,
          r: 20,
          row: -1,
          dead: false,
          size: 50,
          color: '#fff',
          phase: 0,
          hit: 0,
        };
      window.__g.enemies.push(e);
      window.__g.kill(e);
      out.push(window.__g.pickups.filter(p => p.kind === 'coin').length);
    }
    return out;
  });
  check(
    f,
    drops.every(n => n === 1),
    `a kill drops one 엽전 (${drops})`,
  );
  // 무아지경: rows come by distance (as much faster as it runs), it cuts through them: the kills count for no
  // 조짐 and drop 엽전 only (no items)
  await g.eval(() => {
    const s = window.__g.state;
    window.__g.enemies.length = 0;
    window.__g.pickups.length = 0;
    s.distance = 3000;
    s.rowTimer = 0;
    s.meetTimer = 1e6;
    s.quest = {
      t: 'kills',
      target: 999,
      prog: 0,
      br: 'gang',
      done: false,
      failed: false,
      left: 1e6,
    };
    s.stats = {};
    s.hyper = 2;
    // no basic shots: only what 무아지경 cuts down is counted (shots kill weak rows far up, with 근접 ×2)
    window.__g.player.fire = 1e6;
  });
  const k0 = await g.state(() => window.__g.state.kills);
  // no 근접 × for what 무아지경 cuts down: no 근접 label while it runs
  const items = [],
    nearLabels = [],
    progs = [];
  for (let i = 0; i < 12; i++) {
    await g.step(10);
    progs.push(await g.state(() => (window.__g.state.hyper > 0 ? window.__g.state.quest.prog : 0)));
    items.push(...(await g.state(() => window.__g.pickups.filter(p => p.kind !== 'coin').map(p => p.kind))));
    if (i < 11)
      nearLabels.push(...(await g.state(() => window.__g.labels.map(l => l.text).filter(t => t.startsWith('근접')))));
  }
  const h1 = await g.state(() => ({
    kills: window.__g.state.kills,
    stats: window.__g.state.stats,
  }));
  await g.eval(() => (window.__g.player.fire = 0));
  const hyperKills = h1.kills - k0;
  check(
    f,
    hyperKills >= 15 && progs.every(p => p === 0) && items.length === 0 && nearLabels.length === 0,
    `2 s of 무아지경: rows by distance, its kills count for no 조짐, no items, no 근접 × (${nearLabels} ${progs} ` +
      `${hyperKills} kills, ${JSON.stringify(h1)}, items ${items})`,
  );
  // 기준 점수 of each stage: whole thousands
  const max = await g.eval(() => [1, 2, 3, 4, 5, 6].map(n => window.__g.referenceScore(n)));
  check(
    f,
    max.every(m => m > 0 && m % 1000 === 0),
    `기준 점수 per stage (${max})`,
  );
  check(f, g.errors.length === 0, 'no page errors: ' + g.errors.join(' | '));
  await g.page.close();
  return { name: `H seed ${seed}`, failures: f, log: [`기준 점수 ${max.join(' · ')}`] };
}

// Scenario I: the Dragon Flight baseline (docs/balance-baseline.md) on S1: the tier ladder by the stage's progress
// (weak slot = the step's tier), rows twice as fast at the boss, 무아지경 2 s ending in a screen burst that turns
// the enemies into 엽전, a 보물상자 bursting into 20 엽전, items hanging at the top of their pop, and
// the 운석 warned 2 s ahead.
async function scenarioI(browser, seed) {
  const f = [];
  const g = await openGame(file, { browser, seed });
  await setup(g, 0);
  await g.eval(() => window.__g.god());
  const rows = async p =>
    g.eval(async p => {
      const G = window.__g;
      G.state.distance = p * G.stageDistance;
      // no 운석 소나기 (it holds rows back at a step's end)
      G.state.showerSteps = [1, 2, 3, 4, 5, 6];
      G.state.meetTimer = 1e6;
      if (G.state.quest) G.state.quest.left = 1e6;
      G.enemies.length = 0;
      G.state.rowTimer = 0;
      return null;
    }, p);
  // the ladder: in step k every slot is tier k through the first half, then 1 to 5 slots tier k+1 by fifths of the
  // second half (no slot kept weak); a row's tiers, counted
  const sample = async p => {
    const rowsSeen = [];
    for (let i = 0; i < 4; i++) {
      await rows(p);
      await g.step(1);
      // (the 정예 적 and 보물상자 stand apart from the ladder)
      const ts = await g.state(() => window.__g.enemies.filter(e => !e.chest && !e.elite).map(e => e.tier));
      if (ts.length === 5) rowsSeen.push(ts.sort().join(''));
    }
    return [...new Set(rowsSeen)].join();
  };
  // step 1 (0 to 1/6 of the stage): at 18% all tier 1; at 66% (60 to 70%) two slots tier 2; at 96% all tier 2
  const early = await sample(0.03),
    mid = await sample(0.11),
    late = await sample(0.16),
    top = await sample(0.97);
  check(
    f,
    early === '11111' && mid === '11122' && late === '22222' && top === '66666',
    `tier ladder: step 1 at 18% ${early}, 66% ${mid}, 96% ${late}; step 6 ${top}`,
  );
  // speed: rows come down twice as fast at the boss as at the start
  const fall = async p => {
    await rows(p);
    // no shots: a kill's hit-stop would slow the clock
    await g.eval(() => (window.__g.player.fire = 1e9));
    await g.step(1);
    const a = await g.state(() => ({ y: window.__g.enemies[0]?.y, t: window.__g.state.elapsed }));
    await g.step(30);
    const b = await g.state(() => ({ y: window.__g.enemies[0]?.y, t: window.__g.state.elapsed }));
    return (b.y - a.y) / (b.t - a.t);
  };
  const v0 = await fall(0),
    v1 = await fall(0.995);
  await g.eval(() => (window.__g.player.fire = 0));
  check(f, Math.abs(v0 - 300) < 10 && Math.abs(v1 - 800) < 10, `descent ${Math.round(v0)} → ${Math.round(v1)} px/s`);
  // 무아지경: 2 s, then the screen bursts: every enemy on it turns into 엽전
  await rows(0.5);
  await g.step(2);
  await g.eval(() => {
    const pl = window.__g.player;
    window.__g.addPickup('hyper', pl.x, pl.y);
  });
  await g.step(1);
  const hyper = await g.state(() => window.__g.state.hyper);
  await g.eval(() => (window.__g.state.rowTimer = 99));
  await g.eval(() => {
    // a row just entering the screen when 무아지경 ends
    window.__g.state.hyper = 0.02;
    for (const e of window.__g.enemies) e.y = 120;
  });
  const before = await g.state(() => window.__g.enemies.filter(e => !e.dead).length);
  await g.step(3);
  const after = await g.state(() => ({
    alive: window.__g.enemies.filter(e => !e.dead && !e.boss && e.y > -40).length,
    coins: window.__g.pickups.filter(p => p.kind === 'coin').length,
  }));
  check(
    f,
    Math.abs(hyper - 2) < 0.05 && before > 0 && after.alive === 0 && after.coins >= before,
    `무아지경 2 s (${hyper}); its end bursts ${before} enemies into 엽전 (${JSON.stringify(after)})`,
  );
  // 보물상자: bursts into 20 엽전
  await g.eval(() => {
    const G = window.__g;
    G.enemies.length = 0;
    G.pickups.length = 0;
    const e = {
      x: 240,
      y: 200,
      hp: 1,
      maxHp: 1,
      type: 0,
      rank: 1,
      chest: true,
      r: 28,
      row: -1,
      dead: false,
      size: 88,
      color: '#fff',
      phase: 0,
      hit: 0,
    };
    G.enemies.push(e);
    G.kill(e);
  });
  const chestCoins = await g.state(() => window.__g.pickups.filter(p => p.kind === 'coin').length);
  check(f, chestCoins === 20, `보물상자 → ${chestCoins} 엽전`);
  // an item drops with 3% a kill, picked 자석 4 : 점수 두 배 4 : 듀얼샷 4 : 무아지경 2
  const picks = await g.eval(() => {
    const out = { hyper: 0, magnet: 0, double: 0, dual: 0 };
    for (let i = 0; i < 1400; i++) out[window.__g.pickItem((i + 0.5) / 1400)]++;
    return out;
  });
  check(
    f,
    picks.magnet === 400 && picks.double === 400 && picks.dual === 400 && picks.hyper === 200,
    `items picked 자석 4 : 점수 두 배 4 : 듀얼샷 4 : 무아지경 2 (${JSON.stringify(picks)})`,
  );
  // 듀얼샷: two lines of basic shots for 3 s
  const dual = await g.eval(() => {
    const G = window.__g;
    G.pickups.length = 0;
    G.addPickup('dual', G.player.x, G.player.y);
    return null;
  });
  await g.step(2);
  const lines = await g.eval(() => {
    const G = window.__g;
    G.shots.length = 0;
    G.player.fire = 0;
    window.__step(1);
    return { left: G.state.dual, shots: G.shots.filter(s => s.basic).length };
  });
  check(f, lines.left > 2.9 && lines.shots === 2, `듀얼샷: 3 s of two lines (${JSON.stringify(lines)}${dual ?? ''})`);
  // items hang at the top of their pop before they fall; 엽전 do not
  await g.eval(() => {
    window.__g.pickups.length = 0;
    window.__g.addPickup('double', 60, 400);
    window.__g.addPickup('coin', 420, 400);
  });
  let hang = 0;
  for (let i = 0; i < 90; i++) {
    await g.step(1);
    const vy = await g.state(() => window.__g.pickups.find(p => p.kind === 'double')?.vy);
    if (vy === 0) hang++;
  }
  check(f, hang >= 24 && hang <= 30, `an item hangs about 0.45 s at the top (${hang} frames)`);
  // 운석: warned 2 s ahead
  const warn = await g.eval(() => {
    window.__g.state.meteorTimer = 0;
    window.__g.hazards.length = 0;
    return null;
  });
  await g.step(1);
  const meteor = await g.state(() => window.__g.hazards.find(h => h.kind === 'meteor')?.warn);
  check(f, warn === null && meteor > 1.9 && meteor <= 2, `운석 warned 2 s ahead (${meteor})`);
  check(f, g.errors.length === 0, 'no page errors: ' + g.errors.join(' | '));
  await g.page.close();
  return { name: `I seed ${seed}`, failures: f, log: [`descent ${Math.round(v0)} → ${Math.round(v1)} px/s`] };
}

/** J: 장비 and the 정예 적 (docs/equipment-plan.md): worn gear reaches the run through the factors; the 장비 tab
 *  equips and 강화; the 정예 적 takes one per hit, gives a 장비 상자 opened on the result screen. */
async function scenarioJ(browser, seed) {
  const f = [];
  const g = await openGame(file, { browser, seed, roster: false });
  await g.eval(() =>
    window.__g.loadProfile({
      coins: 1000,
      gear: [
        { uid: 1, item: 'cheonggang', grade: 3, plus: 5 },
        { uid: 2, item: 'cheolpo', grade: 1, plus: 0 },
        { uid: 3, item: 'cheonggang', grade: 1, plus: 0 },
      ],
      equipped: { pungun: { robe: 2 } },
      nextUid: 4,
    }),
  );
  // the 장비 tab: put 청강검 ★3 +5 on 풍운객 (강화 is off: it is at +5)
  await g.eval(() => document.getElementById('openRoster').click());
  await g.eval(() => {
    document.querySelector('#collectionGrid .tile[data-id="pungun"]').click();
    [...document.querySelectorAll('.detail-tabs button')].find(b => b.textContent === '장비').click();
    document.querySelector('[data-filter="weapon"]').click();
    document.querySelector('[data-gear="1"]').click();
    document.querySelector('[data-action="equip"]').click();
    document.querySelector('[data-action="plus"]').click();
  });
  const tab = await g.eval(() => ({
    worn: JSON.stringify(window.__g.profile.equipped.pungun),
    sum: document.querySelector('.equipment-summary p').textContent,
    plus: document.querySelector('[data-action="confirm-plus"]').disabled,
  }));
  await g.eval(() => document.querySelector('[data-action="close"]').click());
  check(
    f,
    tab.worn === '{"robe":2,"weapon":1}' && /공격력 \+30%/.test(tab.sum) && /최대 체력 \+1/.test(tab.sum) && tab.plus,
    `장비 tab: worn, the sum of its factors, 강화 off at +5 (${JSON.stringify(tab)})`,
  );
  await g.eval(() => {
    document.getElementById('detailBack').click();
    document.getElementById('collectionClose').click();
  });
  // a run: the fighting hero's gear is in the snapshot and in the shots and health
  await g.setOut(0);
  await g.step(2);
  await g.eval(() => {
    const h = [...document.querySelectorAll('#choice .party-hero')],
      ids = h.map(e => e.dataset.id);
    h[ids.indexOf('pungun')].click();
    document.getElementById('formationConfirm').click();
  });
  await g.step(2);
  // the first 조짐 card opens with the stage
  if ((await g.mode()) === 'choice') await g.act(0);
  await g.seconds(0.5);
  const run = await g.state(() => ({
    shot: window.__g.shots.find(s => s.basic)?.damage,
    hp: window.__g.state.heroHealth.pungun.maxHp,
    other: window.__g.state.heroHealth.bicheon.maxHp,
  }));
  check(
    f,
    run.shot === 13 && run.hp === 2 && run.other === 1,
    `gear in the run: attack 13, health 2 (${JSON.stringify(run)})`,
  );
  // the 정예 적: one every run, in step 2 (50%), else 3 (60%), else 4; gear raises the chances
  const steps = await g.eval(() =>
    [
      [[0.4, 0.9, 0.5], 0],
      [[0.6, 0.5, 0.5], 0],
      [[0.6, 0.7, 0.5], 0],
      [[0.6, 0.7, 0.5], 0.15],
    ].map(([r, b]) => window.__g.eliteStep(r, b)),
  );
  check(f, steps.join() === '2,3,4,2', `정예 적 step by rolls: 2, 3, 4, and 2 with +15%p (${steps})`);
  // its distance comes during a 운석 소나기: it waits for the shower to end
  await g.eval(() => {
    const s = window.__g.state;
    s.elite.at = s.distance + 1;
    s.meetTimer = s.meetWait = 1e6;
    s.showerSteps = [1, 2, 3, 4, 5, 6];
    s.shower = { marked: 5, next: 1e6, left: 1 };
    window.__g.player.inv = 1e6;
  });
  await g.seconds(0.5);
  const waiting = await g.state(() => !window.__g.enemies.some(e => e.elite));
  await g.seconds(0.8);
  const after = await g.state(() => !window.__g.state.shower && window.__g.enemies.some(e => e.elite));
  check(f, waiting && after, `정예 적 waits out a 운석 소나기, then comes (${waiting}, ${after})`);
  // health 60; the test leaves it 20 to catch quickly
  const out = await g.eval(() => {
    const e = window.__g.enemies.find(e => e.elite),
      max = e?.maxHp;
    if (e) e.hp = 20;
    return max;
  });
  let caught = false;
  for (let i = 0; i < 100 && !caught; i++) {
    await g.eval(() => {
      const e = window.__g.enemies.find(e => e.elite);
      if (e) window.__g.player.target = e.x;
    });
    await g.seconds(0.1);
    caught = await g.state(() => window.__g.state.elite.caught);
  }
  const box = await g.state(() => window.__g.state.elite.boxes);
  check(f, out === 60 && caught && box === 1, `정예 적: health 60, caught, one 장비 상자 (${out}, ${caught}, ${box})`);
  await g.eval(() => {
    window.__g.player.inv = 0;
    window.__g.fell();
  });
  await g.seconds(0.3);
  await g.eval(() => window.__g.fell());
  await g.seconds(0.3);
  const result = await g.eval(() => ({
    shown: !document.getElementById('gearSection').classList.contains('hidden'),
    rows: document.querySelectorAll('#gearRows .result-gear-item').length,
    held: window.__g.profile.gear.length,
  }));
  check(
    f,
    result.shown && result.rows === 1 && result.held === 4,
    `the box opens on the result screen (${JSON.stringify(result)})`,
  );
  check(f, g.errors.length === 0, 'no page errors: ' + g.errors.join(' | '));
  await g.page.close();
  return { name: `J seed ${seed}`, failures: f, log: [] };
}

/** Opens the detail popup of the i-th tile on the open collection screen, reads it, and closes it. */
async function detailOf(g, i) {
  await g.eval(i => document.querySelectorAll('#collectionGrid .tile')[i].click(), i);
  const d = await g.eval(() => ({
    open: !document.getElementById('detail').classList.contains('hidden'),
    head: document.querySelector('#detailBody .detail-head')?.textContent ?? '',
    progress: document.querySelector('#detailBody .detail-progress')?.textContent ?? '',
    body: document.getElementById('detailBody').textContent,
    track: [...document.querySelectorAll('#detailBody .detail-track li')].map(li => li.className),
  }));
  await g.eval(() => document.getElementById('detailBack').click());
  return d;
}

const browser = await launch();
const results = [];
results.push(await scenarioA(browser, 0, 101));
results.push(await scenarioA(browser, 3, 102));
results.push(await scenarioB(browser, 303));
results.push(await scenarioC(browser, 404));
results.push(await scenarioD(browser, 505));
results.push(await scenarioE(browser, 606));
results.push(await scenarioF(browser, 707));
results.push(await scenarioG(browser, 808));
results.push(await scenarioH(browser, 909));
results.push(await scenarioI(browser, 1010));
results.push(await scenarioJ(browser, 1111));
await browser.close();

let failed = 0;
for (const r of results) {
  console.log((r.failures.length ? 'FAIL ' : 'ok   ') + r.name);
  for (const l of r.log) console.log('     ' + l);
  for (const m of r.failures) console.log('   ✗ ' + m);
  failed += r.failures.length;
}
console.log(failed ? `${failed} check(s) failed` : 'all e2e checks passed');
process.exit(failed ? 1 : 0);
