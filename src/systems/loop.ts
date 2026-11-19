import { G } from '../core/context';
import { tone } from '../core/audio';
import { H, W } from '../core/dom';
import { clamp } from '../core/math';
import { TUNE } from '../data/tune';
import { updateBoss } from '../entities/boss';
import { hitEnemy, hyperFinish, kill, nearestEnemy, resolveRow } from '../entities/enemies';
import { PICKUP_FALL, PICKUP_REACH, collect, isCoinLike } from '../entities/pickups';
import { damagePlayer, shoot, updateMartialMotion } from '../entities/player';
import { burst, effects, impact } from '../render/fx';
import { pfx } from '../render/pfx';
import { draw } from '../render/renderer';
import { updateSkills } from './abilities';
import { graze, grazeEnemy } from './combat';
import { difficulty, skyStage } from './flow';
import { updatePhase } from './stage-phases';
import { RUN_SCORE, addScore, runSpeed } from './score';
import { speedFactor } from './ladder';
import { BASELINE } from '../data/baseline';

import { updateEncounter } from './encounter';
import { bondFireRate, bondGraze } from '../data/skills';
import { enemySpeed, grazeReach, hazardSpeed, magnetReach, updateHeroEffect } from './hero-effects';
import { syncHUD } from '../ui/hud';

export function update(dt) {
  if (G.mode !== 'play') return;
  const realDt = dt;
  if (G.hitstop > 0) {
    G.hitstop -= dt;
    dt *= 0.12;
  }
  G.time += dt;
  G.state.enteredStep = false;
  G.state.elapsed += dt;
  // the run speeds up with the stage's progress (systems/ladder.ts); 무아지경 runs BASELINE.hyper.speed times faster
  const pace = speedFactor() * (G.state.hyper > 0 ? BASELINE.hyper.speed : 1);
  G.state.distance += dt * runSpeed(G.state.stage) * pace;
  addScore(dt * RUN_SCORE);
  G.scroll += dt * (G.state.phase === 'clear' ? 500 : (185 + Math.min(difficulty() * 24, 120)) * Math.min(pace, 6));
  const hyperBefore = G.state.hyper;
  G.state.hyper = Math.max(0, G.state.hyper - dt);
  // 무아지경 ends with the whole screen bursting: the enemies left turn into 엽전
  if (hyperBefore > 0 && G.state.hyper <= 0) hyperFinish();
  G.state.magnet = Math.max(0, G.state.magnet - dt);
  G.state.double = Math.max(0, G.state.double - dt);
  G.player.inv = Math.max(0, G.player.inv - dt);
  G.player.muzzle = Math.max(0, G.player.muzzle - dt);
  G.shake = Math.max(0, G.shake - realDt * 22);
  G.flash = Math.max(0, G.flash - realDt * 1.8);
  G.state.comboTimer -= dt;
  if (G.state.comboTimer <= 0) G.state.combo = 0;
  updatePlayer(dt);

  if (!updatePhase(dt)) return;
  updateHeroEffect(dt);
  if (G.mode !== 'play') return;
  updateSkills(dt);
  if (G.mode !== 'play') return;
  updateShots(dt);
  if (!updateEnemies(dt)) return;
  if (!updateHazards(dt)) return;
  updatePickups(dt);
  G.shots = G.shots.filter(s => !s.dead && s.y > -40 && s.x > -20 && s.x < W + 20);
  G.enemies = G.enemies.filter(e => !e.dead);
  G.hazards = G.hazards.filter(h => !h.dead && h.y < H + 80 && h.x > -90 && h.x < W + 90);
  G.pickups = G.pickups.filter(p => !p.dead && p.y < H + 30 && p.life > 0);
  if (!updateEncounter()) return;
  G.hudClock -= realDt;
  if (G.hudClock <= 0) {
    syncHUD();
    G.hudClock = 0.08;
  }
}
function updatePlayer(dt: number): number {
  if (G.keys.has('ArrowLeft') || G.keys.has('a')) G.player.target -= dt * 510;
  if (G.keys.has('ArrowRight') || G.keys.has('d')) G.player.target += dt * 510;
  G.player.target = clamp(G.player.target, 24, W - 24);
  if (TUNE.freeFlight && skyStage()) {
    if (G.keys.has('ArrowUp') || G.keys.has('w')) G.player.targetY -= dt * 430;
    if (G.keys.has('ArrowDown') || G.keys.has('s')) G.player.targetY += dt * 430;
    G.player.targetY = clamp(G.player.targetY, TUNE.skyMinY, TUNE.skyMaxY);
    G.player.y += (G.player.targetY - G.player.y) * (1 - Math.exp(-dt * 20));
  }
  const old = G.player.x;
  G.player.x += (G.player.target - G.player.x) * (1 - Math.exp(-dt * 24));
  G.player.tilt += (clamp((G.player.x - old) * 0.025, -0.24, 0.24) - G.player.tilt) * (1 - Math.exp(-dt * 12));
  G.player.fire -= dt;
  if (G.player.fire <= 0 && ['flight', 'boss'].includes(G.state.phase)) {
    shoot();
    G.player.fire += BASELINE.fireInterval / bondFireRate();
  } else if (G.player.fire < 0) G.player.fire = 0;
  updateMartialMotion(dt, old);

  return old;
}

