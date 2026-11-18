// Real renderer: 36 cached cutouts, level evolution, alpha edges, rotation and reduced motion.
import { createServer } from 'vite';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const server = await createServer({ server: { host: '127.0.0.1', port: 5199 } });
await server.listen();
const browser = await chromium.launch();
const out = process.env.SCREENSHOT_DIR || '/workspace/artifacts/projectile-evolution';
await mkdir(out, { recursive: true });
try {
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      window.requestAnimationFrame = () => 0;
    });
    await page.goto('http://127.0.0.1:5199/#debug&roster');
    await page.waitForFunction(() => !document.getElementById('start').disabled, null, { timeout: 120000 });
    const result = await page.evaluate(async () => {
      const art = await import('/src/render/hero-shots.ts');
      const surface = document.createElement('canvas');
      surface.width = 480;
      surface.height = 800;
      const ctx = surface.getContext('2d');
      const { HERO_IDS } = await import('/src/data/roster.ts');
      const { HEROES } = await import('/src/data/heroes.ts');
      const { G } = await import('/src/core/context.ts');
      const M = Object.assign(
        {},
        ...(await Promise.all(
          ['systems/flow', 'core/profile', 'entities/player', 'systems/formation'].map(
            p => import('/src/' + p + '.ts'),
          ),
        )),
      );
      const samples = [];
      for (const hero of HERO_IDS)
        for (let stage = 1; stage <= 3; stage++) {
          ctx.clearRect(0, 0, 480, 800);
          art.drawHeroShot(hero, stage, 64, 64, 0, 0, ctx);
          const pixels = ctx.getImageData(0, 0, 128, 128).data;
          let opaque = 0,
            left = 128,
            top = 128,
            right = 0,
            bottom = 0;
          for (let y = 0; y < 128; y++)
            for (let x = 0; x < 128; x++)
              if (pixels[(y * 128 + x) * 4 + 3] > 32) {
                opaque++;
                left = Math.min(left, x);
                top = Math.min(top, y);
                right = Math.max(right, x);
                bottom = Math.max(bottom, y);
              }
          const c = document.createElement('canvas');
          c.width = c.height = 128;
          c.getContext('2d').drawImage(ctx.canvas, 0, 0, 128, 128, 0, 0, 128, 128);
          const url = c.toDataURL();
          ctx.clearRect(0, 0, 480, 800);
          art.drawHeroShot(hero, stage, 64, 64, Math.PI / 4, 0.3, ctx);
          const turned = ctx.getImageData(0, 0, 128, 128).data;
          const changed = turned.some((v, i) => v !== pixels[i]);
          samples.push({ hero, name: HEROES[hero].name, stage, opaque, left, top, right, bottom, changed, url });
        }
      M.start();
      document.querySelector('#choice button.card').click();
      for (let i = 0; i < 2; i++) {
        document.querySelector('#choice button.card').click();
        document.getElementById('formationConfirm').click();
      }
      const volleys = [];
      for (const hero of HERO_IDS)
        for (const [level, stage, count] of [
          [1, 1, 2],
          [10, 2, 3],
          [20, 3, 4],
        ]) {
          G.state.formation = [hero, hero === 'pungun' ? 'bicheon' : 'pungun'];
          G.state.active = 0;
          G.state.meta.levels[hero] = level;
          G.state.meta.heroes[hero] = 0;
          G.state.effect = null;
          G.shots = [];
          M.shoot();
          volleys.push({
            hero,
            level,
            stage,
            count,
            shots: G.shots.map(s => ({ hero: s.hero, stage: s.weaponStage, damage: s.damage, r: s.r })),
          });
        }
      // In-flight identity is stamped on the shot, independent of subsequent active hero/level changes.
      const saved = structuredClone(G.shots);
      G.state.active = 1;
      return {
        samples,
        volleys,
        snapshot: art.heroShotArtSnapshot(),
        identityStable: JSON.stringify(saved) === JSON.stringify(G.shots),
      };
    });
    assert.equal(result.snapshot.length, 36);
    for (const s of result.samples) {
      assert.ok(s.opaque > 70, s.hero + ' visible');
      assert.ok(
        s.left > 15 && s.top > 15 && s.right < 112 && s.bottom < 112,
        s.hero + ' no clipping/rectangular background',
      );
      assert.ok(s.changed, s.hero + ' rotates with flight direction');
    }
    for (const hero of new Set(result.samples.map(s => s.hero))) {
      const stages = result.samples.filter(s => s.hero === hero);
      assert.equal(new Set(stages.map(s => s.url)).size, 3, hero + ' three distinct drawings');
      assert.ok(stages[2].right - stages[2].left > stages[0].right - stages[0].left, hero + ' visible width grows');
    }
    for (const v of result.volleys) {
      assert.equal(v.shots.length, v.count);
      assert.ok(
        v.shots.every(s => s.hero === v.hero && s.stage === v.stage && s.r === 5 && Number.isFinite(s.damage)),
        v.hero + ' shot identity and hitbox',
      );
    }
    assert.ok(result.identityStable);
    assert.deepEqual(errors, []);
    if (reducedMotion === 'no-preference') {
      const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>풍운행 · 발사체 진화 36종</title><style>body{margin:0;background:#142727;color:#eee5cf;font:16px system-ui;padding:24px}h1{font-size:24px}p{color:#b9ccc2}button{padding:10px;background:#354c49;color:white;border:1px solid #aab7a6;border-radius:8px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,400px),1fr));gap:18px;margin-top:20px}article{border:1px solid #526e61;border-radius:10px;padding:14px;background:#203a35}h2{margin:0 0 8px;font-size:18px}.stages{display:flex}figure{margin:0;flex:1;text-align:center;background:var(--sample,#29443b)}img{display:block;width:100%;max-width:128px;margin:auto}figcaption{font-size:12px;padding-bottom:10px}</style><h1>풍운행 · 발사체 진화 36종</h1><p>게임 렌더러에서 직접 캡처한 실제 표시 크기입니다. 1 → 2 → 3단계의 형태·폭·장식 변화를 비교합니다.</p><button onclick="document.body.style.setProperty('--sample',this.dataset.light?'#29443b':'#afb5a6');this.dataset.light=this.dataset.light?'':'yes'">밝은 / 어두운 배경</button><main>${result.samples
        .filter(s => s.stage === 1)
        .map(
          first =>
            `<article><h2>${first.name}</h2><div class="stages">${result.samples
              .filter(s => s.hero === first.hero)
              .map(
                s =>
                  `<figure><img src="${s.url}" alt="${s.name} ${s.stage}단계"><figcaption>${s.stage}단계</figcaption></figure>`,
              )
              .join('')}</div></article>`,
        )
        .join('')}</main></html>`;
      await writeFile('/workspace/artifacts/projectile-evolution-gallery.html', html);
      await page.setContent(html);
      await page.setViewportSize({ width: 1100, height: 900 });
      await page.screenshot({ path: out + '/all-36.png', fullPage: true });
    }
    console.log(
      'PASS',
      reducedMotion,
      '36 alpha cutouts, distinct evolution, level 1/10/20 volleys, stamped identity and hitboxes',
    );
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
