// What an entry skill looks like while it runs (systems/hero-effects.ts): a ring at the hero's feet that empties
// as the time runs out, and the shapes some skills add (veil, guard arc, clones, circling swords).
// Display only: nothing here changes the game. First versions use shapes and existing art.
import { G } from '../core/context';
import { ctx, reduced } from '../core/dom';
import { HEROES } from '../data/heroes';
import { heroPose } from '../entities/player';
import { cloneOffsets, swordPositions, veilRadius } from '../systems/hero-effects';
import { drawHeroSprite } from './actors';
import { drawSkillFrame } from './skill-animation';

export function drawHeroEffect() {
  const fx = G.state?.effect;
  if (!fx || G.player.hp <= 0) return;
  const color = HEROES[fx.hero].color,
    x = G.player.x,
    y = G.player.y,
    left = Math.max(0, fx.left / fx.total),
    pulse = reduced ? 0.5 : 0.5 + Math.sin(G.time * 6) * 0.15;
  ctx.save();
  // time left: a ring at the feet that closes as the skill runs out
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.ellipse(x, y + 40, 30, 10, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left);
  ctx.stroke();
  ctx.globalAlpha = 0.18;
  ctx.beginPath();
  ctx.ellipse(x, y + 40, 30, 10, 0, 0, Math.PI * 2);
  ctx.stroke();
  if (fx.hero === 'unhak') {
    const r = veilRadius(fx.level);
    ctx.globalAlpha = 0.12 * pulse * 2;
    ctx.fillStyle = '#fff6da';
    ctx.beginPath();
    ctx.arc(x, y - 10, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (fx.hero === 'yoran') {
    const all = fx.level >= 4;
    ctx.globalAlpha = 0.55 * pulse * 2;
    ctx.strokeStyle = '#fff8e2';
    ctx.lineWidth = 4;
    ctx.beginPath();
    if (all) ctx.arc(x, y - 6, 92, 0, Math.PI * 2);
    else ctx.arc(x, y - 6, 74, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
  }
  ctx.restore();
  if (fx.hero === 'mukyoung')
    for (const dx of cloneOffsets()) drawHeroSprite(heroPose(), x + dx, y, G.player.tilt, 0.38, true);
  if (fx.hero === 'bicheon')
    for (const p of swordPositions())
      drawSkillFrame(
        'hoeseon',
        reduced ? 2 : [1, 2, 3, 2][Math.floor(G.time * 8) % 4],
        p.x,
        p.y,
        48,
        0.9,
        p.a + Math.PI,
      );
}