function updateShots(dt: number): void {
  for (const s of G.shots) {
    s.prevY = s.y;
    if (s.homing) {
      const t = nearestEnemy(s.x, s.y);
      if (t) s.vx += clamp((t.x - s.x) * 7 - s.vx, -1400, 1400) * dt;
    }
    s.y -= dt * (s.vy ?? 900);
    s.x += s.vx * dt;
    if (s.erase && eraseHazard(s)) continue;
    for (const e of G.enemies) {
      if (e.dead || (e.boss && ['enter', 'return'].includes(e.action)) || s.hits?.has(e)) continue;
      const r = (e.boss ? 58 : e.r) + (s.w || 0);
      if (Math.abs(s.x - e.x) < r && s.prevY >= e.y - r && s.y <= e.y + r) {
        hitEnemy(e, s.damage, s.skill);
        if (s.pierce) {
          (s.hits ??= new Set()).add(e);
          continue;
        }
        if (s.pierceLeft > 0) {
          // 목청완: the shot goes through this many enemies before it stops
          s.pierceLeft--;
          (s.hits ??= new Set()).add(e);
          continue;
        }
        s.dead = true;
        burst(s.x, Math.min(s.prevY, e.y + r), '#fff3c2', 3, 100);
        if (G.time - G.lastHitSound > 0.09) {
          tone(e.rank >= 2 ? 380 : 260, 0.035, 'square', 0.025, 120);
          G.lastHitSound = G.time;
        }
        break;
      }
    }
  }
}

/** A shot that erases hazards (은침 ★5) removes the first one it touches and is spent. */
function eraseHazard(s): boolean {
  for (const h of G.hazards) {
    if (h.dead || h.warn > 0) continue;
    if (Math.abs(h.x - s.x) < h.r + 8 && Math.abs(h.y - s.y) < h.r + 14) {
      h.dead = true;
      s.dead = true;
      burst(h.x, h.y, s.color || '#7fe6cf', 5, 90);
      return true;
    }
  }
  return false;
}

function updateEnemies(dt: number): boolean {
  const descent = G.state.stage === 1 ? BASELINE.s1Descent : BASELINE.descent;
  for (const e of G.enemies) {
    if (e.dead) continue;
    e.hit = Math.max(0, e.hit - dt);
    e.recoil = Math.max(0, (e.recoil || 0) - dt);
    if (e.boss) {
      updateBoss(e, dt);
      if (G.mode !== 'play') return false;
      continue;
    }
    e.y += dt * descent * speedFactor() * (G.state.hyper > 0 ? BASELINE.hyper.descent : 1) * enemySpeed();
    if (G.state.stage >= 3) e.x = e.baseX + Math.sin(G.state.stageTime * 1.1 + e.row) * 10;
    if (G.state.hyper > 0 && e.y > G.player.y - 220) {
      kill(e, true);
      continue;
    }
    // 스침: an enemy passing close beside the player (not touching) counts once. Between two enemies of a row
    // both count, so slipping through a gap is two.
    if (
      !e.grazed &&
      G.player.hp > 0 &&
      Math.abs(e.y - G.player.y) < e.r + 12 &&
      Math.abs(e.x - G.player.x) >= e.r + 10 &&
      Math.abs(e.x - G.player.x) < e.r + 10 + TUNE.grazeRadius * bondGraze() * grazeReach() * 1.15
    ) {
      e.grazed = true;
      grazeEnemy(e);
      if (G.mode !== 'play') return false;
    }
    if (Math.abs(e.x - G.player.x) < e.r + 10 && Math.abs(e.y - G.player.y) < e.r + 12) {
      damagePlayer();
      if (G.mode !== 'play') return false;
      e.dead = true;
      resolveRow(e, true);
    } else if (e.y > H + 60) {
      e.dead = true;
      resolveRow(e, true);
    }
  }
  return true;
}

