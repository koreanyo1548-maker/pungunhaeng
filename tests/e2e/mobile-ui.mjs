import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { launch, openGame } from '../lib/harness.mjs';
const browser = await launch();
const output = process.env.SCREENSHOT_DIR;
if (output) await mkdir(output, { recursive: true });
try {
  for (const viewport of [
    { width: 360, height: 640 },
    { width: 390, height: 844 },
    { width: 1280, height: 900 },
  ]) {
    const g = await openGame(undefined, {
      browser: { newPage: opts => browser.newPage({ ...opts, hasTouch: true }) },
      viewport,
    });
    const shot = async name => {
      if (output) await g.page.screenshot({ path: `${output}/${name}-${viewport.width}.png` });
    };
    // the lobby: the stage card opens on the highest open stage (S6 in the debug roster); turn it to S4 부유암 (운해:
    // left-right only) with the arrows, then 강호에 나서기
    assert.ok(await g.page.locator('#stageNext').isDisabled(), 'S6 first, nothing after it');
    await shot('lobby');
    for (let i = 0; i < 2; i++) await g.page.locator('#stagePrev').tap();
    assert.match(await g.page.locator('#stageCard').textContent(), /S4/);
    await g.page.locator('#start').tap();
    await g.step(2);
    assert.equal(await g.choiceTitle(), '편대');
    // 편대: tap two heroes (1 선봉, 2 후발); nothing commits until 출발, which needs both
    const formation = await g.state(() => [...window.__g.state.formation]);
    const roster = g.page.locator('#choice .party-hero');
    assert.equal(await roster.count(), 12);
    await roster.nth(1).tap();
    assert.equal(await g.mode(), 'choice');
    assert.equal(await roster.nth(1).getAttribute('aria-pressed'), 'true');
    assert.ok(await g.page.locator('#formationConfirm').isDisabled(), '출발 needs two heroes');
    await roster.nth(3).tap();
    assert.deepEqual(await g.state(() => [...window.__g.state.formation]), formation, 'picking must not commit');
    assert.ok(
      await g.page.locator('#formationConfirm').evaluate(el => {
        const r = el.getBoundingClientRect(),
          p = el.closest('.panel').getBoundingClientRect();
        return r.top >= p.top && r.bottom <= p.bottom && !el.disabled;
      }),
      '출발 visible without scrolling, on with two heroes',
    );
    await shot('formation');
    await g.page.locator('#formationConfirm').tap();
    await g.step(2);
    assert.equal(await g.mode(), 'play', 'play starts after the party is set');
    await g.eval(() => (window.__g.player.inv = 999)); // UI input checks do not depend on combat survival.
    await g.seconds(5);
    // A touch drag moves the player; tapping an action must not move it.
    const c = await g.page.locator('canvas').boundingBox();
    const touch = await g.page.context().newCDPSession(g.page);
    const pt = (x, y) => ({ x: c.x + c.width * x, y: c.y + c.height * y });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt(0.5, 0.6)] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [pt(0.3, 0.6)] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await g.step(10);
    assert.ok(await g.state(() => window.__g.player.target < 240), 'touch drag moves left');
    const before = await g.state(() => ({
      active: window.__g.state.active,
      x: window.__g.player.target,
      bombs: window.__g.state.bombs,
    }));
    // the swap button is gone from play: its place is kept invisible, and tapping there does nothing
    assert.equal(
      await g.eval(() => getComputedStyle(document.getElementById('swap')).visibility),
      'hidden',
      'swap slot is hidden',
    );
    const ult = await g.page.locator('#blast').boundingBox();
    await g.page.touchscreen.tap(ult.x + ult.width / 2, ult.y - 40);
    await g.step(2);
    assert.equal(await g.state(() => window.__g.state.active), before.active, 'no manual swap');
    assert.ok(ult.width >= 44, 'touch target at least 44px');
    assert.ok(ult.y + ult.height <= c.y + c.height, 'button stays inside game');
    await g.seconds(1);
    await shot('combat');
    await g.page.locator('#blast').tap();
    await g.page.waitForTimeout(400); // allow synthesized touch click: must not spend a second charge
    await g.step(2);
    assert.equal(await g.state(() => window.__g.state.bombs), before.bombs - 1);
    // a 만남: the 인연 card and its two choices fit, and a choice is a tap
    await g.eval(() => window.__g.meet('yakseon'));
    await g.step(2);
    assert.equal(await g.choiceTitle(), '인연');
    assert.equal(await g.page.locator('#toast.show').count(), 0, 'combat toast cannot cover the 만남');
    const acts = g.page.locator('#choice .act');
    assert.equal(await acts.count(), 2);
    assert.ok(
      await acts.nth(1).evaluate(el => {
        const r = el.getBoundingClientRect();
        return r.height >= 44 && r.bottom <= innerHeight;
      }),
      'both choices reachable, at least 44px',
    );
    await shot('encounter');
    await acts.first().tap();
    await g.step(2);
    assert.equal(await g.mode(), 'play');
    const count = await g.state(() => window.__g.state.skills.length);
    await g.eval(() => {
      const q = window.__g.state.quest;
      if (q.t === 'combo') window.__g.state.combo = 999;
      window.__g.questEvent(q.t, 999);
    });
    await g.step(2);
    assert.equal(await g.state(() => window.__g.state.skills.length), count + 1, 'the met 의뢰 teaches 1단계');
    assert.deepEqual(g.errors, []);
    await g.page.close();
    console.log(
      `PASS ${viewport.width}: lobby stage card, 편대 (two then 출발), touch drag, hidden swap slot, blast, 만남, no page errors`,
    );
  }
} finally {
  await browser.close();
}
