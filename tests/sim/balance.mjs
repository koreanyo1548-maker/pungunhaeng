// Balance simulation: a simple bot plays whole stages (no invincibility) on the synthetic clock with fixed seeds,
// and reports survival, hits taken, stage length, kills, 만남 count, coins and 의뢰 results per stage.
// The bot is deliberately plain (aims at the weakest enemy of the nearest row, waits in a row's gap while it passes,
// sidesteps warned hazards,
// never uses 필살기 on purpose, always follows an 인연 and helps passers-by, ignores the 의뢰), so the
// numbers are a floor, not a skilled player.
// usage: node tests/sim/balance.mjs [build.html] [--runs N] [--parallel P] [--seed S] [--stages 1,6] [--god]
//   --god: invincible bot, for stage length, 만남 count and coin income over a whole stage
import { DEFAULT_BUILD, launch, openGame } from '../lib/harness.mjs';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? Number(args[i + 1]) : def;
};
const file = args.find(a => !a.startsWith('--') && !/^[\d,]+$/.test(a)) || DEFAULT_BUILD;
const runs = opt('runs', 4),
  parallel = opt('parallel', 4),
  baseSeed = opt('seed', 1000),
  god = args.includes('--god'),
  stageList = (args.includes('--stages') ? args[args.indexOf('--stages') + 1] : '1,6').split(',').map(Number);

// Runs inside the page: bot decisions every 6 frames, metrics collected per stage.
const botScript = () => {
  window.__sim = { stages: {}, hits: 0, lastHp: null, frames: 0 };
  const choose = () => {
    // 만남: 따른다 / 돕는다
    const act = [...document.querySelectorAll('#choice .act')].find(b => !b.disabled);
    if (act) return act.click();
    const cards = [...document.querySelectorAll('#choice button.card')];
    (cards.find(c => !c.disabled) || cards.at(-1))?.click();
  };
  const steer = () => {
    const g = window.__g,
      P = g.player;
    let tx = P.x;
    const boss = g.enemies.find(e => e.boss && !e.dead);
    if (boss) tx = boss.x;
    else {
      // a row about to reach the hero: stay in (or move to) its nearest gap until it has passed
      const near = g.enemies.filter(e => !e.dead && !e.boss && e.y > P.y - 170 && e.y < P.y + 50);
      if (near.length) {
        const lanes = [0, 1, 2, 3, 4].map(i => 48 + i * 96),
          open = lanes.filter(x => !near.some(e => Math.abs(e.x - x) < 40));
        const pick = (open.length ? open : [near.sort((a, b) => a.hp - b.hp)[0].x]).sort(
          (a, b) => Math.abs(a - P.x) - Math.abs(b - P.x),
        )[0];
        tx = pick;
      } else {
        const es = g.enemies.filter(e => !e.dead && !e.boss && e.y < P.y - 60).sort((a, b) => b.y - a.y);
        if (es[0]) tx = es.filter(e => e.row === es[0].row).sort((a, b) => a.hp - b.hp)[0].x;
      }
    }
    const hz = g.hazards || [];
    const danger = x =>
      hz.some(h => Math.abs(h.x - x) < h.r + 26 && (h.warn > 0 || h.y < P.y + 10) && (h.warn > 0 || P.y - h.y < 260));
    if (danger(tx))
      for (const d of [60, -60, 120, -120, 180, -180, 240, -240])
        if (!danger(tx + d) && tx + d > 24 && tx + d < 456) {
          tx += d;
          break;
        }
    P.target = tx;
  };
  window.__runBot = maxFrames => {
    const sim = window.__sim,
      g = window.__g;
    for (let i = 0; i < maxFrames; i++) {
      if (g.mode === 'result') return 'result';
      if (g.mode === 'choice') choose();
      let st = null;
      if (g.mode === 'play') {
        const s = g.state;
        st = sim.stages[s.stage] ||= { time: 0, hits: 0, hpStart: g.player.hp, boss: 0 };
        if (i % 6 === 0) steer();
        sim.lastHp ??= g.player.hp;
        st.time += 1 / 60;
        if (s.phase === 'boss') st.boss += 1 / 60;
      }
      window.__step(1);
      sim.frames++;
      if (st) {
        if (g.player.hp < sim.lastHp) st.hits += sim.lastHp - g.player.hp;
        st.hpEnd = g.player.hp;
        st.coins = g.state.coins;
        st.kills = g.state.kills;
        st.encounters = g.state.encounters;
      }
      sim.lastHp = g.mode === 'play' || g.mode === 'result' ? g.player.hp : null; // HP changes in a 만남 are not hits
    }
    return g.mode;
  };
};

