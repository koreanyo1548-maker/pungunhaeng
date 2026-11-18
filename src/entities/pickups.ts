// Pickups: 엽전 and the in-play items (docs/combat-stats.md). They drop from kills: each pops up from where the enemy
// was, slows, then falls (PICKUP_FALL) and leaves the screen unless it is caught; only a magnet (황연청, the 자석
// item) pulls them in (systems/loop.ts). A kill drops one 엽전 and, with ITEM_CHANCE, one item, each of the three as
// likely (not a 무아지경 kill: that drops 엽전 only):
//   hyper  무아지경: a moment of invincibility with fiercer attacks (as before)
//   magnet 자석: pickups are pulled in for ITEM_SECONDS
//   double 점수 두 배: score counts twice for ITEM_SECONDS (systems/score.ts addScore)
// Taking an item whose effect is running sets it back to its full time (it does not stack).
import { G } from '../core/context';
import { chime, tone } from '../core/audio';
import { rnd } from '../core/math';
import { random } from '../core/rng';
import { burst, label, ring } from '../render/fx';
import { pfx, ramp } from '../render/pfx';
import { announce } from '../ui/hud';
import { hyperItemScale } from '../systems/hero-effects';
import { COIN_SCORE, addScore } from '../systems/score';

const COIN = ramp('#ffdf87');

export type PickupKind = 'coin' | 'hyper' | 'magnet' | 'double';
/** the items a kill can drop, in the order they are rolled */
export const ITEMS: PickupKind[] = ['hyper', 'magnet', 'double'];
/** chance per kill that an item drops (then one of ITEMS, each as likely) */
export const ITEM_CHANCE = 0.02;
/** seconds the 자석 and 점수 두 배 items last */
export const ITEM_SECONDS = 10;
/** how a pickup moves: it is thrown up at `pop` px/s (it rises about 120-200 px), sideways up to `spread` px/s
 *  (it bounces off the screen's sides), and gravity pulls it down to `max` px/s */
export const PICKUP_FALL = { pop: [560, 720], spread: 170, gravity: 1250, max: 380 };
/** how close the hero has to come to take a pickup (px from its centre) */
export const PICKUP_REACH = { coin: 34, item: 44 };

export function addPickup(kind: PickupKind, x: number, y: number) {
  G.pickups.push({
    kind,
    x,
    y,
    r: kind === 'coin' ? 12 : 24,
    life: 10,
    phase: rnd(0, 6),
    vx: rnd(-PICKUP_FALL.spread, PICKUP_FALL.spread),
    vy: -rnd(PICKUP_FALL.pop[0], PICKUP_FALL.pop[1]),
  });
}
/** What a kill (not the boss) drops at (x, y): `coins` 엽전 and, with `items`, an item with ITEM_CHANCE. */
export function dropLoot(x: number, y: number, coins: number, items = true) {
  for (let i = 0; i < coins; i++) addPickup('coin', x + rnd(-15, 15), y + rnd(-10, 10));
  if (!items || random() >= ITEM_CHANCE) return;
  const kind = ITEMS[Math.floor(random() * ITEMS.length)];
  addPickup(kind, x, y);
  if (kind === 'hyper') G.state.hyperDrops++;
}
export function collect(p) {
  p.dead = true;
  if (p.kind === 'coin') {
    G.state.coins++;
    addScore(COIN_SCORE);
    if (G.state.coins % 3 === 0) tone(1400 + (G.state.coins % 5) * 100, 0.045, 'sine', 0.045, 1800);
    if (!pfx('collect', p.x, p.y + 40, { palette: COIN })) burst(p.x, p.y, '#ffdf87', 3, 60);
  } else if (p.kind === 'magnet') {
    G.state.magnet = ITEM_SECONDS;
    ring(G.player.x, G.player.y, '#8fe3b0', 10, 170, 0.4);
    label('자석 ' + ITEM_SECONDS + '초', G.player.x, G.player.y - 60, '#8fe3b0', 18);
    chime();
  } else if (p.kind === 'double') {
    G.state.double = ITEM_SECONDS;
    ring(G.player.x, G.player.y, '#ffd36e', 10, 170, 0.4);
    label('점수 두 배 ' + ITEM_SECONDS + '초', G.player.x, G.player.y - 60, '#ffd36e', 18);
    chime();
  } else {
    G.state.hyper = Math.max(G.state.hyper, 4.2 * hyperItemScale());
    G.player.inv = Math.max(G.player.inv, G.state.hyper + 0.6);
    G.hazards = [];
    G.flash = 0.22;
    ring(G.player.x, G.player.y, '#c5f9ff', 10, 200, 0.45);
    announce('無我之境', '무아지경', '잠시 무적 · 공격이 거세진다', '#c5ffff', 1.5);
    tone(160, 0.65, 'sawtooth', 0.14, 700);
  }
}