function updateHazards(dt: number): boolean {
  const grazeR = TUNE.grazeRadius * bondGraze() * grazeReach();
  for (const h of G.hazards) {
    if (h.warn > 0) {
      h.warn -= dt;
      continue;
    }
    const slow = hazardSpeed();
    h.y += h.vy * dt * slow;
    h.x += (h.vx || 0) * dt * slow;
    const d = Math.hypot(h.x - G.player.x, h.y - G.player.y);
    if (!h.grazed && !h.dead && d >= h.r + 10 && d < h.r + 10 + grazeR && G.player.hp > 0) {
      graze(h);
      if (G.mode !== 'play') return false;
    }
    if (!h.dead && d < h.r + 10) {
      damagePlayer();
      if (G.mode !== 'play') return false;
      h.dead = true;
      if (!pfx('hurt', h.x, h.y)) {
        impact(h.x, h.y, '#ffbc7a', 40);
        burst(h.x, h.y, '#ffbc7a', 15, 180);
      }
    }
  }
  return true;
}

function updatePickups(dt: number): void {
  for (const p of G.pickups) {
    p.life -= dt;
    // no magnet by default (not in 무아지경 either): only 황연청 in the party or the 자석 item pull pickups in; otherwise a
    // pickup pops up from the kill and falls (entities/pickups.ts) and has to be caught
    const dx = G.player.x - p.x,
      dy = G.player.y - p.y,
      dist = Math.hypot(dx, dy),
      reach = magnetReach(),
      coinLike = isCoinLike(p.kind),
      attract = reach > 0 && dist < (coinLike ? 150 : 65) * reach;
    if (attract) {
      const v = coinLike ? 600 : 260;
      p.x += (dx / Math.max(1, dist)) * Math.min(v * dt, dist);
      p.y += (dy / Math.max(1, dist)) * Math.min(v * dt, dist);
      p.vy = Math.max(0, p.vy);
    } else {
      // an item hangs at the top of its pop (BASELINE.itemHang) before it falls
      if (p.hang > 0 && p.vy >= 0) {
        p.hang -= dt;
        p.vy = 0;
      } else p.vy = Math.min(PICKUP_FALL.max, p.vy + PICKUP_FALL.gravity * dt);
      p.y += p.vy * dt;
      // it stays on the screen: the top stops the rise, the sides throw it back
      if (p.y < 30 && p.vy < 0) {
        p.y = 30;
        p.vy = 0;
      }
      p.x += p.vx * dt;
      if (p.x < 18 || p.x > W - 18) {
        p.x = clamp(p.x, 18, W - 18);
        p.vx = -p.vx * 0.6;
      }
      p.vx *= Math.exp(-dt * 1.2);
    }
    const take = coinLike ? PICKUP_REACH.coin : PICKUP_REACH.item;
    if (dist < take || Math.hypot(G.player.x - p.x, G.player.y - p.y) < take) collect(p);
  }
}

// Fixed timestep: the simulation always advances in 1/60 s steps, whatever the display refresh rate
// (60/90/120 Hz) or frame drops, so collisions, timers and balance behave the same on every device and a
// seeded run is reproducible. Rendering happens once per display frame.
export const STEP = 1 / 60;
const MAX_STEPS = 4; // after a long stall, drop the backlog instead of fast-forwarding
const EPS = 1e-6; // rAF timestamps jitter slightly; treat a frame that is a hair short of a step as a full step
let acc = 0;

function tick(dt) {
  if (G.mode === 'play') {
    update(dt);
    effects(dt);
  } else if (G.mode === 'title' || G.mode === 'loading') {
    G.time += dt;
    G.scroll += dt * 35;
  } else if (G.mode === 'result') {
    effects(dt);
    G.shake = Math.max(0, G.shake - dt * 20);
    G.flash = Math.max(0, G.flash - dt);
  }
}

export function frame(now) {
  acc += Math.min(0.25, (now - G.last) / 1000 || STEP);
  G.last = now;
  let steps = 0;
  while (acc >= STEP - EPS && steps < MAX_STEPS) {
    tick(STEP);
    acc -= STEP;
    steps++;
  }
  if (steps === MAX_STEPS) acc = 0;
  draw();
  requestAnimationFrame(frame);
}
