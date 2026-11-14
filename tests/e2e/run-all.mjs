// End-to-end flow tests on the built single file (run `npm run build:single` first).
// usage: node tests/e2e/run-all.mjs [build.html]
// Scenario A (both courses): 편대 → 인연 따름 → 화두 성취 → 돈오 → 교대 → 보스 → 투학 (엽전/조합) → 객잔 구매
//   (명상, 수소문, 약주) → 3 gates → 최종 관문 → 결과.
// Scenario B: 거스름 + 화두 미달 → 관계 그대로, 같은 인연이 다시 나타남 → 거스름 성취 → 관계 −1, 숙적 +1.
// Scenario C: 사망 → 결과 화면.
// Scenario D: 보스 기술 보상 (항상 계열뿐이면 새 기술, 발동 기술이 있으면 강화).
// Scenario E: 메타 성장 (엽전 보관 → 수련 → 다음 판 반영, 저장 코드, 손상된 저장 복구).
// Scenario F: 영웅 수집 (시작 영웅 2명, 잠긴 영웅은 미리보기만, 관문 돌파로 숙련·합류, 다음 판 반영).
// Scenario G: 인연 카드 (의뢰 성공·완주로 조각, 카드 단계로 고유 기술 강화와 전수 조건 완화).
// Every scenario also checks the exact scene sequence (systems/scene-flow.ts).
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
    active: s.active,
    skills: s.skills.map(k => k.id + (k.mod ? '+' + k.mod : '')),
    quest: s.quest && { npc: s.quest.npc, t: s.quest.t, done: s.quest.done },
    path: s.path.map(p => ({ npc: p.npc, mode: p.mode, result: p.result })),
    rel: { ...s.rel },
    meditate: !!s.meditate,
    forceNpc: s.forceNpc || null,
    seed: window.__g.seed,
  };
};

async function setup(g, course) {
  await g.eval(() => window.__g.traceScenes());
  await g.eval(() => document.getElementById('start').click());
  await g.step(2);
  await g.pick(course);
  await g.step(2);
  await g.pick(0);
  await g.step(2);
  await g.pick(0);
  await g.step(2);
}

// boss of the current gate: skip the flight, wait for the boss, kill it, wait for the reward screen
async function clearBoss(g) {
  await g.eval(() => window.__g.skipFlight());
  await g.seconds(4.5);
  const phase = await g.state(() => window.__g.state.phase);
  await g.eval(() => window.__g.killBoss());
  await g.seconds(3.5);
  return phase;
}

async function finish(g) {
  for (let i = 0; i < 8 && (await g.mode()) !== 'result'; i++) {
    if ((await g.mode()) === 'choice') {
      await g.eval(() => {
        const el =
          document.querySelector('#choice .act') ||
          [...document.querySelectorAll('#choice button.card:not([disabled])')].at(-1);
        el?.click();
      });
      await g.step(2);
    }
    if ((await g.mode()) === 'play') await clearBoss(g);
  }
}

