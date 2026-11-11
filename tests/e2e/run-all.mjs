// End-to-end flow tests on the built single file (run `npm run build:single` first).
// usage: node tests/e2e/run-all.mjs [build.html]
// Scenario A (both courses): 편대 → 인연 따름 → 화두 성취 → 돈오 → 교대 → 보스 → 투학 (엽전/조합) → 객잔 구매
//   (명상, 수소문, 약주) → 3 gates → 최종 관문 → 결과.
// Scenario B: 거스름 + 화두 미달 → 관계 그대로, 같은 인연이 다시 나타남 → 거스름 성취 → 관계 −1, 숙적 +1.
// Scenario C: 사망 → 결과 화면.
// Scenario D: 보스 기술 보상 (항상 계열뿐이면 새 기술, 발동 기술이 있으면 강화).
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

const browser = await launch();
const results = [];
for (const course of [0, 1]) results.push(await scenarioA(browser, course, 101 + course));
results.push(await scenarioB(browser, 0, 303));
results.push(await scenarioC(browser, 1, 404));
results.push(await scenarioD(browser, 505));
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
