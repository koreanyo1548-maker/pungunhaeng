// End-to-end flow tests on the built single file (run `npm run build:single` first).
// usage: node tests/e2e/run-all.mjs [build.html]
// The run flow (docs/ability-redesign-plan.md, 4장·7장): stage select → 편대 → flight ↔ 만남 → boss → result.
// Scenario A (S1 산길 and S4 부유암): no 만남 before play, left-right movement only, Q does nothing, 등장, the first
//   만남 is a passer-by (level 1), 선 1 unlocks 떠돌이 약선, her 의뢰 raises her 1 → 2 → 3단계 (skills) and then
//   pays 엽전; distance → boss → victory; the scene sequence.
// Scenario B: 거스름 (a point to the other side, 엽전 on success), 선 and 악 counted apart, an 의뢰 failed by the next
//   만남, passer-by level 2 (give 엽전 or not, giving disabled when poor), several marks crossed at once.
// Scenario C: stages and saving: a new save opens S1 only, beating S1 opens S2 (once), death → result, 엽전 banked.
// Scenario D: gauge rules: a blast's kills overflow it once and the carry stays below full, 정요란 ×1.5, 필살기 count
//   (no charge), an 의뢰 carried into the boss fight and met there, no gauge and no 만남 in the boss fight.
// Scenario E: 엽전과 뽑기 (새 저장, 엽전 보관 → 1회·10회 뽑기는 영웅 조각만, 저장 코드, 손상된 저장 복구, 다 모으면 뽑기 불가).
// Scenario F: 영웅 (시작 영웅 2명, 잠긴 영웅은 미리보기만, 조각으로 합류·성급, 레벨업·최대 레벨, 다음 판 반영).
// Scenario G: 인연 호감도 (화면, 카드 없이 열린 인연이 나옴, 따르면 호감도 +1, 인연 단계가 수치를 올림).
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
    active: s.active,
    bombs: s.bombs,
    good: s.good,
    evil: s.evil,
    unlocked: [...s.unlocked],
    bond: { ...s.bond },
    gauge: s.gauge,
    meetReady: s.meetReady,
    encounters: s.encounters,
    skills: s.skills.map(k => k.id),
    quest: s.quest && {
      npc: s.quest.npc,
      t: s.quest.t,
      mode: s.quest.mode,
      done: s.quest.done,
      failed: s.quest.failed,
    },
    path: s.path.map(p => ({ npc: p.npc, mode: p.mode, result: p.result })),
    seed: window.__g.seed,
  };
};

/** title → stage (index into the stage list) → 선봉 → 후발: play starts */
async function setup(g, stage = 0) {
  await g.eval(() => window.__g.traceScenes());
  await g.eval(() => document.getElementById('start').click());
  await g.step(2);
  await setupFrom(g, stage);
}
/** from the stage select already open: stage → 선봉 → 후발 */
async function setupFrom(g, stage) {
  await g.pick(stage);
  await g.step(2);
  await g.pick(0);
  await g.step(2);
  await g.pick(0);
  await g.step(2);
}

/** the 처치 게이지 fills (as kills would): the 만남 opens at the end of the next step */
async function meet(g) {
  await g.eval(() => window.__g.fillGauge());
  await g.step(2);
}

/** meet the running 의뢰's target */
async function succeed(g) {
  await g.eval(() => {
    const q = window.__g.state.quest;
    if (q.t === 'combo') window.__g.state.combo = 999;
    window.__g.questEvent(q.t, 999);
  });
  await g.step(2);
}

