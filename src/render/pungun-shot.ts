// Temporary visual progression for the existing crescent art; sizes are canvas pixels.
// The shot carries its firing hero's level so a hero swap cannot change shots already in flight.
import { projectileArt } from '../core/assets';
import { ctx } from '../core/dom';
import type { Shot } from '../core/state-types';
import { drawGlow } from './glows';

const SIZES = [72, 92, 112, 136, 160];

export function drawPungunShot(shot: Shot) {
  const image = projectileArt[0];
  if (!image) return;
  const tier = Math.min(4, Math.max(0, Math.floor(((shot.pungunShotLevel ?? 1) - 1) / 10)));
  const size = SIZES[tier];
  const angle = Math.atan2(shot.vx, shot.vy ?? 900);
  ctx.save();
  ctx.translate(shot.x, shot.y);
  ctx.rotate(angle);
  ctx.drawImage(image, -size / 2, -size / 2, size, size);

  // Right-facing PixelFX turns upward; the hot head sits on the crescent's leading arc.
  drawGlow('shotJade', 0, -size * 0.16, 0.8 + tier * 0.24, -Math.PI / 2, -shot.phase, 0.22 + tier * 0.035);
  if (tier >= 3) {
    const glow = tier === 4 ? 'shotGold' : 'shotJade';
    for (const side of [-1, 1]) {
      drawGlow(glow, side * size * 0.22, -size * 0.06, 0.65, -Math.PI / 2, -shot.phase + (side + 1) * 0.19, 0.3);
    }
  }
  ctx.restore();
}
