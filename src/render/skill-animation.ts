/** Painted six-frame sequences. Black atlases are intentional additive light passes, not masks. */
import { G } from '../core/context';
import { ctx, reduced } from '../core/dom';
import signature from '../assets/images/skills/signature.png';
import movement from '../assets/images/skills/movement.png';
import attack from '../assets/images/skills/attack.png';
import passive from '../assets/images/skills/passive.png';
import energy from '../assets/images/skills/energy.png';
import secret from '../assets/images/skills/secret.png';
import flight from '../assets/images/skills/flight.png';
import swapPoses from '../assets/images/skills/swap-poses.png';

const sheets = [signature, movement, attack, passive, energy, secret, flight, swapPoses];
// [columns, rows] of each sheet, in the order above
const grids = [
  [6, 4],
  [6, 4],
  [6, 4],
  [6, 4],
  [6, 4],
  [6, 4],
  [6, 6],
  [4, 6],
];
// The generated flight sheet is not on an exact grid: its columns sit this many source pixels right of their
// cell centres (measured; the same in every row). Cropping with it keeps a looping projectile from wobbling.
const FLIGHT = 6,
  FLIGHT_DX = [20, 13, 5, 1, -7, -10];
/**
 * frames[sheet][row][column]: every frame cut into its own small canvas when the art loads. Drawing straight
 * from the 1536x1024 sheets made each call hold the whole decoded sheet until the frame was flushed, which
 * forced several mid-frame flushes once a few skills were active.
 */
const frames: HTMLCanvasElement[][][] = [];
function slice(im: HTMLImageElement, sheet: number) {
  const [cols, rows] = grids[sheet],
    w = im.width / cols,
    h = im.height / rows;
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => {
      const c = document.createElement('canvas');
      c.width = Math.round(w - 4);
      c.height = Math.round(h - 4);
      const dx = sheet === FLIGHT ? FLIGHT_DX[col] : 0;
      c.getContext('2d').drawImage(im, col * w + 2 + dx, row * h + 2, w - 4, h - 4, 0, 0, c.width, c.height);
      return c;
    }),
  );
}
const groups = [
  ['mancheon', 'yusu', 'art_cheolgap', 'art_cheonma'],
  ['janyoung', 'biyeon', 'muyoung', 'hoeseon'],
  ['bungsan', 'pajin', 'yeonhwan', 'uihyeop'],
  ['cheolgol', 'swaegap', 'chukgi', 'manryu'],
  ['geomu', 'gitan', 'hoegi', 'taeguk'],
  ['hyeolma', 'geumgang', 'hoechun', 'art_dobeop'],
];
export const skillArtIds = groups.flat();
const rows: Record<string, [number, number]> = {};
groups.forEach((group, sheet) => group.forEach((id, row) => (rows[id] = [sheet, row])));
const aliases = {
  pungun: 'yeonhwan',
  cheolhyeol: 'bungsan',
  mukyoung: 'muyoung',
  bicheon: 'geomu',
  unhak: 'manryu',
  hongryeon: 'mancheon',
  blast: 'manryu',
};
for (const [id, source] of Object.entries(aliases)) rows[id] = rows[source];
const flightRows: Record<string, number> = {
  mancheon: 0,
  janyoung: 1,
  pajin: 2,
  yeonhwan: 2,
  uihyeop: 3,
  art_dobeop: 3,
  gitan: 4,
  taeguk: 5,
  pungun: 2,
  hongryeon: 0,
};
export let visualSkill: string | undefined;
export function withSkill<T>(id: string | undefined, fn: () => T): T {
  const previous = visualSkill;
  visualSkill = id;
  try {
    return fn();
  } finally {
    visualSkill = previous;
  }
}
export async function loadSkillArt() {
  await Promise.all(
    sheets.map(
      (src, i) =>
        new Promise<void>((resolve, reject) => {
          const im = new Image();
          im.onload = () => {
            frames[i] = slice(im, i);
            resolve();
          };
          im.onerror = reject;
          im.src = src;
        }),
    ),
  );
}
export function drawSkillFrame(
  id: string,
  frame: number,
  x: number,
  y: number,
  size: number,
  alpha = 1,
  angle = 0,
  projectile = false,
) {
  const entry = rows[id];
  if (!entry) return false;
  const [sheet, row] = projectile ? [FLIGHT, flightRows[id] ?? 1] : entry;
  const im = frames[sheet]?.[row][Math.max(0, Math.min(5, frame))];
  if (!im) return false;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha *= alpha;
  ctx.drawImage(im, -size / 2, -size / 2, size, size);
  ctx.restore();
  return true;
}
type Cue = {
  id: string;
  x: number;
  y: number;
  size: number;
  age: number;
  duration: number;
  impact: boolean;
  follow: boolean;
  owner: number;
  stage: number;
};
const cues: Cue[] = [];
const learned: string[] = [];
export function queueSkillLearn(id: string) {
  learned.push(id);
}
const auras = new Map<string, { end: number; size: number; owner: number }>();
let shield = false,
  negate = false;
let swapPose: { id: string; start: number } | null = null;
export function startSwapPose(id: string) {
  swapPose = { id, start: G.time };
}
export function drawSwapPose(id: string, x: number, y: number, angle: number, alpha: number) {
  if (reduced || !swapPose || swapPose.id !== id || G.time - swapPose.start >= 0.32 || !frames[7]) return false;
  const row = ['pungun', 'cheolhyeol', 'mukyoung', 'bicheon', 'unhak', 'hongryeon'].indexOf(id);
  const im = frames[7][row]?.[Math.min(3, Math.floor((G.time - swapPose.start) / 0.08))];
  if (!im) return false;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha *= alpha;
  ctx.drawImage(im, -57, -57, 114, 114);
  ctx.restore();
  return true;
}
export function clearSkillAnimations() {
  cues.length = 0;
  learned.length = 0;
  swapPose = null;
  auras.clear();
  shield = negate = false;
  visualSkill = undefined;
}
/**
 * `area` marks the one cue that shows a whole attack (an area blast). It is never throttled away by the small
 * per-target cues of the same skill: past the per-skill limit it replaces the oldest of them instead.
 */
