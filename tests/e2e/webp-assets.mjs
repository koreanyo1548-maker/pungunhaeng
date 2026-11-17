// Exercise the deployed multi-file build: all raster requests must use WebP.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium, webkit } from 'playwright';

const root = resolve('dist');
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map(entry => {
        const path = resolve(dir, entry.name);
        return entry.isDirectory() ? files(path) : [path];
      }),
    )
  ).flat();
}
const builtFiles = await files(root);
assert.ok(
  builtFiles.some(path => path.endsWith('.webp')),
  'build contains WebP',
);
assert.ok(!builtFiles.some(path => /\.(png|jpe?g)$/i.test(path)), 'original raster files are excluded');
for (const path of builtFiles.filter(path => /\.(html|css|js)$/.test(path))) {
  const source = await readFile(path, 'utf8');
  assert.ok(!source.includes('art/originals/'), 'build must not reference originals');
  assert.ok(!source.includes('data:image/png;base64,'), 'build must not inline original PNG');
}
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const path = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!path.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  for (const [engine, viewport, deviceScaleFactor] of [
    [chromium, { width: 360, height: 780 }, 3],
    [chromium, { width: 768, height: 896 }, 2],
    [webkit, { width: 390, height: 844 }, 3],
    [webkit, { width: 430, height: 932 }, 3],
  ]) {
    browser = await engine.launch();
    const page = await browser.newPage({ viewport, deviceScaleFactor, hasTouch: true });
    const requests = [];
    const errors = [];
    page.on('request', req => requests.push(req.url()));
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', req => errors.push('failed request: ' + req.url()));
    page.on('response', res => {
      if (res.status() >= 400) errors.push(res.status() + ': ' + res.url());
    });
    const address = server.address();
    await page.goto('http://127.0.0.1:' + address.port + '/#debug&seed=42');
    await page.waitForFunction(() => window.__g?.mode === 'title' && !document.getElementById('start').disabled, null, {
      timeout: 120000,
    });
    assert.equal(await page.locator('#loadError').isVisible(), false, 'no asset error banner');
    assert.ok(
      requests.some(url => /\.webp(?:$|\?)/.test(url)),
      'browser requested WebP',
    );
    assert.ok(
      !requests.some(url => /\.png(?:$|\?)/.test(url) || url.includes('/art/originals/')),
      'browser did not request original PNG',
    );
    assert.deepEqual(errors, []);
    console.log(
      'PASS ' + engine.name() + ' ' + viewport.width + ' DPR ' + deviceScaleFactor + ': WebP-only build reaches title',
    );
    await browser.close();
    browser = undefined;
  }
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
