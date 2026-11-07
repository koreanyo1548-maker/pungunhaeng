import { G } from '../core/context';
import { ctx } from '../core/dom';

export function enemyFrameIndex(e) {
  return e.boss
    ? e.action === 'telegraph'
      ? 1
      : e.action === 'attack'
        ? 2
        : 0
    : Math.floor(G.time * 7 + (e.phase || 0)) % 2;
}
export function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
