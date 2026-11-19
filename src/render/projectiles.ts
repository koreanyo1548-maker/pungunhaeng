import { drawSkillShot } from '../render/skill-animation';
import { G } from '../core/context';
import { projectileArt, propArt, combatProjectileArt } from '../core/assets';
import { ctx, reduced } from '../core/dom';
import { region } from '../systems/flow';
import { drawGlow } from './glows';
import { drawGem } from './placeholder-art';

export function blade(x, y, angle, length, color) {
  drawVfxSprite(projectileArt[6], x, y, length, length, angle);
}
export function drawMartialShots() {
  for (const s of G.shots) {
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
/** 죽창 and 운석 are drawn larger than their hit (render only; the hit radius stays `r`) */
const SPEAR_ART = 1.25,
  METEOR_ART = 1.25;
export function drawMartialHazard(h) {
  if (h.dead) return;
  const r = Math.max(5, h.r);
  const angle = Math.atan2(h.vy || 1, h.vx || 0) - Math.PI / 2;
  // Art follows velocity; collision remains centered at h.x/h.y with the original h.r.
  ctx.save();
  ctx.shadowColor = '#ff503b';
  ctx.shadowBlur = 3;
  const heading = angle + Math.PI / 2;
  if (h.kind === 'spear') {
    if (h.skin === 'wind') drawVfxSprite(projectileArt[7], h.x, h.y, r * 3.5, r * 5, angle + Math.PI);
    else {
      // drawn 1.25x (the hit stays r); a jade laser trail behind it, its head just inside the tip (render/glows.ts)
      const length = r * 6 * SPEAR_ART;
      drawGlow(
        'spear',
        h.x + Math.cos(heading) * (length / 2 - 11),
        h.y + Math.sin(heading) * (length / 2 - 11),
        1.86,
        heading,
        h.x * 0.013,
      );
      drawVfxSprite(propArt[2], h.x, h.y, r * 2.2 * SPEAR_ART, length, angle);
    }
  } else if (h.kind === 'meteor') {
    // drawn 1.25x (the hit stays r) with a fire tail behind it
    drawGlow('meteor', h.x, h.y, 1.57, heading, h.x * 0.017);
    drawVfxSprite(combatProjectileArt[4], h.x, h.y, r * 2.7 * METEOR_ART, r * 2.7 * METEOR_ART, angle);
  } else {
    const index = h.foe ? 5 : ({ 3: 0, 6: 1, 7: 2, 8: 3 }[region().type] ?? 2);
    const im = h.foe ? projectileArt[index] : combatProjectileArt[index];
    drawVfxSprite(im, h.x, h.y, r * 2.8, r * 2.8, angle + Math.PI);
  }
  ctx.restore();
}

const ITEM_TINT = {
  magnet: { line: '#8fe3b0', fill: '#10322adc', art: 6 },
  double: { line: '#ffd36e', fill: '#3a2a08dc', art: 7 },
};
export function drawPickup(p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.kind === 'gem') {
    // 보석 (a stand-in until its art comes, docs/codex-art-handoff.md): spins while it flies up
    const grow = Math.min(1, 0.55 + (10 - p.life) * 3);
    ctx.scale(grow, grow);
    ctx.rotate(Math.max(-0.5, Math.min(0.5, (p.vx || 0) / 340)));
    ctx.scale(Math.max(0.35, Math.abs(Math.cos(G.time * (p.vy < 0 ? 14 : 6) + p.phase))), 1);
    drawGem(ctx);
    ctx.restore();
    return;
  }
  const coin = p.kind === 'coin',
    tint = ITEM_TINT[p.kind],
    // it springs out of the kill (small to full in 0.15 s) and leans with its throw
    grow = Math.min(1, 0.55 + (10 - p.life) * 3),
    lean = Math.max(-0.5, Math.min(0.5, (p.vx || 0) / 340));
  ctx.scale(grow, grow);
  // rays behind an item: gold for 점수 두 배, sky blue for 무아지경, jade for 자석 (render/glows.ts); none behind 엽전
  if (!coin) drawGlow(p.kind === 'double' ? 'gold' : p.kind === 'magnet' ? 'jade' : 'cyan', 0, 0, 1.28, 0, p.phase);
  ctx.strokeStyle = coin ? '#ffdf80' : (tint?.line ?? '#c9c0ff');
  ctx.fillStyle = coin ? '#37280be0' : (tint?.fill ?? '#201e48dc');
  ctx.lineWidth = coin ? 2 : 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, coin ? 17 : 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (!coin) {
    const light = ctx.createLinearGradient(0, -95, 0, 0);
    light.addColorStop(0, '#b3a1ff00');
    light.addColorStop(1, '#b3a1ff55');
    ctx.fillStyle = light;
    ctx.fillRect(-15, -95, 30, 82);
  }
  if (coin) {
    // spins fast while it flies up, slower as it falls
    ctx.rotate(lean);
    ctx.scale(Math.max(0.2, Math.abs(Math.cos(G.time * (p.vy < 0 ? 16 : 8) + p.phase))), 1);
    drawVfxSprite(propArt[3], 0, 0, 30, 30);
  } else if (tint) {
    ctx.rotate(lean + Math.sin(G.time * 3 + p.phase) * 0.08);
    drawVfxSprite(propArt[tint.art], 0, 0, 56, 56);
  } else {
    ctx.rotate(lean + Math.sin(G.time * 3 + p.phase) * 0.08);
    drawVfxSprite(propArt[5], 0, 0, 58, 58);
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
