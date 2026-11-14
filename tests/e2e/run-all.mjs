// End-to-end flow tests on the built single file (run `npm run build:single` first).
// usage: node tests/e2e/run-all.mjs [build.html]
// Scenario A (both courses): 편대 → 인연 따름 → 화두 성취 → 돈오 → 교대 → 보스 → 투학 (엽전/조합) → 객잔 구매
//   (명상, 수소문, 약주) → 3 gates → 최종 관문 → 결과.
// Scenario B: 거스름 + 화두 미달 → 관계 그대로, 같은 인연이 다시 나타남 → 거스름 성취 → 관계 −1, 숙적 +1.
// Scenario C: 사망 → 결과 화면.
// Scenario D: 보스 기술 보상 (항상 계열뿐이면 새 기술, 발동 기술이 있으면 강화).
// Scenario E: 엽전과 뽑기 (새 저장, 엽전 보관 → 1회·10회 뽑기, 저장 코드, 손상된 저장 복구, 다 모으면 뽑기 불가).
// Scenario F: 영웅 (시작 영웅 2명, 잠긴 영웅은 미리보기만, 조각으로 합류·성급, 다음 판 반영).
// Scenario G: 인연 카드·행인·덕 (카드 없으면 행인, 베풀면 덕, 덕만큼 보관 엽전 증가, 카드 단계 효과).
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

