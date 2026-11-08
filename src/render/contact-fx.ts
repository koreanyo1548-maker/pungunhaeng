import { G } from '../core/context';
import { ctx, reduced } from '../core/dom';
import { fxRnd } from '../core/math';

/** Cosmetic-only contact marks. These never change hitboxes, timers or gameplay RNG. */
export function contactFX(e, finishing = false) {
  const kind = e.rock ? 'stone' : e.rank >= 2 || e.boss ? 'armor' : 'slash';
  const list = (G.contactFX ??= []);
  if (list.length >= 64) list.shift();
  list.push({
    x: e.x,
    y: e.y + e.r * 0.15,
    kind,
    finishing,
    size: (e.boss ? 38 : e.r * 1.25) * (finishing ? 1.45 : 1),
    angle: fxRnd(-0.7, 0.7),
    life: finishing ? 0.32 : 0.18,
    total: finishing ? 0.32 : 0.18,
    chips: Array.from({ length: kind === 'stone' ? 6 : 4 }, () => ({
      angle: fxRnd(0, Math.PI * 2),
      speed: fxRnd(0.5, 1),
      size: fxRnd(1.5, 3.5),
    })),
  });
}
export function updateContactFX(dt) {
  G.contactFX ??= [];
  for (const f of G.contactFX) f.life -= dt;
  G.contactFX = G.contactFX.filter(f => f.life > 0);
}
export function drawContactFX() {
  for (const f of G.contactFX || []) {
    const age = 1 - f.life / f.total;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.angle);
    ctx.globalAlpha = (1 - age) ** 1.4 * (reduced ? 0.65 : 1);
    const span = f.size * (reduced ? 0.7 : 0.55 + age * 0.8);
    if (f.kind === 'slash') {
      // Tapered brush stroke, with a brief ivory edge, not a circular explosion.
      ctx.fillStyle = f.finishing ? '#a3e8d6' : '#d2eee1';
      ctx.beginPath();
      ctx.moveTo(-span, span * 0.45);
      ctx.quadraticCurveTo(0, -span * 0.05, span, -span * 0.55);
      ctx.quadraticCurveTo(span * 0.15, span * 0.2, -span, span * 0.45);
      ctx.fill();
      ctx.strokeStyle = '#fff5d5';
      ctx.lineWidth = f.finishing ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(-span * 0.75, span * 0.32);
      ctx.lineTo(span * 0.85, -span * 0.46);
      ctx.stroke();
    } else {
      for (const chip of f.chips) {
        const d = reduced ? span * 0.35 : span * age * chip.speed;
        const x = Math.cos(chip.angle) * d,
          y = Math.sin(chip.angle) * d;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(chip.angle + age);
        if (f.kind === 'stone') {
          ctx.fillStyle = '#b7a88a';
          ctx.strokeStyle = '#514b42';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(-chip.size, 0);
          ctx.lineTo(0, -chip.size);
          ctx.lineTo(chip.size, 0);
          ctx.lineTo(chip.size * 0.4, chip.size);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.strokeStyle = age < 0.35 ? '#fff1c7' : '#edb36e';
          ctx.lineWidth = age < 0.35 ? 2 : 1;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(chip.size * (f.finishing ? 4 : 2), 0);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    // Contact light lives only at the beginning; flying particles remain readable afterward.
    if (age < 0.25) {
      ctx.fillStyle = '#fff6df';
      ctx.beginPath();
      ctx.arc(0, 0, f.finishing ? 4 : 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
