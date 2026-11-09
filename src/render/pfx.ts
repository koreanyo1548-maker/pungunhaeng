// Pixel art hit and burst effects from pixelfx (MIT, vendored in src/vendor/pixelfx), simulated live.
// Cosmetic only: every seed comes from fxRandom, and nothing here reads or writes gameplay state.
// Disabled under prefers-reduced-motion or with #legacyfx in the URL; callers then fall back to the old effects.
import { ctx, reduced } from '../core/dom';
import { fxRandom } from '../core/rng';
import { createFrame, clearFrame, createFx } from '../vendor/pixelfx/core/index.js';
import type { PixelFrame, PixelFx } from '../vendor/pixelfx/core/index.js';
import { EFFECTS } from '../vendor/pixelfx/effects.js';
import type { PixelEffectId } from '../vendor/pixelfx/effects.js';

const UP = -Math.PI / 2,
  DOWN = Math.PI / 2;

/** A dark-to-white ramp around one color, the shape pixelfx palettes take. */
export function ramp(color: string): string[] {
  const hex = color.replace('#', '');
  const k = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
  const ink = [8, 6, 12],
    white = [255, 255, 255];
  const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);
  const out = (a: number[]) => '#' + a.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  return [
    mix(ink, k, 0.18),
    mix(ink, k, 0.4),
    mix(ink, k, 0.7),
    k,
    mix(k, white, 0.45),
    mix(k, white, 0.78),
    white,
  ].map(out);
}

type Def = {
  id: PixelEffectId;
  /** pixelfx options (palette, height, light, ...) */
  opts: Record<string, unknown>;
  /** aim or angle, with a little random spread */
  aim?: number;
  angle?: number;
  spread?: number;
  /** pixels drawn, relative to the anchor, measured over seeds and spread (plus margin at runtime) */
  box: [number, number, number, number];
  scale: 1 | 2;
  /** concurrent instances of this kind; new ones are skipped past it */
  max: number;
  /** measured cost of one re-rasterisation, in microseconds on a desktop (see RASTER_BUDGET) */
  cost: number;
  /** re-rasterisations per second; defaults to FPS */
  fps?: number;
};

const JADE = '#7fe6cf';
const DEFS = {
  // everyday hit on an enemy that survives: projectiles fly up, so the blow points up
  hit: {
    id: 'impacts/hit-spark',
    opts: { palette: ramp(JADE), height: 20 },
    aim: UP,
    spread: 0.3,
    box: [-82, -77, 47, 37],
    scale: 1,
    max: 8,
    cost: 260,
  },
  // armored enemies and bosses ring like steel
  armor: { id: 'impacts/parry', opts: { height: 24 }, box: [-98, -53, 91, 52], scale: 1, max: 4, cost: 280 },
  // an enemy goes down
  kill: {
    id: 'impacts/crit-hit',
    opts: { height: 26 },
    aim: UP,
    spread: 0.3,
    box: [-127, -100, 112, 73],
    scale: 1,
    max: 4,
    cost: 450,
  },
  // the player is struck from above
  hurt: {
    id: 'impacts/crit-hit',
    opts: { palette: ramp('#ff6b57'), height: 26 },
    aim: DOWN,
    spread: 0.3,
    box: [-84, -74, 104, 73],
    scale: 1,
    max: 2,
    cost: 450,
  },
  // 철갑공 turns a blow aside
  block: {
    id: 'impacts/shield-block',
    opts: { palette: ramp('#e9c3ff') },
    angle: UP,
    box: [-74, -102, 15, 18],
    scale: 1,
    max: 2,
    cost: 1150,
  },
  // 회춘단 · 회기: crane feathers
  heal: {
    id: 'holy/feather-burst',
    opts: { palette: ramp('#ffd77a'), glow: '#fff0c0' },
    box: [-73, -51, 75, 86],
    scale: 1,
    max: 2,
    cost: 450,
  },
  // pickups and swaps (palette given per call)
  collect: { id: 'pickups/collect-burst', opts: {}, box: [-44, -87, 51, 6], scale: 1, max: 5, cost: 160 },
  // 내공 해방, 보스 격노 (palette given per call)
  mana: { id: 'arcane/mana-burst', opts: {}, box: [-103, -135, 97, 47], scale: 2, max: 2, cost: 650, fps: 15 },
  // a boss goes down (palette given per call)
  plasma: {
    id: 'explosions/plasma-explosion',
    opts: { light: 0.7 },
    box: [-110, -96, 109, 97],
    scale: 2,
    max: 1,
    cost: 1250,
    fps: 15,
  },
} satisfies Record<string, Def>;
export type PfxKind = keyof typeof DEFS;

const MARGIN = 6;
// pixelfx effects are authored at 30 fps; 24 keeps the motion and saves a fifth of the drawing, and the big
// 2x effects use 15 (their pixels are doubled, so steps read as animation). The simulation still steps at 120 Hz.
const FPS = 24;
const MAX_TOTAL = 16;
// Drawing work per displayed frame, in the same units as Def.cost (about 1.2 ms on a desktop, several on a
// phone). When many effects are due at once, new ones go first, then the stalest; the rest keep their last
// frame a little longer, so a burst of effects lowers their frame rate instead of the game's.
const RASTER_BUDGET = 1200;

type Canvas = OffscreenCanvas | HTMLCanvasElement;
/**
 * One effect's pixels. The color and light buffers are shown as they are: pixelfx packs colors the way ImageData
 * lays out its bytes, so each buffer backs an ImageData with no copy. Color is drawn normally and light with
 * 'lighter', which adds it onto whatever is behind (the library's own composite does the same over a background).
 */
