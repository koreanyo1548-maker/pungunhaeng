// Source-level integration check: exercise real skill callbacks and inspect cosmetic ownership/lifecycle.
import { createServer } from 'vite';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const server = await createServer({ server: { port: 5188, host: '127.0.0.1' } });
await server.listen();
const browser = await chromium.launch();
const out = process.env.SCREENSHOT_DIR || 'test-results/skill-animation';
await mkdir(out, { recursive: true });
const failures = [];
try {
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion });
    const page = await context.newPage();
    page.on('pageerror', e => failures.push(e.message));
    await page.addInitScript(() => {
      window.requestAnimationFrame = () => 0;
    });
    await page.goto('http://127.0.0.1:5188/#debug&roster', { timeout: 120000 });
    await page.waitForFunction(() => window.__g && !document.getElementById('start').disabled, null, {
      timeout: 120000,
    });
    await page.evaluate(async () => {
      window.M = Object.assign(
        {},
        ...(await Promise.all(
          [
            '/src/core/context.ts',
            '/src/data/skills.ts',
            '/src/data/heroes.ts',
            '/src/systems/abilities.ts',
            '/src/systems/combat.ts',
            '/src/systems/flow.ts',
            '/src/entities/enemies.ts',
            '/src/entities/player.ts',
            '/src/systems/formation.ts',
            '/src/render/skill-animation.ts',
            '/src/core/skill-context.ts',
            '/src/render/renderer.ts',
            '/src/render/pfx.ts',
            '/src/render/callout.ts',
          ].map(p => import(p)),
        )),
      );
      while (!document.getElementById('stagePrev').disabled) document.getElementById('stagePrev').click(); // S1
      document.getElementById('start').click();
      // one hero a run (2026-11): the first
      document.querySelectorAll('#choice .party-hero')[0].click();
      document.getElementById('formationConfirm').click();
      const { G } = M;
      G.banner = null;
      G.bossIntro = null;
      G.time = 10;
      G.state.phase = 'flight';
      window.resetArtCase = () => {
        M.clearSkillAnimations();
        M.clearPfx();
        G.particles = [];
        G.contactFX = [];
        G.impacts = [];
        G.state.skills = [];
        G.state.bombs = 2;
        G.state.hyper = 0;
        G.player.inv = 0;
        G.player.hp = 2;
        G.player.maxHp = 3;
        G.shots = [];
        G.strikes = [];
        G.hazards = [];
        G.labels = [];
        G.paintedFX = [];
        G.rings = [];
        G.mode = 'play';
        G.state.phase = 'flight';
        G.enemies = [
          {
            x: 240,
            y: 330,
            hp: 10000,
            maxHp: 10000,
            r: 30,
            size: 80,
            rank: 2,
            type: 6,
            dead: false,
            boss: false,
            baseX: 240,
            phase: 0,
            hit: 0,
          },
        ];
      };
    });
    const ids = await page.evaluate(() => Object.keys(M.SKILLS));
    assert.equal(ids.length, 10, 'ten 공명 기술');
    assert.equal(await page.evaluate(() => M.skillAnimationSnapshot().loaded), 14);
    for (const id of ids) {
      const result = await page.evaluate(id => {
        resetArtCase();
        const { G, SKILLS } = M;
        M.learn(id);
        const d = SKILLS[id],
          e = G.enemies[0];
        // learning shows the skill once at the hero; then it goes off by its trigger
        if (['tick', 'aura', 'window'].includes(d.trig)) M.updateSkills(1 / 60);
        else M.trig(d.trig, { x: e.x, y: e.y, e });
        M.updateSkillAnimations(0.12);
        M.draw();
        return {
          id,
          cues: M.skillAnimationSnapshot().cues.map(c => c.id),
          shots: G.shots.map(s => s.skill),
          strikes: G.strikes.map(s => s.skill),
          scope: M.visualSkill,
        };
      }, id);
      assert.ok([...result.cues, ...result.shots, ...result.strikes].includes(id), `${id}: missing visual activation`);
      assert.equal(result.scope, undefined, `${id}: leaked skill context`);
      if (reducedMotion === 'no-preference') await page.screenshot({ path: `${out}/${id}.png` });
    }
    const lifecycle = await page.evaluate(() => {
      resetArtCase();
      const { G } = M;
      M.learn('art_cheonma');
      M.updateSkillAnimations(0); // the learning cue
      M.clearSkillAnimations();
      G.enemies = [];
      M.updateSkills(1 / 60);
      M.updateSkillAnimations(0);
      const noTarget = M.skillAnimationSnapshot().cues.length + G.strikes.length;
      M.clearSkillAnimations();
      return { noTarget, reset: M.skillAnimationSnapshot() };
    });
    assert.equal(lifecycle.noTarget, 0, '천마군림 shows nothing with no target');
    assert.equal(lifecycle.reset.cues.length, 0);
    // An area blast keeps its area visual even when the per-target cues fill the per-skill limit
    // or sit right on its centre.
    const area = await page.evaluate(() => {
      resetArtCase();
      const { G } = M;
      G.enemies = Array.from({ length: 6 }, (_, i) => ({
        ...G.enemies[0],
        x: 140 + i * 40,
        baseX: 140 + i * 40,
        y: 300 + (i % 2) * 40,
      }));
      M.withSkill('bungsan', () => M.aoe(240, 310, 150, 1, '#7fe6cf'));
      return M.skillAnimationSnapshot().cues.map(c => c.size);
    });
    assert.ok(area.includes(300), 'area cue missing after a blast that hit six targets');
    // 초식 이름: a new skill announces itself three times, then stays quiet.
    const names = await page.evaluate(() => {
      resetArtCase();
      const { G } = M;
      M.learn('janyoung');
      const skill = G.state.skills[0];
      let shown = 0;
      const fire = n => {
        for (let i = 0; i < n; i++) {
          M.clearCallouts();
          G.time += 2;
          skill.ready = 0;
          M.trig('step', { x: G.player.x });
          M.updateCallouts(0);
          M.drawCallouts();
          shown += M.calloutSnapshot().length;
        }
        return shown;
      };
      return { first: fire(5) };
    });
    assert.equal(names.first, 5, 'a skill is called out every time it goes off (once a second at most)');
    // every hero in play with the 공명 기술 that stay on the hero (어검진's swords, 그림자 분신's clones)
    for (const hero of await page.evaluate(() => Object.keys(M.HEROES))) {
      await page.evaluate(hero => {
        resetArtCase();
        M.G.state.hero = hero;
        M.learn('eogeom');
        M.learn('grimja');
        M.G.state.skills.find(s => s.id === 'grimja').level = 3;
        M.updateSkillAnimations(0.12);
        M.draw();
      }, hero);
      if (reducedMotion === 'no-preference') await page.screenshot({ path: `${out}/hero-${hero}.png` });
    }
    console.log(`PASS ${reducedMotion}: 10 공명 기술, every hero with swords and clones, no-op guards and reset`);
    await context.close();
  }
  assert.deepEqual(failures, []);
} finally {
  await browser.close();
  await server.close();
}
