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
    await g.page.locator('#start').tap();
    await g.step(2);
    await g.pick(1);
    await g.step(2);
    const formation = await g.state(() => [...window.__g.state.formation]);
    const roster = g.page.locator('#choice button.card');
    await roster.nth(1).tap();
    assert.equal(await g.mode(), 'choice');
    assert.deepEqual(await g.state(() => [...window.__g.state.formation]), formation, 'preview must not commit');
    assert.equal(await roster.nth(1).getAttribute('aria-pressed'), 'true');
    assert.ok(
      await g.page.locator('#formationConfirm').evaluate(el => {
        const r = el.getBoundingClientRect(),
          p = el.closest('.panel').getBoundingClientRect();
        return r.top >= p.top && r.bottom <= p.bottom;
      }),
      'confirm visible without scrolling',
    );
    await shot('formation');
    await g.page.locator('#formationConfirm').tap();
    await g.step(2);
    assert.equal(await g.choiceTitle(), '후위');
    assert.equal(await roster.count(), 5, 'front hero excluded from rear roster');
    await g.pick(0);
    await g.step(2);
    await g.act(0);
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
    await g.eval(() => window.__g.setSwap());
    const before = await g.state(() => ({
      active: window.__g.state.active,
      x: window.__g.player.target,
      bombs: window.__g.state.bombs,
    }));
    await g.page.locator('#swap').tap();
    await g.step(2);
    assert.notEqual(await g.state(() => window.__g.state.active), before.active);
    assert.equal(await g.state(() => window.__g.player.target), before.x, 'button tap does not drag');
    const sw = await g.page.locator('#swap').boundingBox(),
      ult = await g.page.locator('#blast').boundingBox();
    assert.ok(sw.width >= 44 && ult.width >= 44, 'touch targets at least 44px');
    assert.ok(sw.x + sw.width < ult.x || sw.y + sw.height <= ult.y, 'action targets do not overlap');
    assert.ok(ult.y + ult.height <= c.y + c.height, 'button stays inside game');
    await g.seconds(1);
    await shot('combat');
    await g.page.locator('#blast').tap();
    await g.page.waitForTimeout(400); // allow synthesized touch click: must not spend a second charge
    await g.step(2);
    assert.equal(await g.state(() => window.__g.state.bombs), before.bombs - 1);
    await g.eval(() => {
      const q = window.__g.state.quest;
      if (q.t === 'combo') window.__g.state.combo = 999;
      window.__g.questEvent(q.t, 999);
    });
    await g.seconds(2);
    assert.equal(await g.choiceTitle(), '돈오');
    assert.equal(await g.page.locator('#toast.show').count(), 0, 'combat toast cannot cover reward title');
    assert.ok(await g.page.locator('#choice.reward-screen').count());
    await shot('dono');
    const count = await g.state(() => window.__g.state.skills.length);
    await g.page.locator('#choice button.card').first().tap();
    await g.step(2);
    assert.equal(await g.state(() => window.__g.state.skills.length), count + 1);
    assert.deepEqual(g.errors, []);
    await g.page.close();
    console.log(`PASS ${viewport.width}: preview/confirm, touch drag, swap/blast, reward selection, no page errors`);
  }
} finally {
  await browser.close();
}
