// Source-level integration check: exercise real skill callbacks and inspect cosmetic ownership/lifecycle.
import { createServer } from 'vite';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const server = await createServer({ server: { port: 5188, host: '127.0.0.1' } });
await server.listen();
const browser = await chromium.launch();
const out = process.env.SCREENSHOT_DIR || '/workspace/review/skill-animation';
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
    await page.goto('http://127.0.0.1:5188/#debug', { timeout: 120000 });
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
            '/src/render/renderer.ts',
            '/src/render/pfx.ts',
          ].map(p => import(p)),
        )),
      );
      document.getElementById('start').click();
      for (let i = 0; i < 3; i++) {
        const c = document.getElementById('formationConfirm');
        document.querySelector('#choice button.card').click();
        c?.click();
      }
      document.querySelector('#choice .act').click();
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
        G.state.charge = 0;
        G.state.hyper = 0;
        G.state.negate = false;
        G.state.orbs = 0;
        G.state.rain = 0;
        G.player.shield = 0;
        G.player.inv = 0;
        G.player.hp = 2;
        G.player.maxHp = 3;
        G.shots = [];
        G.strikes = [];
        G.hazards = [];
        G.labels = [];
        G.paintedFX = [];
        G.rings = [];
        G.state.active = 0;
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
    assert.equal(ids.length, 24);
    assert.equal(await page.evaluate(() => M.skillAnimationSnapshot().loaded), 8);
    for (const id of ids) {
      const result = await page.evaluate(id => {
        resetArtCase();
        const { G, SKILLS } = M;
        M.learn(id);
        const d = SKILLS[id],
          e = G.enemies[0];
        if (d.trig === 'tick') M.updateSkills(1 / 60, G.player.x);
        else if (d.trig !== 'passive') M.trig(d.trig, { x: e.x, y: e.y, e, h: { x: e.x, y: e.y, vx: 0, vy: 200 } });
        else if (id === 'swaegap') M.hitEnemy(e, 10);
        else if (id === 'biyeon') M.graze({ x: 180, y: 500, vx: 0, vy: 200 });
        else if (id === 'chukgi') M.gainCharge(10);
        else if (id === 'hoeseon') {
          G.state.moveAcc = 999;
          M.updateSkills(1 / 60, G.player.x - 20);
        }
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
      M.learn('hoegi');
      G.player.hp = 3;
      M.trig('blast');
      M.updateSkillAnimations(0);
      const fullHp = M.skillAnimationSnapshot().cues.some(c => c.id === 'hoegi');
      resetArtCase();
      M.learn('art_cheonma');
      G.enemies = [];
      M.updateSkills(1 / 60, G.player.x);
      M.updateSkillAnimations(0);
      const noTarget = M.skillAnimationSnapshot().cues.length + G.strikes.length;
      resetArtCase();
      M.learn('art_cheolgap');
      M.updateSkills(1 / 60, G.player.x);
      M.updateSkillAnimations(0);
      const created = M.skillAnimationSnapshot().shield;
      M.damagePlayer();
      M.updateSkillAnimations(0);
      const after = M.skillAnimationSnapshot();
      resetArtCase();
      M.learn('hoechun');
      M.updateSkillAnimations(0);
      M.damagePlayer();
      M.updateSkillAnimations(0);
      const pill = M.skillAnimationSnapshot();
      M.clearSkillAnimations();
      return { fullHp, noTarget, created, after, pill, reset: M.skillAnimationSnapshot() };
    });
    assert.equal(lifecycle.fullHp, false);
    assert.equal(lifecycle.noTarget, 0);
    assert.equal(lifecycle.created, true);
    assert.equal(lifecycle.after.shield, false);
    assert.ok(lifecycle.after.cues.some(c => c.id === 'art_cheolgap' && c.impact));
    assert.ok(!lifecycle.after.cues.some(c => c.id === 'art_cheolgap' && !c.impact));
    assert.equal(lifecycle.pill.negate, false);
    assert.equal(lifecycle.reset.cues.length, 0);
    for (const mod of [3, 6, 7]) {
      const state = await page.evaluate(mod => {
        resetArtCase();
        const { G } = M;
        M.learn('mancheon');
        G.state.skills[0].mod = mod;
        M.trig('step', { x: G.player.x });
        M.updateSkillAnimations(0.1);
        return {
          shots: G.shots.map(s => s.skill),
          strikes: G.strikes.map(s => s.skill),
          cues: M.skillAnimationSnapshot().cues.map(c => c.id),
          scope: M.visualSkill,
        };
      }, mod);
      assert.ok(
        [...state.shots, ...state.strikes, ...state.cues].includes(
          { 3: 'art_dobeop', 6: 'art_cheolgap', 7: 'art_cheonma' }[mod],
        ),
      );
      assert.ok(state.shots.includes('mancheon'));
      assert.equal(state.scope, undefined);
    }
    for (const hero of await page.evaluate(() => Object.keys(M.HEROES))) {
      await page.evaluate(hero => {
        resetArtCase();
        M.G.state.formation = ['pungun', hero];
        M.G.state.swapReady = 0;
        M.swapHero();
        M.updateSkillAnimations(0.12);
        M.draw();
      }, hero);
      if (reducedMotion === 'no-preference') await page.screenshot({ path: `${out}/swap-${hero}.png` });
    }
    console.log(`PASS ${reducedMotion}: 24 skills, 3 modifiers, 6 swaps, no-op guards, consumption and reset`);
    await context.close();
  }
  assert.deepEqual(failures, []);
} finally {
  await browser.close();
  await server.close();
}