// Scenario E: 엽전 and 뽑기. A new save has the two starters and no cards; 엽전 left at the end of a run is banked;
// 뽑기 spends it on pieces (one or ten); the save code round-trips; bad saves are repaired.
async function scenarioE(browser, seed) {
  const f = [];
  const g = await openGame(file, { browser, seed, roster: false });
  const P = () => g.state(() => JSON.parse(JSON.stringify(window.__g.profile)));
  const sum = o => Object.values(o).reduce((a, b) => a + b, 0);
  let p = await P();
  check(
    f,
    p.coins === 0 && p.heroes.pungun === 1 && p.heroes.bicheon === 1 && sum(p.heroes) === 2 && sum(p.cards) === 0,
    `a new save: two starters, no cards (${JSON.stringify(p)})`,
  );
  check(f, !(await g.eval(() => document.getElementById('openTraining'))), '수련 is gone');
  // a run: base values, then die with 700 엽전
  await setup(g, 0);
  const crossroads = await g.choiceTitle();
  check(f, crossroads === '행인', `with no cards, a passer-by waits at the first crossroads (${crossroads})`);
  await g.act(1);
  await g.step(2);
  const base = await g.state(() => ({ hp: window.__g.player.hp, bombs: window.__g.state.bombs }));
  check(f, base.hp === 3 && base.bombs === 2, `a run starts with the base values (${JSON.stringify(base)})`);
  await g.eval(() => {
    window.__g.state.coins = 700;
    window.__g.player.hp = 1;
    window.__g.player.inv = 0;
  });
  for (let i = 0; i < 180 && (await g.mode()) !== 'result'; i++) await g.seconds(1);
  const left = await g.state(() => window.__g.state.coins);
  p = await P();
  check(f, p.coins === left && left >= 700, `엽전 left at the end is banked (${left} → bank ${p.coins})`);
  // 뽑기 from the result screen: one draw, then ten
  await g.eval(() => document.getElementById('resultGacha').click());
  const tenOff = await g.eval(() => document.getElementById('drawTen').disabled);
  check(f, tenOff === p.coins < 1000, `10회 is disabled below 1,000냥 (${p.coins})`);
  await g.eval(() => document.getElementById('drawOne').click());
  let q = await P();
  let shown = await g.page.$$eval('#gachaResults .tile', els => els.map(e => e.textContent));
  check(
    f,
    q.coins === p.coins - 100 && sum(q.heroes) + sum(q.cards) === 3 && shown.length === 1,
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
    p.coins === 50 && sum(p.heroes) + sum(p.cards) === 13 && shown.length === 10,
    `10회: 1,000냥 for ten pieces (bank ${p.coins}, pieces ${sum(p.heroes) + sum(p.cards)}, shown ${shown.length})`,
  );
  check(
    f,
    shown.every(t => /새 영웅 합류|새 인연 카드|달성|조각 \+1/.test(t)),
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
  check(f, /\/ 6/.test(hub[0]) && /카드 \d+ \/ 6/.test(hub[1]), `the title shows the new counts (${hub})`);
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
    window.__g.loadProfile({ coins: -5, heroes: { pungun: 0, unhak: 99 }, cards: { dosa: 'x', monk: 3.7 } }),
  );
  p = await P();
  check(
    f,
    p.coins === 0 && p.heroes.pungun === 1 && p.heroes.unhak === 15 && p.cards.dosa === 0 && p.cards.monk === 3,
    `a damaged save is repaired (${JSON.stringify(p)})`,
  );
  // when everything is at its last level nothing more can be drawn
  await g.eval(() =>
    window.__g.loadProfile({
      coins: 5000,
      heroes: Object.fromEntries(Object.keys(window.__g.profile.heroes).map(id => [id, 15])),
      cards: Object.fromEntries(Object.keys(window.__g.profile.cards).map(id => [id, 15])),
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
    tiles.length === 6 && tiles.filter(t => t.locked).length === 4 && !tiles[0].locked && !tiles[1].locked,
    `영웅 grid: 2 joined, then 4 locked (${tiles.map(t => t.locked)})`,
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
  await g.pick(0); // 땅의 길
  await g.step(2);
  let cards = await formation();
  check(
    f,
    cards.length === 6 && cards.slice(0, 2).every(c => !c.locked) && cards.slice(2).every(c => c.locked),
    `출전: 2 owned first, 4 locked (${cards.map(c => c.name + (c.locked ? '×' : '')).join(' ')})`,
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
    stuck.title === '출전' && stuck.disabled && /뽑기/.test(stuck.detail),
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
  if ((await g.choiceTitle()) === '행인') await g.act(1);
  else await g.act(0);
  await g.step(2);
  await g.eval(() => {
    window.__g.player.hp = 1;
    window.__g.player.inv = 0;
  });
  for (let i = 0; i < 180 && (await g.mode()) !== 'result'; i++) await g.seconds(1);

  // next run: 철혈 joined, 풍운객 ★3 (6 pieces) in the preview and the snapshot
  await g.eval(() => document.getElementById('retry').click());
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
    /성급 3/.test(preview) && /충전 \+7/.test(preview),
    `풍운객 shows 성급 3 and the stronger trait (${preview})`,
  );
  await g.pick(0);
  await g.step(2);
  await g.pick(0);
  await g.step(2);
  const level = await g.state(() => window.__g.state.meta.heroes);
  check(f, level.pungun === 2 && level.cheolhyeol === 0, `snapshot has 성급 − 1 (${JSON.stringify(level)})`);
  check(f, g.errors.length === 0, 'no page errors: ' + g.errors.join(' | '));
  await g.page.close();
  return { name: `F seed ${seed}`, failures: f, log: [`preview "${preview.slice(0, 60)}…"`] };
}

// Scenario G: 인연 cards, passers-by and 덕. With no card the crossroads has a passer-by (give 엽전 for 덕, or
// walk on; no 의뢰); 덕 raises the banked 엽전; with cards the 인연 appear, and card levels work as before.
async function scenarioG(browser, seed) {
  const f = [];
  const g = await openGame(file, { browser, seed, roster: false });
  const P = () => g.state(() => JSON.parse(JSON.stringify(window.__g.profile)));
  const succeed = async () => {
    await g.eval(() => {
      const q = window.__g.state.quest;
      if (q.t === 'combo') window.__g.state.combo = 999;
      window.__g.questEvent(q.t, 999);
    });
    await g.seconds(2);
  };
  // 인연 카드 screen with no cards
  await g.eval(() => document.getElementById('openCards').click());
  let rows = await g.page.$$eval('#collectionGrid .tile', els =>
    els.map(e => ({ locked: e.classList.contains('locked'), text: e.textContent })),
  );
  check(f, rows.length === 6 && rows.every(r => r.locked && /조각 0 \/ 1/.test(r.text)), 'six cards, none owned yet');
  await g.eval(() => document.getElementById('collectionClose').click());

  // gate 1: a passer-by; with no 엽전 giving is disabled; walk on → the stage runs with no 의뢰
  await setup(g, 0);
  check(f, (await g.choiceTitle()) === '행인', 'gate 1: a passer-by');
  const poor = await g.eval(() => document.querySelectorAll('#choice .act')[0].disabled);
  check(f, poor, 'giving is disabled with no 엽전');
  await g.act(1);
  await g.step(2);
  let s = await g.state(() => ({ quest: window.__g.state.quest, path: window.__g.state.path, mode: window.__g.mode }));
  check(
    f,
    s.mode === 'play' && !s.quest && s.path.at(-1).result === '지나침',
    `walking on: play with no 의뢰 (${JSON.stringify(s.path)})`,
  );
  await g.eval(() => window.__g.god());
  await clearBoss(g);
  check(f, (await g.choiceTitle()) === '보스 기술', 'the boss reward still follows');
  await finishGateScreens(g);

  // gate 2: give 20냥 → 덕 2
  check(f, (await g.choiceTitle()) === '행인', 'gate 2: a passer-by again');
  await g.eval(() => {
    window.__g.state.coins = 520;
  });
  // the screen was drawn with the old coins; reopen it the way the game would on entering the scene
  const before = await g.state(() => window.__g.state.coins);
  await g.eval(() => document.querySelectorAll('#choice .act')[0].click());
  await g.step(2);
  s = await g.state(() => ({
    coins: window.__g.state.coins,
    virtue: window.__g.state.virtue,
    path: window.__g.state.path,
  }));
  check(
    f,
    s.coins === before - 20 && s.virtue === 2 && s.path.at(-1).result === '베풂',
    `giving: −20냥, 덕 +2 (${before} → ${s.coins}, 덕 ${s.virtue})`,
  );
  // die with 1,000냥 and 덕 2 → banked ×1.02
  await g.eval(() => {
    window.__g.state.coins = 1000;
    window.__g.state.virtue = 2;
    window.__g.player.hp = 1;
    window.__g.player.maxHp = 1;
    window.__g.player.inv = 0;
  });
  for (let i = 0; i < 180 && (await g.mode()) !== 'result'; i++) await g.seconds(1);
  const left = await g.state(() => window.__g.state.coins);
  const p = await P();
  const settle = await g.page.$eval('#settle', e => e.textContent);
  check(
    f,
    p.coins === Math.floor(left * 1.02) && /덕 2/.test(settle),
    `덕 2 → banked +2% (${left} → ${p.coins}; ${settle})`,
  );
  const summary = await g.page.$eval('#summary', e => e.textContent);
  check(
    f,
    /행인/.test(summary) && /베풂/.test(summary),
    `the run summary lists the passers-by (${summary.slice(0, 120)})`,
  );

  // cards: the grid and popups, and the levels at work in a run
  await g.eval(() => window.__g.loadProfile({ cards: { dosa: 6, yeonhyeop: 10, monk: 15, milsa: 99, uijeok: 1 } }));
  check(f, (await P()).cards.milsa === 15, 'pieces are capped');
  await g.eval(() => document.getElementById('home').click());
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
    /3단계/.test(dosa.head) && dosa.track.join() === 'done,done,done,current,next' && /뽑기/.test(dosa.body),
    `청운 도인 popup: level 3, the track, 뽑기 (${dosa.head}, ${dosa.track})`,
  );
  check(f, /비도 5자루/.test(yeon.body), `비연 낭자 popup: the skill as strengthened (${yeon.body.slice(0, 80)})`);
  await g.eval(() => document.querySelectorAll('#collectionGrid .tile')[0].click());
  await g.key('Escape');
  const afterOne = await g.eval(() => [
    document.getElementById('detail').classList.contains('hidden'),
    document.getElementById('collection').classList.contains('hidden'),
  ]);
  await g.key('Escape');
  const afterTwo = await g.eval(() => document.getElementById('collection').classList.contains('hidden'));
  check(f, afterOne.join() === 'true,false' && afterTwo, `Escape closes the popup, then the screen`);

  // a run with 5 of 6 cards: an 인연 or a passer-by first, then 수소문 brings 청운 도인 (level 3)
  await g.eval(() => document.getElementById('start').click());
  await g.step(2);
  await g.pick(0);
  await g.step(2);
  await g.pick(0);
  await g.step(2);
  await g.pick(0);
  await g.step(2);
  const meta = await g.state(() => window.__g.state.meta.cards);
  check(
    f,
    meta.dosa === 3 && meta.yeonhyeop === 4 && meta.monk === 5 && meta.yakseon === 0,
    `snapshot has card levels (${JSON.stringify(meta)})`,
  );
  const first = await g.choiceTitle();
  await g.eval(() => {
    window.__g.state.forceNpc = 'dosa';
  });
  if (first === '행인') await g.act(1);
  else await g.act(0);
  await g.step(2);
  await g.eval(() => window.__g.god());
  await clearBoss(g);
  await finishGateScreens(g);
  const card = await g.page.$eval('#choice .card', e => e.textContent);
  const tag = await g.page.$eval('#choice .card .tag', e => e.textContent);
  check(
    f,
    (await g.choiceTitle()) === '인연' && /청운 도인/.test(card),
    `an 인연 with a card appears (${card.slice(0, 40)})`,
  );
  check(f, /전수 가능/.test(tag), `a level 3 card shows 전수 가능 before any 호감도 (${tag})`);
  await g.act(0);
  await g.step(2);
  await g.eval(() => window.__g.god());
  await succeed();
  const choices = await g.cards();
  check(
    f,
    choices.some(c => c.title === '태극운검' && /인연 카드 3단계/.test(c.tag)),
    `전수 on the first followed success (${choices.map(c => c.title + ' [' + c.tag + ']').join(', ')})`,
  );
  const pieces = await P();
  check(f, pieces.cards.dosa === 6, 'a 의뢰 success no longer gives pieces');
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
  return { name: `G seed ${seed}`, failures: f, log: [`first crossroads with 5 cards: ${first}; ${settle}`] };
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
