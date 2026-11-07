// Deterministic equivalence check: two builds get the same seeded Math.random, the same synthetic clock
// (requestAnimationFrame / performance.now driven by __step) and the same scripted input.
// Snapshots of game state are compared; any divergence means the builds do not behave identically.
// usage: node tests/equivalence/run.mjs <a.html> <b.html> [seed] [steps]
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright'); // resolved via NODE_PATH or a local install
import path from 'path';

const [, , A, B, seedArg = '12345', stepsArg = '2400', courseArg = '0'] = process.argv;

const init = seed => `(() => {
  let s = ${seed} | 0;
  Math.random = function () { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let now = 0, q = [];
  window.requestAnimationFrame = cb => { q.push(cb); return q.length; };
  window.cancelAnimationFrame = () => {};
  performance.now = () => now;
  window.__step = n => { for (let i = 0; i < n; i++) { now += 1000 / 60; const c = q; q = []; for (const f of c) f(now); } };
})();`;

async function run(file, seed, steps, course) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 480, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(init(seed));
  await page.goto('file://' + path.resolve(file) + '#debug');
  await page.waitForFunction(() => !document.getElementById('start').disabled, null, { timeout: 120000, polling: 200 });
  await page.evaluate(() => document.getElementById('start').click());
  const pick = () =>
    page.evaluate(() => {
      const el =
        document.querySelector('#choice .act') || document.querySelector('#choice button.card:not([disabled])');
      if (el) el.click();
    });
  for (const i of [course, 0, 0])
    await page.evaluate(i => document.querySelectorAll('#choice button.card')[i].click(), i);
  await pick();
  await page.evaluate(() => window.__g.god());
  const snaps = [];
  let held = null;
  for (let k = 0; k < steps; k++) {
    const mode = await page.evaluate(() => window.__g.mode);
    if (mode === 'choice') {
      await pick();
      continue;
    }
    if (mode === 'result') break;
    const want = Math.floor(k / 7) % 3 === 0 ? 'ArrowLeft' : Math.floor(k / 7) % 3 === 1 ? 'ArrowRight' : null;
    if (want !== held) {
      if (held) await page.keyboard.up(held);
      if (want) await page.keyboard.down(want);
      held = want;
    }
    if (k % 97 === 50) await page.keyboard.press(' ');
    if (k % 151 === 80) await page.keyboard.press('q');
    if (k % 23 === 11 && course === 1) await page.keyboard.press('ArrowUp');
    await page.evaluate(() => window.__step(6));
    if (k % 40 === 0)
      snaps.push(
        await page.evaluate(() => {
          const g = window.__g,
            s = g.state,
            p = g.player;
          return {
            mode: g.mode,
            stage: s.stage,
            phase: s.phase,
            score: Math.round(s.score),
            kills: s.kills,
            coins: s.coins,
            hp: p.hp,
            bombs: s.bombs,
            charge: Math.round(s.charge * 100),
            combo: s.combo,
            x: Math.round(p.x * 100),
            y: Math.round(p.y * 100),
            active: s.active,
            enemies: g.enemies.length,
            quest: s.quest && [s.quest.npc, s.quest.t, Math.round(s.quest.prog), s.quest.done],
            skills: s.skills.map(x => x.id + (x.mod || '')).join(','),
            rel: JSON.stringify(s.rel),
            path: s.path.map(x => x.npc + x.mode + x.result).join('|'),
          };
        }),
      );
  }
  await browser.close();
  return { snaps, errors };
}

const steps = +stepsArg,
  seed = +seedArg,
  course = +courseArg;
const [ra, rb] = await Promise.all([run(A, seed, steps, course), run(B, seed, steps, course)]);
let diverged = -1;
for (let i = 0; i < Math.max(ra.snaps.length, rb.snaps.length); i++) {
  if (JSON.stringify(ra.snaps[i]) !== JSON.stringify(rb.snaps[i])) {
    diverged = i;
    break;
  }
}
console.log(
  JSON.stringify({
    seed,
    course,
    snapshots: [ra.snaps.length, rb.snaps.length],
    last: ra.snaps.at(-1),
    errors: [ra.errors, rb.errors],
  }),
);
if (diverged >= 0) {
  console.log(
    'DIVERGED at snapshot',
    diverged,
    '\nA:',
    JSON.stringify(ra.snaps[diverged]),
    '\nB:',
    JSON.stringify(rb.snaps[diverged]),
  );
  process.exit(1);
}
console.log('IDENTICAL');
