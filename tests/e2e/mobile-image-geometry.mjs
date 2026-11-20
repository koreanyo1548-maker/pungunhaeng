import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { launch, openGame } from '../lib/harness.mjs';

const browser = await launch();
const beforeFile = process.argv[2] || 'test-results/fullsize-before.html';
const afterFile = process.argv[3] || 'dist-single/index.html';
const viewports = [
  { width: 360, height: 780 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 896 },
];
async function layout(file, viewport) {
  const g = await openGame(file, { browser, viewport });
  await g.page.addStyleTag({ content: '*{animation:none!important;transition:none!important}' });
  const snapshots = [];
  const snap = () =>
    g.page.evaluate(() => {
      const selectors = [
        '.game',
        '#canvas',
        '#heroArt',
        '#start',
        '.hub-menu',
        '#choice',
        '#choice .panel',
        '.party-portrait',
        '#formationConfirm',
        '#blast',
      ];
      return Object.fromEntries(
        selectors.map(selector => {
          const el = document.querySelector(selector);
          if (!el) return [selector, null];
          const r = el.getBoundingClientRect();
          return [selector, [r.x, r.y, r.width, r.height].map(v => Math.round(v * 100) / 100)];
        }),
      );
    });
  snapshots.push(await snap());
  await g.page.locator('#start').click();
  await g.step(2);
  await g.pick(0);
  await g.step(2);
  snapshots.push(await snap());
  await g.pick(0);
  await g.step(2);
  await g.pick(0);
  await g.step(2);
  snapshots.push(await snap());
  assert.deepEqual(g.errors, []);
  await g.page.close();
  return snapshots;
}
let server;
try {
  for (const viewport of viewports) {
    assert.deepEqual(
      await layout(afterFile, viewport),
      await layout(beforeFile, viewport),
      'layout changed at ' + viewport.width,
    );
    console.log('PASS unchanged title/formation/combat layout at ' + viewport.width);
  }
  server = await createServer({ server: { host: '127.0.0.1', port: 5194 } });
  await server.listen();
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5194/#debug');
  const result = await page.evaluate(async () => {
    const { cropProp, atlasCell } = await import('/src/core/image.ts');
    const sheet = document.createElement('canvas');
    sheet.width = 200;
    sheet.height = 100; // Half of authored 400 x 200 sheet.
    const ctx = sheet.getContext('2d');
    for (const [color, x, y] of [
      ['#ff0000', 0, 0],
      ['#00ff00', 100, 0],
      ['#0000ff', 0, 50],
      ['#ffffff', 100, 50],
    ]) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 100, 50);
    }
    const prop = cropProp(sheet, [200, 0, 200, 100], [400, 200]);
    const atlas = atlasCell(sheet, 2, 2, 1, 1, [400, 200]);
    const pixel = canvas => [...canvas.getContext('2d').getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data];
    return { propSize: [prop.width, prop.height], propPixel: pixel(prop), atlasPixel: pixel(atlas) };
  });
  assert.deepEqual(result, { propSize: [100, 50], propPixel: [0, 255, 0, 255], atlasPixel: [255, 255, 255, 255] });
  console.log('PASS original-coordinate crop and atlas selection on half-resolution images');
  await page.close();
} finally {
  await browser.close();
  await server?.close();
}