async function scenarioA(browser, course, seed) {
  const f = [];
  const g = await openGame(file, { browser, seed });
  const log = [];
  await setup(g, course);
  check(f, (await g.state(S)).seed === seed, `seed forced by URL (#seed=${seed})`);
  let forced = null;
  for (let gate = 1; gate <= 3; gate++) {
    const at = `gate ${gate}`;
    check(f, (await g.mode()) === 'choice', `${at}: crossroads opens`);
    await g.act(0);
    await g.step(2);
    await g.eval(() => window.__g.god());
    let s = await g.state(S);
    check(f, s.mode === 'play' && s.quest && !s.quest.done, `${at}: 화두 accepted, play starts`);
    check(f, s.path.at(-1).mode === 'follow', `${at}: path records 따른다`);
    if (forced) check(f, s.quest.npc === forced, `${at}: 수소문 replaced the 인연 (${s.quest.npc} vs ${forced})`);
    const npc = s.quest.npc;

    // 교대 (user-controlled swap)
    await g.eval(() => window.__g.setSwap());
    await g.key('q');
    await g.step(6);
    check(f, (await g.state(S)).active !== s.active, `${at}: Q swaps the active hero`);

    // 화두 성취 → 돈오
    await g.eval(() => {
      const q = window.__g.state.quest;
      if (q.t === 'combo') window.__g.state.combo = 999;
      window.__g.questEvent(q.t, 999);
    });
    await g.seconds(2);
    const dono = await g.cards();
    check(f, (await g.mode()) === 'choice' && dono.length >= 2, `${at}: 돈오 opens with choices`);
    if (gate === 2) check(f, dono.length === 3, `${at}: 명상 gives 3 돈오 choices (got ${dono.length})`);
    else check(f, dono.length === 2, `${at}: 돈오 has 2 choices (got ${dono.length})`);
    const skillsBefore = (await g.state(S)).skills.length;
    await g.pick(0);
    await g.step(2);
    s = await g.state(S);
    check(f, s.skills.length === skillsBefore + 1, `${at}: 돈오 pick learns a skill`);
    check(f, s.path.at(-1).result === '성취', `${at}: 화두 result 성취 (got ${s.path.at(-1).result})`);
    check(f, (s.rel[npc] || 0) >= 1, `${at}: 관계 +1 with ${npc}`);

    // 보스 → 투학
    const phase = await clearBoss(g);
    check(f, phase === 'boss', `${at}: boss appears after the flight (phase ${phase})`);
    check(f, (await g.choiceTitle()) === '보스 기술', `${at}: 보스 기술 (투학) opens after the boss`);
    const tuhak = await g.cards();
    check(f, /냥$/.test(tuhak.at(-1).title), `${at}: 투학 offers 엽전 as the last card`);
    // top up so every 객잔 item is affordable, and lose HP so 약주 is useful
    await g.eval(() => {
      window.__g.state.coins += 600;
      window.__g.player.hp = 1;
    });
    const beforeTuhak = await g.state(S);
    // gate 1 takes the coins; later gates combine when a combinable 깨달음 exists (passive / combined ones are skipped)
    const combine = gate > 1 && tuhak.length > 1;
    await g.pick(combine ? 0 : -1);
    await g.step(2);
    s = await g.state(S);
    if (combine) check(f, s.skills.join() !== beforeTuhak.skills.join(), `${at}: 투학 조합 changes the skill set`);
    else check(f, s.coins > beforeTuhak.coins, `${at}: 엽전 reward adds coins`);

    // 객잔
    check(f, (await g.choiceTitle()) === '객잔', `${at}: 객잔 opens`);
    const coins0 = s.coins,
      hp0 = s.hp; // nextStage() already healed 1 after the gate
    const bought = [];
    for (const item of gate === 1 ? ['명상', '수소문', '약주와 휴식'] : ['약주와 휴식'])
      if (await g.pickTitled(item)) {
        bought.push(item);
        await g.step(1);
      }
    s = await g.state(S);
    check(f, bought.includes('약주와 휴식') && s.hp === hp0 + 1, `${at}: 약주 heals 1 (hp ${hp0} → ${s.hp})`);
    check(f, s.coins < coins0, `${at}: purchases cost coins`);
    if (gate === 1) {
      check(f, s.meditate, `${at}: 명상 bought`);
      check(f, bought.includes('수소문') && s.forceNpc, `${at}: 수소문 sets the next 인연`);
      forced = s.forceNpc;
    } else forced = null;
    log.push(`${at} ${npc} 돈오${dono.length} 투학→${s.skills.join(',')} 객잔[${bought.join(',')}] ${s.coins}냥`);
    await g.pick(-1);
    await g.step(2);
  }
  await finish(g);
  const s = await g.state(S);
  const title = await g.page.$eval('#resultTitle', e => e.textContent);
  check(f, s.mode === 'result', `final: result screen reached (mode ${s.mode})`);
  const gateTrail = ['crossroads', 'stage', 'dono', 'stage', 'tuhak', 'inn'];
  const want = [
    'course',
    'formation',
    'formation',
    ...gateTrail,
    ...gateTrail,
    ...gateTrail,
    'finalGate',
    'stage',
    'result',
  ];
  const got = await g.eval(() => window.__g.sceneLog);
  check(
    f,
    got.join() === want.join(),
    `scene sequence\n       want ${want.join(' → ')}\n       got  ${got.join(' → ')}`,
  );
  check(f, g.errors.length === 0, 'no page errors: ' + g.errors.join(' | '));
  log.push(`result "${title}" stage ${s.stage}, path ${s.path.map(p => p.npc + ':' + p.result).join(' → ')}`);
  await g.page.close();
  return { name: `A course ${course} seed ${seed}`, failures: f, log };
}

