import { enemyArt } from './enemy-art';
import { G } from '../core/context';
import { projectileArt, propArt, rockHitArt } from '../core/assets';
import { ctx, reduced } from '../core/dom';
import { borrowedSword, heroPose } from '../entities/player';
import { drawBossSeal } from './fx';
import { blade, drawVfxSprite } from './projectiles';
import { enemyFrameIndex } from './util';
import { movementTier, region } from '../systems/flow';
import { activeFrames, activeHeroId } from '../systems/formation';

export function drawActor(type, x, y, size, pose = 0, angle = 0, hit = 0, sx = 1, sy = 1) {
  const im = G.enemyFrames[type]?.[pose] || G.sprite[type];
  if (!im) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(sx, sy);
  ctx.shadowColor = '#081c27';
  ctx.shadowBlur = 3;
  ctx.drawImage(im, -size / 2, -size / 2, size, size);
  if (hit > 0) {
    ctx.globalAlpha *= Math.min(0.65, (hit / 0.055) ** 2 * 0.65);
    ctx.drawImage(G.enemyWhites[type]?.[pose] || G.whiteSprite[type], -size / 2, -size / 2, size, size);
  }
  ctx.restore();
}
export function drawEnemy(e) {
  if (e.rock) {
    drawRock(e);
    return;
  }
  const flying = G.state?.course === 'sky' && !e.boss;
  const pose = flying ? 0 : enemyFrameIndex(e),
    recoil = (e.recoil || 0) / 0.12,
    pulse = Math.sin(G.time * 4 + (e.phase || 0)),
    cast = (e.cast || 0) / 0.32;
  const angle = e.boss
    ? e.action === 'recover'
      ? pulse * 0.035
      : e.action === 'attack'
        ? Math.sin(G.time * 16) * 0.015
        : 0
    : Math.sin(G.time * 7 + e.phase) * 0.035;
  const bob = e.boss ? pulse * 2 : Math.abs(Math.sin(G.time * 10 + e.phase)) * 2;
  let sx = 1 - recoil * 0.045,
    sy = 1 + recoil * 0.035;
  if (e.boss && e.action === 'telegraph') {
    sx *= 1.015;
    sy *= 0.98;
  } else if (e.boss && e.action === 'attack') {
    sx *= 1 + cast * 0.035;
    sy *= 1 - cast * 0.025;
  }
  if (flying) {
    ctx.save();
    ctx.strokeStyle = '#a9d5eb';
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 2;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(e.x + side * 18, e.y + 18);
      ctx.quadraticCurveTo(e.x + side * 33, e.y - 5, e.x + side * 22, e.y - 55);
      ctx.stroke();
    }
    ctx.restore();
    const art = enemyArt(e),
      im = art.image;
    if (im) {
      ctx.save();
      ctx.translate(e.x, e.y + (reduced ? 0 : Math.sin(G.time * 3 + e.phase) * 2) - recoil * 4);
      ctx.rotate(reduced ? 0 : Math.sin(G.time * 2 + e.phase) * 0.018);
      ctx.scale(sx, sy);
      ctx.shadowColor = '#091c29';
      ctx.shadowBlur = 3;
      drawVfxSprite(im, 0, 0, e.size, e.size);
      if (e.hit > 0 && art.white)
        drawVfxSprite(art.white, 0, 0, e.size, e.size, 0, Math.min(0.6, (e.hit / 0.055) * 0.6));
      ctx.restore();
      return;
    }
  }
  drawActor(e.type, e.x, e.y + bob - recoil * 5, e.size, pose, angle, e.hit, sx, sy);
}
export function drawHeroSprite(pose, x, y, angle = 0, alpha = 1, ghost = false) {
  const im = activeFrames()[pose];
  if (!im) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (ghost) {
    ctx.globalCompositeOperation = 'screen';
    ctx.filter = 'sepia(1) hue-rotate(100deg)';
  }
  if (!ghost) {
    ctx.shadowColor = '#c6fff4';
    ctx.shadowBlur = 3;
  }
  // Fixed atlas cells keep feet and body scale stable; cloth motion is painted into each frame.
  ctx.drawImage(im, -57, -57, 114, 114);
  ctx.restore();
}
export function drawMartialPlayer() {
  if (G.player.hp <= 0) return;
  const tier = movementTier(),
    hop = tier === 1 ? Math.max(0, Math.sin(G.state.jumpPhase)) * 12 : 0,
    bob = tier === 0 ? Math.sin(G.state.runPhase * 2) * 1.5 : Math.sin(G.time * 5) * 2;
  ctx.save();
  ctx.fillStyle = tier === 2 ? '#14364133' : '#1a322951';
  ctx.beginPath();
  ctx.ellipse(G.player.x, G.player.y + 40, 22 - hop * 0.45, 7 - hop * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  for (const a of G.afterimages) drawHeroSprite(a.pose, a.x, a.y, a.angle, (a.life / a.total) * 0.32, true);
  ctx.save();
  if (G.player.inv > 0 && G.state.hyper <= 0) ctx.globalAlpha = 0.6 + Math.abs(Math.sin(G.time * 20)) * 0.4;
  if (tier === 1) {
    ctx.save();
    ctx.strokeStyle = '#e1fdd6';
    ctx.globalAlpha *= 0.36 * (1 - hop / 16);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(G.player.x, G.player.y + 39, 29, 9, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (tier === 2) {
    ctx.save();
    ctx.strokeStyle = '#c9fff1';
    ctx.globalAlpha *= 0.5;
    ctx.lineWidth = 2;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(G.player.x + side * 14, G.player.y + 20);
      ctx.quadraticCurveTo(
        G.player.x + side * 27,
        G.player.y + 60,
        G.player.x + side * 12 + Math.sin(G.time * 8) * 7,
        G.player.y + 95,
      );
      ctx.stroke();
    }
    ctx.restore();
  }
  if (G.state.hyper > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = '#ffdf8b';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ffe7a1';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.ellipse(G.player.x, G.player.y, 53, 72, Math.sin(G.time * 3) * 0.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  // The red sash arcs out on a lateral step and decays after acceleration.
  if (activeHeroId() === 'pungun' && G.player.step > 0) {
    const force = G.player.step / 0.19;
    ctx.strokeStyle = '#b64b3e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(G.player.x, G.player.y + 8);
    ctx.quadraticCurveTo(
      G.player.x - G.player.stepDir * 30 * force,
      G.player.y + 26,
      G.player.x - G.player.stepDir * 48 * force,
      G.player.y + 36,
    );
    ctx.stroke();
  }
  if (borrowedSword()) {
    ctx.save();
    ctx.shadowColor = '#bff8ea';
    ctx.shadowBlur = 14;
    drawVfxSprite(projectileArt[1], G.player.x, G.player.y + 46, 50, 156, Math.PI / 2 + G.player.tilt * 0.4, 1);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha *= 0.35;
    ctx.strokeStyle = '#c9fff1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(G.player.x - 50, G.player.y + 46);
    ctx.lineTo(G.player.x + 50, G.player.y + 46);
    ctx.stroke();
    ctx.restore();
  }
  drawHeroSprite(heroPose(), G.player.x, G.player.y + bob - hop, G.player.tilt * (tier === 2 ? 0.65 : 1.5));
  if (G.player.swing > 0 && (activeHeroId() !== 'pungun' || G.player.swing > 0.42)) {
    const t = 1 - G.player.swing;
    ctx.save();
    ctx.translate(G.player.x, G.player.y - hop - 20);
    ctx.rotate(activeHeroId() === 'pungun' ? -0.8 + t * 2.4 : -0.5 + t * 0.9);
    ctx.globalAlpha *= G.player.swing * 0.8;
    ctx.strokeStyle = '#f8ffe2';
    ctx.shadowColor = '#7cebd1';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, 43, 24, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    ctx.restore();
  }
  // Center marker keeps the hit area readable through airborne poses.
  ctx.fillStyle = '#fff7cc';
  ctx.beginPath();
  ctx.arc(G.player.x, G.player.y, 2.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
export function drawEnemyAura(e) {
  ctx.save();
  if (!e.boss) {
    ctx.fillStyle = '#16292d44';
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + e.size * 0.39, e.r * 0.7, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (movementTier() === 2 && !e.boss) {
    ctx.strokeStyle = '#b5ecde';
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + e.size * 0.39, e.r * 0.85, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (e.boss) {
    drawBossSeal(e);
  }
  if (e.boss) {
    ctx.strokeStyle = e.boss ? region().color : e.color;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 2;
    const radius = e.boss ? 82 : 43;
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + 8, radius, radius * 0.6, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (e.boss) {
      for (let i = 0; i < 5; i++) {
        const a = G.time * 0.35 + i * Math.PI * 0.4;
        blade(e.x + Math.cos(a) * radius, e.y + Math.sin(a) * radius * 0.6, a + Math.PI / 2, 29, region().color);
      }
    }
  }
  ctx.restore();
}
export function drawRock(e) {
  const index = e.baseX < 240 ? 0 : 1,
    size = (e.r + 6) * 2;
  drawVfxSprite(propArt[index], e.x, e.y, size, size, Math.sin(e.phase) * 0.06);
  if (e.hit > 0)
    drawVfxSprite(rockHitArt[index], e.x, e.y, size, size, Math.sin(e.phase) * 0.06, Math.min(0.7, e.hit / 0.055));
}
