/** Painted six-frame sequences. Black atlases are intentional additive light passes, not masks. */
import { HEROES } from '../data/heroes';
import { SKILLS } from '../data/skills';
import { G } from '../core/context';
import { combatProjectileArt, heroCastAnimations } from '../core/assets';
import { H, W, ctx, reduced } from '../core/dom';
import { frames, FLIGHT, heroineSkillSheets } from '../assets/skill-art';
import { TUNE } from '../data/tune';
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
  // 공명 기술 that were entry skills show their old art (eogeom: 어검진, hongryeonhwa: 홍련화, grimja: 그림자 분신)
  eogeom: 'geomu',
  hongryeonhwa: 'mancheon',
  grimja: 'muyoung',
  pungun: 'yeonhwan',
  cheolhyeol: 'bungsan',
  mukyoung: 'muyoung',
  bicheon: 'geomu',
  unhak: 'manryu',
  hongryeon: 'mancheon',
  blast: 'manryu',
};
for (const [id, source] of Object.entries(aliases)) rows[id] = rows[source];
for (const [id, sheet] of Object.entries(heroineSkillSheets)) rows[id] = [sheet, 0];
/** 공명 기술 drawn from a heroine's own sheet (gwanchang: 관창, 목청완's) */
const heroineArt: Record<string, string> = { gwanchang: 'cheongwan' };
for (const [id, hero] of Object.entries(heroineArt)) rows[id] = rows[hero];
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

export function drawSkillFrame(
  id: string,
  frame: number,
  x: number,
  y: number,
  size: number,
  alpha = 1,
  angle = 0,
  projectile = false,
  effectRow = 0,
) {
  id = heroineArt[id] ?? id;
  const entry = rows[id];
  if (!entry) return false;
  const [sheet, row] =
    heroineSkillSheets[id] !== undefined
      ? [heroineSkillSheets[id], projectile ? 1 : effectRow]
      : projectile
        ? [FLIGHT, flightRows[id] ?? 1]
        : entry;
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
  effectRow?: number;
  follow: boolean;
  stage: number;
};
const cues: Cue[] = [];
const learned: string[] = [];
/** Full-screen light that spreads from a point and fades: the moment a screen-wide skill lands. */
type Wash = { x: number; y: number; color: string; strength: number; age: number; duration: number };
const washes: Wash[] = [];
/**
 * A screen-scale skill moment: the whole six-frame sequence at `size`, held for `duration` seconds, never
 * throttled by the per-skill limits, with a screen wash of `color` behind it.
 */
export function skillBurst(id: string, x: number, y: number, size: number, duration: number, color: string) {
  if (!rows[id] || !G.state || !frames[0]) return;
  if (cues.length >= 48) cues.shift();
  cues.push({
    id,
    x,
    y,
    size,
    age: 0,
    duration,
    impact: false,
    follow: false,
    stage: G.state.stage,
  });
  screenWash(x, y, color, duration * 0.8, 0.34);
}
export function screenWash(x: number, y: number, color: string, duration: number, strength: number) {
  if (washes.length >= 4) washes.shift();
  washes.push({ x, y, color, strength: reduced ? strength * 0.4 : strength, age: 0, duration });
}
export function queueSkillLearn(id: string) {
  learned.push(id);
}
const auras = new Map<string, { end: number; size: number }>();
let swapPose: { id: string; start: number } | null = null;
export function startSwapPose(id: string) {
  swapPose = { id, start: G.time };
}
export function drawSwapPose(id: string, x: number, y: number, angle: number, alpha: number) {
  if (reduced || !swapPose || swapPose.id !== id || G.time - swapPose.start >= 0.32 || !frames[7]) return false;
  const row: number | undefined = HEROES[id]?.art.swapPose;
  const index = Math.min(3, Math.floor((G.time - swapPose.start) / 0.08));
  const im = heroCastAnimations[id]?.[index] ?? (row === undefined ? null : frames[7][row]?.[index]);
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
  washes.length = 0;
  learned.length = 0;
  swapPose = null;
  auras.clear();
}
/**
 * `area` marks the one cue that shows a whole attack (an area blast). It is never throttled away by the small
 * per-target cues of the same skill: past the per-skill limit it replaces the oldest of them instead.
 */