async function scenarioB(browser, course, seed) {
  const f = [];
  const g = await openGame(file, { browser, seed });
  await setup(g, course);
  await g.act(1); // 거스른다
  await g.step(2);
  await g.eval(() => window.__g.god());
  let s = await g.state(S);
  const npc = s.quest.npc;
  check(f, s.path.at(-1).mode === 'defy', 'gate 1: path records 거스른다');
  await clearBoss(g); // 화두 not fulfilled
  s = await g.state(S);
  check(f, s.path.at(-1).result === '미달', `gate 1: 화두 result 미달 (got ${s.path.at(-1).result})`);
  check(f, Object.keys(s.rel).length === 0, `gate 1: 미달 leaves 관계 unchanged (${JSON.stringify(s.rel)})`);
  await g.pick(-1); // 투학: 엽전
  await g.step(2);
  await g.pick(-1); // 객잔: 길을 나선다
  await g.step(2);
  await g.act(1); // 거스른다 again, and fulfil it this time
  await g.step(2);
  s = await g.state(S);
  check(f, s.quest.npc === npc, `gate 2: after 미달 the same 인연 returns (${s.quest.npc} vs ${npc})`);
  await g.eval(() => {
    const q = window.__g.state.quest;
    if (q.t === 'combo') window.__g.state.combo = 999;
    window.__g.questEvent(q.t, 999);
  });
  await g.step(2);
  s = await g.state(S);
  check(f, s.rel[npc] === -1, `gate 2: 거스름 성취 gives 관계 −1 with ${npc} (${s.rel[npc]})`);
  check(
    f,
    Object.entries(s.rel).some(([k, v]) => k !== npc && v === 1),
    `gate 2: the rival gains 관계 +1`,
  );
  // 미달 skips 돈오; the stage still ends in 투학 and 객잔 (gate 2's 돈오 opens after its slow-motion, not yet here)
  const want = ['course', 'formation', 'formation', 'crossroads', 'stage', 'tuhak', 'inn', 'crossroads', 'stage'];
  const got = await g.eval(() => window.__g.sceneLog);
  check(
    f,
    got.join() === want.join(),
    `scene sequence\n       want ${want.join(' → ')}\n       got  ${got.join(' → ')}`,
  );
  check(f, g.errors.length === 0, 'no page errors: ' + g.errors.join(' | '));
  await g.page.close();
  return {
    name: `B course ${course} seed ${seed}`,
    failures: f,
    log: [`${npc} defy → 미달 → ${s.quest.npc} defy → 성취, 관계 ${JSON.stringify(s.rel)}`],
  };
}

async function scenarioC(browser, course, seed) {
  const f = [];
  const g = await openGame(file, { browser, seed });
  await setup(g, course);
  await g.act(0);
  await g.step(2);
  // stand still with 1 HP until something hits (capped at 3 minutes of game time)
  await g.eval(() => {
    window.__g.player.hp = 1;
  });
  for (let i = 0; i < 180 && (await g.mode()) !== 'result'; i++) await g.seconds(1);
  const title = await g.page.$eval('#resultTitle', e => e.textContent);
  check(f, (await g.mode()) === 'result', 'death leads to the result screen');
  check(f, title === '강호행 종료', `defeat title (got ${title})`);
  const got = await g.eval(() => window.__g.sceneLog);
  check(f, got.at(-2) === 'stage' && got.at(-1) === 'result', `scene sequence ends stage → result`);
  check(f, g.errors.length === 0, 'no page errors: ' + g.errors.join(' | '));
  await g.page.close();
  return { name: `C course ${course} seed ${seed}`, failures: f, log: [got.join(' → ')] };
}

// Scenario D: boss skill rewards. With only a passive skill there is nothing to enhance, so the boss skill is
// offered as a new ★ skill; with an active skill it is offered as a ★★ enhancement of that skill.
async function scenarioD(browser, seed) {
  const f = [];
  const titles = async () => (await g.cards()).map(c => c.title);
  let g = await openGame(file, { browser, seed });
  await setup(g, 0);
  await g.act(0);
  await g.step(2);
  await g.eval(() => window.__g.learn('chukgi'));
  await clearBoss(g);
  check(f, (await g.choiceTitle()) === '보스 기술', '보스 기술 opens after the boss');
  const passiveOnly = await titles();
  check(f, passiveOnly.includes('녹림도법'), `passive-only: boss skill offered as a new skill (${passiveOnly})`);
  check(f, await g.pickTitled('녹림도법'), 'the new boss skill can be picked');
  await g.step(2);
  const learned = await g.state(() => window.__g.state.skills.map(k => k.id + (k.mod ? '+' + k.mod : '')));
  check(f, learned.includes('art_dobeop'), `boss skill learned (${learned})`);
  check(f, g.errors.length === 0, 'no page errors: ' + g.errors.join(' | '));
  await g.page.close();

  g = await openGame(file, { browser, seed });
  await setup(g, 0);
  await g.act(0);
  await g.step(2);
  await g.eval(() => window.__g.learn('janyoung'));
  await clearBoss(g);
  const active = await titles();
  check(f, active.includes('잔영검') && !active.includes('녹림도법'), `active skill: enhancement only (${active})`);
  check(f, await g.pickTitled('잔영검'), 'the enhancement can be picked');
  await g.step(2);
  const enhanced = await g.state(() => window.__g.state.skills.map(k => k.id + (k.mod ? '+' + k.mod : '')));
  check(f, enhanced.includes('janyoung+3'), `skill enhanced (${enhanced})`);
  check(f, g.errors.length === 0, 'no page errors: ' + g.errors.join(' | '));
  await g.page.close();
  return { name: `D seed ${seed}`, failures: f, log: [`passive-only → ${learned} · active → ${enhanced}`] };
}

