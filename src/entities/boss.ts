import { G } from '../core/context';
import { boom, tone } from '../core/audio';
import { BOSS_Y, W, reduced } from '../core/dom';
import { clamp } from '../core/math';
import { TUNE } from '../data/tune';
import { damagePlayer } from './player';
import { label, paintFX, ring } from '../render/fx';
import { difficulty, region } from '../systems/flow';

/** warning phase: clear the field and show the boss intro (entered via setPhase('warning')) */
export function bossSpawn() {
  G.state.phaseTimer = 2;
  G.state.hyper = 0;
  G.enemies = [];
  G.hazards = [];
  G.pickups = [];
  G.shots = [];
  G.rows.clear();
  G.banner = null;
  G.bossIntro = { type: region().type, life: 2, total: 2, name: region().boss, color: region().color };
  ring(240, 300, region().color, 10, 300, 1.1);
  tone(130, 0.5, 'sawtooth', 0.1, 80);
}
/** boss phase: spawn the gate boss (entered via setPhase('boss')) */
export function createBoss() {
  const hp = 580 * (1 + 0.36 * difficulty()) * (region().final ? TUNE.bossHpFinal : 1);
  G.player.weapon = 3;
  G.enemies.push({
    x: 240,
    y: -140,
    hp,
    maxHp: hp,
    type: region().type,
    size: 244,
    r: 62,
    phase: 0,
    hit: 0,
    boss: true,
    dead: false,
    action: 'enter',
    timer: 1.6,
    cast: 0,
    recoil: 0,
    enraged: false,
    trailClock: 0,
    pattern: 'fan',
    cycle: 0,
    attackTimer: 0,
    volley: 0,
  });
}
export function telegraphBoss(e) {
  e.pattern = region().patterns[e.cycle % 3];
  e.cycle++;
  e.action = 'telegraph';
  e.timer = e.pattern === 'fan' ? 1.15 : 1.4;
  e.targetX = clamp(G.player.x, 64, W - 64);
  e.targetY = G.player.y;
  e.attackTimer = 0;
  e.volley = 0;
  paintFX(6, e.x, e.y + 15, 140, 0.55, 0, 0, 0.5);
  // The safe lane/target locks when the warning starts, never tracks during the attack.
  if (e.pattern === 'lanes') e.safeLane = clamp(Math.round((G.player.x - 48) / 96) + (e.cycle % 2 ? 1 : -1), 0, 4);
  tone(240, 0.17, 'triangle', 0.1, 390);
}
export function bossAttack(e) {
  const speed = 200 + Math.min(80, difficulty() * 16),
    originY = e.y + 60;
  if (e.pattern === 'fan') {
    const aim = Math.atan2(e.targetY - originY, e.targetX - e.x),
      count = e.hp < e.maxHp * 0.45 ? 7 : 5;
    for (let i = 0; i < count; i++) {
      const a = aim + (i - (count - 1) / 2) * 0.23;
      G.hazards.push({
        kind: 'bullet',
        x: e.x,
        y: originY,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        r: 8,
        warn: 0,
        color: region().color,
      });
    }
  } else if (e.pattern === 'lanes') {
    for (let lane = 0; lane < 5; lane++) {
      if (lane === e.safeLane) continue;
      for (const offset of [-22, 0, 22])
        G.hazards.push({
          kind: 'bullet',
          x: 48 + lane * 96 + offset,
          y: originY,
          vx: 0,
          vy: speed + 75,
          r: 10,
          warn: 0,
          color: region().color,
        });
    }
  }
  e.cast = 0.32;
  paintFX(1, e.x, e.y + 55, 135, 0.32, Math.PI / 2, 0, 0.75);
  e.volley++;
  tone(210, 0.12, 'triangle', 0.1, 100);
  ring(e.x, originY, region().color, 5, 38, 0.2);
}
export function updateBoss(e, dt) {
  e.timer -= dt;
  e.cast = Math.max(0, (e.cast || 0) - dt);
  e.trailClock = (e.trailClock || 0) - dt;
  if (e.action === 'enter') {
    e.y += (BOSS_Y - e.y) * (1 - Math.exp(-dt * 3));
    if (e.timer <= 0) {
      e.y = BOSS_Y;
      telegraphBoss(e);
    }
  } else if (e.action === 'telegraph') {
    if (e.pattern === 'dive') e.x += (e.targetX - e.x) * (1 - Math.exp(-dt * 6));
    if (e.timer <= 0) {
      e.action = 'attack';
      e.timer = e.pattern === 'dive' ? 0.82 : e.pattern === 'fan' ? 1.2 : 1.5;
      e.attackTimer = 0;
      if (e.pattern === 'dive') {
        e.cast = 0.4;
        paintFX(1, e.x, e.y, 180, 0.4, 1.5);
        boom();
        ring(e.x, e.y, region().color, 20, 90, 0.4);
      }
    }
  } else if (e.action === 'attack') {
    if (e.pattern === 'dive') {
      if (e.trailClock <= 0 && !reduced) {
        e.trailClock = 0.07;
        G.bossTrails.push({ type: e.type, x: e.x, y: e.y, size: e.size, pose: 2, life: 0.28, total: 0.28 });
      }
      e.y += dt * 920;
      if (Math.abs(G.player.x - e.x) < e.r + 10 && Math.abs(G.player.y - e.y) < e.r + 12) damagePlayer();
    } else {
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) {
        bossAttack(e);
        e.attackTimer = e.pattern === 'fan' ? 0.4 : 0.5;
      }
    }
    if (e.timer <= 0) {
      if (e.pattern === 'dive') {
        e.action = 'return';
        e.timer = 1.1;
        e.y = -140;
        e.x = 240;
        G.hazards = [];
      } else {
        e.action = 'recover';
        e.timer = 2.2;
        label('빈틈!', e.x, e.y + 95, '#bdffe8', 21);
      }
    }
  } else if (e.action === 'return') {
    e.y += (BOSS_Y - e.y) * (1 - Math.exp(-dt * 4));
    if (e.timer <= 0) {
      e.y = BOSS_Y;
      e.action = 'recover';
      e.timer = 2.5;
      label('빈틈!', e.x, e.y + 95, '#bdffe8', 21);
    }
  } else if (e.action === 'recover') {
    e.x += (240 - e.x) * (1 - Math.exp(-dt * 1.8));
    if (e.timer <= 0) telegraphBoss(e);
  }
}