type Surface = {
  frame: PixelFrame;
  colorImg: ImageData;
  lightImg: ImageData;
  color: Canvas;
  light: Canvas;
  cg: CanvasRenderingContext2D;
  lg: CanvasRenderingContext2D;
};
type Live = Surface & {
  kind: PfxKind;
  fx: PixelFx;
  x: number;
  y: number;
  left: number;
  top: number;
  scale: number;
  sinceDraw: number;
  dirty: boolean;
  shown: boolean;
};

const live: Live[] = [];
const pool = new Map<string, Surface[]>();
let spawnCount = 0;
const legacy = typeof location !== 'undefined' && /(^|[#&])legacyfx\b/.test(location.hash);

/** True when pixel effects are drawn (not reduced motion, not #legacyfx). */
export function pfxOn() {
  return !reduced && !legacy;
}

function canvas(w: number, h: number): Canvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Buffers and canvases for one effect, reused once it ends (frames come in a few fixed sizes). */
function surface(w: number, h: number): Surface {
  const reused = pool.get(w + 'x' + h)?.pop();
  if (reused) return reused;
  const frame = createFrame(w, h),
    color = canvas(w, h),
    light = canvas(w, h);
  return {
    frame,
    colorImg: new ImageData(new Uint8ClampedArray(frame.color.buffer), w, h),
    lightImg: new ImageData(new Uint8ClampedArray(frame.light.buffer), w, h),
    color,
    light,
    cg: color.getContext('2d') as CanvasRenderingContext2D,
    lg: light.getContext('2d') as CanvasRenderingContext2D,
  };
}

/**
 * Starts a pixel effect anchored at (x, y) in canvas pixels. Returns false when pixel effects are off,
 * so the caller can draw its old effect instead. Skipping because of the cap still returns true.
 */
export function pfx(kind: PfxKind, x: number, y: number, extra: Record<string, unknown> = {}) {
  if (!pfxOn()) return false;
  const def: Def = DEFS[kind];
  if (live.length >= MAX_TOTAL) return true;
  let same = 0;
  for (const l of live) if (l.kind === kind) same++;
  if (same >= def.max) return true;
  const [x0, y0, x1, y1] = def.box;
  const w = x1 - x0 + 1 + MARGIN * 2,
    h = y1 - y0 + 1 + MARGIN * 2;
  const opts: Record<string, unknown> = { ...def.opts, ...extra, seed: (fxRandom() * 0x7fffffff) | 0 };
  const lean = def.spread ? (fxRandom() - 0.5) * 2 * def.spread : 0;
  if (def.aim !== undefined) opts.aim = def.aim + lean;
  if (def.angle !== undefined) opts.angle = def.angle + lean;
  opts.x = MARGIN - x0;
  opts.y = MARGIN - y0 + ((opts.height as number) || 0);
  const s = def.scale;
  live.push({
    ...surface(w, h),
    kind,
    fx: createFx(EFFECTS[def.id], opts),
    x,
    y,
    left: Math.round(x + (x0 - MARGIN) * s),
    top: Math.round(y + (y0 - MARGIN) * s),
    scale: s,
    // Alternate which game frame each effect re-rasterises on, so a burst of spawns doesn't land on one frame.
    sinceDraw: spawnCount++ % 2 ? 1 / (FPS * 2) : 0,
    dirty: true,
    shown: false,
  });
  return true;
}

export function updatePfx(dt: number) {
  for (const l of live) {
    l.fx.update(dt);
    l.sinceDraw += dt;
    if (l.sinceDraw >= 1 / ((DEFS[l.kind] as Def).fps ?? FPS) - 1e-6) l.dirty = true;
  }
  for (let i = live.length - 1; i >= 0; i--) {
    const l = live[i];
    if (!l.fx.done()) continue;
    release(l);
    live.splice(i, 1);
  }
}

function release(l: Live) {
  const key = l.frame.w + 'x' + l.frame.h;
  if (!pool.has(key)) pool.set(key, []);
  const { frame, colorImg, lightImg, color, light, cg, lg } = l;
  pool.get(key)!.push({ frame, colorImg, lightImg, color, light, cg, lg });
}

export function clearPfx() {
  for (const l of live) release(l);
  live.length = 0;
}

function raster(l: Live) {
  clearFrame(l.frame);
  l.fx.draw(l.frame, 'back');
  l.fx.draw(l.frame, 'front');
  l.cg.putImageData(l.colorImg, 0, 0);
  l.lg.putImageData(l.lightImg, 0, 0);
  l.dirty = false;
  l.shown = true;
  l.sinceDraw = 0;
}

const due: Live[] = [];
export function drawPfx() {
  if (!live.length) return;
  // Re-rasterise at FPS at most: new effects first, then the stalest, while the budget lasts (always one).
  // An effect that misses out keeps its last frame; a new one that misses out appears a frame later.
  due.length = 0;
  for (const l of live) if (l.dirty) due.push(l);
  due.sort((a, b) => Number(a.shown) - Number(b.shown) || b.sinceDraw - a.sinceDraw);
  let budget = RASTER_BUDGET;
  for (const l of due) {
    if (budget <= 0) break;
    raster(l);
    budget -= (DEFS[l.kind] as Def).cost;
  }
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  for (const l of live) {
    if (!l.shown) continue;
    const w = l.frame.w * l.scale,
      h = l.frame.h * l.scale;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(l.color, l.left, l.top, w, h);
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(l.light, l.left, l.top, w, h);
  }
  ctx.restore();
}
