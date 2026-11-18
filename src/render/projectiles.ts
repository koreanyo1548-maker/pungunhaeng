import { drawHeroShot } from './hero-shots';
import { drawSkillShot } from '../render/skill-animation';
import { G } from '../core/context';
import { projectileArt, propArt, combatProjectileArt } from '../core/assets';
import { ctx, reduced } from '../core/dom';
import { region } from '../systems/flow';

export function blade(x, y, angle, length, color) {
  drawVfxSprite(projectileArt[6], x, y, length, length, angle);
}
export function drawMartialShots() {
  for (const s of G.shots) {
    if (s.basic && s.hero && s.weaponStage) {
      drawHeroShot(s.hero, s.weaponStage, s.x, s.y, Math.atan2(s.vx, s.vy ?? 900), G.time - s.phase);
      continue;
    }
    if (drawSkillShot(s)) continue;
    // Positive vx rotates upward-facing art clockwise.
    const rot = Math.atan2(s.vx, s.vy ?? 900),
      idx = { qi: 0, sword: 1, knife: 2, gang: 3, orb: 4 }[s.kind] ?? 1;
    const size =
      s.kind === 'gang'
        ? Math.max(70, (s.w || 8) * 5)
        : s.kind === 'sword'
          ? 48
          : s.kind === 'knife'
            ? 34
            : s.kind === 'orb'
              ? 32
              : 36;
    const im =
      s.art === 'mancheon' ? combatProjectileArt[5] : s.art === 'dobeop' ? projectileArt[3] : projectileArt[idx];
    if (s.art === 'mancheon' && !reduced)
      drawVfxSprite(im, s.x - s.vx * 0.024, s.y + (s.vy ?? 900) * 0.024, 28, 42, rot, 0.25);
    if (s.kind === 'orb' && !reduced)
      drawVfxSprite(
        projectileArt[idx],
        s.x - s.vx * 0.018,
        s.y + (s.vy ?? 900) * 0.018,
        size * 0.75,
        size * 0.75,
        rot,
        0.22,
      );
    drawVfxSprite(im, s.x, s.y, s.art === 'mancheon' ? 36 : size, s.art === 'mancheon' ? 48 : size, rot);
  }
}
export function drawMartialHazard(h) {
  if (h.dead) return;
  const r = Math.max(5, h.r);
  const angle = Math.atan2(h.vy || 1, h.vx || 0) - Math.PI / 2;
  // Art follows velocity; collision remains centered at h.x/h.y with the original h.r.
  ctx.save();
  ctx.shadowColor = '#ff503b';
  ctx.shadowBlur = 3;
  if (h.kind === 'spear') {
    if (h.skin === 'wind') drawVfxSprite(projectileArt[7], h.x, h.y, 42, 62, angle + Math.PI);
    else {
      ctx.translate(h.x, h.y);
      ctx.rotate(angle);
      // Broad bamboo shaft behind the collision centre, with its bevel centred on the danger point.
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#332719';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.fillStyle = '#bdc56b';
      ctx.beginPath();
      ctx.moveTo(-8, -48);
      ctx.lineTo(8, -48);
      ctx.lineTo(9, -6);
      ctx.lineTo(0, 11);
      ctx.lineTo(-9, -6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#60763c';
      ctx.fillRect(-6, -46, 5, 38);
      for (const y of [-36, -20]) {
        ctx.fillStyle = '#424a27';
        ctx.fillRect(-9, y, 18, 5);
        ctx.fillStyle = '#f1d78e';
        ctx.fillRect(-9, y, 18, 2);
      }
      ctx.fillStyle = '#fff1c4';
      ctx.beginPath();
      ctx.moveTo(-8, -7);
      ctx.lineTo(7, -12);
      ctx.lineTo(0, 9);
      ctx.closePath();
      ctx.fill();
    }
  } else if (h.kind === 'meteor') {
    drawVfxSprite(combatProjectileArt[4], h.x, h.y, r * 2.7, r * 2.7, angle);
  } else {
    const index = h.foe ? 5 : ({ 3: 0, 6: 1, 7: 2, 8: 3 }[region().type] ?? 2);
    const im = h.foe ? projectileArt[index] : combatProjectileArt[index];
    drawVfxSprite(im, h.x, h.y, r * 2.8, r * 2.8, angle + Math.PI);
  }
  ctx.restore();
}

export function drawPickup(p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  const coin = p.kind === 'coin';
  ctx.strokeStyle = coin ? '#ffdf80' : '#c9c0ff';
  ctx.fillStyle = coin ? '#37280be0' : '#201e48dc';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, coin ? 10 : 25, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (!coin) {
    const light = ctx.createLinearGradient(0, -75, 0, 0);
    light.addColorStop(0, '#b3a1ff00');
    light.addColorStop(1, '#b3a1ff55');
    ctx.fillStyle = light;
    ctx.fillRect(-12, -75, 24, 65);
  }
  if (p.kind === 'coin') {
    ctx.scale(Math.max(0.22, Math.abs(Math.cos(G.time * 6 + p.phase))), 1);
    drawVfxSprite(propArt[3], 0, 0, 18, 18);
  } else {
    ctx.rotate(Math.sin(G.time * 3 + p.phase) * 0.08);
    const idx = p.kind === 'power' ? 4 : 5;
    drawVfxSprite(propArt[idx], 0, 0, 44, 44);
  }
  ctx.restore();
}
export function drawVfxSprite(im, x, y, w, h = w, angle = 0, alpha = 1) {
  if (!im) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha *= alpha;
  ctx.drawImage(im, -w / 2, -h / 2, w, h);
  ctx.restore();
}