/** stand still until the party falls (answering any 만남 on the way); capped at 3 minutes of game time */
async function waitForDeath(g) {
  for (let i = 0; i < 180 && (await g.mode()) !== 'result'; i++) {
    if ((await g.mode()) === 'choice') {
      await g.eval(() =>
        [...document.querySelectorAll('#choice .act')]
          .filter(b => !b.disabled)
          .at(-1)
          .click(),
      );
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
  await g.eval(() => document.getElementById('start').click());
  await g.step(2);
  const list = await g.cards();
  check(
    f,
    list.length === 6 &&
      list.every(c => !c.disabled) &&
      list.map(c => c.title).join() === '산길,청죽림,폐사,부유암,유운봉,천마성',
    `stage select: six stages, all open in debug roster (${list.map(c => c.title + (c.disabled ? '×' : '')).join(' ')})`,
  );
  await setupFrom(g, stage);
  let s = await g.state(S);
  check(f, s.seed === seed, `seed forced by URL (#seed=${seed})`);
  check(f, s.mode === 'play' && s.stage === stage + 1 && !s.quest, `play starts on S${stage + 1}, no 만남 first`);
  check(
    f,
    s.bombs === 1 && s.good === 0 && s.evil === 0 && s.encounters === 0,
    `run start: 필살기 1, 선 0 · 악 0 (${s.bombs}, ${s.good}, ${s.evil})`,
  );
  const hud = await g.eval(() => [
    document.getElementById('stage').textContent,
    document.getElementById('stageName').textContent,
  ]);
  check(
    f,
    /^S\d .+ · 만남 \d+%$/.test(hud[0]) && /만남 0번 · 보스까지/.test(hud[1]),
    `stage box: gauge and distance (${hud})`,
  );

  // attack and health are whole numbers, the same on every stage; enemies get tougher with distance only
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
    JSON.stringify(stats.start) ===
      JSON.stringify({
        attack: 10,
        ranks: [5, 14, 25, 40],
        rock: stage === 0 ? 18 : 33,
        boss: stage === 0 ? 1160 : 1269,
      }) && JSON.stringify(stats.at10km.ranks) === '[8,21,38,60]',
    `attack 10, health from the stage table, +5% per 1,000 m (×1.5 at 10 km), the boss at the stage's distance (${JSON.stringify(stats)})`,
  );
  await g.seconds(3);
  const spawned = await g.eval(() => window.__g.enemies.filter(e => !e.boss).map(e => e.maxHp));
  check(
    f,
    spawned.length > 0 && spawned.every(h => Number.isInteger(h)),
    `spawned enemies have whole-number health (${spawned})`,
  );
  const shot = await g.eval(() => window.__g.shots.find(s => s.basic)?.damage);
  check(f, shot === 10, `a basic shot hits for 10 (${shot})`);
  // movement is left-right on every stage: up does nothing
  await g.page.keyboard.down('ArrowUp');
  await g.seconds(0.5);
  await g.page.keyboard.up('ArrowUp');
  const y1 = (await g.state(S)).y;
  check(f, y1 === s.y, `no up-down movement (y ${s.y} → ${y1})`);

  // no manual swap; the vanguard falls → the second enters with their entry skill
  await g.key('q');
  await g.step(2);
  check(f, (await g.state(S)).active === 0, 'Q no longer swaps');
  await g.eval(() => window.__g.fell());
  await g.step(2);
  const e = await g.state(() => ({
    active: window.__g.state.active,
    effect: window.__g.effect && window.__g.effect.hero,
    second: window.__g.state.formation[1],
  }));
  check(f, e.active === 1 && e.effect === e.second, `the second enters with their entry skill (${JSON.stringify(e)})`);
  await g.eval(() => window.__g.god());

  // 만남 1: nothing unlocked yet → a passer-by at level 1 (help / ignore)
  await meet(g);
  check(f, (await g.choiceTitle()) === '행인', '만남 1: a passer-by');
  const acts = await g.eval(() => [...document.querySelectorAll('#choice .act b')].map(b => b.textContent));
  check(f, acts.join() === '돕는다,무시한다', `passer-by level 1: help or ignore (${acts})`);
  await g.act(0);
  await g.step(2);
  s = await g.state(S);
  check(
    f,
    s.mode === 'play' && s.good === 1 && s.unlocked.join() === 'yakseon' && s.path.at(-1).result === '도움',
    `helping: 선 +1 unlocks 떠돌이 약선 (${s.good}, ${s.unlocked})`,
  );

  // 만남 2–5: 떠돌이 약선 (the only 인연 unlocked); following and meeting her 의뢰 raises her a level each time
  const want = ['cheolgol', 'gitan', 'hoechun'];
  for (let level = 1; level <= 4; level++) {
    const before = await g.state(S);
    // the first time she is the only 인연 unlocked; from 선 3 on 청운 도인 could come too, so she is called
    if (level === 1) await meet(g);
    else {
      await g.eval(() => window.__g.meet('yakseon'));
      await g.step(1);
    }
    const tag = await g.page.$eval('#choice .card .tag', e => e.textContent);
    check(f, (await g.choiceTitle()) === '인연' && /정파/.test(tag), `만남 ${level + 1}: an 인연 (${tag})`);
    const reward = await g.page.$eval('#choice .act', e => e.textContent);
    check(
      f,
      level <= 3 ? new RegExp(`${level}단계`).test(reward) : /엽전 50냥/.test(reward),
      `the 의뢰 says its reward (${reward})`,
    );
    await g.act(0);
    await g.step(2);
    s = await g.state(S);
    check(f, s.quest?.npc === 'yakseon' && s.good === before.good + 1, `따른다: 선 +1 (선 ${s.good})`);
    await succeed(g);
    s = await g.state(S);
    if (level <= 3) {
      check(
        f,
        s.bond.yakseon === level && s.skills.at(-1) === want[level - 1],
        `success: 약선 ${level}단계 · ${want[level - 1]} (${JSON.stringify(s.bond)}, ${s.skills})`,
      );
      if (level === 1) check(f, s.maxHp === 100, `약선 1단계: 최대 체력 +1 (${s.maxHp})`);
    } else
      check(
        f,
        s.coins === before.coins + 50 && s.skills.length === 3,
        `after 3단계: 엽전 +50 instead (${before.coins} → ${s.coins})`,
      );
    check(f, s.path.at(-1).result === '성취', 'path records 성취');
  }
  check(f, s.unlocked.join() === 'yakseon,dosa,monk', `선 5: 청운 도인 and 철벽 노승 unlocked too (${s.unlocked})`);

  // distance → warning → boss → victory
  const phase = await reachBoss(g);
  check(f, phase === 'boss', `the boss comes after the distance (phase ${phase})`);
  await killBoss(g);
  s = await g.state(S);
  const title = await g.page.$eval('#resultTitle', e => e.textContent);
  check(f, s.mode === 'result' && /돌파/.test(title), `beating the boss ends the run (${title})`);
  const wantScenes = [
    'stageSelect',
    'formation',
    'formation',
    'stage',
    ...Array(5).fill(['encounter', 'stage']).flat(),
    'result',
  ];
  const got = await g.eval(() => window.__g.sceneLog);
  check(
    f,
    got.join() === wantScenes.join(),
    `scene sequence\n       want ${wantScenes.join(' → ')}\n       got  ${got.join(' → ')}`,
  );
  const summary = await g.page.$eval('#summary', e => e.textContent);
  check(
    f,
    /떠돌이 약선 3단계/.test(summary) && /행인/.test(summary),
    `the summary lists 인연 levels (${summary.slice(0, 120)})`,
  );
  check(f, g.errors.length === 0, 'no page errors: ' + g.errors.join(' | '));
  log.push(`S${stage + 1}: ${title}, 선 ${s.good} · 악 ${s.evil}, skills ${s.skills}`);
  await g.page.close();
  return { name: `A stage ${stage + 1} seed ${seed}`, failures: f, log };
}

async function scenarioB(browser, seed) {
  const f = [];
  const g = await openGame(file, { browser, seed });
  await setup(g, 0);
  await g.eval(() => window.__g.god());
  // 만남 1: ignore the passer-by → 악 +1 unlocks 비연 낭자 (사파)
  await meet(g);
  await g.act(1);
  await g.step(2);
  let s = await g.state(S);
  check(
    f,
    s.evil === 1 && s.good === 0 && s.unlocked.join() === 'yeonhyeop',
    `무시한다: 악 +1 unlocks 비연 낭자 (${s.evil}, ${s.unlocked})`,
  );
  // 만남 2: 비연 낭자; defy → 선 +1 (악 stays 1: the points only grow, so 선 1 unlocks 떠돌이 약선); success pays 엽전
  await meet(g);
  await g.act(1);
  await g.step(2);
  s = await g.state(S);
  check(
    f,
    s.quest?.npc === 'yeonhyeop' && s.quest.mode === 'defy' && s.good === 1 && s.evil === 1,
    `거스른다: 선 +1, 악 stays (선 ${s.good} · 악 ${s.evil})`,
  );
  check(f, s.unlocked.join() === 'yeonhyeop,yakseon', `선 1 unlocks 떠돌이 약선 too (${s.unlocked})`);
  const coins = s.coins;
  await succeed(g);
  s = await g.state(S);
  check(
    f,
    s.coins === coins + 50 && !s.bond.yeonhyeop && !s.skills.length,
    `defied and met: 엽전 +50, no level (${coins} → ${s.coins})`,
  );
  // 만남 3: 비연 낭자 again; follow, and let the next gauge fill first → the 의뢰 fails, the point stays
  await g.eval(() => (window.__g.state.forceNpc = 'yeonhyeop'));
  await meet(g);
  await g.act(0);
  await g.step(2);
  s = await g.state(S);
  check(f, s.evil === 2 && s.good === 1, `따른다: 악 +1 (선 ${s.good} · 악 ${s.evil})`);
  await meet(g);
  s = await g.state(S);
  check(
    f,
    s.path.at(-1).result === '미달' && s.evil === 2,
    `the next 만남 fails the open 의뢰 (${JSON.stringify(s.path.at(-1))})`,
  );
  check(f, (await g.choiceTitle()) === '인연', 'and a new 만남 opens');
  await g.act(0);
  await g.step(2);
  // passer-by level 2 (when no 인연 can come)
  await g.eval(() => {
    window.__g.state.unlocked = [];
    window.__g.state.coins = 10;
  });
  await meet(g);
  check(f, (await g.choiceTitle()) === '행인', 'no 인연 can come → a passer-by');
  let acts = await g.eval(() =>
    [...document.querySelectorAll('#choice .act')].map(b => ({ t: b.querySelector('b').textContent, off: b.disabled })),
  );
  check(
    f,
    acts.map(a => a.t).join() === '엽전을 베푼다,안 베푼다' && acts[0].off && !acts[1].off,
    `passer-by level 2: give or not; giving is disabled with 10냥 (${JSON.stringify(acts)})`,
  );
  await g.act(1);
  await g.step(2);
  s = await g.state(S);
  check(
    f,
    s.evil === 3 && ['yeonhyeop', 'uijeok'].every(id => s.unlocked.includes(id)) && !s.unlocked.includes('monk'),
    `안 베푼다: 악 +1 → 악 3 unlocks 비연 낭자 and 녹림 의적 (${s.evil}, ${s.unlocked})`,
  );
  await g.eval(() => {
    window.__g.state.unlocked = [];
    window.__g.state.coins = 100;
  });
  const good = s.good;
  await meet(g);
  acts = await g.eval(() => [...document.querySelectorAll('#choice .act')].map(b => b.disabled));
  check(f, !acts[0], 'giving is enabled with 100냥');
  await g.act(0);
  await g.step(2);
  s = await g.state(S);
  check(
    f,
    s.coins === 80 && s.good === good + 2 && s.evil === 3,
    `엽전을 베푼다: −20냥, 선 +2 (${s.coins}, 선 ${s.good})`,
  );
  // several marks at once: 선 0 → 5 crosses 선 1, 3 and 5
  await g.eval(() => {
    window.__g.state.good = 0;
    window.__g.state.unlocked = [];
  });
  await g.eval(() => window.__g.moveAlign(5));
  s = await g.state(S);
  check(
    f,
    s.good === 5 && ['yakseon', 'dosa', 'monk'].every(id => s.unlocked.includes(id)),
    `crossing several marks unlocks them all (${s.unlocked})`,
  );
  await g.eval(() => window.__g.moveAlign(40));
  check(f, (await g.state(S)).good === 45, 'the points have no cap');
  check(f, g.errors.length === 0, 'no page errors: ' + g.errors.join(' | '));
  await g.page.close();
  return {
    name: `B seed ${seed}`,
    failures: f,
    log: [s.path.map(p => (p.npc || '행인') + ':' + p.mode + ':' + p.result).join(' → ')],
  };
}

// Scenario C: stages and the save. A new save opens S1 only; beating S1 opens S2 (once); death opens nothing.
async function scenarioC(browser, seed) {
  const f = [];
  const g = await openGame(file, { browser, seed, roster: false });
  const P = () => g.state(() => JSON.parse(JSON.stringify(window.__g.profile)));
  check(f, (await P()).stages === 1, 'a new save opens S1');
  await g.eval(() => window.__g.traceScenes());
  await g.eval(() => document.getElementById('start').click());
  await g.step(2);
  let list = await g.cards();
  check(
    f,
    list.map(c => c.disabled).join() === 'false,true,true,true,true,true' && /잠김/.test(list[1].tag),
    `only S1 can be picked (${list.map(c => c.tag)})`,
  );
  await setupFrom(g, 0);
  await g.eval(() => window.__g.god());
  await reachBoss(g);
  await killBoss(g);
  const eyebrow = await g.page.$eval('#resultEyebrow', e => e.textContent);
  const won = await P();
  check(f, won.stages === 2 && /S2 청죽림 열림/.test(eyebrow), `beating S1 opens S2 (${eyebrow})`);
  check(f, won.coins >= 300, `a victory banks the clear bonus (${won.coins})`);
  // S1 again: nothing more opens
  await g.eval(() => document.getElementById('retry').click());
  await g.step(2);
  list = await g.cards();
  check(f, list.map(c => c.disabled).join() === 'false,false,true,true,true,true', 'S1 and S2 can be picked now');
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
    window.__g.player.hp = 1;
    window.__g.player.inv = 0;
  });
  const before = (await P()).coins;
  await waitForDeath(g);
  const title = await g.page.$eval('#resultTitle', e => e.textContent);
  const left = await g.state(() => window.__g.state.coins);
  const p = await P();
  check(f, title === '강호행 종료', `defeat title (got ${title})`);
  const run = (await g.page.$eval('#resultEyebrow', e => e.textContent)).match(/([\d,]+) \/ ([\d,]+) m/);
  check(
    f,
    run && +run[1].replace(/,/g, '') <= +run[2].replace(/,/g, ''),
    `the distance on defeat stops at the stage length (${run?.[0]})`,
  );
  check(
    f,
    p.coins === before + left && p.stages === 2,
    `death banks the 엽전 and opens nothing (${before} + ${left} → ${p.coins})`,
  );
  const got = await g.eval(() => window.__g.sceneLog);
  check(f, got.at(-2) === 'stage' && got.at(-1) === 'result', 'scene sequence ends stage → result');
  check(f, g.errors.length === 0, 'no page errors: ' + g.errors.join(' | '));
  await g.page.close();
  return { name: `C seed ${seed}`, failures: f, log: [eyebrow] };
}

