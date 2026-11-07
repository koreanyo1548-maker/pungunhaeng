// Balance simulation: a simple bot plays full runs (no invincibility) on the synthetic clock with fixed seeds,
// and reports survival, hits taken, stage length, coins and 화두 results per gate.
// The bot is deliberately plain (aims at the weakest enemy of the nearest row, sidesteps warned hazards,
// never uses 내공 or 교대 on purpose, ignores 화두), so the numbers are a floor, not a skilled player.
// usage: node tests/sim/balance.mjs [build.html] [--runs N] [--parallel P] [--seed S] [--god]
//   --god: invincible bot, for stage length, coin income and 화두 flow over the full run
import { DEFAULT_BUILD, launch, openGame } from '../lib/harness.mjs';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? Number(args[i + 1]) : def;
};
const file = args.find(a => !a.startsWith('--') && !/^\d+$/.test(a)) || DEFAULT_BUILD;
const runs = opt('runs', 4),
  parallel = opt('parallel', 4),
  baseSeed = opt('seed', 1000),
  god = args.includes('--god');

// Runs inside the page: bot decisions every 6 frames, metrics collected per stage.
const botScript = () => {
  window.__sim = { stages: {}, hits: 0, lastHp: null, frames: 0 };
  const choose = () => {
    const act = document.querySelector('#choice .act');
    if (act) return act.click(); // 따른다
    const title = document.getElementById('choiceTitle').textContent;
    const cards = [...document.querySelectorAll('#choice button.card')];
    if (title === '객잔') {
      const heal = cards.find(c => c.querySelector('h3')?.textContent === '약주와 휴식' && !c.disabled);
      return (window.__simGod ? cards.at(-1) : heal || cards.at(-1)).click(); // god runs keep their coins
    }
    (cards.find(c => !c.disabled) || cards.at(-1))?.click();
  };
  const steer = () => {
    const g = window.__g,
      P = g.player;
    let tx = P.x;
    const boss = g.enemies.find(e => e.boss && !e.dead);
    if (boss) tx = boss.x;
    else {
      const es = g.enemies.filter(e => !e.dead && !e.boss && e.y < P.y - 60).sort((a, b) => b.y - a.y);
      if (es[0]) tx = es.filter(e => e.row === es[0].row).sort((a, b) => a.hp - b.hp)[0].x;
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
      }
      sim.lastHp = g.mode === 'play' || g.mode === 'result' ? g.player.hp : null; // HP changes between gates are not hits
    }
    return g.mode;
  };
};

async function oneRun(browser, course, seed) {
  const g = await openGame(file, { browser, seed });
  await g.eval(botScript);
  await g.eval(() => document.getElementById('start').click());
  await g.step(2);
  await g.pick(course);
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
      skills: s.skills.map(k => k.id + (k.mod ? '+' + k.mod : '')),
      score: Math.round(s.score),
    };
  });
  r.wall = Date.now() - t0;
  r.course = course;
  r.seed = seed;
  r.errors = g.errors;
  await g.page.close();
  return r;
}

const browser = await launch();
const jobs = [];
for (const course of [0, 1]) for (let i = 0; i < runs; i++) jobs.push([course, baseSeed + course * 100 + i]);
const results = [];
for (let i = 0; i < jobs.length; i += parallel)
  results.push(...(await Promise.all(jobs.slice(i, i + parallel).map(([c, s]) => oneRun(browser, c, s)))));
await browser.close();

const COURSE = ['땅', '하늘'];
const f1 = n => (Math.round(n * 10) / 10).toFixed(1);
for (const r of results) {
  const won = r.hp > 0 && r.stage >= 4 && /제패|등정/.test(r.title);
  const per = Object.entries(r.sim.stages)
    .map(
      ([k, s]) =>
        `S${k} ${Math.round(s.time)}s(boss ${Math.round(s.boss)}) hit${s.hits} hp${s.hpStart}→${s.hpEnd} ${s.coins}냥`,
    )
    .join(' | ');
  console.log(
    `${COURSE[r.course]} seed ${r.seed}: ${won ? '완주' : `사망 S${r.stage} ${r.phase}`} "${r.title}" 화두[${r.path.join(',')}] ${r.skills.join(',')}`,
  );
  console.log(
    `   ${per}   (${(r.wall / 1000).toFixed(0)}s wall${r.errors.length ? ', ERRORS ' + r.errors.join(' | ') : ''})`,
  );
}
console.log('\nsummary');
for (const course of [0, 1]) {
  const rs = results.filter(r => r.course === course);
  const won = rs.filter(r => r.hp > 0 && r.stage >= 4 && /제패|등정/.test(r.title)).length;
  const line = [1, 2, 3, 4]
    .map(k => {
      const ss = rs.map(r => r.sim.stages[k]).filter(Boolean);
      if (!ss.length) return `S${k} -`;
      const avg = fn => ss.reduce((a, s) => a + fn(s), 0) / ss.length;
      return `S${k} reached ${ss.length}/${rs.length} time ${f1(avg(s => s.time))}s hits ${f1(avg(s => s.hits))} coins ${Math.round(avg(s => s.coins))}`;
    })
    .join(' | ');
  console.log(`${COURSE[course]}: 완주 ${won}/${rs.length} | ${line}`);
}
const errs = results.flatMap(r => r.errors);
if (errs.length) {
  console.log('page errors:', errs.join(' | '));
  process.exit(1);
}
