import { G } from '../core/context';
import { tone } from '../core/audio';
import { H, W } from '../core/dom';
import { clamp, rnd } from '../core/math';
import { TUNE } from '../data/tune';
import { bossSpawn, createBoss, updateBoss } from '../entities/boss';
import { hitEnemy, kill, meteor, nearestEnemy, resolveRow, spawnRow, spear } from '../entities/enemies';
import { addPickup, collect } from '../entities/pickups';
import { damagePlayer, shoot, updateMartialMotion } from '../entities/player';
import { burst, effects, impact } from '../render/fx';
import { draw } from '../render/renderer';
import { openDono } from '../scenes/dono';
import { hasSkill, updateSkills } from './abilities';
import { graze, grazeEnemy } from './combat';
import { afterClear, difficulty, region, stageDuration } from './flow';
import { traitOn } from './formation';
import { syncHUD } from '../ui/hud';

export function updateFlight(dt) {
  G.state.stageTime += dt;
  G.state.rowTimer -= dt;
  G.state.meteorTimer -= dt;
  G.state.powerTimer -= dt;
  G.state.hyperCooldown -= dt;
  if (G.state.rowTimer <= 0) {
    spawnRow();
    G.state.rowTimer =
      Math.max(0.68, 1.27 - difficulty() * 0.08 - G.state.stageTime * 0.005) +
      (G.state.stage === 1 ? Math.max(0, TUNE.openingGap - G.state.stageTime * 0.02) : 0);
  }
  if (G.state.hyper <= 0 && G.state.meteorTimer <= 0) {
    meteor();
    G.state.meteorTimer = Math.max(3.7, 6 - difficulty() * 0.28);
  }
  const terrain = region().terrain;
  if ((terrain === 'bamboo' || terrain === 'gate') && G.state.hyper <= 0) {
    G.state.spearTimer -= dt;
    if (G.state.spearTimer <= 0) {
      spear();
      G.state.spearTimer = terrain === 'gate' ? rnd(1, 1.5) : rnd(0.5, 0.85);
    }
  }
  if (terrain === 'cloud' && G.state.rowTimer > 0.5) G.state.rowTimer -= dt * 0.25;
  if (G.state.powerTimer <= 0) {
    if (G.player.weapon < 3 && !G.pickups.some(p => p.kind === 'power')) addPickup('power', G.player.x, -20);
    G.state.powerTimer = 14;
  }
  if (
    G.state.hyperCooldown <= 0 &&
    G.state.hyper <= 0 &&
    G.state.stageTime < stageDuration() - 8 &&
    !G.pickups.some(p => p.kind === 'hyper')
  ) {
    addPickup('hyper', clamp(G.player.x + rnd(-100, 100), 45, W - 45), -20);
    G.state.hyperDrops++;
    G.state.hyperCooldown = rnd(70, 95);
  }
  if (G.state.stageTime >= stageDuration()) bossSpawn();
}
export function update(dt) {
  if (G.mode !== 'play') return;
  const realDt = dt;
  if (G.hitstop > 0) {
    G.hitstop -= dt;
    dt *= 0.12;
  }
  // 돈오: a short slow-motion beat after the quest is fulfilled, then the choice opens.
  if (G.state.donoDelay > 0) {
    G.state.donoDelay -= realDt;
    dt *= 0.25;
    if (G.state.donoDelay <= 0) {
      openDono();
      return;
    }
  }
  G.time += dt;
  G.state.elapsed += dt;
  G.state.distance += dt * (G.state.hyper > 0 ? 420 : 85 + Math.min(difficulty() * 12, 65));
  G.state.score += dt * 8;
  G.scroll +=
    dt * (G.state.hyper > 0 ? 1150 : G.state.phase === 'clear' ? 500 : 185 + Math.min(difficulty() * 24, 120));
  G.state.hyper = Math.max(0, G.state.hyper - dt);
  G.player.inv = Math.max(0, G.player.inv - dt);
  G.player.muzzle = Math.max(0, G.player.muzzle - dt);
  G.shake = Math.max(0, G.shake - realDt * 22);
  G.flash = Math.max(0, G.flash - realDt * 1.8);
  G.state.comboTimer -= dt;
  if (G.state.comboTimer <= 0) G.state.combo = 0;
  if (G.keys.has('ArrowLeft') || G.keys.has('a')) G.player.target -= dt * 510;
  if (G.keys.has('ArrowRight') || G.keys.has('d')) G.player.target += dt * 510;
  G.player.target = clamp(G.player.target, 24, W - 24);
  if (G.state.course === 'sky') {
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
    G.player.fire += 0.148 / (traitOn('hongryeon') ? TUNE.traitFire : 1);
  } else if (G.player.fire < 0) G.player.fire = 0;
  updateMartialMotion(dt, old);

  if (G.state.phase === 'flight') updateFlight(dt);
  else if (G.state.phase === 'warning') {
    G.state.phaseTimer -= dt;
    if (G.state.phaseTimer <= 0) createBoss();
  } else if (G.state.phase === 'clear') {
    G.state.phaseTimer -= dt;
    if (G.state.phaseTimer <= 0 && G.state.donoDelay <= 0) {
      afterClear();
      return;
    }
  }
  updateSkills(dt, old);
  if (G.mode !== 'play') return;
  for (const s of G.shots) {
    s.prevY = s.y;
    if (s.homing) {
      const t = nearestEnemy(s.x, s.y);
      if (t) s.vx += clamp((t.x - s.x) * 7 - s.vx, -1400, 1400) * dt;
    }
    s.y -= dt * (s.vy ?? 900);
    s.x += s.vx * dt;
    for (const e of G.enemies) {
      if (e.dead || (e.boss && ['enter', 'return'].includes(e.action)) || s.hits?.has(e)) continue;
      const r = (e.boss ? 58 : e.r) + (s.w || 0);
      if (Math.abs(s.x - e.x) < r && s.prevY >= e.y - r && s.y <= e.y + r) {
        hitEnemy(e, s.damage);
        if (s.pierce) {
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
  for (const e of G.enemies) {
    if (e.dead) continue;
    e.hit = Math.max(0, e.hit - dt);
    e.recoil = Math.max(0, (e.recoil || 0) - dt);
    if (e.boss) {
      updateBoss(e, dt);
      if (G.mode !== 'play') return;
      continue;
    }
    e.y += dt * (G.state.hyper > 0 ? 670 : 190 + Math.min(difficulty() * 22 + G.state.stageTime, 130));
    if (G.state.stage >= 3) e.x = e.baseX + Math.sin(G.state.stageTime * 1.1 + e.row) * 10;
    if (G.state.hyper > 0 && e.y > G.player.y - 220) {
      kill(e, true);
      continue;
    }
    if (
      !e.grazed &&
      G.player.hp > 0 &&
      Math.abs(e.y - G.player.y) < e.r + 12 &&
      Math.abs(e.x - G.player.x) >= e.r + 10 &&
      Math.abs(e.x - G.player.x) <
        e.r +
          10 +
          TUNE.grazeRadius * (hasSkill('biyeon') ? 1.6 : 1) * (traitOn('mukyoung') ? TUNE.traitGraze : 1) * 1.15
    ) {
      const mate = G.enemies.find(
        o =>
          o !== e &&
          !o.dead &&
          o.row === e.row &&
          !o.grazed &&
          Math.sign(o.x - G.player.x) !== Math.sign(e.x - G.player.x) &&
          Math.abs(o.x - G.player.x) <
            o.r +
              10 +
              TUNE.grazeRadius * (hasSkill('biyeon') ? 1.6 : 1) * (traitOn('mukyoung') ? TUNE.traitGraze : 1) * 1.15,
      );
      if (mate) {
        e.grazed = mate.grazed = true;
        grazeEnemy(e);
        if (G.mode !== 'play') return;
      }
    }
    if (Math.abs(e.x - G.player.x) < e.r + 10 && Math.abs(e.y - G.player.y) < e.r + 12) {
      damagePlayer();
      if (G.mode !== 'play') return;
      e.dead = true;
      resolveRow(e, true);
    } else if (e.y > H + 60) {
      e.dead = true;
      resolveRow(e, true);
    }
  }
  const grazeR = TUNE.grazeRadius * (hasSkill('biyeon') ? 1.6 : 1) * (traitOn('mukyoung') ? TUNE.traitGraze : 1);
  for (const h of G.hazards) {
    if (h.warn > 0) {
      h.warn -= dt;
      continue;
    }
    h.y += h.vy * dt;
    h.x += (h.vx || 0) * dt;
    const d = Math.hypot(h.x - G.player.x, h.y - G.player.y);
    if (!h.grazed && !h.dead && d >= h.r + 10 && d < h.r + 10 + grazeR && G.player.hp > 0) {
      graze(h);
      if (G.mode !== 'play') return;
    }
    if (!h.dead && d < h.r + 10) {
      damagePlayer();
      if (G.mode !== 'play') return;
      h.dead = true;
      impact(h.x, h.y, '#ffbc7a', 40);
      burst(h.x, h.y, '#ffbc7a', 15, 180);
    }
  }
  for (const p of G.pickups) {
    p.life -= dt;
    const dx = G.player.x - p.x,
      dy = G.player.y - p.y,
      dist = Math.hypot(dx, dy),
      attract = p.kind === 'coin' ? dist < 150 || G.state.hyper > 0 : dist < 65;
    if (attract) {
      const v = p.kind === 'coin' ? 600 : 260;
      p.x += (dx / Math.max(1, dist)) * Math.min(v * dt, dist);
      p.y += (dy / Math.max(1, dist)) * Math.min(v * dt, dist);
    } else {
      p.y += dt * (p.kind === 'coin' ? 175 : 150);
      p.x += p.vx * dt;
      p.vx *= Math.exp(-dt * 4);
    }
    if (dist < (p.kind === 'coin' ? 25 : 35) || Math.hypot(G.player.x - p.x, G.player.y - p.y) < 23) collect(p);
  }
  G.shots = G.shots.filter(s => !s.dead && s.y > -40 && s.x > -20 && s.x < W + 20);
  G.enemies = G.enemies.filter(e => !e.dead);
  G.hazards = G.hazards.filter(h => !h.dead && h.y < H + 80 && h.x > -90 && h.x < W + 90);
  G.pickups = G.pickups.filter(p => !p.dead && p.y < H + 30 && p.life > 0);
  G.hudClock -= realDt;
  if (G.hudClock <= 0) {
    syncHUD();
    G.hudClock = 0.08;
  }
}
export function frame(now) {
  const dt = Math.min(0.034, (now - G.last) / 1000 || 0.016);
  G.last = now;
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
  draw();
  requestAnimationFrame(frame);
}
