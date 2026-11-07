import { G } from '../core/context';
import { projectileArt } from '../core/assets';
import { $, H, W, ctx, reduced } from '../core/dom';
import { clamp, fxRnd } from '../core/math';
import { fxRandom } from '../core/rng';
import { drawActor } from './actors';
import { drawVfxSprite } from './projectiles';
import { hasSkill } from '../systems/abilities';
import { region } from '../systems/flow';

export function burst(x, y, color, n = 12, force = 150) {
  for (let i = 0; i < n; i++) {
    const a = fxRnd(0, Math.PI * 2),
      s = fxRnd(force * 0.2, force);
    G.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: fxRnd(0.2, 0.55),
      max: 0.55,
      r: fxRnd(1.5, 4),
      color,
    });
  }
}
export function ring(x, y, color, r = 10, max = 70, life = 0.35) {
  G.rings.push({ x, y, color, r, max, life, total: life });
}
export function label(text, x, y, color = '#ffe7a0', size = 18) {
  G.labels.push({ text, x, y, color, size, life: 0.9, total: 0.9 });
}
export function impact(x, y, color, size = 40) {
  G.impacts.push({ x, y, color, size, life: 0.28, total: 0.28 });
}
export function effects(dt) {
  updatePaintedFX(dt);
  for (const a of G.afterimages) a.life -= dt;
  G.afterimages = G.afterimages.filter(a => a.life > 0);
  for (const f of G.footprints) {
    f.life -= dt;
    f.y += dt * 185;
  }
  G.footprints = G.footprints.filter(f => f.life > 0);
  for (const w of G.wrecks) {
    w.life -= dt;
    w.y += dt * 90;
    w.angle += dt * w.spin;
    if (w.boss && fxRandom() < dt * 16) {
      impact(w.x + fxRnd(-70, 70), w.y + fxRnd(-70, 70), region().color, 70);
      burst(w.x + fxRnd(-55, 55), w.y + fxRnd(-55, 55), region().color, 9, 180);
    }
  }
  G.wrecks = G.wrecks.filter(w => w.life > 0);
  for (const f of G.impacts) f.life -= dt;
  G.impacts = G.impacts.filter(f => f.life > 0);
  if (G.banner) {
    G.banner.life -= dt;
    if (G.banner.life <= 0) G.banner = null;
  }
  for (const p of G.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.exp(-dt * 3);
    p.vy += dt * 55;
  }
  G.particles = G.particles.filter(p => p.life > 0);
  if (G.particles.length > 650) G.particles.splice(0, G.particles.length - 650);
  for (const r of G.rings) r.life -= dt;
  G.rings = G.rings.filter(r => r.life > 0);
  for (const l of G.labels) {
    l.life -= dt;
    l.y -= dt * 32;
  }
  G.labels = G.labels.filter(l => l.life > 0);
  if (G.toastTimer > 0) {
    G.toastTimer -= dt;
    if (G.toastTimer <= 0) $('toast').classList.remove('show');
  }
}
export function drawExtraFX() {
  for (const w of G.wrecks) {
    const t = w.life / w.total;
    ctx.save();
    ctx.globalAlpha = t * 0.65;
    drawActor(w.type, w.x, w.y, w.size * (0.65 + t * 0.35), w.pose || 0, w.angle, 0);
    ctx.restore();
  }
  for (const f of G.impacts) {
    const p = 1 - f.life / f.total,
      r = f.size * (0.3 + p * 0.9);
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.globalAlpha = (1 - p) ** 2;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = f.color;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8,
        rr = i % 2 ? r * 0.18 : r;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff9df';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.26 * (1 - p), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
export function paintFX(row, x, y, size, life = 0.35, angle = 0, delay = 0, alpha = 1) {
  if (G.paintedFX.length >= 80) G.paintedFX.shift();
  G.paintedFX.push({ row, x, y, size, life, total: life, angle, delay, alpha });
}
export function updatePaintedFX(dt) {
  for (const f of G.paintedFX) {
    if (f.delay > 0) f.delay -= dt;
    else f.life -= dt;
  }
  G.paintedFX = G.paintedFX.filter(f => f.life > 0);
  for (const f of G.bossTrails) f.life -= dt;
  G.bossTrails = G.bossTrails.filter(f => f.life > 0).slice(-6);
  if (G.bossIntro) {
    G.bossIntro.life -= dt;
    if (G.bossIntro.life <= 0) G.bossIntro = null;
  }
  if (G.finisher) {
    G.finisher.life -= dt;
    if (G.finisher.life <= 0) G.finisher = null;
  }
}
export function drawPaintedFX() {
  for (const f of G.paintedFX) {
    if (f.delay > 0) continue;
    const age = 1 - f.life / f.total,
      index = Math.min(3, Math.floor(age * 4)),
      im = G.fxFrames[f.row]?.[index];
    if (!im) continue;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.angle);
    ctx.globalAlpha = f.alpha * (age > 0.7 ? (1 - age) / 0.3 : 1) * (reduced ? 0.55 : 1);
    const size = f.size * (0.8 + age * 0.3);
    ctx.drawImage(im, -size / 2, -size / 2, size, size);
    ctx.restore();
  }
}
export function drawBossTrails() {
  for (const f of G.bossTrails) {
    ctx.save();
    ctx.globalAlpha = (f.life / f.total) * 0.26;
    drawActor(f.type, f.x, f.y, f.size, f.pose);
    ctx.restore();
  }
}
export function drawBossSeal(e) {
  ctx.save();
  ctx.translate(e.x, e.y + 12);
  ctx.rotate(G.time * (e.enraged ? -0.55 : 0.2));
  ctx.strokeStyle = e.enraged ? '#ff785f' : region().color;
  ctx.globalAlpha = e.action === 'telegraph' ? 0.48 : 0.24;
  ctx.lineWidth = 2;
  const r = e.action === 'telegraph' ? 100 + Math.sin(G.time * 10) * 4 : 98;
  for (const radius of [r, r - 12]) {
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(r - 22, -7);
    ctx.lineTo(r - 8, 0);
    ctx.lineTo(r - 22, 7);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
export function drawBossIntro() {
  if (!G.bossIntro) return;
  const b = G.bossIntro,
    age = b.total - b.life,
    fade = Math.min(1, age * 5, b.life * 4),
    arrive = 1 - (1 - clamp(age / 0.35, 0, 1)) ** 3;
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.fillStyle = '#051711b8';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate((1 - arrive) * 120, 0);
  ctx.fillStyle = '#102822ed';
  ctx.beginPath();
  ctx.moveTo(0, 235);
  ctx.lineTo(W, 190);
  ctx.lineTo(W, 440);
  ctx.lineTo(0, 485);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = b.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 235);
  ctx.lineTo(W, 190);
  ctx.moveTo(0, 485);
  ctx.lineTo(W, 440);
  ctx.stroke();
  ctx.globalAlpha = fade * 0.9;
  drawActor(b.type, 355, 332, 250, 1);
  ctx.globalAlpha = fade;
  ctx.fillStyle = '#071d17b5';
  ctx.fillRect(15, 273, 240, 123);
  ctx.textAlign = 'left';
  ctx.fillStyle = b.color;
  ctx.font = 'bold 12px Arial';
  ctx.fillText('강적 출현', 30, 300);
  ctx.font = '900 32px Batang,serif';
  ctx.fillStyle = '#fff0c9';
  ctx.fillText(b.name, 30, 346);
  ctx.font = '12px Arial';
  ctx.fillStyle = '#d4dbcb';
  ctx.fillText('기세를 읽고, 빈틈을 베어라', 30, 378);
  ctx.restore();
  ctx.restore();
}
export function drawFinisher() {
  if (!G.finisher || reduced) return;
  const f = G.finisher,
    age = f.total - f.life;
  ctx.save();
  // Short diagonal finishing cut, followed by an expanding seal; never a long whiteout.
  if (age < 0.3) {
    ctx.globalAlpha = (1 - age / 0.3) * 0.8;
    ctx.strokeStyle = '#fff7d6';
    ctx.shadowColor = '#ffce84';
    ctx.shadowBlur = 18;
    ctx.lineWidth = 3 + 10 * (1 - age / 0.3);
    ctx.beginPath();
    ctx.moveTo(f.x - 320, f.y + 175);
    ctx.lineTo(f.x + 320, f.y - 175);
    ctx.stroke();
  }
  const r = 40 + age * 235;
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffdf9a';
  ctx.globalAlpha = (0.5 * f.life) / f.total;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
export function drawSkillFX() {
  // Damage is still resolved instantly along the full column; the slim trail marks its reach.
  for (const s of G.strikes) {
    const t = s.life / s.total;
    ctx.save();
    ctx.strokeStyle = s.color;
    ctx.globalAlpha = t * 0.24;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s.x, 0);
    ctx.lineTo(s.x, H);
    ctx.stroke();
    ctx.restore();
    for (let i = 0; i < 4; i++) {
      const y = ((1 - t) * H * 1.6 + i * 205) % H;
      drawVfxSprite(projectileArt[1], s.x, y, 64, 110, Math.PI, t);
    }
  }
  if (hasSkill('hoeseon'))
    for (let i = 0; i < G.state.orbs; i++) {
      const a = G.state.orbAngle + (i * Math.PI * 2) / G.state.orbs;
      drawVfxSprite(
        projectileArt[1],
        G.player.x + Math.cos(a) * 58,
        G.player.y - 10 + Math.sin(a) * 58,
        40,
        40,
        a + Math.PI,
      );
    }
  if (G.player.shield > 0)
    drawVfxSprite(G.fxFrames[5]?.[0], G.player.x, G.player.y, 104, 104, 0, 0.6 + Math.sin(G.time * 6) * 0.1);
  if (G.state.negate) drawVfxSprite(G.fxFrames[7]?.[0], G.player.x, G.player.y + 32, 40, 40, 0, 0.65);
}
