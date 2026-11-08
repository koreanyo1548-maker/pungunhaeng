// Assert the accepted combat layout against a previous standalone build.
import assert from 'node:assert/strict';
import { launch, openGame } from '../lib/harness.mjs';
const [before, after] = process.argv.slice(2);
if (!before || !after) throw Error('Usage: node tests/equivalence/combat-layout.mjs before.html after.html');
const browser = await launch();
async function snapshot(file, viewport) {
  const g = await openGame(file, { browser, viewport });
  await g.page.locator('#start').click();
  await g.step(2);
  await g.pick(0);
  await g.step(2);
  await g.pick(0);
  await g.step(2);
  await g.pick(0);
  await g.step(2);
  await g.act(0);
  await g.seconds(0.2);
  const read = () =>
    g.page.evaluate(() =>
      Object.fromEntries(
        [
          'canvas',
          'hud',
          'score',
          'hearts',
          'stageHud',
          'questHud',
          'skills',
          'bossbar',
          'combo',
          'actives',
          'swap',
          'blast',
          'pause',
        ].map(id => {
          const el = document.getElementById(id),
            r = el.getBoundingClientRect(),
            s = getComputedStyle(el);
          return [
            id,
            {
              rect: [r.x, r.y, r.width, r.height].map(n => Math.round(n * 100) / 100),
              font: s.fontSize,
              position: s.position,
              display: s.display,
            },
          ];
        }),
      ),
    );
  const play = await read();
  await g.eval(() => window.__g.god());
  await g.eval(() => window.__g.skipFlight());
  await g.seconds(4.5);
  const boss = await read();
  assert.deepEqual(g.errors, []);
  await g.page.close();
  return { play, boss };
}
try {
  for (const viewport of [
    { width: 360, height: 640 },
    { width: 480, height: 800 },
    { width: 1280, height: 900 },
  ]) {
    assert.deepEqual(await snapshot(after, viewport), await snapshot(before, viewport));
    console.log(`IDENTICAL combat layout ${viewport.width}x${viewport.height} (flight + boss)`);
  }
} finally {
  await browser.close();
}