// Scenario E: meta progression. An empty profile is the base game; 엽전 left at the end of a run is banked;
// 수련 spends it; the next run starts with the bought stats; the save code round-trips; bad saves are repaired.
async function scenarioE(browser, seed) {
  const f = [];
  const g = await openGame(file, { browser, seed });
  const P = () => g.state(() => JSON.parse(JSON.stringify(window.__g.profile)));
  const runStart = async () => {
    await setup(g, 0);
    await g.act(0);
    await g.step(2);
    return g.state(() => ({
      hp: window.__g.player.hp,
      bombs: window.__g.state.bombs,
      meta: window.__g.state.meta.stats,
    }));
  };
  const die = async coins => {
    await g.eval(coins => {
      window.__g.state.coins = coins;
      window.__g.player.hp = 1;
      window.__g.player.inv = 0;
    }, coins);
    for (let i = 0; i < 180 && (await g.mode()) !== 'result'; i++) await g.seconds(1);
    return g.state(() => window.__g.state.coins);
  };
  let p = await P();
  check(
    f,
    p.coins === 0 && Object.values(p.stats).every(v => v === 0),
    `fresh profile is empty (${JSON.stringify(p)})`,
  );
  const base = await runStart();
  check(f, base.hp === 3 && base.bombs === 2, `empty profile starts with base values (${JSON.stringify(base)})`);
  const left = await die(700);
  p = await P();
  check(f, p.coins === left && left >= 700, `엽전 left at the end is banked (${left} → bank ${p.coins})`);
  // 수련 from the result screen: buy 공격력 twice (200 + 300)
  await g.eval(() => document.getElementById('resultTraining').click());
  for (let i = 0; i < 2; i++) await g.eval(() => document.querySelector('.stat-buy[data-id="power"]').click());
  p = await P();
  check(
    f,
    p.stats.power === 2 && p.coins === left - 500,
    `수련 spends the bank (power ${p.stats.power}, bank ${p.coins})`,
  );
  const tooDear = await g.eval(() => document.querySelector('.stat-buy[data-id="hp"]').disabled);
  check(f, tooDear === p.coins < 1500, 'a stat the bank cannot pay for is disabled');
  // save code: export, wipe, import
  const code = await g.eval(() => document.getElementById('saveCode').value);
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
  await g.eval(() => document.getElementById('trainingClose').click());
  // next run reads the bought stats
  await g.eval(() =>
    window.__g.loadProfile({ coins: 0, stats: { power: 2, hp: 1, bombs: 1, swap: 2, charge: 99, fortune: -3 } }),
  );
  p = await P();
  check(
    f,
    p.stats.charge === 6 && p.stats.fortune === 0,
    `out-of-range levels are repaired (${JSON.stringify(p.stats)})`,
  );
  const next = await runStart();
  check(
    f,
    next.hp === 4 && next.bombs === 3 && next.meta.power === 2,
    `next run starts stronger (${JSON.stringify(next)})`,
  );
  // the run keeps its snapshot even if the profile changes mid-run
  await g.eval(() => window.__g.loadProfile({ stats: { power: 10 } }));
  check(f, (await g.state(() => window.__g.state.meta.stats.power)) === 2, 'a run keeps the snapshot it started with');
  check(f, g.errors.length === 0, 'no page errors: ' + g.errors.join(' | '));
  await g.page.close();
  return {
    name: `E seed ${seed}`,
    failures: f,
    log: [`bank ${left} → power 2 → next run hp ${next.hp}, 필살기 ${next.bombs}`],
  };
}