// Scenario D: the gauge's rules and the 의뢰 deadline around the boss.
async function scenarioD(browser, seed) {
  const f = [];
  const g = await openGame(file, { browser, seed });
  await setup(g, 0);
  await g.eval(() => window.__g.god());
  // a 필살기 that kills 300 at once (S1 gauge 90): one 만남 waits, the carry stops below full
  await g.eval(() => {
    window.__g.state.gauge = 0;
  });
  await blastKills(g, 300);
  let s = await g.state(S);
  check(f, s.meetReady && s.gauge === 89, `one 만남 waits, the carry stays below full (gauge ${s.gauge})`);
  check(f, s.bombs === 0, `필살기 used: count 1 → 0, no charge (${s.bombs})`);
  await g.step(2);
  check(f, (await g.mode()) === 'choice', 'the waiting 만남 opens at the end of the step');
  await g.act(0);
  await g.step(2);
  s = await g.state(S);
  check(f, s.gauge === 89 && !s.meetReady, `the carry is kept for the next gauge (${s.gauge})`);
  // 정요란 fills it 1.5× while she fights
  await g.eval(() => {
    const st = window.__g.state;
    st.formation[st.active] = 'yoran';
    st.gauge = 0;
  });
  await blastKills(g, 1);
  const yoran = await g.state(() => window.__g.state.gauge);
  check(f, yoran === 1.5, `정요란: a kill fills 1.5 (${yoran})`);
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
  // the hero's level sets the attack (+1 a level) and the shots per volley (2, 3 from Lv 10, 4 from Lv 20)
  const byLevel = await g.eval(() => {
    const G = window.__g,
      st = G.state,
      id = st.formation[st.active],
      out = [];
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
    JSON.stringify(byLevel) === '[[10,2],[18,2],[19,3],[29,4]]',
    `levels 1, 9, 10, 20: attack and shots per volley (${JSON.stringify(byLevel)})`,
  );
  // a combo 의뢰 counts only the chain after it was accepted (the combo does not run down during a 만남)
  await g.eval(() => {
    const st = window.__g.state;
    st.met.monk = 1; // 철벽 노승's second 의뢰: follow = 연속 처치 40
    st.combo = 39;
    st.comboTimer = 2;
    window.__g.meet('monk');
  });
  await g.act(0);
  await g.step(1);
  // one ordinary kill: the combo reaches 40 and the kill event reports it
  await g.eval(() => {
    window.__g.state.combo = 40;
    window.__g.questEvent('combo');
  });
  s = await g.state(S);
  const comboQuest = await g.state(() => ({ ...window.__g.state.quest }));
  check(
    f,
    comboQuest.t === 'combo' && comboQuest.prog === 1 && !comboQuest.done,
    `combo 40 reached, but the 의뢰 counts 1 since it was accepted (${JSON.stringify(comboQuest)})`,
  );
  // a hero entering in a step holds the waiting 만남 to the next step
  const entry = await g.eval(() => {
    const G = window.__g,
      st = G.state;
    st.formation = ['pungun', 'cheolhyeol'];
    st.active = 0;
    for (const id of st.formation) Object.assign(st.heroHealth[id], { hp: 1, maxHp: 1, fallen: false });
    Object.assign(G.player, { inv: 0, shield: 0 });
    Object.assign(st, { hyper: 0, negate: false, effect: null, meetReady: true });
    G.enemies.length = 0;
    G.hazards.length = 0;
    G.hazards.push({ kind: 'bullet', x: G.player.x, y: G.player.y, vx: 0, vy: 0, r: 8, warn: 0 });
    window.__step(1);
    return { mode: G.mode, active: st.active, ready: st.meetReady };
  });
  await g.eval(() => window.__step(1));
  const next = await g.mode();
  check(
    f,
    entry.mode === 'play' && entry.active === 1 && entry.ready && next === 'choice',
    `an entry holds the 만남 one step (${JSON.stringify(entry)}, then ${next})`,
  );
  await g.act(0);
  await g.step(2);
  await g.eval(() => window.__g.god());
  // an 의뢰 open at the warning carries into the boss fight; met there, it pays
  await g.eval(() => window.__g.meet('milsa'));
  await g.act(0);
  await g.step(2);
  const phase = await reachBoss(g);
  s = await g.state(S);
  check(
    f,
    phase === 'boss' && s.quest?.npc === 'milsa' && !s.quest.failed,
    `the 의뢰 is still open in the boss fight (${phase})`,
  );
  const gauge = s.gauge;
  await blastKills(g, 3);
  await g.eval(() => window.__g.fillGauge());
  await g.step(2);
  check(f, (await g.mode()) === 'play', 'no 만남 in the boss fight');
  check(f, (await g.state(S)).gauge === gauge, 'kills in the boss fight do not fill the gauge');
  const bombs = (await g.state(S)).bombs;
  await succeed(g);
  s = await g.state(S);
  check(
    f,
    s.bond.milsa === 1 && s.bombs === bombs + 1,
    `met in the boss fight: 혈마 밀사 1단계, 필살기 +1 (${bombs} → ${s.bombs})`,
  );
  const skillCount = await g.eval(() => {
    const G = window.__g;
    G.raiseBond('milsa');
    G.raiseBond('milsa');
    const at3 = G.state.skills.length;
    G.raiseBond('milsa');
    return [G.state.bond.milsa, at3, G.state.skills.length];
  });
  check(
    f,
    skillCount[0] === 3 && skillCount[1] === skillCount[2],
    `raising an 인연 past 3단계 adds nothing (${skillCount})`,
  );
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
  check(f, (await g.mode()) === 'play', 'the run starts in play (no gate before it)');
  const base = await g.state(() => ({ hp: window.__g.player.hp, bombs: window.__g.state.bombs }));
  check(f, base.hp === 1 && base.bombs === 1, `a run starts with the base values (${JSON.stringify(base)})`);
  await meet(g);
  const first = await g.choiceTitle();
  check(f, first === '행인', `nothing unlocked yet: the first 만남 is a passer-by (${first})`);
  await g.act(0);
  await g.step(2);
  // 선 1 (the help) and 악 2: the score gets +5%, the 엽전 banked +10% (a short run reaches no 최대 점수 tier)
  await g.eval(() => {
    window.__g.state.evil = 2;
    window.__g.state.coins = 700;
    window.__g.player.hp = 1;
    window.__g.player.inv = 0;
  });
  await waitForDeath(g);
  const left = await g.state(() => window.__g.state.coins);
  p = await P();
  const settleText = await g.eval(() => document.getElementById('settle').textContent);
  check(
    f,
    p.coins === Math.floor(left * 1.1) &&
      left >= 700 &&
      /선 1 점수 \+5%/.test(settleText) &&
      /악 2 \+10%/.test(settleText),
    `엽전 left at the end is banked with 악 +10%, the score gets 선 +5% (${left} → bank ${p.coins}; ${settleText})`,
  );
  // 뽑기 from the result screen: one draw, then ten
  await g.eval(() => document.getElementById('resultGacha').click());
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
    document.getElementById('hubCards').textContent,
  ]);
  check(f, /\/ 12/.test(hub[0]) && /호감도 0/.test(hub[1]), `the title shows the new counts (${hub})`);
  // save code: export, wipe, import
  await g.eval(() => document.getElementById('openGacha').click());
  const code = await g.eval(() => document.getElementById('saveCode').value);
  check(f, code.startsWith('PUNGUN2:'), 'save code has the new prefix');
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
    g.page.$$eval('#choice button.card', els =>
      els.map(e => ({ name: e.querySelector('h3').textContent, locked: e.classList.contains('locked') })),
    );
  // 영웅 screen: grid, joined first; popups
  await g.eval(() => document.getElementById('openRoster').click());
  const tiles = await g.page.$$eval('#collectionGrid .tile', els =>
    els.map(e => ({ locked: e.classList.contains('locked'), text: e.textContent })),
  );
  check(
    f,
    tiles.length === 12 && tiles.filter(t => t.locked).length === 10 && !tiles[0].locked && !tiles[1].locked,
    `영웅 grid: 2 joined, then 10 locked (${tiles.map(t => t.locked)})`,
  );
  check(
    f,
    tiles.slice(2).every(t => /뽑기에서 획득/.test(t.text)),
    'locked tiles say they come from 뽑기',
  );
  const owned0 = await detailOf(g, 0),
    locked0 = await detailOf(g, 2);
  check(
    f,
    /성급 1/.test(owned0.head) && owned0.track.join() === 'current,next,next,next,next',
    `a joined hero's popup: 성급 1 and the track (${owned0.head}, ${owned0.track})`,
  );
  check(f, /잠김/.test(locked0.head) && /뽑기/.test(locked0.progress), `a locked hero's popup (${locked0.progress})`);
  await g.eval(() => document.getElementById('collectionClose').click());

  // formation: owned first; a locked hero cannot be confirmed
  await g.eval(() => document.getElementById('start').click());
  await g.step(2);
  await g.pick(0); // S1 산길
  await g.step(2);
  let cards = await formation();
  check(
    f,
    cards.length === 12 && cards.slice(0, 2).every(c => !c.locked) && cards.slice(2).every(c => c.locked),
    `출전: 2 owned first, 10 locked (${cards.map(c => c.name + (c.locked ? '×' : '')).join(' ')})`,
  );
  await g.pick(-1);
  await g.step(2);
  const stuck = await g.eval(() => ({
    title: document.getElementById('choiceTitle').textContent,
    disabled: document.getElementById('formationConfirm').disabled,
    detail: document.querySelector('.formation-preview').textContent,
  }));
  check(
    f,
    stuck.title === '선봉' && stuck.disabled && /뽑기/.test(stuck.detail),
    `a locked hero is previewed and cannot be confirmed (${JSON.stringify(stuck)})`,
  );
  await g.pick(0);
  await g.step(2);
  await g.pick(0);
  await g.step(2);
  // a piece of 철혈 and pieces of 풍운객 arrive mid-run (as from 뽑기): this run keeps its snapshot
  await g.eval(() =>
    window.__g.loadProfile({ ...window.__g.profile, heroes: { pungun: 6, bicheon: 1, cheolhyeol: 1 } }),
  );
  check(f, (await g.state(() => window.__g.state.meta.heroes.pungun)) === 0, 'the run keeps the 성급 it started with');
  await g.eval(() => {
    window.__g.player.hp = 1;
    window.__g.player.inv = 0;
  });
  await waitForDeath(g);

  // 레벨업 on the 영웅 screen: 엽전 for one level, capped by 성급 (풍운객 is ★3 now: up to Lv 30)
  await g.eval(() => document.getElementById('home').click());
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
    document.getElementById('detailClose').click();
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

  // next run: 철혈 joined, 풍운객 ★3 (6 pieces) and Lv 2 in the preview and the snapshot
  await g.eval(() => document.getElementById('start').click());
  await g.step(2);
  await g.pick(0);
  await g.step(2);
  cards = await formation();
  check(
    f,
    cards.filter(c => !c.locked).length === 3 && cards.slice(0, 3).every(c => !c.locked),
    `next run: 3 owned first (${cards.map(c => c.name + (c.locked ? '×' : '')).join(' ')})`,
  );
  const preview = await g.eval(() => document.querySelector('.formation-preview').textContent);
  check(
    f,
    /성급 3/.test(preview) && /Lv 2\/30/.test(preview) && /반경 100/.test(preview) && /시간 \+50%/.test(preview),
    `풍운객 shows 성급 3, the stronger trait and the ★3 entry change (${preview})`,
  );
  await g.pick(0);
  await g.step(2);
  await g.pick(0);
  await g.step(2);
  const level = await g.state(() => window.__g.state.meta.heroes);
  check(f, level.pungun === 2 && level.cheolhyeol === 0, `snapshot has 성급 − 1 (${JSON.stringify(level)})`);
  const lv = await g.state(() => ({ level: window.__g.state.meta.levels.pungun, attack: window.__g.stats.attack }));
  check(f, lv.level === 2 && lv.attack === 11, `the run takes Lv 2: attack 11 (${JSON.stringify(lv)})`);
  check(f, g.errors.length === 0, 'no page errors: ' + g.errors.join(' | '));
  await g.page.close();
  return { name: `F seed ${seed}`, failures: f, log: [`preview "${preview.slice(0, 60)}…"`] };
}

