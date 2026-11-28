// 초식 이름: a name struck in brush style above the player when something goes off: every 공명 기술 (the same
// skill at most once a GAP), and 필살기, 무아지경, 자석 and 점수 두 배 (these take a line even when both are busy).
// Cosmetic only: nothing here touches game state, timers or the gameplay RNG.
import { G } from '../core/context';
import { W, ctx, reduced } from '../core/dom';
import { clamp } from '../core/math';
import { BR } from '../data/branches';
import { SKILLS } from '../data/skills';

type Callout = { name: string; sub: string; color: string; seal: string; age: number; slot: number };

const GAP = 1, // seconds before the same skill may announce again
  LIFE = 0.95,
  SLOTS = 2;
const lastAt = new WeakMap<object, number>();
const live: Callout[] = [];

/** a free line, or with `force` the oldest one (taken over); -1 when none */
function freeSlot(force: boolean) {
  for (let slot = 0; slot < SLOTS; slot++) if (!live.some(c => c.slot === slot)) return slot;
  if (!force) return -1;
  const oldest = live.reduce((a, b) => (b.age > a.age ? b : a));
  live.splice(live.indexOf(oldest), 1);
  return oldest.slot;
}

/** A 공명 기술 went off: every time, the same skill at most once a GAP. `s` is its instance in G.state.skills. */
export function skillCallout(s: { id: string }) {
  if (G.time - (lastAt.get(s) ?? -99) < GAP) return;
  const slot = freeSlot(false);
  if (slot < 0) return;
  const d = SKILLS[s.id];
  live.push({ name: d.name, sub: '', color: BR[d.br].color, seal: BR[d.br].hanja, age: 0, slot });
  lastAt.set(s, G.time);
}
/** The run's own moves and items: name, colour and seal character. */
export const ACTION_CALLOUTS = {
  blast: { name: '필살기', color: '#ffd77a', seal: '必' },
  hyper: { name: '무아지경', color: '#c5ffff', seal: '無' },
  magnet: { name: '자석', color: '#8fe3b0', seal: '磁' },
  double: { name: '점수 두 배', color: '#ffd36e', seal: '倍' },
  dual: { name: '듀얼샷', color: '#ff9a7a', seal: '雙' },
};
/** 필살기, 무아지경, 자석 or 점수 두 배 went off: always shown (it takes the oldest line when both are busy). */
export function actionCallout(kind: keyof typeof ACTION_CALLOUTS) {
  const a = ACTION_CALLOUTS[kind];
  live.push({ name: a.name, sub: '', color: a.color, seal: a.seal, age: 0, slot: freeSlot(true) });
}
/** After a skill is enhanced it may announce itself again at once. */
export function resetCallout(s: object) {
  lastAt.delete(s);
}
export function clearCallouts() {
  live.length = 0;
}
export function updateCallouts(dt: number) {
  if (G.mode !== 'play' || !G.player || G.player.hp <= 0) {
    live.length = 0;
    return;
  }
  for (const c of live) c.age += dt;
  for (let i = live.length - 1; i >= 0; i--) if (live[i].age >= LIFE) live.splice(i, 1);
}
export function drawCallouts() {
  for (const c of live) {
    const x = clamp(G.player.x, 112, W - 112),
      y = G.player.y - 104 - c.slot * 50,
      strike = reduced ? 1 : Math.min(1, c.age / 0.09), // slammed down like a seal, then held
      scale = 1 + (1 - strike) ** 2 * 0.7,
      alpha = Math.min(1, c.age / 0.05, (LIFE - c.age) / 0.25);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.06);
    ctx.scale(scale, scale);
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.font = "900 27px 'Noto Serif KR', 'Batang', 'Nanum Myeongjo', serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(c.name).width,
      half = w / 2 + 22;
    // ink swash behind the name: one tapered brush stroke
    ctx.fillStyle = '#07130fd0';
    ctx.beginPath();
    ctx.moveTo(-half - 14, 5);
    ctx.quadraticCurveTo(-half * 0.3, -21, half + 6, -13);
    ctx.quadraticCurveTo(half + 20, 0, half + 2, 13);
    ctx.quadraticCurveTo(-half * 0.2, 21, -half - 14, 5);
    ctx.fill();
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#040d0b';
    ctx.strokeText(c.name, -7, 0);
    ctx.fillStyle = c.color;
    ctx.fillText(c.name, -7, 0);
    // vermilion seal with the skill family's character
    ctx.fillStyle = '#b8402f';
    ctx.fillRect(w / 2 - 1, -10, 19, 19);
    ctx.fillStyle = '#f6e3bd';
    ctx.font = "bold 13px 'Noto Serif KR', 'Batang', serif";
    ctx.fillText(c.seal, w / 2 + 8.5, 0);
    if (c.sub) {
      ctx.font = 'bold 12px Arial';
      ctx.lineWidth = 3;
      ctx.strokeText(c.sub, -7, 24);
      ctx.fillStyle = '#ffe9a8';
      ctx.fillText(c.sub, -7, 24);
    }
    ctx.restore();
  }
}
/** Runtime inspection for the visual regression harness, never used to drive gameplay. */
export function calloutSnapshot() {
  return live.map(c => ({ name: c.name, sub: c.sub, slot: c.slot }));
}