async function oneRun(browser, stage, seed) {
  const g = await openGame(file, { browser, seed });
  await g.eval(botScript);
  await g.eval(() => document.getElementById('start').click());
  await g.step(2);
  await g.pick(stage - 1);
  await g.step(2);
  await g.pick(0);
  await g.step(2);
  await g.pick(0);
  await g.step(2);
  if (god)
    await g.eval(() => {
      window.__g.god(); // 99 HP: hits are still counted, the run just does not end
      window.__simGod = true;
    });
  const t0 = Date.now();
  let mode = '';
  for (let k = 0; k < 120 && mode !== 'result'; k++) mode = await g.eval(n => window.__runBot(n), 600); // 10 s chunks, 20 min cap
  const r = await g.eval(() => {
    const s = window.__g.state;
    return {
      sim: window.__sim,
      stage: s.stage,
      phase: s.phase,
      hp: window.__g.player.hp,
      title: document.getElementById('resultTitle').textContent,
      path: s.path.map(p => p.result),
      skills: s.skills.map(k => k.id),
      align: `정${s.good}·사${s.evil}`,
      score: Math.round(s.score),
      max: window.__g.referenceScore(s.stage),
      drops: s.drops,
      base: s.baseScore,
      kills: s.kills,
      time: s.elapsed,
    };
  });
  r.wall = Date.now() - t0;
  r.course = stage;
  r.seed = seed;
  r.errors = g.errors;
  await g.page.close();
  return r;
}

const browser = await launch();
const jobs = [];
for (const stage of stageList) for (let i = 0; i < runs; i++) jobs.push([stage, baseSeed + stage * 100 + i]);
const results = [];
for (let i = 0; i < jobs.length; i += parallel)
  results.push(...(await Promise.all(jobs.slice(i, i + parallel).map(([c, s]) => oneRun(browser, c, s)))));
await browser.close();

const f1 = n => (Math.round(n * 10) / 10).toFixed(1);
const won = r => r.hp > 0 && /돌파/.test(r.title);
for (const r of results) {
  const s = r.sim.stages[r.course] || {};
  console.log(
    `S${r.course} seed ${r.seed}: ${won(r) ? '돌파' : `사망 ${r.phase}`} ${Math.round(s.time)}s(boss ${Math.round(s.boss)}) ` +
      `hit${s.hits} kills ${s.kills} 만남 ${s.encounters} ${s.coins}냥 ${r.align} 점수 ${r.score}/${r.max} 드롭 ${JSON.stringify(r.drops)} 기본점수 ${r.base} 의뢰[${r.path.join(',')}] ${r.skills.join(',')}` +
      ` (${(r.wall / 1000).toFixed(0)}s wall${r.errors.length ? ', ERRORS ' + r.errors.join(' | ') : ''})`,
  );
}
console.log('\nsummary');
for (const stage of stageList) {
  const rs = results.filter(r => r.course === stage),
    ss = rs.map(r => r.sim.stages[stage]).filter(Boolean),
    avg = fn => ss.reduce((a, s) => a + fn(s), 0) / Math.max(1, ss.length);
  console.log(
    `S${stage}: 돌파 ${rs.filter(won).length}/${rs.length} | time ${f1(avg(s => s.time))}s hits ${f1(avg(s => s.hits))} ` +
      `kills ${Math.round(avg(s => s.kills))} 만남 ${f1(avg(s => s.encounters))} coins ${Math.round(avg(s => s.coins))}`,
  );
}
const errs = results.flatMap(r => r.errors);
if (errs.length) {
  console.log('page errors:', errs.join(' | '));
  process.exit(1);
}