// Scenario G: 인연 호감도. No cards: every 인연 can come once the scale unlocks them. Following raises 호감도 at once
// (saved); the run keeps the 인연 levels it started with; 호감도 levels (1·3·6·10·15) raise the 인연's numbers.
async function scenarioG(browser, seed) {
  const f = [];
  const g = await openGame(file, { browser, seed, roster: false });
  const P = () => g.state(() => JSON.parse(JSON.stringify(window.__g.profile)));
  await g.eval(() => document.getElementById('openCards').click());
  const rows = await g.page.$$eval('#collectionGrid .tile', els =>
    els.map(e => ({ locked: e.classList.contains('locked'), text: e.textContent })),
  );
  check(
    f,
    rows.length === 6 && rows.every(r => !r.locked && /호감도 0 \/ 1/.test(r.text)),
    `six 인연, none locked, 호감도 0 (${rows.map(r => r.text).join(' | ')})`,
  );
  await g.eval(() => document.getElementById('collectionClose').click());

  // a new save: helping unlocks 떠돌이 약선, and she comes with no card
  await setup(g, 0);
  await g.eval(() => window.__g.god());
  await meet(g);
  await g.act(0);
  await g.step(2);
  await meet(g);
  const card = await g.page.$eval('#choice .card', e => e.textContent);
  check(
    f,
    (await g.choiceTitle()) === '인연' && /떠돌이 약선/.test(card),
    `she comes without a card (${card.slice(0, 40)})`,
  );
  check(f, /호감도 \+1/.test(card), 'the 따른다 choice says 호감도 +1');
  // following raises her 호감도 at once; the run keeps the level it started with
  await g.act(0);
  await g.step(2);
  let p = await P();
  const kept = await g.state(() => window.__g.state.meta.cards.yakseon);
  check(
    f,
    p.bonds.yakseon === 1 && kept === 0,
    `따른다: 호감도 1 saved, this run keeps level 0 (${p.bonds.yakseon}, ${kept})`,
  );
  // defying does not raise 호감도
  await g.eval(() => window.__g.meet('yakseon'));
  await g.act(1);
  await g.step(2);
  check(f, (await P()).bonds.yakseon === 1, '거스른다: 호감도 unchanged');

  // the screen and the next run read 호감도
  await g.eval(() => window.__g.loadProfile({ bonds: { dosa: 6, yeonhyeop: 10, monk: 15, milsa: 99, uijeok: 1 } }));
  await g.eval(() => {
    for (const h of Object.values(window.__g.state.heroHealth)) h.maxHp = h.hp = 1;
    window.__g.player.inv = 0;
  });
  await waitForDeath(g);
  await g.eval(() => document.getElementById('home').click());
  await g.eval(() => document.getElementById('openCards').click());
  const grid = await g.page.$$eval('#collectionGrid .tile', els => els.map(e => e.textContent));
  // 인연 order: 청운 도인, 혈마 밀사, 철벽 노승, 비연 낭자, 떠돌이 약선, 녹림 의적
  check(
    f,
    /호감도 6 \/ 10/.test(grid[0]) &&
      /최고 단계/.test(grid[1]) &&
      /최고 단계/.test(grid[2]) &&
      /호감도 0 \/ 1/.test(grid[4]),
    `the grid shows 호감도 (${grid.join(' | ')})`,
  );
  const dosa = await detailOf(g, 0),
    yeon = await detailOf(g, 3);
  check(
    f,
    /3단계/.test(dosa.head) && dosa.track.join() === 'done,done,done,current,next' && /호감도/.test(dosa.progress),
    `청운 도인 popup: level 3, the track, 호감도 (${dosa.head}, ${dosa.track}, ${dosa.progress})`,
  );
  check(
    f,
    /정파 · 선 3에서 열림/.test(dosa.body) && /1단계 「운류보」/.test(dosa.body) && /따른다/.test(dosa.body),
    `the popup lists side, unlock mark, levels and how to earn 호감도 (${dosa.body.slice(0, 120)})`,
  );
  check(f, /비연수/.test(yeon.body) && /\+18%/.test(yeon.body), `비연 낭자 level 4: +18% (${yeon.body.slice(0, 120)})`);
  await g.eval(() => document.querySelectorAll('#collectionGrid .tile')[0].click());
  await g.key('Escape');
  const afterOne = await g.eval(() => [
    document.getElementById('detail').classList.contains('hidden'),
    document.getElementById('collection').classList.contains('hidden'),
  ]);
  await g.key('Escape');
  const afterTwo = await g.eval(() => document.getElementById('collection').classList.contains('hidden'));
  check(f, afterOne.join() === 'true,false' && afterTwo, `Escape closes the popup, then the screen`);

  // a run with these 호감도: the snapshot, and the level at work
  await g.eval(() => document.getElementById('start').click());
  await g.step(2);
  await setupFrom(g, 0);
  const meta = await g.state(() => window.__g.state.meta.cards);
  check(
    f,
    meta.dosa === 3 && meta.yeonhyeop === 4 && meta.monk === 5 && meta.yakseon === 0 && meta.uijeok === 1,
    `snapshot has 인연 levels from 호감도 (${JSON.stringify(meta)})`,
  );
  await g.eval(() => window.__g.god());
  const shots = await g.eval(() => {
    const G = window.__g;
    G.raiseBond('yeonhyeop');
    G.raiseBond('yeonhyeop');
    G.raiseBond('uijeok');
    G.raiseBond('uijeok');
    G.shots.length = 0;
    G.trig('step', { x: G.player.x, y: G.player.y });
    G.trig('rowClear');
    const qi = G.shots.find(s => s.kind === 'qi' && !s.basic),
      blades = G.shots.filter(s => s.color === '#ffb38f');
    return { janyoung: qi?.damage, uihyeop: blades[0]?.damage, n: blades.length };
  });
  check(f, shots.n === 5, `의협난도: 5 blades (${shots.n})`);
  // 잔영검 2.2× at level 4 (+30%) against 의협난도 5× at level 1: the ratio shows the level's boost
  const ratio = shots.janyoung / shots.uihyeop;
  check(f, Math.abs(ratio - (2.2 * 1.3) / 5) < 0.01, `인연 level 4 raises 잔영검 by 30% (ratio ${ratio.toFixed(3)})`);
  check(f, g.errors.length === 0, 'no page errors: ' + g.errors.join(' | '));
  await g.page.close();
  return { name: `G seed ${seed}`, failures: f, log: [] };
}

