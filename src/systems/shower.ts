// 운석 소나기 (docs/combat-stats.md): a stage gimmick apart from the single 운석. At the end of each tier step from
// BASELINE.shower.fromStep on (the last one just before the boss warning), no rows come and BASELINE.shower.count
// 운석 are marked one by one, BASELINE.shower.gap s apart, each falling after the usual warning (BASELINE.meteor.warn):
// the first ones at random places, the last BASELINE.shower.aimed where the hero is when they are marked. Rows come
// back when the BASELINE.shower.resumeWith-th 운석 starts to fall (and the boss warning, after the last step's).
// Gameplay random only.
import { G } from '../core/context';
import { W } from '../core/dom';
import { clamp, rnd } from '../core/math';
import { tone } from '../core/audio';
import { BASELINE } from '../data/baseline';
import { announce } from '../ui/hud';
import { ladderStep } from './ladder';

/** a 운석 of the shower at x (same as the single 운석: warned, then it falls) */
function drop(x: number) {
  G.hazards.push({ kind: 'meteor', x, y: -70, warn: BASELINE.meteor.warn, r: 23, vy: 620 });
  tone(340, 0.14, 'triangle', 0.14, 280);
}

/** a shower is running: no rows (and no single 운석) come */
export const showerOn = () => !!G.state.shower;

/** Starts a shower for the step that just ended, once per step. */
function start(step: number) {
  G.state.showerSteps.push(step);
  const c = BASELINE.shower;
  G.state.shower = { marked: 0, next: 0, left: (c.resumeWith - 1) * c.gap + BASELINE.meteor.warn };
  announce('流星雨', '운석 소나기', '떨어질 자리를 보고 피하라', '#ff8a5c', 1.4);
}

/** Whether the step `step` ending now brings a shower (and has not had one). */
const due = (step: number) => step >= BASELINE.shower.fromStep && !G.state.showerSteps.includes(step);

/** A step of flight: starts a shower when a step ends, marks its 운석. `atBoss`: the stage's distance is run (the
 *  last step ends). Returns false while a shower holds the boss warning back. */
export function updateShower(dt: number, atBoss: boolean): boolean {
  const s = G.state;
  if (!s.shower) {
    // the step that has just ended: the one before the current, or the last one at the boss
    const ended = atBoss ? BASELINE.steps : ladderStep() - 1;
    if (ended >= 1 && due(ended)) start(ended);
    else return true;
  }
  const sh = s.shower!,
    c = BASELINE.shower;
  sh.next -= dt;
  while (sh.marked < c.count && sh.next <= 0) {
    // the last `aimed` are marked where the hero is now; the others anywhere on the screen
    const aimed = sh.marked >= c.count - c.aimed;
    drop(aimed ? clamp(G.player.x, 30, W - 30) : rnd(40, W - 40));
    sh.marked++;
    sh.next += c.gap;
  }
  sh.left -= dt;
  if (sh.left <= 0 && sh.marked >= c.count) {
    s.shower = undefined;
    // the next row comes now, as the resumeWith-th 운석 starts to fall
    s.rowTimer = 0;
    return true;
  }
  return false;
}
