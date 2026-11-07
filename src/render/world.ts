import { G } from '../core/context';
import { H, W, ctx } from '../core/dom';
import { movementTier } from '../systems/flow';

export function drawWorld(tier, alpha = 1) {
  const im = G.worlds[tier];
  if (!im) return;
  const h = (W * im.height) / im.width,
    offset = G.scroll * 0.86,
    base = Math.floor(offset / h),
    y = offset % h;
  ctx.save();
  ctx.globalAlpha = alpha;
  // Alternating mirrored tiles meet at the same edge, avoiding a hard scrolling seam.
  for (let i = -1; i <= 1; i++) {
    ctx.save();
    ctx.translate(0, y + i * h);
    if (Math.abs(base - i) % 2) {
      ctx.translate(0, h);
      ctx.scale(1, -1);
    }
    ctx.drawImage(im, 0, 0, W, h);
    ctx.restore();
  }
  ctx.restore();
}
export function background() {
  const tier = G.state && G.mode !== 'title' ? movementTier() : 0;
  ctx.fillStyle = '#49645b';
  ctx.fillRect(0, 0, W, H);
  if (G.state?.ascend > 0 && G.mode !== 'title') {
    drawWorld(G.state.previousTier);
    drawWorld(tier, 1 - G.state.ascend / 2.6);
  } else drawWorld(tier);
  ctx.fillStyle = tier === 0 ? '#162c2333' : tier === 1 ? '#063d3e3d' : '#102e514f';
  ctx.fillRect(0, 0, W, H);
  const edge = ctx.createLinearGradient(0, 0, W, 0);
  edge.addColorStop(0, '#082e3a44');
  edge.addColorStop(0.18, '#082e3a00');
  edge.addColorStop(0.82, '#082e3a00');
  edge.addColorStop(1, '#082e3a44');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, W, H);
  if (tier > 0) {
    ctx.save();
    ctx.globalAlpha = 0.09;
    for (let i = 0; i < 5; i++) {
      const y = ((G.scroll * 0.34 + i * 211) % 1000) - 90;
      ctx.fillStyle = '#effff4';
      ctx.beginPath();
      ctx.ellipse((i * 137) % 480, y, 160, 26, -0.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  const hyper = G.mode === 'play' && G.state.hyper > 0;
  ctx.strokeStyle = hyper ? '#d6ffeaaa' : tier === 0 ? '#efdcab30' : '#e5fff52d';
  ctx.lineWidth = hyper ? 2 : 1;
  for (let i = 0; i < (hyper ? 28 : 9); i++) {
    const x = (i * 131.7 + 18) % W,
      y = (G.scroll * (hyper ? 1.6 : 0.75) + i * 137.1) % H,
      len = hyper ? 95 : 18;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - 6, y + len / 2, x, y + len);
    ctx.stroke();
  }
  if (G.state?.ascend > 0) {
    const a = Math.sin((1 - G.state.ascend / 2.6) * Math.PI) * 0.32;
    ctx.fillStyle = `rgba(224,250,232,${a})`;
    ctx.fillRect(0, 0, W, H);
  }
}
export function drawFootprints() {
  for (const f of G.footprints) {
    ctx.save();
    ctx.globalAlpha = (f.life / f.total) * 0.3;
    ctx.fillStyle = f.tier ? '#305656' : '#655137';
    ctx.beginPath();
    ctx.ellipse(f.x, f.y, f.tier ? 37 : 4, f.tier ? 12 : 8, 0, 0, Math.PI * 2);
    ctx.fill();
    if (f.tier) {
      ctx.strokeStyle = '#dcf1c9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, 40, 13, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}