// Scenario H: 의뢰 targets grow with each 의뢰 of the same 인연 (1/3, 2/3, all), the row gap (2 s → 0.8 s with
// distance), pickups pop up and fall with no magnet, the 자석 and 점수 두 배 items (10 s, retaken = full time), one
// 엽전 a kill, 무아지경 rows by distance (엽전 only), and the 최대 점수 of every stage.
async function scenarioH(browser, seed) {
  const f = [];
  const g = await openGame(file, { browser, seed });
  await setup(g, 0);
  await g.eval(() => window.__g.god());
  // 의뢰 targets: the same 인연 three times in a run
  const targets = [];
  for (let k = 0; k < 3; k++) {
    await g.eval(() => (window.__g.state.forceNpc = 'yakseon'));
    await meet(g);
    await g.act(0);
    await g.step(2);
    targets.push(
      await g.eval(k => {
        const npc = window.__g.npcs.yakseon,
          q = npc.quests[k % npc.quests.length].follow;
        return { n: q.n, target: window.__g.state.quest.target };
      }, k),
    );
  }
  const want = targets.map((t, k) => Math.max(1, Math.round((t.n * [1, 2, 3][k]) / 3)));
  check(
    f,
    targets.every((t, k) => t.target === want[k]),
    `의뢰 targets 1/3 · 2/3 · all (${JSON.stringify(targets)} want ${want})`,
  );
  // row gap: 2 s at the start, 0.8 s at the boss, even in between; the real timer follows it
  const gaps = await g.eval(() => [0, 6000, 12000, 20000].map(m => window.__g.rowGap(m, 12000)));
  check(f, gaps.join() === '2,1.4,0.8,0.8', `row gap 2 → 0.8 s with distance (${gaps})`);
  await g.eval(() => {
    window.__g.state.distance = 6000;
    window.__g.state.rowTimer = 0;
  });
  await g.step(1);
  const rowTimer = await g.state(() => window.__g.state.rowTimer);
  check(f, Math.abs(rowTimer - 1.4) < 0.02, `the row timer at 6,000 m of 12,000 m is 1.4 s (${rowTimer})`);
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
  await g.step(60);
  const p2 = await P();
  check(
    f,
    p0.vy < 0 && p1.y < p0.y && p2.vy > 0 && p2.y > p1.y && Math.abs(p2.x - p0.x) < 75,
    `a pickup pops up, then falls, not pulled in (${JSON.stringify([p0, p1, p2])})`,
  );
  // the 자석 item: 10 s, pickups within reach are pulled in
  await g.eval(() => {
    window.__g.pickups.length = 0;
    const pl = window.__g.player;
    window.__g.addPickup('magnet', pl.x, pl.y);
  });
  await g.step(1);
  let s = await g.state(() => ({ magnet: window.__g.state.magnet, coins: window.__g.state.coins }));
  check(f, Math.abs(s.magnet - 10) < 0.05, `자석 runs 10 s (${s.magnet})`);
  await g.eval(() => {
    const pl = window.__g.player;
    window.__g.addPickup('coin', pl.x + 110, pl.y - 200);
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
  check(f, Math.abs(s.magnet - 10) < 0.05, `retaking 자석 sets it back to 10 s, no stacking (${s.magnet})`);
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
    Math.abs(before.double - 10) < 0.05 && after - before.score > 20 && after - before.score < 21,
    `점수 두 배: 10 s, a 엽전 scores 20 (+${after - before.score})`,
  );
  // one 엽전 a kill (an item drops with 2% each, so a few kills are checked)
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
  // 무아지경: rows come by distance (as much faster as it runs), it cuts through them: the kills fill the gauge,
  // count for the 연속·근접·스침 의뢰 and drop 엽전 only (no items)
  await g.eval(() => {
    const s = window.__g.state;
    window.__g.enemies.length = 0;
    window.__g.pickups.length = 0;
    s.distance = 3000;
    s.rowTimer = 0;
    s.gauge = 0;
    s.stats = {};
    s.hyper = 2;
  });
  const k0 = await g.state(() => window.__g.state.kills);
  const items = [];
  for (let i = 0; i < 12; i++) {
    await g.step(10);
    items.push(...(await g.state(() => window.__g.pickups.filter(p => p.kind !== 'coin').map(p => p.kind))));
  }
  const h1 = await g.state(() => ({
    kills: window.__g.state.kills,
    gauge: window.__g.state.gauge,
    stats: window.__g.state.stats,
  }));
  const hyperKills = h1.kills - k0;
  check(
    f,
    hyperKills >= 15 &&
      h1.gauge === hyperKills &&
      h1.stats.nearKill >= 10 &&
      h1.stats.graze === h1.stats.nearKill &&
      items.length === 0,
    `2 s of 무아지경: rows by distance, kills fill the gauge and the 의뢰, no items (${hyperKills} kills, ${JSON.stringify(h1)}, items ${items})`,
  );
  // 최대 점수 of each stage: whole thousands, longer and harder stages give more
  const max = await g.eval(() => [1, 2, 3, 4, 5, 6].map(n => window.__g.maxScore(n)));
  check(f, max.every(m => m > 0 && m % 1000 === 0) && max[5] > max[0], `최대 점수 per stage (${max})`);
  check(f, g.errors.length === 0, 'no page errors: ' + g.errors.join(' | '));
  await g.page.close();
  return { name: `H seed ${seed}`, failures: f, log: [`최대 점수 ${max.join(' · ')}`] };
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
  await g.eval(() => document.getElementById('detailClose').click());
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
