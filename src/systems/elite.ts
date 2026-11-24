// 정예 적 (docs/equipment-plan.md, 2장): the way to 장비 in a run. When the party is set, a roll decides whether one
// comes this run (BASELINE.elite.chance + the 정예 적 등장 factor of the 선봉's gear) and at what distance (between
// the start of step 2 and the end of step 5). It comes down swaying, stops in front of the hero, then drops out of
// the bottom of the screen; touching it is a hit. Every hit takes one of its health, whatever the damage, so what
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
import { addScore } from './score';

const E = () => BASELINE.elite;
/** seconds a won 장비 상자 takes to fly to the hero */
export const BOX_FLY = 0.7;
/** whether this run brings a 정예 적: rolled once, when the party is set */
export function rollElite() {
  const s = G.state,
    chance = Math.min(1, E().chance + factor('eliteChance')),
    roll = random(),
    where = random();
  s.elite = { at: -1, out: false, caught: false, boxes: 0 };
  if (roll >= chance) return;
  const [from, to] = E().steps;
  s.elite.at = stageDistance() * ((from - 1) / BASELINE.steps + where * ((to - from + 1) / BASELINE.steps));
}

/** Brings the 정예 적 out when its distance is reached (during the flight only); moves a won box to the hero. */
export function updateElite(dt: number) {
  const el = G.state.elite;
  if (el?.fly && (el.fly.t += dt) > BOX_FLY) el.fly = undefined;
  if (!el || el.out || el.at < 0 || G.state.phase !== 'flight' || G.state.distance < el.at) return;
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
    size: 136,
    r: E().radius,
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