export function skillCue(id: string, x: number, y: number, size = 110, impact = false, follow = false, area = false) {
  if (!rows[id] || !G.state || !frames[0]) return false;
  // Throttle presentation only; no combat timer or game RNG is touched.
  if (!area && cues.some(c => c.id === id && c.impact === impact && c.age < 0.085 && Math.hypot(c.x - x, c.y - y) < 36))
    return true;
  if (cues.filter(c => c.id === id).length >= 5) {
    if (!area) return true;
    cues.splice(
      cues.findIndex(c => c.id === id),
      1,
    );
  }
  if (cues.length >= 48) cues.shift();
  cues.push({
    id,
    x,
    y,
    size,
    age: 0,
    duration: impact ? 0.24 : 0.42,
    impact,
    follow,
    owner: G.state.active,
    stage: G.state.stage,
  });
  return true;
}
export function skillAura(id: string, duration: number, size = 120) {
  auras.set(id, { end: G.time + duration, size, owner: G.state.active });
}
export function updateSkillAnimations(dt: number) {
  for (const c of cues) c.age += dt;
  for (let i = cues.length - 1; i >= 0; i--) {
    const c = cues[i];
    if (c.age >= c.duration || c.stage !== G.state?.stage || (c.follow && c.owner !== G.state?.active))
      cues.splice(i, 1);
  }
  if (!G.player || !G.state || G.player.hp <= 0 || ['title', 'result', 'choice'].includes(G.mode)) {
    cues.length = 0;
    auras.clear();
    shield = negate = false;
    return;
  }
  if (G.mode === 'play' && ['flight', 'boss'].includes(G.state.phase)) {
    for (const id of learned.splice(0))
      if (['cheolgol', 'manryu', 'chukgi', 'swaegap', 'biyeon'].includes(id)) skillCue(id, G.player.x, G.player.y, 110);
  }
  for (const [id, a] of auras)
    if (G.time >= a.end || a.owner !== G.state.active || !['flight', 'boss'].includes(G.state.phase)) {
      if (a.owner === G.state.active) skillCue(id, G.player.x, G.player.y, a.size, true);
      auras.delete(id);
    }
  const nextShield = G.player.shield > 0,
    nextNegate = !!G.state.negate;
  if (nextShield !== shield && !nextShield)
    for (let i = cues.length - 1; i >= 0; i--) if (cues[i].id === 'art_cheolgap' && !cues[i].impact) cues.splice(i, 1);
  if (nextNegate !== negate && !nextNegate)
    for (let i = cues.length - 1; i >= 0; i--) if (cues[i].id === 'hoechun' && !cues[i].impact) cues.splice(i, 1);
  if (nextShield !== shield) skillCue('art_cheolgap', G.player.x, G.player.y, 125, !nextShield, nextShield);
  if (nextNegate !== negate) skillCue('hoechun', G.player.x, G.player.y + 28, 64, !nextNegate, nextNegate);
  shield = nextShield;
  negate = nextNegate;
}
export function drawSkillAnimations() {
  for (const c of cues) {
    const t = c.age / c.duration;
    const frame = reduced
      ? c.impact
        ? 4
        : 2
      : c.impact
        ? 3 + Math.min(2, Math.floor(t * 3))
        : Math.min(5, Math.floor(t * 6));
    const x = c.follow ? G.player.x : c.x,
      y = c.follow ? G.player.y - 25 : c.y;
    drawSkillFrame(c.id, frame, x, y, c.size, (reduced ? 0.5 : 0.88) * Math.min(1, (1 - t) * 4));
  }
  if (G.player?.hp <= 0 || !G.state || !['flight', 'boss'].includes(G.state.phase)) return;
  const f = reduced ? 2 : [1, 2, 3, 2][Math.floor(G.time * 6) % 4];
  if (shield) drawSkillFrame('art_cheolgap', f, G.player.x, G.player.y, 125, 0.38);
  if (negate) drawSkillFrame('hoechun', f, G.player.x, G.player.y + 32, 48, 0.55);
  for (const [id, a] of auras) drawSkillFrame(id, f, G.player.x, G.player.y, a.size, 0.38);
}
/**
 * A skill's projectile is drawn larger than a basic shot (36 to 48 px) and leaves two fading copies of itself
 * behind, so it reads as the reward for meeting the skill's condition. Hitboxes are unchanged.
 */
export function drawSkillShot(s: any) {
  if (flightRows[s.skill] === undefined) return false;
  const size = s.kind === 'gang' ? Math.max(66, (s.w || 8) * 5) : s.kind === 'orb' ? 54 : 58,
    frame = reduced ? 2 : Math.floor((G.time - s.phase) * 18) % 6,
    vy = s.vy ?? 900,
    angle = Math.atan2(s.vx, vy);
  if (!reduced)
    for (const [back, alpha] of [
      [0.05, 0.22],
      [0.025, 0.42],
    ])
      drawSkillFrame(s.skill, frame, s.x - s.vx * back, s.y + vy * back, size * 0.92, alpha, angle, true);
  return drawSkillFrame(s.skill, frame, s.x, s.y, size, 1, angle, true);
}
/** Runtime inspection for the visual regression harness, never used to drive gameplay. */
export function skillAnimationSnapshot() {
  return { cues: cues.map(c => ({ ...c })), auras: [...auras.keys()], loaded: frames.length, shield, negate };
}
