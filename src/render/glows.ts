// Glows behind the important things in play (docs/visual-direction.md): a jade laser trail behind 죽창, a fire tail
// behind 운석 and rays in each item's colour behind 무아지경, 자석 and 점수 두 배 (none behind 엽전: too busy).
// They are looping pixelfx effects (src/vendor/pixelfx, MIT). Simulating one live per object would cost too much
// with many 죽창 on screen, so each look is rendered once into a strip of frames (prepareGlows, at the
// start of a stage) and play only draws pictures. A frame is colour and light composited over black and drawn with
// 'lighter', so it adds light onto what is behind (dark smoke drops out). Cosmetic only: no gameplay random, no
// state; off with reduced motion or #legacyfx (pfxOn).
import { clearFrame, composite, createFrame, createFx } from '../vendor/pixelfx/core/index.js';
import { EFFECTS } from '../vendor/pixelfx/effects.js';
import type { PixelEffectId } from '../vendor/pixelfx/effects.js';
import { G } from '../core/context';
import { ctx } from '../core/dom';
import { pfxOn } from './pfx';

const JADE = ['#06210f', '#11553a', '#2fae6f', '#9cf2b8', '#ffffff'];
const CYAN = ['#031a22', '#0b5f78', '#2fc4e6', '#a6f2ff', '#ffffff'];
const CORAL = ['#260b06', '#7a2a18', '#e8664a', '#ffc2a8', '#ffffff'];

type GlowDef = {
  id: PixelEffectId;
  options?: Record<string, unknown>;
  /** frames a second the loop is rendered at (slow effects need fewer) */
  fps: number;
};
const DEFS = {
  /** 죽창: a jade laser trail, head at the tip */
  spear: { id: 'projectiles/laser-bolt', options: { palette: JADE }, fps: 20 },
  /** 운석: a fire tail */
  meteor: { id: 'fire/fireball', fps: 20 },
  /** 점수 두 배: gold rays */
  gold: { id: 'holy/sunburst', fps: 8 },
  /** 무아지경: sky-blue rays */
  cyan: { id: 'holy/sunburst', options: { palette: CYAN }, fps: 8 },
  /** 자석: jade rays */
  jade: { id: 'holy/sunburst', options: { palette: JADE }, fps: 8 },
  /** 듀얼샷: coral rays */
  coral: { id: 'holy/sunburst', options: { palette: CORAL }, fps: 8 },
} satisfies Record<string, GlowDef>;
export type GlowKind = keyof typeof DEFS;

type Strip = { canvas: HTMLCanvasElement; w: number; h: number; n: number; fps: number; origin: [number, number] };
const strips = new Map<GlowKind, Strip>();

/** Renders every glow's loop into a strip of frames, once. Called when a stage starts (a few tens of ms). */
export function prepareGlows() {
  if (!pfxOn() || strips.size) return;
  for (const [kind, def] of Object.entries(DEFS) as [GlowKind, GlowDef][]) {
    const mod = EFFECTS[def.id],
      [w, h] = mod.meta.size,
      [ox, oy] = mod.meta.origin,
      n = Math.max(1, Math.round(mod.meta.duration * def.fps)),
      frame = createFrame(w, h),
      fx = createFx(mod, { x: ox, y: oy, seed: 7, ...def.options }),
      canvas = document.createElement('canvas'),
      g = canvas.getContext('2d') as CanvasRenderingContext2D,
      rgba = new Uint8ClampedArray(w * h * 4);
    canvas.width = w * n;
    canvas.height = h;
    // black behind: colour and light add up, and the strip is drawn with 'lighter'
    const black = 0xff000000;
    for (let i = 0; i < n; i++) {
      if (i) fx.update(1 / def.fps);
      clearFrame(frame);
      fx.draw(frame, 'back');
      fx.draw(frame, 'front');
      composite(frame, rgba, black);
      g.putImageData(new ImageData(rgba, w, h), i * w, 0);
    }
    strips.set(kind, { canvas, w, h, n, fps: def.fps, origin: [ox, oy] });
  }
}

/**
 * Draws a glow with its effect origin (a trail's head, a burst's centre) at (x, y), pointing along `angle` (the
 * effects face right), at `scale`. `phase` (seconds) keeps many copies of one glow out of step.
 */
export function drawGlow(kind: GlowKind, x: number, y: number, scale: number, angle = 0, phase = 0, alpha = 1) {
  const s = strips.get(kind);
  if (!s || !pfxOn()) return;
  const i = Math.floor((G.time + phase) * s.fps) % s.n;
  ctx.save();
  // a frame is an opaque black rectangle: a shadow set by the caller would outline it
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha *= alpha;
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.drawImage(s.canvas, i * s.w, 0, s.w, s.h, -s.origin[0], -s.origin[1], s.w, s.h);
  ctx.restore();
}
