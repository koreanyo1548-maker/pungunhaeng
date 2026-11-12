// Shared Playwright harness for e2e and balance tests.
// The page runs on a synthetic clock: requestAnimationFrame and performance.now only advance when the test calls
// step(), so runs are deterministic (with the seeded RNG, #seed=<n>) and much faster than real time.
import { chromium } from 'playwright';
import path from 'path';

export const DEFAULT_BUILD = 'dist-single/index.html';

const clockScript = (frameMs, mathSeed) => `(() => {
  let s = ${mathSeed} | 0;
  Math.random = function () { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let now = 0, q = [];
  window.requestAnimationFrame = cb => { q.push(cb); return q.length; };
  window.cancelAnimationFrame = () => {};
  performance.now = () => now;
  window.__step = n => { for (let i = 0; i < n; i++) { now += ${frameMs}; const c = q; q = []; for (const f of c) f(now); } };
})();`;

export async function launch() {
  return chromium.launch();
}

/**
 * Opens a build in debug mode with a forced seed and waits for assets to load.
 * Returns helpers bound to that page. Pass an existing browser to share it between runs.
 * Every hero is owned unless roster is false (the default profile starts with two).
 */
export async function openGame(
  file = DEFAULT_BUILD,
  { seed = 1, frameMs = 1000 / 60, browser, viewport, roster = true } = {},
) {
  const page = await browser.newPage({ viewport: viewport || { width: 480, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => {
    if (m.type() === 'error') errors.push('console: ' + m.text());
  });
  await page.addInitScript(clockScript(frameMs, seed));
  await page.goto('file://' + path.resolve(file) + '#debug&seed=' + seed + (roster ? '&roster' : ''));
  await page.waitForFunction(() => !document.getElementById('start').disabled, null, { timeout: 120000, polling: 200 });

  const step = n => page.evaluate(n => window.__step(n), n);
  const g = {
    page,
    errors,
    step,
    /** advance game time by s seconds */
    seconds: s => step(Math.round((s * 1000) / frameMs)),
    eval: (fn, arg) => page.evaluate(fn, arg),
    mode: () => page.evaluate(() => window.__g.mode),
    state: fn => page.evaluate(fn),
    choiceTitle: () => page.$eval('#choiceTitle', e => e.textContent),
    cards: () =>
      page.$$eval('#choice button.card', els =>
        els.map(e => ({
          title: e.querySelector('h3')?.textContent ?? '',
          tag: e.querySelector('.tag')?.textContent ?? '',
          disabled: e.disabled,
        })),
      ),
    /** click the i-th choice card (negative counts from the end) */
    pick: i =>
      page.evaluate(i => {
        const c = [...document.querySelectorAll('#choice button.card')];
        const el = c.at(i);
        if (!el) throw new Error('no card ' + i + ' of ' + c.length);
        const confirm = document.getElementById('formationConfirm');
        el.click();
        confirm?.click();
      }, i),
    /** click the enabled card with this title; returns false if it is missing or disabled */
    pickTitled: title =>
      page.evaluate(title => {
        const el = [...document.querySelectorAll('#choice button.card')].find(
          e => e.querySelector('h3')?.textContent === title,
        );
        if (!el || el.disabled) return false;
        el.click();
        return true;
      }, title),
    /** click the i-th 화두 action on the crossroads card (0 = 따른다, 1 = 거스른다) */
    act: i =>
      page.evaluate(i => {
        const el = document.querySelectorAll('#choice .act')[i];
        if (!el) throw new Error('no act ' + i);
        const confirm = document.getElementById('formationConfirm');
        el.click();
        confirm?.click();
      }, i),
    key: k => page.keyboard.press(k),
  };
  return g;
}

export function check(failures, cond, msg) {
  if (!cond) failures.push(msg);
  return cond;
}
