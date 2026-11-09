import { drawSkillAnimations } from '../render/skill-animation';
import { G } from '../core/context';
import { H, W, ctx, reduced } from '../core/dom';
import { clamp, fxRnd } from '../core/math';
import { drawEnemy, drawEnemyAura, drawMartialPlayer } from './actors';
import { drawBanner, drawBossWarnings } from './boss-ui';
import { drawBossIntro, drawBossTrails, drawExtraFX, drawFinisher, drawPaintedFX, drawSkillFX } from './fx';
import { drawMartialHazard, drawMartialShots, drawPickup } from './projectiles';
import { drawQuestCue } from './quest-cues';
import { roundRect } from './util';
import { background, drawFootprints } from './world';

export function draw() {
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  if (G.shake > 0 && !reduced) ctx.translate(fxRnd(-G.shake, G.shake), fxRnd(-G.shake, G.shake));
  background();
  if (!G.state || G.mode === 'title' || G.mode === 'loading') {
    ctx.restore();
    return;
  }
  drawFootprints();
  drawBossTrails();

  for (const e of G.enemies) {
    if (e.dead) continue;
    drawEnemyAura(e);
    drawEnemy(e);
    if (!e.boss && e.hp < e.maxHp) {
      ctx.fillStyle = '#061727aa';
      roundRect(e.x - 21, e.y + 34, 42, 4, 2);
      ctx.fill();
      ctx.fillStyle = e.color;
      roundRect(e.x - 21, e.y + 34, 42 * Math.max(0, e.hp / e.maxHp), 4, 2);
      ctx.fill();
    }
  }
  drawExtraFX();
  drawPaintedFX();
  drawMartialShots();
  drawSkillFX();
  for (const h of G.hazards) {
    if (h.warn > 0 && h.kind === 'spear') {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = '#c8f5b0';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 9]);
      ctx.beginPath();
      ctx.moveTo(h.x, 0);
      ctx.lineTo(h.x, H);
      ctx.stroke();
      ctx.restore();
      continue;
    }
    if (h.warn > 0) {
      const alpha = 0.25 + Math.sin(h.warn * 24) * 0.12;
      ctx.fillStyle = `rgba(255,115,70,${alpha})`;
      ctx.fillRect(h.x - h.r, -10, h.r * 2, H + 20);
      ctx.strokeStyle = '#ffb57c';
      ctx.setLineDash([8, 10]);
      ctx.beginPath();
      ctx.moveTo(h.x, 0);
      ctx.lineTo(h.x, H);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffe5ae';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('!', h.x, 190);
      continue;
    }
  }

  for (const p of G.pickups) drawPickup(p);
  drawBossWarnings();
  drawQuestCue();
  drawMartialPlayer();
  drawSkillAnimations();
  for (const p of G.particles) {
    ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
    ctx.fillStyle = p.color;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.atan2(p.vy, p.vx));
    ctx.fillRect(-p.r, -p.r / 2, p.r * 2.5, p.r);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  for (const r of G.rings) {
    ctx.strokeStyle = r.color;
    ctx.globalAlpha = r.life / r.total;
    ctx.lineWidth = (3 * r.life) / r.total;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r + (r.max - r.r) * (1 - r.life / r.total), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (const h of G.hazards) if (h.warn <= 0) drawMartialHazard(h);
  for (const l of G.labels) {
    if (l.delay > 0) continue;
    ctx.globalAlpha = Math.min(1, l.life * 3);
    ctx.fillStyle = l.color;
    ctx.textAlign = 'center';
    ctx.font = `bold ${l.size}px Arial`;
    ctx.shadowColor = '#002531';
    ctx.shadowBlur = 6;
    ctx.fillText(l.text, l.x, l.y);
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;
  drawFinisher();
  drawBossIntro();
  drawBanner();
  if (G.flash > 0) {
    ctx.fillStyle = `rgba(${G.player.hp > 0 ? '215,255,239' : '255,140,100'},${Math.min(0.45, G.flash)})`;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}
