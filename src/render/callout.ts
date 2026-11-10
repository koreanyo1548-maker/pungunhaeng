// 초식 이름: a skill's name struck in brush style above the player when it goes off.
// Shown the first few times after a skill is learned or enhanced, and every time for rare, big skills.
// Cosmetic only: counts live outside game state and nothing here touches timers or the gameplay RNG.
import { G } from '../core/context';
import { W, ctx, reduced } from '../core/dom';
import { clamp } from '../core/math';
import { BR } from '../data/branches';
import { ARTS, SKILLS } from '../data/skills';

type Callout = { name: string; sub: string; color: string; seal: string; age: number; slot: number };

const FIRST = 3, // times a newly learned or enhanced skill announces itself
  GAP = 1, // seconds before the same skill may announce again
  LIFE = 0.95,
  SLOTS = 2;
const shown = new WeakMap<object, number>(),
  lastAt = new WeakMap<object, number>();
const live: Callout[] = [];

/** Rare, deliberate skills keep their callout for the whole run. */
function always(id: string) {
  const d = SKILLS[id];
  return d.trig === 'blast' || d.trig === 'combo10' || (d.trig === 'tick' && d.cd >= 10);
}

/** `s` is the skill instance in G.state.skills (it carries the boss enhancement, `mod`). */
export function skillCallout(s: { id: string; mod?: string | number }) {
  const count = shown.get(s) ?? 0;
  if (!always(s.id) && count >= FIRST) return;
  if (G.time - (lastAt.get(s) ?? -99) < GAP) return;
  let slot = 0;
  while (live.some(c => c.slot === slot)) slot++;
  if (slot >= SLOTS) return;
  const d = SKILLS[s.id];
  live.push({
    name: d.name,
    sub: s.mod ? '★★ ' + ARTS[s.mod].name : '',
    color: s.mod ? '#ffd77a' : BR[d.br].color,
    seal: BR[d.br].hanja,
    age: 0,
    slot,
  });
  shown.set(s, count + 1);
  lastAt.set(s, G.time);
}
/** After a skill is enhanced it announces itself again, now in gold. */
export function resetCallout(s: object) {
  shown.delete(s);
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
