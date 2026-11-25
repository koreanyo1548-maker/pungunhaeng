// The 정예 적's marks and the 장비 상자, drawn in code until Codex draws them (docs/codex-art-handoff.md): a red
// halo under the enemy art, a wide health bar with "정예", and the box flying to the hero when it is caught.
import { G } from '../core/context';
import { ctx, reduced } from '../core/dom';
import type { Enemy } from '../core/state-types';
import { BOX_FLY } from '../systems/elite';
import { roundRect } from './util';
import { gearBoxImage } from './gear-art';

/** under the 정예 적: a pulsing red halo */
export function drawEliteAura(e: Enemy) {
  const pulse = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(G.time * 6);
  ctx.save();
  const g = ctx.createRadialGradient(e.x, e.y, 10, e.x, e.y, e.r * 1.9);
  g.addColorStop(0, `rgba(255,90,70,${0.32 + pulse * 0.18})`);
  g.addColorStop(1, 'rgba(255,90,70,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.r * 1.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(255,180,120,${0.45 + pulse * 0.35})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.r + 10 + pulse * 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** over the 정예 적: "정예" and its health, hits left */
export function drawEliteBar(e: Enemy) {
  const w = 96,
    y = e.y + e.r + 22;
  ctx.save();
  ctx.fillStyle = '#1a0b08cc';
  roundRect(e.x - w / 2 - 2, y - 2, w + 4, 9, 4);
  ctx.fill();
  ctx.fillStyle = '#ff6f5e';
  roundRect(e.x - w / 2, y, w * Math.max(0, e.hp / e.maxHp), 5, 3);
  ctx.fill();
  ctx.font = '700 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd9b0';
  ctx.strokeStyle = '#2a0f0a';
  ctx.lineWidth = 3;
  const text = `정예 ${Math.max(0, Math.ceil(e.hp))}`;
  ctx.strokeText(text, e.x, e.y - e.r - 14);
  ctx.fillText(text, e.x, e.y - e.r - 14);
  ctx.restore();
}

/** a 장비 상자: the box of the gear sheet (art/originals/gear.png), or a small gold-trimmed chest drawn in code
 *  until the sheet is loaded */
export function drawBox(x: number, y: number, s: number, alpha = 1) {
  const art = gearBoxImage();
  if (art) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(art, x - 28 * s, y - 28 * s, 56 * s, 56 * s);
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#7a3e1e';
  ctx.strokeStyle = '#2a140a';
  ctx.lineWidth = 2;
  roundRect(-16, -6, 32, 20, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#9a5228';
  roundRect(-17, -16, 34, 12, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffcf6a';
  ctx.fillRect(-17, -6, 34, 3);
  ctx.fillRect(-3, -9, 6, 9);
  ctx.restore();
}

/** the box flying from where the 정예 적 fell to the hero */
export function drawBoxFly() {
  const f = G.state?.elite?.fly;
  if (!f) return;
  const k = Math.min(1, f.t / BOX_FLY),
    e = 1 - (1 - k) * (1 - k),
    x = f.x + (G.player.x - f.x) * e,
    y = f.y + (G.player.y - 40 - f.y) * e - Math.sin(k * Math.PI) * 60;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 2, x, y, 34);
  g.addColorStop(0, 'rgba(255,207,106,.7)');
  g.addColorStop(1, 'rgba(255,207,106,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawBox(x, y, 1.2 - k * 0.4, 1 - Math.max(0, k - 0.85) / 0.15);
}
