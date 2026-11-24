// 정예 적 (docs/equipment-plan.md, 2장): the way to 장비 in a run. One comes every run. When the party is set, rolls
// decide in which tier step: step 2 with BASELINE.elite.chances[0], else step 3 with [1], else step 4 for sure (the
// 정예 적 등장 factor of the 선봉's gear adds to each chance, so it tends to come earlier), and at a random distance
// in that step. It never comes during a 운석 소나기: reaching its distance then, it waits for the shower to end (a
// shower that starts once it is out is left as it is). It comes down swaying at one steady speed, stops in front of
// the hero, then goes on down out of the bottom of the screen; touching it is a hit. Every hit takes one of its health, whatever the damage, so what
// counts is how often it is hit. Caught, it gives a 장비 상자 at once, opened on the result screen. Rows keep coming
// while it is out. Gameplay random only.
import { G } from '../core/context';
import { H, W } from '../core/dom';
import { clamp, rnd } from '../core/math';
import { random } from '../core/rng';
import { chime, tone } from '../core/audio';
import { BASELINE } from '../data/baseline';
import type { Enemy } from '../core/state-types';
import { damagePlayer } from '../entities/player';
import { burst, label, ring } from '../render/fx';
import { announce, syncHUD } from '../ui/hud';
import { factor } from './factors';
import { stageDistance } from './flow';
import { showerOn } from './shower';
import { stepTier } from './ladder';
import { RANKS } from '../data/enemies';
import { addScore } from './score';

const E = () => BASELINE.elite;
/** seconds a won 장비 상자 takes to fly to the hero */
export const BOX_FLY = 0.7;
/** The tier step the 정예 적 comes in (`rolls`: one 0-to-1 roll per step), by BASELINE.elite.chances from
 *  BASELINE.elite.firstStep on, each raised by `bonus` (the 정예 적 등장 factor); the last step is sure. */
export function eliteStep(rolls: number[], bonus = 0): number {
  const c = E().chances;
  for (let i = 0; i < c.length - 1; i++) if (rolls[i] < Math.min(1, c[i] + bonus)) return E().firstStep + i;
  return E().firstStep + c.length - 1;
}
/** Where this run's 정예 적 comes: rolled once, when the party is set (the same number of rolls every run). */
export function rollElite() {
  const s = G.state,
    rolls = E().chances.map(() => random()),
    where = random(),
    step = eliteStep(rolls, factor('eliteChance'));
  s.elite = { at: stageDistance() * ((step - 1 + where) / BASELINE.steps), out: false, caught: false, boxes: 0 };
}

/** Brings the 정예 적 out when its distance is reached (during the flight, never during a 운석 소나기: it waits for
 *  the shower to end); moves a won box to the hero. */
export function updateElite(dt: number) {
  const el = G.state.elite;
  if (el?.fly && (el.fly.t += dt) > BOX_FLY) el.fly = undefined;
  if (!el || el.out || el.at < 0 || G.state.phase !== 'flight' || G.state.distance < el.at || showerOn()) return;
  el.out = true;
  const hp = E().health,
    x = rnd(150, W - 150);
  G.enemies.push({
    x,
    baseX: x,
    y: -80,
    hp,
    maxHp: hp,
    type: 5,
    rank: 4,
    tier: 5,
    // as big as the enemies of the step it comes in (its look stays the red 5등급 art)
    size: RANKS[stepTier() - 1].size,
    r: RANKS[stepTier() - 1].r,
    color: '#ff6f5e',
    phase: 0,
    hit: 0,
    dead: false,
    elite: true,
    timer: 0,
  });
  announce('精銳', '정예 출현', '놓치기 전에 쏘아라 · 잡으면 장비 상자', '#ff8f6e', 1.6);
  tone(220, 0.3, 'sawtooth', 0.12, 440);
}

/** The 정예 적's path: down swaying at one steady speed, a stop in front of the hero, then on down out of the
 *  bottom at the same speed. Returns false when it touched the hero and the run ended. */
export function moveElite(e: Enemy, dt: number): boolean {
  const t = (e.timer = (e.timer ?? 0) + dt),
    p = E().path,
    sway = Math.sin((t / p.swayPeriod) * Math.PI * 2),
    // one speed for the whole way down: from y −80 to the stop in `down` s
    speed = (p.stopY + 80) / p.down;
  if (t < p.down) {
    e.y = -80 + speed * t;
    e.x = clamp(e.baseX! + sway * p.sway, 60, W - 60);
  } else if (t < p.down + p.stop) {
    e.y = p.stopY + Math.sin(t * 5) * 4;
    e.x = clamp(e.baseX! + sway * p.sway * 0.3, 60, W - 60);
  } else {
    e.y = p.stopY + speed * (t - p.down - p.stop);
  }
  if (Math.abs(e.x - G.player.x) < e.r + 10 && Math.abs(e.y - G.player.y) < e.r + 12) {
    damagePlayer();
    if (G.mode !== 'play') return false;
  }
  if (e.y > H + 90) {
    e.dead = true;
    label('정예 적이 달아났다', W / 2, 300, '#d6cdbd', 18);
  }
  return true;
}

/** The 정예 적 is caught: a 장비 상자 (opened on the result screen). */
export function catchElite(e: Enemy) {
  const el = G.state.elite!;
  el.caught = true;
  el.boxes++;
  addScore(E().score);
  ring(e.x, e.y, '#ffcf6a', 16, 220, 0.6);
  burst(e.x, e.y, '#ffcf6a', 30, 260);
  // the box flies to the hero (drawn by render/elite-art.ts)
  el.fly = { x: e.x, y: e.y, t: 0 };
  announce('裝備', '장비 상자 획득', '판이 끝나면 연다', '#ffcf6a', 1.4);
  chime();
  syncHUD();
}
