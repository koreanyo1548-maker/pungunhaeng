import { G } from '../core/context';
import { H, W, ctx } from '../core/dom';
import { clamp } from '../core/math';
import { region } from '../systems/flow';

export function drawBossWarnings() {
  const e = G.enemies.find(e => e.boss && !e.dead);
  if (!e) return;
  const color = region().color;
  if (e.action === 'telegraph' || (e.action === 'attack' && e.pattern === 'lanes')) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    const pulse = 0.13 + Math.sin(G.time * 12) * 0.04;
    ctx.fillStyle = color;
    if (e.pattern === 'dive') {
      ctx.globalAlpha = pulse;
      ctx.fillRect(e.targetX - 74, 200, 148, H - 200);
      ctx.globalAlpha = 0.85;
      ctx.setLineDash([14, 10]);
      ctx.strokeRect(e.targetX - 74, 200, 148, H - 200);
      ctx.setLineDash([]);
      for (let y = 260; y < 780; y += 85) {
        const yy = y + ((G.time * 100) % 85);
        ctx.beginPath();
        ctx.moveTo(e.targetX - 18, yy);
        ctx.lineTo(e.targetX, yy + 17);
        ctx.lineTo(e.targetX + 18, yy);
        ctx.stroke();
      }
    } else if (e.pattern === 'lanes') {
      for (let lane = 0; lane < 5; lane++) {
        if (lane === e.safeLane) {
          ctx.fillStyle = '#8effd5';
          ctx.globalAlpha = 0.1;
          ctx.fillRect(lane * 96, 200, 96, H - 200);
          ctx.globalAlpha = 0.8;
          ctx.font = 'bold 13px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('안전', 48 + lane * 96, 575);
          ctx.fillStyle = color;
          continue;
        }
        ctx.globalAlpha = pulse;
        ctx.fillRect(lane * 96 + 5, 200, 86, H - 200);
        ctx.globalAlpha = 0.65;
        ctx.setLineDash([8, 10]);
        ctx.beginPath();
        ctx.moveTo(lane * 96 + 48, 220);
        ctx.lineTo(lane * 96 + 48, H);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    } else {
      ctx.globalAlpha = 0.65;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(e.x, e.y + 60);
      ctx.lineTo(e.targetX, e.targetY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(e.targetX, e.targetY, 26 + Math.sin(G.time * 10) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(e.targetX - 38, e.targetY);
      ctx.lineTo(e.targetX + 38, e.targetY);
      ctx.moveTo(e.targetX, e.targetY - 38);
      ctx.lineTo(e.targetX, e.targetY + 38);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (e.action === 'recover') {
    ctx.save();
    ctx.strokeStyle = '#adffe5';
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 12]);
    ctx.beginPath();
    ctx.arc(e.x, e.y, 85, G.time, G.time + Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
export function drawBanner() {
  if (!G.banner) return;
  const age = G.banner.total - G.banner.life,
    fade = Math.min(1, age * 5, G.banner.life * 3),
    arrive = 1 - Math.pow(1 - clamp(age / 0.3, 0, 1), 3);
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.translate((1 - arrive) * -60, 0);
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, '#051a2d00');
  g.addColorStop(0.18, '#051a2ddd');
  g.addColorStop(0.82, '#051a2ddd');
  g.addColorStop(1, '#051a2d00');
  ctx.fillStyle = g;
  ctx.fillRect(0, 248, W, 130);
  ctx.strokeStyle = G.banner.color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(65, 248);
  ctx.lineTo(415, 248);
  ctx.moveTo(65, 378);
  ctx.lineTo(415, 378);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = G.banner.color;
  ctx.font = 'bold 13px Arial';
  ctx.fillText(G.banner.top, 240, 278);
  ctx.font = '900 30px Arial';
  ctx.fillStyle = '#fff6d8';
  ctx.fillText(G.banner.title, 240, 321);
  ctx.font = '12px Arial';
  ctx.fillStyle = '#cbe4df';
  ctx.fillText(G.banner.sub, 240, 351);
  ctx.restore();
}