// Scenario F: hero collection, with the default roster (two starters). Locked heroes can be previewed, not chosen;
// clearing gates raises mastery and records, which unlock heroes; the next run reads the new mastery level.
async function scenarioF(browser, seed) {
  const f = [];
  const g = await openGame(file, { browser, seed, roster: false });
  const P = () => g.state(() => JSON.parse(JSON.stringify(window.__g.profile)));
  const owned = p =>
    Object.keys(p.heroes)
      .filter(id => p.heroes[id].owned)
      .sort()
      .join();
  const formation = () =>
    g.page.$$eval('#choice button.card', els =>
      els.map(e => ({ name: e.querySelector('h3').textContent, locked: e.classList.contains('locked') })),
    );
  let p = await P();
  check(f, owned(p) === 'bicheon,pungun', `a fresh profile owns the two starters (${owned(p)})`);

  // 영웅 screen on the title: a grid, joined heroes first; a tile opens its detail popup
  await g.eval(() => document.getElementById('openRoster').click());
  const tiles = await g.page.$$eval('#collectionGrid .tile', els =>
    els.map(e => ({ locked: e.classList.contains('locked'), text: e.textContent })),
  );
  check(
    f,
    tiles.length === 6 && tiles.filter(t => t.locked).length === 4 && !tiles[0].locked && !tiles[1].locked,
    `영웅 grid: 2 joined, then 4 locked (${tiles.map(t => t.locked)})`,
  );
  check(
    f,
    tiles.slice(2).every(t => /\d+ \/ \d+/.test(t.text)),
    'locked tiles show their progress',
  );
  const owned0 = await detailOf(g, 0),
    locked0 = await detailOf(g, 2);
  check(
    f,
    /숙련 1단계/.test(owned0.head) && owned0.track.length === 5 && owned0.track[0] === 'current',
    `a joined hero's popup: mastery and a 5-step track (${owned0.head}, ${owned0.track})`,
  );
  check(
    f,
    /잠김/.test(locked0.head) && /합류 조건.*\(\d+ \/ \d+\)/.test(locked0.progress) && !locked0.track.length,
    `a locked hero's popup: condition and progress (${locked0.progress})`,
  );
  await g.eval(() => document.getElementById('collectionClose').click());

  // formation: owned heroes first; a locked hero cannot be confirmed
  await g.eval(() => window.__g.traceScenes());
  await g.eval(() => document.getElementById('start').click());
  await g.step(2);
  await g.pick(0); // 땅의 길
  await g.step(2);
  let cards = await formation();
  check(
    f,
    cards.length === 6 && cards.slice(0, 2).every(c => !c.locked) && cards.slice(2).every(c => c.locked),
    `출전: 2 owned first, 4 locked (${cards.map(c => c.name + (c.locked ? '×' : '')).join(' ')})`,
  );
  check(f, cards[0].name === '풍운객', `the starter that fits the road comes first (${cards[0].name})`);
  await g.pick(-1);
  await g.step(2);
  const stuck = await g.eval(() => ({
    title: document.getElementById('choiceTitle').textContent,
    disabled: document.getElementById('formationConfirm').disabled,
    detail: document.querySelector('.formation-preview').textContent,
    formation: window.__g.state.formation.join(),
  }));
  check(
    f,
    stuck.title === '출전' && stuck.disabled && /합류 조건/.test(stuck.detail),
    `a locked hero is previewed with its condition and cannot be confirmed (${JSON.stringify(stuck)})`,
  );
  await g.pick(0);
  await g.step(2);
  cards = await formation();
  check(
    f,
    cards.length === 5 && !cards[0].locked && cards.slice(1).every(c => c.locked),
    `대기: the other starter, then 4 locked (${cards.map(c => c.name + (c.locked ? '×' : '')).join(' ')})`,
  );
  await g.pick(0);
  await g.step(2);
  check(
    f,
    (await g.state(() => window.__g.state.formation.join())) === 'pungun,bicheon',
    'formation is the two starters',
  );

  // gates 1 and 2 of 땅의 길: mastery +1 each, 철혈 joins after gate 2
  const news = [];
  for (let gate = 1; gate <= 2; gate++) {
    await g.act(0);
    await g.step(2);
    await g.eval(() => window.__g.god());
    await clearBoss(g);
    check(f, (await g.choiceTitle()) === '보스 기술', `gate ${gate}: 보스 기술 opens`);
    news.push(await g.eval(() => document.querySelector('#choiceSub .news')?.textContent ?? ''));
    p = await P();
    check(
      f,
      p.heroes.pungun.mastery === gate && p.heroes.bicheon.mastery === gate && p.heroes.cheolhyeol.mastery === 0,
      `gate ${gate}: formation heroes gain mastery (${p.heroes.pungun.mastery}, ${p.heroes.bicheon.mastery})`,
    );
    check(f, p.records.gates.ground === gate, `gate ${gate}: road record ${p.records.gates.ground}`);
    await g.pick(-1);
    await g.step(2);
    await g.pick(-1);
    await g.step(2);
  }
  check(f, owned(p) === 'bicheon,cheolhyeol,pungun', `철혈 joins after 땅의 길 관문 2 (${owned(p)})`);
  check(f, news[0] === '' && /철혈/.test(news[1]), `the next screen announces the new hero (${JSON.stringify(news)})`);
  check(
    f,
    (await g.state(() => window.__g.state.meta.heroes.pungun)) === 0,
    'the run keeps the mastery level it started with',
  );

  // through the final gate: a clear, 홍련 joins, mastery 4 → level 1
  await finish(g);
  p = await P();
  const settle = await g.page.$eval('#settle', e => e.textContent);
  check(
    f,
    (await g.mode()) === 'result' && p.records.clears.ground === 1,
    `the road is cleared (${p.records.clears.ground})`,
  );
  check(
    f,
    p.heroes.hongryeon.owned && /새 영웅.*홍련/.test(settle),
    `홍련 joins on a clear; the result says so (${settle})`,
  );
  check(
    f,
    p.heroes.pungun.mastery === 4 && p.records.gates.ground === 4,
    `mastery 4 after 4 gates (${p.heroes.pungun.mastery})`,
  );

  // next run: mastery level 1 is in the snapshot and in the trait text; 스침 300 unlocks 무영 at the end of the run
  await g.eval(() => document.getElementById('start').click());
  await g.step(2);
  await g.pick(0);
  await g.step(2);
  cards = await formation();
  check(
    f,
    cards.filter(c => !c.locked).length === 4 && cards.slice(0, 4).every(c => !c.locked),
    `next run: 4 owned first (${cards.map(c => c.name + (c.locked ? '×' : '')).join(' ')})`,
  );
  const preview = await g.eval(() => document.querySelector('.formation-preview').textContent);
  check(
    f,
    /숙련 2단계/.test(preview) && /충전 \+6/.test(preview),
    `풍운객 shows mastery 2단계 and the stronger trait (${preview})`,
  );
  await g.pick(0);
  await g.step(2);
  await g.pick(0);
  await g.step(2);
  await g.act(0);
  await g.step(2);
  const level = await g.state(() => window.__g.state.meta.heroes);
  check(
    f,
    level.pungun === 1 && level.bicheon === 1 && level.cheolhyeol === 0,
    `snapshot has the new levels (${JSON.stringify(level)})`,
  );
  await g.eval(() => {
    window.__g.state.grazes = 300;
    window.__g.player.hp = 1;
    window.__g.player.inv = 0;
  });
  for (let i = 0; i < 180 && (await g.mode()) !== 'result'; i++) await g.seconds(1);
  p = await P();
  check(
    f,
    p.records.grazes >= 300 && p.heroes.mukyoung.owned,
    `스침 300 → 무영 joins (${p.records.grazes}, ${owned(p)})`,
  );
  check(f, !p.heroes.unhak.owned, '운학 is still locked (하늘의 길 not played)');

  // a save whose records already meet a condition owns that hero; mastery is capped
  await g.eval(() =>
    window.__g.loadProfile({
      records: { gates: { sky: 2 } },
      heroes: { pungun: { mastery: 999 }, mukyoung: { owned: true } },
    }),
  );
  p = await P();
  check(
    f,
    owned(p) === 'bicheon,mukyoung,pungun,unhak' && p.heroes.pungun.mastery === 25,
    `a loaded save is repaired (${owned(p)}, mastery ${p.heroes.pungun.mastery})`,
  );
  check(f, g.errors.length === 0, 'no page errors: ' + g.errors.join(' | '));
  await g.page.close();
  return {
    name: `F seed ${seed}`,
    failures: f,
    log: [`joined in order: 철혈 → 홍련 → 무영; preview "${preview.slice(0, 60)}…"`],
  };
}

