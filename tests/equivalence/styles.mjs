// Computed-style equivalence: drives a build through every UI state with a seeded, synthetic clock and dumps
// getComputedStyle for every element. Used to prove CSS refactors change nothing on screen.
// usage: node tests/equivalence/styles.mjs <build.html> <out.json>
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const { chromium, devices } = createRequire(import.meta.url)('playwright');

const [, , file, outFile] = process.argv;
const init = `(() => {
  let s = 4242;
  Math.random = function () { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let now = 0, q = [];
  window.requestAnimationFrame = cb => { q.push(cb); return q.length; };
  performance.now = () => now;
  window.__step = n => { for (let i = 0; i < n; i++) { now += 1000 / 60; const c = q; q = []; for (const f of c) f(now); } };
})();`;
// CSS animations/transitions run on real time; freeze them so values are comparable, and record their declarations separately.
const freeze =
  '*,*::before,*::after{animation-play-state:paused!important;transition-duration:0s!important;transition-delay:0s!important;animation-delay:-0.0001s!important}';

async function dump(page, label) {
  return page.evaluate(
    ([label]) => {
      const pathOf = el => {
        const parts = [];
        while (el && el !== document.documentElement) {
          const p = el.parentElement;
          parts.unshift(el.id ? '#' + el.id : el.tagName.toLowerCase() + ':' + (p ? [...p.children].indexOf(el) : 0));
          if (el.id) break;
          el = p;
        }
        return parts.join('>');
      };
      const out = {};
      for (const el of document.querySelectorAll('body *')) {
        for (const pseudo of [null, '::before', '::after']) {
          const cs = getComputedStyle(el, pseudo);
          if (pseudo && (cs.content === 'none' || cs.content === 'normal')) continue;
          const o = {};
          for (const prop of cs) o[prop] = cs.getPropertyValue(prop);
          out[label + ' ' + pathOf(el) + (pseudo || '')] = o;
        }
      }
      return out;
    },
    [label],
  );
}

async function run(viewport) {
  const browser = await chromium.launch();
  const page = await browser.newPage(viewport);
  await page.addInitScript(init);
  await page.goto('file://' + path.resolve(file) + '#debug');
  await page.waitForFunction(() => !document.getElementById('start').disabled, null, { timeout: 120000, polling: 200 });
  await page.addStyleTag({ content: freeze });
  const step = n => page.evaluate(n => window.__step(n), n);
  const click = sel => page.evaluate(sel => document.querySelectorAll(sel)[0]?.click(), sel);
  const all = {};
  const snap = async label => Object.assign(all, await dump(page, label));
  await step(30);
  await snap('title');
  await click('#start');
  await step(2);
  await snap('course');
  await click('#choice button.card');
  await step(2);
  await snap('formation');
  await click('#choice button.card');
  await click('#choice button.card');
  await step(2);
  await snap('crossroads');
  await click('#choice .act');
  await page.evaluate(() => window.__g.god());
  await step(150);
  await snap('play');
  await page.evaluate(() => {
    window.__g.state.combo = 12;
  });
  await step(6);
  await snap('play-combo');
  await page.evaluate(() => {
    const q = window.__g.state.quest;
    if (q.t === 'combo') window.__g.state.combo = 999;
    window.__g.questEvent(q.t, 999);
  });
  await step(60);
  await snap('dono');
  await click('#choice button.card');
  await page.evaluate(() => window.__g.skipFlight());
  await step(240);
  await snap('boss');
  await page.evaluate(() => window.__g.killBoss());
  await step(200);
  await snap('tuhak');
  await click('#choice button.card');
  await step(2);
  await snap('inn');
  await page.keyboard.press('Escape');
  await step(2);
  await snap('inn-esc');
  for (let gate = 0; gate < 4; gate++) {
    const mode = await page.evaluate(() => window.__g.mode);
    if (mode === 'result') break;
    if (mode === 'choice') {
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('#choice button.card:not([disabled])')];
        (document.querySelector('#choice .act') || b.at(-1)).click();
      });
      await step(2);
    }
    if (gate === 0) {
      await page.keyboard.press('Escape');
      await step(2);
      await snap('pause');
      await click('#resume');
      await step(2);
    }
    await page.evaluate(() => window.__g.skipFlight());
    await step(240);
    await page.evaluate(() => window.__g.killBoss());
    await step(200);
    if ((await page.evaluate(() => window.__g.mode)) === 'choice') {
      await click('#choice button.card');
      await step(2);
    }
  }
  for (let i = 0; i < 6 && (await page.evaluate(() => window.__g.mode)) !== 'result'; i++) {
    await page.evaluate(() => {
      const el =
        document.querySelector('#choice .act') ||
        [...document.querySelectorAll('#choice button.card:not([disabled])')].at(-1);
      el?.click();
    });
    await page.evaluate(() => {
      if (window.__g.mode === 'play') {
        window.__g.skipFlight();
      }
    });
    await step(240);
    await page.evaluate(() => {
      if (window.__g.mode === 'play') window.__g.killBoss();
    });
    await step(200);
  }
  await snap('result-' + (await page.evaluate(() => window.__g.mode)));
  await browser.close();
  return all;
}

const result = {};
for (const [name, vp] of [
  ['phone', { ...devices['iPhone 13'] }],
  ['desktop', { viewport: { width: 1280, height: 800 } }],
]) {
  const r = await run(vp);
  for (const [k, v] of Object.entries(r)) result[name + ' ' + k] = v;
}
fs.writeFileSync(outFile, JSON.stringify(result));
console.log(
  'elements',
  Object.keys(result).length,
  'states',
  [...new Set(Object.keys(result).map(k => k.split(' ').slice(0, 2).join(' ')))].join(', '),
);
