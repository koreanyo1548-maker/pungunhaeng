import { G } from '../core/context';
import { projectileArt, propArt } from '../core/assets';
import { ctx, reduced } from '../core/dom';
import { BR } from '../data/branches';

export function blade(x, y, angle, length, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -length * 0.65);
  ctx.lineTo(5, -length * 0.28);
  ctx.lineTo(3, length * 0.35);
  ctx.lineTo(-3, length * 0.35);
  ctx.lineTo(-5, -length * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#f7ffe5';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -length * 0.56);
  ctx.lineTo(0, length * 0.2);
  ctx.stroke();
  ctx.fillStyle = '#d1a45c';
  ctx.fillRect(-7, length * 0.25, 14, 3);
  ctx.fillRect(-2, length * 0.28, 4, 7);
  ctx.restore();
}
export function drawMartialShots() {
  for (const s of G.shots) {
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
    drawVfxSprite(projectileArt[idx], s.x, s.y, size, size, rot);
  }
}
export function drawMartialHazard(h) {
  if (h.dead) return;
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.rotate(Math.atan2(h.vy || 1, h.vx || 0) - Math.PI / 2);
  const r = Math.max(5, h.r);
  ctx.strokeStyle = '#39151f';
  ctx.fillStyle = '#ff684e';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  if (h.kind === 'spear' || h.kind === 'meteor') {
    ctx.moveTo(0, r + 5);
    ctx.lineTo(-r * 0.7, -r);
    ctx.lineTo(0, -r * 2.8);
    ctx.lineTo(r * 0.7, -r);
  } else {
    ctx.arc(0, 0, r, 0, Math.PI * 2);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff0c9';
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(2, r * 0.35), 0, Math.PI * 2);
  ctx.fill();
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