export function skillCue(
  id: string,
  x: number,
  y: number,
  size = 110,
  impact = false,
  follow = false,
  area = false,
  effectRow?: number,
) {
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
    duration: impact ? (heroineSkillSheets[id] !== undefined ? 0.3 : 0.24) : 0.42,
    effectRow,
    impact,
    follow,
    stage: G.state.stage,
  });
  return true;
}
export function skillAura(id: string, duration: number, size = 120) {
  auras.set(id, { end: G.time + duration, size });
}
export function updateSkillAnimations(dt: number) {
  for (const c of cues) c.age += dt;
  for (const w of washes) w.age += dt;
  for (let i = washes.length - 1; i >= 0; i--) if (washes[i].age >= washes[i].duration) washes.splice(i, 1);
  for (let i = cues.length - 1; i >= 0; i--) {
    const c = cues[i];
    if (c.age >= c.duration || c.stage !== G.state?.stage) cues.splice(i, 1);
  }
  if (!G.player || !G.state || G.player.hp <= 0 || ['title', 'result', 'choice'].includes(G.mode)) {
    cues.length = 0;
    washes.length = 0;
    auras.clear();
    return;
  }
  if (G.mode === 'play' && ['flight', 'boss'].includes(G.state.phase)) {
    // a 공명 기술 just learned or raised shows itself once at the hero
    for (const id of learned.splice(0)) skillCue(id, G.player.x, G.player.y, 110);
  }
  for (const [id, a] of auras)
    if (G.time >= a.end || !['flight', 'boss'].includes(G.state.phase)) {
      skillCue(id, G.player.x, G.player.y, a.size, true);
      auras.delete(id);
    }
}
export function drawSkillAnimations() {
  drawWashes();
  for (const c of cues) {
    const t = c.age / c.duration;
    const frame =
      heroineSkillSheets[c.id] !== undefined
        ? reduced
          ? 2
          : Math.min(5, Math.floor(t * 6))
        : reduced
          ? c.impact
            ? 4
            : 2
          : c.impact
            ? 3 + Math.min(2, Math.floor(t * 3))
            : Math.min(5, Math.floor(t * 6));
    const x = c.follow ? G.player.x : c.x,
      y = c.follow ? G.player.y - 25 : c.y;
    drawSkillFrame(
      c.id,
      frame,
      x,
      y,
      c.size,
      (reduced ? 0.5 : 0.88) * Math.min(1, (1 - t) * 4),
      0,
      false,
      c.effectRow ?? (c.impact ? 2 : 0),
    );
  }
  if (G.player?.hp <= 0 || !G.state || !['flight', 'boss'].includes(G.state.phase)) return;
  const f = reduced ? 2 : [1, 2, 3, 2][Math.floor(G.time * 6) % 4];
  for (const [id, a] of auras) drawSkillFrame(id, f, G.player.x, G.player.y, a.size, 0.38);
}
/** heroes' basic shots are drawn this many times their old size (data/tune.ts `basicShot`) */
export const BASIC_SHOT_ART = TUNE.basicShot.art;
/**
 * A skill's projectile is drawn larger than a basic shot (36 to 48 px) and leaves two fading copies of itself
 * behind, so it reads as the reward for meeting the skill's condition. Hitboxes are unchanged.
 */
export function drawSkillShot(s: any) {
  const art = heroineArt[s.skill] ?? s.skill;
  if (flightRows[art] === undefined && heroineSkillSheets[art] === undefined) return false;
  // a hero's basic shot is drawn at BASIC_SHOT_ART × its old 40 px (render only; the hit radius stays `r`)
  const size = s.basic
      ? 40 * BASIC_SHOT_ART
      : s.kind === 'gang'
        ? Math.max(66, (s.w || 8) * 5)
        : s.kind === 'orb'
          ? 54
          : 58,
    frame = reduced || ['soun', 'seolyeong'].includes(s.skill) ? 2 : Math.floor((G.time - s.phase) * 18) % 6,
    vy = s.vy ?? 900,
    angle = Math.atan2(s.vx, vy);
  if (!reduced && !s.basic)
    for (const [back, alpha] of [
      [0.05, 0.22],
      [0.025, 0.42],
    ])
      drawSkillFrame(s.skill, frame, s.x - s.vx * back, s.y + vy * back, size * 0.92, alpha, angle, true);
  return drawSkillFrame(s.skill, frame, s.x, s.y, size, 1, angle, true);
}
/** A hero's own basic-shot frame (the heroines'), or null for the shared 검기 (render/projectiles.ts) */
export function heroShotFrame(id: string): CanvasImageSource | null {
  const sheet = heroineSkillSheets[id];
  return sheet === undefined ? null : (frames[sheet]?.[1]?.[2] ?? null);
}
/** Runtime inspection for the visual regression harness, never used to drive gameplay. */
export function skillAnimationSnapshot() {
  return { cues: cues.map(c => ({ ...c })), auras: [...auras.keys()], loaded: frames.length };
}
function drawWashes() {
  for (const w of washes) {
    const t = w.age / w.duration,
      // spreads out from the point in the first fifth, then fades
      reach = Math.hypot(W, H) * (0.35 + 0.65 * Math.min(1, t * 5)),
      alpha = w.strength * (1 - t) ** 1.5;
    const g = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, reach);
    g.addColorStop(0, w.color);
    g.addColorStop(0.55, w.color + '88');
    g.addColorStop(1, w.color + '00');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}
