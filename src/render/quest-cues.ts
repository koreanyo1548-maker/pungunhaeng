import { G } from '../core/context';
import { W, ctx } from '../core/dom';
import { clamp } from '../core/math';
import { BR, COND } from '../data/branches';
import { TUNE } from '../data/tune';
import { hasSkill } from '../systems/abilities';
import { traitOn } from '../systems/formation';

export function drawQuestCue() {
  const q = G.state?.quest;
  if (!q || q.done || q.failed || q.stage !== G.state.stage || G.mode === 'title' || G.player.hp <= 0) return;
  const c = BR[q.br].color;
  ctx.save();
  if (q.t === 'graze') {
    const r = 10 + TUNE.grazeRadius * (hasSkill('biyeon') ? 1.6 : 1) * (traitOn('mukyoung') ? TUNE.traitGraze : 1) + 8;
    ctx.strokeStyle = c;
    ctx.globalAlpha = 0.62;
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(G.player.x, G.player.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const h of G.hazards) {
      if (h.warn > 0 || h.dead || h.grazed) continue;
      const d = Math.hypot(h.x - G.player.x, h.y - G.player.y);
      if (d < r + 40 && d > h.r + 10) {
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.r + 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  } else if (q.t === 'step') {
    const live = G.time - (G.state.lastStepTime || -9) < 0.5,
      next = -(G.state.lastStepDir || 1);
    for (const side of [-1, 1]) {
      const on = live && side === next;
      ctx.globalAlpha = on ? 0.95 : 0.35;
      ctx.strokeStyle = c;
      ctx.lineWidth = on ? 3.5 : 2;
      const x = G.player.x + side * 54,
        y = G.player.y;
      ctx.beginPath();
      ctx.moveTo(x - side * 6, y - 12);
      ctx.lineTo(x + side * 5, y);
      ctx.lineTo(x - side * 6, y + 12);
      ctx.stroke();
    }
  } else if (q.t === 'nearKill') {
    const y = G.player.y - TUNE.nearDy;
    ctx.strokeStyle = c;
    ctx.globalAlpha = 0.65;
    ctx.setLineDash([10, 7]);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = c;
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('코앞', 8, y - 5);
  } else if (q.t === 'rowClear') {
    let low = null;
    for (const e of G.enemies) {
      if (e.dead || e.boss || e.y > G.player.y - 20) continue;
      const row = G.rows.get(e.row);
      if (!row || row.missed) continue;
      if (!low || e.y > low.y) low = e;
    }
    if (low) {
      const row = G.rows.get(low.row),
        killed = 5 - row.remaining,
        ys = low.y - 60;
      for (let i = 0; i < 5; i++) {
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = i < killed ? c : '#ffffff44';
        ctx.beginPath();
        ctx.arc(W / 2 - 36 + i * 18, ys, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (q.t === 'combo' && G.state.combo > 0) {
    const t = clamp((G.state.comboTimer || 0) / 2, 0, 1);
    ctx.strokeStyle = c;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(G.player.x, G.player.y, 50, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * t);
    ctx.stroke();
  }
  if (q.tick != null && G.time - q.tick < 0.9) {
    const a = 1 - (G.time - q.tick) / 0.9,
      txt = COND[q.t].label.split(' (')[0] + ' ' + Math.floor(q.prog) + ' / ' + q.target;
    ctx.globalAlpha = Math.min(1, a * 1.6);
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#04161c';
    const x = clamp(G.player.x + 74, 64, W - 64),
      y = G.player.y - 70 - (1 - a) * 10;
    ctx.strokeText(txt, x, y);
    ctx.fillStyle = c;
    ctx.fillText(txt, x, y);
  }
  ctx.restore();
}