// Scenario G: 인연 cards. A piece for each 의뢰 success (the 인연 followed, or the rival of the one defied) and
// for each helper at a cleared final gate; card levels strengthen the unique skill and ease its 전수 from the
// next run on.
async function scenarioG(browser, seed) {
  const f = [];
  const g = await openGame(file, { browser, seed });
  const P = () => g.state(() => JSON.parse(JSON.stringify(window.__g.profile)));
  const succeed = async () => {
    await g.eval(() => {
      const q = window.__g.state.quest;
      if (q.t === 'combo') window.__g.state.combo = 999;
      window.__g.questEvent(q.t, 999);
    });
    await g.seconds(2);
  };
  const news = () => g.page.$$eval('#choiceSub .news', els => els.map(e => e.textContent));
  let p = await P();
  check(
    f,
    Object.values(p.cards).every(v => v === 0),
    `a fresh profile has no cards (${JSON.stringify(p.cards)})`,
  );

  // 인연 카드 screen on the title
  await g.eval(() => document.getElementById('openCards').click());
  let rows = await g.page.$$eval('#collectionGrid .tile', els =>
    els.map(e => ({ locked: e.classList.contains('locked'), text: e.textContent })),
  );
  check(f, rows.length === 6 && rows.every(r => r.locked && /조각 0 \/ 1/.test(r.text)), 'six cards, none owned yet');
  await g.eval(() => document.getElementById('collectionClose').click());

  // gate 1: follow and succeed → a piece for that 인연, announced on the 기술 선택 screen
  await setup(g, 0);
  await g.act(0);
  await g.step(2);
  await g.eval(() => window.__g.god());
  const first = await g.state(() => window.__g.state.quest.npc);
  await succeed();
  p = await P();
  check(f, p.cards[first] === 1, `따른다 성공 → that 인연's piece (${first}: ${p.cards[first]})`);
  let n = await news();
  check(f, (await g.choiceTitle()) === '기술 선택' && /새 인연 카드/.test(n.join()), `기술 선택 announces it (${n})`);
  const offered = await g.cards();
  check(
    f,
    offered.every(c => !/고유 기술/.test(c.tag)),
    'no 전수 on the first success without a level 3 card',
  );
  check(
    f,
    (await g.state(() => window.__g.state.meta.cards[window.__g.state.quest.npc])) === 0,
    'the run keeps its snapshot',
  );
  await g.pick(0);
  await g.step(2);
  await clearBoss(g);
  await g.pick(-1);
  await g.step(2);
  await g.pick(-1);
  await g.step(2);

  // gate 2: defy and succeed → a piece for the rival
  const second = await g.eval(() => {
    const el = document.querySelectorAll('#choice .act')[1];
    el.click();
    return window.__g.state.quest.npc;
  });
  await g.step(2);
  await g.eval(() => window.__g.god());
  const before = await P();
  await succeed();
  p = await P();
  const gained = Object.keys(p.cards).filter(k => p.cards[k] > before.cards[k]);
  const rel = await g.state(() => window.__g.state.rel);
  check(
    f,
    gained.length === 1 && gained[0] !== second && rel[gained[0]] >= 1 && rel[second] <= 0,
    `거스른다 성공 → the rival's piece (defied ${second}, piece ${gained})`,
  );

  // finish the road: every helper at the final gate adds a piece; the result lists the pieces
  await finish(g);
  const end = await P();
  const helpers = Object.keys(rel).filter(k => rel[k] > 0);
  const settle = await g.page.$eval('#settle', e => e.textContent);
  check(
    f,
    (await g.mode()) === 'result' && helpers.every(k => end.cards[k] === p.cards[k] + 1),
    `완주 → +1 for each helper (${helpers}: ${helpers.map(k => p.cards[k] + '→' + end.cards[k])})`,
  );
  check(f, /인연 카드 조각/.test(settle), `the result lists the pieces (${settle})`);

  // level 3 card: 전수 on the first followed success; level 2 and 4 strengthen the unique skill
  await g.eval(() => window.__g.loadProfile({ cards: { dosa: 6, yeonhyeop: 10, monk: 15, milsa: 99, uijeok: 1 } }));
  p = await P();
  check(f, p.cards.milsa === 15, `pieces are capped (${p.cards.milsa})`);
  await g.eval(() => document.getElementById('openCards').click());
  const grid = await g.page.$$eval('#collectionGrid .tile', els => els.map(e => e.textContent));
  // cards held first, in 인연 order: 청운 도인, 혈마 밀사, 철벽 노승, 비연 낭자, 녹림 의적, then 떠돌이 약선 (none)
  check(
    f,
    /최고 단계/.test(grid[1]) && /최고 단계/.test(grid[2]) && /조각 1 \/ 3/.test(grid[4]) && /카드 없음/.test(grid[5]),
    `the grid shows card progress (${grid.join(' | ')})`,
  );
  const dosa = await detailOf(g, 0),
    yeon = await detailOf(g, 3);
  check(
    f,
    /3단계/.test(dosa.head) && dosa.track.join() === 'done,done,done,current,next',
    `청운 도인 popup: level 3 and the track (${dosa.head}, ${dosa.track})`,
  );
  check(f, /비도 5자루/.test(yeon.body), `비연 낭자 popup: the skill as strengthened (${yeon.body.slice(0, 80)})`);
  // Escape closes the popup, then the screen
  await g.eval(() => document.querySelectorAll('#collectionGrid .tile')[0].click());
  await g.key('Escape');
  const afterOne = await g.eval(() => [
    document.getElementById('detail').classList.contains('hidden'),
    document.getElementById('collection').classList.contains('hidden'),
  ]);
  await g.key('Escape');
  const afterTwo = await g.eval(() => document.getElementById('collection').classList.contains('hidden'));
  check(
    f,
    afterOne.join() === 'true,false' && afterTwo,
    `Escape closes the popup, then the screen (${afterOne}, ${afterTwo})`,
  );
  await g.eval(() => document.getElementById('start').click());
  await g.step(2);
  await g.pick(0);
  await g.step(2);
  await g.pick(0);
  await g.step(2);
  await g.pick(0);
  await g.step(2);
  // meet 청운 도인 (level 3) and follow once
  await g.eval(() => {
    window.__g.state.forceNpc = 'dosa';
  });
  let meta = await g.state(() => window.__g.state.meta.cards);
  check(
    f,
    meta.dosa === 3 && meta.yeonhyeop === 4 && meta.monk === 5,
    `snapshot has card levels (${JSON.stringify(meta)})`,
  );
  // the crossroads is already open with a random 인연: finish this gate, then 청운 도인 is forced at the next
  await g.act(0);
  await g.step(2);
  await g.eval(() => window.__g.god());
  await clearBoss(g);
  await finishGateScreens(g);
  const tag = await g.page.$eval('#choice .card .tag', e => e.textContent);
  check(f, /청운 도인|구름/.test(await g.page.$eval('#choice .card', e => e.textContent)), '수소문 brings 청운 도인');
  check(f, /전수 가능/.test(tag), `a level 3 card shows 전수 가능 before any 호감도 (${tag})`);
  await g.act(0);
  await g.step(2);
  await g.eval(() => window.__g.god());
  await succeed();
  const cards = await g.cards();
  check(
    f,
    cards.some(c => c.title === '태극운검' && /인연 카드 3단계/.test(c.tag)),
    `전수 on the first followed success (${cards.map(c => c.title + ' [' + c.tag + ']').join(', ')})`,
  );
  // strengthened unique skills: count what one trigger fires
  const shots = await g.eval(() => {
    const G = window.__g;
    G.learn('mancheon');
    G.learn('uihyeop');
    G.trig('step', { x: G.player.x, y: G.player.y });
    G.trig('rowClear');
    return {
      mancheon: G.shots.filter(s => s.art === 'mancheon').length,
      uihyeop: G.shots.filter(s => s.color === '#ffb38f').length,
    };
  });
  check(f, shots.mancheon === 5, `만천화우 at level 4 throws 5 knives (${shots.mancheon})`);
  check(f, shots.uihyeop === 5, `의협난도 at level 1 is unchanged, 5 blades (${shots.uihyeop})`);
  check(f, g.errors.length === 0, 'no page errors: ' + g.errors.join(' | '));
  await g.page.close();
  return {
    name: `G seed ${seed}`,
    failures: f,
    log: [`pieces: ${first} follow, defy ${second} → ${gained}, helpers ${helpers}; ${settle.slice(-60)}`],
  };
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

// after a boss: 보스 기술 (take the 엽전) → 객잔 (leave)
async function finishGateScreens(g) {
  await g.pick(-1);
  await g.step(2);
  await g.pick(-1);
  await g.step(2);
}

const browser = await launch();
const results = [];
for (const course of [0, 1]) results.push(await scenarioA(browser, course, 101 + course));
results.push(await scenarioB(browser, 0, 303));
results.push(await scenarioC(browser, 1, 404));
results.push(await scenarioD(browser, 505));
results.push(await scenarioE(browser, 606));
results.push(await scenarioF(browser, 707));
results.push(await scenarioG(browser, 808));
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
